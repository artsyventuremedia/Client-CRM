-- CreateTable
CREATE TABLE "role_feature_toggles" (
    "id" TEXT NOT NULL,
    "systemRole" "SystemRole" NOT NULL,
    "resource" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_feature_toggles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_feature_toggles_systemRole_resource_key" ON "role_feature_toggles"("systemRole", "resource");
