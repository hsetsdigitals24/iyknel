import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { canTransition, formatOrderNumber as fmtOrderNum } from "@/lib/order-state";
export { canTransition, formatOrderNumber } from "@/lib/order-state";
import {
  notifyAdminNewOrder,
  notifyAdminOrderEdited,
  notifyAdminPaymentDeclared,
} from "@/lib/mail";
import { formatNaira } from "@/lib/utils";
import { pickVehicleForWeight, logisticsCostKobo } from "@/lib/logistics";
import { uploadInvoicePdf, getSignedFileUrl, SIGNED_URL_EXPIRY } from "@/lib/r2";
import { renderInvoiceToBuffer } from "@/lib/invoice/render";
import {
  bankFromEnv,
  notifyApproved,
  notifyCancelled,
  notifyDelivered,
  notifyDispatched,
  notifyInvoiceIssued,
  notifyPaid,
} from "@/lib/notifications";

async function nextOrderNumber(): Promise<string> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const count = await db.order.count({ where: { submittedAt: { gte: start } } });
  return fmtOrderNum(now.getFullYear(), now.getMonth(), count + 1);
}

export class OrderSubmissionError extends Error {}

export type SubmittedOrder = { id: string; number: string };

/**
 * Submit the user's current cart as an order.
 * - Transactionally snapshots prices/weights, decrements stock (guarded), writes stock movements, clears cart.
 * - Retries up to 3 times on order-number unique-constraint collisions.
 * - Fires admin email + writes AuditLog after commit.
 */
export async function submitOrder(
  userId: string,
  args: { addressId: string; notes?: string | null },
): Promise<SubmittedOrder> {
  const cart = await db.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: true } } },
  });
  if (!cart || cart.items.length === 0) {
    throw new OrderSubmissionError("Your cart is empty.");
  }
  const address = await db.address.findFirst({ where: { id: args.addressId, userId } });
  if (!address) throw new OrderSubmissionError("Pick a delivery address.");

  let subtotalKobo = 0;
  let weightGrams = 0;
  const lines = cart.items.map((it) => {
    const upc = it.product.unitsPerCarton;
    const totalPieces = it.quantityCartons * (upc ?? 0) + it.quantityPieces;
    return { it, upc, totalPieces };
  });
  for (const { it, totalPieces } of lines) {
    if (!it.product.active) {
      throw new OrderSubmissionError(`${it.product.name} is no longer available.`);
    }
    if (it.quantityCartons > it.product.stockCartons) {
      throw new OrderSubmissionError(
        `${it.product.name}: only ${it.product.stockCartons} carton(s) in stock.`,
      );
    }
    if (it.quantityPieces > it.product.stockLoosePieces) {
      throw new OrderSubmissionError(
        `${it.product.name}: only ${it.product.stockLoosePieces} loose piece(s) in stock.`,
      );
    }
    if (totalPieces <= 0) {
      throw new OrderSubmissionError(`${it.product.name}: invalid quantity.`);
    }
    subtotalKobo += it.product.priceKobo * totalPieces;
    weightGrams += it.product.weightGrams * totalPieces;
  }

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1;
    const number = await nextOrderNumber();
    try {
      const order = await db.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            number,
            userId,
            status: "SUBMITTED",
            addressId: address.id,
            notes: args.notes ?? null,
            subtotalKobo,
            totalKobo: subtotalKobo,
            weightGrams,
            items: {
              create: lines.map(({ it, upc, totalPieces }) => ({
                productId: it.product.id,
                nameSnapshot: it.product.name,
                skuSnapshot: it.product.sku,
                priceKoboSnap: it.product.priceKobo,
                weightGramsSnap: it.product.weightGrams,
                quantityCartons: it.quantityCartons,
                quantityPieces: it.quantityPieces,
                unitsPerCartonSnap: upc,
                quantity: totalPieces,
              })),
            },
          },
        });

        // Guarded stock decrement; aborts the tx if anyone raced us.
        for (const { it } of lines) {
          const upd = await tx.product.updateMany({
            where: {
              id: it.product.id,
              stockCartons: { gte: it.quantityCartons },
              stockLoosePieces: { gte: it.quantityPieces },
            },
            data: {
              stockCartons: { decrement: it.quantityCartons },
              stockLoosePieces: { decrement: it.quantityPieces },
            },
          });
          if (upd.count !== 1) {
            throw new OrderSubmissionError(`${it.product.name} sold out before checkout.`);
          }
          await tx.stockMovement.create({
            data: {
              productId: it.product.id,
              deltaCartons: -it.quantityCartons,
              deltaPieces: -it.quantityPieces,
              reason: "ORDER",
              orderId: created.id,
            },
          });
        }

        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        return created;
      });

      // Fire-and-forget side effects after commit.
      void notifyAdminNewOrder(order.number, (await businessName(userId)) ?? "Unknown business").catch(
        (e) => console.error("admin notify failed:", e),
      );
      await db.auditLog.create({
        data: {
          actorId: userId,
          orderId: order.id,
          action: "order.submitted",
          detail: { number: order.number, subtotalKobo, weightGrams },
        },
      });

      return { id: order.id, number: order.number };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002" &&
        attempt < 3
      ) {
        continue; // order number collision — retry
      }
      throw e;
    }
  }
}

