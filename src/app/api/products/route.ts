import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id as string;

    // Fetch all products for the current user grouped by canonicalProductId
    const allProducts = await prisma.product.findMany({
      where: {
        userId: userId,
        canonicalProductId: { not: null } // Only get products that belong to a group
      } as any,
      include: {
        logs: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'asc' // Order by creation date ascending to identify main product (created first)
      }
    });

    // Group products by canonicalProductId
    const productGroups = new Map<number, any[]>();
    allProducts.forEach((product: any) => {
      if (product.canonicalProductId) {
        if (!productGroups.has(product.canonicalProductId)) {
          productGroups.set(product.canonicalProductId, []);
        }
        productGroups.get(product.canonicalProductId)!.push(product);
      }
    });

    // Format the response and calculate basic analysis for each group
    const productsWithAnalysis = Array.from(productGroups.values()).map((products: any[]) => {
      // Sort products within each group by creation date to ensure main product is first
      const sortedProducts = [...products].sort((a: any, b: any) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      // The first product (created earliest) is the main product
      const mainProduct = sortedProducts[0];
      const competitors = sortedProducts.slice(1);

      const productPriceUSD = mainProduct.priceUSD || mainProduct.latestPrice;
      const competitorPrices = competitors
        .map((p: any) => p.priceUSD || p.latestPrice)
        .filter((p: number) => p > 0);

      const allPrices = [productPriceUSD, ...competitorPrices].filter(p => p > 0);

      const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
      const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;
      const averagePrice = allPrices.length > 0 ? allPrices.reduce((a: number, b: number) => a + b, 0) / allPrices.length : 0;

      const sortedPrices = [...allPrices].sort((a, b) => a - b);
      const priceRank = sortedPrices.indexOf(productPriceUSD) + 1;
      const difference = productPriceUSD - averagePrice;

      return {
        ...mainProduct,
        canonicalProductId: mainProduct.canonicalProductId, // Include canonicalProductId for delete operations
        competitors,
        priceRange: { min: minPrice, max: maxPrice },
        priceRank,
        averagePrice,
        difference,
        competitorCount: competitors.length,
      };
    });

    return NextResponse.json({ products: productsWithAnalysis });
  } catch (error: any) {
    console.error('Error fetching user products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products', details: error.message },
      { status: 500 }
    );
  }
}
