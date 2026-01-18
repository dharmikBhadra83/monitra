import { prisma } from './prisma';
import { fetchHtml } from './scraper';
import { scrapeProductWithSelectors, parseProductFromHtml } from './html-parser';
import { detectSelectors } from './ai';
import { ProductDNA } from './types';
import { convertToUSD } from './currency';
import * as cheerio from 'cheerio';

/**
 * Orchestrates the database-driven scraping logic (Self-Learning).
 * Uses free HTML parsing with cheerio instead of paid services.
 */
export async function dbScrapeProduct(url: string): Promise<ProductDNA> {
    const domain = new URL(url).hostname.replace('www.', '');

    // 1. Check if selectors exist in DB
    if (!prisma.siteConfig) {
        throw new Error('Prisma: siteConfig model not found in client.');
    }

    const config = await prisma.siteConfig.findUnique({
        where: { domain },
    });

    let name = '';
    let price = 0;
    let currency = 'USD';
    let brand = '';

    // 2. Fetch HTML content (free - no paid services)
    const html = await fetchHtml(url);

    // Helper function to validate if a price is reasonable
    const isValidPrice = (p: number): boolean => {
        return p > 0 && p >= 1 && p <= 10000000; // Reasonable range: 1 to 10 million
    };

    // Helper function to detect if extracted price looks suspicious (might be a rating, not actual price)
    const isSuspiciousPrice = (price: number): boolean => {
        // If price has more than 2 decimal places and is very large, it might be a rating number
        const decimalPlaces = (price.toString().split('.')[1] || '').length;
        if (decimalPlaces > 2 && price > 10000) {
            // Very large numbers with many decimals are likely ratings (e.g., 161284.62015426435)
            return true;
        }
        return false;
    };

    // 3. Try to use cached selectors first
    if (config?.priceSelector && config?.nameSelector) {
        try {
            console.log(`[${domain}] ✅ Using cached selectors - Name: "${config.nameSelector}", Price: "${config.priceSelector}"`);
            const parsed = await parseProductFromHtml(html, url, config.nameSelector, config.priceSelector);
            name = parsed.name;
            price = parsed.price;
            currency = parsed.currency;
            brand = parsed.brand;
            
            // Log extraction results
            const priceIsValid = price > 0 && isValidPrice(price) && !isSuspiciousPrice(price);
            const extractionSuccess = {
                name: !!name,
                price: priceIsValid,
                brand: !!brand,
                currency: !!currency
            };
            
            if (extractionSuccess.name && extractionSuccess.price) {
                // Check if price came from the specified selector or fallback
                const priceSource = priceIsValid ? 'selector or fallback' : 'failed';
                console.log(`[${domain}] ✅ Selector extraction SUCCESS - Name: "${name.substring(0, 50)}...", Price: ${price} ${currency} (${priceSource}), Brand: "${brand || 'N/A'}"`);
            } else {
                let priceStatus = 'missing';
                if (price > 0) {
                    if (!isValidPrice(price)) {
                        priceStatus = `invalid (${price})`;
                    } else if (isSuspiciousPrice(price)) {
                        priceStatus = `suspicious - likely rating (${price})`;
                        // Reset suspicious price so AI is called
                        price = 0;
                    } else {
                        priceStatus = 'failed';
                    }
                }
                console.log(`[${domain}] ⚠️ Selector extraction PARTIAL - Name: ${extractionSuccess.name}, Price: ${priceStatus}, Brand: ${extractionSuccess.brand}`);
                console.log(`[${domain}] 🔍 Will trigger learning mode or AI fallback`);
                // Reset suspicious price so AI is called
                if (isSuspiciousPrice(price)) {
                    console.log(`[${domain}] 🔄 Resetting suspicious price (${price}) to 0 to trigger AI fallback`);
                    price = 0;
                }
            }
        } catch (e) {
            console.warn(`[${domain}] ❌ Selector-based scrape failed, triggering learning mode:`, e);
            price = 0; // Reset on error
        }
    }

    // 4. Learning Mode: If selectors are missing or extraction failed
    const priceIsInvalid = price === 0 || !isValidPrice(price) || isSuspiciousPrice(price);
    if (!name || priceIsInvalid || !config?.priceSelector || !config?.nameSelector) {
        const reason = !config?.priceSelector || !config?.nameSelector 
            ? 'no cached selectors' 
            : (!name ? 'name extraction failed' : priceIsInvalid ? (price === 0 ? 'price extraction failed' : isSuspiciousPrice(price) ? `price extraction suspicious (likely rating: ${price})` : `price extraction invalid (${price})`) : 'unknown');
        console.log(`[${domain}] 🔍 Learning mode triggered - Reason: ${reason}`);

        let priceSelector = '';
        let nameSelector = '';

        // Use AI to detect selectors from HTML (with error handling)
        try {
            console.log(`[${domain}] 🤖 AI SELECTOR DETECTION - Analyzing HTML structure (${(html.length / 1024).toFixed(2)}KB)`);
            const detected = await detectSelectors(html);
            priceSelector = detected.priceSelector;
            nameSelector = detected.nameSelector;
            console.log(`[${domain}] 🤖 AI SELECTOR DETECTION RESULT - Name: "${nameSelector}", Price: "${priceSelector}"`);
        } catch (e: any) {
            console.warn(`[${domain}] ❌ AI selector detection failed:`, e.message);
            // Use fallback selectors
            priceSelector = '[itemprop="price"], .price, .product-price';
            nameSelector = 'h1, [itemprop="name"], .product-title, .product-name';
            console.log(`[${domain}] 🔄 Using fallback selectors - Name: "${nameSelector}", Price: "${priceSelector}"`);
        }

        // Try parsing with detected selectors
        if (priceSelector && nameSelector) {
            try {
                console.log(`[${domain}] 🔍 Trying AI-detected selectors - Name: "${nameSelector}", Price: "${priceSelector}"`);
                const parsed = await parseProductFromHtml(html, url, nameSelector, priceSelector);
                const parsedPriceIsValid = parsed.price > 0 && isValidPrice(parsed.price) && !isSuspiciousPrice(parsed.price);
                if (parsed.name && parsedPriceIsValid) {
                    name = parsed.name || name;
                    price = parsed.price || price;
                    currency = parsed.currency || currency;
                    brand = parsed.brand || brand;
                    console.log(`[${domain}] ✅ AI-detected selectors SUCCESS - Name: "${name.substring(0, 50)}...", Price: ${price} ${currency}, Brand: "${brand || 'N/A'}"`);
                } else {
                    let priceStatus = 'missing';
                    if (parsed.price > 0) {
                        if (!isValidPrice(parsed.price)) {
                            priceStatus = `invalid (${parsed.price})`;
                        } else if (isSuspiciousPrice(parsed.price)) {
                            priceStatus = `suspicious - likely rating (${parsed.price})`;
                        } else {
                            priceStatus = 'unknown issue';
                        }
                    }
                    console.log(`[${domain}] ⚠️ AI-detected selectors PARTIAL - Name: ${!!parsed.name}, Price: ${priceStatus}`);
                }
            } catch (e) {
                console.warn(`[${domain}] ❌ Failed to parse with detected selectors, will use AI fallback:`, e);
            }
        }

        // Save selectors to DB (even if parsing failed, they might work next time)
        if (priceSelector && nameSelector) {
            await prisma.siteConfig.upsert({
                where: { domain },
                update: { priceSelector, nameSelector },
                create: { domain, priceSelector, nameSelector },
            });
        }
    }

    // 5. Fallback to AI parsing if direct extraction failed or price is invalid
    // Initialize dna variable to track if AI was used
    let dna: ProductDNA | null = null;
    
    const priceIsInvalidFinal = price === 0 || !isValidPrice(price) || isSuspiciousPrice(price);
    
    if (!name || priceIsInvalidFinal) {
        const missingFields = [];
        if (!name) missingFields.push('name');
        if (priceIsInvalidFinal) {
            if (price === 0) {
                missingFields.push('price');
            } else if (isSuspiciousPrice(price)) {
                missingFields.push(`price (suspicious - likely rating: ${price})`);
            } else {
                missingFields.push(`price (invalid: ${price})`);
            }
        }
        console.log(`[${domain}] 🤖 AI API CALL - Missing/Invalid fields: ${missingFields.join(', ')} | HTML size: ${(html.length / 1024).toFixed(2)}KB | Sending to AI: ${(15000 / 1024).toFixed(2)}KB`);
        
        const { parseProductDNA } = await import('./ai');
        const content = cheerio.load(html).text().substring(0, 15000);
        dna = await parseProductDNA(content, url);
        
        console.log(`[${domain}] 🤖 AI API RESPONSE - Name: "${dna.name?.substring(0, 50) || 'N/A'}...", Price: ${dna.price || 0} ${dna.currency || 'N/A'}, Brand: "${dna.brand || 'N/A'}"`);
        
        if (dna) {
            name = dna.name || name;
            // AI returns ORIGINAL price and currency (not converted)
            // Use AI's price and currency directly, then we'll convert to USD ourselves if needed
            if (dna.price && dna.price > 0 && isValidPrice(dna.price)) {
                price = dna.price;
                currency = dna.currency || currency || 'USD';
                console.log(`[${domain}] ✅ Using AI-extracted price: ${price} ${currency}`);
            } else if (!price || price === 0 || !isValidPrice(price)) {
                // If AI also failed, keep price as 0
                price = dna.price || 0;
                currency = dna.currency || currency || 'USD';
                console.log(`[${domain}] ⚠️ AI price extraction also failed or invalid: ${price}`);
            }
            // Use AI brand if valid, otherwise keep existing brand from HTML parsing
            const aiBrand = dna.brand || '';
            if (aiBrand) {
                const cleanedAiBrand = aiBrand.trim().toLowerCase();
                const invalidBrands = ['www', 'www.', 'http', 'https', 'com', 'net', 'org', ''];
                // Only use AI brand if it's valid and we don't already have a brand
                if (!invalidBrands.includes(cleanedAiBrand) && cleanedAiBrand.length >= 2) {
                    brand = aiBrand.trim();
                }
                // If AI brand is invalid but we already have a brand from HTML parsing, keep the HTML one
                // If AI brand is invalid and we don't have a brand, leave it empty
            }
            // If AI didn't return a brand, keep whatever we have from HTML parsing
        }
    } else {
        // AI not needed - both name and price were extracted successfully
        console.log(`[${domain}] ℹ️ AI NOT CALLED - Name and price extracted successfully via selectors/fallbacks (no AI cost)`);
    }

    // 6. Extract image URL
    const $ = cheerio.load(html);
    const imageUrl =
        $('meta[property="og:image"]').attr('content') ||
        $('img[itemprop="image"]').attr('src') ||
        $('.product-image img').first().attr('src') ||
        $('img').first().attr('src') ||
        undefined;

    const priceUSD = convertToUSD(price, currency);

    // Create dna object for return (if not already created by AI)
    if (!dna) {
        dna = {
            name,
            brand,
            price,
            currency,
            category: '',
            features: [],
            description: '',
            imageUrl,
            url,
        };
    }

    // 7. Return scraped data (NO database operations here - handled in route files)
    // This function only handles scraping logic: selector lookup, extraction, AI fallback
    
    // Check if AI was actually used (dna was set by AI call, not created above)
    const aiWasCalled = dna && dna.name && dna.price && 
        (dna.name !== name || dna.price !== price || dna.brand !== brand);
    
    let extractionMethod = '';
    let aiUsed = false;
    
    if (config?.priceSelector && config?.nameSelector && name && price > 0 && !aiWasCalled) {
        extractionMethod = 'CACHED_SELECTORS ✅ (no AI cost)';
        aiUsed = false;
    } else if (aiWasCalled) {
        extractionMethod = 'AI_API 🤖 (AI used - costs money)';
        aiUsed = true;
    } else {
        extractionMethod = 'MIXED 🔄 (selectors + fallbacks, no AI)';
        aiUsed = false;
    }
    
    console.log(`[${domain}] 📊 EXTRACTION SUMMARY - Method: ${extractionMethod} | Name: ${!!name} | Price: ${price > 0 ? `${price} ${currency}` : 'FAILED'} | Brand: ${brand || 'N/A'} | HTML: ${(html.length / 1024).toFixed(2)}KB`);
    
    if (aiUsed) {
        console.log(`[${domain}] 💰 COST: AI API was used for this extraction (~$0.014)`);
    } else {
        console.log(`[${domain}] 💰 COST: No AI API used - FREE extraction (fallback methods worked)`);
    }

    return dna;
}