async function businessName(userId: string) {
  const b = await db.business.findUnique({ where: { userId } });
  return b?.name ?? null;
}

// State machine + order-number formatter live in lib/order-state.ts so they
// can be unit-tested without dragging in server-only Prisma imports.

async function loadOrderRecipient(userId: string) {
  const [user, business] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.business.findUnique({ where: { userId } }),
  ]);
  if (!user) throw new Error("User not found");
  return {
    email: user.email,
    phone: user.phone,
    name: business?.contactName ?? user.name,
  };
}

export type IssueInvoiceArgs = { distanceBandId: string; tripCountOverride?: number };

export async function issueInvoice(actorId: string, orderId: string, args: IssueInvoiceArgs) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, address: true, invoice: true },
  });
  if (!order) throw new OrderSubmissionError("Order not found.");
  if (order.status === "AWAITING_APPROVAL" && order.invoice?.pdfKey) return order; // idempotent
  if (!canTransition(order.status, "AWAITING_APPROVAL")) {
    throw new OrderSubmissionError("Cannot issue invoice from this state.");
  }
  if (!order.address) throw new OrderSubmissionError("Order has no delivery address.");

  const pick = await pickVehicleForWeight(order.weightGrams);
  if (!pick) throw new OrderSubmissionError("No vehicle configured.");
  const tripCount = args.tripCountOverride ?? pick.tripCount;
  const logisticsKobo = await logisticsCostKobo(pick.vehicleId, args.distanceBandId, tripCount);
  const totalKobo = order.subtotalKobo + logisticsKobo;

  const band = await db.distanceBand.findUnique({ where: { id: args.distanceBandId } });
  if (!band) throw new OrderSubmissionError("Distance band not found.");

  const business = await db.business.findUnique({ where: { userId: order.userId } });
  const user = await db.user.findUnique({ where: { id: order.userId } });
  const buf = await renderInvoiceToBuffer({
    invoiceNumber: `INV-${order.number}`,
    issuedAt: new Date(),
    business: {
      name: business?.name ?? user?.name ?? "Customer",
      contactName: business?.contactName ?? user?.name ?? "",
      phone: business?.phone ?? user?.phone ?? "",
    },
    address: order.address
      ? {
          line1: order.address.line1,
          line2: order.address.line2,
          city: order.address.city,
          state: order.address.state,
        }
      : null,
    items: order.items.map((i) => ({
      nameSnapshot: i.nameSnapshot,
      skuSnapshot: i.skuSnapshot,
      quantity: i.quantity,
      quantityCartons: i.quantityCartons,
      quantityPieces: i.quantityPieces,
      unitsPerCartonSnap: i.unitsPerCartonSnap,
      priceKoboSnap: i.priceKoboSnap,
    })),
    subtotalKobo: order.subtotalKobo,
    logisticsKobo,
    totalKobo,
    weightGrams: order.weightGrams,
    vehicleName: pick.vehicleName,
    bandLabel: band.label,
    tripCount,
    bank: bankFromEnv(),
  });
  const pdfKey = await uploadInvoicePdf(order.number, buf);

  const updated = await db.$transaction(async (tx) => {
    const ord = await tx.order.update({
      where: { id: order.id },
      data: {
        status: "AWAITING_APPROVAL",
        distanceBandId: band.id,
        vehicleId: pick.vehicleId,
        tripCount,
        logisticsKobo,
        totalKobo,
      },
    });
    await tx.invoice.upsert({
      where: { orderId: order.id },
      update: {
        subtotalKobo: order.subtotalKobo,
        logisticsKobo,
        totalKobo,
        pdfKey,
      },
      create: {
        number: `INV-${order.number}`,
        orderId: order.id,
        subtotalKobo: order.subtotalKobo,
        logisticsKobo,
        totalKobo,
        pdfKey,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        orderId: order.id,
        action: "order.invoice_issued",
        detail: {
          distanceBandId: band.id,
          vehicleId: pick.vehicleId,
          logisticsKobo,
          totalKobo,
          tripCount,
          overflow: pick.overflow,
        },
      },
    });
    return ord;
  });

  const recipient = await loadOrderRecipient(order.userId);
  const emailPdfUrl = await getSignedFileUrl(pdfKey, {
    expiresIn: SIGNED_URL_EXPIRY.email,
  });
  await notifyInvoiceIssued(recipient, order.number, emailPdfUrl, totalKobo).catch((e) =>
    console.error("invoice email failed:", e),
  );
  return updated;
}

