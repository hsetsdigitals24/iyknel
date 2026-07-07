import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  Check,
  CreditCard,
  Download,
  MapPin,
  Pencil,
  Receipt,
  StickyNote,
} from "lucide-react";

import { requireCustomer } from "@/lib/session";
import { db } from "@/lib/db";
import { getSignedFileUrl } from "@/lib/r2";
import { formatNaira } from "@/lib/utils";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { OrderReviewPanel } from "@/components/order-review-panel";
import { IPaidButton } from "./i-paid-button";
import { CancelOrderButton } from "./cancel-button";

const EDITABLE_STATUSES = new Set(["SUBMITTED", "AWAITING_APPROVAL", "AWAITING_PAYMENT"]);
const CUSTOMER_CANCELLABLE = new Set([
  "SUBMITTED",
  "AWAITING_APPROVAL",
  "AWAITING_PAYMENT",
  "PAYMENT_REVIEW",
]);

const TIMELINE_STEPS: { key: string; label: string }[] = [
  { key: "SUBMITTED", label: "Submitted" },
  { key: "AWAITING_APPROVAL", label: "Awaiting approval" },
  { key: "AWAITING_PAYMENT", label: "Awaiting payment" },
  { key: "PAYMENT_REVIEW", label: "Payment review" },
  { key: "PAID", label: "Paid" },
  { key: "DISPATCHED", label: "Dispatched" },
  { key: "DELIVERED", label: "Delivered" },
];

