/*
  Warnings:

  - You are about to alter the column `price` on the `PriceLog` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(19,3)`.
  - You are about to alter the column `priceUSD` on the `PriceLog` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(19,3)`.
  - You are about to alter the column `latestPrice` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(19,3)`.
  - You are about to alter the column `priceUSD` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(19,3)`.

*/
-- AlterTable
ALTER TABLE "PriceLog" ALTER COLUMN "price" SET DATA TYPE DECIMAL(19,3),
ALTER COLUMN "priceUSD" SET DATA TYPE DECIMAL(19,3);

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "latestPrice" SET DATA TYPE DECIMAL(19,3),
ALTER COLUMN "priceUSD" SET DATA TYPE DECIMAL(19,3);
