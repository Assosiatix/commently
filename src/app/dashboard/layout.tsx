import { redirect } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import { isAdmin, isMerchant } from "@/lib/admin";
import { db } from "@/lib/db";
import { dmsUsedThisMonth, PLANS } from "@/lib/plans";
import { requireUser } from "@/lib/session";
import { appName } from "@/lib/utils";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user.onboardedAt) redirect("/onboarding");
  const plan = PLANS[user.plan];
  const [used, stores] = await Promise.all([dmsUsedThisMonth(user.id), db.shopifyStore.count({ where: { userId: user.id, status: "connected" } })]);
  return (
    <div className="min-h-screen">
      <Sidebar appName={appName()} email={user.email} name={user.name} planName={plan.name} used={used} limit={plan.dms} isAdmin={isAdmin(user.email)} isMerchant={isMerchant(user.goal, stores > 0)} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