export async function approveOrder(actorId: string, orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { invoice: true } });
  if (!order) throw new OrderSubmissionError("Order not found.");
  if (order.status === "AWAITING_PAYMENT") return order;
  if (!canTransition(order.status, "AWAITING_PAYMENT")) {
    throw new OrderSubmissionError("Cannot approve from this state.");
  }
  const updated = await db.$transaction(async (tx) => {
    const ord = await tx.order.update({
      where: { id: order.id },
      data: { status: "AWAITING_PAYMENT", approvedAt: new Date() },
    });
    await tx.auditLog.create({
      data: { actorId, orderId: order.id, action: "order.approved" },
    });
    return ord;
  });
  const recipient = await loadOrderRecipient(order.userId);
  const emailPdfUrl = order.invoice?.pdfKey
    ? await getSignedFileUrl(order.invoice.pdfKey, { expiresIn: SIGNED_URL_EXPIRY.email })
    : null;
  await notifyApproved(
    recipient,
    order.number,
    order.totalKobo,
    emailPdfUrl,
    bankFromEnv(),
  ).catch((e) => console.error("approve notify failed:", e));
  return updated;
}

export type MarkPaidArgs = { amountKobo: number; bankRef?: string | null; notes?: string | null };

export async function markPaidByAdmin(actorId: string, orderId: string, args: MarkPaidArgs) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new OrderSubmissionError("Order not found.");
  if (order.status === "PAID") return order;
  if (!canTransition(order.status, "PAID")) {
    throw new OrderSubmissionError("Cannot mark paid from this state.");
  }
  const updated = await db.$transaction(async (tx) => {
    const now = new Date();
    const ord = await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", paidAt: now },
    });
    await tx.invoice.updateMany({
      where: { orderId: order.id },
      data: { status: "PAID", paidAt: now },
    });
    await tx.payment.create({
      data: {
        orderId: order.id,
        amountKobo: args.amountKobo,
        bankRef: args.bankRef || null,
        notes: args.notes || null,
        verifiedAt: now,
        verifiedById: actorId,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        orderId: order.id,
        action: "order.paid",
        detail: { amountKobo: args.amountKobo, bankRef: args.bankRef },
      },
    });
    return ord;
  });
  const recipient = await loadOrderRecipient(order.userId);
  await notifyPaid(recipient, order.number).catch((e) => console.error("paid notify failed:", e));
  return updated;
}

export async function markDispatched(actorId: string, orderId: string, courierNote?: string | null) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new OrderSubmissionError("Order not found.");
  if (order.status === "DISPATCHED") return order;
  if (!canTransition(order.status, "DISPATCHED")) {
    throw new OrderSubmissionError("Cannot dispatch from this state.");
  }
  const updated = await db.$transaction(async (tx) => {
    const ord = await tx.order.update({
      where: { id: order.id },
      data: { status: "DISPATCHED", dispatchedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        orderId: order.id,
        action: "order.dispatched",
        detail: courierNote ? { courierNote } : undefined,
      },
    });
    return ord;
  });
  const recipient = await loadOrderRecipient(order.userId);
  await notifyDispatched(recipient, order.number, courierNote).catch((e) =>
    console.error("dispatch notify failed:", e),
  );
  return updated;
}

