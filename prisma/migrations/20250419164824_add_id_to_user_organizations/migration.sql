/*
 Warnings:
 
 - The primary key for the `UserOrganization` table will be changed. If it partially fails, the table could be left without primary key constraint.
 - A unique constraint covering the columns `[userId,organizationId,deletedAt]` on the table `UserOrganization` will be added. If there are existing duplicate values, this will fail.
 
 */
-- AlterTable
ALTER TABLE "UserOrganization" DROP CONSTRAINT "UserOrganization_pkey";
-- Add the id column as nullable first
ALTER TABLE "UserOrganization"
ADD COLUMN "id" TEXT;
-- Populate the id column with UUIDs for existing rows
UPDATE "UserOrganization"
SET "id" = gen_random_uuid()::TEXT
WHERE "id" IS NULL;
-- Now make the id column non-nullable and set it as the primary key
ALTER TABLE "UserOrganization"
ALTER COLUMN "id"
SET NOT NULL;
ALTER TABLE "UserOrganization"
ADD CONSTRAINT "UserOrganization_pkey" PRIMARY KEY ("id");
-- Create indexes
CREATE INDEX "UserOrganization_userId_organizationId_idx" ON "UserOrganization"("userId", "organizationId");
-- Create unique constraint that includes deletedAt
CREATE UNIQUE INDEX "UserOrganization_userId_organizationId_deletedAt_key" ON "UserOrganization"("userId", "organizationId", "deletedAt");