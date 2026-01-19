import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * DELETE /api/products/remove-competitor
 * Removes a single competitor product from a mapping group
 * The product is deleted, but the group (canonicalProductId) remains intact
 * 
 * Request body:
 * {
 *   "productId": string  // The ID of the competitor product to remove
 * }
 */
export async function DELETE(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id as string;
        const { productId } = await req.json();

        if (!productId) {
            return NextResponse.json(
                { error: 'productId is required' },
                { status: 400 }
            );
        }

        // Find the product to verify ownership and get its canonicalProductId
        const product = await prisma.product.findUnique({
            where: { id: productId } as any,
            select: {
                id: true,
                userId: true,
                canonicalProductId: true
            } as any
        }) as any;

        if (!product) {
            return NextResponse.json(
                { error: 'Product not found' },
                { status: 404 }
            );
        }

        // Verify ownership
        if (product.userId !== userId) {
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            );
        }

        // Check if this is the only product in the group (if it has a canonicalProductId)
        if (product.canonicalProductId) {
            const productsInGroup = await prisma.product.findMany({
                where: {
                    canonicalProductId: product.canonicalProductId,
                    userId: userId
                } as any,
                select: { id: true }
            }) as any;

            // If this is the only product in the group, we should not allow deletion
            // (or we could delete the whole group, but for now let's prevent it)
            if (productsInGroup.length === 1) {
                return NextResponse.json(
                    { error: 'Cannot delete the last product in a mapping group. Delete the entire group instead.' },
                    { status: 400 }
                );
            }
        }

        // Delete price logs for this product
        await prisma.priceLog.deleteMany({
            where: { productId: product.id }
        });

        // Delete the product
        await prisma.product.delete({
            where: { id: product.id } as any
        });

        // Get remaining products count in the group
        let remainingCount = 0;
        if (product.canonicalProductId) {
            const remainingProducts = await prisma.product.findMany({
                where: {
                    canonicalProductId: product.canonicalProductId,
                    userId: userId
                } as any
            }) as any;
            remainingCount = remainingProducts.length;
        }

        return NextResponse.json({
            success: true,
            message: 'Competitor product removed successfully',
            deletedProductId: product.id,
            canonicalProductId: product.canonicalProductId,
            remainingProductsInGroup: remainingCount
        });
    } catch (error: any) {
        console.error('Remove competitor failed:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
