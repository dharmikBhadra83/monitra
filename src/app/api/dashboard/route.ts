import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // Get all products with their latest price logs
        const products = await prisma.product.findMany({
            include: {
                logs: {
                    orderBy: {
                        timestamp: 'desc',
                    },
                    take: 30, // Last 30 price points
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
            take: 50, // Limit to 50 most recent products
        });

        // Import currency converter
        const { convertToUSD } = await import('@/lib/currency');

        // Calculate statistics
        const totalProducts = products.length;
        const totalPriceLogs = products.reduce((sum, p) => sum + p.logs.length, 0);
        // Calculate avg price in USD (use priceUSD if available, otherwise convert)
        const avgPriceUSD = products.length > 0
            ? products.reduce((sum, p) => {
                const priceUSD = (p as any).priceUSD || convertToUSD(p.latestPrice, p.currency);
                return sum + priceUSD;
            }, 0) / products.length
            : 0;

        // Group by brand
        const brandStats = products.reduce((acc, product) => {
            if (!acc[product.brand]) {
                acc[product.brand] = {
                    brand: product.brand,
                    count: 0,
                    avgPriceUSD: 0,
                    products: [],
                };
            }
            acc[product.brand].count++;
            acc[product.brand].products.push(product);
            acc[product.brand].avgPriceUSD = acc[product.brand].products.reduce(
                (sum: number, p: any) => sum + p.priceUSD,
                0
            ) / acc[product.brand].count;
            return acc;
        }, {} as Record<string, any>);

        return NextResponse.json({
            products: products.map(p => {
                const priceUSD = (p as any).priceUSD || convertToUSD(p.latestPrice, p.currency);
                return {
                    id: p.id,
                    name: p.name,
                    brand: p.brand,
                    price: p.latestPrice,
                    priceUSD: priceUSD,
                    currency: p.currency,
                    url: p.url,
                    imageUrl: p.imageUrl,
                    priceHistory: p.logs.map((log: any) => ({
                        price: log.price,
                        priceUSD: log.priceUSD || convertToUSD(log.price, log.currency || p.currency),
                        currency: log.currency || p.currency,
                        timestamp: log.timestamp,
                    })),
                    createdAt: p.createdAt,
                    updatedAt: p.updatedAt,
                };
            }),
            statistics: {
                totalProducts,
                totalPriceLogs,
                avgPriceUSD: parseFloat(avgPriceUSD.toFixed(2)),
                brandCount: Object.keys(brandStats).length,
            },
            brandStats: Object.values(brandStats),
        });
    } catch (error: any) {
        console.error('Dashboard fetch failed:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
