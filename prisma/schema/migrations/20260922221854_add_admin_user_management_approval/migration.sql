-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "adminsCanManageUsers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "adminAssignableRoles" TEXT[] DEFAULT ARRAY[]::TEXT[];
