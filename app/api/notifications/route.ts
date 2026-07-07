import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scope = new URL(req.url).searchParams.get("scope");
  const unread = await db.notification.count({ where: { userId, readAt: null } });
  if (scope === "count") return NextResponse.json({ unread });

  const items = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      href: true,
      readAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ unread, items });
}

const patchSchema = z.object({
  ids: z.array(z.string().min(1)).max(50).optional(),
  all: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let parsed: z.infer<typeof patchSchema>;
  try {
    parsed = patchSchema.parse(await req.json());
  } catch (e) {
    logError("notifications.patch", e, { userId });
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!parsed.all && (!parsed.ids || parsed.ids.length === 0)) {
    return NextResponse.json({ error: "Nothing to mark read" }, { status: 400 });
  }

  await db.notification.updateMany({
    where: {
      userId, // ownership check: users can only touch their own rows
      readAt: null,
      ...(parsed.all ? {} : { id: { in: parsed.ids } }),
    },
    data: { readAt: new Date() },
  });
  const unread = await db.notification.count({ where: { userId, readAt: null } });
  return NextResponse.json({ ok: true, unread });
}
