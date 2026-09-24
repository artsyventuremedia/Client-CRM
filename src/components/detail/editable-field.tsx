"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface EditableFieldOption {
  value: string;
  label: string;
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function EditableField({
  patchUrl,
  field,
  value,
  type = "text",
  options,
  displayValue,
  canEdit = true,
  className,
}: {
  /** API endpoint that accepts a PATCH with `{ [field]: newValue }`, e.g. `/api/leads/abc123`. */
  patchUrl: string;
  field: string;
  value: string;
  type?: "text" | "textarea" | "number" | "date" | "select";
  options?: EditableFieldOption[];
  /** Custom rendering for the read-only state (e.g. formatted currency); defaults to the raw value or "—". */
  displayValue?: React.ReactNode;
  canEdit?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  async function save(newValue: string) {
    if (newValue === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(patchUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newValue }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not save change");
        return;
      }
      toast.success("Saved");
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (!canEdit) {
    return <span className={className}>{displayValue ?? value ?? "—"}</span>;
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className={cn(
          "cursor-text rounded px-1 py-0.5 text-left underline decoration-dotted decoration-slate-300 underline-offset-4 hover:bg-slate-100 hover:decoration-slate-500",
          className,
        )}
        title="Click to edit"
      >
        {displayValue ?? value ?? <span className="text-slate-400">Click to add</span>}
      </button>
    );
  }

  if (type === "select") {
    return (
      <select
        autoFocus
        disabled={saving}
        className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm"
        value={draft}
        onChange={(e) => save(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") cancel();
        }}
      >
        {options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  const fieldElement =
    type === "textarea" ? (
      <textarea
        autoFocus
        disabled={saving}
        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") cancel();
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save(draft);
        }}
      />
    ) : (
      <input
        autoFocus
        type={type}
        disabled={saving}
        className="h-8 rounded-md border border-slate-300 px-2 text-sm"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save(draft);
          if (e.key === "Escape") cancel();
        }}
      />
    );

  return (
    <span className="inline-flex items-start gap-1">
      {fieldElement}
      <button
        type="button"
        disabled={saving}
        onClick={() => save(draft)}
        title="Save"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
      >
        <CheckIcon />
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={cancel}
        title="Cancel"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-50"
      >
        <XIcon />
      </button>
    </span>
  );
}
