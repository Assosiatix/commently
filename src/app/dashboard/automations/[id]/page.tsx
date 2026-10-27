import { notFound } from "next/navigation";
import AutomationForm from "@/components/AutomationForm";
import { PageHeader } from "@/components/ui/misc";
import { db } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import { asButtons } from "@/lib/automation-data";
import { isMerchant } from "@/lib/admin";
import { aiConfigured } from "@/lib/ai";
import { loadUserMediaProducts } from "@/lib/catalog";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Edit automation" };

export default async function EditAutomation({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const a = await db.automation.findFirst({ where: { id, userId: user.id } });
  if (!a) notFound();
  const accounts = await db.igAccount.findMany({ where: { userId: user.id }, select: { id: true, username: true, profilePictureUrl: true } });
  const { byMedia, shopifyConnected } = await loadUserMediaProducts(user.id);
  return (
    <>
      <PageHeader title={a.name} description="Edit this automation. Changes apply to new comments straight away." />
      <AutomationForm
        accounts={accounts}
        canFollowUp={PLANS[user.plan].followUps}
        mediaProducts={byMedia}
        shopifyConnected={shopifyConnected} aiAvailable={aiConfigured()} showProducts={isMerchant(user.goal, shopifyConnected)}
        initial={{ id: a.id, name: a.name, accountId: a.accountId, mediaId: a.mediaId, mediaPermalink: a.mediaPermalink, mediaThumbUrl: a.mediaThumbUrl, matchType: a.matchType, keywords: a.keywords, dmText: a.dmText, publicReplies: a.publicReplies, oncePerUser: a.oncePerUser, enabled: a.enabled, followUpText: a.followUpText ?? "", followUpButtons: asButtons(a.followUpButtons), dmButtons: asButtons(a.dmButtons), dmQuickReply: a.dmQuickReply ?? "", requireFollow: a.requireFollow, productButtons: a.productButtons, type: a.type, questionsOnly: a.questionsOnly, aiInstructions: a.aiInstructions ?? "", followGateText: a.followGateText ?? "Looks like you're not following us yet. Follow, then tap the button below and I'll send it right away!", followGateButton: a.followGateButton ?? "I'm following" }}
      />
    </>
  );
}
