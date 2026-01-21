import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * DELETE /api/products/[id]
 * Deletes a product group by canonicalProductId (the [id] parameter should be the canonicalProductId)
 * Or deletes a single product by product ID if it doesn't have a canonicalProductId
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id as string;

    // Handle both Promise and direct params for Next.js 15+ compatibility
    const params = context.params;
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = resolvedParams?.id;

    if (!id) {
      console.error('Delete product: id is missing', { params: resolvedParams });
      return NextResponse.json({ error: 'Product ID or canonicalProductId is required' }, { status: 400 });
    }

    // Use transaction to ensure atomicity and prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // First, try to find a product by the ID to get its canonicalProductId
      const product = await tx.product.findFirst({
        where: {
          OR: [
            { id: id },
            { canonicalProductId: parseInt(id) || null } as any
          ],
          userId: userId
        } as any,
        select: {
          id: true,
          canonicalProductId: true
        } as any
      }) as any;

      // If product doesn't exist, it was already deleted (idempotent - return success)
      if (!product) {
        return {
          deletedProducts: 0,
          totalProductsInGroup: 0,
          alreadyDeleted: true
        };
      }

      // If product has a canonicalProductId, delete all products in that group
      if (product.canonicalProductId) {
        // Find all products in this group owned by this user
        const productsInGroup = await tx.product.findMany({
          where: {
            canonicalProductId: product.canonicalProductId,
            userId: userId
          } as any,
          select: { id: true }
        }) as any;

        const productIds = productsInGroup.map((p: { id: string }) => p.id);

        // Delete price logs for all products in the group
        await tx.priceLog.deleteMany({
          where: { productId: { in: productIds } }
        });

        // Delete all products in the group
        await tx.product.deleteMany({
          where: { id: { in: productIds } }
        });

        // Decrement user's urlUsed count (ensure it doesn't go below 0)
        const currentUser = await tx.user.findUnique({
          where: { id: userId },
          select: { urlUsed: true }
        });
        const newUrlUsed = Math.max(0, (currentUser?.urlUsed || 0) - productIds.length);
        await tx.user.update({
          where: { id: userId },
          data: {
            urlUsed: newUrlUsed
          }
        });

        return {
          deletedProducts: productIds.length,
          totalProductsInGroup: productIds.length,
          canonicalProductId: product.canonicalProductId
        };
      } else {
        // Product doesn't have a canonicalProductId, just delete this single product
        // Delete price logs first
        await tx.priceLog.deleteMany({
          where: { productId: product.id }
        });

        // Delete the product
        await tx.product.delete({
          where: { id: product.id }
        });

        // Decrement user's urlUsed count (ensure it doesn't go below 0)
        const currentUser = await tx.user.findUnique({
          where: { id: userId },
          select: { urlUsed: true }
        });
        const newUrlUsed = Math.max(0, (currentUser?.urlUsed || 0) - 1);
        await tx.user.update({
          where: { id: userId },
          data: {
            urlUsed: newUrlUsed
          }
        });

        return {
          deletedProducts: 1,
          totalProductsInGroup: 1
        };
      }
    });

    // If product was already deleted, return success (idempotent)
    if (result.alreadyDeleted) {
      return NextResponse.json({
        success: true,
        message: 'Product group was already deleted',
        deletedProducts: 0,
        totalProductsInGroup: 0
      });
    }

    return NextResponse.json({
      success: true,
      message: result.canonicalProductId 
        ? `Product group (canonicalProductId: ${result.canonicalProductId}) and associated products deleted successfully`
        : 'Product deleted successfully',
      deletedProducts: result.deletedProducts,
      totalProductsInGroup: result.totalProductsInGroup
    });
  } catch (error: any) {
    console.error('Delete product failed:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
