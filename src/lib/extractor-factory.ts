/**
 * Product Extractor
 * 
 * Uses HyperAgent for product extraction.
 * HyperAgent uses accessibility tree for AI-friendly DOM representation.
 * 
 * Usage:
 *   const product = await extractProduct(url);
 */

import { ProductDNA } from "./types";
import { extractProductWithHyperAgent } from "./hyperagent-extractor";

/**
 * Extract product information using HyperAgent
 * This is the main entry point for product extraction
 */
export async function extractProduct(url: string): Promise<ProductDNA> {
  console.log(`[Extractor] Using HyperAgent extractor`);
  return extractProductWithHyperAgent(url);
}
