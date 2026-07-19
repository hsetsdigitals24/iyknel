import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { canTransition, formatOrderNumber as fmtOrderNum } from "@/lib/order-state";
export { canTransition, formatOrderNumber } from "@/lib/order-state";
import {
  notifyAdminNewOrder,
  notifyAdminOrderEdited,
  notifyAdminOrderUpdate,
  notifyAdminPaymentDeclared,
} from "@/lib/mail";
import { sendOrderStatusSms } from "@/lib/sms";
import { formatNaira } from "@/lib/utils";

// Optional admin SMS alert; no-ops when ADMIN_NOTIFY_PHONE is unset.
async function notifyAdminSms(message: string) {
  const to = process.env.ADMIN_NOTIFY_PHONE;
  if (!to) return;
  await sendOrderStatusSms(to, message);
}
import { pickVehicleForWeight, logisticsCostKobo } from "@/lib/logistics";
import { uploadInvoicePdf, getSignedFileUrl, SIGNED_URL_EXPIRY, deleteFile } from "@/lib/r2";
import { renderInvoiceToBuffer } from "@/lib/invoice/render";
import { logError } from "@/lib/errors";
import { bankFromSettings, getSiteSettings } from "@/lib/settings";
import {
  notifyApproved,
  notifyCancelled,
  notifyDelivered,
  notifyDispatched,
  notifyInvoiceIssued,
  notifyOrderEdited,
  notifyOrderSubmitted,
  notifyPaid,
  notifyPaymentDeclaredAck,
} from "@/lib/notifications";
import {
  checkLowStockAndNotify,
  inAppAdminNewOrder,
  inAppAdminOrderEdited,
  inAppAdminPaymentDeclared,
  inAppApproved,
  inAppCancelled,
  inAppDelivered,
  inAppDispatched,
  inAppInvoiceIssued,
  inAppPaid,
} from "@/lib/in-app-notifications";

async function nextOrderNumber(): Promise<string> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const count = await db.order.count({ where: { submittedAt: { gte: start } } });
  return fmtOrderNum(now.getFullYear(), now.getMonth(), count + 1);
}