export async function markDelivered(actorId: string, orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new OrderSubmissionError("Order not found.");
  if (order.status === "DELIVERED") return order;
  if (!canTransition(order.status, "DELIVERED")) {
    throw new OrderSubmissionError("Cannot mark delivered from this state.");
  }
  const updated = await db.$transaction(async (tx) => {
    const ord = await tx.order.update({
      where: { id: order.id },
      data: { status: "DELIVERED", deliveredAt: new Date() },
    });
    await tx.auditLog.create({
      data: { actorId, orderId: order.id, action: "order.delivered" },
    });
    return ord;
  });
  const recipient = await loadOrderRecipient(order.userId);
  await notifyDelivered(recipient, order.number).catch((e) =>
    console.error("deliver notify failed:", e),
  );
  return updated;
}

export async function cancelOrder(actorId: string, orderId: string, reason: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, invoice: true },
  });
  if (!order) throw new OrderSubmissionError("Order not found.");
  if (order.status === "CANCELLED") return order;
  if (order.status === "DELIVERED") {
    throw new OrderSubmissionError("Delivered orders cannot be cancelled.");
  }
  // Only restock for orders past SUBMITTED (stock was decremented at submission).
  const shouldRestock = order.status !== "DRAFT";
  const updated = await db.$transaction(async (tx) => {
    const ord = await tx.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED", cancelReason: reason },
    });
    if (shouldRestock) {
      for (const it of order.items) {
        await tx.product.update({
          where: { id: it.productId },
          data: {
            stockCartons: { increment: it.quantityCartons },
            stockLoosePieces: { increment: it.quantityPieces },
          },
        });
        await tx.stockMovement.create({
          data: {
            productId: it.productId,
            deltaCartons: it.quantityCartons,
            deltaPieces: it.quantityPieces,
            reason: "RETURN",
            orderId: order.id,
            note: "Order cancelled",
          },
        });
      }
    }
    if (order.invoice) {
      await tx.invoice.update({
        where: { orderId: order.id },
        data: { status: "CANCELLED" },
      });
    }
    await tx.auditLog.create({
      data: {
        actorId,
        orderId: order.id,
        action: "order.cancelled",
        detail: { reason, restocked: shouldRestock },
      },
    });
    return ord;
  });
  const recipient = await loadOrderRecipient(order.userId);
  await notifyCancelled(recipient, order.number, reason).catch((e) =>
    console.error("cancel notify failed:", e),
  );
  return updated;
}

export async function markPaidByCustomer(userId: string, orderId: string) {
  const order = await db.order.findFirst({ where: { id: orderId, userId } });
  if (!order) throw new OrderSubmissionError("Order not found.");
  if (order.status === "PAYMENT_REVIEW") return order; // idempotent
  if (order.status !== "AWAITING_PAYMENT") {
    throw new OrderSubmissionError("Order is not awaiting payment.");
  }
  const updated = await db.order.update({
    where: { id: order.id },
    data: { status: "PAYMENT_REVIEW" },
  });
  await db.auditLog.create({
    data: {
      actorId: userId,
      orderId: order.id,
      action: "order.payment_declared",
    },
  });

  // Fire-and-forget admin notification.
  void (async () => {
    const business = await db.business.findUnique({ where: { userId } });
    return notifyAdminPaymentDeclared(
      order.number,
      business?.name ?? "Unknown business",
      formatNaira(order.totalKobo || order.subtotalKobo),
    );
  })().catch((e) => console.error("payment-declared admin notify failed:", e));

  return updated;
}

const EDITABLE_STATUSES = ["SUBMITTED", "AWAITING_APPROVAL", "AWAITING_PAYMENT"] as const;
const CUSTOMER_CANCELLABLE = [
  "SUBMITTED",
  "AWAITING_APPROVAL",
  "AWAITING_PAYMENT",
  "PAYMENT_REVIEW",
] as const;

