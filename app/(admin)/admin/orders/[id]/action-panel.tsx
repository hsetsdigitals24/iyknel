"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { toast } from "sonner";
import type { OrderStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  approveOrderAction,
  cancelOrderAction,
  issueInvoiceAction,
  markDeliveredAction,
  markDispatchedAction,
  markPaidAction,
  updateLogisticsFeeAction,
} from "../actions";
import type { FormState } from "@/lib/validation";

type Band = { id: string; label: string };

export function ActionPanel({
  orderId,
  status,
  totalKobo,
  bands,
  pickedVehicle,
  bandBaseCostNaira,
  pickedTripCount,
  overflow,
  currentLogisticsNaira,
}: {
  orderId: string;
  status: OrderStatus;
  totalKobo: number;
  bands: Band[];
  pickedVehicle: string | null;
  bandBaseCostNaira: Record<string, number>;
  pickedTripCount: number;
  overflow: boolean;
  currentLogisticsNaira: number;
}) {
  switch (status) {
    case "SUBMITTED":
      return (
        <IssuePanel
          orderId={orderId}
          bands={bands}
          pickedVehicle={pickedVehicle}
          bandBaseCostNaira={bandBaseCostNaira}
          pickedTripCount={pickedTripCount}
          overflow={overflow}
        />
      );
    case "AWAITING_APPROVAL":
      return <ApprovePanel orderId={orderId} currentLogisticsNaira={currentLogisticsNaira} />;
    case "AWAITING_PAYMENT":
      return (
        <CancelPanel
          orderId={orderId}
          note="Awaiting customer payment."
          currentLogisticsNaira={currentLogisticsNaira}
        />
      );
    case "PAYMENT_REVIEW":
      return <MarkPaidPanel orderId={orderId} totalKobo={totalKobo} />;
    case "PAID":
      return <DispatchPanel orderId={orderId} />;
    case "DISPATCHED":
      return <DeliverPanel orderId={orderId} />;
    case "DELIVERED":
      return <p className="text-sm text-muted-foreground">Delivered — no further actions.</p>;
    case "CANCELLED":
      return <p className="text-sm text-muted-foreground">Cancelled — no further actions.</p>;
    default:
      return null;
  }
}

function IssuePanel({
  orderId,
  bands,
  pickedVehicle,
  bandBaseCostNaira,
  pickedTripCount,
  overflow,
}: {
  orderId: string;
  bands: Band[];
  pickedVehicle: string | null;
  bandBaseCostNaira: Record<string, number>;
  pickedTripCount: number;
  overflow: boolean;
}) {
  const action = issueInvoiceAction.bind(null, orderId);
  const [state, formAction] = useFormState<FormState, FormData>(action, null);
  const [bandId, setBandId] = useState("");
  const [trips, setTrips] = useState(pickedTripCount);
  const [fee, setFee] = useState("");

  // Prefill the fee from the matrix (base cost × trips) whenever the band or
  // trip count changes; the admin can then overtype a custom amount.
  function prefillFee(nextBandId: string, nextTrips: number) {
    const base = bandBaseCostNaira[nextBandId];
    setFee(base != null ? String(base * nextTrips) : "");
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="distanceBandId">Distance band</Label>
        <select
          id="distanceBandId"
          name="distanceBandId"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          required
          value={bandId}
          onChange={(e) => {
            setBandId(e.target.value);
            prefillFee(e.target.value, trips);
          }}
        >
          <option value="">Select…</option>
          {bands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="tripCount">Trips</Label>
        <Input
          id="tripCount"
          name="tripCount"
          type="number"
          min={1}
          max={10}
          value={trips}
          onChange={(e) => {
            const n = Number(e.target.value) || 1;
            setTrips(n);
            prefillFee(bandId, n);
          }}
        />
        <p className="text-xs text-muted-foreground">
          {overflow
            ? `Overflow — auto-picked ${pickedTripCount} trips. Override if you'll split differently.`
            : "Usually 1. Override only if you'll split the delivery."}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="logisticsNaira">Logistics fee (₦)</Label>
        <Input
          id="logisticsNaira"
          name="logisticsNaira"
          type="number"
          min={0}
          step="0.01"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          placeholder="Pick a band to prefill"
        />
        <p className="text-xs text-muted-foreground">
          Prefilled from the rate matrix — edit for a one-off adjustment.
        </p>
      </div>
      <div className="rounded-md border bg-secondary/40 p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Auto-selected vehicle</span>
          <span>{pickedVehicle ?? "—"}</span>
        </div>
      </div>
      {state && !state.ok && <p className="text-sm text-destructive">{state.message}</p>}
      <SubmitButton label="Issue invoice" pendingLabel="Issuing…" />
      <CancelInline orderId={orderId} />
    </form>
  );
}

function ApprovePanel({
  orderId,
  currentLogisticsNaira,
}: {
  orderId: string;
  currentLogisticsNaira: number;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Invoice issued. Approving will email + SMS the customer with bank details.
      </p>
      <ApproveButton orderId={orderId} />
      <AdjustFeeInline orderId={orderId} currentLogisticsNaira={currentLogisticsNaira} />
      <CancelInline orderId={orderId} />
    </div>
  );
}

function ApproveButton({ orderId }: { orderId: string }) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      className="w-full"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const res = await approveOrderAction(orderId);
        setPending(false);
        if (res && !res.ok) toast.error(res.message);
        else toast.success("Customer notified.");
      }}
    >
      {pending ? "Notifying…" : "Approve & notify customer"}
    </Button>
  );
}

