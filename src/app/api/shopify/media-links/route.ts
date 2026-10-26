import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

const putSchema = z.object({
  accountId: z.string().min(1),
  mediaId: z.string().min(1),
  mediaPermalink: z.string().nullable().optional(),
  mediaThumbUrl: z.string().nullable().optional(),
  productIds: z.array(z.string()).max(20),
});

// Which products each reel/post promotes, for one Instagram account.
export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const accountId = new URL(req.url).searchParams.get("accountId") ?? "";
  const rows = await db.mediaProduct.findMany({ where: { accountId, account: { userId } }, orderBy: { position: "asc" }, select: { mediaId: true, productId: true } });
  const links: Record<string, string[]> = {};
  for (const r of rows) (links[r.mediaId] ??= []).push(r.productId);
  return NextResponse.json({ links });
}

// Replaces the full product set of one reel/post (empty list = unlink).
export async function PUT(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const d = parsed.data;
  const account = await db.igAccount.findFirst({ where: { id: d.accountId, userId } });
  if (!account) return NextResponse.json({ error: "Instagram account not found" }, { status: 404 });
  const ids = [...new Set(d.productIds)];
  const owned = await db.product.findMany({ where: { id: { in: ids }, store: { userId } }, select: { id: true } });
  if (owned.length !== ids.length) return NextResponse.json({ error: "Unknown product" }, { status: 400 });

  await db.$transaction([
    db.mediaProduct.deleteMany({ where: { accountId: account.id, mediaId: d.mediaId } }),
    ...ids.map((productId, position) => db.mediaProduct.create({ data: { accountId: account.id, mediaId: d.mediaId, productId, position, mediaPermalink: d.mediaPermalink ?? null, mediaThumbUrl: d.mediaThumbUrl ?? null } })),
  ]);
  return NextResponse.json({ ok: true, count: ids.length });
}
