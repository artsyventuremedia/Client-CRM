"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, PLATFORM_NAV_ITEMS } from "./nav-config";
import { can } from "@/lib/rbac/check";
import type { Permission } from "@/generated/prisma";

export function Sidebar({
  permissions,
  isPlatformAdmin,
  orgName,
}: {
  permissions: Record<string, Permission[]>;
  isPlatformAdmin: boolean;
  orgName: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="border-b border-slate-100 px-4 py-4">
        <p className="text-sm font-semibold text-slate-900">{orgName}</p>
        <p className="text-xs text-slate-400">ClientOps</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_ITEMS.filter(
          (item) => item.href === "/dashboard" || isPlatformAdmin || can(permissions, item.resource, item.permission),
        ).map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100",
                active && "bg-slate-900 text-white hover:bg-slate-900",
              )}
            >
              {item.label}
            </Link>
          );
        })}
        {isPlatformAdmin && (
          <>
            <p className="mt-3 px-3 text-xs font-semibold uppercase text-slate-400">Platform Admin</p>
            {PLATFORM_NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100",
                    active && "bg-slate-900 text-white hover:bg-slate-900",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>
    </aside>
  );
}
