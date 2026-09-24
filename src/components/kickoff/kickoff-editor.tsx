"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type KickoffDocument = {
  id: string;
  title: string;
  goals: string | null;
  scope: string | null;
  timeline: string | null;
  targetAudience: string | null;
  brandGuidelines: string | null;
  keyContacts: string | null;
  notes: string | null;
  sharedAt: string | Date | null;
} | null;

type TextFieldKey = "goals" | "scope" | "timeline" | "targetAudience" | "brandGuidelines" | "keyContacts" | "notes";

const FIELDS: Array<{ key: TextFieldKey; label: string }> = [
  { key: "goals", label: "Goals" },
  { key: "scope", label: "Scope / Deliverables" },
  { key: "timeline", label: "Timeline" },
  { key: "targetAudience", label: "Target Audience" },
  { key: "brandGuidelines", label: "Brand Guidelines" },
  { key: "keyContacts", label: "Key Contacts" },
  { key: "notes", label: "Notes" },
];

export function KickoffEditor({
  clientId,
  document,
  canEdit,
}: {
  clientId: string;
  document: KickoffDocument;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(!document);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: document?.title ?? "",
    goals: document?.goals ?? "",
    scope: document?.scope ?? "",
    timeline: document?.timeline ?? "",
    targetAudience: document?.targetAudience ?? "",
    brandGuidelines: document?.brandGuidelines ?? "",
    keyContacts: document?.keyContacts ?? "",
    notes: document?.notes ?? "",
  });

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = document
        ? await fetch(`/api/kickoff/${document.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          })
        : await fetch(`/api/clients/${clientId}/kickoff`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save kickoff document");
        return;
      }
      toast.success("Kickoff document saved");
      setEditing(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function toggleShare(share: boolean) {
    if (!document) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/kickoff/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ share }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not update sharing");
        return;
      }
      toast.success(share ? "Shared with client" : "Unshared");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{document ? "Edit Kickoff Document" : "New Kickoff Document"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSave} className="flex flex-col gap-3">
            <div>
              <Label htmlFor="kickoff-title">Title</Label>
              <Input id="kickoff-title" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            {FIELDS.map((field) => (
              <div key={field.key}>
                <Label htmlFor={`kickoff-${field.key}`}>{field.label}</Label>
                <textarea
                  id={`kickoff-${field.key}`}
                  className="h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form[field.key] as string}
                  onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="mt-2 flex justify-end gap-2">
              {document && (
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{document!.title}</CardTitle>
        <div className="flex items-center gap-2">
          {document!.sharedAt ? <Badge tone="success">Shared with client</Badge> : <Badge tone="neutral">Not shared</Badge>}
          {canEdit && (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                Edit
              </Button>
              {document!.sharedAt ? (
                <Button variant="outline" onClick={() => toggleShare(false)} disabled={loading}>
                  Unshare
                </Button>
              ) : (
                <Button onClick={() => toggleShare(true)} disabled={loading}>
                  Share with client
                </Button>
              )}
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm text-slate-600">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <p className="text-xs font-medium uppercase text-slate-400">{field.label}</p>
            <p className="whitespace-pre-wrap">{(document![field.key] as string) || "—"}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