export type EditOrderInput = {
  items: { itemId: string; cartons: number; pieces: number }[];
  addressId: string;
  notes: string | null;
};

export async function editOrder(userId: string, orderId: string, input: EditOrderInput) {
  const order = await db.order.findFirst({
    where: { id: orderId, userId },
    include: { items: { include: { product: true } }, invoice: true },
  });
  if (!order) throw new OrderSubmissionError("Order not found.");
  if (!EDITABLE_STATUSES.includes(order.status as (typeof EDITABLE_STATUSES)[number])) {
    throw new OrderSubmissionError("This order can no longer be edited.");
  }

  const address = await db.address.findFirst({ where: { id: input.addressId, userId } });
  if (!address) throw new OrderSubmissionError("Pick a delivery address.");

  // Map: itemId -> new qty (from input, or undefined if user removed/missing).
  const byId = new Map(input.items.map((i) => [i.itemId, i]));

  let itemsChanged = false;
  let subtotalKobo = 0;
  let weightGrams = 0;
  const updates: Array<{
    item: (typeof order.items)[number];
    newCartons: number;
    newPieces: number;
    newTotalPieces: number;
    cartonsDelta: number;
    piecesDelta: number;
    remove: boolean;
  }> = [];

  for (const it of order.items) {
    const next = byId.get(it.id);
    const newCartons = next ? Math.max(0, Math.trunc(next.cartons)) : it.quantityCartons;
    const newPieces = next ? Math.max(0, Math.trunc(next.pieces)) : it.quantityPieces;
    const newTotalPieces = newCartons * (it.unitsPerCartonSnap ?? 0) + newPieces;
    const cartonsDelta = newCartons - it.quantityCartons;
    const piecesDelta = newPieces - it.quantityPieces;
    const remove = newCartons === 0 && newPieces === 0;
    if (remove || cartonsDelta !== 0 || piecesDelta !== 0) itemsChanged = true;
    updates.push({
      item: it,
      newCartons,
      newPieces,
      newTotalPieces,
      cartonsDelta,
      piecesDelta,
      remove,
    });
    if (!remove) {
      subtotalKobo += it.priceKoboSnap * newTotalPieces;
      weightGrams += it.weightGramsSnap * newTotalPieces;
    }
  }

  if (updates.every((u) => u.remove)) {
    throw new OrderSubmissionError(
      "An order needs at least one item. Cancel the order if you don't want anything.",
    );
  }

  const addressChanged = order.addressId !== address.id;
  const notesChanged = (order.notes ?? null) !== (input.notes ?? null);
  const statusReset = itemsChanged && order.status !== "SUBMITTED";

  await db.$transaction(async (tx) => {
    for (const u of updates) {
      if (u.remove) {
        // Restock the full original quantity.
        await tx.orderItem.delete({ where: { id: u.item.id } });
        await tx.product.update({
          where: { id: u.item.productId },
          data: {
            stockCartons: { increment: u.item.quantityCartons },
            stockLoosePieces: { increment: u.item.quantityPieces },
          },
        });
        await tx.stockMovement.create({
          data: {
            productId: u.item.productId,
            deltaCartons: u.item.quantityCartons,
            deltaPieces: u.item.quantityPieces,
            reason: "ADJUSTMENT",
            orderId: order.id,
            note: "Order edited: item removed",
          },
        });
        continue;
      }

      if (u.cartonsDelta === 0 && u.piecesDelta === 0) {
        // Nothing to change for this line.
        continue;
      }

      // Atomic stock guard: ensure increases are decremented from stock,
      // and decreases are returned to stock. Use updateMany so we can also
      // gate on the available-stock conditions for the increase case.
      const decCartons = u.cartonsDelta > 0 ? u.cartonsDelta : 0;
      const decPieces = u.piecesDelta > 0 ? u.piecesDelta : 0;
      const incCartons = u.cartonsDelta < 0 ? -u.cartonsDelta : 0;
      const incPieces = u.piecesDelta < 0 ? -u.piecesDelta : 0;

      if (decCartons > 0 || decPieces > 0) {
        const upd = await tx.product.updateMany({
          where: {
            id: u.item.productId,
            stockCartons: { gte: decCartons },
            stockLoosePieces: { gte: decPieces },
          },
          data: {
            stockCartons: { decrement: decCartons },
            stockLoosePieces: { decrement: decPieces },
          },
        });
        if (upd.count !== 1) {
          throw new OrderSubmissionError(`Insufficient stock for ${u.item.nameSnapshot}.`);
        }
      }
      if (incCartons > 0 || incPieces > 0) {
        await tx.product.update({
          where: { id: u.item.productId },
          data: {
            stockCartons: { increment: incCartons },
            stockLoosePieces: { increment: incPieces },
          },
        });
      }

      await tx.orderItem.update({
        where: { id: u.item.id },
        data: {
          quantityCartons: u.newCartons,
          quantityPieces: u.newPieces,
          quantity: u.newTotalPieces,
        },
      });
      await tx.stockMovement.create({
        data: {
          productId: u.item.productId,
          deltaCartons: -u.cartonsDelta,
          deltaPieces: -u.piecesDelta,
          reason: "ADJUSTMENT",
          orderId: order.id,
          note: "Order edited by customer",
        },
      });
    }

    const orderUpdate: Prisma.OrderUpdateInput = {
      address: { connect: { id: address.id } },
      notes: input.notes ?? null,
      subtotalKobo,
      weightGrams,
    };
    if (statusReset) {
      orderUpdate.status = "SUBMITTED";
      orderUpdate.distanceBand = { disconnect: true };
      orderUpdate.vehicle = { disconnect: true };
      orderUpdate.tripCount = 1;
      orderUpdate.logisticsKobo = 0;
      orderUpdate.totalKobo = subtotalKobo;
    } else {
      orderUpdate.totalKobo = subtotalKobo + order.logisticsKobo;
    }
    await tx.order.update({ where: { id: order.id }, data: orderUpdate });

    if (statusReset && order.invoice) {
      await tx.invoice.update({
        where: { orderId: order.id },
        data: { status: "CANCELLED" },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: userId,
        orderId: order.id,
        action: "order.edited",
        detail: {
          itemsChanged,
          addressChanged,
          notesChanged,
          statusReset,
          removed: updates.filter((u) => u.remove).map((u) => u.item.skuSnapshot),
          changed: updates
            .filter((u) => !u.remove && (u.cartonsDelta !== 0 || u.piecesDelta !== 0))
            .map((u) => ({
              sku: u.item.skuSnapshot,
              cartonsDelta: u.cartonsDelta,
              piecesDelta: u.piecesDelta,
            })),
        },
      },
    });
  });

  if (itemsChanged && statusReset) {
    const business = await db.business.findUnique({ where: { userId } });
    const summary = [
      ...updates
        .filter((u) => u.remove)
        .map((u) => `- removed ${u.item.nameSnapshot} (${u.item.skuSnapshot})`),
      ...updates
        .filter((u) => !u.remove && (u.cartonsDelta !== 0 || u.piecesDelta !== 0))
        .map((u) => {
          const parts: string[] = [];
          if (u.cartonsDelta !== 0)
            parts.push(`${u.cartonsDelta > 0 ? "+" : ""}${u.cartonsDelta} cartons`);
          if (u.piecesDelta !== 0)
            parts.push(`${u.piecesDelta > 0 ? "+" : ""}${u.piecesDelta} pieces`);
          return `- ${u.item.nameSnapshot} (${u.item.skuSnapshot}): ${parts.join(", ")}`;
        }),
    ].join("\n");
    void notifyAdminOrderEdited(
      order.number,
      business?.name ?? "Unknown business",
      `Status reset to SUBMITTED; existing invoice cancelled. Please re-issue with the new logistics.\n\nChanges:\n${summary}`,
    ).catch((e) => console.error("edit admin notify failed:", e));
  }
}

export async function cancelOrderByCustomer(userId: string, orderId: string, reason: string) {
  const order = await db.order.findFirst({ where: { id: orderId, userId } });
  if (!order) throw new OrderSubmissionError("Order not found.");
  if (!CUSTOMER_CANCELLABLE.includes(order.status as (typeof CUSTOMER_CANCELLABLE)[number])) {
    throw new OrderSubmissionError(
      "This order can't be cancelled here. Please contact the back office.",
    );
  }
  return cancelOrder(userId, orderId, `Customer: ${reason}`);
}
