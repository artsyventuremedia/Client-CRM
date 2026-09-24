import { z } from "zod";
import { RESOURCES } from "@/lib/rbac/matrix";

export const createOrgOwnerSchema = z.object({
  organizationName: z.string().min(2).max(120),
  ownerName: z.string().min(2).max(120),
  email: z.string().email(),
});

export const employeeSystemRoles = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_EXECUTIVE",
  "ACCOUNT_MANAGER",
  "PROJECT_MANAGER",
  "FINANCE_MANAGER",
  "SUPPORT_AGENT",
  "EMPLOYEE",
] as const;

export const createEmployeeSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  systemRole: z.enum(employeeSystemRoles),
});

export const createClientLoginSchema = z.object({
  clientId: z.string(),
  name: z.string().min(2).max(120),
  email: z.string().email(),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export const toggleableSystemRoles = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_EXECUTIVE",
  "ACCOUNT_MANAGER",
  "PROJECT_MANAGER",
  "EMPLOYEE",
  "FINANCE_MANAGER",
  "SUPPORT_AGENT",
  "VENDOR",
  "CLIENT",
] as const;

export const setFeatureToggleSchema = z.object({
  systemRole: z.enum(toggleableSystemRoles),
  resource: z.enum(RESOURCES),
  enabled: z.boolean(),
});
