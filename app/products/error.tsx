"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export default function ProductsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    toast.error("We couldn't load the catalog. Please try again.");
  }, []);
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <div className="max-w-md space-y-3 rounded-2xl border bg-card p-6 text-center shadow-sm">
        <h1 className="font-semibold">Catalog unavailable</h1>
        <p className="text-sm text-muted-foreground">
          We hit a problem loading products. Please try again in a moment.
        </p>
        <div className="flex justify-center gap-3 pt-1">
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </div>
  );
}
