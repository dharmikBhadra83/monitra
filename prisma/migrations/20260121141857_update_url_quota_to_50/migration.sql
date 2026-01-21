-- Update default value for urlQuota from 30 to 50
ALTER TABLE "User" ALTER COLUMN "urlQuota" SET DEFAULT 50;

-- Update existing users who have urlQuota = 30 to 50
UPDATE "User" SET "urlQuota" = 50 WHERE "urlQuota" = 30;