export class OrderSubmissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderSubmissionError";
  }
}

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
    const totalPacks = it.quantityCartons * (upc ?? 0) + it.quantityPacks;
    return { it, upc, totalPacks };
  });
  for (const { it, totalPacks } of lines) {
    if (!it.product.active) {
      throw new OrderSubmissionError(`${it.product.name} is no longer available.`);
    }
    if (it.quantityCartons > it.product.stockCartons) {
      throw new OrderSubmissionError(
        `${it.product.name}: only ${it.product.stockCartons} carton(s) in stock.`,
      );
    }
    if (it.quantityPacks > it.product.stockLoosePacks) {
      throw new OrderSubmissionError(
        `${it.product.name}: only ${it.product.stockLoosePacks} loose pack(s) in stock.`,
      );
    }
    if (totalPacks <= 0) {
      throw new OrderSubmissionError(`${it.product.name}: invalid quantity.`);
    }
    subtotalKobo += it.product.priceKobo * totalPacks;
    weightGrams += it.product.weightGrams * totalPacks;
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
              create: lines.map(({ it, upc, totalPacks }) => ({
                productId: it.product.id,
                nameSnapshot: it.product.name,
                skuSnapshot: it.product.sku,
                priceKoboSnap: it.product.priceKobo,
                weightGramsSnap: it.product.weightGrams,
                quantityCartons: it.quantityCartons,
                quantityPacks: it.quantityPacks,
                unitsPerCartonSnap: upc,
                quantity: totalPacks,
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
              stockLoosePacks: { gte: it.quantityPacks },
            },
            data: {
              stockCartons: { decrement: it.quantityCartons },
              stockLoosePacks: { decrement: it.quantityPacks },
            },
          });
          if (upd.count !== 1) {
            throw new OrderSubmissionError(`${it.product.name} sold out before checkout.`);
          }
          await tx.stockMovement.create({
            data: {
              productId: it.product.id,
              deltaCartons: -it.quantityCartons,
              deltaPacks: -it.quantityPacks,
              reason: "ORDER",
              orderId: created.id,
            },
          });
        }

        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        return created;
      });

      // Fire-and-forget side effects after commit.
      const bizName = (await businessName(userId)) ?? "Unknown business";
      void notifyAdminNewOrder(order.number, bizName).catch(
        (e) => logError("orders.adminNotify", e),
      );
      void notifyAdminSms(`New order ${order.number} from ${bizName}.`).catch((e) =>
        logError("orders.adminSms", e),
      );
      void (async () => {
        const recipient = await loadOrderRecipient(userId);
        await notifyOrderSubmitted(recipient, order.number, subtotalKobo);
      })().catch((e) => logError("orders.submitCustomerNotify", e));
      void inAppAdminNewOrder(order.id, order.number, bizName).catch((e) =>
        logError("notifications.inApp", e),
      );
      void checkLowStockAndNotify(lines.map((l) => l.it.product.id)).catch((e) =>
        logError("notifications.lowStock", e),
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

export type IssueInvoiceArgs = {
  distanceBandId: string;
  tripCountOverride?: number;
  /** When set, use this fee (in kobo) instead of the matrix lookup. */
  logisticsKoboOverride?: number;
};

/**
 * Render the invoice PDF for an order and upload it to R2, returning the new key.
 * Shared by invoice issuance and post-issue logistics adjustments.
 */
async function buildInvoicePdfKey(
  order: Prisma.OrderGetPayload<{ include: { items: true; address: true } }>,
  args: { vehicleName: string | null; bandLabel: string | null; tripCount: number; logisticsKobo: number },
): Promise<string> {
  const totalKobo = order.subtotalKobo + args.logisticsKobo;
  const business = await db.business.findUnique({ where: { userId: order.userId } });
  const user = await db.user.findUnique({ where: { id: order.userId } });
  const settings = await getSiteSettings();
  const buf = await renderInvoiceToBuffer({
    invoiceNumber: `INV-${order.number}`,
    issuedAt: new Date(),
    company: {
      address: [
        settings.contactAddressLine1,
        settings.contactAddressLine2,
        settings.contactAddressLga,
        settings.contactAddressState,
      ]
        .filter(Boolean)
        .join(", "),
      phones: settings.contactPhones
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
        .join(" · "),
      email: settings.contactEmail,
    },
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
      quantityPacks: i.quantityPacks,
      unitsPerCartonSnap: i.unitsPerCartonSnap,
      priceKoboSnap: i.priceKoboSnap,
    })),
    subtotalKobo: order.subtotalKobo,
    logisticsKobo: args.logisticsKobo,
    totalKobo,
    weightGrams: order.weightGrams,
    vehicleName: args.vehicleName,
    bandLabel: args.bandLabel,
    tripCount: args.tripCount,
    bank: bankFromSettings(settings),
  });
  return uploadInvoicePdf(buf);
}

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
  // A manual override skips the matrix lookup so an unconfigured cell can't throw.
  const logisticsKobo =
    args.logisticsKoboOverride ??
    (await logisticsCostKobo(pick.vehicleId, args.distanceBandId, tripCount));
  const totalKobo = order.subtotalKobo + logisticsKobo;

  const band = await db.distanceBand.findUnique({ where: { id: args.distanceBandId } });
  if (!band) throw new OrderSubmissionError("Distance band not found.");

  const previousPdfKey = order.invoice?.pdfKey ?? null;
  const pdfKey = await buildInvoicePdfKey(order, {
    vehicleName: pick.vehicleName,
    bandLabel: band.label,
    tripCount,
    logisticsKobo,
  });

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
          logisticsOverridden: args.logisticsKoboOverride != null,
        },
      },
    });
    return ord;
  });

  // Re-issuing writes a fresh UUID key; remove the orphaned old PDF.
  if (previousPdfKey && previousPdfKey !== pdfKey) {
    await deleteFile(previousPdfKey).catch((e) => logError("orders.deleteOldInvoice", e));
  }

  const recipient = await loadOrderRecipient(order.userId);
  const emailPdfUrl = await getSignedFileUrl(pdfKey, {
    expiresIn: SIGNED_URL_EXPIRY.email,
  });
  await notifyInvoiceIssued(recipient, order.number, emailPdfUrl, totalKobo).catch((e) =>
    logError("orders.invoiceEmail", e),
  );
  void notifyAdminOrderUpdate(
    order.number,
    (await businessName(order.userId)) ?? "Unknown business",
    "Invoice issued",
    `Total due: ${formatNaira(totalKobo)}`,
  ).catch((e) => logError("orders.invoiceAdminNotify", e));
  void inAppInvoiceIssued(order.userId, order.id, order.number, totalKobo).catch((e) =>
    logError("notifications.inApp", e),
  );
  return updated;
}

/**
 * Adjust the logistics fee on an order whose invoice has already been issued
 * (before payment is recorded). Regenerates the invoice PDF and re-notifies the
 * customer of the new total. Vehicle/band/trips are kept as originally set.
 */
