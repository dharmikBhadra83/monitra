import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { ProductDNA, CompetitorProduct } from './types';
import * as cheerio from 'cheerio';

// Initialize the model (using environment variables in production)
const model = new ChatOpenAI({
  modelName: 'gpt-4o',
  temperature: 0,
});

/**
 * Parses product DNA from raw text/markdown.
 */
export async function parseProductDNA(content: string, url: string): Promise<ProductDNA> {
  const parser = new JsonOutputParser<ProductDNA>();

  const prompt = PromptTemplate.fromTemplate(`
    Analyze the following product page content and extract structured data.
    Note: The content might be a direct markdown scrape OR a search engine snippet (prefixed with SCANNED_VIA_SEARCH_PROXY). 
    Extract the most accurate details possible from the available text.
    
    URL: {url}
    Content: {content}
    
    IMPORTANT - PRICE AND CURRENCY HANDLING:
    1. First, identify the currency format from the price text (look for currency symbols like $, €, £, ₹, ¥, or currency codes like USD, EUR, GBP, INR, JPY)
    2. Extract the price as a NUMBER from the original text (handle formats like "₹1,09,900", "€89.99", "$99.99", "£79.99")
    3. Identify the currency code (USD, EUR, GBP, INR, JPY, CAD, AUD, etc.) from the original text
    4. CRITICAL: DO NOT convert the price to USD. Return the ORIGINAL price and currency as found on the page.
    5. Return the ORIGINAL price in the "price" field and the ORIGINAL currency code in the "currency" field.
    6. The system will handle currency conversion automatically - you just need to extract the exact price and currency as displayed.
    
    IMPORTANT - BRAND EXTRACTION RULES:
    1. ALWAYS try to extract the brand/manufacturer name (e.g., "Apple", "Samsung", "Nike", "Sony", "iQOO", "OnePlus")
    2. Look for brand information in:
       - Product title/name (e.g., "iPhone 15 Pro" → brand: "Apple", "iQOO Z10 Lite" → brand: "iQOO")
       - Brand mentions in the content (look for "by [Brand]", "Brand:", "Manufacturer:", etc.)
       - Meta tags or structured data
       - URL domain (if it's a brand site like "apple.com" → "Apple", "samsung.com" → "Samsung")
    3. NEVER use "www", "www.", "http", "https", or generic domain names (amazon, flipkart, ebay) as brand names
    4. If you find a valid brand name, return it. Only return empty string "" if absolutely no brand can be identified
    5. Brand should be a real company/manufacturer name, not a website or URL component
    6. Be thorough - brands are important for product identification
    
    Format your response as a JSON object matching this structure:
    {{
      "name": "string",
      "brand": "string" (REAL brand name like "Apple", "Samsung", etc. - NEVER "www" or domain names),
      "price": number (ORIGINAL price as found on the page - DO NOT convert),
      "currency": "string" (ORIGINAL currency code like USD, EUR, GBP, INR, JPY, etc.),
      "category": "string",
      "features": ["string"],
      "description": "string"
    }}
    
    BRAND EXAMPLES:
    - ✅ CORRECT: "Apple", "Samsung", "Nike", "Sony", "Microsoft"
    - ❌ WRONG: "www", "www.apple.com", "amazon", "flipkart", "http://"
    
    PRICE EXTRACTION EXAMPLES:
    - If you find "₹1,09,900" (INR): Extract price = 109900, return {{"price": 109900, "currency": "INR"}}
    - If you find "€89.99" (EUR): Extract price = 89.99, return {{"price": 89.99, "currency": "EUR"}}
    - If you find "$99.99" (USD): Extract price = 99.99, return {{"price": 99.99, "currency": "USD"}}
    - If you find "£79.99" (GBP): Extract price = 79.99, return {{"price": 79.99, "currency": "GBP"}}
    
    REMEMBER: Extract the EXACT price and currency as displayed on the page. DO NOT convert to USD. The system will handle conversion automatically.
  `);

  const chain = prompt.pipe(model).pipe(parser);
  
  console.log(`[AI] 🤖 parseProductDNA - Invoking GPT-4o | Content length: ${content.length} chars (~${Math.ceil(content.length / 4)} tokens) | URL: ${url}`);
  
  const result = await chain.invoke({ content, url });
  
  console.log(`[AI] ✅ parseProductDNA RESPONSE - Name: "${result.name?.substring(0, 60) || 'N/A'}..." | Brand: "${result.brand || 'N/A'}" | Price: ${result.price || 0} ${result.currency || 'N/A'} | Category: "${result.category || 'N/A'}"`);

  return { ...result, url };
}

