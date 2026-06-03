import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireCustomer } from "@/lib/session";
import { db } from "@/lib/db";
import { resolveImage } from "@/lib/r2";
import { OrderEditForm } from "./edit-form";

const EDITABLE = new Set(["SUBMITTED", "AWAITING_APPROVAL", "AWAITING_PAYMENT"]);

export default async function EditOrderPage({ params }: { params: { id: string } }) {
  const session = await requireCustomer();
  const order = await db.order.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      items: { include: { product: true } },
      invoice: true,
      address: true,
    },
  });
  if (!order) notFound();
  if (!EDITABLE.has(order.status)) {
    redirect(`/orders/${order.id}`);
  }
  const addresses = await db.address.findMany({
    where: { userId: session.user.id },
    orderBy: { isDefault: "desc" },
  });

  const itemImages = await Promise.all(
    order.items.map((it) => resolveImage(it.product.images[0])),
  );

  return (
    <div className="space-y-6">
      <nav className="text-xs text-muted-foreground">
        <Link href={`/orders/${order.id}`} className="hover:text-foreground">
          {order.number}
        </Link>
        <span> / </span>
        <span className="text-foreground">Edit</span>
      </nav>
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">
          Edit order {order.number}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Adjust quantities, change your delivery address, or update notes.
        </p>
      </header>

      <OrderEditForm
        orderId={order.id}
        status={order.status}
        invoiceIssued={!!order.invoice && order.invoice.status !== "CANCELLED"}
        addressId={order.addressId ?? ""}
        notes={order.notes ?? ""}
        items={order.items.map((it, idx) => ({
          itemId: it.id,
          name: it.nameSnapshot,
          sku: it.skuSnapshot,
          image: itemImages[idx] ?? null,
          priceKoboSnap: it.priceKoboSnap,
          weightGramsSnap: it.weightGramsSnap,
          unitsPerCartonSnap: it.unitsPerCartonSnap,
          quantityCartons: it.quantityCartons,
          quantityPieces: it.quantityPieces,
          stockCartonsAvailable: it.product.stockCartons,
          stockLoosePiecesAvailable: it.product.stockLoosePieces,
        }))}
        addresses={addresses.map((a) => ({
          id: a.id,
          label: a.label,
          line1: a.line1,
          line2: a.line2,
          city: a.city,
          state: a.state,
        }))}
      />
    </div>
  );
}
