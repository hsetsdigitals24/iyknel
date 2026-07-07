"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const POLL_MS = 45_000;

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    if (document.visibilityState === "hidden") return;
    try {
      const res = await fetch("/api/notifications?scope=count");
      if (!res.ok) return;
      const data = (await res.json()) as { unread: number };
      setUnread(data.unread);
    } catch {
      // network hiccup — next poll will retry
    }
  }, []);

  useEffect(() => {
    void fetchCount();
    const interval = setInterval(() => void fetchCount(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchCount();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchCount]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function openPanel() {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setItems(null);
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) {
        setItems([]);
        return;
      }
      const data = (await res.json()) as { unread: number; items: NotificationItem[] };
      setUnread(data.unread);
      setItems(data.items);
    } catch {
      setItems([]);
    }
  }

  async function markRead(ids: string[] | "all") {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids === "all" ? { all: true } : { ids }),
      });
      if (res.ok) {
        const data = (await res.json()) as { unread: number };
        setUnread(data.unread);
      }
    } catch {
      // non-fatal; badge corrects on next poll
    }
  }

  function onItemClick(item: NotificationItem) {
    if (!item.readAt) {
      setUnread((u) => Math.max(0, u - 1));
      void markRead([item.id]);
    }
    setOpen(false);
    if (item.href) router.push(item.href);
  }

  function onMarkAllRead() {
    setUnread(0);
    setItems((prev) =>
      prev?.map((i) => (i.readAt ? i : { ...i, readAt: new Date().toISOString() })) ?? prev,
    );
    void markRead("all");
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => void openPanel()}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        aria-expanded={open}
        className="relative inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-md border bg-card shadow-md">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-xs font-medium text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items === null ? (
              <div className="space-y-2 p-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : items.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                No notifications yet.
              </p>
            ) : (
              <ul>
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onItemClick(item)}
                      className={`w-full border-b px-3 py-2.5 text-left last:border-b-0 hover:bg-secondary ${
                        item.readAt ? "" : "bg-primary/5"
                      }`}
                    >
                      <span className="flex items-start gap-2">
                        {!item.readAt && (
                          <span
                            className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary"
                            aria-hidden
                          />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {item.title}
                          </span>
                          {item.body && (
                            <span className="mt-0.5 block text-xs text-muted-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                              {item.body}
                            </span>
                          )}
                          <span className="mt-0.5 block text-[11px] text-muted-foreground/70">
                            {relativeTime(item.createdAt)}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
