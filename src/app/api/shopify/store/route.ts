import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

// Disconnect: forget the token and all synced products and mappings. The merchant can also uninstall from Shopify admin.
export async function DELETE(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const r = await db.shopifyStore.deleteMany({ where: { id, userId } });
  return r.count ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

// Store-wide knowledge for the AI agents (delivery, COD, returns, size guide), written once.
export async function PATCH(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ id: z.string().min(1), notes: z.string().max(3000) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Notes can be up to 3000 characters" }, { status: 400 });
  const r = await db.shopifyStore.updateMany({ where: { id: parsed.data.id, userId }, data: { notes: parsed.data.notes.trim() || null } });
  return r.count ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
