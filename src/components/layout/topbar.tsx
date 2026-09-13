"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function Topbar({ userName, userEmail }: { userName: string; userEmail: string }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="text-sm text-slate-500">Welcome back, {userName.split(" ")[0]}</div>
      <div className="flex items-center gap-3">
        <div className="text-right text-xs leading-tight">
          <p className="font-medium text-slate-800">{userName}</p>
          <p className="text-slate-400">{userEmail}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
