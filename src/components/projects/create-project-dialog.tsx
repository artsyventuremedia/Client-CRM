"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ClientOption = { id: string; name: string; companyName: string | null };
type ManagerOption = { id: string; name: string | null };

export function CreateProjectDialog({
  clients,
  managers,
}: {
  clients: ClientOption[];
  managers: ManagerOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    name: "",
    description: "",
    managerId: "",
    startDate: "",
    targetDate: "",
    budget: "",
    priority: "MEDIUM",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          managerId: form.managerId || undefined,
          startDate: form.startDate || undefined,
          targetDate: form.targetDate || undefined,
          budget: form.budget ? Number(form.budget) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create project");
        return;
      }
      toast.success("Project created");
      setOpen(false);
      setForm({
        clientId: "",
        name: "",
        description: "",
        managerId: "",
        startDate: "",
        targetDate: "",
        budget: "",
        priority: "MEDIUM",
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>New Project</Button>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        <h2 className="mb-4 text-base font-semibold">New Project</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="project-client">Client</Label>
            <select
              id="project-client"
              required
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.clientId}
              onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
            >
              <option value="" disabled>
                Select a client
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName || c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="project-description">Description</Label>
            <textarea
              id="project-description"
              className="h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="project-manager">Manager</Label>
            <select
              id="project-manager"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.managerId}
              onChange={(e) => setForm((f) => ({ ...f, managerId: e.target.value }))}
            >
              <option value="">Unassigned</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name ?? "Unnamed user"}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="project-start">Start date</Label>
              <Input
                id="project-start"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="project-target">Target date</Label>
              <Input
                id="project-target"
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="project-budget">Budget (₹)</Label>
              <Input
                id="project-budget"
                type="number"
                min={0}
                value={form.budget}
                onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="project-priority">Priority</Label>
              <select
                id="project-priority"
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Create Project"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
