/**
 * Price update logic for cron job only.
 * NOT exposed via API — call runPriceUpdate() from cron only.
 */

import { prisma } from '@/lib/prisma';
import { extractProductWithHyperAgent } from '@/lib/hyperagent-extractor';
import { convertToUSD } from '@/lib/currency';

function normalizeUrl(url: string): string {
  try {
    let normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = `https://${normalized}`;
    }
    const urlObj = new URL(normalized);
    const hostname = urlObj.hostname.replace(/^www\./i, '');
    const pathname = urlObj.pathname.replace(/\/$/, '') || '/';
    return `${urlObj.protocol}//${hostname}${pathname}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export interface PriceUpdateResult {
  total: number;
  uniqueUrls: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

/**
 * Run price update for all products. Internal use by cron only.
 */
export async function runPriceUpdate(): Promise<PriceUpdateResult> {
  const products = await prisma.product.findMany({
    where: { url: { not: '' } },
  });

  const urlGroups = new Map<string, typeof products>();
  for (const product of products) {
    if (!product.url) continue;
    const normalizedUrl = normalizeUrl(product.url);
    if (!urlGroups.has(normalizedUrl)) {
      urlGroups.set(normalizedUrl, []);
    }
    urlGroups.get(normalizedUrl)!.push(product);
  }

  const results: PriceUpdateResult = {
    total: products.length,
    uniqueUrls: urlGroups.size,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  console.log(`[Cron] Processing ${products.length} products across ${urlGroups.size} unique URLs`);

  for (const [normalizedUrl, productsWithSameUrl] of urlGroups.entries()) {
    try {
      const representativeProduct = productsWithSameUrl[0];
      const scrapeUrl = representativeProduct.url!;

      console.log(`[Cron] Scraping URL: ${scrapeUrl} (affects ${productsWithSameUrl.length} product(s))`);

      const productData = await extractProductWithHyperAgent(scrapeUrl);
      const newPriceUSD = convertToUSD(productData.price, productData.currency || 'INR');

      for (const product of productsWithSameUrl) {
        try {
          const currentPriceUSD = Number(product.priceUSD);

          if (newPriceUSD !== currentPriceUSD) {
            await prisma.priceLog.create({
              data: {
                productId: product.id,
                price: productData.price,
                priceUSD: newPriceUSD,
                currency: productData.currency || 'INR',
              },
            });

            await prisma.product.update({
              where: { id: product.id },
              data: {
                latestPrice: productData.price,
                priceUSD: newPriceUSD,
                currency: productData.currency || 'INR',
                updatedAt: new Date(),
              },
            });

            results.updated++;
            console.log(`[Cron] ✅ Updated price for ${product.name} (${product.userId}): ${currentPriceUSD} → ${newPriceUSD}`);
          } else {
            results.skipped++;
            console.log(`[Cron] ⏭️  Skipped ${product.name} (price unchanged: ${currentPriceUSD})`);
          }
        } catch (error: unknown) {
          results.failed++;
          const msg = error instanceof Error ? error.message : String(error);
          results.errors.push(`Failed to update ${product.name}: ${msg}`);
          console.error(`[Cron] ❌ Failed to update ${product.name}: ${msg}`);
        }
      }
    } catch (error: unknown) {
      results.failed += productsWithSameUrl.length;
      const msg = error instanceof Error ? error.message : String(error);
      results.errors.push(`Failed to scrape ${normalizedUrl}: ${msg}`);
      console.error(`[Cron] ❌ ${msg} (affects ${productsWithSameUrl.length} product(s))`);
    }
  }

  return results;
}
