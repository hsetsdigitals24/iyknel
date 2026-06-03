import Link from "next/link";
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
import { ClickableRow } from "@/components/clickable-row";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const customers = await db.user.findMany({
    where: {
      role: "CUSTOMER",
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { business: { name: { contains: q, mode: "insensitive" } } },
              { business: { contactName: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      business: true,
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <header>
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Customers
        </span>
        <h1 className="font-serif text-3xl">Businesses</h1>
      </header>

      <form className="flex gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search by business, contact or email"
          className="max-w-md"
        />
        <Button variant="outline" type="submit">
          Search
        </Button>
        {q && (
          <Button asChild variant="ghost">
            <Link href="/admin/customers">Clear</Link>
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
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No customers found.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c) => (
                <ClickableRow key={c.id} href={`/admin/customers/${c.id}`}>
                  <TableCell>
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="font-medium hover:underline"
                    >
                      {c.business?.name ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.business?.contactName ?? c.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.business?.phone ?? c.phone ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{c._count.orders}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.createdAt.toLocaleDateString("en-NG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
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
