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

    // Helper function to detect if text is a discount/off amount (not the actual price)
    const looksLikeDiscount = (text: string): boolean => {
        const lowerText = text.toLowerCase();
        const discountKeywords = ['off', 'discount', 'save', 'extra', 'you save', 'save ₹', 'save $', 'save €', 'save £', 'off on', 'discount of', 'flat', 'instant'];
        // Check for patterns like "Extra ₹34000 off" or "Save ₹5000"
        const discountPatterns = [
            /extra\s*[₹$€£¥]\s*\d+/i,
            /save\s*[₹$€£¥]\s*\d+/i,
            /\d+\s*off/i,
            /off\s*[₹$€£¥]\s*\d+/i,
            /discount\s*of\s*[₹$€£¥]\s*\d+/i,
            /flat\s*[₹$€£¥]\s*\d+/i,
        ];
        return discountKeywords.some(keyword => lowerText.includes(keyword)) || 
               discountPatterns.some(pattern => pattern.test(text));
    };

    // Helper function to detect if text is a fee or additional charge (not the product price)
    const looksLikeFee = (text: string, price: number): boolean => {
        const lowerText = text.toLowerCase();
        const feeKeywords = ['fee', 'fees', 'charge', 'charges', 'shipping', 'delivery', 'tax', 'gst', 'vat', 'protect', 'warranty', 'insurance', 'promise', 'protection', 'additional', 'extra charge', 'service charge'];
        
        // Check for fee-related keywords
        if (feeKeywords.some(keyword => lowerText.includes(keyword))) {
            return true;
        }
        
        // Check for patterns like "+ ₹156 Protect Promise Fee" or "Shipping: $5"
        const feePatterns = [
            /\+\s*[₹$€£¥]\s*\d+/i, // Pattern: + ₹156
            /fee\s*[₹$€£¥]\s*\d+/i,
            /charge\s*[₹$€£¥]\s*\d+/i,
            /shipping\s*[₹$€£¥]\s*\d+/i,
            /delivery\s*[₹$€£¥]\s*\d+/i,
        ];
        
        if (feePatterns.some(pattern => pattern.test(text))) {
            return true;
        }
        
        // Very small prices (less than 1000) with fee-like context are likely fees, not product prices
        // But only if the text contains fee-related words
        if (price < 1000 && feeKeywords.some(keyword => lowerText.includes(keyword))) {
            return true;
        }
        
        return false;
    };

    // Helper function to detect if an element has strikethrough (indicating original/old price)
    const hasStrikethrough = ($el: any): boolean => {
        // Check if element is a strikethrough tag
        const tagName = ($el.prop('tagName') || '').toLowerCase();
        if (['s', 'strike', 'del'].includes(tagName)) {
            return true;
        }
        
        // Check inline style for text-decoration: line-through
        const style = $el.attr('style') || '';
        if (style.includes('text-decoration') && (style.includes('line-through') || style.includes('line-through'))) {
            return true;
        }
        
        // Check computed style (if available via CSS)
        // Note: cheerio doesn't compute styles, but we can check parent elements
        let parent = $el.parent();
        let depth = 0;
        while (parent.length > 0 && depth < 3) { // Check up to 3 levels up
            const parentStyle = parent.attr('style') || '';
            if (parentStyle.includes('text-decoration') && parentStyle.includes('line-through')) {
                return true;
            }
            const parentTag = (parent.prop('tagName') || '').toLowerCase();
            if (['s', 'strike', 'del'].includes(parentTag)) {
                return true;
            }
            parent = parent.parent();
            depth++;
        }
        
        // Check for common strikethrough classes (common in e-commerce sites)
        const classes = ($el.attr('class') || '').toLowerCase();
        const strikethroughClassPatterns = [
            /strike/,
            /line-through/,
            /old-price/,
            /original-price/,
            /was-price/,
            /previous-price/,
            /mrp/,
            /list-price/,
        ];
        if (strikethroughClassPatterns.some(pattern => pattern.test(classes))) {
            return true;
        }
        
        return false;
    };

    // Helper function to check if price looks suspicious (too many decimal places, or from rating/discount/fee text)
    const isSuspiciousPrice = (price: number, sourceText: string): boolean => {
        // If source text contains rating keywords, it's suspicious
        if (looksLikeRating(sourceText)) {
            return true;
        }
        
        // If source text contains discount keywords, it's suspicious (we want actual price, not discount amount)
        if (looksLikeDiscount(sourceText)) {
            return true;
        }
        
        // If source text contains fee keywords, it's suspicious (we want product price, not fees)
        if (looksLikeFee(sourceText, price)) {
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
                    // Collect all price candidates first, then prioritize current prices (non-strikethrough, non-discount, non-fee)
                    const priceCandidates: Array<{ price: number; currency: string; text: string; isDiscount: boolean; hasStrikethrough: boolean; isFee: boolean }> = [];
                    
                    $(tag).each((i: number, el: any) => {
                        const $el = $(el);
                        const elementText = $el.text().trim();
                        
                        // Only check direct children or small text blocks to avoid matching huge divs with multiple prices
                        if (elementText.includes(searchText) && elementText.length < 200) {
                            // Skip if this text looks like a rating, not a price
                            if (looksLikeRating(elementText)) {
                                console.log(`[HTML Parser] ⚠️ Skipping rating text: "${elementText.substring(0, 50)}..."`);
                                return; // Continue to next element
                            }
                            
                            // Skip if this text looks like a discount/off amount
                            if (looksLikeDiscount(elementText)) {
                                console.log(`[HTML Parser] ⚠️ Skipping discount text: "${elementText.substring(0, 50)}..."`);
                                return; // Continue to next element
                            }
                            
                            // Check if element has strikethrough (original/old price)
                            const isStrikethrough = hasStrikethrough($el);
                            if (isStrikethrough) {
                                console.log(`[HTML Parser] ⚠️ Skipping strikethrough (original) price: "${elementText.substring(0, 50)}..."`);
                                return; // Continue to next element - we want current price, not original
                            }
                            
                            const priceText = elementText;
                            const extractedPrice = extractPrice(priceText);
                            
                            // Check if this looks like a fee before adding to candidates
                            if (extractedPrice > 0 && looksLikeFee(priceText, extractedPrice)) {
                                console.log(`[HTML Parser] ⚠️ Skipping fee/additional charge: "${priceText.substring(0, 50)}..." (${extractedPrice})`);
                                return; // Continue to next element - we want product price, not fees
                            }
                            
                            if (extractedPrice > 0 && isValidPrice(extractedPrice) && !isSuspiciousPrice(extractedPrice, priceText)) {
                                const isDiscount = looksLikeDiscount(priceText);
                                const isFee = looksLikeFee(priceText, extractedPrice);
                                priceCandidates.push({
                                    price: extractedPrice,
                                    currency: extractCurrency(priceText),
                                    text: priceText,
                                    isDiscount,
                                    hasStrikethrough: isStrikethrough,
                                    isFee
                                });
                            } else if (extractedPrice > 0 && isSuspiciousPrice(extractedPrice, priceText)) {
                                console.log(`[HTML Parser] ⚠️ Suspicious price extracted (likely rating): ${extractedPrice} from text: "${priceText.substring(0, 50)}..."`);
                            }
                        }
                    });
                    
                    // Prioritize current product prices (non-strikethrough, non-discount, non-fee)
                    // Use smart selection: prefer reasonable prices, filter out outliers
                    if (priceCandidates.length > 0) {
                        // First, try to find a current product price (non-strikethrough, non-discount, non-fee)
                        const productPrices = priceCandidates.filter(c => !c.hasStrikethrough && !c.isDiscount && !c.isFee);
                        if (productPrices.length > 0) {
                            // Smart selection: if we have multiple prices, filter out outliers
                            // An outlier is a price that's 10x or more larger than the median
                            const sortedPrices = productPrices.map(c => c.price).sort((a, b) => a - b);
                            const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
                            const maxReasonablePrice = median * 10; // Allow up to 10x the median
                            
                            // Filter out outliers (unreasonably large prices)
                            const reasonablePrices = productPrices.filter(c => c.price <= maxReasonablePrice);
                            
                            if (reasonablePrices.length > 0) {
                                // If we filtered out outliers, use the largest of the reasonable prices
                                // Otherwise, if all prices are similar, prefer the median/smaller one to avoid picking wrong numbers
                                const selected = reasonablePrices.reduce((best, curr) => {
                                    // Prefer prices closer to the median, but if similar, prefer smaller (more likely correct for small products)
                                    const currDistance = Math.abs(curr.price - median);
                                    const bestDistance = Math.abs(best.price - median);
                                    if (Math.abs(currDistance - bestDistance) < median * 0.1) {
                                        // Similar distance from median, prefer smaller
                                        return curr.price < best.price ? curr : best;
                                    }
                                    return currDistance < bestDistance ? curr : best;
                                });
                                price = selected.price;
                                currency = selected.currency;
                                console.log(`[HTML Parser] ✅ Price extracted via selector "${priceSelector}": ${price} ${currency} from text: "${selected.text.substring(0, 50)}..." (selected from ${priceCandidates.length} candidates, filtered outliers)`);
                            } else {
                                // All prices were outliers, use the smallest one (might be correct for very small products)
                                const selected = productPrices.reduce((min, curr) => curr.price < min.price ? curr : min);
                                price = selected.price;
                                currency = selected.currency;
                                console.log(`[HTML Parser] ⚠️ Price extracted via selector "${priceSelector}": ${price} ${currency} from text: "${selected.text.substring(0, 50)}..." (all prices seemed like outliers, using smallest)`);
                            }
                        } else {
                            // Fallback: if no product prices, try non-strikethrough, non-fee prices
                            const nonStrikethroughNonFeePrices = priceCandidates.filter(c => !c.hasStrikethrough && !c.isFee);
                            if (nonStrikethroughNonFeePrices.length > 0) {
                                // Apply same outlier filtering
                                const sortedPrices = nonStrikethroughNonFeePrices.map(c => c.price).sort((a, b) => a - b);
                                const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
                                const maxReasonablePrice = median * 10;
                                const reasonablePrices = nonStrikethroughNonFeePrices.filter(c => c.price <= maxReasonablePrice);
                                
                                if (reasonablePrices.length > 0) {
                                    const selected = reasonablePrices.reduce((best, curr) => {
                                        const currDistance = Math.abs(curr.price - median);
                                        const bestDistance = Math.abs(best.price - median);
                                        if (Math.abs(currDistance - bestDistance) < median * 0.1) {
                                            return curr.price < best.price ? curr : best;
                                        }
                                        return currDistance < bestDistance ? curr : best;
                                    });
                                    price = selected.price;
                                    currency = selected.currency;
                                    console.log(`[HTML Parser] ⚠️ Price extracted via selector "${priceSelector}": ${price} ${currency} from text: "${selected.text.substring(0, 50)}..." (no product prices found, using filtered non-strikethrough, non-fee)`);
                                } else {
                                    const selected = nonStrikethroughNonFeePrices.reduce((min, curr) => curr.price < min.price ? curr : min);
                                    price = selected.price;
                                    currency = selected.currency;
                                    console.log(`[HTML Parser] ⚠️ Price extracted via selector "${priceSelector}": ${price} ${currency} from text: "${selected.text.substring(0, 50)}..." (all were outliers, using smallest)`);
                                }
                            } else {
                                // Last resort: pick the smallest price (to avoid large wrong numbers)
                                const selected = priceCandidates.reduce((min, curr) => curr.price < min.price ? curr : min);
                                price = selected.price;
                                currency = selected.currency;
                                console.log(`[HTML Parser] ⚠️ Price extracted via selector "${priceSelector}": ${price} ${currency} from text: "${selected.text.substring(0, 50)}..." (all candidates had issues, using smallest to avoid wrong large numbers)`);
                            }
                        }
                    }
                    
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
                    let priceText = priceElement.text().trim();
                    const dataPrice = priceElement.attr('data-price') || '';
                    const contentPrice = priceElement.attr('content') || '';
                    
                    // If selector is [data-price] or [itemprop="price"], check parent for displayed price
                    if ((priceSelector.includes('data-price') || priceSelector.includes('itemprop')) && (!priceText || !priceText.match(/Rs\.|₹|INR/i))) {
                        const parent = priceElement.parent();
                        const parentText = parent.text().trim();
                        
                        // Look for price with currency in parent
                        const pricePattern = /(?:Rs\.?\s*(?:INR\s*)?|₹)\s*([\d,]+\.?\d{1,2})\b/i;
                        const parentPriceMatch = parentText.match(pricePattern);
                        if (parentPriceMatch) {
                            priceText = parentText.substring(Math.max(0, parentText.indexOf(parentPriceMatch[0]) - 10),
                                                             Math.min(parentText.length, parentText.indexOf(parentPriceMatch[0]) + 50));
                        } else if (!priceText && parentText) {
                            priceText = parentText.substring(0, 200) + ' ' + (dataPrice || contentPrice || '');
                        }
                    }
                    
                    // Fallback to attribute values
                    if (!priceText) {
                        priceText = contentPrice || dataPrice;
                    }
                    
                    // Handle data-price that might be missing decimal point
                    if (dataPrice && !dataPrice.includes('.') && !dataPrice.includes(',')) {
                        const numValue = parseFloat(dataPrice);
                        const parentContext = priceElement.parent().text().trim();
                        if (parentContext.match(/Rs\.|₹|INR|rupees?/i) && numValue > 0 && numValue < 10000 && dataPrice.endsWith('0')) {
                            // Check if parent has decimal version
                            const decimalMatch = parentContext.match(/(?:Rs\.?\s*(?:INR\s*)?|₹)\s*([\d,]+\.\d{1,2})\b/i);
                            if (decimalMatch) {
                                priceText = parentContext.substring(Math.max(0, parentContext.indexOf(decimalMatch[0]) - 10),
                                                                   Math.min(parentContext.length, parentContext.indexOf(decimalMatch[0]) + 50));
                            }
                        }
                    }
                    
                    if (priceText) {
                        // Skip if this text looks like a rating, not a price
                        if (looksLikeRating(priceText)) {
                            console.log(`[HTML Parser] ⚠️ Price selector found rating text, not price: "${priceText.substring(0, 50)}..."`);
                            price = 0;
                        } else if (looksLikeDiscount(priceText)) {
                            console.log(`[HTML Parser] ⚠️ Price selector found discount text, not actual price: "${priceText.substring(0, 50)}..."`);
                            price = 0;
                        } else if (hasStrikethrough(priceElement)) {
                            console.log(`[HTML Parser] ⚠️ Price selector found strikethrough (original) price, not current price: "${priceText.substring(0, 50)}..."`);
                            price = 0;
                        } else {
                            const extractedPrice = extractPrice(priceText);
                            // Check if this looks like a fee
                            if (extractedPrice > 0 && looksLikeFee(priceText, extractedPrice)) {
                                console.log(`[HTML Parser] ⚠️ Price selector found fee/additional charge, not product price: "${priceText.substring(0, 50)}..." (${extractedPrice})`);
                                price = 0;
                            } else if (extractedPrice > 0 && isValidPrice(extractedPrice) && !isSuspiciousPrice(extractedPrice, priceText)) {
                                price = extractedPrice;
                                // Extract currency from parent context if available
                                const parent = priceElement.parent();
                                const fullContext = parent.text().trim() || priceText;
                                currency = extractCurrency(fullContext);
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

        // Collect all fallback price candidates to prioritize product prices over fees
        const fallbackCandidates: Array<{ price: number; currency: string; text: string; selector: string; isFee: boolean }> = [];
        
        for (const selector of commonPriceSelectors) {
            const element = $(selector).first();
            if (element.length) {
                // Skip if element has strikethrough (original price)
                if (hasStrikethrough(element)) {
                    console.log(`[HTML Parser] ⚠️ Skipping fallback selector "${selector}" - has strikethrough (original price)`);
                    continue;
                }
                
                // Get price text from multiple sources, prioritizing text content (which has currency context)
                let priceText = element.text().trim();
                const dataPrice = element.attr('data-price') || '';
                const contentPrice = element.attr('content') || '';
                
                // For [data-price] selector specifically, check parent and siblings for displayed price text
                // The data-price might be "990" but the displayed text is "Rs. 99.00"
                if (selector === '[data-price]') {
                    const parent = element.parent();
                    const parentText = parent.text().trim();
                    const grandParent = parent.parent();
                    const grandParentText = grandParent.text().trim();
                    
                    // Look for price pattern in parent/grandparent text (e.g., "Rs. 99.00", "₹99.00")
                    // Try multiple patterns to catch different formats
                    const pricePatterns = [
                        /Rs\.?\s*(?:INR\s*)?([\d,]+\.\d{1,2})\b/i,  // "Rs. 99.00" or "Rs INR 99.00"
                        /₹\s*([\d,]+\.\d{1,2})\b/i,                  // "₹99.00"
                        /Rs\.?\s*(?:INR\s*)?([\d,]+)\b/i,            // "Rs. 99" (without decimal)
                    ];
                    
                    let foundPriceText = '';
                    for (const pattern of pricePatterns) {
                        const match = parentText.match(pattern) || grandParentText.match(pattern);
                        if (match) {
                            // Found price with currency in parent/grandparent
                            const sourceText = parentText.match(pattern) ? parentText : grandParentText;
                            const matchIndex = sourceText.indexOf(match[0]);
                            foundPriceText = sourceText.substring(Math.max(0, matchIndex - 10), 
                                                                  Math.min(sourceText.length, matchIndex + 50));
                            break;
                        }
                    }
                    
                    if (foundPriceText) {
                        priceText = foundPriceText;
                    } else {
                        // Check siblings for price with currency
                        const siblings = element.siblings();
                        siblings.each((i: number, sibling: any) => {
                            const siblingText = $(sibling).text().trim();
                            if (siblingText.match(/Rs\.|₹|INR/i) && siblingText.match(/[\d,]+\.?\d{1,2}/)) {
                                priceText = siblingText.substring(0, 100);
                                return false; // Break
                            }
                        });
                        
                        // If still no price text with currency, use parent context
                        if (!priceText || !priceText.match(/Rs\.|₹|INR/i)) {
                            if (parentText) {
                                priceText = parentText.substring(0, 200);
                            } else if (grandParentText) {
                                priceText = grandParentText.substring(0, 200);
                            }
                        }
                    }
                }
                
                // If we only have data-price attribute (no text), check parent/sibling elements for currency context
                if (!priceText && dataPrice) {
                    const parent = element.parent();
                    const parentText = parent.text().trim();
                    const contextText = parentText || '';
                    priceText = contextText.substring(0, 200) + ' ' + dataPrice;
                }
                
                // Fallback to attribute values if no text
                if (!priceText) {
                    priceText = contentPrice || dataPrice;
                }
                
                // For data-price that's just a number without decimals, check if it should be divided
                // e.g., data-price="990" when actual price is "99.00"
                if (selector === '[data-price]' && dataPrice && !dataPrice.includes('.') && !dataPrice.includes(',')) {
                    const numValue = parseFloat(dataPrice);
                    const parentContext = element.parent().text().trim();
                    const grandParentContext = element.parent().parent().text().trim();
                    const fullContext = parentContext || grandParentContext;
                    
                    // If we have INR context and the number looks suspicious (like "990" for "99.00")
                    if (fullContext.match(/Rs\.|₹|INR|rupees?/i) && numValue > 0 && numValue < 10000) {
                        // Check if context has the correct decimal format
                        const decimalMatch = fullContext.match(/(?:Rs\.?\s*(?:INR\s*)?|₹)\s*([\d,]+\.\d{1,2})\b/i);
                        if (decimalMatch) {
                            // Use the decimal version from context
                            const matchIndex = fullContext.indexOf(decimalMatch[0]);
                            priceText = fullContext.substring(Math.max(0, matchIndex - 10),
                                                             Math.min(fullContext.length, matchIndex + 50));
                        } else if (numValue >= 100 && numValue < 10000) {
                            // Check if dividing by 10 gives a reasonable price (e.g., 990 -> 99.00)
                            const dividedPrice = numValue / 10;
                            // If divided price is reasonable (between 1 and 1000) and original ends in 0
                            if (dividedPrice >= 1 && dividedPrice <= 1000 && (numValue % 10 === 0 || dataPrice.endsWith('0'))) {
                                // Likely "990" should be "99.00" (divide by 10)
                                // Only if we haven't found a better price text already
                                if (!priceText || !priceText.match(/[\d,]+\.\d{1,2}/)) {
                                    const correctedPrice = dividedPrice.toFixed(2);
                                    // Use parent context with corrected price, ensuring INR currency
                                    priceText = (fullContext.substring(0, 100) + ' Rs. ' + correctedPrice).trim();
                                }
                            }
                        }
                    }
                }
                
                if (priceText) {
                    // Skip discount text
                    if (looksLikeDiscount(priceText)) {
                        continue;
                    }
                    
                    const extractedPrice = extractPrice(priceText);
                    if (extractedPrice > 0 && isValidPrice(extractedPrice) && !isSuspiciousPrice(extractedPrice, priceText)) {
                        const isFee = looksLikeFee(priceText, extractedPrice);
                        // Extract currency from full context (including parent/grandparent/sibling text)
                        // Prioritize priceText which might already have currency, then parent, then grandparent
                        const parent = element.parent();
                        const grandParent = parent.parent();
                        const parentText = parent.text().trim();
                        const grandParentText = grandParent.text().trim();
                        
                        // Build full context: use priceText first (it might have "Rs. 99.00"), then parent, then grandparent
                        let fullContext = priceText;
                        if (parentText && !fullContext.match(/Rs\.|₹|INR/i)) {
                            fullContext = parentText.substring(0, 300);
                        }
                        if (grandParentText && !fullContext.match(/Rs\.|₹|INR/i)) {
                            fullContext = grandParentText.substring(0, 300);
                        }
                        // If still no currency found, combine all
                        if (!fullContext.match(/Rs\.|₹|INR/i)) {
                            fullContext = (priceText + ' ' + parentText.substring(0, 200) + ' ' + grandParentText.substring(0, 200)).trim();
                        }
                        
                        const detectedCurrency = extractCurrency(fullContext);
                        
                        fallbackCandidates.push({
                            price: extractedPrice,
                            currency: detectedCurrency,
                            text: priceText,
                            selector,
                            isFee
                        });
                    }
                }
            }
        }
        
        // Prioritize product prices (non-fee) with smart selection
        if (fallbackCandidates.length > 0) {
            const productPrices = fallbackCandidates.filter(c => !c.isFee);
            if (productPrices.length > 0) {
                // Apply outlier filtering if we have multiple prices
                if (productPrices.length > 1) {
                    const sortedPrices = productPrices.map(c => c.price).sort((a, b) => a - b);
                    const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
                    const maxReasonablePrice = median * 10;
                    const reasonablePrices = productPrices.filter(c => c.price <= maxReasonablePrice);
                    
                    if (reasonablePrices.length > 0) {
                        const selected = reasonablePrices.reduce((best, curr) => {
                            const currDistance = Math.abs(curr.price - median);
                            const bestDistance = Math.abs(best.price - median);
                            if (Math.abs(currDistance - bestDistance) < median * 0.1) {
                                return curr.price < best.price ? curr : best;
                            }
                            return currDistance < bestDistance ? curr : best;
                        });
                        price = selected.price;
                        currency = selected.currency;
                        console.log(`[HTML Parser] ✅ Price extracted via fallback selector "${selected.selector}": ${price} ${currency} (prioritized product price, filtered outliers)`);
                    } else {
                        // All were outliers, use smallest
                        const selected = productPrices.reduce((min, curr) => curr.price < min.price ? curr : min);
                        price = selected.price;
                        currency = selected.currency;
                        console.log(`[HTML Parser] ⚠️ Price extracted via fallback selector "${selected.selector}": ${price} ${currency} (all were outliers, using smallest)`);
                    }
                } else {
                    // Only one product price, use it
                    price = productPrices[0].price;
                    currency = productPrices[0].currency;
                    console.log(`[HTML Parser] ✅ Price extracted via fallback selector "${productPrices[0].selector}": ${price} ${currency} (prioritized product price over fees)`);
                }
            } else {
                // Fallback: pick the smallest price (to avoid wrong large numbers)
                const selected = fallbackCandidates.reduce((min, curr) => curr.price < min.price ? curr : min);
                price = selected.price;
                currency = selected.currency;
                console.log(`[HTML Parser] ⚠️ Price extracted via fallback selector "${selected.selector}": ${price} ${currency} (all candidates were fees, using smallest to avoid wrong numbers)`);
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
        const lastResortCandidates: Array<{ price: number; currency: string; text: string; isFee: boolean }> = [];
        
        for (const symbol of currencySymbols) {
            // Find all elements containing the currency symbol
            $('*').each((i: number, el: any) => {
                const $el = $(el);
                const text = $el.text().trim();
                
                // Only check small text blocks to avoid matching huge divs with multiple prices
                // Look for elements with currency symbol and reasonable text length
                // Skip if this text looks like a rating, not a price
                if (looksLikeRating(text)) {
                    return; // Continue to next element
                }
                
                // Skip if this text looks like a discount/off amount
                if (looksLikeDiscount(text)) {
                    return; // Continue to next element
                }
                
                // Skip if element has strikethrough (original price)
                if (hasStrikethrough($el)) {
                    return; // Continue to next element - we want current price, not original
                }
                
                // Check if element contains currency symbol and looks like a price
                if (text.includes(symbol) && /\d/.test(text) && text.length < 200) {
                    const extractedPrice = extractPrice(text);
                    if (extractedPrice > 0 && isValidPrice(extractedPrice) && !isSuspiciousPrice(extractedPrice, text)) {
                        const isFee = looksLikeFee(text, extractedPrice);
                        lastResortCandidates.push({
                            price: extractedPrice,
                            currency: extractCurrency(text),
                            text,
                            isFee
                        });
                    } else if (extractedPrice > 0 && isSuspiciousPrice(extractedPrice, text)) {
                        console.log(`[HTML Parser] ⚠️ Suspicious price from LAST RESORT (likely rating): ${extractedPrice} from text: "${text.substring(0, 50)}..."`);
                    }
                }
            });
        }
        
        // Prioritize product prices (non-fee) with smart selection
        if (lastResortCandidates.length > 0) {
            const productPrices = lastResortCandidates.filter(c => !c.isFee);
            if (productPrices.length > 0) {
                // Apply outlier filtering if we have multiple prices
                if (productPrices.length > 1) {
                    const sortedPrices = productPrices.map(c => c.price).sort((a, b) => a - b);
                    const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
                    const maxReasonablePrice = median * 10;
                    const reasonablePrices = productPrices.filter(c => c.price <= maxReasonablePrice);
                    
                    if (reasonablePrices.length > 0) {
                        const selected = reasonablePrices.reduce((best, curr) => {
                            const currDistance = Math.abs(curr.price - median);
                            const bestDistance = Math.abs(best.price - median);
                            if (Math.abs(currDistance - bestDistance) < median * 0.1) {
                                return curr.price < best.price ? curr : best;
                            }
                            return currDistance < bestDistance ? curr : best;
                        });
                        price = selected.price;
                        currency = selected.currency;
                        console.log(`[HTML Parser] ✅ Price extracted via LAST RESORT method (currency symbol search): ${price} ${currency} from text: "${selected.text.substring(0, 50)}..." (prioritized product price, filtered outliers)`);
                    } else {
                        // All were outliers, use smallest
                        const selected = productPrices.reduce((min, curr) => curr.price < min.price ? curr : min);
                        price = selected.price;
                        currency = selected.currency;
                        console.log(`[HTML Parser] ⚠️ Price extracted via LAST RESORT method: ${price} ${currency} from text: "${selected.text.substring(0, 50)}..." (all were outliers, using smallest)`);
                    }
                } else {
                    // Only one product price, use it
                    price = productPrices[0].price;
                    currency = productPrices[0].currency;
                    console.log(`[HTML Parser] ✅ Price extracted via LAST RESORT method (currency symbol search): ${price} ${currency} from text: "${productPrices[0].text.substring(0, 50)}..." (prioritized product price over fees)`);
                }
            } else {
                // Fallback: pick the smallest price (to avoid wrong large numbers)
                const selected = lastResortCandidates.reduce((min, curr) => curr.price < min.price ? curr : min);
                price = selected.price;
                currency = selected.currency;
                console.log(`[HTML Parser] ⚠️ Price extracted via LAST RESORT method: ${price} ${currency} from text: "${selected.text.substring(0, 50)}..." (all candidates were fees, using smallest to avoid wrong numbers)`);
            }
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
    // First, extract the first number sequence that looks like a price
    // This helps avoid picking up random large numbers from the page
    
    // Handle Indian Rupee format specifically
    if (text.includes('₹') || text.includes('Rs.') || text.includes('Rs ') || text.includes('INR')) {
        // Extract number after currency symbol
        // Patterns: "₹173.000", "₹1,09,900", "Rs. 99.00", "Rs 173.000", "Rs.INR 99.00", "Rs INR 99.00"
        // Match: ₹ or Rs. or Rs followed by optional INR and whitespace, then the number
        const rupeeMatch = text.match(/(?:₹|Rs\.?\s*(?:INR\s*)?)([\d,]+\.?\d*)/i);
        if (rupeeMatch) {
            let numStr = rupeeMatch[1];
            
            // Check if it's Indian lakhs/crores format (e.g., "1,09,900")
            if (numStr.match(/,\d{2},\d{3}/)) {
                // Indian format: remove all commas
                numStr = numStr.replace(/,/g, '');
            } else if (numStr.includes(',')) {
                // Could be thousands separator (e.g., "1,73,000" or "825,000")
                // Check if it follows Indian format (last comma before 3 digits, previous before 2)
                const parts = numStr.split(',');
                if (parts.length === 2 && parts[1].length === 3) {
                    // Likely thousands separator: "825,000" -> 825000
                    numStr = numStr.replace(/,/g, '');
                } else if (parts.length >= 2 && parts[parts.length - 1].length === 3 && parts[parts.length - 2].length === 2) {
                    // Indian format: "1,73,000"
                    numStr = numStr.replace(/,/g, '');
                } else {
                    // Might be decimal separator in some formats
                    numStr = numStr.replace(/,/g, '');
                }
            }
            
            // Handle decimal point
            // "173.000" should be 173.00 (treat as decimal, not thousands)
            // "173.00" should be 173.00
            // "173000" should be 173000
            if (numStr.includes('.')) {
                const parts = numStr.split('.');
                if (parts.length === 2) {
                    // Check if decimal part is reasonable (0-2 digits for cents, or 3+ for thousands separator)
                    const decimalPart = parts[1];
                    if (decimalPart.length <= 2) {
                        // Standard decimal: "173.00" or "173.0"
                        return parseFloat(numStr) || 0;
                    } else if (decimalPart.length === 3 && parts[0].length <= 3) {
                        // Could be "173.000" meaning 173.00 (some sites use 3 decimal places)
                        // Or could be thousands separator, but less likely with short integer part
                        return parseFloat(parts[0] + '.' + decimalPart.substring(0, 2)) || 0;
                    } else {
                        // Likely thousands separator: "825.000" -> 825000
                        return parseFloat(parts.join('')) || 0;
                    }
                } else {
                    // Multiple periods - likely formatting issue, take first part
                    return parseFloat(parts[0]) || 0;
                }
            }
            
            return parseFloat(numStr) || 0;
        }
        
        // Fallback: Try to match "Rs.INR 99.00" or "Rs INR 99.00" patterns more flexibly
        // This handles cases where INR appears between Rs and the number
        const flexibleRupeeMatch = text.match(/(?:Rs\.?\s*)?(?:INR\s*)?([\d,]+\.?\d{1,2})\b/i);
        if (flexibleRupeeMatch) {
            let numStr = flexibleRupeeMatch[1];
            // Remove commas if present
            numStr = numStr.replace(/,/g, '');
            const price = parseFloat(numStr) || 0;
            if (price > 0) {
                return price;
            }
        }
    }
    
    // Handle Indian number format (lakhs/crores with commas) - without currency symbol
    // e.g., "1,09,900" (lakhs format: comma after 2 digits, then 3)
    if (text.match(/^\d{1,2},\d{2},\d{3}/) || text.match(/,\d{2},\d{3}/)) {
        // Indian lakhs/crores format: remove all commas
        const cleaned = text.replace(/[^\d.]/g, '');
        return parseFloat(cleaned) || 0;
    }
    
    // Handle European format (comma as decimal separator)
    // e.g., "€89,99" or "89,99"
    if (text.match(/\d+,\d{2}(?!\d)/) && !text.includes('$') && !text.includes('₹')) {
        // Last comma is decimal separator
        const cleaned = text.replace(/[^\d,]/g, '');
        const priceStr = cleaned.replace(',', '.');
        return parseFloat(priceStr) || 0;
    }
    
    // Standard format (dot as decimal separator)
    // Remove currency symbols and extract numbers
    // Handles formats like: $99.99, €89.99, £79.99, 99.99, etc.
    const cleaned = text.replace(/[^\d.,]/g, '');
    
    // Extract first reasonable number sequence
    const numberMatch = cleaned.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/);
    if (numberMatch) {
        let numStr = numberMatch[1];
        
        // Handle thousands separators (commas) vs decimal separators
        // If there's a comma followed by 3 digits, it's likely a thousands separator
        if (numStr.match(/,\d{3}(\.|$)/)) {
            // Remove commas (thousands separators)
            numStr = numStr.replace(/,/g, '');
            return parseFloat(numStr) || 0;
        }
        
        // If there's a comma with 1-2 digits after, it might be decimal separator
        if (numStr.match(/,\d{1,2}$/)) {
            const priceStr = numStr.replace(',', '.');
            return parseFloat(priceStr) || 0;
        }
        
        // Handle decimal point
        if (numStr.includes('.')) {
            return parseFloat(numStr) || 0;
        }
        
        return parseFloat(numStr) || 0;
    }
    
    // Fallback: try to parse any number
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
    // Check for currency codes first (more reliable) - prioritize INR
    const currencyMatch = text.match(/\b(USD|EUR|GBP|JPY|INR|CAD|AUD|CNY|SGD|HKD|CHF|NZD|MXN|BRL|ZAR|KRW|TRY)\b/i);
    if (currencyMatch) {
        // If both INR and another currency are found, prioritize INR
        const inrMatch = text.match(/\bINR\b/i);
        if (inrMatch) {
            return 'INR';
        }
        return currencyMatch[1].toUpperCase();
    }
    
    // Check for Indian Rupee indicators BEFORE checking $ symbol
    // This is important because some text might have both Rs. and $ (e.g., in conversion text)
    if (text.includes('₹')) return 'INR'; // Indian Rupee symbol
    if (text.match(/\bRs\.?\s*(INR)?/i)) return 'INR'; // Rs. or Rs with optional INR
    if (text.match(/rupees?/i)) return 'INR';
    
    // Check for currency symbols (order matters - some symbols overlap)
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
    
    // Check for $ symbol LAST (after INR checks) to avoid false positives
    // Some pages might have $ in conversion text or other contexts
    if (text.includes('$')) {
        // If we already found INR indicators, don't use $
        // Could be USD, CAD, AUD, etc. - check for country indicators
        if (text.match(/C\$|CAD|Canadian/i)) return 'CAD';
        if (text.match(/A\$|AUD|Australian/i)) return 'AUD';
        if (text.match(/HK\$|HKD|Hong Kong/i)) return 'HKD';
        if (text.match(/S\$|SGD|Singapore/i)) return 'SGD';
        // Default to USD
        return 'USD';
    }
    
    // Check for other regional patterns
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
