import type { Permission } from "@/generated/prisma/client";
import type { Resource } from "./matrix";

export type SessionPermissions = Record<string, Permission[]>;

export function can(
  permissions: SessionPermissions | undefined,
  resource: Resource,
  permission: Permission,
): boolean {
  if (!permissions) return false;
  const grants = permissions[resource];
  if (!grants) return false;
  return grants.includes(permission) || grants.includes("MANAGE");
}

export function canAny(
  permissions: SessionPermissions | undefined,
  checks: Array<[Resource, Permission]>,
): boolean {
  return checks.some(([resource, permission]) => can(permissions, resource, permission));
}
