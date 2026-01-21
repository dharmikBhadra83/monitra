import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { aiDirectExtractProduct } from '@/lib/ai-direct-extractor';
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

        // 1. Get user quota information
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { urlQuota: true, urlUsed: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 2. Check only products owned by this user to ensure they don't already have canonicalProductId
        const allUrls = [mainUrl, ...competitorUrls.filter((u: string) => u.trim() !== '')];
        const existingProducts = await prisma.product.findMany({
            where: { 
                url: { in: allUrls },
                userId: userId // Only check products owned by this user
            } as any,
            select: { url: true, canonicalProductId: true, userId: true } as any
        }) as any[];

        // Check if any product owned by this user already has a canonicalProductId (already in a mapping)
        const productsInMapping = existingProducts.filter((p: any) => p.canonicalProductId !== null);
        
        if (productsInMapping.length > 0) {
            const urlsInMapping = productsInMapping.map((p: any) => p.url).join(', ');
            return NextResponse.json(
                { error: `These products already exist in a mapping group: ${urlsInMapping}` },
                { status: 400 }
            );
        }

        // 3. Count new URLs that will be created (excluding existing ones owned by this user)
        const existingUrls = existingProducts
            .filter((p: any) => p.userId === userId)
            .map((p: any) => p.url);
        const newUrls = allUrls.filter((url: string) => !existingUrls.includes(url));
        const newUrlCount = newUrls.length;

        // 4. Check quota before proceeding
        if (user.urlUsed + newUrlCount > user.urlQuota) {
            const remaining = user.urlQuota - user.urlUsed;
            return NextResponse.json(
                { 
                    error: 'URL quota exceeded',
                    quotaExceeded: true,
                    urlUsed: user.urlUsed,
                    urlQuota: user.urlQuota,
                    remaining: remaining,
                    requested: newUrlCount
                },
                { status: 403 }
            );
        }

        // 2. Extract main product using AI directly (no selectors, no scraping logic)
        const mainProductDna = await aiDirectExtractProduct(mainUrl);
        // Round price to 3 decimal places and convert to USD
        const roundedPrice = roundTo3Decimals(mainProductDna.price);
        const priceUSD = convertToUSD(roundedPrice, mainProductDna.currency || 'INR');

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
                currency: mainProductDna.currency || 'INR',
                verifiedByAI: mainProductDna.verifiedByAI || false,
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
                        // Check if competitor already exists in a mapping for this user
                        const existingCompetitor = await prisma.product.findFirst({ 
                            where: { 
                                url: url,
                                userId: userId
                            } 
                        }) as any;

                        if (existingCompetitor?.canonicalProductId) {
                            throw new Error(`Competitor product ${url} is already assigned to mapping group ${existingCompetitor.canonicalProductId}`);
                        }

                        // Scrape competitor - get data only (no DB operations)
                        const competitorDna = await aiDirectExtractProduct(url);
                        // Round price to 3 decimal places and convert to USD
                        const roundedCompetitorPrice = roundTo3Decimals(competitorDna.price);
                        const competitorPriceUSD = convertToUSD(roundedCompetitorPrice, competitorDna.currency || 'INR');
                        
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
                                currency: competitorDna.currency || 'INR',
                                verifiedByAI: competitorDna.verifiedByAI || false,
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

        // 7. Update user's urlUsed count
        const actualCreatedCount = 1 + validCompetitors.length; // main product + valid competitors
        await prisma.user.update({
            where: { id: userId },
            data: {
                urlUsed: {
                    increment: actualCreatedCount
                }
            }
        });

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
