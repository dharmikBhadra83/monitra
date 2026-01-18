import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { dbScrapeProduct } from '@/lib/db-scraper';
import { convertToUSD, roundTo3Decimals } from '@/lib/currency';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { mainUrl, competitorUrls = [] } = await req.json();
        const userId = session.user.id as string;

        if (!mainUrl) {
            return NextResponse.json({ error: 'Main product URL is required' }, { status: 400 });
        }

        // 1. Check all products (main + competitors) to ensure they all have canonicalProductId null
        const allUrls = [mainUrl, ...competitorUrls.filter((u: string) => u.trim() !== '')];
        const existingProducts = await prisma.product.findMany({
            where: { url: { in: allUrls } } as any,
            select: { url: true, canonicalProductId: true } as any
        }) as any[];

        // Check if any product already has a canonicalProductId (already in a mapping)
        const productsInMapping = existingProducts.filter((p: any) => p.canonicalProductId !== null);
        
        if (productsInMapping.length > 0) {
            const urlsInMapping = productsInMapping.map((p: any) => p.url).join(', ');
            return NextResponse.json(
                { error: `These products already exist in a mapping group: ${urlsInMapping}` },
                { status: 400 }
            );
        }

        // 2. Scrape main product - get scraped data only (no DB operations)
        const mainProductDna = await dbScrapeProduct(mainUrl);
        // Round price to 3 decimal places and convert to USD
        const roundedPrice = roundTo3Decimals(mainProductDna.price);
        const priceUSD = convertToUSD(roundedPrice, mainProductDna.currency || 'USD');

        // 3. Create CanonicalProduct for new mapping (auto-increment id)
        const canonicalProduct = await (prisma as any).canonicalProduct.create({
            data: {}
        }) as any;
        const canonicalProductId = canonicalProduct.id;

        // 4. Create main product for new mapping
        const mainProduct = await prisma.product.create({
            data: {
                url: mainUrl,
                userId,
                canonicalProductId: canonicalProductId,
                name: mainProductDna.name,
                brand: mainProductDna.brand || '',
                latestPrice: roundedPrice,
                priceUSD: priceUSD,
                currency: mainProductDna.currency || 'USD',
                imageUrl: mainProductDna.imageUrl,
            } as any
        }) as any;

        // 5. Create price log for main product
        await prisma.priceLog.create({
            data: {
                price: roundedPrice,
                priceUSD: priceUSD,
                currency: mainProductDna.currency || 'USD',
                productId: mainProduct.id,
            } as any
        });

        // 6. Scrape and create competitors with the same canonicalProductId and userId
        const competitorProducts = await Promise.all(
            competitorUrls
                .filter((u: string) => u.trim() !== '')
                .map(async (url: string) => {
                    try {
                        // Check if competitor already exists in any mapping
                        const existingCompetitor = await prisma.product.findUnique({ 
                            where: { url } 
                        }) as any;

                        if (existingCompetitor?.canonicalProductId) {
                            throw new Error(`Competitor product ${url} is already assigned to mapping group ${existingCompetitor.canonicalProductId}`);
                        }

                        // Scrape competitor - get data only (no DB operations)
                        const competitorDna = await dbScrapeProduct(url);
                        // Round price to 3 decimal places and convert to USD
                        const roundedCompetitorPrice = roundTo3Decimals(competitorDna.price);
                        const competitorPriceUSD = convertToUSD(roundedCompetitorPrice, competitorDna.currency || 'USD');
                        
                        // Create competitor product for this new mapping
                        const competitorProduct = await prisma.product.create({
                            data: {
                                url,
                                userId,
                                canonicalProductId: canonicalProductId,
                                name: competitorDna.name,
                                brand: competitorDna.brand || '',
                                latestPrice: roundedCompetitorPrice,
                                priceUSD: competitorPriceUSD,
                                currency: competitorDna.currency || 'USD',
                                imageUrl: competitorDna.imageUrl,
                            } as any
                        }) as any;

                        // Create price log for competitor
                        await prisma.priceLog.create({
                            data: {
                                price: roundedCompetitorPrice,
                                priceUSD: competitorPriceUSD,
                                currency: competitorDna.currency || 'USD',
                                productId: competitorProduct.id,
                            } as any
                        });

                        return competitorProduct;
                    } catch (error) {
                        console.error(`Failed to scrape competitor ${url}:`, error);
                        return null;
                    }
                })
        );

        const validCompetitors = competitorProducts.filter((p): p is any => p !== null);

        return NextResponse.json({
            success: true,
            canonicalProductId: canonicalProductId,
            mainProduct: {
                id: mainProduct.id,
                name: mainProduct.name,
                brand: mainProduct.brand,
                price: mainProduct.latestPrice,
                priceUSD: mainProduct.priceUSD,
                currency: mainProduct.currency,
                url: mainProduct.url,
                imageUrl: mainProduct.imageUrl,
            },
            competitorCount: validCompetitors.length,
            competitors: validCompetitors.map(c => ({
                id: c.id,
                name: c.name,
                brand: c.brand,
                price: c.latestPrice,
                priceUSD: c.priceUSD,
                currency: c.currency,
                url: c.url,
                imageUrl: c.imageUrl,
            }))
        });
    } catch (error: any) {
        console.error('Add product failed:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