function stepIndex(status: string): number {
  const i = TIMELINE_STEPS.findIndex((s) => s.key === status);
  return i < 0 ? 0 : i;
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const session = await requireCustomer();
  const order = await db.order.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      items: { include: { product: { select: { slug: true } } } },
      address: true,
      invoice: true,
      vehicle: true,
      distanceBand: true,
      payments: { orderBy: { declaredAt: "asc" } },
    },
  });
  if (!order) notFound();

  let reviewItems: { productId: string; productSlug: string; productName: string; existingRating?: number; existingBody?: string | null }[] = [];
  if (order.status === "DELIVERED") {
    const productIds = Array.from(new Set(order.items.map((i) => i.productId)));
    const existing = await db.review.findMany({
      where: { userId: session.user.id, productId: { in: productIds } },
      select: { productId: true, rating: true, body: true },
    });
    const byProduct = new Map(existing.map((r) => [r.productId, r]));
    const seen = new Set<string>();
    for (const item of order.items) {
      if (seen.has(item.productId)) continue;
      seen.add(item.productId);
      const ex = byProduct.get(item.productId);
      reviewItems.push({
        productId: item.productId,
        productSlug: item.product.slug,
        productName: item.nameSnapshot,
        existingRating: ex?.rating,
        existingBody: ex?.body ?? null,
      });
    }
  }

  const showBank = order.status === "AWAITING_PAYMENT" || order.status === "PAYMENT_REVIEW";
  const cancelled = order.status === "CANCELLED";
  const currentStep = stepIndex(order.status);
  const canEdit = EDITABLE_STATUSES.has(order.status);
  const canCancel = CUSTOMER_CANCELLABLE.has(order.status);
  const invoiceUrl = order.invoice?.pdfKey
    ? await getSignedFileUrl(order.invoice.pdfKey)
    : null;

  return (
    <div className="space-y-6">
      <nav className="text-xs text-muted-foreground">
        <Link href="/orders" className="hover:text-foreground">Orders</Link>
        <span> / </span>
        <span className="text-foreground">{order.number}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border bg-card p-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Order
          </span>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
            {order.number}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submitted{" "}
            {order.submittedAt.toLocaleDateString("en-NG", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <StatusPill status={order.status} className="text-sm" />
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {!cancelled && (
            <section className="rounded-2xl border bg-card p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Order timeline
              </h2>
              <ol className="space-y-3">
                {TIMELINE_STEPS.map((step, i) => {
                  const done = i <= currentStep;
                  const active = i === currentStep;
                  return (
                    <li key={step.key} className="flex items-center gap-3">
                      <span
                        className={
                          done
                            ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                            : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground"
                        }
                      >
                        {done && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span
                        className={
                          active
                            ? "text-sm font-semibold"
                            : done
                            ? "text-sm text-muted-foreground"
                            : "text-sm text-muted-foreground/70"
                        }
                      >
                        {step.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          <section className="overflow-hidden rounded-2xl border bg-card">
            <header className="flex items-center gap-2 border-b bg-surface-muted px-5 py-3">
              <Receipt className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">Items</h2>
            </header>
            <ul className="divide-y">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-start justify-between gap-4 px-5 py-4 text-sm">
                  <div>
                    <div className="font-medium">{it.nameSnapshot}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {it.skuSnapshot} · {formatNaira(it.priceKoboSnap)} / pack
                    </div>
                    <div className="mt-0.5 text-xs">
                      {it.quantityCartons > 0 && (
                        <>
                          <span className="font-medium">
                            {it.quantityCartons} carton{it.quantityCartons === 1 ? "" : "s"}
                          </span>
                          {it.unitsPerCartonSnap != null && (
                            <span className="text-muted-foreground"> ({it.unitsPerCartonSnap}/carton)</span>
                          )}
                        </>
                      )}
                      {it.quantityCartons > 0 && it.quantityPacks > 0 && " + "}
                      {it.quantityPacks > 0 && (
                        <span className="font-medium">
                          {it.quantityPacks} loose pack{it.quantityPacks === 1 ? "" : "s"}
                        </span>
                      )}
                      <span className="text-muted-foreground"> · {it.quantity} packs total</span>
                    </div>
                  </div>
                  <div className="shrink-0 font-medium tabular-nums">
                    {formatNaira(it.priceKoboSnap * it.quantity)}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {reviewItems.length > 0 && <OrderReviewPanel items={reviewItems} />}

          {order.address && (
            <section className="rounded-2xl border bg-card p-5 text-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                Delivery address
              </h3>
              <div className="font-medium">{order.address.line1}</div>
              {order.address.line2 && (
                <div className="text-muted-foreground">{order.address.line2}</div>
              )}
              <div className="text-muted-foreground">
                {order.address.city}, {order.address.state}
              </div>
            </section>
          )}

          {order.notes && (
            <section className="rounded-2xl border bg-card p-5 text-sm">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <StickyNote className="h-4 w-4 text-primary" />
                Notes
              </h3>
              <p className="text-muted-foreground">{order.notes}</p>
            </section>
          )}

          {order.payments.length > 0 && (
            <section className="overflow-hidden rounded-2xl border bg-card">
              <header className="flex items-center gap-2 border-b bg-surface-muted px-5 py-3">
                <CreditCard className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider">Payments</h2>
              </header>
              <ul className="divide-y">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 text-sm">
                    <div>
                      <p className="font-medium tabular-nums">{formatNaira(p.amountKobo)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {p.bankRef ? <>Ref: <span className="font-mono">{p.bankRef}</span></> : "No bank reference"}
                      </p>
                      {p.notes && (
                        <p className="mt-1 text-xs text-muted-foreground">{p.notes}</p>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {p.verifiedAt ? (
                        <>
                          <p className="font-medium text-success">Verified</p>
                          <p>
                            {p.verifiedAt.toLocaleDateString("en-NG", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </>
                      ) : (
                        <p>
                          Declared{" "}
                          {p.declaredAt.toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <h2 className="font-serif text-xl font-semibold">Summary</h2>
            <dl className="space-y-1.5 text-sm">
              <Row label="Subtotal" value={formatNaira(order.subtotalKobo)} />
              <Row
                label="Logistics"
                value={
                  order.logisticsKobo > 0 ? formatNaira(order.logisticsKobo) : "Set by admin"
                }
              />
            </dl>
            <div className="border-t pt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">Total</span>
                <span className="text-2xl font-bold tabular-nums text-primary">
                  {formatNaira(order.totalKobo || order.subtotalKobo)}
                </span>
              </div>
            </div>

            {invoiceUrl ? (
              <Button asChild variant="outline" className="w-full rounded-full">
                <a href={invoiceUrl} target="_blank" rel="noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Download invoice
                </a>
              </Button>
            ) : (
              <p className="rounded-lg bg-surface-muted p-3 text-xs text-muted-foreground">
                Invoice will appear here once issued by the back office.
              </p>
            )}

            {showBank && <BankBlock />}

            {order.status === "AWAITING_PAYMENT" && <IPaidButton orderId={order.id} />}

            {(canEdit || canCancel) && (
              <div className="space-y-2 border-t pt-4">
                {canEdit && (
                  <Button asChild variant="outline" className="w-full rounded-full">
                    <Link href={`/orders/${order.id}/edit`}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit order
                    </Link>
                  </Button>
                )}
                {canCancel && <CancelOrderButton orderId={order.id} />}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function BankBlock() {
  const bank = process.env.BANK_NAME;
  const name = process.env.BANK_ACCOUNT_NAME;
  const number = process.env.BANK_ACCOUNT_NUMBER;
  if (!bank || !name || !number) {
    return (
      <p className="rounded-lg bg-surface-muted p-3 text-xs text-muted-foreground">
        Bank details will be sent in your invoice email.
      </p>
    );
  }
  return (
    <div className="space-y-1.5 rounded-lg border-2 border-primary/30 bg-primary/5 p-4 text-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
        <Building2 className="h-3.5 w-3.5" />
        Pay by transfer
      </div>
      <div className="font-semibold">{bank}</div>
      <div className="text-muted-foreground">{name}</div>
      <div className="rounded bg-background px-2 py-1 font-mono text-base font-bold tabular-nums">
        {number}
      </div>
    </div>
  );
}
