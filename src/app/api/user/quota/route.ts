import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id as string;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                urlQuota: true,
                urlUsed: true,
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Recalculate actual product count for consistency checks
        const actualProductCount = await prisma.product.count({
            where: {
                userId: userId,
                canonicalProductId: { not: null }
            }
        });

        // Only sync urlUsed UP when actual count exceeds stored value (fixes drift).
        // Never sync DOWN — deleting does not free quota slots.
        let urlUsed = user.urlUsed;
        if (actualProductCount > user.urlUsed) {
            await prisma.user.update({
                where: { id: userId },
                data: { urlUsed: actualProductCount }
            });
            urlUsed = actualProductCount;
        }

        // Ensure urlUsed is never negative
        urlUsed = Math.max(0, urlUsed);
        const remaining = Math.max(0, user.urlQuota - urlUsed);
        
        return NextResponse.json({
            urlQuota: user.urlQuota,
            urlUsed: urlUsed,
            remaining: remaining,
            isQuotaExceeded: urlUsed >= user.urlQuota,
        });
    } catch (error: any) {
        console.error('Get quota failed:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