export async function updateOrderLogistics(
  actorId: string,
  orderId: string,
  args: { logisticsKobo: number },
) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, address: true, invoice: true, vehicle: true, distanceBand: true },
  });
  if (!order) throw new OrderSubmissionError("Order not found.");
  if (order.status !== "AWAITING_APPROVAL" && order.status !== "AWAITING_PAYMENT") {
    throw new OrderSubmissionError("Logistics can only be adjusted before payment.");
  }
  if (!order.invoice || !order.vehicleId || !order.distanceBandId) {
    throw new OrderSubmissionError("Issue the invoice before adjusting logistics.");
  }

  const fromKobo = order.logisticsKobo;
  const logisticsKobo = args.logisticsKobo;
  const totalKobo = order.subtotalKobo + logisticsKobo;

  const previousPdfKey = order.invoice.pdfKey ?? null;
  const pdfKey = await buildInvoicePdfKey(order, {
    vehicleName: order.vehicle?.name ?? null,
    bandLabel: order.distanceBand?.label ?? null,
    tripCount: order.tripCount,
    logisticsKobo,
  });

  const updated = await db.$transaction(async (tx) => {
    const ord = await tx.order.update({
      where: { id: order.id },
      data: { logisticsKobo, totalKobo },
    });
    await tx.invoice.update({
      where: { orderId: order.id },
      data: { logisticsKobo, totalKobo, pdfKey },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        orderId: order.id,
        action: "order.logistics_adjusted",
        detail: { from: fromKobo, to: logisticsKobo, totalKobo },
      },
    });
    return ord;
  });

  if (previousPdfKey && previousPdfKey !== pdfKey) {
    await deleteFile(previousPdfKey).catch((e) => logError("orders.deleteOldInvoice", e));
  }

  const recipient = await loadOrderRecipient(order.userId);
  const emailPdfUrl = await getSignedFileUrl(pdfKey, { expiresIn: SIGNED_URL_EXPIRY.email });
  await notifyInvoiceIssued(recipient, order.number, emailPdfUrl, totalKobo).catch((e) =>
    logError("orders.invoiceEmail", e),
  );
  void inAppInvoiceIssued(order.userId, order.id, order.number, totalKobo).catch((e) =>
    logError("notifications.inApp", e),
  );
  return updated;
}

/**
 * Re-render an already-issued invoice's PDF and swap it in R2, without changing
 * any money or order state. Used to refresh the artifact after presentation
 * changes (e.g. adding the logo) and by the backfill script. Does not re-notify
 * the customer — nothing about the order's totals has changed.
 */
