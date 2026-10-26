import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/crypto";
import { retryPendingEvents } from "@/lib/webhook-inbox";

export const maxDuration = 60;

// Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically when CRON_SECRET is set.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const got = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(got, `Bearer ${secret}`)) return new Response("Unauthorized", { status: 401 });
  return NextResponse.json(await retryPendingEvents());
}
