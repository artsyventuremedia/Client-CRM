"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DocumentRow {
  id: string;
  name: string;
  sizeBytes: number;
  createdAt: string;
  uploadedBy: { name: string } | null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    fetch(`/api/documents?entityType=${entityType}&entityId=${entityId}`)
      .then((res) => res.json())
      .then((data) => setDocuments(data.documents ?? []))
      .catch(() => {});
  }

  useEffect(load, [entityType, entityId]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("entityType", entityType);
      form.append("entityId", entityId);
      const res = await fetch("/api/documents", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not upload file");
        return;
      }
      toast.success("File uploaded");
      load();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onDelete(id: string) {
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not delete file");
      return;
    }
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Files</CardTitle>
        <div>
          <input ref={fileInputRef} type="file" className="hidden" onChange={onUpload} />
          <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            {uploading ? "Uploading..." : "Upload File"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {documents.length === 0 && <p className="text-slate-400">No files attached yet.</p>}
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between border-b border-slate-50 pb-2">
            <div>
              <a href={`/api/documents/${doc.id}`} className="font-medium text-slate-800 hover:underline">
                {doc.name}
              </a>
              <p className="text-xs text-slate-400">
                {formatSize(doc.sizeBytes)} · {doc.uploadedBy?.name ?? "Unknown"} · {new Date(doc.createdAt).toLocaleDateString()}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onDelete(doc.id)}>
              Delete
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
