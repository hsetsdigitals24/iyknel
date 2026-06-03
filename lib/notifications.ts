import "server-only";
import { sendMail } from "@/lib/mail";
import { sendOrderStatusSms } from "@/lib/sms";
import { formatNaira } from "@/lib/utils";

export type BankDetails = { name: string; accountName: string; accountNumber: string };

export function bankFromEnv(): BankDetails | null {
  const name = process.env.BANK_NAME;
  const accountName = process.env.BANK_ACCOUNT_NAME;
  const accountNumber = process.env.BANK_ACCOUNT_NUMBER;
  if (!name || !accountName || !accountNumber) return null;
  return { name, accountName, accountNumber };
}

type Recipient = { email: string; phone?: string | null; name?: string | null };

export async function notifyInvoiceIssued(r: Recipient, orderNumber: string, invoiceUrl: string, totalKobo: number) {
  await sendMail({
    to: r.email,
    subject: `Your invoice for order ${orderNumber}`,
    text: `Hi ${r.name ?? "there"},\n\nYour invoice for order ${orderNumber} is ready.\nTotal due: ${formatNaira(totalKobo)}\n\nDownload: ${invoiceUrl}\n\nWe'll follow up shortly with bank-transfer instructions once your order is approved.\n\n— Iyknel`,
  });
}

export async function notifyApproved(
  r: Recipient,
  orderNumber: string,
  totalKobo: number,
  invoiceUrl: string | null,
  bank: BankDetails | null,
) {
  const bankBlock = bank
    ? `\nBank transfer details:\n  ${bank.name}\n  ${bank.accountName}\n  ${bank.accountNumber}\nUse "${orderNumber}" as the transfer reference.\n`
    : "\nBank transfer details will follow.\n";
  await sendMail({
    to: r.email,
    subject: `Order ${orderNumber} approved — please complete payment`,
    text: `Hi ${r.name ?? "there"},\n\nWe've approved order ${orderNumber}. Total due: ${formatNaira(totalKobo)}.\n${bankBlock}${invoiceUrl ? `\nInvoice: ${invoiceUrl}\n` : ""}\nOnce you've paid, click "I have paid" in your dashboard.\n\n— Iyknel`,
  });
  if (r.phone) {
    await sendOrderStatusSms(
      r.phone,
      `Order ${orderNumber} approved. Pay ${formatNaira(totalKobo)} by bank transfer; details emailed.`,
    );
  }
}

export async function notifyPaid(r: Recipient, orderNumber: string) {
  await sendMail({
    to: r.email,
    subject: `Payment received for order ${orderNumber}`,
    text: `Hi ${r.name ?? "there"},\n\nWe've confirmed your payment for order ${orderNumber}. We'll let you know as soon as it ships.\n\n— Iyknel`,
  });
  if (r.phone) await sendOrderStatusSms(r.phone, `Order ${orderNumber}: payment confirmed.`);
}

export async function notifyDispatched(r: Recipient, orderNumber: string, courierNote?: string | null) {
  await sendMail({
    to: r.email,
    subject: `Order ${orderNumber} dispatched`,
    text: `Hi ${r.name ?? "there"},\n\nOrder ${orderNumber} is on the way.${courierNote ? `\n\nCourier note: ${courierNote}` : ""}\n\n— Iyknel`,
  });
  if (r.phone) await sendOrderStatusSms(r.phone, `Order ${orderNumber}: dispatched.`);
}

export async function notifyDelivered(r: Recipient, orderNumber: string) {
  await sendMail({
    to: r.email,
    subject: `Order ${orderNumber} delivered`,
    text: `Hi ${r.name ?? "there"},\n\nOrder ${orderNumber} has been marked delivered. Thanks for ordering with Iyknel.\n\n— Iyknel`,
  });
  if (r.phone) await sendOrderStatusSms(r.phone, `Order ${orderNumber}: delivered. Thank you!`);
}

export async function notifyCancelled(r: Recipient, orderNumber: string, reason: string) {
  await sendMail({
    to: r.email,
    subject: `Order ${orderNumber} cancelled`,
    text: `Hi ${r.name ?? "there"},\n\nOrder ${orderNumber} has been cancelled.\nReason: ${reason}\n\nIf this is a mistake, reply to this email and we'll sort it out.\n\n— Iyknel`,
  });
  if (r.phone) await sendOrderStatusSms(r.phone, `Order ${orderNumber}: cancelled. ${reason}`);
}
