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

    // Get today's date at midnight IST
    const now = new Date();
    const todayIST = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    todayIST.setHours(0, 0, 0, 0);
    
    // Get yesterday's date at midnight IST
    const yesterdayIST = new Date(todayIST);
    yesterdayIST.setDate(yesterdayIST.getDate() - 1);

    // Fetch all products for the current user
    const products = await prisma.product.findMany({
      where: {
        userId: userId,
      },
      include: {
        logs: {
          orderBy: { timestamp: 'desc' },
          // Get logs from today and yesterday
        },
      },
    });

    // Filter products that have price changes between today and yesterday
    const priceChanges = products
      .map((product) => {
        // Find today's price log (if exists)
        const todayLog = product.logs.find((log) => {
          const logDate = new Date(log.timestamp);
          const logDateIST = new Date(logDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
          logDateIST.setHours(0, 0, 0, 0);
          return logDateIST.getTime() === todayIST.getTime();
        });

        // Find yesterday's price log (if exists)
        const yesterdayLog = product.logs.find((log) => {
          const logDate = new Date(log.timestamp);
          const logDateIST = new Date(logDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
          logDateIST.setHours(0, 0, 0, 0);
          return logDateIST.getTime() === yesterdayIST.getTime();
        });

        // If we don't have both logs, try to get the latest two logs
        if (!todayLog || !yesterdayLog) {
          if (product.logs.length >= 2) {
            const [latestLog, previousLog] = product.logs;
            const oldPrice = Number(previousLog.priceUSD);
            const newPrice = Number(latestLog.priceUSD);
            const difference = newPrice - oldPrice;
            const differencePercent = oldPrice > 0 ? (difference / oldPrice) * 100 : 0;

            // Only include if there's a significant change (more than 0.01% to avoid rounding errors)
            if (Math.abs(differencePercent) < 0.01) {
              return null;
            }

            return {
              productId: product.id,
              productName: product.name,
              oldPrice,
              newPrice,
              difference,
              differencePercent,
              timestamp: latestLog.timestamp.toISOString(),
            };
          }
          return null;
        }

        const oldPrice = Number(yesterdayLog.priceUSD);
        const newPrice = Number(todayLog.priceUSD);
        const difference = newPrice - oldPrice;
        const differencePercent = oldPrice > 0 ? (difference / oldPrice) * 100 : 0;

        // Only include if there's a significant change (more than 0.01% to avoid rounding errors)
        if (Math.abs(differencePercent) < 0.01) {
          return null;
        }

        return {
          productId: product.id,
          productName: product.name,
          oldPrice,
          newPrice,
          difference,
          differencePercent,
          timestamp: todayLog.timestamp.toISOString(),
        };
      })
      .filter((change) => change !== null);

    return NextResponse.json({ priceChanges });
  } catch (error: any) {
    console.error('Error fetching price changes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price changes', details: error.message },
      { status: 500 }
    );
  }
}
