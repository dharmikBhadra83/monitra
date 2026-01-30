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
      where: { userId },
      include: {
        logs: {
          orderBy: { timestamp: 'desc' },
          take: 5,
        },
      },
    });

    // Use latest two logs per product to detect price changes
    const priceChanges = products
      .map((product) => {
        if (product.logs.length < 2) return null;
        const [latestLog, previousLog] = product.logs;
        const oldPrice = Number(previousLog.priceUSD);
        const newPrice = Number(latestLog.priceUSD);
        const difference = newPrice - oldPrice;
        const differencePercent = oldPrice > 0 ? (difference / oldPrice) * 100 : 0;

        // Only include if there's a significant change (>0.01% to avoid rounding noise)
        if (Math.abs(differencePercent) < 0.01) return null;

        return {
          productId: product.id,
          productName: product.name,
          oldPrice,
          newPrice,
          difference,
          differencePercent,
          timestamp: latestLog.timestamp.toISOString(),
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    return NextResponse.json({ priceChanges });
  } catch (error: any) {
    console.error('Error fetching price changes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price changes', details: error.message },
      { status: 500 }
    );
  }
}
