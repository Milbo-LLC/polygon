/*
  Warnings:

  - The primary key for the `UserOrganization` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `UserOrganization` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "UserOrganization_userId_organizationId_key";

-- AlterTable
ALTER TABLE "UserOrganization" DROP CONSTRAINT "UserOrganization_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "UserOrganization_pkey" PRIMARY KEY ("userId", "organizationId");
