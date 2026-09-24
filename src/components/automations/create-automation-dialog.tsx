"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TRIGGER_OPTIONS = [
  { value: "lead.created", label: "When a lead is created" },
  { value: "ticket.created", label: "When a ticket is created" },
];

const ACTION_OPTIONS = [
  { value: "notify_user", label: "Notify a specific user" },
  { value: "assign_round_robin", label: "Assign round-robin among users" },
  { value: "create_task", label: "Create a follow-up task" },
];

export function CreateAutomationDialog({ users }: { users: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [triggerEvent, setTriggerEvent] = useState(TRIGGER_OPTIONS[0].value);
  const [actionType, setActionType] = useState(ACTION_OPTIONS[0].value);
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [userIds, setUserIds] = useState<string[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [notifyTitle, setNotifyTitle] = useState("");

  function toggleUserId(id: string) {
    setUserIds((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    let actionConfig: Record<string, unknown> = {};
    if (actionType === "notify_user") actionConfig = { userId, title: notifyTitle || "Automation triggered" };
    if (actionType === "assign_round_robin") actionConfig = { userIds };
    if (actionType === "create_task") actionConfig = { title: taskTitle };

    setLoading(true);
    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, triggerEvent, actionType, actionConfig }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create automation rule");
        return;
      }
      toast.success("Automation rule created");
      setOpen(false);
      setName("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>New Automation Rule</Button>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        <h2 className="mb-4 text-base font-semibold">New Automation Rule</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="rule-name">Rule name</Label>
            <Input id="rule-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="rule-trigger">Trigger</Label>
            <select
              id="rule-trigger"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm"
              value={triggerEvent}
              onChange={(e) => setTriggerEvent(e.target.value)}
            >
              {TRIGGER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="rule-action">Action</Label>
            <select
              id="rule-action"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm"
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {actionType === "notify_user" && (
            <>
              <div>
                <Label htmlFor="notify-user">User to notify</Label>
                <select
                  id="notify-user"
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="notify-title">Notification title</Label>
                <Input id="notify-title" value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)} />
              </div>
            </>
          )}

          {actionType === "assign_round_robin" && (
            <div>
              <Label>Users to rotate between</Label>
              <div className="flex flex-col gap-1 rounded-md border border-slate-200 p-2">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={userIds.includes(u.id)} onChange={() => toggleUserId(u.id)} />
                    {u.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {actionType === "create_task" && (
            <div>
              <Label htmlFor="task-title">Task title</Label>
              <Input id="task-title" required value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
            </div>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Rule"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
