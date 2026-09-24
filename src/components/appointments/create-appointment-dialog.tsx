"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ClientOption = {
  id: string;
  name: string;
  companyName: string | null;
};

const APPOINTMENT_TYPES = ["ONLINE", "OFFLINE", "PHONE", "VIDEO_CONFERENCE"] as const;

export function CreateAppointmentDialog({ clients }: { clients: ClientOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    clientId: "",
    type: "ONLINE" as (typeof APPOINTMENT_TYPES)[number],
    startTime: "",
    endTime: "",
    location: "",
    meetingUrl: "",
    agenda: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          clientId: form.clientId || undefined,
          startTime: form.startTime ? new Date(form.startTime).toISOString() : undefined,
          endTime: form.endTime ? new Date(form.endTime).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not create appointment");
        return;
      }
      toast.success("Appointment created");
      setOpen(false);
      setForm({
        title: "",
        clientId: "",
        type: "ONLINE",
        startTime: "",
        endTime: "",
        location: "",
        meetingUrl: "",
        agenda: "",
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>New Appointment</Button>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        <h2 className="mb-4 text-base font-semibold">New Appointment</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="appointment-title">Title</Label>
            <Input
              id="appointment-title"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="appointment-client">Client</Label>
            <select
              id="appointment-client"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.clientId}
              onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
            >
              <option value="">Internal / no client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                  {client.companyName ? ` (${client.companyName})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="appointment-type">Type</Label>
            <select
              id="appointment-type"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as (typeof APPOINTMENT_TYPES)[number] }))}
            >
              {APPOINTMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="appointment-start">Start time</Label>
              <Input
                id="appointment-start"
                type="datetime-local"
                required
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="appointment-end">End time</Label>
              <Input
                id="appointment-end"
                type="datetime-local"
                required
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="appointment-location">Location</Label>
            <Input
              id="appointment-location"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="appointment-meeting-url">Meeting URL</Label>
            <Input
              id="appointment-meeting-url"
              type="url"
              value={form.meetingUrl}
              onChange={(e) => setForm((f) => ({ ...f, meetingUrl: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="appointment-agenda">Agenda</Label>
            <textarea
              id="appointment-agenda"
              className="h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.agenda}
              onChange={(e) => setForm((f) => ({ ...f, agenda: e.target.value }))}
            />
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Create Appointment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
