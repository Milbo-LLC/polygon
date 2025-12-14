-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "gridDivisions" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "gridSize" DOUBLE PRECISION NOT NULL DEFAULT 100,
ADD COLUMN     "unit" TEXT NOT NULL DEFAULT 'millimeter';

-- CreateTable
CREATE TABLE "DocumentOperation" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "dependencies" TEXT[],
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComputedGeometry" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "vertices" JSONB NOT NULL,
    "indices" JSONB NOT NULL,
    "normals" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isValid" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ComputedGeometry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentOperation_documentId_sequence_idx" ON "DocumentOperation"("documentId", "sequence");

-- CreateIndex
CREATE INDEX "DocumentOperation_documentId_deletedAt_idx" ON "DocumentOperation"("documentId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentOperation_documentId_sequence_key" ON "DocumentOperation"("documentId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "ComputedGeometry_operationId_key" ON "ComputedGeometry"("operationId");

-- CreateIndex
CREATE INDEX "ComputedGeometry_documentId_idx" ON "ComputedGeometry"("documentId");

-- AddForeignKey
ALTER TABLE "DocumentOperation" ADD CONSTRAINT "DocumentOperation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComputedGeometry" ADD CONSTRAINT "ComputedGeometry_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
