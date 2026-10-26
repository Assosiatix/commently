import { after, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { syncStore } from "@/lib/shopify";

export const maxDuration = 60;

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { storeId } = (await req.json().catch(() => ({}))) as { storeId?: string };
  const store = await db.shopifyStore.findFirst({ where: { id: storeId, userId, status: "connected" } });
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });
  if (store.syncStatus === "syncing" && store.syncStartedAt && Date.now() - store.syncStartedAt.getTime() < 2 * 60_000) return NextResponse.json({ ok: true, already: true });
  await db.shopifyStore.update({ where: { id: store.id }, data: { syncStatus: "syncing" } });
  after(async () => { await syncStore(store.id); });
  return NextResponse.json({ ok: true });
}
