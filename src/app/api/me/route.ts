import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { firstError, profileSchema } from "@/lib/validation";

export async function PATCH(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = profileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  const { name, goal, onboarded } = parsed.data;
  await db.user.update({
    where: { id: userId },
    data: { ...(name !== undefined && { name: name || null }), ...(goal && { goal }), ...(onboarded && { onboardedAt: new Date() }) },
  });
  return NextResponse.json({ ok: true });
}