/**
 * Identifies potential competitors based on Product DNA.
 */
export async function discoverCompetitors(product: ProductDNA): Promise<CompetitorProduct[]> {
  const parser = new JsonOutputParser<{ competitors: CompetitorProduct[] }>();

  const prompt = PromptTemplate.fromTemplate(`
    You are a market intelligence expert. Given the following product "DNA", identify 5 direct competitors.
    The competitors must be in the same market segment (e.g., if it's luxury beauty, choose luxury beauty competitors).
    
    Product: {name} by {brand}
    Category: {category}
    Price: {price} {currency}
    Features: {features}
    
    Provide your response as a JSON object:
    {{
      "competitors": [
        {{
          "name": "Product Name",
          "brand": "Brand Name",
          "price": estimated_price_number,
          "currency": "{currency}",
          "url": "official_store_url_or_shoppping_url",
          "similarityScore": 0.0-1.0,
          "matchReason": "Why is this a competitor?"
        }}
      ]
    }}
  `);

  const chain = prompt.pipe(model).pipe(parser);
  
  console.log(`[AI] 🤖 discoverCompetitors - Invoking GPT-4o | Product: "${product.name}" by ${product.brand}`);
  
  const result = await chain.invoke({
    name: product.name,
    brand: product.brand,
    category: product.category,
    price: product.price,
    currency: product.currency,
    features: product.features.join(', '),
  });
  
  console.log(`[AI] ✅ discoverCompetitors RESPONSE - Found ${result.competitors?.length || 0} competitors`);

  return result.competitors;
}

/**
 * Generates search queries to find competitors based on Product DNA.
 */
export async function generateSearchQueries(product: ProductDNA): Promise<string[]> {
  const parser = new JsonOutputParser<{ queries: string[] }>();

  const prompt = PromptTemplate.fromTemplate(`
    You are a market research AI. Based on the following product DNA, generate 3 optimized Google search queries to find direct competitor product pages from other brands.
    
    Product: {name} by {brand}
    Category: {category}
    Price: {price} {currency}
    Features: {features}
    
    The queries should focus on finding "alternatives", "competitors", or "similar products" in the same market tier.
    
    Return a JSON object:
    {{
      "queries": ["query 1", "query 2", "query 3"]
    }}
  `);

  const chain = prompt.pipe(model).pipe(parser);
  const result = await chain.invoke({
    name: product.name,
    brand: product.brand,
    category: product.category,
    price: product.price,
    currency: product.currency,
    features: product.features.join(', '),
  });

  return result.queries;
}

/**
 * Validates if a scraped competitor page is actually a good match.
 */
export async function validateCompetitor(
  target: ProductDNA,
  competitorContent: string,
  competitorUrl: string
): Promise<CompetitorProduct | null> {
  const parser = new JsonOutputParser<{ competitor: CompetitorProduct | null }>();

  const prompt = PromptTemplate.fromTemplate(`
    Compare the target product with the scraped content of a potential competitor.
    Note: The content might be a direct markdown scrape OR a search engine snippet (prefixed with SCANNED_VIA_SEARCH_PROXY).
    
    Target Product: {targetName} ({targetBrand})
    Price: {targetPrice} {targetCurrency}
    
    Scraped Content: {content}
    URL: {url}
    
    If this is a valid direct competitor (same category, comparable tier), extract its details. 
    If it is NOT a direct competitor (e.g., a blog post, a different category, or a sample size), return null.
    
    Format as JSON:
    {{
      "competitor": {{
        "name": "string",
        "brand": "string",
        "price": number,
        "currency": "string",
        "url": "{url}",
        "similarityScore": number (0-1),
        "matchReason": "string"
      }} or null
    }}
  `);

  const chain = prompt.pipe(model).pipe(parser);
  const result = await chain.invoke({
    targetName: target.name,
    targetBrand: target.brand,
    targetPrice: target.price,
    targetCurrency: target.currency,
    content: competitorContent.substring(0, 5000), // Avoid token limits
    url: competitorUrl
  });

  return result?.competitor ?? null;
}

