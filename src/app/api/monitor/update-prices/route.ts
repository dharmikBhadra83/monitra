import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractProductWithHyperAgent } from '@/lib/hyperagent-extractor';
import { convertToUSD } from '@/lib/currency';

/**
 * Normalize URL to handle variations (http/https, www, trailing slashes)
 */
function normalizeUrl(url: string): string {
  try {
    // Ensure URL has a protocol
    let normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = `https://${normalized}`;
    }
    
    const urlObj = new URL(normalized);
    // Remove www. prefix
    let hostname = urlObj.hostname.replace(/^www\./i, '');
    // Remove trailing slash from pathname
    let pathname = urlObj.pathname.replace(/\/$/, '') || '/';
    
    // Reconstruct URL without query params and hash
    return `${urlObj.protocol}//${hostname}${pathname}`.toLowerCase();
  } catch (error) {
    // If URL parsing fails, return original
    return url.toLowerCase();
  }
}

// This endpoint should be called by the cron job
// It requires a secret key to prevent unauthorized access
export async function POST(request: NextRequest) {
  try {
    // Check for secret key in headers or query params
    const authHeader = request.headers.get('authorization');
    const secretKey = process.env.CRON_SECRET_KEY || 'default-secret-key';
    
    if (authHeader !== `Bearer ${secretKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all products that need price updates
    const products = await prisma.product.findMany({
      where: {
        // Only update products that have a valid URL
        // Use 'not' with an empty string to ensure non-empty URLs
        url: { not: '' },
      },
    });
    // Group products by normalized URL to avoid duplicate scraping
    const urlGroups = new Map<string, typeof products>();
    
    for (const product of products) {
      if (!product.url) continue;
      
      const normalizedUrl = normalizeUrl(product.url);
      if (!urlGroups.has(normalizedUrl)) {
        urlGroups.set(normalizedUrl, []);
      }
      urlGroups.get(normalizedUrl)!.push(product);
    }

    const results = {
      total: products.length,
      uniqueUrls: urlGroups.size,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    console.log(`[Cron] Processing ${products.length} products across ${urlGroups.size} unique URLs`);

    // Process each unique URL once
    for (const [normalizedUrl, productsWithSameUrl] of urlGroups.entries()) {
      try {
        // Use the first product's URL for scraping (they're all the same after normalization)
        const representativeProduct = productsWithSameUrl[0];
        const scrapeUrl = representativeProduct.url!;
        
        console.log(`[Cron] Scraping URL: ${scrapeUrl} (affects ${productsWithSameUrl.length} product(s))`);
        
        // Extract current price from the product URL (scrape only once)
        const productData = await extractProductWithHyperAgent(scrapeUrl);
        
        // Convert price to USD
        const newPriceUSD = convertToUSD(productData.price, productData.currency || 'INR');
        
        // Update all products that share this URL
        for (const product of productsWithSameUrl) {
          try {
            const currentPriceUSD = Number(product.priceUSD);
            
            // Only update if price is different (not equal)
            if (newPriceUSD !== currentPriceUSD) {
              // Create a new price log entry
              await prisma.priceLog.create({
                data: {
                  productId: product.id,
                  price: productData.price,
                  priceUSD: newPriceUSD,
                  currency: productData.currency || 'INR',
                },
              });

              // Update the product's latest price
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
          } catch (error: any) {
            results.failed++;
            const errorMsg = `Failed to update ${product.name}: ${error.message}`;
            results.errors.push(errorMsg);
            console.error(`[Cron] ❌ ${errorMsg}`);
          }
        }
      } catch (error: any) {
        // If scraping fails for a URL, mark all products with that URL as failed
        results.failed += productsWithSameUrl.length;
        const errorMsg = `Failed to scrape ${normalizedUrl}: ${error.message}`;
        results.errors.push(errorMsg);
        console.error(`[Cron] ❌ ${errorMsg} (affects ${productsWithSameUrl.length} product(s))`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Price update completed: ${results.updated} updated, ${results.skipped} skipped, ${results.failed} failed`,
      results,
    });
  } catch (error: any) {
    console.error('Error in cron job:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: error.message },
      { status: 500 }
    );
  }
}
