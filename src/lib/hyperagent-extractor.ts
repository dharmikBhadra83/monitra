/**
 * Simple HyperAgent-based Product Extractor
 *
 * Uses HyperAgent's internal accessibility tree for AI-friendly extraction.
 * Direct approach to avoid page.extract() schema wrapping issues.
 */

import { HyperAgent, captureDOMState } from "@hyperbrowser/agent";
import { z } from "zod";
import { ProductDNA } from "./types";

// Reuse HyperAgent instance across requests (singleton pattern)
let hyperAgentInstance: HyperAgent | null = null;

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

    // Only add baseURL if it exists (for Ollama, etc.)
    // if (process.env.LLM_BASE_URL) {
    //   llmConfig.baseURL = process.env.LLM_BASE_URL;
    // }

    hyperAgentInstance = new HyperAgent({
      llm: llmConfig,
      localConfig: {
        headless: true, // Always headless for EC2
        args: [
          "--headless=new",
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      },
      cdpActions: false, // Disable CDP for read-only extraction (reduces cleanup warnings)
      debug: process.env.NODE_ENV === "development",
    });
  }
  return hyperAgentInstance;
}

/**
 * Extract product information using HyperAgent's public API (page.extract)
 */
export async function extractProductWithHyperAgent(
  url: string,
): Promise<ProductDNA> {
  const domain = new URL(url).hostname.replace("www.", "");

  // Clean URL: Remove query parameters and tracking params for consistent page loads
  // Amazon URLs with ref/query params can load different content or redirect
  const cleanUrl = new URL(url);
  cleanUrl.search = ""; // Remove all query parameters
  const finalUrl = cleanUrl.toString();

  console.log(
    `[HyperAgent] 🌐 Starting extraction for: ${finalUrl} (${domain})`,
  );

  const agent = getHyperAgent();
  const page = await agent.newPage();

  try {
    // Navigate to page
    console.log(`[HyperAgent] 📄 Loading page...`);
    await page.goto(finalUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Wait for dynamic content to fully load
    await page.waitForTimeout(3000);

    // Use HyperAgent's internal DOM capture (bypasses page.extract() schema wrapping)
    // Now exported from main package, so we can import it directly
    console.log(`[HyperAgent] 🔍 Capturing accessibility tree...`);

    const domState = await captureDOMState(page, {
      useCache: false,
      debug: false,
      enableVisualMode: false,
    });

    let aiFriendlyContent = domState.domState;
    const originalSize = aiFriendlyContent.length;

    // Post-process: Remove unnecessary sections to reduce token usage
    // Filter out common non-product content patterns (less aggressive filtering)
    const lines = aiFriendlyContent.split("\n");
    const filteredLines: string[] = [];
    let skipCount = 0;
    const skipPatterns = [
      /navigation/i,
      /footer/i,
      /banner/i,
      /cookie/i,
      /privacy/i,
      /terms/i,
      /you may also like/i,
      /frequently bought together/i,
      /customers who viewed/i,
      /sponsored/i,
      /advertisement/i,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if line matches skip patterns
      const matchesSkipPattern = skipPatterns.some((pattern) => pattern.test(line));
      
      // Skip header only if it's at the very beginning (first 20 lines)
      const isEarlyHeader = i < 20 && /^header$/i.test(line.trim());
      
      if (matchesSkipPattern || isEarlyHeader) {
        // Only skip a few lines after pattern (not entire sections)
        skipCount = 3; // Skip next 3 lines after pattern
        continue;
      }
      
      // Skip if we're in skip countdown
      if (skipCount > 0) {
        skipCount--;
        // But always include lines with price information, even during skip
        if (
          line.includes("price") ||
          line.includes("₹") ||
          line.includes("INR") ||
          line.includes("Rs") ||
          line.includes("rupee") ||
          line.includes("add to cart") ||
          line.includes("buy now") ||
          /\d+\.?\d*\s*(INR|₹|Rs|rupee)/i.test(line)
        ) {
          filteredLines.push(line);
          skipCount = 0; // Reset skip when we find price info
        }
        continue;
      }

      // Always include the line
      filteredLines.push(line);
    }

    aiFriendlyContent = filteredLines.join("\n");
    
    // Ensure minimum content size to preserve important information
    const MIN_CONTENT_SIZE = 5 * 1024; // 5KB minimum
    if (aiFriendlyContent.length < MIN_CONTENT_SIZE && originalSize > MIN_CONTENT_SIZE) {
      // If filtering removed too much, use less aggressive filtering
      console.log(`[HyperAgent] ⚠️  Filtering removed too much content, using less aggressive filter`);
      // Take first portion of original content with minimal filtering
      const minimalFilter = lines.filter((line, idx) => {
        // Only skip obvious non-content lines
        return !/^(navigation|footer|cookie|privacy|terms)$/i.test(line.trim()) || 
               idx < 50 || // Keep first 50 lines
               line.includes("price") || 
               line.includes("₹") || 
               /\d+/.test(line); // Keep lines with numbers
      });
      aiFriendlyContent = minimalFilter.join("\n");
    }

    // Truncate to first 25KB (focus on main product area, reduces token usage by ~60%)
    // Most product info is in the first part of the page
    const MAX_CONTENT_SIZE = 25 * 1024; // 25KB = ~6,250 tokens
    if (aiFriendlyContent.length > MAX_CONTENT_SIZE) {
      aiFriendlyContent = aiFriendlyContent.substring(0, MAX_CONTENT_SIZE);
      console.log(
        `[HyperAgent] 📊 Accessibility tree: ${(originalSize / 1024).toFixed(2)}KB → ${(aiFriendlyContent.length / 1024).toFixed(2)}KB (filtered & truncated)`,
      );
    } else {
      console.log(
        `[HyperAgent] 📊 Accessibility tree: ${(originalSize / 1024).toFixed(2)}KB → ${(aiFriendlyContent.length / 1024).toFixed(2)}KB (filtered)`,
      );
    }

    // Define schema - all fields required with descriptions for structured output
    const productSchema = z.object({
      name: z.string().describe("The full product title/name"),
      brand: z
        .string()
        .describe(
          "The brand/manufacturer name (e.g., Apple, Samsung, Nike). NEVER use domain names or 'www'",
        ),
      price: z
        .number()
        .describe(
          "The current selling price as a number (remove currency symbols and commas)",
        ),
      currency: z
        .string()
        .describe("The currency code (INR, USD, EUR, GBP, JPY, etc.)"),
      category: z.string().describe("The product category"),
      features: z.array(z.string()).describe("Key product features/attributes"),
      description: z
        .string()
        .nullable()
        .default(null)
        .describe("Product description (null if not available)"),
      imageUrl: z
        .string()
        .nullable()
        .default(null)
        .describe("Main product image URL (null if not available)"),
    });

    // Build instruction
    const instruction = `Extract product information from this page for the MAIN PRODUCT ONLY.

CRITICAL EXTRACTION RULES:
1. Extract information ONLY for the MAIN PRODUCT shown on this page
2. IGNORE all related products, "you may also like", "recommended products", "similar items", or any other products
3. For the price: Extract ONLY the single current selling price for the MAIN PRODUCT (near "Add to Cart" or "Buy Now" button)
4. The price should be a SINGLE NUMBER (no currency symbols, no commas)
5. For brand: Extract the actual manufacturer/brand name (e.g., "Apple", "Samsung", "Nike"). NEVER use "www", domain names, or marketplace names
6. Default currency to INR if uncertain

Current page URL: ${finalUrl}
This URL represents the MAIN PRODUCT you should extract information for.`;

    // Build prompt with accessibility tree content
    const prompt = `${instruction}

Page content (accessibility tree):\n${aiFriendlyContent}\n\nExtract the information for the MAIN PRODUCT ONLY and return it as JSON matching the requested schema.`;

    // Direct LLM call with structured output (bypasses page.extract() to avoid schema wrapping)
    console.log(`[HyperAgent] 🤖 Calling LLM for extraction...`);

    // Log token estimate (roughly 4 chars per token)
    const estimatedTokens = Math.ceil(aiFriendlyContent.length / 4);
    console.log(
      `[HyperAgent] 💰 Estimated tokens: ~${estimatedTokens.toLocaleString()} (${aiFriendlyContent.length} chars)`,
    );

    const result = await agent["llm"].invokeStructured(
      {
        schema: productSchema,
        options: {
          temperature: 0,
        },
      },
      [
        {
          role: "user",
          content: prompt,
        },
      ],
    );

    if (!result.parsed) {
      throw new Error(`Failed to parse extraction result: ${result.rawText}`);
    }

    const extracted = result.parsed;

    // Build ProductDNA object
    const productDNA: ProductDNA = {
      name: extracted.name || "",
      brand: extracted.brand || "",
      price: extracted.price || 0,
      currency: extracted.currency || "INR",
      category: extracted.category || "",
      features: extracted.features || [],
      description:
        extracted.description && extracted.description.trim() !== ""
          ? extracted.description
          : undefined,
      imageUrl:
        extracted.imageUrl && extracted.imageUrl.trim() !== ""
          ? extracted.imageUrl
          : undefined,
      url: finalUrl,
      verifiedByAI: true,
    };

    // Validate extraction
    if (!productDNA.name || productDNA.price <= 0) {
      throw new Error(
        `Invalid extraction: name=${!!productDNA.name}, price=${productDNA.price}`,
      );
    }

    console.log(
      `[HyperAgent] ✅ Extraction complete: ${productDNA.name} - ${productDNA.price} ${productDNA.currency}`,
    );

    return productDNA;
  } catch (error: any) {
    console.error(`[HyperAgent] ❌ Error extracting product:`, error);
    throw new Error(`HyperAgent extraction failed: ${error.message}`);
  } finally {
    // Close the page after extraction to prevent memory leaks
    // Since CDP is disabled, we can close immediately without waiting
    await cleanupHyperAgent();
  }
}

/**
 * Cleanup HyperAgent instance (call on app shutdown)
 */
export async function cleanupHyperAgent(): Promise<void> {
  if (hyperAgentInstance) {
    await hyperAgentInstance.closeAgent();
    hyperAgentInstance = null;
  }
}
