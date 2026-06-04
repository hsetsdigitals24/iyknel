"use client";

import { Trash2 } from "lucide-react";

export function ConfirmDeleteButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      aria-label={label}
      title={label}
      onClick={(e) => {
        if (!confirm(`${label}?`)) e.preventDefault();
      }}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-destructive/30 text-destructive transition hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
