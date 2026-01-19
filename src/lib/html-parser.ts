import * as cheerio from 'cheerio';
import { fetchHtml } from './scraper';
import { ProductDNA } from './types';

/**
 * Parses product information from HTML using CSS selectors.
 * This is a free alternative that uses cheerio for HTML parsing.
 */
export async function parseProductFromHtml(
    html: string,
    url: string,
    nameSelector?: string | null,
    priceSelector?: string | null
): Promise<{ name: string; price: number; currency: string; brand: string }> {
    const $ = cheerio.load(html);

    let name = '';
    let price = 0;
    let currency = 'USD';
    let brand = '';

    // Helper function to validate if a price is reasonable
    const isValidPrice = (p: number): boolean => {
        return p > 0 && p >= 1 && p <= 10000000; // Reasonable range: 1 to 10 million
    };

    // Helper function to detect if text contains rating-related keywords (not a price)
    const looksLikeRating = (text: string): boolean => {
        const lowerText = text.toLowerCase();
        const ratingKeywords = ['rating', 'ratings', 'review', 'reviews', 'star', 'stars', 'rated', 'votes', 'vote'];
        return ratingKeywords.some(keyword => lowerText.includes(keyword));
    };

    // Helper function to check if price looks suspicious (too many decimal places, or from rating text)
    const isSuspiciousPrice = (price: number, sourceText: string): boolean => {
        // If source text contains rating keywords, it's suspicious
        if (looksLikeRating(sourceText)) {
            return true;
        }
        
        // If price has more than 2 decimal places and is very large, it might be a rating number
        const decimalPlaces = (price.toString().split('.')[1] || '').length;
        if (decimalPlaces > 2 && price > 10000) {
            // Very large numbers with many decimals are likely ratings (e.g., 161284.62015426435)
            return true;
        }
        
        return false;
    };

    // Try to extract product name
    if (nameSelector) {
        try {
            const nameElement = $(nameSelector).first();
            name = nameElement.text().trim();
            if (name) {
                console.log(`[HTML Parser] ✅ Name extracted via selector "${nameSelector}": "${name.substring(0, 50)}..."`);
            } else {
                console.log(`[HTML Parser] ⚠️ Name selector "${nameSelector}" found but empty`);
            }
        } catch (e) {
            console.warn(`[HTML Parser] ❌ Failed to extract name using selector: ${nameSelector}`, e);
        }
    }

    // Fallback: Try common product name selectors
    if (!name) {
        const commonNameSelectors = [
            'h1.product-title',
            'h1[data-product-title]',
            '.product-name',
            '[itemprop="name"]',
            'h1',
            '.title',
        ];

        for (const selector of commonNameSelectors) {
            const element = $(selector).first();
            if (element.length && element.text().trim()) {
                name = element.text().trim();
                console.log(`[HTML Parser] ✅ Name extracted via fallback selector "${selector}": "${name.substring(0, 50)}..."`);
                break;
            }
        }
        if (!name) {
            console.log(`[HTML Parser] ❌ Name not found with any fallback selectors`);
        }
    }

    // Try to extract price
    if (priceSelector) {
        try {
            // Handle :contains() pseudo-selector (cheerio doesn't support it natively)
            if (priceSelector.includes(':contains(')) {
                const match = priceSelector.match(/:contains\(["']([^"']+)["']\)/);
                if (match) {
                    const searchText = match[1];
                    const tagMatch = priceSelector.match(/^(\w+)/);
                    const tag = tagMatch ? tagMatch[1] : '*';
                    
                    // Find element by tag and text content
                    $(tag).each((i: number, el: any) => {
                        if (price > 0 && isValidPrice(price) && !isSuspiciousPrice(price, '')) return false;
                        const $el = $(el);
                        const elementText = $el.text().trim();
                        
                        // Only check direct children or small text blocks to avoid matching huge divs with multiple prices
                        if (elementText.includes(searchText) && elementText.length < 200) {
                            // Skip if this text looks like a rating, not a price
                            if (looksLikeRating(elementText)) {
                                console.log(`[HTML Parser] ⚠️ Skipping rating text: "${elementText.substring(0, 50)}..."`);
                                return; // Continue to next element
                            }
                            
                            const priceText = elementText;
                            const extractedPrice = extractPrice(priceText);
                            if (extractedPrice > 0 && isValidPrice(extractedPrice) && !isSuspiciousPrice(extractedPrice, priceText)) {
                                price = extractedPrice;
                                currency = extractCurrency(priceText);
                                console.log(`[HTML Parser] ✅ Price extracted via selector "${priceSelector}": ${price} ${currency} from text: "${priceText.substring(0, 50)}..."`);
                                return false;
                            } else if (extractedPrice > 0 && isSuspiciousPrice(extractedPrice, priceText)) {
                                console.log(`[HTML Parser] ⚠️ Suspicious price extracted (likely rating): ${extractedPrice} from text: "${priceText.substring(0, 50)}..."`);
                            }
                        }
                    });
                    
                    // If price was extracted but invalid or suspicious, reset it
                    if (price > 0 && (!isValidPrice(price) || isSuspiciousPrice(price, ''))) {
                        console.log(`[HTML Parser] ⚠️ Invalid or suspicious price extracted (${price}) - resetting to 0`);
                        price = 0;
                    }
                }
            } else {
                // Standard CSS selector
                const priceElement = $(priceSelector).first();
                if (priceElement.length) {
                    const priceText = priceElement.text().trim() || 
                                     priceElement.attr('content') || 
                                     priceElement.attr('data-price') || '';
                    if (priceText) {
                        // Skip if this text looks like a rating, not a price
                        if (looksLikeRating(priceText)) {
                            console.log(`[HTML Parser] ⚠️ Price selector found rating text, not price: "${priceText.substring(0, 50)}..."`);
                            price = 0;
                        } else {
                            const extractedPrice = extractPrice(priceText);
                            if (extractedPrice > 0 && isValidPrice(extractedPrice) && !isSuspiciousPrice(extractedPrice, priceText)) {
                                price = extractedPrice;
                                currency = extractCurrency(priceText);
                                console.log(`[HTML Parser] ✅ Price extracted via selector "${priceSelector}": ${price} ${currency}`);
                            } else {
                                const reason = extractedPrice === 0 ? 'couldn\'t parse' : !isValidPrice(extractedPrice) ? 'invalid price' : 'suspicious price (likely rating)';
                                console.log(`[HTML Parser] ⚠️ Price selector "${priceSelector}" found but ${reason}: "${priceText.substring(0, 50)}..." (extracted: ${extractedPrice})`);
                                price = 0; // Ensure we reset invalid prices
                            }
                        }
                    } else {
                        console.log(`[HTML Parser] ⚠️ Price selector "${priceSelector}" found but empty`);
                    }
                } else {
                    console.log(`[HTML Parser] ❌ Price selector "${priceSelector}" not found in HTML`);
                }
            }
        } catch (e) {
            console.warn(`Failed to extract price using selector: ${priceSelector}`, e);
            price = 0; // Reset on error
        }
    }

    // Fallback: Try common price selectors (including Amazon-specific)
    if (price === 0 || (price > 0 && !isValidPrice(price))) {
        if (price > 0 && !isValidPrice(price)) {
            console.log(`[HTML Parser] ⚠️ Invalid price from selector (${price}), trying fallback selectors`);
            price = 0;
        }
        
        const commonPriceSelectors = [
            '[itemprop="price"]',
            '.price',
            '.product-price',
            '[data-price]',
            '.current-price',
            '.price-current',
            // Amazon-specific selectors
            '#priceblock_ourprice',
            '#priceblock_dealprice',
            '#priceblock_saleprice',
            '.a-price .a-offscreen', // Amazon hidden price
            '.a-price-whole',
            'span.a-price-symbol + span.a-price-whole',
            '[data-a-color="price"] .a-price-whole',
            '.a-price[data-a-color="price"]',
        ];

        for (const selector of commonPriceSelectors) {
            const element = $(selector).first();
            if (element.length) {
                const priceText = element.text().trim() || element.attr('content') || element.attr('data-price') || '';
                if (priceText) {
                    const extractedPrice = extractPrice(priceText);
                    if (extractedPrice > 0 && isValidPrice(extractedPrice)) {
                        price = extractedPrice;
                    currency = extractCurrency(priceText);
                        console.log(`[HTML Parser] ✅ Price extracted via fallback selector "${selector}": ${price} ${currency}`);
                        break;
                    }
                }
            }
        }
    }

    // Last resort: Text-based extraction for dynamic class names
    // Search for elements containing currency symbols and numbers
    if (price === 0 || (price > 0 && !isValidPrice(price))) {
        if (price > 0 && !isValidPrice(price)) {
            console.log(`[HTML Parser] ⚠️ Invalid price from fallback (${price}), trying LAST RESORT method`);
            price = 0;
        }
        
        console.log(`[HTML Parser] 🔍 Using LAST RESORT text-based price extraction (searching for currency symbols)`);
        const currencySymbols = ['₹', '$', '€', '£', '¥'];
        for (const symbol of currencySymbols) {
            // Find all elements containing the currency symbol
            $('*').each((i: number, el: any) => {
                if (price > 0 && isValidPrice(price) && !isSuspiciousPrice(price, '')) return false; // Stop if valid price found
                
                const $el = $(el);
                const text = $el.text().trim();
                
                // Only check small text blocks to avoid matching huge divs with multiple prices
                // Look for elements with currency symbol and reasonable text length
                // Skip if this text looks like a rating, not a price
                if (looksLikeRating(text)) {
                    return; // Continue to next element
                }
                
                // Check if element contains currency symbol and looks like a price
                if (text.includes(symbol) && /\d/.test(text) && text.length < 200) {
                    const extractedPrice = extractPrice(text);
                    if (extractedPrice > 0 && isValidPrice(extractedPrice) && !isSuspiciousPrice(extractedPrice, text)) {
                            price = extractedPrice;
                            currency = extractCurrency(text);
                            console.log(`[HTML Parser] ✅ Price extracted via LAST RESORT method (currency symbol search): ${price} ${currency} from text: "${text.substring(0, 50)}..."`);
                            return false; // Stop iteration
                    } else if (extractedPrice > 0 && isSuspiciousPrice(extractedPrice, text)) {
                        console.log(`[HTML Parser] ⚠️ Suspicious price from LAST RESORT (likely rating): ${extractedPrice} from text: "${text.substring(0, 50)}..."`);
                    }
                }
            });
            
            if (price > 0 && isValidPrice(price) && !isSuspiciousPrice(price, '')) break;
        }
        if (price === 0 || !isValidPrice(price) || isSuspiciousPrice(price, '')) {
            if (price > 0 && isSuspiciousPrice(price, '')) {
                console.log(`[HTML Parser] ❌ LAST RESORT price extraction found suspicious price (likely rating): ${price} - resetting to 0`);
            } else {
                console.log(`[HTML Parser] ❌ LAST RESORT price extraction also failed - no valid price found`);
            }
            price = 0; // Ensure we reset invalid or suspicious prices
        }
    }

    // Try to extract brand
    const brandSelectors = [
        '[itemprop="brand"]',
        '.brand',
        '[data-brand]',
        'meta[property="product:brand"]',
        // Amazon-specific selectors
        '#productDetails_feature_div .po-brand span.po-break-word',
        '#productDetails_db_sections .po-brand span.po-break-word',
        'a#brand',
        'a[href*="/s?k="]', // Amazon brand link
        '.product-brand',
        '[data-asin] + a', // Amazon brand near ASIN
    ];

    for (const selector of brandSelectors) {
        try {
            const element = $(selector).first();
            if (element.length) {
                let brandText = element.text().trim() || element.attr('content') || element.attr('href') || '';
                // Clean Amazon brand links
                if (brandText.includes('/s?k=')) {
                    const match = brandText.match(/k=([^&]+)/);
                    if (match) brandText = decodeURIComponent(match[1].replace(/\+/g, ' '));
                }
                if (brandText && brandText.length > 1) {
                    brand = brandText;
                    console.log(`[HTML Parser] ✅ Brand extracted via selector "${selector}": "${brand}"`);
                    break;
                }
            }
        } catch (e) {
            // Continue to next selector
        }
    }
    if (!brand) {
        console.log(`[HTML Parser] ⚠️ Brand not found with standard selectors, trying fallback methods`);
    }
    
    // Amazon-specific: Try to extract from product title/name
    if (!brand && name) {
        // Pattern: "Brand Name Product Title" - extract first word(s)
        const nameParts = name.split(/\s+/);
        if (nameParts.length > 1) {
            // Check if first part looks like a brand (capitalized, short)
            const potentialBrand = nameParts[0];
            if (potentialBrand.length >= 2 && potentialBrand.length <= 20 && 
                /^[A-Z]/.test(potentialBrand)) {
                brand = potentialBrand;
            }
        }
    }

    // Fallback: Extract from URL or name, but filter out invalid brands
    if (!brand && name) {
        const urlParts = new URL(url).hostname.replace('www.', '').split('.');
        const domainBrand = urlParts[0] || '';
        // Only use domain as brand if it's a valid brand name (not generic domains)
        const invalidBrands = ['www', 'www.', 'http', 'https', 'com', 'net', 'org', 'in', 'co', 'io', 'shop', 'store', 'buy', 'amazon', 'flipkart', 'ebay', 'walmart', 'target'];
        if (domainBrand && !invalidBrands.includes(domainBrand.toLowerCase())) {
            brand = domainBrand;
        }
    }
    
    // Final validation: Clean up brand if it's invalid, but be less aggressive
    if (brand) {
        const cleanedBrand = brand.trim();
        const cleanedLower = cleanedBrand.toLowerCase();
        const invalidBrands = ['www', 'www.', 'http', 'https', 'https:', 'http:', 'com', 'net', 'org'];
        // Only clear if it's clearly invalid, preserve valid brands
        if (invalidBrands.includes(cleanedLower) || cleanedBrand.length < 2) {
            brand = '';
        } else {
            // Keep the original case, just trim
            brand = cleanedBrand;
        }
    }

    return { name, price, currency, brand };
}

