import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * PATCH /api/products/update
 * Updates a product's name, brand, and/or URL
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { productId, name, brand, url } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Verify the product exists and belongs to the user
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        userId: true,
        url: true
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if user owns this product
    if (product.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (brand !== undefined) updateData.brand = brand;
    if (url !== undefined && url !== product.url) {
      // Check if new URL already exists
      const existingProduct = await prisma.product.findUnique({
        where: { url },
      });
      if (existingProduct && existingProduct.id !== productId) {
        return NextResponse.json({ error: 'A product with this URL already exists' }, { status: 400 });
      }
      updateData.url = url;
    }

    // Update the product
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      product: updatedProduct,
    });
  } catch (error: any) {
    console.error('Update product failed:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
