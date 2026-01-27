/**
 * V2: Simplified Product Extractor using page.ai() or page.extract()
 * 
 * Uses HyperAgent's built-in page.ai() which handles token optimization internally.
 * Much simpler and more efficient than manually using captureDOMState.
 * 
 * DO NOT MODIFY hyperagent-extractor.ts - keep current code working!
 */

import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
import { ProductDNA } from "./types";

// Reuse HyperAgent instance across requests (singleton pattern)
let hyperAgentInstance: HyperAgent | null = null;

// Domain-based action cache storage
// Key: domain (e.g., "amazon.in"), Value: ActionCacheOutput from first extraction
const domainActionCache = new Map<string, any>();

/**
 * Get or create HyperAgent instance
 */
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
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-renderer-backgrounding",
        ],
      },
      cdpActions: false,
      // debug: process.env.NODE_ENV === "development",
    });
  }
  return hyperAgentInstance;
}

/**
 * Parse the output string from page.ai() into structured data
 */
function parseAIOutput(output: string): Partial<ProductDNA> {
  const result: Partial<ProductDNA> = {};

  // Extract product name (multiple patterns)
  const nameMatch = output.match(/Product Name:\s*(.+?)(?:\n|$)/i) || 
                    output.match(/Title:\s*(.+?)(?:\n|$)/i) ||
                    output.match(/Name:\s*(.+?)(?:\n|$)/i);
  if (nameMatch) {
    result.name = nameMatch[1].trim();
  }

  // Extract price (handle Rs., ₹, INR, USD, etc.)
  const priceMatch = output.match(/Price:\s*(?:Rs\.?\s*)?([\d,]+\.?\d*)/i) ||
                     output.match(/Price:\s*₹\s*([\d,]+\.?\d*)/i) ||
                     output.match(/Price:\s*([\d,]+\.?\d*)/i);
  if (priceMatch) {
    result.price = parseFloat(priceMatch[1].replace(/,/g, ''));
  }

  // Extract currency
  if (output.match(/Rs\.?|₹|INR/i)) {
    result.currency = "INR";
  } else if (output.match(/\$|USD/i)) {
    result.currency = "USD";
  } else if (output.match(/EUR|€/i)) {
    result.currency = "EUR";
  } else if (output.match(/GBP|£/i)) {
    result.currency = "GBP";
  } else if (output.match(/JPY|¥/i)) {
    result.currency = "JPY";
  } else {
    const currencyMatch = output.match(/Currency:\s*([A-Z]{3})/i);
    if (currencyMatch) {
      result.currency = currencyMatch[1].toUpperCase();
    } else {
      result.currency = "INR"; // Default
    }
  }

  // Extract brand
  const brandMatch = output.match(/Brand:\s*(.+?)(?:\n|$)/i);
  if (brandMatch) {
    result.brand = brandMatch[1].trim();
  }

  return result;
}

/**
 * Calculate estimated token usage from text
 * Rough estimation: ~4 characters per token
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Extract product information using agent.executeTask with outputSchema
 * This is the experimental approach - let's test token usage!
 * Based on the example: agent.executeTask(task, { outputSchema: z.object(...) })
 * 
 * OPTIMIZATION: Uses domain-based caching to reuse navigation steps for same website
 */
