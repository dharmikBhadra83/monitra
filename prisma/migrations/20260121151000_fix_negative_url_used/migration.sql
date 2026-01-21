-- Fix any negative urlUsed values (set them to 0)
UPDATE "User" SET "urlUsed" = 0 WHERE "urlUsed" < 0;
