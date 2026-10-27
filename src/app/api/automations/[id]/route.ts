import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toAutomationData } from "@/lib/automation-data";
import { PLANS, PRICING_ENABLED } from "@/lib/plans";
import { getSessionUserId } from "@/lib/session";
import { automationPatchSchema, automationSchema, firstError } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const own = await db.automation.findFirst({ where: { id, userId } });
  if (!own) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Quick toggle: { enabled }
  const toggle = automationPatchSchema.safeParse(body);
  if (toggle.success) {
    await db.automation.update({ where: { id }, data: { enabled: toggle.data.enabled } });
    return NextResponse.json({ ok: true });
  }
  // Full edit
  const parsed = automationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  const d = parsed.data;
  const account = await db.igAccount.findFirst({ where: { id: d.accountId, userId } });
  if (!account) return NextResponse.json({ error: "Instagram account not found" }, { status: 404 });

  const me = await db.user.findUnique({ where: { id: userId }, select: { plan: true } });
  const plan = PLANS[me?.plan ?? "FREE"];
  if (d.followUpText?.trim() && !plan.followUps) return NextResponse.json({ error: PRICING_ENABLED ? "Follow-up DMs need the Creator plan or higher." : "Follow-up DMs aren’t available on this account." }, { status: 403 });
  const { type: _fixed, ...fields } = toAutomationData(d);
  await db.automation.update({
    where: { id },
    data: {
      accountId: account.id,
      ...fields, // type is fixed once created
      enabled: d.enabled ?? own.enabled,
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const r = await db.automation.deleteMany({ where: { id, userId } });
  return r.count ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
