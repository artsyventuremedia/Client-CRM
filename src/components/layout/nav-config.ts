import type { Resource } from "@/lib/rbac/matrix";
import type { Permission } from "@/generated/prisma";

export interface NavItem {
  label: string;
  href: string;
  resource: Resource;
  permission: Permission;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", resource: "leads", permission: "VIEW" },
  { label: "Leads", href: "/leads", resource: "leads", permission: "VIEW" },
  { label: "Clients", href: "/clients", resource: "clients", permission: "VIEW" },
  { label: "Quotations", href: "/quotations", resource: "quotations", permission: "VIEW" },
  { label: "Contracts", href: "/contracts", resource: "contracts", permission: "VIEW" },
  { label: "Services", href: "/services", resource: "services", permission: "VIEW" },
  { label: "Projects", href: "/projects", resource: "projects", permission: "VIEW" },
  { label: "Tasks", href: "/tasks", resource: "tasks", permission: "VIEW" },
  { label: "Vendors", href: "/vendors", resource: "vendors", permission: "VIEW" },
  { label: "Invoices", href: "/invoices", resource: "invoices", permission: "VIEW" },
  { label: "Payments", href: "/payments", resource: "payments", permission: "VIEW" },
  { label: "Tickets", href: "/tickets", resource: "tickets", permission: "VIEW" },
  { label: "Appointments", href: "/appointments", resource: "appointments", permission: "VIEW" },
  { label: "Reports", href: "/reports", resource: "reports", permission: "VIEW" },
  { label: "Team & Clients", href: "/team", resource: "users", permission: "CREATE" },
  { label: "Automations", href: "/automations", resource: "automations", permission: "VIEW" },
  { label: "Settings", href: "/settings", resource: "settings", permission: "VIEW" },
];

export const PLATFORM_NAV_ITEMS: Array<{ label: string; href: string }> = [
  { label: "Organizations", href: "/admin/organizations" },
  { label: "Feature Toggles", href: "/admin/feature-toggles" },
];
