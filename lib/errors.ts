import "server-only";

import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import type { FormState } from "@/lib/validation";

const GENERIC = "Something went wrong. Please try again, or contact support if it keeps happening.";

export class AppError extends Error {
  constructor(
    public friendly: string,
    opts?: { cause?: unknown },
  ) {
    super(friendly, opts);
    this.name = "AppError";
  }
}

function readableZod(err: ZodError): string {
  const first = err.issues[0];
  if (!first) return "Please check the form and try again.";
  const looksTechnical = /expected|received|invalid_type|unrecognized/i.test(first.message);
  return looksTechnical ? "Please check the form and try again." : first.message;
}

function mapPrismaKnown(e: Prisma.PrismaClientKnownRequestError): string {
  switch (e.code) {
    case "P2002":
      return "That value is already in use.";
    case "P2003":
      return "This item is linked to other records and can't be changed.";
    case "P2025":
      return "We couldn't find that item — it may have been removed.";
    default:
      return "We couldn't save your changes. Please try again.";
  }
}

function isFetchError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const msg = `${e.name} ${e.message}`.toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("network") ||
    msg.includes("econnrefused") ||
    msg.includes("etimedout") ||
    msg.includes("enotfound")
  );
}

function isS3Error(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const tag = `${e.name}`.toLowerCase();
  return (
    tag.includes("s3") ||
    tag === "nosuchkey" ||
    tag === "accessdenied" ||
    tag === "invalidaccesskeyid"
  );
}

function isNodemailerError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const code = (e as Error & { code?: string }).code;
  return code === "EAUTH" || code === "ECONNECTION" || code === "EENVELOPE";
}

function isBulkSmsError(e: unknown): boolean {
  return e instanceof Error && /bulksms/i.test(e.message);
}

export function friendlyError(e: unknown): string {
  if (e instanceof AppError) return e.friendly;
  // OrderSubmissionError lives in lib/orders.ts; its messages are already user-friendly.
  if (e instanceof Error && e.name === "OrderSubmissionError") return e.message;
  if (e instanceof ZodError) return readableZod(e);
  if (e instanceof Prisma.PrismaClientKnownRequestError) return mapPrismaKnown(e);
  if (e instanceof Prisma.PrismaClientValidationError)
    return "Some of the data you entered isn't in the right format.";
  if (isS3Error(e)) return "Image upload failed — please try a different file.";
  if (isNodemailerError(e)) return "We couldn't send the notification email right now.";
  if (isBulkSmsError(e)) return "Couldn't send the SMS — please try again.";
  if (isFetchError(e)) return "Network error — please check your connection and try again.";
  return GENERIC;
}

const SAFE_LOG_KEYS = new Set([
  "orderId",
  "productId",
  "userId",
  "categoryId",
  "sku",
  "actionName",
  "scope",
]);

function safeContext(ctx?: Record<string, unknown>): Record<string, unknown> {
  if (!ctx) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ctx)) {
    if (SAFE_LOG_KEYS.has(k) && (typeof v === "string" || typeof v === "number")) out[k] = v;
  }
  return out;
}

export function logError(scope: string, e: unknown, ctx?: Record<string, unknown>): void {
  const base = {
    scope,
    ...safeContext(ctx),
  };
  if (e instanceof Error) {
    console.error(scope, {
      ...base,
      name: e.name,
      message: e.message,
      code: (e as Error & { code?: string }).code,
      stack: e.stack,
    });
  } else {
    console.error(scope, { ...base, value: String(e) });
  }
}

function isNextControlFlow(e: unknown): boolean {
  // Next.js uses thrown sentinel errors for redirect() and notFound() —
  // they must bubble up out of any catch so the framework can act on them.
  if (!(e instanceof Error)) return false;
  const digest = (e as Error & { digest?: string }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_");
}

export async function withAction<T>(
  scope: string,
  fn: () => Promise<T>,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (e) {
    if (isNextControlFlow(e)) throw e;
    logError(scope, e);
    return { ok: false, message: friendlyError(e) };
  }
}

export function toFormState(
  result: { ok: true; data?: unknown } | { ok: false; message: string },
  successMessage?: string,
): FormState {
  if (result.ok) return successMessage ? { ok: true, message: successMessage } : { ok: true };
  return { ok: false, message: result.message };
}
