/*
  Warnings:

  - You are about to drop the column `version` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the `DocumentHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DocumentSnapshot` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DocumentHistory" DROP CONSTRAINT "DocumentHistory_documentId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentSnapshot" DROP CONSTRAINT "DocumentSnapshot_documentId_fkey";

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "version";

-- DropTable
DROP TABLE "DocumentHistory";

-- DropTable
DROP TABLE "DocumentSnapshot";
