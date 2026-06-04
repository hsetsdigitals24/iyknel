"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    toast.error("Something went wrong. Please try again.");
  }, []);
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md space-y-4 rounded-2xl border bg-card p-8 text-center shadow-sm">
        <h1 className="font-serif text-2xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          We hit an unexpected problem loading this page. You can try again, or head back to the
          homepage.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="outline">
            <a href="/">Back home</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
