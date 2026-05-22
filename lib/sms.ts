// BulkSMS Nigeria client.
// Docs: https://docs.bulksmsnigeria.com/
// In dev (no token) we log to the console.

import "server-only";

const ENDPOINT = "https://www.bulksmsnigeria.com/api/v2/sms";

type SendArgs = {
  to: string; // E.164 or local Nigerian; we send as-is
  body: string;
};

export async function sendSms({ to, body }: SendArgs) {
  const token = process.env.BULKSMS_NG_API_TOKEN;
  const from = process.env.BULKSMS_NG_SENDER_ID ?? "Iyknel";
  if (!token) {
    console.info("[sms:dev]", to, "—", body);
    return { ok: true, dev: true as const };
  }
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_token: token, from, to, body }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`BulkSMS NG failed (${res.status}): ${text}`);
  }
  return { ok: true, dev: false as const };
}

export async function sendPasswordResetSms(phone: string, code: string) {
  await sendSms({
    to: phone,
    body: `Your Iyknel reset code is ${code}. It expires in 15 minutes.`,
  });
}

export async function sendOrderStatusSms(phone: string, message: string) {
  await sendSms({ to: phone, body: `Iyknel: ${message}` });
}