function CancelPanel({
  orderId,
  note,
  currentLogisticsNaira,
}: {
  orderId: string;
  note: string;
  currentLogisticsNaira?: number;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{note}</p>
      {currentLogisticsNaira != null && (
        <AdjustFeeInline orderId={orderId} currentLogisticsNaira={currentLogisticsNaira} />
      )}
      <CancelInline orderId={orderId} />
    </div>
  );
}

function AdjustFeeInline({
  orderId,
  currentLogisticsNaira,
}: {
  orderId: string;
  currentLogisticsNaira: number;
}) {
  const [open, setOpen] = useState(false);
  const action = updateLogisticsFeeAction.bind(null, orderId);
  const [state, formAction] = useFormState<FormState, FormData>(action, null);
  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        Adjust logistics fee
      </Button>
    );
  }
  return (
    <form action={formAction} className="space-y-2 border-t pt-3">
      <Label htmlFor="logisticsNaira">Logistics fee (₦)</Label>
      <Input
        id="logisticsNaira"
        name="logisticsNaira"
        type="number"
        min={0}
        step="0.01"
        defaultValue={currentLogisticsNaira}
        required
      />
      <p className="text-xs text-muted-foreground">
        Saving regenerates the invoice PDF and re-notifies the customer of the new total.
      </p>
      {state && !state.ok && <p className="text-sm text-destructive">{state.message}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Save fee
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Back
        </Button>
      </div>
    </form>
  );
}

function MarkPaidPanel({ orderId, totalKobo }: { orderId: string; totalKobo: number }) {
  const action = markPaidAction.bind(null, orderId);
  const [state, formAction] = useFormState<FormState, FormData>(action, null);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={formAction} className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Customer says they&apos;ve paid. Confirm the bank transfer below.
      </p>
      <div className="space-y-2">
        <Label htmlFor="amountKobo">Amount received (kobo)</Label>
        <Input
          id="amountKobo"
          name="amountKobo"
          type="number"
          min={0}
          defaultValue={totalKobo}
          required
          aria-invalid={!!fieldErrors?.amountKobo}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bankRef">Bank reference</Label>
        <Input id="bankRef" name="bankRef" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      {state && !state.ok && <p className="text-sm text-destructive">{state.message}</p>}
      <SubmitButton label="Mark paid" pendingLabel="Confirming…" />
      <CancelInline orderId={orderId} />
    </form>
  );
}

function DispatchPanel({ orderId }: { orderId: string }) {
  const action = markDispatchedAction.bind(null, orderId);
  const [state, formAction] = useFormState<FormState, FormData>(action, null);
  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="courierNote">Courier note (optional)</Label>
        <Input id="courierNote" name="courierNote" placeholder="e.g. GIG Logistics, tomorrow" />
      </div>
      {state && !state.ok && <p className="text-sm text-destructive">{state.message}</p>}
      <SubmitButton label="Mark dispatched" pendingLabel="Saving…" />
    </form>
  );
}

function DeliverPanel({ orderId }: { orderId: string }) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      className="w-full"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const res = await markDeliveredAction(orderId);
        setPending(false);
        if (res && !res.ok) toast.error(res.message);
        else toast.success("Marked delivered.");
      }}
    >
      {pending ? "Saving…" : "Mark delivered"}
    </Button>
  );
}

function CancelInline({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const action = cancelOrderAction.bind(null, orderId);
  const [state, formAction] = useFormState<FormState, FormData>(action, null);
  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setOpen(true)}>
        Cancel order
      </Button>
    );
  }
  return (
    <form action={formAction} className="space-y-2 border-t pt-3">
      <Label htmlFor="reason">Reason</Label>
      <Textarea id="reason" name="reason" rows={2} required />
      {state && !state.ok && <p className="text-sm text-destructive">{state.message}</p>}
      <div className="flex gap-2">
        <Button type="submit" variant="destructive" size="sm">
          Confirm cancel
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Back
        </Button>
      </div>
    </form>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}
