import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

// Development-only plan switcher so limits can be tested before a payment provider is connected.
// Replace with a Stripe / Lemon Squeezy checkout + webhook that sets User.plan.
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Not available" }, { status: 404 });
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ plan: z.enum(["FREE", "PRO", "AGENCY"]) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  await db.user.update({ where: { id: userId }, data: { plan: parsed.data.plan } });
  return NextResponse.json({ ok: true });
}
