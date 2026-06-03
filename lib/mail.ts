// Email transport via nodemailer.
// In dev (no SMTP_HOST configured) we log to the console instead of sending.

import "server-only";

type Mailable = {
  to: string;
  subject: string;
  text: string;
  html?: string;
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

export async function sendMail(msg: Mailable) {
  const transport = await getTransport();
  if (!transport) {
    console.info("[mail:dev]", msg.to, "—", msg.subject, "\n", msg.text);
    return { ok: true, dev: true as const };
  }
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? "no-reply@example.com",
    to: msg.to,
    subject: msg.subject,
    text: msg.text,
    html: msg.html,
  });
  return { ok: true, dev: false as const };
}

export async function notifyAdminNewOrder(orderNumber: string, businessName: string) {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) {
    console.warn("ADMIN_NOTIFY_EMAIL not set; skipping admin notification.");
    return;
  }
  await sendMail({
    to,
    subject: `New order ${orderNumber} from ${businessName}`,
    text: `Order ${orderNumber} submitted by ${businessName}. Review it in the back office.`,
  });
}

export async function notifyAdminPaymentDeclared(
  orderNumber: string,
  businessName: string,
  totalDueText: string,
) {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) {
    console.warn("ADMIN_NOTIFY_EMAIL not set; skipping admin notification.");
    return;
  }
  await sendMail({
    to,
    subject: `Payment declared on order ${orderNumber}`,
    text: `${businessName} has declared payment for order ${orderNumber} (${totalDueText}). Verify the bank transfer and mark paid in the back office.`,
  });
}

export async function notifyAdminOrderEdited(
  orderNumber: string,
  businessName: string,
  summary: string,
) {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (!to) {
    console.warn("ADMIN_NOTIFY_EMAIL not set; skipping admin notification.");
    return;
  }
  await sendMail({
    to,
    subject: `Order ${orderNumber} edited by ${businessName}`,
    text: `${businessName} edited order ${orderNumber}.\n\n${summary}\n\nReview it in the back office.`,
  });
}
