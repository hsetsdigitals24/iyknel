import Link from "next/link";
import type { QuoteStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClickableRow } from "@/components/clickable-row";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUSES: QuoteStatus[] = ["PENDING", "RESPONDED", "CLOSED"];

export default async function AdminQuotesPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const statusParam = searchParams.status?.toUpperCase();
  const status = (STATUSES as string[]).includes(statusParam ?? "")
    ? (statusParam as QuoteStatus)
    : undefined;

  const quotes = await db.quoteRequest.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { businessName: { contains: q, mode: "insensitive" } },
              { contactName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <div className="space-y-6">
      <header>
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Quotes</span>
        <h1 className="font-serif text-3xl">Quote requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Public requests from the /quote form. Reply directly to send the customer an email.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2 text-sm">
        <Chip href={qsHref({ q })} active={!status} label="All" />
        {STATUSES.map((s) => (
          <Chip
            key={s}
            href={qsHref({ status: s, q })}
            active={status === s}
            label={s.toLowerCase()}
          />
        ))}
      </nav>

      <form className="flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search by business, contact, or email"
          className="max-w-sm"
        />
        <Button variant="outline" type="submit">
          Search
        </Button>
        {(q || status) && (
          <Button asChild variant="ghost">
            <Link href="/admin/quotes">Clear</Link>
          </Button>
        )}
      </form>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No matching quote requests.
                </TableCell>
              </TableRow>
            ) : (
              quotes.map((qr) => (
                <ClickableRow key={qr.id} href={`/admin/quotes/${qr.id}`}>
                  <TableCell>
                    <Link
                      href={`/admin/quotes/${qr.id}`}
                      className="font-medium hover:underline"
                    >
                      {qr.businessName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{qr.contactName}</TableCell>
                  <TableCell className="text-muted-foreground">{qr.email}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {qr.createdAt.toLocaleDateString("en-NG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={qr.status} />
                  </TableCell>
                </ClickableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function qsHref(params: { status?: QuoteStatus; q?: string }) {
  const p = new URLSearchParams();
  if (params.status) p.set("status", params.status);
  if (params.q) p.set("q", params.q);
  const qs = p.toString();
  return `/admin/quotes${qs ? `?${qs}` : ""}`;
}

function Chip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-primary px-3 py-1 text-primary-foreground"
          : "rounded-full border px-3 py-1 capitalize text-muted-foreground hover:bg-secondary hover:text-foreground"
      }
    >
      {label}
    </Link>
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
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles[status]}`}
    >
      {status.toLowerCase()}
    </span>
  );
}
