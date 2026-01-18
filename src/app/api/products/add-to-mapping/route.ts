import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { dbScrapeProduct } from '@/lib/db-scraper';
import { convertToUSD, roundTo3Decimals } from '@/lib/currency';

/**
 * POST /api/products/add-to-mapping
 * Adds new products to an existing product mapping group (canonicalProductId)
 * 
 * Request body:
 * {
 *   "canonicalProductId": number,
 *   "urls": string[] // Array of product URLs to add
 * }
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { canonicalProductId, urls } = await req.json();
        const userId = session.user.id as string;

        if (!canonicalProductId || typeof canonicalProductId !== 'number') {
            return NextResponse.json(
                { error: 'canonicalProductId is required and must be a number' },
                { status: 400 }
            );
        }

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return NextResponse.json(
                { error: 'urls is required and must be a non-empty array' },
                { status: 400 }
            );
        }

        // Filter out empty URLs
        const validUrls = urls.filter((u: string) => u && typeof u === 'string' && u.trim() !== '');
        if (validUrls.length === 0) {
            return NextResponse.json(
                { error: 'At least one valid URL is required' },
                { status: 400 }
            );
        }

        // 1. Verify that the canonicalProductId exists and belongs to the user
        const canonicalProduct = await (prisma as any).canonicalProduct.findUnique({
            where: { id: canonicalProductId },
            include: {
                products: {
                    where: { userId },
                    select: { id: true, userId: true } as any,
                    take: 1
                } as any
            }
        }) as any;

        if (!canonicalProduct) {
            return NextResponse.json(
                { error: `CanonicalProduct with ID ${canonicalProductId} not found` },
                { status: 404 }
            );
        }

        // Verify user owns at least one product in this mapping
        if (!canonicalProduct.products || canonicalProduct.products.length === 0) {
            return NextResponse.json(
                { error: 'You do not have permission to add products to this mapping group' },
                { status: 403 }
            );
        }

        // 2. Check all URLs to ensure they don't already belong to a mapping
        const existingProducts = await prisma.product.findMany({
            where: { url: { in: validUrls } } as any,
            select: { url: true, canonicalProductId: true, userId: true } as any
        }) as any[];

        // Check if any product already has a canonicalProductId (already in a mapping)
        const productsInMapping = existingProducts.filter(
            (p: any) => p.canonicalProductId !== null && p.canonicalProductId !== undefined
        );

        if (productsInMapping.length > 0) {
            const urlsInMapping = productsInMapping.map((p: any) => p.url).join(', ');
            return NextResponse.json(
                {
                    error: `These products already exist in a mapping group: ${urlsInMapping}`,
                    conflictingUrls: urlsInMapping.split(', ')
                },
                { status: 400 }
            );
        }

        // 3. Check if any URLs already exist in this specific mapping (duplicate check)
        const existingInThisMapping = existingProducts.filter(
            (p: any) => p.canonicalProductId === canonicalProductId
        );
        if (existingInThisMapping.length > 0) {
            const urlsInThisMapping = existingInThisMapping.map((p: any) => p.url).join(', ');
            return NextResponse.json(
                {
                    error: `These products already exist in this mapping group: ${urlsInThisMapping}`,
                    duplicateUrls: urlsInThisMapping.split(', ')
                },
                { status: 400 }
            );
        }

        // 4. Scrape and create products with the same canonicalProductId and userId
        const addedProducts = await Promise.all(
            validUrls.map(async (url: string) => {
                try {
                    // Scrape product - get data only (no DB operations)
                    const productDna = await dbScrapeProduct(url);
                    
                    // Round price to 3 decimal places and convert to USD
                    const roundedPrice = roundTo3Decimals(productDna.price);
                    const priceUSD = convertToUSD(roundedPrice, productDna.currency || 'USD');

                    // Check if product already exists (but without mapping)
                    const existingProduct = existingProducts.find((p: any) => p.url === url);
                    
                    let product;
                    if (existingProduct && !existingProduct.canonicalProductId) {
                        // Update existing product to add it to the mapping
                        product = await prisma.product.update({
                            where: { id: existingProduct.id } as any,
                            data: {
                                canonicalProductId: canonicalProductId,
                                userId: userId,
                                name: productDna.name,
                                brand: productDna.brand || '',
                                latestPrice: roundedPrice,
                                priceUSD: priceUSD,
                                currency: productDna.currency || 'USD',
                                imageUrl: productDna.imageUrl,
                            } as any
                        }) as any;
                    } else {
                        // Create new product for this mapping
                        product = await prisma.product.create({
                            data: {
                                url,
                                userId,
                                canonicalProductId: canonicalProductId,
                                name: productDna.name,
                                brand: productDna.brand || '',
                                latestPrice: roundedPrice,
                                priceUSD: priceUSD,
                                currency: productDna.currency || 'USD',
                                imageUrl: productDna.imageUrl,
                            } as any
                        }) as any;
                    }

                    // Create price log for the product
                    await prisma.priceLog.create({
                        data: {
                            price: roundedPrice,
                            priceUSD: priceUSD,
                            currency: productDna.currency || 'USD',
                            productId: product.id,
                        } as any
                    });

                    return {
                        success: true,
                        product: {
                            id: product.id,
                            name: product.name,
                            brand: product.brand,
                            price: product.latestPrice,
                            priceUSD: product.priceUSD,
                            currency: product.currency,
                            url: product.url,
                            imageUrl: product.imageUrl,
                        }
                    };
                } catch (error: any) {
                    console.error(`Failed to add product ${url}:`, error);
                    return {
                        success: false,
                        url,
                        error: error.message || 'Failed to scrape or create product'
                    };
                }
            })
        );

        const successfulProducts = addedProducts.filter((p: any) => p.success);
        const failedProducts = addedProducts.filter((p: any) => !p.success);

        // Get total product count in this mapping
        const totalProductsInMapping = await prisma.product.count({
            where: {
                canonicalProductId: canonicalProductId,
                userId: userId
            } as any
        });

        return NextResponse.json({
            success: true,
            canonicalProductId: canonicalProductId,
            addedCount: successfulProducts.length,
            failedCount: failedProducts.length,
            totalProductsInMapping,
            addedProducts: successfulProducts.map((p: any) => p.product),
            failedUrls: failedProducts.map((p: any) => ({
                url: p.url,
                error: p.error
            }))
        });
    } catch (error: any) {
        console.error('Add products to mapping failed:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
