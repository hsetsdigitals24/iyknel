import Link from "next/link";
import { notFound } from "next/navigation";
import type { QuoteStatus } from "@prisma/client";
import { ArrowLeft, Mail, Phone, RotateCcw } from "lucide-react";

import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";

import { ReplyPanel } from "./reply-panel";
import { reopenQuoteAction } from "../actions";

function formatDateTime(d: Date) {
  return d.toLocaleString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminQuoteDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const quote = await db.quoteRequest.findUnique({
    where: { id: params.id },
    include: { respondedBy: { select: { name: true, email: true } } },
  });
  if (!quote) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/quotes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All quotes
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Quote</span>
          <h1 className="font-serif text-3xl">{quote.businessName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submitted {formatDateTime(quote.createdAt)}
          </p>
        </div>
        <StatusPill status={quote.status} />
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Customer message */}
          <section className="space-y-2 rounded-2xl border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Customer message
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{quote.message}</p>
          </section>

          {/* Reply / status */}
          {quote.status === "PENDING" ? (
            <ReplyPanel
              id={quote.id}
              defaultSubject={`Re: Quote request — ${quote.businessName}`}
            />
          ) : quote.status === "RESPONDED" ? (
            <section className="space-y-3 rounded-2xl border bg-card p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Reply sent
              </h2>
              <p className="text-xs text-muted-foreground">
                Sent {quote.respondedAt ? formatDateTime(quote.respondedAt) : "—"}
                {quote.respondedBy?.name ? ` by ${quote.respondedBy.name}` : ""}
              </p>
              <div className="whitespace-pre-wrap rounded-md bg-surface-muted/60 p-4 text-sm leading-relaxed">
                {quote.responseBody}
              </div>
              <form action={reopenQuoteAction}>
                <input type="hidden" name="id" value={quote.id} />
                <Button type="submit" variant="outline" size="sm">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reopen to send another reply
                </Button>
              </form>
            </section>
          ) : (
            <section className="space-y-3 rounded-2xl border bg-card p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Closed without reply
              </h2>
              <p className="text-xs text-muted-foreground">
                Closed {quote.closedAt ? formatDateTime(quote.closedAt) : "—"}
              </p>
              {quote.closedReason && (
                <p className="text-sm text-muted-foreground">{quote.closedReason}</p>
              )}
              <form action={reopenQuoteAction}>
                <input type="hidden" name="id" value={quote.id} />
                <Button type="submit" variant="outline" size="sm">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reopen
                </Button>
              </form>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <section className="space-y-3 rounded-2xl border bg-card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Contact
            </h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Business</dt>
                <dd className="font-medium">{quote.businessName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Contact person</dt>
                <dd>{quote.contactName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd>
                  <a
                    href={`mailto:${quote.email}`}
                    className="inline-flex items-center gap-1 hover:text-primary"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {quote.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Phone</dt>
                <dd>
                  <a
                    href={`tel:${quote.phone}`}
                    className="inline-flex items-center gap-1 hover:text-primary"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {quote.phone}
                  </a>
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: QuoteStatus }) {
  const styles: Record<QuoteStatus, string> = {
    PENDING: "bg-amber-100 text-amber-900",
    RESPONDED: "bg-emerald-100 text-emerald-900",
    CLOSED: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${styles[status]}`}
    >
      {status.toLowerCase()}
    </span>
  );
}
