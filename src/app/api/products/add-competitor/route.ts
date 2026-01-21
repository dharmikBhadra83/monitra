import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { dbScrapeProduct } from '@/lib/db-scraper';
import { convertToUSD, roundTo3Decimals } from '@/lib/currency';

/**
 * POST /api/products/add-competitor
 * Adds a competitor product to an existing product group (canonicalProductId)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mainProductId, competitorUrl } = await req.json();
    const userId = session.user.id as string;

    if (!mainProductId || !competitorUrl) {
      return NextResponse.json(
        { error: 'Main product ID and competitor URL are required' },
        { status: 400 }
      );
    }

    // Find the main product to get its canonicalProductId
    const mainProduct = await prisma.product.findUnique({
      where: { id: mainProductId },
      select: { id: true, canonicalProductId: true, userId: true, url: true } as any
    }) as any;

    if (!mainProduct) {
      return NextResponse.json({ error: 'Main product not found' }, { status: 404 });
    }

    // Verify ownership
    if (mainProduct.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!mainProduct.canonicalProductId) {
      return NextResponse.json(
        { error: 'Main product does not belong to a product group' },
        { status: 400 }
      );
    }

    // Check if competitor URL already exists in this group
    const existingCompetitor = await prisma.product.findFirst({
      where: {
        canonicalProductId: mainProduct.canonicalProductId,
        url: competitorUrl,
        userId: userId
      } as any
    }) as any;

    if (existingCompetitor) {
      return NextResponse.json(
        { error: 'This competitor is already in the product group' },
        { status: 400 }
      );
    }

    // Scrape the competitor product
    try {
      await dbScrapeProduct(competitorUrl);
    } catch (error) {
      console.error(`Failed to scrape competitor ${competitorUrl}:`, error);
      return NextResponse.json(
        { error: `Failed to scrape product from URL: ${competitorUrl}` },
        { status: 400 }
      );
    }

    // Check if competitor URL already exists for this user (but not in a mapping)
    let competitorProduct = await prisma.product.findFirst({
      where: { 
        url: competitorUrl,
        userId: userId
      }
    }) as any;

    let isNewProduct = false;

    if (competitorProduct) {
      // If it exists and is already in a mapping, check if it's the same mapping
      if (competitorProduct.canonicalProductId) {
        if (competitorProduct.canonicalProductId !== mainProduct.canonicalProductId) {
          return NextResponse.json(
            { error: 'This competitor is already in a different mapping group' },
            { status: 400 }
          );
        }
        // Already in the same mapping, return it
        return NextResponse.json({
          success: true,
          competitor: {
            id: competitorProduct.id,
            name: competitorProduct.name,
            brand: competitorProduct.brand,
            price: competitorProduct.latestPrice,
            priceUSD: competitorProduct.priceUSD,
            currency: competitorProduct.currency,
            url: competitorProduct.url,
            imageUrl: competitorProduct.imageUrl,
          },
          totalCompetitors: (await prisma.product.findMany({
            where: {
              canonicalProductId: mainProduct.canonicalProductId,
              userId: userId,
              id: { not: mainProductId }
            } as any
          })).length,
          canonicalProductId: mainProduct.canonicalProductId
        });
      }
      // Exists but not in a mapping, update it
      competitorProduct = await prisma.product.update({
        where: { id: competitorProduct.id },
        data: {
          canonicalProductId: mainProduct.canonicalProductId,
        } as any
      }) as any;
    } else {
      // Check quota before creating new product
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { urlQuota: true, urlUsed: true }
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (user.urlUsed >= user.urlQuota) {
        return NextResponse.json(
          { 
            error: 'URL quota exceeded',
            quotaExceeded: true,
            urlUsed: user.urlUsed,
            urlQuota: user.urlQuota
          },
          { status: 403 }
        );
      }

      // Scrape and create new competitor product
      const competitorDna = await dbScrapeProduct(competitorUrl);
      const { convertToUSD, roundTo3Decimals } = await import('@/lib/currency');
      const roundedPrice = roundTo3Decimals(competitorDna.price);
      const priceUSD = convertToUSD(roundedPrice, competitorDna.currency || 'INR');

      competitorProduct = await prisma.product.create({
        data: {
          url: competitorUrl,
          userId,
          canonicalProductId: mainProduct.canonicalProductId,
          name: competitorDna.name,
          brand: competitorDna.brand || '',
          latestPrice: roundedPrice,
          priceUSD: priceUSD,
          currency: competitorDna.currency || 'INR',
          verifiedByAI: competitorDna.verifiedByAI || false,
          imageUrl: competitorDna.imageUrl,
        } as any
      }) as any;

      // Create price log
      await prisma.priceLog.create({
        data: {
          price: roundedPrice,
          priceUSD: priceUSD,
          currency: competitorDna.currency || 'USD',
          productId: competitorProduct.id,
        } as any
      });

      isNewProduct = true;

      // Update user's urlUsed count
      await prisma.user.update({
        where: { id: userId },
        data: {
          urlUsed: {
            increment: 1
          }
        }
      });
    }

    // Get all competitors in this group to return count
    const allCompetitors = await prisma.product.findMany({
      where: {
        canonicalProductId: mainProduct.canonicalProductId,
        userId: userId,
        id: { not: mainProductId } // Exclude main product
      } as any
    }) as any;

    return NextResponse.json({
      success: true,
      competitor: {
        id: competitorProduct.id,
        name: competitorProduct.name,
        brand: competitorProduct.brand,
        price: competitorProduct.latestPrice,
        priceUSD: competitorProduct.priceUSD,
        currency: competitorProduct.currency,
        url: competitorProduct.url,
        imageUrl: competitorProduct.imageUrl,
      },
      totalCompetitors: allCompetitors.length,
      canonicalProductId: mainProduct.canonicalProductId
    });
  } catch (error: any) {
    console.error('Add competitor failed:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
