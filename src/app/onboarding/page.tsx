import { redirect } from "next/navigation";
import OnboardingWizard from "@/components/OnboardingWizard";
import { db } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import { requireUser } from "@/lib/session";
import { appName } from "@/lib/utils";

export const metadata = { title: "Set up your account" };

export default async function Onboarding() {
  const user = await requireUser();
  if (user.onboardedAt) redirect("/dashboard");
  const [accounts, automations] = await Promise.all([
    db.igAccount.findMany({ where: { userId: user.id }, select: { id: true, username: true, webhookSubscribed: true, profilePictureUrl: true } }),
    db.automation.count({ where: { userId: user.id } }),
  ]);
  const step = !user.goal ? 0 : !accounts.length ? 1 : !automations ? 2 : 3;
  return <OnboardingWizard appName={appName()} initialStep={step} name={user.name ?? ""} goal={user.goal} accounts={accounts} canFollowUp={PLANS[user.plan].followUps} />;
}
