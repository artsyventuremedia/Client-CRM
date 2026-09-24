import { Permission, SystemRole } from "@/generated/prisma";

export const RESOURCES = [
  "leads",
  "clients",
  "quotations",
  "contracts",
  "services",
  "service_orders",
  "projects",
  "tasks",
  "vendors",
  "invoices",
  "payments",
  "tickets",
  "appointments",
  "documents",
  "renewals",
  "reports",
  "users",
  "settings",
  "automations",
  "kickoff_documents",
  "content_sheets",
] as const;

export type Resource = (typeof RESOURCES)[number];

const ALL: Permission[] = [
  "VIEW",
  "CREATE",
  "EDIT",
  "DELETE",
  "APPROVE",
  "ASSIGN",
  "EXPORT",
  "DOWNLOAD",
  "MANAGE",
];

const RW: Permission[] = ["VIEW", "CREATE", "EDIT"];
const RO: Permission[] = ["VIEW"];

/**
 * Default permission matrix per system role. Organizations can override
 * individual role/resource grants via the Role + RolePermission tables;
 * this matrix seeds those rows and is the fallback when no override exists.
 */
export const DEFAULT_ROLE_MATRIX: Record<SystemRole, Partial<Record<Resource, Permission[]>>> = {
  SUPER_ADMIN: Object.fromEntries(RESOURCES.map((r) => [r, [...ALL, "FINANCIAL_ACCESS", "ADMIN_ACCESS"]])) as Record<Resource, Permission[]>,

  ORG_OWNER: Object.fromEntries(RESOURCES.map((r) => [r, [...ALL, "FINANCIAL_ACCESS", "ADMIN_ACCESS"]])) as Record<Resource, Permission[]>,

  ADMIN: Object.fromEntries(RESOURCES.map((r) => [r, ALL])) as Record<Resource, Permission[]>,

  SALES_MANAGER: {
    leads: ALL,
    clients: [...RW, "ASSIGN", "EXPORT"],
    quotations: [...ALL],
    contracts: RO,
    services: RO,
    reports: ["VIEW", "EXPORT"],
    appointments: RW,
    tasks: RW,
    kickoff_documents: RW,
    content_sheets: RW,
  },

  SALES_EXECUTIVE: {
    leads: ["VIEW", "CREATE", "EDIT"],
    clients: RO,
    quotations: ["VIEW", "CREATE", "EDIT"],
    appointments: RW,
    tasks: RO,
    kickoff_documents: RW,
    content_sheets: RW,
  },

  ACCOUNT_MANAGER: {
    clients: [...RW, "ASSIGN"],
    services: RO,
    service_orders: RW,
    projects: RW,
    tasks: RW,
    renewals: RW,
    appointments: RW,
    tickets: RO,
    invoices: RO,
    kickoff_documents: RW,
    content_sheets: RW,
  },

  PROJECT_MANAGER: {
    projects: [...ALL],
    tasks: [...ALL],
    vendors: [...RW, "ASSIGN"],
    clients: RO,
    documents: RW,
    kickoff_documents: RW,
    content_sheets: RW,
  },

  EMPLOYEE: {
    tasks: ["VIEW", "EDIT"],
    projects: RO,
    documents: RO,
    kickoff_documents: RW,
    content_sheets: RW,
  },

  FINANCE_MANAGER: {
    quotations: [...RW, "APPROVE"],
    invoices: [...ALL, "FINANCIAL_ACCESS"],
    payments: [...ALL, "FINANCIAL_ACCESS"],
    reports: ["VIEW", "EXPORT", "FINANCIAL_ACCESS"],
    clients: RO,
  },

  SUPPORT_AGENT: {
    tickets: [...RW, "ASSIGN"],
    clients: RO,
    appointments: RW,
  },

  VENDOR: {
    tasks: ["VIEW", "EDIT"],
    projects: RO,
    documents: ["VIEW", "DOWNLOAD"],
    invoices: RO,
  },

  CLIENT: {
    projects: RO,
    tasks: RO,
    quotations: ["VIEW", "APPROVE"],
    invoices: ["VIEW", "DOWNLOAD"],
    payments: ["VIEW", "CREATE"],
    tickets: ["VIEW", "CREATE"],
    appointments: ["VIEW", "CREATE"],
    documents: ["VIEW", "DOWNLOAD", "CREATE"],
    renewals: RO,
    kickoff_documents: RO,
    content_sheets: ["VIEW", "CREATE", "EDIT"],
  },
};
