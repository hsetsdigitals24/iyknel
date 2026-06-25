import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSignedFileUrl } from "@/lib/r2";
import { formatNaira } from "@/lib/utils";
import { pickVehicleForWeight } from "@/lib/logistics";
import { OrderStatusPill } from "@/components/order-status-pill";
import { ActionPanel } from "./action-panel";

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const order = await db.order.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      address: true,
      invoice: true,
      vehicle: true,
      distanceBand: true,
      user: { include: { business: true } },
      payments: { orderBy: { declaredAt: "asc" } },
    },
  });
  if (!order) notFound();

  const [bands, auditLogs] = await Promise.all([
    db.distanceBand.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.auditLog.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: true },
    }),
  ]);
  const picked = order.status === "SUBMITTED" ? await pickVehicleForWeight(order.weightGrams) : null;
  const pickedTripCount = picked?.tripCount ?? 1;
  const invoiceUrl = order.invoice?.pdfKey
    ? await getSignedFileUrl(order.invoice.pdfKey)
    : null;

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="text-sm text-muted-foreground hover:text-foreground">
        ← All orders
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Order
          </span>
          <h1 className="font-serif text-3xl">{order.number}</h1>
          <p className="text-sm text-muted-foreground">
            {order.user.business?.name ?? order.user.email}
          </p>
        </div>
        <OrderStatusPill status={order.status} />
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-md border bg-card">
            <header className="border-b px-4 py-3 font-medium">Items</header>
            <ul className="divide-y">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <div className="font-medium">{it.nameSnapshot}</div>
                    <div className="text-xs text-muted-foreground">
                      {it.skuSnapshot} · {formatNaira(it.priceKoboSnap)} / piece ·{" "}
                      {(it.weightGramsSnap / 1000).toFixed(2)} kg / piece
                    </div>
                    <div className="text-xs">
                      {it.quantityCartons > 0 && (
                        <span className="font-medium">
                          {it.quantityCartons} carton{it.quantityCartons === 1 ? "" : "s"}
                          {it.unitsPerCartonSnap != null && (
                            <span className="text-muted-foreground"> ({it.unitsPerCartonSnap}/carton)</span>
                          )}
                        </span>
                      )}
                      {it.quantityCartons > 0 && it.quantityPieces > 0 && " + "}
                      {it.quantityPieces > 0 && (
                        <span className="font-medium">
                          {it.quantityPieces} loose piece{it.quantityPieces === 1 ? "" : "s"}
                        </span>
                      )}
                      <span className="text-muted-foreground"> · {it.quantity} pcs total</span>
                    </div>
                  </div>
                  <div className="tabular-nums">
                    {formatNaira(it.priceKoboSnap * it.quantity)}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {order.address && (
            <section className="rounded-md border bg-card p-4 text-sm">
              <h3 className="mb-2 font-medium">Delivery address</h3>
              <div>{order.address.line1}</div>
              {order.address.line2 && (
                <div className="text-muted-foreground">{order.address.line2}</div>
              )}
              <div className="text-muted-foreground">
                {order.address.city}, {order.address.state}
              </div>
            </section>
          )}

          {order.notes && (
            <section className="rounded-md border bg-card p-4 text-sm">
              <h3 className="mb-1 font-medium">Notes</h3>
              <p className="text-muted-foreground">{order.notes}</p>
            </section>
          )}

          {order.payments.length > 0 && (
            <section className="rounded-md border bg-card">
              <header className="border-b px-4 py-3 font-medium">Payments</header>
              <ul className="divide-y text-sm">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="font-medium tabular-nums">{formatNaira(p.amountKobo)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {p.bankRef ? <>Bank ref: <span className="font-mono">{p.bankRef}</span></> : "No bank reference recorded"}
                      </p>
                      {p.notes && (
                        <p className="mt-1 text-xs text-muted-foreground">Notes: {p.notes}</p>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>
                        Declared{" "}
                        {p.declaredAt.toLocaleString("en-NG", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                      {p.verifiedAt && (
                        <p className="text-success">
                          Verified{" "}
                          {p.verifiedAt.toLocaleString("en-NG", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-md border bg-card">
            <header className="border-b px-4 py-3 font-medium">Audit log</header>
            {auditLogs.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">No events yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {auditLogs.map((a) => (
                  <li key={a.id} className="flex justify-between gap-3 px-4 py-2">
                    <span>{a.action.replace(/^order\./, "").replace(/_/g, " ")}</span>
                    <span className="text-xs text-muted-foreground">
                      {a.actor?.email ?? "system"} ·{" "}
                      {a.createdAt.toLocaleString("en-NG", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="h-fit space-y-5 rounded-md border bg-card p-5">
          <h2 className="font-serif text-xl">Summary</h2>
          <Row label="Subtotal" value={formatNaira(order.subtotalKobo)} />
          <Row
            label="Logistics"
            value={order.logisticsKobo > 0 ? formatNaira(order.logisticsKobo) : "—"}
          />
          <Row label="Weight" value={`${(order.weightGrams / 1000).toFixed(2)} kg`} />
          {order.vehicle && order.distanceBand && (
            <Row
              label="Route"
              value={`${order.vehicle.name} · ${order.distanceBand.label}${order.tripCount > 1 ? ` · ${order.tripCount} trips` : ""}`}
            />
          )}
          <Row
            label="Total"
            value={formatNaira(order.totalKobo || order.subtotalKobo)}
            bold
          />
          {invoiceUrl && (
            <a
              href={invoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-sm underline-offset-4 hover:underline"
            >
              View invoice PDF →
            </a>
          )}

          <div className="border-t pt-4">
            <ActionPanel
              orderId={order.id}
              status={order.status}
              totalKobo={order.totalKobo || order.subtotalKobo}
              bands={bands.map((b) => ({ id: b.id, label: b.label }))}
              pickedVehicle={picked?.vehicleName ?? null}
              pickedCostNaira={null}
              pickedTripCount={pickedTripCount}
              overflow={picked?.overflow ?? false}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between text-sm ${bold ? "font-medium" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