/**
 * Extracts numeric price from text string.
 * Handles various international number formats.
 */
function extractPrice(text: string): number {
    // Handle Indian number format (lakhs/crores with commas)
    // e.g., "₹1,09,900" or "1,09,900"
    if (text.includes('₹') || text.match(/,\d{2},\d{3}/)) {
        // Indian format: remove all commas, then parse
        const cleaned = text.replace(/[^\d.]/g, '');
        return parseFloat(cleaned) || 0;
    }
    
    // Handle European format (comma as decimal separator)
    // e.g., "€89,99" or "89,99"
    if (text.match(/\d+,\d{2}(?!\d)/) && !text.includes('$')) {
        // Last comma is decimal separator
        const cleaned = text.replace(/[^\d,]/g, '');
        const priceStr = cleaned.replace(',', '.');
        return parseFloat(priceStr) || 0;
    }
    
    // Standard format (dot as decimal separator)
    // Remove currency symbols and extract numbers
    // Handles formats like: $99.99, €89.99, £79.99, 99.99, etc.
    const cleaned = text.replace(/[^\d.,]/g, '');
    
    // Handle thousands separators (commas) vs decimal separators
    // If there's a comma followed by 3 digits, it's likely a thousands separator
    if (cleaned.match(/,\d{3}(\.|$)/)) {
        // Remove commas (thousands separators)
        const priceStr = cleaned.replace(/,/g, '');
        return parseFloat(priceStr) || 0;
    }
    
    // If there's a comma with 1-2 digits after, it might be decimal separator
    if (cleaned.match(/,\d{1,2}$/)) {
        const priceStr = cleaned.replace(',', '.');
        return parseFloat(priceStr) || 0;
    }
    
    // Default: try to parse with dot as decimal
    const match = cleaned.match(/(\d+[.,]?\d*)/);
    if (match) {
        // Handle both comma and dot as decimal separator
        const priceStr = match[1].replace(',', '.');
        return parseFloat(priceStr) || 0;
    }
    
    return 0;
}

