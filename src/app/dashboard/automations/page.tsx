import { Workflow, Plus } from "lucide-react";
import Link from "next/link";
import AutomationRow from "@/components/AutomationRow";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { db } from "@/lib/db";
import { PLANS, unlimited } from "@/lib/plans";
import { requireUser } from "@/lib/session";
import { getAutomationStats } from "@/lib/stats";

export const metadata = { title: "Automations" };
const ZERO = { triggers: 0, dms: 0, failed: 0, replied: 0, followUps: 0 };

export default async function Automations() {
  const user = await requireUser();
  const [list, stats] = await Promise.all([
    db.automation.findMany({ where: { userId: user.id }, include: { account: { select: { username: true } } }, orderBy: { createdAt: "desc" } }),
    getAutomationStats(user.id),
  ]);
  const plan = PLANS[user.plan];
  const atLimit = !unlimited(plan.automations) && list.length >= plan.automations;
  return (
    <>
      <PageHeader title="Automations" description={`${list.length}${unlimited(plan.automations) ? "" : ` of ${plan.automations}`} automations on the ${plan.name} plan.`}>
        {atLimit ? <Button asChild variant="outline"><Link href="/dashboard/billing">Upgrade to add more</Link></Button> : <Button asChild><Link href="/dashboard/automations/new"><Plus /> New automation</Link></Button>}
      </PageHeader>
      <div className="space-y-4">
        {list.map((a) => (
          <AutomationRow key={a.id} a={{ id: a.id, name: a.name, type: a.type, enabled: a.enabled, username: a.account.username, keywords: a.keywords, matchType: a.matchType, mediaPermalink: a.mediaPermalink, mediaThumbUrl: a.mediaThumbUrl, hasFollowUp: !!a.followUpText, stats: stats.get(a.id) ?? ZERO }} />
        ))}
        {!list.length && (
          <EmptyState icon={Workflow} title="No automations yet" text="An automation watches your comments for a keyword and sends the DM you wrote, with an optional follow-up once they reply.">
            <Button asChild><Link href="/dashboard/automations/new"><Plus /> Create your first automation</Link></Button>
          </EmptyState>
        )}
      </div>
    </>
  );
}
