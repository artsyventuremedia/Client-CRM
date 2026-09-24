"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationBell } from "@/components/layout/notification-bell";

export function Topbar({ userName, userEmail }: { userName: string; userEmail: string }) {
  const [signingOutAll, setSigningOutAll] = useState(false);

  async function onSignOutAllDevices() {
    setSigningOutAll(true);
    try {
      const res = await fetch("/api/auth/sign-out-all", { method: "POST" });
      if (!res.ok) {
        toast.error("Could not sign out other devices. Please try again.");
        return;
      }
      toast.success("Signed out of all devices");
      await signOut({ callbackUrl: "/login" });
    } finally {
      setSigningOutAll(false);
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
      <GlobalSearch />
      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="text-right text-xs leading-tight">
          <p className="font-medium text-slate-800">{userName}</p>
          <p className="text-slate-400">{userEmail}</p>
        </div>
        <Button variant="ghost" size="sm" disabled={signingOutAll} onClick={onSignOutAllDevices}>
          Sign out everywhere
        </Button>
        <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
