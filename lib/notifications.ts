import "server-only";
import * as React from "react";
import { sendMail, renderEmail } from "@/lib/mail";
import { sendOrderStatusSms } from "@/lib/sms";
import { formatNaira } from "@/lib/utils";
import { OrderStatusEmail, type OrderStatusEmailProps } from "@/emails/order-status";
import { WelcomeEmail } from "@/emails/welcome";
import type { BankDetails } from "@/lib/settings";

export type { BankDetails };

type Recipient = { email: string; phone?: string | null; name?: string | null };

/** Render an OrderStatusEmail and send it, sharing the heading as the subject. */
async function sendOrderStatus(
  to: string,
  subject: string,
  props: OrderStatusEmailProps,
) {
  const { html, text } = await renderEmail(React.createElement(OrderStatusEmail, props));
  await sendMail({ to, subject, text, html });
}

export async function notifyWelcome(r: Recipient) {
  const { html, text } = await renderEmail(React.createElement(WelcomeEmail, { name: r.name }));
  await sendMail({ to: r.email, subject: "Your Iyknel account is ready", text, html });
  if (r.phone) {
    await sendOrderStatusSms(r.phone, "Your Iyknel account is ready. Sign in to start ordering.");
  }
}

export async function notifyOrderSubmitted(r: Recipient, orderNumber: string, totalKobo: number) {
  await sendOrderStatus(r.email, `We've received order ${orderNumber}`, {
    heading: `Order ${orderNumber} received`,
    preview: `We've received order ${orderNumber}`,
    name: r.name,
    intro: `Thanks — we've received order ${orderNumber} and our team is reviewing it. We'll send your invoice and bank-transfer instructions shortly.`,
    totalText: `${formatNaira(totalKobo)} (excludes logistics, added after review)`,
  });
  if (r.phone) {
    await sendOrderStatusSms(
      r.phone,
      `Order ${orderNumber} received. We'll send your invoice shortly.`,
    );
  }
}

export async function notifyInvoiceIssued(
  r: Recipient,
  orderNumber: string,
  invoiceUrl: string,
  totalKobo: number,
) {
  await sendOrderStatus(r.email, `Your invoice for order ${orderNumber}`, {
    heading: `Invoice for order ${orderNumber}`,
    preview: `Your invoice for order ${orderNumber} is ready`,
    name: r.name,
    intro: `Your invoice for order ${orderNumber} is ready.`,
    totalText: formatNaira(totalKobo),
    cta: { href: invoiceUrl, label: "Download invoice" },
    outro:
      "We'll follow up shortly with bank-transfer instructions once your order is approved.",
  });
  if (r.phone) {
    await sendOrderStatusSms(
      r.phone,
      `Invoice ready for order ${orderNumber}. Total due: ${formatNaira(totalKobo)}. See your dashboard.`,
    );
  }
}

export async function notifyApproved(
  r: Recipient,
  orderNumber: string,
  totalKobo: number,
  invoiceUrl: string | null,
  bank: BankDetails | null,
) {
  await sendOrderStatus(r.email, `Order ${orderNumber} approved — please complete payment`, {
    heading: `Order ${orderNumber} approved`,
    preview: `Order ${orderNumber} approved — please complete payment`,
    name: r.name,
    intro: `We've approved order ${orderNumber}. Please complete payment by bank transfer.`,
    totalText: formatNaira(totalKobo),
    bank: bank
      ? {
          name: bank.name,
          accountName: bank.accountName,
          accountNumber: bank.accountNumber,
          reference: orderNumber,
        }
      : null,
    cta: invoiceUrl ? { href: invoiceUrl, label: "View invoice" } : null,
    outro: 'Once you\'ve paid, click "I have paid" in your dashboard.',
  });
  if (r.phone) {
    await sendOrderStatusSms(
      r.phone,
      `Order ${orderNumber} approved. Pay ${formatNaira(totalKobo)} by bank transfer; details emailed.`,
    );
  }
}

export async function notifyPaymentDeclaredAck(r: Recipient, orderNumber: string) {
  await sendOrderStatus(r.email, `We're verifying your payment for order ${orderNumber}`, {
    heading: `Verifying payment for order ${orderNumber}`,
    preview: `We're verifying your payment for order ${orderNumber}`,
    name: r.name,
    intro: `Thanks — we've recorded that you've paid for order ${orderNumber}. We're verifying the bank transfer and will confirm as soon as it clears.`,
  });
  if (r.phone) {
    await sendOrderStatusSms(r.phone, `Order ${orderNumber}: verifying your payment.`);
  }
}

export async function notifyPaid(r: Recipient, orderNumber: string) {
  await sendOrderStatus(r.email, `Payment received for order ${orderNumber}`, {
    heading: `Payment received — ${orderNumber}`,
    preview: `Payment received for order ${orderNumber}`,
    name: r.name,
    intro: `We've confirmed your payment for order ${orderNumber}. We'll let you know as soon as it ships.`,
  });
  if (r.phone) await sendOrderStatusSms(r.phone, `Order ${orderNumber}: payment confirmed.`);
}

export async function notifyDispatched(
  r: Recipient,
  orderNumber: string,
  courierNote?: string | null,
) {
  await sendOrderStatus(r.email, `Order ${orderNumber} dispatched`, {
    heading: `Order ${orderNumber} is on the way`,
    preview: `Order ${orderNumber} dispatched`,
    name: r.name,
    intro: `Order ${orderNumber} is on the way.`,
    outro: courierNote ? `Courier note: ${courierNote}` : null,
  });
  if (r.phone) await sendOrderStatusSms(r.phone, `Order ${orderNumber}: dispatched.`);
}

export async function notifyDelivered(r: Recipient, orderNumber: string) {
  await sendOrderStatus(r.email, `Order ${orderNumber} delivered`, {
    heading: `Order ${orderNumber} delivered`,
    preview: `Order ${orderNumber} delivered`,
    name: r.name,
    intro: `Order ${orderNumber} has been marked delivered. Thanks for ordering with Iyknel.`,
  });
  if (r.phone) await sendOrderStatusSms(r.phone, `Order ${orderNumber}: delivered. Thank you!`);
}

export async function notifyCancelled(r: Recipient, orderNumber: string, reason: string) {
  await sendOrderStatus(r.email, `Order ${orderNumber} cancelled`, {
    heading: `Order ${orderNumber} cancelled`,
    preview: `Order ${orderNumber} cancelled`,
    name: r.name,
    intro: `Order ${orderNumber} has been cancelled.`,
    reason,
    outro: "If this is a mistake, reply to this email and we'll sort it out.",
  });
  if (r.phone) await sendOrderStatusSms(r.phone, `Order ${orderNumber}: cancelled. ${reason}`);
}

export async function notifyOrderEdited(r: Recipient, orderNumber: string, summary: string) {
  await sendOrderStatus(r.email, `Order ${orderNumber} updated`, {
    heading: `Order ${orderNumber} updated`,
    preview: `Order ${orderNumber} was updated`,
    name: r.name,
    intro: `Your order ${orderNumber} has been updated. We'll re-issue your invoice with the new details shortly.`,
    outro: `Changes:\n${summary}`,
  });
  if (r.phone) await sendOrderStatusSms(r.phone, `Order ${orderNumber}: updated.`);
}