/**
 * Converts HTML to a cleaner, token-efficient format for AI analysis.
 * Extracts structural information to handle dynamic class names.
 */
function htmlToStructuredSummary(html: string): string {
  const $ = cheerio.load(html);

  // Remove scripts, styles, and other non-content elements
  $('script, style, noscript, iframe, svg').remove();

  // Extract potential product name elements with structural info
  const nameCandidates: Array<{
    text: string;
    tag: string;
    selector: string;
    structural: string;
  }> = [];

  // Check all h1, h2, and elements with semantic attributes
  $('h1, h2, [itemprop="name"], [data-product-title]').each((i: number, el: any) => {
    const $el = $(el);
    const text = $el.text().trim();
    if (text && text.length < 200 && text.length > 5) {
      const tagName = ($el.prop('tagName') || el.tagName || 'div').toLowerCase();
      const itemprop = $el.attr('itemprop');
      const dataAttr = $el.attr('data-product-title') ? 'data-product-title' : '';
      const id = $el.attr('id') || '';
      const classes = $el.attr('class') || '';
      
      // Build structural selector (prefer stable attributes)
      let selector = '';
      let structural = '';
      
      if (itemprop) {
        selector = `[itemprop="name"]`;
        structural = 'semantic attribute';
      } else if (dataAttr) {
        selector = `[data-product-title]`;
        structural = 'data attribute';
      } else if (id && !/^[a-z0-9]{6,}$/i.test(id)) { // Avoid random IDs
        selector = `#${id}`;
        structural = 'stable ID';
      } else if (tagName === 'h1' || tagName === 'h2') {
        // Use structural position for headings
        const parent = $el.parent();
        const parentClass = parent.attr('class') || '';
        if (parentClass && !/^[a-z0-9]{6,}$/i.test(parentClass.split(' ')[0])) {
          selector = `${parentClass.split(' ')[0]} ${tagName}`;
          structural = 'parent-child relationship';
        } else {
          selector = tagName;
          structural = 'semantic tag';
        }
      } else if (classes) {
        // Only use class if it looks stable (not random)
        const firstClass = classes.split(' ')[0];
        if (!/^[a-z0-9]{6,}$/i.test(firstClass) || firstClass.includes('-') || firstClass.includes('_')) {
          selector = `.${firstClass}`;
          structural = 'stable class';
        }
      }

      if (selector) {
        nameCandidates.push({
          text: text.substring(0, 100),
          tag: tagName,
          selector,
          structural,
        });
      }
    }
  });

  // Extract potential price elements with structural info
  const priceCandidates: Array<{
    text: string;
    selector: string;
    structural: string;
    currency: string;
  }> = [];

  // Find all elements containing currency symbols or price patterns
  $('*').each((i: number, el: any) => {
    const $el = $(el);
    const text = $el.text().trim() || $el.attr('content') || $el.attr('data-price') || '';
    
    // Check if this looks like a price
    if (text && /[\d.,$€£¥₹]/.test(text) && /\d/.test(text)) {
      const tagName = ($el.prop('tagName') || el.tagName || 'div').toLowerCase();
      const itemprop = $el.attr('itemprop');
      const dataPrice = $el.attr('data-price');
      const id = $el.attr('id') || '';
      const classes = $el.attr('class') || '';
      const ariaLabel = $el.attr('aria-label') || '';
      
      // Extract currency
      let currency = 'USD';
      if (text.includes('₹')) currency = 'INR';
      else if (text.includes('$')) currency = 'USD';
      else if (text.includes('€')) currency = 'EUR';
      else if (text.includes('£')) currency = 'GBP';
      
      let selector = '';
      let structural = '';
      
      // Prefer stable selectors
      if (itemprop === 'price') {
        selector = `[itemprop="price"]`;
        structural = 'semantic attribute';
      } else if (dataPrice) {
        selector = `[data-price]`;
        structural = 'data attribute';
      } else if (ariaLabel && /price|cost/i.test(ariaLabel)) {
        selector = `[aria-label*="price"]`;
        structural = 'aria attribute';
      } else if (id && !/^[a-z0-9]{6,}$/i.test(id) && /price|cost/i.test(id)) {
        selector = `#${id}`;
        structural = 'stable ID with price keyword';
      } else if (classes) {
        // Check if class contains price-related keywords
        const priceClasses = classes.split(' ').filter((c: string) => 
          /price|cost|amount|value/i.test(c) && !/^[a-z0-9]{6,}$/i.test(c)
        );
        if (priceClasses.length > 0) {
          selector = `.${priceClasses[0]}`;
          structural = 'stable class with price keyword';
        } else if (!/^[a-z0-9]{6,}$/i.test(classes.split(' ')[0])) {
          // Use if not random-looking
          selector = `.${classes.split(' ')[0]}`;
          structural = 'stable class';
        }
      }
      
      // If no stable selector, use structural pattern
      if (!selector) {
        const parent = $el.parent();
        const parentTag = (parent.prop('tagName') || '').toLowerCase();
        if (parentTag && ['div', 'span', 'p'].includes(parentTag)) {
          // Use text-based pattern as fallback
          selector = `${parentTag}:contains("${currency}")`;
          structural = 'text pattern with currency';
        } else {
          selector = tagName;
          structural = 'tag-based';
        }
      }

      if (selector) {
        priceCandidates.push({
          text: text.substring(0, 50),
          selector,
          structural,
          currency,
        });
      }
    }
  });

  // Build structured summary
  let summary = 'HTML Structure Analysis for Product Page:\n\n';
  
  summary += '=== PRODUCT NAME CANDIDATES ===\n';
  if (nameCandidates.length > 0) {
    nameCandidates.slice(0, 8).forEach((candidate, idx) => {
      summary += `${idx + 1}. Selector: "${candidate.selector}" (${candidate.structural})\n`;
      summary += `   Text: "${candidate.text}"\n`;
      summary += `   Tag: <${candidate.tag}>\n\n`;
    });
  } else {
    summary += 'No obvious name candidates found. Check h1, h2, or title elements.\n\n';
  }

  summary += '=== PRICE CANDIDATES ===\n';
  if (priceCandidates.length > 0) {
    priceCandidates.slice(0, 8).forEach((candidate, idx) => {
      summary += `${idx + 1}. Selector: "${candidate.selector}" (${candidate.structural})\n`;
      summary += `   Text: "${candidate.text}"\n`;
      summary += `   Currency: ${candidate.currency}\n\n`;
    });
  } else {
    summary += 'No obvious price candidates found. Search for elements with currency symbols.\n\n';
  }

  // Add page metadata
  const title = $('title').text().trim();
  if (title) summary += `Page Title: ${title}\n`;

  // Limit total size
  return summary.substring(0, 2500);
}

