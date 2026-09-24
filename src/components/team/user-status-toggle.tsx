"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function UserStatusToggle({ userId, status }: { userId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const nextStatus = status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not update login status");
        return;
      }
      toast.success(nextStatus === "ACTIVE" ? "Login enabled" : "Login disabled");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={toggle} disabled={loading}>
      {status === "ACTIVE" ? "Disable" : "Enable"}
    </Button>
  );
}
