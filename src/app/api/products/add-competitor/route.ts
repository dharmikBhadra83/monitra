import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { dbScrapeProduct } from '@/lib/db-scraper';

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

    // Get or create the competitor product and update it with canonicalProductId and userId
    let competitorProduct = await prisma.product.findUnique({
      where: { url: competitorUrl }
    }) as any;

    if (!competitorProduct) {
      return NextResponse.json(
        { error: 'Failed to create/find competitor product' },
        { status: 500 }
      );
    }

    // Update competitor with userId and canonicalProductId to join the group
    competitorProduct = await prisma.product.update({
      where: { id: competitorProduct.id },
      data: {
        userId,
        canonicalProductId: mainProduct.canonicalProductId,
      } as any
    }) as any;

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