export async function extractProductWithHyperAgentV2ExecuteTask(
  url: string,
  useCache: boolean = true,
): Promise<ProductDNA> {
  const cleanUrl = new URL(url);
  cleanUrl.search = "";
  const finalUrl = cleanUrl.toString();
  const domain = new URL(finalUrl).hostname.replace("www.", "");

  console.log(`[HyperAgent-V2-ExecuteTask] 🌐 Starting extraction for: ${finalUrl} (domain: ${domain})`);

  const agent = getHyperAgent();
  const page = await agent.newPage();

  try {
    // Define schema - only required fields to avoid the "required" array error
    const productSchema = z.object({
      name: z.string().describe("The full product title/name"),
      brand: z.string().describe("The brand/manufacturer name. NEVER use domain names or 'www'"),
      price: z.number().describe("The current selling price as a number (remove currency symbols and commas)"),
      currency: z.string().describe("The currency code (INR, USD, EUR, GBP, JPY, etc.)"),
    });

    // Check if we have cached actions for this domain
    const cachedActions = useCache ? domainActionCache.get(domain) : null;

    let result: any;
    let extracted: z.infer<typeof productSchema>;

    if (cachedActions && useCache) {
      console.log(`[HyperAgent-V2-ExecuteTask] 🔄 Using cached actions for domain: ${domain}`);
      
      // Navigate to the new URL first
      await page.goto(finalUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(3000);

      // Replay cached actions (navigation steps) but with new extraction task
      const task = `Extract product information from this page for the MAIN PRODUCT ONLY.

CRITICAL RULES:
1. Extract ONLY the MAIN PRODUCT (ignore related products, recommendations, "you may also like")
2. Price: Extract the SINGLE current selling price (not ranges, not multiple prices)
3. Brand: Extract actual manufacturer name (e.g., "Apple", "Samsung"). NEVER use "www" or domain names
4. Default currency to INR if uncertain`;

      // Use page.ai() for extraction since we already navigated
      const aiResult = await page.ai(task);
      const outputText = aiResult.output || "";
      
      // Parse the output
      const parsed = parseAIOutput(outputText);
      extracted = {
        name: parsed.name || "",
        brand: parsed.brand || "",
        price: parsed.price || 0,
        currency: parsed.currency || "INR",
      };
    } else {
      // First time for this domain - execute full task and cache it
      console.log(`[HyperAgent-V2-ExecuteTask] 🆕 First extraction for domain: ${domain} - will cache actions`);
      
      const task = `Navigate to ${finalUrl} and extract product information for the MAIN PRODUCT ONLY.

CRITICAL RULES:
1. Extract ONLY the MAIN PRODUCT (ignore related products, recommendations, "you may also like")
2. Price: Extract the SINGLE current selling price (not ranges, not multiple prices)
3. Brand: Extract actual manufacturer name (e.g., "Apple", "Samsung"). NEVER use "www" or domain names
4. Default currency to INR if uncertain`;

      result = await agent.executeTask(task, {
        outputSchema: productSchema as any,
      });

      console.log(`[HyperAgent-V2-ExecuteTask] 📄 Result:`, result);

      // Cache the actionCache for this domain (navigation steps)
      if (result.actionCache && useCache) {
        domainActionCache.set(domain, result.actionCache);
        console.log(`[HyperAgent-V2-ExecuteTask] 💾 Cached actions for domain: ${domain}`);
      }

      // Parse output - could be JSON string or object
      if (typeof result.output === 'string') {
        try {
          extracted = JSON.parse(result.output);
        } catch {
          // If not JSON, try parsing as text
          const parsed = parseAIOutput(result.output);
          extracted = {
            name: parsed.name || "",
            brand: parsed.brand || "",
            price: parsed.price || 0,
            currency: parsed.currency || "INR",
          };
        }
      } else {
        extracted = result.output as unknown as z.infer<typeof productSchema>;
      }
    }

    const productDNA: ProductDNA = {
      name: extracted.name || "",
      brand: extracted.brand || "",
      price: extracted.price || 0,
      currency: extracted.currency || "INR",
      category: "",
      features: [],
      description: undefined,
      imageUrl: undefined,
      url: finalUrl,
      verifiedByAI: true,
    };

    console.log(`[HyperAgent-V2-ExecuteTask] ✅ Extraction complete: ${productDNA.name} - ${productDNA.price} ${productDNA.currency}`);
    return productDNA;
  } catch (error: any) {
    console.error(`[HyperAgent-V2-ExecuteTask] ❌ Error:`, error);
    throw new Error(`HyperAgent V2 ExecuteTask extraction failed: ${error.message}`);
  } finally {
    try {
      if (page && !page.isClosed()) {
        await page.close();
      }
    } catch (closeError: any) {
      // Ignore close errors
    }
  }
}

/**
 * Extract product information using page.ai() - Simple and efficient!
 * This uses HyperAgent's built-in token optimization.
 */
export async function extractProductWithHyperAgentV2(
  url: string,
): Promise<any> {
  const cleanUrl = new URL(url);
  cleanUrl.search = "";
  const finalUrl = cleanUrl.toString();

  console.log(`[HyperAgent-V2] 🌐 Starting extraction for: ${finalUrl}`);

  const agent = getHyperAgent();
  const page = await agent.newPage();

  try {
    await page.goto(finalUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    const prompt = `Extract product information from this page for the MAIN PRODUCT ONLY.

CRITICAL RULES:
1. Extract ONLY the MAIN PRODUCT (ignore related products, recommendations, "you may also like")
2. Price: Extract the SINGLE current selling price (not ranges, not multiple prices)
3. Brand: Extract actual manufacturer name (e.g., "Apple", "Samsung"). NEVER use "www" or domain names
4. Default currency to INR if uncertain

Format your response as:
Product Name: [name]
Price: [price]
Brand: [brand]
Currency: [currency code]

Page URL: ${finalUrl}`;

    console.log(`[HyperAgent-V2] 🤖 Extracting with page.ai()...`);
    const promptTokens = estimateTokens(prompt);
    console.log(`[HyperAgent-V2] 💰 Estimated prompt tokens: ~${promptTokens}`);

    // Use page.ai() - works reliably and HyperAgent optimizes tokens internally
    const result = await page.ai(prompt);

    console.log(`[HyperAgent-V2] 📄 Result:`, result);
    return result as unknown as any;

    // Extract output from result
    const outputText = result.output || "";
    const outputTokens = estimateTokens(outputText);
    
    // Try to get actual token usage from steps (if available)
    let actualInputTokens = 0;
    let actualOutputTokens = 0;
    if (result.steps && result.steps.length > 0) {
      // Check if any step has token usage info
      for (const step of result.steps) {
        // Token usage might be in agentOutput or actionOutput
        // This is a best-effort attempt - structure may vary
        if ((step as any).tokenUsage) {
          actualInputTokens += (step as any).tokenUsage.inputTokens || 0;
          actualOutputTokens += (step as any).tokenUsage.outputTokens || 0;
        }
      }
    }

    const totalTokens = actualInputTokens + actualOutputTokens > 0 
      ? actualInputTokens + actualOutputTokens 
      : promptTokens + outputTokens;

    console.log(`[HyperAgent-V2] 📄 Raw output:`, outputText);
    if (actualInputTokens > 0 || actualOutputTokens > 0) {
      console.log(`[HyperAgent-V2] 💰 Actual tokens: ${totalTokens} (input: ${actualInputTokens}, output: ${actualOutputTokens})`);
    } else {
      console.log(`[HyperAgent-V2] 💰 Estimated tokens: ~${totalTokens} (prompt: ${promptTokens}, output: ${outputTokens})`);
    }

    // Parse the output
    const parsed = parseAIOutput(outputText);

    // Build ProductDNA object
    const productDNA: ProductDNA = {
      name: parsed.name || "",
      brand: parsed.brand || "",
      price: parsed.price || 0,
      currency: parsed.currency || "INR",
      category: parsed.category || "",
      features: parsed.features || [],
      description: parsed.description,
      imageUrl: parsed.imageUrl,
      url: finalUrl,
      verifiedByAI: true,
    };

    // Validate extraction
    if (!productDNA.name || productDNA.price <= 0) {
      throw new Error(`Invalid extraction: name=${!!productDNA.name}, price=${productDNA.price}`);
    }

    console.log(`[HyperAgent-V2] ✅ Extraction complete: ${productDNA.name} - ${productDNA.price} ${productDNA.currency}`);
    return productDNA;
  } catch (error: any) {
    console.error(`[HyperAgent-V2] ❌ Error extracting product:`, error);
    throw new Error(`HyperAgent V2 extraction failed: ${error.message}`);
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
