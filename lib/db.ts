import { PrismaClient, Prisma } from "@prisma/client";

// Transient connection failures we should retry rather than surface as a 500.
// The remote (Prisma Postgres) link occasionally drops/times out; a short
// backoff almost always recovers on the next attempt.
const RETRYABLE_CODES = new Set([
  "P1001", // Can't reach database server
  "P1002", // Database server reached but timed out
  "P1008", // Operation timed out
  "P1017", // Server has closed the connection
  "P2024", // Timed out fetching a new connection from the pool
]);

function isRetryable(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    return RETRYABLE_CODES.has(e.code);
  }
  if (e instanceof Prisma.PrismaClientInitializationError) {
    return true; // can't establish the initial connection — worth retrying
  }
  if (e instanceof Prisma.PrismaClientUnknownRequestError) {
    return /closed the connection|connection timed out|timed out|reset by peer/i.test(
      e.message,
    );
  }
  return false;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MAX_ATTEMPTS = 4; // 1 try + 3 retries

function createPrisma() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  return base.$extends({
    query: {
      async $allOperations({ args, query }) {
        let lastError: unknown;
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            return await query(args);
          } catch (e) {
            lastError = e;
            if (!isRetryable(e) || attempt === MAX_ATTEMPTS) throw e;
            // exponential backoff: 150ms, 300ms, 600ms
            await sleep(150 * 2 ** (attempt - 1));
          }
        }
        throw lastError;
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrisma>;
};

export const db = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
