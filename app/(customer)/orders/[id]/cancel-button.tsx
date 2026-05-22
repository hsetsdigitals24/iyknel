"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cancelOrderByCustomerAction } from "@/app/(customer)/orders/actions";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  function onConfirm() {
    if (reason.trim().length < 2) {
      toast.error("Tell us why so the back office can follow up.");
      return;
    }
    start(async () => {
      const res = await cancelOrderByCustomerAction(orderId, reason.trim());
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Order cancelled.");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="w-full text-muted-foreground hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <XCircle className="mr-2 h-4 w-4" />
        Cancel order
      </Button>
    );
  }
  return (
    <div className="space-y-2 rounded-lg border bg-surface-muted p-3 text-sm">
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Reason
      </label>
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.currentTarget.value)}
        rows={2}
        maxLength={500}
        placeholder="e.g. wrong items, found cheaper supplier, no longer needed"
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={onConfirm}
        >
          {pending ? "Cancelling…" : "Confirm cancel"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          Keep order
        </Button>
      </div>
    </div>
  );
}
