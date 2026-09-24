"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AddCommentForm } from "@/components/activity/add-comment-form";

export interface ActivityItem {
  id: string;
  kind: "audit" | "comment";
  text: string;
  authorName: string;
  createdAt: string;
  canDelete: boolean;
}

export function ActivityFeedClient({
  entityType,
  entityId,
  items,
  canComment,
}: {
  entityType: string;
  entityId: string;
  items: ActivityItem[];
  canComment: boolean;
}) {
  const router = useRouter();

  async function deleteComment(id: string) {
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not delete comment");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && <p className="text-sm text-slate-400">No activity yet.</p>}
      {items.map((item) => (
        <div key={item.id} className="flex items-start justify-between border-b border-slate-50 pb-2 text-sm">
          <div>
            <span className="font-medium text-slate-800">{item.authorName}</span>{" "}
            <span className="text-slate-600">{item.text}</span>
            <div className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</div>
          </div>
          {item.canDelete && (
            <Button variant="ghost" size="sm" onClick={() => deleteComment(item.id)}>
              Delete
            </Button>
          )}
        </div>
      ))}
      {canComment && <AddCommentForm entityType={entityType} entityId={entityId} />}
    </div>
  );
}