/**
 * Uses AI to detect price and name selectors from HTML content.
 * Handles dynamic class names by using structural selectors.
 */
export async function detectSelectors(html: string): Promise<{ priceSelector: string, nameSelector: string }> {
  // Convert HTML to structured summary (token-efficient, like Firecrawl's markdown)
  const structuredSummary = htmlToStructuredSummary(html);

  const parser = new JsonOutputParser<{ priceSelector: string, nameSelector: string }>();

  const prompt = PromptTemplate.fromTemplate(`
You are an expert web scraping assistant. Your task is to identify the most RELIABLE CSS selectors for extracting product name and price from an e-commerce page.

CRITICAL: Many sites use auto-generated random class names (like "hZ3P6w bnqy13") that change frequently. You MUST avoid these and use stable selectors instead.

PRIORITY ORDER for selectors (most stable first):
1. Semantic attributes: [itemprop="name"], [itemprop="price"], [data-price], [aria-label*="price"]
2. Stable IDs: #product-name (avoid random IDs like #a3b2c1 or #hZ3P6w)
3. Stable classes: .product-title (avoid random classes like .hZ3P6w, .bnqy13, or any 6+ character alphanumeric classes)
4. Structural: h1, h2, parent > child relationships (e.g., ".product-info > h1")
5. Text patterns: :contains() with currency symbols (use ONLY as last resort)

IMPORTANT RULES:
- NEVER use random-looking class names (e.g., .hZ3P6w, .a3b2c1, .xyz123)
- If classes look random (6+ alphanumeric chars, no dashes/underscores), use structural selectors instead
- Prefer parent-child relationships over random classes (e.g., ".product-section h1" instead of ".hZ3P6w")

CURRENCY DETECTION:
- When identifying price selectors, note the currency format (look for symbols: $, €, £, ₹, ¥, or codes: USD, EUR, GBP, INR, JPY)
- The price selector should capture the price WITH its currency symbol/code so we can detect and convert it properly
- If multiple currencies are present, prioritize the main product price currency

HTML Structure Analysis:
{summary}

INSTRUCTIONS:
- Choose selectors that will work even if class names change
- Prefer semantic attributes (itemprop, data-*) over class names
- For dynamic classes, use structural relationships (parent > child, nth-child)
- Return the BEST selector from the candidates, or create a structural one
- If no good selector exists, use a fallback like "h1" for name or "[itemprop='price']" for price
- Ensure price selector captures currency information (symbols or codes) for proper conversion

Return ONLY valid JSON. No markdown, no code blocks, no explanations. Just pure JSON:
    {{
      "priceSelector": "css selector string",
      "nameSelector": "css selector string"
    }}

Example responses:
{{"priceSelector": "[itemprop='price']", "nameSelector": "h1"}}
{{"priceSelector": "[data-price]", "nameSelector": ".product-header h1"}}
{{"priceSelector": "div:contains('₹')", "nameSelector": "h1.product-title"}}
  `);

  const chain = prompt.pipe(model).pipe(parser);
  
  console.log(`[AI] 🤖 detectSelectors - Invoking GPT-4o | HTML summary length: ${structuredSummary.length} chars (~${Math.ceil(structuredSummary.length / 4)} tokens)`);
  
  try {
  const result = await chain.invoke({
      summary: structuredSummary,
    });
    
    console.log(`[AI] ✅ detectSelectors RESPONSE - Name selector: "${result.nameSelector}" | Price selector: "${result.priceSelector}"`);

    // Validate the result
    if (!result || typeof result !== 'object') {
      throw new Error('AI returned invalid result format');
    }

    if (!result.priceSelector || !result.nameSelector) {
      throw new Error('AI did not return valid selectors');
    }

    // Clean up selectors (remove any markdown formatting that might have leaked through)
    let cleanPriceSelector = String(result.priceSelector).trim()
      .replace(/^```json\s*/, '')
      .replace(/^```\s*/, '')
      .replace(/```\s*$/, '')
      .replace(/^`|`$/g, '')
      .replace(/^"|"$/g, '')
      .replace(/^'|'$/g, '');
    
    let cleanNameSelector = String(result.nameSelector).trim()
      .replace(/^```json\s*/, '')
      .replace(/^```\s*/, '')
      .replace(/```\s*$/, '')
      .replace(/^`|`$/g, '')
      .replace(/^"|"$/g, '')
      .replace(/^'|'$/g, '');

    // Validate selectors are not empty
    if (!cleanPriceSelector || !cleanNameSelector) {
      throw new Error('AI returned empty selectors');
    }

    console.log(`Detected selectors - Price: "${cleanPriceSelector}", Name: "${cleanNameSelector}"`);

    return {
      priceSelector: cleanPriceSelector,
      nameSelector: cleanNameSelector,
    };
  } catch (error: any) {
    console.error('AI selector detection failed:', error.message);
    
    // Enhanced fallback based on structured summary
    const hasItemprop = structuredSummary.includes('itemprop');
    const hasDataAttr = structuredSummary.includes('data-');
    const hasCurrency = /[₹$€£¥]/.test(structuredSummary);
    
    // Smart fallback selectors
    let priceSelector = '';
    let nameSelector = '';
    
    if (hasItemprop) {
      priceSelector = '[itemprop="price"], [data-price], .price';
      nameSelector = '[itemprop="name"], h1';
    } else if (hasDataAttr) {
      priceSelector = '[data-price], [data-product-price], div:contains("₹"), div:contains("$")';
      nameSelector = '[data-product-title], h1, h2';
    } else if (hasCurrency) {
      // Use text-based pattern for price
      priceSelector = 'div:contains("₹"), span:contains("₹"), div:contains("$"), [class*="price"]';
      nameSelector = 'h1, h2, [class*="title"], [class*="name"]';
    } else {
      // Generic fallbacks
      priceSelector = '[itemprop="price"], [data-price], .price, .product-price, [class*="price"]';
      nameSelector = 'h1, [itemprop="name"], .product-title, .product-name, [class*="title"]';
    }
    
    console.log(`Using fallback selectors - Price: "${priceSelector}", Name: "${nameSelector}"`);
    
    return {
      priceSelector,
      nameSelector,
    };
  }
}

