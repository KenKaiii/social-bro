-- Add password-change timestamp used to revoke JWT sessions issued before a reset.
ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
