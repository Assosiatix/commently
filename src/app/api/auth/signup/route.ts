import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { credsSchema, firstError } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  if (!rateLimit(`signup:${clientIp(req)}`, 10, 60 * 60 * 1000)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const parsed = credsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  const { email, password, name } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  const user = await db.user.create({ data: { email, name: name || null, passwordHash: await bcrypt.hash(password, 12) } });
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