export async function regenerateInvoicePdf(actorId: string, orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, address: true, invoice: true, vehicle: true, distanceBand: true },
  });
  if (!order) throw new OrderSubmissionError("Order not found.");
  if (!order.invoice) throw new OrderSubmissionError("No invoice to regenerate.");

  const previousPdfKey = order.invoice.pdfKey ?? null;
  const pdfKey = await buildInvoicePdfKey(order, {
    vehicleName: order.vehicle?.name ?? null,
    bandLabel: order.distanceBand?.label ?? null,
    tripCount: order.tripCount,
    logisticsKobo: order.logisticsKobo,
  });

  await db.$transaction(async (tx) => {
    await tx.invoice.update({ where: { orderId: order.id }, data: { pdfKey } });
    await tx.auditLog.create({
      data: { actorId, orderId: order.id, action: "order.invoice_regenerated" },
    });
  });

  if (previousPdfKey && previousPdfKey !== pdfKey) {
    await deleteFile(previousPdfKey).catch((e) => logError("orders.deleteOldInvoice", e));
  }

  return order;
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
  const settings = await getSiteSettings();
  await notifyApproved(
    recipient,
    order.number,
    order.totalKobo,
    emailPdfUrl,
    bankFromSettings(settings),
  ).catch((e) => logError("orders.approveNotify", e));
  void notifyAdminOrderUpdate(
    order.number,
    (await businessName(order.userId)) ?? "Unknown business",
    "Approved — awaiting payment",
    `Total due: ${formatNaira(order.totalKobo)}`,
  ).catch((e) => logError("orders.approveAdminNotify", e));
  void inAppApproved(order.userId, order.id, order.number, order.totalKobo).catch((e) =>
    logError("notifications.inApp", e),
  );
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
  await notifyPaid(recipient, order.number).catch((e) => logError("orders.paidNotify", e));
  void notifyAdminOrderUpdate(
    order.number,
    (await businessName(order.userId)) ?? "Unknown business",
    "Payment confirmed",
    `Amount: ${formatNaira(args.amountKobo)}${args.bankRef ? ` · Ref: ${args.bankRef}` : ""}`,
  ).catch((e) => logError("orders.paidAdminNotify", e));
  void inAppPaid(order.userId, order.id, order.number).catch((e) =>
    logError("notifications.inApp", e),
  );
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
    logError("orders.dispatchNotify", e),
  );
  void notifyAdminOrderUpdate(
    order.number,
    (await businessName(order.userId)) ?? "Unknown business",
    "Dispatched",
    courierNote ? `Courier note: ${courierNote}` : null,
  ).catch((e) => logError("orders.dispatchAdminNotify", e));
  void inAppDispatched(order.userId, order.id, order.number).catch((e) =>
    logError("notifications.inApp", e),
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
    logError("orders.deliverNotify", e),
  );
  void notifyAdminOrderUpdate(
    order.number,
    (await businessName(order.userId)) ?? "Unknown business",
    "Delivered",
  ).catch((e) => logError("orders.deliverAdminNotify", e));
  void inAppDelivered(order.userId, order.id, order.number).catch((e) =>
    logError("notifications.inApp", e),
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
            stockLoosePacks: { increment: it.quantityPacks },
          },
        });
        await tx.stockMovement.create({
          data: {
            productId: it.productId,
            deltaCartons: it.quantityCartons,
            deltaPacks: it.quantityPacks,
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
    logError("orders.cancelNotify", e),
  );
  void notifyAdminOrderUpdate(
    order.number,
    (await businessName(order.userId)) ?? "Unknown business",
    "Cancelled",
    `Reason: ${reason}`,
  ).catch((e) => logError("orders.cancelAdminNotify", e));
  void inAppCancelled(order.userId, order.id, order.number, reason).catch((e) =>
    logError("notifications.inApp", e),
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
    const name = business?.name ?? "Unknown business";
    const totalDueText = formatNaira(order.totalKobo || order.subtotalKobo);
    await inAppAdminPaymentDeclared(order.id, order.number, name, totalDueText).catch((e) =>
      logError("notifications.inApp", e),
    );
    void notifyAdminSms(
      `Payment declared on order ${order.number} by ${name} (${totalDueText}). Verify transfer.`,
    ).catch((e) => logError("orders.adminSms", e));
    return notifyAdminPaymentDeclared(order.number, name, totalDueText);
  })().catch((e) => logError("orders.paymentDeclaredNotify", e));

  // Acknowledge to the customer that we're verifying their payment.
  void (async () => {
    const recipient = await loadOrderRecipient(userId);
    await notifyPaymentDeclaredAck(recipient, order.number);
  })().catch((e) => logError("orders.paymentDeclaredAck", e));

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
  items: { itemId: string; cartons: number; packs: number }[];
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
    newPacks: number;
    newTotalPacks: number;
    cartonsDelta: number;
    packsDelta: number;
    remove: boolean;
  }> = [];

  for (const it of order.items) {
    const next = byId.get(it.id);
    const newCartons = next ? Math.max(0, Math.trunc(next.cartons)) : it.quantityCartons;
    const newPacks = next ? Math.max(0, Math.trunc(next.packs)) : it.quantityPacks;
    const newTotalPacks = newCartons * (it.unitsPerCartonSnap ?? 0) + newPacks;
    const cartonsDelta = newCartons - it.quantityCartons;
    const packsDelta = newPacks - it.quantityPacks;
    const remove = newCartons === 0 && newPacks === 0;
    if (remove || cartonsDelta !== 0 || packsDelta !== 0) itemsChanged = true;
    updates.push({
      item: it,
      newCartons,
      newPacks,
      newTotalPacks,
      cartonsDelta,
      packsDelta,
      remove,
    });
    if (!remove) {
      subtotalKobo += it.priceKoboSnap * newTotalPacks;
      weightGrams += it.weightGramsSnap * newTotalPacks;
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
            stockLoosePacks: { increment: u.item.quantityPacks },
          },
        });
        await tx.stockMovement.create({
          data: {
            productId: u.item.productId,
            deltaCartons: u.item.quantityCartons,
            deltaPacks: u.item.quantityPacks,
            reason: "ADJUSTMENT",
            orderId: order.id,
            note: "Order edited: item removed",
          },
        });
        continue;
      }

      if (u.cartonsDelta === 0 && u.packsDelta === 0) {
        // Nothing to change for this line.
        continue;
      }

      // Atomic stock guard: ensure increases are decremented from stock,
      // and decreases are returned to stock. Use updateMany so we can also
      // gate on the available-stock conditions for the increase case.
      const decCartons = u.cartonsDelta > 0 ? u.cartonsDelta : 0;
      const decPacks = u.packsDelta > 0 ? u.packsDelta : 0;
      const incCartons = u.cartonsDelta < 0 ? -u.cartonsDelta : 0;
      const incPacks = u.packsDelta < 0 ? -u.packsDelta : 0;

      if (decCartons > 0 || decPacks > 0) {
        const upd = await tx.product.updateMany({
          where: {
            id: u.item.productId,
            stockCartons: { gte: decCartons },
            stockLoosePacks: { gte: decPacks },
          },
          data: {
            stockCartons: { decrement: decCartons },
            stockLoosePacks: { decrement: decPacks },
          },
        });
        if (upd.count !== 1) {
          throw new OrderSubmissionError(`Insufficient stock for ${u.item.nameSnapshot}.`);
        }
      }
      if (incCartons > 0 || incPacks > 0) {
        await tx.product.update({
          where: { id: u.item.productId },
          data: {
            stockCartons: { increment: incCartons },
            stockLoosePacks: { increment: incPacks },
          },
        });
      }

      await tx.orderItem.update({
        where: { id: u.item.id },
        data: {
          quantityCartons: u.newCartons,
          quantityPacks: u.newPacks,
          quantity: u.newTotalPacks,
        },
      });
      await tx.stockMovement.create({
        data: {
          productId: u.item.productId,
          deltaCartons: -u.cartonsDelta,
          deltaPacks: -u.packsDelta,
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
            .filter((u) => !u.remove && (u.cartonsDelta !== 0 || u.packsDelta !== 0))
            .map((u) => ({
              sku: u.item.skuSnapshot,
              cartonsDelta: u.cartonsDelta,
              packsDelta: u.packsDelta,
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
        .filter((u) => !u.remove && (u.cartonsDelta !== 0 || u.packsDelta !== 0))
        .map((u) => {
          const parts: string[] = [];
          if (u.cartonsDelta !== 0)
            parts.push(`${u.cartonsDelta > 0 ? "+" : ""}${u.cartonsDelta} cartons`);
          if (u.packsDelta !== 0)
            parts.push(`${u.packsDelta > 0 ? "+" : ""}${u.packsDelta} packs`);
          return `- ${u.item.nameSnapshot} (${u.item.skuSnapshot}): ${parts.join(", ")}`;
        }),
    ].join("\n");
    void notifyAdminOrderEdited(
      order.number,
      business?.name ?? "Unknown business",
      `Status reset to SUBMITTED; existing invoice cancelled. Please re-issue with the new logistics.\n\nChanges:\n${summary}`,
    ).catch((e) => logError("orders.editNotify", e));
    void (async () => {
      const recipient = await loadOrderRecipient(userId);
      await notifyOrderEdited(recipient, order.number, summary);
    })().catch((e) => logError("orders.editCustomerNotify", e));
    void inAppAdminOrderEdited(
      order.id,
      order.number,
      business?.name ?? "Unknown business",
    ).catch((e) => logError("notifications.inApp", e));
    void checkLowStockAndNotify(
      updates
        .filter((u) => !u.remove && (u.cartonsDelta > 0 || u.packsDelta > 0))
        .map((u) => u.item.productId),
    ).catch((e) => logError("notifications.lowStock", e));
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

export type RestoreResult = {
  restored: number;
  skipped: { name: string; reason: string }[];
};

/**
 * Move every line of `orderId` back into the user's cart, then cancel the order.
 * Items that no longer exist / aren't in stock are recorded in `skipped`; the
 * remaining items are still added and the order is still cancelled so the user
 * can rebuild without juggling two queues.
 */
export async function restoreOrderToCartAndCancel(
  userId: string,
  orderId: string,
): Promise<RestoreResult> {
  const order = await db.order.findFirst({
    where: { id: orderId, userId },
    include: { items: true },
  });
  if (!order) throw new OrderSubmissionError("Order not found.");
  if (!EDITABLE_STATUSES.includes(order.status as (typeof EDITABLE_STATUSES)[number])) {
    throw new OrderSubmissionError(
      "This order can no longer be edited. Please contact the back office.",
    );
  }

  const { addItem } = await import("@/lib/cart");
  const skipped: RestoreResult["skipped"] = [];
  let restored = 0;
  for (const it of order.items) {
    if (it.quantityCartons === 0 && it.quantityPacks === 0) continue;
    try {
      await addItem(userId, it.productId, {
        cartons: it.quantityCartons,
        packs: it.quantityPacks,
      });
      restored += 1;
    } catch (e) {
      skipped.push({
        name: it.nameSnapshot,
        reason: e instanceof Error ? e.message : "No longer available.",
      });
    }
  }

  await cancelOrder(userId, orderId, "Customer: rebuilding order (add more items).");
  return { restored, skipped };
}
