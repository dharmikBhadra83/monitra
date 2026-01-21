-- Drop the unique constraint on url column
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_url_key";

-- Add composite unique constraint on url and userId
-- This allows the same URL for different users, but prevents duplicate URLs for the same user
ALTER TABLE "Product" ADD CONSTRAINT "Product_url_userId_key" UNIQUE ("url", "userId");
