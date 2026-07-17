import "server-only";
import type { NotificationType } from "@prisma/client";
import { db } from "@/lib/db";
import { ADMIN_ROLES } from "@/lib/permissions";
import { formatNaira } from "@/lib/utils";

// Products at or below this many cartons trigger an admin low-stock alert.
// Future upgrade path: a per-product threshold field on Product.
export const LOW_STOCK_THRESHOLD_CARTONS = 5;

type NotificationInput = {
  type: NotificationType;
  title: string;
  body?: string | null;
  href?: string | null;
};

export async function createNotification(userId: string, input: NotificationInput) {
  await db.notification.create({
    data: {
      userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
    },
  });
}

export async function notifyAdminsInApp(input: NotificationInput) {
  const admins = await db.user.findMany({
    where: { role: { in: [...ADMIN_ROLES] } },
    select: { id: true },
  });
  if (admins.length === 0) return;
  await db.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
    })),
  });
}

// ---------- Customer-facing order events ----------

export async function inAppInvoiceIssued(
  userId: string,
  orderId: string,
  orderNumber: string,
  totalKobo: number,
) {
  await createNotification(userId, {
    type: "ORDER_INVOICE_ISSUED",
    title: `Invoice ready for order ${orderNumber}`,
    body: `Total due: ${formatNaira(totalKobo)}.`,
    href: `/orders/${orderId}`,
  });
}

export async function inAppApproved(
  userId: string,
  orderId: string,
  orderNumber: string,
  totalKobo: number,
) {
  await createNotification(userId, {
    type: "ORDER_APPROVED",
    title: `Order ${orderNumber} approved`,
    body: `Pay ${formatNaira(totalKobo)} by bank transfer, then click "I have paid".`,
    href: `/orders/${orderId}`,
  });
}

export async function inAppPaid(userId: string, orderId: string, orderNumber: string) {
  await createNotification(userId, {
    type: "ORDER_PAID",
    title: `Payment confirmed for order ${orderNumber}`,
    body: "We'll let you know as soon as it ships.",
    href: `/orders/${orderId}`,
  });
}

export async function inAppDispatched(userId: string, orderId: string, orderNumber: string) {
  await createNotification(userId, {
    type: "ORDER_DISPATCHED",
    title: `Order ${orderNumber} dispatched`,
    body: "Your order is on the way.",
    href: `/orders/${orderId}`,
  });
}

export async function inAppDelivered(userId: string, orderId: string, orderNumber: string) {
  await createNotification(userId, {
    type: "ORDER_DELIVERED",
    title: `Order ${orderNumber} delivered`,
    body: "Thanks for ordering with Iyknel.",
    href: `/orders/${orderId}`,
  });
}

export async function inAppCancelled(
  userId: string,
  orderId: string,
  orderNumber: string,
  reason: string,
) {
  await createNotification(userId, {
    type: "ORDER_CANCELLED",
    title: `Order ${orderNumber} cancelled`,
    body: `Reason: ${reason}`,
    href: `/orders/${orderId}`,
  });
}

// ---------- Admin-facing events ----------

export async function inAppAdminNewOrder(
  orderId: string,
  orderNumber: string,
  businessName: string,
) {
  await notifyAdminsInApp({
    type: "ADMIN_NEW_ORDER",
    title: `New order ${orderNumber}`,
    body: `Submitted by ${businessName}.`,
    href: `/admin/orders/${orderId}`,
  });
}

export async function inAppAdminPaymentDeclared(
  orderId: string,
  orderNumber: string,
  businessName: string,
  totalDueText: string,
) {
  await notifyAdminsInApp({
    type: "ADMIN_PAYMENT_DECLARED",
    title: `Payment declared on order ${orderNumber}`,
    body: `${businessName} says they've paid ${totalDueText}. Verify the transfer.`,
    href: `/admin/orders/${orderId}`,
  });
}

export async function inAppAdminOrderEdited(
  orderId: string,
  orderNumber: string,
  businessName: string,
) {
  await notifyAdminsInApp({
    type: "ADMIN_ORDER_EDITED",
    title: `Order ${orderNumber} edited`,
    body: `${businessName} changed their order. Review before approving.`,
    href: `/admin/orders/${orderId}`,
  });
}

// ---------- Low stock ----------

export async function checkLowStockAndNotify(productIds: string[]) {
  const ids = Array.from(new Set(productIds));
  if (ids.length === 0) return;
  const low = await db.product.findMany({
    where: {
      id: { in: ids },
      active: true,
      stockCartons: { lte: LOW_STOCK_THRESHOLD_CARTONS },
    },
    select: { id: true, name: true, sku: true, stockCartons: true },
  });
  for (const p of low) {
    const href = `/admin/products/${p.id}`;
    // Skip while an unread alert for this product is still pending, so
    // repeated orders against a low product don't spam every admin.
    const existing = await db.notification.findFirst({
      where: { type: "ADMIN_LOW_STOCK", href, readAt: null },
      select: { id: true },
    });
    if (existing) continue;
    await notifyAdminsInApp({
      type: "ADMIN_LOW_STOCK",
      title: `Low stock: ${p.name}`,
      body: `${p.sku} is down to ${p.stockCartons} carton(s).`,
      href,
    });
  }
}
