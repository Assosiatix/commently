import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/ratelimit";

// Precomputed hash so unknown emails cost the same time as wrong passwords.
const DUMMY = "$2a$12$C6UzMDM.H6dfI/f/IKcEeOe6JQ0v7iJwq1CtcdBGRPhqsbbVpIQCm";

export async function POST(req: Request) {
  const parsed = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password" }, { status: 400 });
  const { email, password } = parsed.data;
  if (!rateLimit(`login:${clientIp(req)}:${email}`, 8, 15 * 60 * 1000)) return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  const user = await db.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY);
  if (!user || !ok) return NextResponse.json({ error: "Wrong email or password" }, { status: 401 });
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
