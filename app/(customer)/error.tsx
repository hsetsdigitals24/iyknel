"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export default function CustomerError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    toast.error("Something went wrong loading this page.");
  }, []);
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <div className="max-w-md space-y-3 rounded-2xl border bg-card p-6 text-center shadow-sm">
        <h1 className="font-semibold">We couldn&apos;t load that page</h1>
        <p className="text-sm text-muted-foreground">
          Please try again, or head back to the catalog.
        </p>
        <div className="flex justify-center gap-3 pt-1">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="outline">
            <a href="/products">Browse products</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
