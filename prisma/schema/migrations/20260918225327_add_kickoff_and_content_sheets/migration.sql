-- CreateEnum
CREATE TYPE "ContentItemStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'POSTED');

-- CreateTable
CREATE TABLE "kickoff_documents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "goals" TEXT,
    "scope" TEXT,
    "timeline" TEXT,
    "targetAudience" TEXT,
    "brandGuidelines" TEXT,
    "keyContacts" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "sharedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kickoff_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_sheets" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_sheet_items" (
    "id" TEXT NOT NULL,
    "contentSheetId" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "platform" TEXT,
    "contentType" TEXT,
    "caption" TEXT,
    "status" "ContentItemStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_sheet_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kickoff_documents_organizationId_clientId_idx" ON "kickoff_documents"("organizationId", "clientId");

-- CreateIndex
CREATE INDEX "content_sheets_organizationId_clientId_idx" ON "content_sheets"("organizationId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "content_sheets_clientId_month_year_key" ON "content_sheets"("clientId", "month", "year");

-- CreateIndex
CREATE INDEX "content_sheet_items_contentSheetId_idx" ON "content_sheet_items"("contentSheetId");

-- AddForeignKey
ALTER TABLE "kickoff_documents" ADD CONSTRAINT "kickoff_documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kickoff_documents" ADD CONSTRAINT "kickoff_documents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kickoff_documents" ADD CONSTRAINT "kickoff_documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_sheets" ADD CONSTRAINT "content_sheets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_sheets" ADD CONSTRAINT "content_sheets_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_sheets" ADD CONSTRAINT "content_sheets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_sheet_items" ADD CONSTRAINT "content_sheet_items_contentSheetId_fkey" FOREIGN KEY ("contentSheetId") REFERENCES "content_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_sheet_items" ADD CONSTRAINT "content_sheet_items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
