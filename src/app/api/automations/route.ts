import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toAutomationData } from "@/lib/automation-data";
import { PLANS, PRICING_ENABLED } from "@/lib/plans";
import { getSessionUserId } from "@/lib/session";
import { automationSchema, firstError } from "@/lib/validation";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = automationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  const d = parsed.data;
  const account = await db.igAccount.findFirst({ where: { id: d.accountId, userId } });
  if (!account) return NextResponse.json({ error: "Instagram account not found" }, { status: 404 });

  const me = await db.user.findUnique({ where: { id: userId }, select: { plan: true } });
  const plan = PLANS[me?.plan ?? "FREE"];
  if (d.followUpText?.trim() && !plan.followUps) return NextResponse.json({ error: PRICING_ENABLED ? "Follow-up DMs need the Creator plan or higher." : "Follow-up DMs aren’t available on this account." }, { status: 403 });
  if ((await db.automation.count({ where: { userId } })) >= plan.automations) return NextResponse.json({ error: PRICING_ENABLED ? `Your ${plan.name} plan allows ${plan.automations} automations. Upgrade to add more.` : `You can have up to ${plan.automations} automations. Delete one to add another.` }, { status: 403 });
  const a = await db.automation.create({
    data: {
      userId,
      accountId: account.id,
      ...toAutomationData(d),
      enabled: d.enabled ?? true,
    },
  });
  return NextResponse.json({ id: a.id });
}
