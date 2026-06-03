"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markPaidAction } from "../actions";

export function IPaidButton({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="lg"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await markPaidAction(orderId);
          if (!res.ok) toast.error(res.message);
          else toast.success("Thanks — we'll verify and confirm shortly.");
        })
      }
    >
      {pending ? "Submitting…" : "I have paid"}
    </Button>
  );
}
