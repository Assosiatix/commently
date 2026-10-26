import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/crypto";
import { db } from "@/lib/db";
import { syncStore } from "@/lib/shopify";

export const maxDuration = 60;

// Daily safety net: webhooks can be missed and partial syncs need to finish. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || !safeEqual(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) return new Response("Unauthorized", { status: 401 });
  const stores = await db.shopifyStore.findMany({ where: { status: "connected" }, orderBy: { lastSyncAt: "asc" }, take: 10, select: { id: true } });
  const started = Date.now();
  let ok = 0;
  for (const s of stores) {
    if (Date.now() - started > 40_000) break;
    if ((await syncStore(s.id, 15_000)).ok) ok++;
  }
  return NextResponse.json({ stores: stores.length, ok });
}
