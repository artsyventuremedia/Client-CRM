-- Postgres unique indexes treat NULL as distinct, so the compound unique
-- constraints on (organizationId, email) / (organizationId, name) do not
-- prevent duplicates among platform-level rows (organizationId IS NULL).
-- These partial indexes close that gap for the small number of tenant-less
-- rows (platform super admins, global RBAC roles).

CREATE UNIQUE INDEX IF NOT EXISTS "users_platform_email_key"
  ON "users" ("email")
  WHERE "organizationId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "roles_platform_name_key"
  ON "roles" ("name")
  WHERE "organizationId" IS NULL;
