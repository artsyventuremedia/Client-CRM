"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function Pagination({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function goTo(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between text-sm text-slate-500">
      <span>
        Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" disabled={page <= 1} onClick={() => goTo(page - 1)}>
          Previous
        </Button>
        <Button variant="outline" disabled={page >= totalPages} onClick={() => goTo(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
