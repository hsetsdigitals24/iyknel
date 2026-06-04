"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, Minus, Plus, PackagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatNaira } from "@/lib/utils";
import {
  addAddressAction,
  editOrderAction,
  restoreOrderToCartAction,
} from "@/app/(customer)/orders/actions";

type ItemInput = {
  itemId: string;
  name: string;
  sku: string;
  image: string | null;
  priceKoboSnap: number;
  weightGramsSnap: number;
  unitsPerCartonSnap: number | null;
  quantityCartons: number;
  quantityPieces: number;
  // Spare stock currently available to grow into (excluding what this order
  // already reserves — the engine handles deltas).
  stockCartonsAvailable: number;
  stockLoosePiecesAvailable: number;
};

type AddressInput = {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
};

type LineState = {
  itemId: string;
  cartons: number;
  pieces: number;
};

type Props = {
  orderId: string;
  status: string;
  invoiceIssued: boolean;
  addressId: string;
  notes: string;
  items: ItemInput[];
  addresses: AddressInput[];
};

export function OrderEditForm({
  orderId,
  status,
  invoiceIssued,
  addressId: initialAddressId,
  notes: initialNotes,
  items,
  addresses,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [addMorePending, startAddMore] = useTransition();
  const [addAddressPending, startAddAddress] = useTransition();
  const [lines, setLines] = useState<LineState[]>(
    items.map((it) => ({
      itemId: it.itemId,
      cartons: it.quantityCartons,
      pieces: it.quantityPieces,
    })),
  );
  const [addressList, setAddressList] = useState<AddressInput[]>(addresses);
  const [addressId, setAddressId] = useState(initialAddressId);
  const [notes, setNotes] = useState(initialNotes);
  const [showNewAddress, setShowNewAddress] = useState(false);

  function onAddMore() {
    if (
      !window.confirm(
        "This will move every item in this order back to your cart and cancel the order so you can rebuild it. Continue?",
      )
    ) {
      return;
    }
    startAddMore(async () => {
      const res = await restoreOrderToCartAction(orderId);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      if (res.skipped.length > 0) {
        toast.success(
          `Restored ${res.restored} item${res.restored === 1 ? "" : "s"} to your cart. ${res.skipped.length} skipped — see your cart.`,
        );
      } else {
        toast.success(`Restored ${res.restored} item${res.restored === 1 ? "" : "s"} to your cart.`);
      }
      router.push("/cart");
      router.refresh();
    });
  }

  function onAddAddress(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      line1: String(fd.get("line1") ?? ""),
      line2: String(fd.get("line2") ?? ""),
      city: String(fd.get("city") ?? ""),
      state: String(fd.get("state") ?? ""),
      label: String(fd.get("label") ?? ""),
    };
    startAddAddress(async () => {
      const res = await addAddressAction(input);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      const newAddr: AddressInput = {
        id: res.addressId,
        label: input.label || null,
        line1: input.line1,
        line2: input.line2 || null,
        city: input.city,
        state: input.state,
      };
      setAddressList((prev) => [...prev, newAddr]);
      setAddressId(res.addressId);
      setShowNewAddress(false);
      toast.success("Address added.");
    });
  }

  const itemsChanged = lines.some((l) => {
    const it = items.find((i) => i.itemId === l.itemId)!;
    return l.cartons !== it.quantityCartons || l.pieces !== it.quantityPieces;
  });
  const willResetStatus = itemsChanged && status !== "SUBMITTED";

  const totals = items.reduce(
    (acc, it) => {
      const l = lines.find((ln) => ln.itemId === it.itemId)!;
      const totalPieces = l.cartons * (it.unitsPerCartonSnap ?? 0) + l.pieces;
      acc.subtotalKobo += totalPieces * it.priceKoboSnap;
      acc.weightGrams += totalPieces * it.weightGramsSnap;
      acc.pieces += totalPieces;
      return acc;
    },
    { subtotalKobo: 0, weightGrams: 0, pieces: 0 },
  );

  const allEmpty = lines.every((l) => l.cartons === 0 && l.pieces === 0);

  function setLine(itemId: string, next: Partial<LineState>) {
    setLines((prev) =>
      prev.map((l) => (l.itemId === itemId ? { ...l, ...next } : l)),
    );
  }

  function onSave() {
    if (allEmpty) {
      toast.error("Cancel the order instead of removing every item.");
      return;
    }
    start(async () => {
      const res = await editOrderAction(orderId, {
        addressId,
        notes: notes.trim() || null,
        items: lines,
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(
        willResetStatus
          ? "Saved. Order returned to the back office for re-pricing."
          : "Order updated.",
      );
      router.push(`/orders/${orderId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {invoiceIssued && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <p className="font-medium">Heads up</p>
            <p className="text-muted-foreground">
              Changing quantities will reset this order to <em>Submitted</em> and ask the back
              office to re-issue the invoice with new logistics. Address and notes changes don&apos;t
              touch the invoice.
            </p>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border bg-card">
        <header className="border-b bg-surface-muted px-5 py-3 text-sm font-semibold uppercase tracking-wider">
          Items
        </header>
        <ul className="divide-y">
          {items.map((it) => {
            const line = lines.find((l) => l.itemId === it.itemId)!;
            const totalPieces =
              line.cartons * (it.unitsPerCartonSnap ?? 0) + line.pieces;
            const canCartons = it.unitsPerCartonSnap != null;
            const maxCartons = it.quantityCartons + it.stockCartonsAvailable;
            const maxPieces = it.quantityPieces + it.stockLoosePiecesAvailable;
            const removed = line.cartons === 0 && line.pieces === 0;
            return (
              <li key={it.itemId} className={`p-4 sm:p-5 ${removed ? "opacity-60" : ""}`}>
                <div className="flex gap-4">
                  <div className="relative aspect-square h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-surface-muted">
                    {it.image && (
                      <Image
                        src={it.image}
                        alt={it.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium leading-snug">{it.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {it.sku} · {formatNaira(it.priceKoboSnap)} per piece
                          {canCartons && <> · 1 carton = {it.unitsPerCartonSnap} pcs</>}
                        </p>
                      </div>
                      <p className="shrink-0 text-base font-bold tabular-nums text-primary">
                        {formatNaira(totalPieces * it.priceKoboSnap)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {canCartons && (
                        <Stepper
                          label="Cartons"
                          value={line.cartons}
                          max={maxCartons}
                          disabled={pending}
                          onChange={(n) => setLine(it.itemId, { cartons: n })}
                        />
                      )}
                      <Stepper
                        label="Pieces"
                        value={line.pieces}
                        max={maxPieces}
                        disabled={pending}
                        onChange={(n) => setLine(it.itemId, { pieces: n })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending || removed}
                        onClick={() => setLine(it.itemId, { cartons: 0, pieces: 0 })}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        {removed ? "Will be removed" : "Remove"}
                      </Button>
                    </div>
                    {removed ? (
                      <p className="text-xs text-destructive">
                        This line will be removed when you save.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {totalPieces} pcs total
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Delivery address</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowNewAddress((v) => !v)}
            className="text-primary hover:text-primary"
          >
            {showNewAddress ? "Cancel" : "+ Add new address"}
          </Button>
        </div>
        {addressList.length === 0 && !showNewAddress ? (
          <p className="text-sm text-muted-foreground">
            You don&apos;t have any saved addresses yet. Use <em>+ Add new address</em> above.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {addressList.map((a) => (
              <label
                key={a.id}
                className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${
                  addressId === a.id
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/40"
                }`}
              >
                <input
                  type="radio"
                  name="addressId"
                  checked={addressId === a.id}
                  onChange={() => setAddressId(a.id)}
                  className="mt-0.5"
                />
                <div>
                  {a.label && (
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                      {a.label}
                    </p>
                  )}
                  <p className="font-medium leading-snug">{a.line1}</p>
                  {a.line2 && (
                    <p className="text-xs text-muted-foreground">{a.line2}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {a.city}, {a.state}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}

        {showNewAddress && (
          <form onSubmit={onAddAddress} className="mt-4 space-y-3 rounded-lg border bg-surface-muted/40 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="line1">Address line 1</Label>
                <Input id="line1" name="line1" required />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="line2">Address line 2 (optional)</Label>
                <Input id="line2" name="line2" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" required />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="label">Label (optional)</Label>
                <Input id="label" name="label" placeholder="e.g. Warehouse, Shop, Branch B" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={addAddressPending}>
                {addAddressPending ? "Saving…" : "Save address"}
              </Button>
            </div>
          </form>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider">Notes</h2>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          rows={3}
          maxLength={1000}
          placeholder="Anything the back office should know about delivery or payment."
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5">
        <div className="text-sm">
          <p className="text-muted-foreground">
            {totals.pieces} pcs · {(totals.weightGrams / 1000).toFixed(2)} kg
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-primary">
            {formatNaira(totals.subtotalKobo)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            + logistics, set by the back office.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="ghost">
            <a href={`/orders/${orderId}`}>Cancel</a>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={addMorePending || pending}
            onClick={onAddMore}
            title="Move every item back to your cart and cancel this order so you can add more products and re-submit."
          >
            <PackagePlus className="mr-2 h-4 w-4" />
            {addMorePending ? "Restoring…" : "Add more items"}
          </Button>
          <Button
            type="button"
            size="lg"
            className="rounded-full"
            disabled={pending || allEmpty || !addressId}
            onClick={onSave}
          >
            {pending ? "Saving…" : willResetStatus ? "Save & re-submit" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  disabled?: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="inline-flex items-center rounded-full border bg-background">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          disabled={disabled || value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <input
          type="number"
          min={0}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const n = Number(e.currentTarget.value);
            if (Number.isFinite(n)) onChange(Math.max(0, Math.min(max, Math.trunc(n))));
          }}
          className="w-12 bg-transparent text-center text-sm font-medium tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          disabled={disabled || value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">max {max}</p>
    </div>
  );
}
