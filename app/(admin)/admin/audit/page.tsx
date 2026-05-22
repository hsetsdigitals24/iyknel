import Link from "next/link";
import type { AuditLog } from "@prisma/client";
import { db } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClickableRow } from "@/components/clickable-row";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: { actor?: string; action?: string };
}) {
  const actor = searchParams.actor?.trim() ?? "";
  const action = searchParams.action?.trim() ?? "";

  type AuditLogRow = AuditLog & {
    actor: { email: string } | null;
    order: { id: string; number: string } | null;
  };

  const logs: AuditLogRow[] = await db.auditLog.findMany({
    where: {
      ...(action ? { action: { startsWith: action } } : {}),
      ...(actor
        ? { actor: { email: { contains: actor, mode: "insensitive" } } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: true, order: { select: { id: true, number: true } } },
  });

  return (
    <div className="space-y-6">
      <header>
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Audit
        </span>
        <h1 className="font-serif text-3xl">Activity log</h1>
        <p className="text-sm text-muted-foreground">
          Last 100 events. Filter by actor email or action prefix (e.g. <code>order.</code>).
        </p>
      </header>

      <form className="flex flex-wrap gap-2">
        <Input
          name="actor"
          defaultValue={actor}
          placeholder="Actor email"
          className="max-w-xs"
        />
        <Input
          name="action"
          defaultValue={action}
          placeholder="Action prefix"
          className="max-w-xs"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
        {(actor || action) && (
          <Button asChild variant="ghost">
            <Link href="/admin/audit">Clear</Link>
          </Button>
        )}
      </form>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No matching events.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((l) => {
                const cells = (
                  <>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {l.createdAt.toLocaleString("en-NG", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {l.actor?.email ?? "system"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{l.action}</Badge>
                  </TableCell>
                  <TableCell>
                    {l.order ? (
                      <Link
                        href={`/admin/orders/${l.order.id}`}
                        className="text-sm hover:underline"
                      >
                        {l.order.number}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="max-w-md text-xs text-muted-foreground">
                    {l.detail ? (
                      <code className="line-clamp-2 break-all">
                        {JSON.stringify(l.detail)}
                      </code>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </>
                );
                return l.order ? (
                  <ClickableRow key={l.id} href={`/admin/orders/${l.order.id}`}>
                    {cells}
                  </ClickableRow>
                ) : (
                  <TableRow key={l.id}>{cells}</TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
