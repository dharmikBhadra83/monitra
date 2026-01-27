/**
 * EXPERIMENTAL: More Token-Efficient Product Extractor
 * 
 * This file experiments with different extraction strategies to reduce token usage:
 * 1. Two-step extraction: Find product section first, then extract from that section
 * 2. Smarter filtering: Focus on main content area only
 * 3. Element-specific extraction: Find price element first, then extract value
 * 
 * DO NOT MODIFY hyperagent-extractor.ts - keep current code working!
 */

import { HyperAgent, captureDOMState } from "@hyperbrowser/agent";
import { z } from "zod";
import { ProductDNA } from "./types";

// Reuse HyperAgent instance across requests (singleton pattern)
let hyperAgentInstance: HyperAgent | null = null;

function getHyperAgent(): HyperAgent {
  if (!hyperAgentInstance) {
    const llmConfig: any = {
      provider: "openai",
      model: process.env.LLM_MODEL,
      baseURL: process.env.LLM_BASE_URL,
      apiKey: process.env.LLM_API_KEY,
      temperature: 0,
    };

    hyperAgentInstance = new HyperAgent({
      llm: llmConfig,
      localConfig: {
        headless: true,
        args: [
          "--headless=new",
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      },
      cdpActions: false,
      debug: process.env.NODE_ENV === "development",
    });
  }
  return hyperAgentInstance;
}

/**
 * Strategy 1: Two-Step Extraction
 * Step 1: Find the main product section using page.perform/examineDom
 * Step 2: Extract only from that section
 */
export async function extractProductTwoStep(url: string): Promise<ProductDNA> {
  const domain = new URL(url).hostname.replace("www.", "");
  const cleanUrl = new URL(url);
  cleanUrl.search = "";
  const finalUrl = cleanUrl.toString();

  console.log(`[Experimental] 🌐 Two-step extraction for: ${finalUrl}`);

  const agent = getHyperAgent();
  const page = await agent.newPage();

  try {
    await page.goto(finalUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    // Step 1: Find the main product section using examineDom
    console.log(`[Experimental] 🔍 Step 1: Finding main product section...`);
    const domState = await captureDOMState(page, {
      useCache: false,
      debug: false,
      enableVisualMode: false,
    });

    // Use examineDom to find the main product container
    // This is more efficient than sending full tree
    const productSectionSchema = z.object({
      sectionStart: z.number().describe("Line number where main product section starts"),
      sectionEnd: z.number().describe("Line number where main product section ends"),
      confidence: z.number().describe("Confidence score 0-1"),
    });

    const lines = domState.domState.split("\n");
    const treePreview = lines.slice(0, 100).join("\n"); // First 100 lines to find section

    const sectionResult = await agent["llm"].invokeStructured(
      {
        schema: productSectionSchema,
        options: { temperature: 0 },
      },
      [
        {
          role: "user",
          content: `Analyze this accessibility tree and identify where the MAIN PRODUCT information section starts and ends.
          
Look for patterns like:
- Product title/name
- Price information
- "Add to Cart" or "Buy Now" buttons
- Product description
- Product images

Ignore: navigation, footer, "you may also like", recommendations, related products.

Accessibility Tree (first 100 lines):
${treePreview}

Return the line numbers (0-indexed) where the main product section is located.`,
        },
      ]
    );

    if (!sectionResult.parsed) {
      throw new Error("Failed to identify product section");
    }

    const { sectionStart, sectionEnd } = sectionResult.parsed;
    const productSection = lines.slice(sectionStart, Math.min(sectionEnd + 50, lines.length)).join("\n");

    console.log(`[Experimental] 📊 Extracted product section: lines ${sectionStart}-${sectionEnd} (${productSection.length} chars)`);

    // Step 2: Extract product info from the identified section only
    console.log(`[Experimental] 🤖 Step 2: Extracting product info from section...`);

    const productSchema = z.object({
      name: z.string().describe("The full product title/name"),
      brand: z.string().describe("The brand/manufacturer name. NEVER use domain names or 'www'"),
      price: z.number().describe("The current selling price as a number (remove currency symbols and commas)"),
      currency: z.string().describe("The currency code (INR, USD, EUR, GBP, JPY, etc.)"),
      category: z.string().describe("The product category"),
      features: z.array(z.string()).describe("Key product features/attributes"),
      description: z.string().nullable().default(null).describe("Product description (null if not available)"),
      imageUrl: z.string().nullable().default(null).describe("Main product image URL (null if not available)"),
    });

    const extractionResult = await agent["llm"].invokeStructured(
      {
        schema: productSchema,
        options: { temperature: 0 },
      },
      [
        {
          role: "user",
          content: `Extract product information from this MAIN PRODUCT section ONLY.

CRITICAL RULES:
1. Extract ONLY the MAIN PRODUCT information
2. For price: Extract the SINGLE current selling price (not ranges, not multiple prices)
3. For brand: Extract actual manufacturer name, NOT domain names or "www"
4. Default currency to INR if uncertain

Product Section:
${productSection}

Extract and return JSON matching the schema.`,
        },
      ]
    );

    if (!extractionResult.parsed) {
      throw new Error(`Failed to parse extraction: ${extractionResult.rawText}`);
    }

    const extracted = extractionResult.parsed;
    const estimatedTokens = Math.ceil(productSection.length / 4);
    console.log(`[Experimental] 💰 Estimated tokens: ~${estimatedTokens.toLocaleString()} (${productSection.length} chars)`);

    const productDNA: ProductDNA = {
      name: extracted.name || "",
      brand: extracted.brand || "",
      price: extracted.price || 0,
      currency: extracted.currency || "INR",
      category: extracted.category || "",
      features: extracted.features || [],
      description: extracted.description && extracted.description.trim() !== "" ? extracted.description : undefined,
      imageUrl: extracted.imageUrl && extracted.imageUrl.trim() !== "" ? extracted.imageUrl : undefined,
      url: finalUrl,
      verifiedByAI: true,
    };

    if (!productDNA.name || productDNA.price <= 0) {
      throw new Error(`Invalid extraction: name=${!!productDNA.name}, price=${productDNA.price}`);
    }

    console.log(`[Experimental] ✅ Extraction complete: ${productDNA.name} - ${productDNA.price} ${productDNA.currency}`);
    return productDNA;
  } catch (error: any) {
    console.error(`[Experimental] ❌ Error:`, error);
    throw new Error(`Experimental extraction failed: ${error.message}`);
  } finally {
    try {
      if (!page.isClosed()) {
        await page.close();
      }
    } catch (closeError: any) {
      // Ignore close errors
    }
  }
}

/**
 * Strategy 2: Smart Content Extraction
 * Focus on main content area by analyzing structure and extracting only relevant parts
 */
export async function extractProductSmart(url: string): Promise<ProductDNA> {
  const domain = new URL(url).hostname.replace("www.", "");
  const cleanUrl = new URL(url);
  cleanUrl.search = "";
  const finalUrl = cleanUrl.toString();

  console.log(`[Experimental-Smart] 🌐 Smart extraction for: ${finalUrl}`);

  const agent = getHyperAgent();
  const page = await agent.newPage();

  try {
    await page.goto(finalUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    const domState = await captureDOMState(page, {
      useCache: false,
      debug: false,
      enableVisualMode: false,
    });

    const lines = domState.domState.split("\n");
    const originalSize = domState.domState.length;

    // Smart filtering: Keep only lines that are likely product-related
    const productLines: string[] = [];
    let inProductSection = false;
    let productScore = 0;

    // Keywords that indicate product content
    const productKeywords = [
      /price/i, /₹|INR|USD|EUR|GBP|\$|€|£/,
      /add to cart|buy now|purchase|add to bag/i,
      /product|item|goods/i,
      /title|name|heading/i,
      /description|details|specification/i,
      /brand|manufacturer|maker/i,
      /image|photo|picture/i,
      /\d+\.?\d*\s*(gram|kg|ml|l|piece|pack|unit)/i,
    ];

    // Keywords that indicate non-product content
    const skipKeywords = [
      /navigation|nav|menu/i,
      /footer|copyright/i,
      /cookie|privacy|terms/i,
      /you may also like|frequently bought|recommended|related|similar/i,
      /sponsored|advertisement|ad|promo/i,
      /sign in|login|register|account/i,
      /cart|wishlist|favorites/i,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      // Check if line contains product keywords
      const hasProductKeyword = productKeywords.some(pattern => pattern.test(line));
      const hasSkipKeyword = skipKeywords.some(pattern => pattern.test(line));

      if (hasSkipKeyword && !hasProductKeyword) {
        inProductSection = false;
        productScore = 0;
        continue;
      }

      if (hasProductKeyword) {
        inProductSection = true;
        productScore += 2;
      } else if (inProductSection) {
        productScore -= 0.5; // Decay score when no product keywords
      }

      // Keep line if:
      // 1. Has product keywords
      // 2. Is in product section and score is positive
      // 3. Contains numbers (likely prices/quantities)
      // 4. Is in first 200 lines (likely main content)
      if (hasProductKeyword || (inProductSection && productScore > 0) || /\d+/.test(line) || i < 200) {
        productLines.push(line);
      }

      // Stop if we've collected enough and score drops too low
      if (productLines.length > 500 && productScore < -5) {
        break;
      }
    }

    let aiFriendlyContent = productLines.join("\n");
    
    // Limit to reasonable size but ensure we have enough
    const MAX_SIZE = 15 * 1024; // 15KB max
    const MIN_SIZE = 3 * 1024;  // 3KB min
    
    if (aiFriendlyContent.length > MAX_SIZE) {
      // Take first part (main content) and last part (might have price)
      const firstPart = aiFriendlyContent.substring(0, MAX_SIZE * 0.7);
      const lastPart = aiFriendlyContent.substring(aiFriendlyContent.length - MAX_SIZE * 0.3);
      aiFriendlyContent = firstPart + "\n...\n" + lastPart;
    } else if (aiFriendlyContent.length < MIN_SIZE && originalSize > MIN_SIZE) {
      // If we filtered too much, be less aggressive
      console.log(`[Experimental-Smart] ⚠️  Filtered too much, using less aggressive filter`);
      const lessAggressive = lines.filter((line, idx) => {
        return idx < 300 || // Keep first 300 lines
               productKeywords.some(p => p.test(line)) ||
               /\d+/.test(line);
      });
      aiFriendlyContent = lessAggressive.join("\n").substring(0, MAX_SIZE);
    }

    console.log(`[Experimental-Smart] 📊 Content: ${(originalSize / 1024).toFixed(2)}KB → ${(aiFriendlyContent.length / 1024).toFixed(2)}KB`);

    const productSchema = z.object({
      name: z.string().describe("The full product title/name"),
      brand: z.string().describe("The brand/manufacturer name. NEVER use domain names or 'www'"),
      price: z.number().describe("The current selling price as a number (remove currency symbols and commas)"),
      currency: z.string().describe("The currency code (INR, USD, EUR, GBP, JPY, etc.)"),
      category: z.string().describe("The product category"),
      features: z.array(z.string()).describe("Key product features/attributes"),
      description: z.string().nullable().default(null).describe("Product description (null if not available)"),
      imageUrl: z.string().nullable().default(null).describe("Main product image URL (null if not available)"),
    });

    const estimatedTokens = Math.ceil(aiFriendlyContent.length / 4);
    console.log(`[Experimental-Smart] 💰 Estimated tokens: ~${estimatedTokens.toLocaleString()} (${aiFriendlyContent.length} chars)`);

    const result = await agent["llm"].invokeStructured(
      {
        schema: productSchema,
        options: { temperature: 0 },
      },
      [
        {
          role: "user",
          content: `Extract product information from this page for the MAIN PRODUCT ONLY.

CRITICAL RULES:
1. Extract ONLY the MAIN PRODUCT information
2. For price: Extract the SINGLE current selling price (not ranges, not multiple prices)
3. For brand: Extract actual manufacturer name, NOT domain names or "www"
4. Default currency to INR if uncertain

Page content:
${aiFriendlyContent}

Extract and return JSON matching the schema.`,
        },
      ]
    );

    if (!result.parsed) {
      throw new Error(`Failed to parse extraction: ${result.rawText}`);
    }

    const extracted = result.parsed;
    const productDNA: ProductDNA = {
      name: extracted.name || "",
      brand: extracted.brand || "",
      price: extracted.price || 0,
      currency: extracted.currency || "INR",
      category: extracted.category || "",
      features: extracted.features || [],
      description: extracted.description && extracted.description.trim() !== "" ? extracted.description : undefined,
      imageUrl: extracted.imageUrl && extracted.imageUrl.trim() !== "" ? extracted.imageUrl : undefined,
      url: finalUrl,
      verifiedByAI: true,
    };

    if (!productDNA.name || productDNA.price <= 0) {
      throw new Error(`Invalid extraction: name=${!!productDNA.name}, price=${productDNA.price}`);
    }

    console.log(`[Experimental-Smart] ✅ Extraction complete: ${productDNA.name} - ${productDNA.price} ${productDNA.currency}`);
    return productDNA;
  } catch (error: any) {
    console.error(`[Experimental-Smart] ❌ Error:`, error);
    throw new Error(`Smart extraction failed: ${error.message}`);
  } finally {
    try {
      if (!page.isClosed()) {
        await page.close();
      }
    } catch (closeError: any) {
      // Ignore close errors
    }
  }
}

/**
 * Strategy 3: Element-Specific Extraction
 * Use page.perform to find specific elements, then extract their values
 */
export async function extractProductElementSpecific(url: string): Promise<ProductDNA> {
  const domain = new URL(url).hostname.replace("www.", "");
  const cleanUrl = new URL(url);
  cleanUrl.search = "";
  const finalUrl = cleanUrl.toString();

  console.log(`[Experimental-Element] 🌐 Element-specific extraction for: ${finalUrl}`);

  const agent = getHyperAgent();
  const page = await agent.newPage();

  try {
    await page.goto(finalUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    // Use page.perform to find elements (this uses examineDom internally - more efficient)
    // But we'll extract the values directly from the page
    
    // Get a focused DOM state around price/product elements
    const domState = await captureDOMState(page, {
      useCache: false,
      debug: false,
      enableVisualMode: false,
    });

    // Extract just the price-related and product name-related sections
    const lines = domState.domState.split("\n");
    
    // Find lines with price indicators
    const priceLines: number[] = [];
    const productNameLines: number[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/(₹|\$|€|£|INR|USD|EUR|GBP|\d+\.?\d*\s*(rupee|dollar|euro|pound))/i.test(line) || 
          /price|cost|amount/i.test(line)) {
        // Include context around price (5 lines before and after)
        for (let j = Math.max(0, i - 5); j <= Math.min(lines.length - 1, i + 5); j++) {
          if (!priceLines.includes(j)) priceLines.push(j);
        }
      }
      if (/product|title|name|heading|item/i.test(line) && i < 100) {
        // Product name is usually in first 100 lines
        for (let j = Math.max(0, i - 3); j <= Math.min(lines.length - 1, i + 3); j++) {
          if (!productNameLines.includes(j)) productNameLines.push(j);
        }
      }
    }

    // Combine relevant lines
    const relevantLines = new Set([...priceLines, ...productNameLines, ...Array.from({length: 50}, (_, i) => i)]);
    const focusedContent = Array.from(relevantLines).sort((a, b) => a - b).map(i => lines[i]).join("\n");

    console.log(`[Experimental-Element] 📊 Focused content: ${(focusedContent.length / 1024).toFixed(2)}KB`);

    const productSchema = z.object({
      name: z.string().describe("The full product title/name"),
      brand: z.string().describe("The brand/manufacturer name. NEVER use domain names or 'www'"),
      price: z.number().describe("The current selling price as a number (remove currency symbols and commas)"),
      currency: z.string().describe("The currency code (INR, USD, EUR, GBP, JPY, etc.)"),
      category: z.string().describe("The product category"),
      features: z.array(z.string()).describe("Key product features/attributes"),
      description: z.string().nullable().default(null).describe("Product description (null if not available)"),
      imageUrl: z.string().nullable().default(null).describe("Main product image URL (null if not available)"),
    });

    const estimatedTokens = Math.ceil(focusedContent.length / 4);
    console.log(`[Experimental-Element] 💰 Estimated tokens: ~${estimatedTokens.toLocaleString()} (${focusedContent.length} chars)`);

    const result = await agent["llm"].invokeStructured(
      {
        schema: productSchema,
        options: { temperature: 0 },
      },
      [
        {
          role: "user",
          content: `Extract product information from this focused page content for the MAIN PRODUCT ONLY.

CRITICAL RULES:
1. Extract ONLY the MAIN PRODUCT information
2. For price: Extract the SINGLE current selling price (not ranges, not multiple prices)
3. For brand: Extract actual manufacturer name, NOT domain names or "www"
4. Default currency to INR if uncertain

Focused Page Content:
${focusedContent}

Extract and return JSON matching the schema.`,
        },
      ]
    );

    if (!result.parsed) {
      throw new Error(`Failed to parse extraction: ${result.rawText}`);
    }

    const extracted = result.parsed;
    const productDNA: ProductDNA = {
      name: extracted.name || "",
      brand: extracted.brand || "",
      price: extracted.price || 0,
      currency: extracted.currency || "INR",
      category: extracted.category || "",
      features: extracted.features || [],
      description: extracted.description && extracted.description.trim() !== "" ? extracted.description : undefined,
      imageUrl: extracted.imageUrl && extracted.imageUrl.trim() !== "" ? extracted.imageUrl : undefined,
      url: finalUrl,
      verifiedByAI: true,
    };

    if (!productDNA.name || productDNA.price <= 0) {
      throw new Error(`Invalid extraction: name=${!!productDNA.name}, price=${productDNA.price}`);
    }

    console.log(`[Experimental-Element] ✅ Extraction complete: ${productDNA.name} - ${productDNA.price} ${productDNA.currency}`);
    return productDNA;
  } catch (error: any) {
    console.error(`[Experimental-Element] ❌ Error:`, error);
    throw new Error(`Element-specific extraction failed: ${error.message}`);
  } finally {
    try {
      if (!page.isClosed()) {
        await page.close();
      }
    } catch (closeError: any) {
      // Ignore close errors
    }
  }
}

/**
 * Cleanup HyperAgent instance
 */
export async function cleanupHyperAgent(): Promise<void> {
  if (hyperAgentInstance) {
    await hyperAgentInstance.closeAgent();
    hyperAgentInstance = null;
  }
}
