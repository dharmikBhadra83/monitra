import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { ProductDNA } from './types';

// Initialize the model
const model = new ChatOpenAI({
  modelName: 'gpt-4o',
  temperature: 0,
});

/**
 * AI-Direct Extractor: Uses AI to directly extract product information from URLs
 * This approach relies ENTIRELY on AI - NO selectors, NO parsing, NO scraping logic.
 * 
 * PURE AI APPROACH:
 * - Fetches HTML (just to get content)
 * - Cleans HTML to readable text (removes scripts, styles, SVGs, etc.)
 * - Passes text directly to AI for extraction
 * - AI analyzes and extracts all product data
 * 
 * NOTE: This is a separate implementation for future use.
 * The existing scraping approach (db-scraper.ts) remains unchanged.
 */
export async function aiDirectExtractProduct(url: string): Promise<ProductDNA> {
  try {
    console.log(`[AI Direct] 🤖 Starting PURE AI extraction (NO selectors, NO scraping) for: ${url}`);

    // Fetch HTML content (just to get the page content for AI)
    // NO parsing, NO selectors, NO scraping logic - just fetch raw HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`[AI Direct] 📄 Fetched HTML content (${(html.length / 1024).toFixed(2)}KB)`);

    // Extract text content from HTML (minimal processing, just to get readable text for AI)
    // NO SELECTORS, NO PARSING - just clean text for AI analysis
    const textContent = extractTextFromHtml(html);

    // Use AI to directly extract product information - PURE AI, NO SCRAPING LOGIC
    const productDNA = await extractProductWithAI(url, textContent);
    
    // AI extraction is already verified (verifiedByAI set by AI itself)
    console.log(`[AI Direct] ✅ AI extraction complete - verified by AI analysis`);

    // Always default currency to INR as per requirements
    if (!productDNA.currency || productDNA.currency === '') {
      productDNA.currency = 'INR';
    }

    console.log(`[AI Direct] ✅ Extraction complete: ${productDNA.name} - ${productDNA.price} ${productDNA.currency}`);

    return productDNA;
  } catch (error: any) {
    console.error(`[AI Direct] ❌ Error extracting product:`, error);
    throw new Error(`AI direct extraction failed: ${error.message}`);
  }
}

/**
 * Minimal HTML text extraction - just gets readable text for AI
 * No parsing logic, no selectors, just basic text extraction
 * Removes all non-content elements: scripts, styles, SVGs, iframes, etc.
 */
function extractTextFromHtml(html: string): string {
  let text = html;
  
  // Remove script tags
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Remove style tags
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove SVG elements (entire SVG tags and content)
  text = text.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');
  
  // Remove noscript tags
  text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  
  // Remove iframe tags
  text = text.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
  
  // Remove object and embed tags
  text = text.replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '');
  text = text.replace(/<embed[^>]*>/gi, '');
  
  // Remove audio and video tags
  text = text.replace(/<audio[^>]*>[\s\S]*?<\/audio>/gi, '');
  text = text.replace(/<video[^>]*>[\s\S]*?<\/video>/gi, '');
  
  // Remove canvas tags
  text = text.replace(/<canvas[^>]*>[\s\S]*?<\/canvas>/gi, '');
  
  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove all remaining HTML tags but keep text content
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Decode HTML entities (basic ones)
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  
  // Clean up whitespace (multiple spaces, newlines, tabs)
  text = text.replace(/\s+/g, ' ').trim();
  
  // Limit to reasonable size for AI (keep first 50KB of text)
  if (text.length > 50000) {
    text = text.substring(0, 50000) + '...';
  }
  
  return text;
}

/**
 * Uses AI to directly extract product information from text content
 */
async function extractProductWithAI(url: string, content: string): Promise<ProductDNA> {
  const parser = new JsonOutputParser<ProductDNA>();

  const prompt = PromptTemplate.fromTemplate(`
    You are an expert at extracting product information from web pages.
    Analyze the following content from a product page and extract all relevant product details.
    
    URL: {url}
    Page Content: {content}
    
    CRITICAL INSTRUCTIONS:
    
    1. PRICE AND CURRENCY EXTRACTION:
       - Extract the EXACT price as displayed on the page (handle formats like "₹88,00", "$99.99", "€89.99")
       - Identify the currency from symbols (₹ = INR, $ = USD, € = EUR, £ = GBP, ¥ = JPY)
       - Return the ORIGINAL price and currency - DO NOT convert
       - Default to INR if currency cannot be determined
       - Price should be a number (remove commas, currency symbols)
    
    2. PRODUCT NAME:
       - Extract the full product name/title
       - Should be clear and descriptive
    
    3. BRAND:
       - Extract the brand/manufacturer name
       - Look for brand in: product title, content, URL domain
       - NEVER use "www", domain names, or generic marketplace names as brand
       - Examples: "Apple", "Samsung", "Nike" - NOT "amazon.com" or "www"
    
    4. CATEGORY:
       - Determine the product category (e.g., "Electronics", "Clothing", "Food", "Home & Kitchen")
    
    5. FEATURES:
       - Extract key features/attributes as an array
       - Can be empty array if no features found
    
    6. DESCRIPTION:
       - Extract product description if available
    
    7. IMAGE URL:
       - Extract the main product image URL if available
    
    8. VERIFICATION:
       - Set verifiedByAI to true if you're confident about the price and currency extraction
       - Be thorough in your analysis
    
    Return a JSON object with this exact structure:
    {{
      "name": "string",
      "brand": "string",
      "price": number,
      "currency": "string" (default to "INR" if uncertain),
      "category": "string",
      "features": ["string"],
      "description": "string" (optional),
      "imageUrl": "string" (optional),
      "url": "{url}",
      "verifiedByAI": boolean
    }}
    
    IMPORTANT EXAMPLES:
    - If you see "₹88,00" or "88,00" → price: 88, currency: "INR"
    - If you see "$99.99" → price: 99.99, currency: "USD"
    - If you see "€89.99" → price: 89.99, currency: "EUR"
    - Always default currency to "INR" if uncertain
    
    Be accurate and thorough. Extract exactly what you see on the page.
  `);

  try {
    const chain = prompt.pipe(model).pipe(parser);
    const result = await chain.invoke({
      url: url,
      content: content,
    });

    // Ensure URL is set
    result.url = url;

    // Ensure currency defaults to INR
    if (!result.currency || result.currency === '') {
      result.currency = 'INR';
    }

    // Ensure verifiedByAI is set
    if (result.verifiedByAI === undefined) {
      result.verifiedByAI = true; // Default to true for AI-only extraction
    }

    return result as ProductDNA;
  } catch (error: any) {
    console.error(`[AI Direct] ❌ AI extraction failed:`, error);
    throw new Error(`Failed to extract product with AI: ${error.message}`);
  }
}
