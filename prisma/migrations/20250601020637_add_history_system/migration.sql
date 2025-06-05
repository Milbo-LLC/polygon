-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "HistoryEntry" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "actionType" TEXT NOT NULL,
    "actionSubtype" TEXT NOT NULL,
    "targetId" TEXT,
    "parentEntryId" TEXT,
    "parameters" JSONB NOT NULL,
    "metadata" JSONB,
    "branchId" TEXT,
    "isCheckpoint" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "HistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentState" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "state" JSONB NOT NULL,
    "stateHash" TEXT NOT NULL,
    "isCheckpoint" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,

    CONSTRAINT "DocumentState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentBranch" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseVersion" INTEGER NOT NULL,
    "headVersion" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "mergedAt" TIMESTAMP(3),
    "mergedIntoId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "DocumentBranch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistoryEntry_documentId_version_idx" ON "HistoryEntry"("documentId", "version");

-- CreateIndex
CREATE INDEX "HistoryEntry_documentId_createdAt_idx" ON "HistoryEntry"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "HistoryEntry_actionType_actionSubtype_idx" ON "HistoryEntry"("actionType", "actionSubtype");

-- CreateIndex
CREATE INDEX "DocumentState_documentId_isCheckpoint_idx" ON "DocumentState"("documentId", "isCheckpoint");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentState_documentId_version_key" ON "DocumentState"("documentId", "version");

-- CreateIndex
CREATE INDEX "DocumentBranch_documentId_status_idx" ON "DocumentBranch"("documentId", "status");

-- AddForeignKey
ALTER TABLE "HistoryEntry" ADD CONSTRAINT "HistoryEntry_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoryEntry" ADD CONSTRAINT "HistoryEntry_parentEntryId_fkey" FOREIGN KEY ("parentEntryId") REFERENCES "HistoryEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoryEntry" ADD CONSTRAINT "HistoryEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "DocumentBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentState" ADD CONSTRAINT "DocumentState_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentBranch" ADD CONSTRAINT "DocumentBranch_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentBranch" ADD CONSTRAINT "DocumentBranch_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "DocumentBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
