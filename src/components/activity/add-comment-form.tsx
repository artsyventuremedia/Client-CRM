"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function AddCommentForm({ entityType, entityId }: { entityType: string; entityId: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not add comment");
        return;
      }
      setContent("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <textarea
        className="h-16 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        placeholder="Add a comment..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={loading || !content.trim()}>
          {loading ? "Posting..." : "Post Comment"}
        </Button>
      </div>
    </form>
  );
}
