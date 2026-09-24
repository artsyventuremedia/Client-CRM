"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  data: { url?: string } | null;
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  function load() {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      })
      .catch(() => {});
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications?markAllRead=true", { method: "PATCH" });
    load();
  }

  async function onClickItem(item: NotificationItem) {
    if (!item.readAt) {
      await fetch(`/api/notifications/${item.id}`, { method: "PATCH" });
      load();
    }
    if (item.data?.url) {
      setOpen(false);
      router.push(item.data.url);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
        aria-label="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M12 2a6 6 0 0 0-6 6v3.09c0 .48-.17.94-.48 1.31L4 14.5c-.8.96-.13 2.5 1.12 2.5h13.76c1.25 0 1.92-1.54 1.12-2.5l-1.52-2.1a2 2 0 0 1-.48-1.31V8a6 6 0 0 0-6-6Z" />
          <path d="M9.5 19a2.5 2.5 0 0 0 5 0h-5Z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead}>
                Mark all read
              </Button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && <p className="p-4 text-center text-sm text-slate-400">No notifications yet.</p>}
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => onClickItem(n)}
                className={`block w-full border-b border-slate-50 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                  n.readAt ? "" : "bg-blue-50/50"
                }`}
              >
                <p className="font-medium text-slate-800">{n.title}</p>
                <p className="text-xs text-slate-500">{n.body}</p>
                <p className="mt-0.5 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