/**
 * Extracts currency code from text string.
 * Enhanced to detect currency more accurately.
 */
function extractCurrency(text: string): string {
    // Check for currency codes first (more reliable)
    const currencyMatch = text.match(/\b(USD|EUR|GBP|JPY|INR|CAD|AUD|CNY|SGD|HKD|CHF|NZD|MXN|BRL|ZAR|KRW|TRY)\b/i);
    if (currencyMatch) {
        return currencyMatch[1].toUpperCase();
    }
    
    // Check for currency symbols (order matters - some symbols overlap)
    if (text.includes('₹')) return 'INR'; // Indian Rupee (check before $)
    if (text.includes('€')) return 'EUR';
    if (text.includes('£')) return 'GBP';
    if (text.includes('¥')) {
        // Could be JPY or CNY, check context
        if (text.match(/[¥¥]\s*\d+[.,]?\d*\s*(JPY|CNY|元)/i)) {
            const match = text.match(/(JPY|CNY|元)/i);
            if (match && match[1].toUpperCase() === 'CNY') return 'CNY';
            if (match && match[1].toUpperCase() === '元') return 'CNY';
        }
        // Default to JPY for ¥ symbol
        return 'JPY';
    }
    if (text.includes('$')) {
        // Could be USD, CAD, AUD, etc. - check for country indicators
        if (text.match(/C\$|CAD|Canadian/i)) return 'CAD';
        if (text.match(/A\$|AUD|Australian/i)) return 'AUD';
        if (text.match(/HK\$|HKD|Hong Kong/i)) return 'HKD';
        if (text.match(/S\$|SGD|Singapore/i)) return 'SGD';
        // Default to USD
        return 'USD';
    }
    
    // Check for regional patterns
    if (text.match(/Rs\.|rupees?/i)) return 'INR';
    if (text.match(/euros?/i)) return 'EUR';
    if (text.match(/pounds?|sterling/i)) return 'GBP';
    if (text.match(/yen/i)) return 'JPY';
    
    return 'USD'; // Default fallback
}

/**
 * Fetches and parses a product page using selectors.
 */
export async function scrapeProductWithSelectors(
    url: string,
    nameSelector?: string | null,
    priceSelector?: string | null
): Promise<{ name: string; price: number; currency: string; brand: string }> {
    const html = await fetchHtml(url);
    return parseProductFromHtml(html, url, nameSelector, priceSelector);
}
