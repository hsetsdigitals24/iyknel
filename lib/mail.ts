// Email transport via nodemailer.
// In dev (no SMTP_HOST configured) we log to the console instead of sending.

import "server-only";
import * as React from "react";
import { AdminNoticeEmail } from "@/emails/admin-notice";
import { PasswordResetEmail } from "@/emails/password-reset";
import { setEmailContact } from "@/emails/layout";
import { getContact } from "@/lib/contact";

type Mailable = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  bcc?: string | string[];
  replyTo?: string;
};

let cachedTransport: import("nodemailer").Transporter | null = null;

async function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  if (cachedTransport) return cachedTransport;
  const nodemailer = await import("nodemailer");
  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return cachedTransport;
}

/**
 * Render a React Email component to both HTML and a plain-text fallback.
 * Used so every branded email still degrades gracefully in text-only clients.
 */
export async function renderEmail(node: React.ReactElement): Promise<{ html: string; text: string }> {
  const { render } = await import("@react-email/render");
  // Inject the admin-editable contact details into the shared footer once,
  // so every template reflects the current values without threading props.
  const contact = await getContact();
  // Set the shared holder synchronously before rendering (no await in between)
  // so EmailLayout reads it during its synchronous render.
  setEmailContact({
    email: contact.email,
    phone: contact.phones.map((p) => p.display).join(" · ") || null,
  });
  const [html, text] = await Promise.all([
    render(node),
    render(node, { plainText: true }),
  ]);
  return { html, text };
}

export async function sendMail(msg: Mailable) {
  const transport = await getTransport();
  if (!transport) {
    console.info("[mail:dev]", msg.to, "—", msg.subject, "\n", msg.text);
    return { ok: true, dev: true as const };
  }
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? "no-reply@example.com",
    to: msg.to,
    bcc: msg.bcc,
    replyTo: msg.replyTo,
    subject: msg.subject,
    text: msg.text,
    html: msg.html,
  });
  return { ok: true, dev: false as const };
}

export async function sendPasswordResetEmail(email: string, code: string, name?: string | null) {
  const { html, text } = await renderEmail(
    React.createElement(PasswordResetEmail, { name, code, expiresMinutes: 15 }),
  );
  await sendMail({
    to: email,
    subject: "Your Iyknel password reset code",
    text,
    html,
  });
}

// ── Admin notifications ────────────────────────────────────────────────────
// All admin alerts render the shared AdminNoticeEmail template and go to
// ADMIN_NOTIFY_EMAIL. Callers should treat a missing address as a no-op.

async function sendAdminNotice(args: {
  subject: string;
  heading: string;
  body: string;
  detail?: string | null;
  action?: string | null;
}) {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) {
    console.warn("ADMIN_NOTIFY_EMAIL not set; skipping admin notification.");
    return;
  }
  const { html, text } = await renderEmail(
    React.createElement(AdminNoticeEmail, {
      heading: args.heading,
      preview: args.subject,
      body: args.body,
      detail: args.detail ?? null,
      action: args.action ?? "Review it in the back office.",
    }),
  );
  await sendMail({ to, subject: args.subject, text, html });
}

export async function notifyAdminNewOrder(orderNumber: string, businessName: string) {
  await sendAdminNotice({
    subject: `New order ${orderNumber} from ${businessName}`,
    heading: `New order ${orderNumber}`,
    body: `Order ${orderNumber} was submitted by ${businessName}.`,
  });
}

export async function notifyAdminPaymentDeclared(
  orderNumber: string,
  businessName: string,
  totalDueText: string,
) {
  await sendAdminNotice({
    subject: `Payment declared on order ${orderNumber}`,
    heading: `Payment declared — ${orderNumber}`,
    body: `${businessName} has declared payment for order ${orderNumber} (${totalDueText}).`,
    action: "Verify the bank transfer and mark it paid in the back office.",
  });
}

export async function notifyAdminOrderEdited(
  orderNumber: string,
  businessName: string,
  summary: string,
) {
  await sendAdminNotice({
    subject: `Order ${orderNumber} edited by ${businessName}`,
    heading: `Order ${orderNumber} edited`,
    body: `${businessName} edited order ${orderNumber}.`,
    detail: summary,
  });
}

/**
 * Generic admin alert fired on every order state change so the back office is
 * always notified alongside the customer.
 */
export async function notifyAdminOrderUpdate(
  orderNumber: string,
  businessName: string,
  statusLabel: string,
  detail?: string | null,
) {
  await sendAdminNotice({
    subject: `Order ${orderNumber}: ${statusLabel}`,
    heading: `Order ${orderNumber} — ${statusLabel}`,
    body: `Order ${orderNumber} (${businessName}) is now: ${statusLabel}.`,
    detail: detail ?? null,
  });
}
