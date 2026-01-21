-- Add verifiedByAI field to Product table
ALTER TABLE "Product" ADD COLUMN "verifiedByAI" BOOLEAN NOT NULL DEFAULT false;

-- Update default currency to INR
ALTER TABLE "Product" ALTER COLUMN "currency" SET DEFAULT 'INR';

-- Update existing products to have verifiedByAI = false (they weren't verified)
-- No need to update currency for existing products as they may have different currencies
