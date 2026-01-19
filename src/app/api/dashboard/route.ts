import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id as string;

        const products = await prisma.product.findMany({
            where: {
                userId: userId,
                canonicalProductId: { not: null }
            },
            include: {
                logs: {
                    orderBy: { timestamp: 'desc' },
                    take: 2
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        if (!products.length) {
            return NextResponse.json({
                kpi: {
                    totalProducts: 0,
                    competitorsTracked: 0,
                    priceIndex: 0,
                },
                charts: {
                    competitorShare: [],
                    pricePosition: [],
                },
                hotActions: {
                    unlisted: 0,
                    expensiveAlerts: 0, // >10% more expensive
                    recentChanges: 0,
                },
                segmentation: {
                    cheapest: 0,
                    midrange: 0,
                    expensive: 0,
                },
                closeCompetition: [],
                recentActivity: [],
                opportunities: []
            });
        }

        // Logic to group products
        const productGroups = new Map<number, any[]>();
        products.forEach((p) => {
            if (p.canonicalProductId) {
                if (!productGroups.has(p.canonicalProductId)) {
                    productGroups.set(p.canonicalProductId, []);
                }
                productGroups.get(p.canonicalProductId)!.push(p);
            }
        });

        let totalMainProducts = 0;
        let totalCompetitors = 0;

        // For Price Index and Charts
        let myPriceSum = 0;
        let marketPriceSum = 0;
        let comparisonsCount = 0;

        const domainCounts: Record<string, number> = {};
        const priceRankings: Record<string, number> = { '#1': 0, '#2': 0, '#3': 0, '#4+': 0 };

        // New Metrics
        let unlistedCount = 0;
        let expensiveAlertCount = 0;
        let recentChangeCount = 0;

        let cheapestCount = 0;
        let midrangeCount = 0;
        let expensiveCount = 0; // Distinct from expensive ALERT

        const closeCompetition: any[] = [];
        const opportunities: any[] = [];
        const recentActivity: any[] = [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        productGroups.forEach((groupProducts) => {
            // Sort by created at to find main product
            groupProducts.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

            const mainProduct = groupProducts[0];
            const competitors = groupProducts.slice(1);

            totalMainProducts++;
            totalCompetitors += competitors.length;

            const mainPrice = Number(mainProduct.priceUSD || mainProduct.latestPrice);

            // Check availability (mock logic based on price > 0 for now)
            if (mainPrice === 0) {
                unlistedCount++;
            }

            // Recent Changes for Activity and Hot Actions
            let priceChangedToday = false;
            if (mainProduct.logs && mainProduct.logs.length > 1) {
                const current = Number(mainProduct.logs[0].priceUSD);
                const previous = Number(mainProduct.logs[1].priceUSD);
                const logDate = new Date(mainProduct.logs[0].timestamp);

                if (Math.abs(current - previous) > 0.001) {
                    recentActivity.push({
                        id: mainProduct.id,
                        productName: mainProduct.name,
                        oldPrice: previous,
                        newPrice: current,
                        date: mainProduct.logs[0].timestamp
                    });
                    if (logDate >= today) {
                        recentChangeCount++;
                        priceChangedToday = true;
                    }
                }
            }

            // Process Competitors
            competitors.forEach(c => {
                try {
                    const url = new URL(c.url);
                    const hostname = url.hostname.replace('www.', '');
                    domainCounts[hostname] = (domainCounts[hostname] || 0) + 1;
                } catch (e) { }
            });

            // Comparisons
            if (mainPrice > 0) {
                const compPrices = competitors.map(c => Number(c.priceUSD || c.latestPrice)).filter(p => p > 0);

                if (compPrices.length > 0) {
                    const avgMarketPrice = compPrices.reduce((a, b) => a + b, 0) / compPrices.length;
                    const minCompPrice = Math.min(...compPrices);
                    const maxCompPrice = Math.max(...compPrices);

                    myPriceSum += mainPrice;
                    marketPriceSum += avgMarketPrice;
                    comparisonsCount++;

                    // Ranking
                    const allPrices = [mainPrice, ...compPrices].sort((a, b) => a - b);
                    const rank = allPrices.indexOf(mainPrice) + 1;
                    if (rank === 1) priceRankings['#1']++;
                    else if (rank === 2) priceRankings['#2']++;
                    else if (rank === 3) priceRankings['#3']++;
                    else priceRankings['#4+']++;

                    // Segmentation
                    if (mainPrice <= minCompPrice) {
                        cheapestCount++;
                    } else if (mainPrice >= maxCompPrice) {
                        expensiveCount++;
                    } else {
                        midrangeCount++;
                    }

                    // Hot Actions: Expensive Alert (>10% than avg market)
                    if (mainPrice > avgMarketPrice * 1.10) {
                        expensiveAlertCount++;
                    }

                    // Close Competition (within 2% of min competitor price)
                    // Only if we are NOT the cheapest (or equal)
                    if (mainPrice > minCompPrice) {
                        const diff = mainPrice - minCompPrice;
                        const percentDiff = diff / minCompPrice;
                        if (percentDiff < 0.05) { // 5% threshold for "close"
                            closeCompetition.push({
                                id: mainProduct.id,
                                name: mainProduct.name,
                                myPrice: mainPrice,
                                competitorPrice: minCompPrice,
                                difference: diff,
                                percentDiff: (percentDiff * 100).toFixed(1)
                            });
                        }
                    }

                    // Opportunity (Strictly more expensive)
                    if (mainPrice > minCompPrice) {
                        const diff = mainPrice - minCompPrice;
                        opportunities.push({
                            id: mainProduct.id,
                            name: mainProduct.name,
                            myPrice: mainPrice,
                            competitorPrice: minCompPrice,
                            difference: diff,
                            percentDiff: ((diff / minCompPrice) * 100).toFixed(1)
                        });
                    }
                } else {
                    priceRankings['#1']++;
                    cheapestCount++; // If no competitors, effectively cheapest
                }
            }
        });

        let priceIndex = 100;
        if (comparisonsCount > 0 && marketPriceSum > 0) {
            priceIndex = (myPriceSum / marketPriceSum) * 100;
        }

        const topDomains = Object.entries(domainCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, value]) => ({ name, value }));

        const positionData = [
            { name: 'Best Price', value: priceRankings['#1'], fill: '#10B981' },
            { name: '2nd Best', value: priceRankings['#2'], fill: '#3B82F6' },
            { name: '3rd Best', value: priceRankings['#3'], fill: '#F59E0B' },
            { name: 'Higher', value: priceRankings['#4+'], fill: '#EF4444' },
        ].filter(d => d.value > 0);

        opportunities.sort((a, b) => b.difference - a.difference);
        recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        closeCompetition.sort((a, b) => Number(a.percentDiff) - Number(b.percentDiff));

        return NextResponse.json({
            kpi: {
                totalProducts: totalMainProducts,
                competitorsTracked: totalCompetitors,
                priceIndex: Math.round(priceIndex)
            },
            charts: {
                competitorShare: topDomains,
                pricePosition: positionData
            },
            hotActions: {
                unlisted: unlistedCount,
                expensiveAlerts: expensiveAlertCount,
                recentChanges: recentChangeCount,
            },
            segmentation: {
                cheapest: cheapestCount,
                midrange: midrangeCount,
                expensive: expensiveCount,
            },
            closeCompetition: closeCompetition.slice(0, 5),
            recentActivity: recentActivity.slice(0, 5),
            opportunities: opportunities.slice(0, 5)
        });

    } catch (error: any) {
        console.error('Dashboard Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
