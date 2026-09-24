-- CreateTable
CREATE TABLE "pending_credentials" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tempPassword" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_credentials_userId_key" ON "pending_credentials"("userId");

-- CreateIndex
CREATE INDEX "pending_credentials_organizationId_idx" ON "pending_credentials"("organizationId");

-- AddForeignKey
ALTER TABLE "pending_credentials" ADD CONSTRAINT "pending_credentials_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_credentials" ADD CONSTRAINT "pending_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_credentials" ADD CONSTRAINT "pending_credentials_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
