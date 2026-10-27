import { ArrowRight, Bot, Check, Gift } from "lucide-react";
import Link from "next/link";
import AutomationForm from "@/components/AutomationForm";
import { PageHeader } from "@/components/ui/misc";
import { isMerchant } from "@/lib/admin";
import { aiConfigured } from "@/lib/ai";
import { loadUserMediaProducts } from "@/lib/catalog";
import { db } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import { requireUser } from "@/lib/session";

export const metadata = { title: "New automation" };

const TYPES = [
  {
    key: "reward", icon: Gift, title: "Reward automation", tag: "Keyword to DM",
    text: "Someone comments your keyword and gets your offer in their DMs: a guide, a link, a giveaway entry or a discount.",
    points: ["You write every message", "Keyword, follow check, buttons and a final message", "Predictable: always sends exactly what you wrote"],
    best: "Lead magnets, giveaways, “comment LINK” posts",
  },
  {
    key: "agent", icon: Bot, title: "AI agent", tag: "Answers questions",
    text: "Reads each comment and answers the question (price, size, stock, delivery) from your products, then keeps chatting in the DM.",
    points: ["Uses your Shopify products and your store notes", "Replies in the customer’s own language", "Never guesses: unsure or angry people are flagged for you"],
    best: "Product reels where people ask “how much?”",
  },
] as const;

export default async function NewAutomation({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const user = await requireUser();
  const { type } = await searchParams;

  if (type !== "reward" && type !== "agent") {
    const ai = aiConfigured();
    return (
      <>
        <PageHeader title="New automation" description="Pick what this automation should do. You can run both on the same account: a keyword reward wins when its keyword is used, and the agent answers everything else on its post." />
        <div className="grid gap-5 md:grid-cols-2">
          {TYPES.map(({ key, icon: Icon, title, tag, text, points, best }) => (
            <Link key={key} href={`/dashboard/automations/new?type=${key}`} className="group flex flex-col rounded-3xl border bg-card p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover md:p-7">
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-coral-soft text-coral"><Icon className="h-5 w-5" /></span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-graphite">{tag}</span>
              </div>
              <h2 className="mt-5 font-display text-2xl font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              <ul className="mt-5 space-y-2 text-sm">{points.map((p) => <li key={p} className="flex gap-2.5"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background"><Check className="h-3 w-3" strokeWidth={3} /></span>{p}</li>)}</ul>
              <p className="mt-5 rounded-2xl bg-surface px-4 py-3 text-xs text-graphite"><b className="font-medium text-foreground">Best for:</b> {best}</p>
              {key === "agent" && !ai && <p className="mt-3 rounded-xl bg-warning-soft px-3 py-2 text-xs font-medium text-warning">AI is not configured on this server yet (GEMINI_API_KEY).</p>}
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground group-hover:text-coral">Set up <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </>
    );
  }

  const agent = type === "agent";
  const accounts = await db.igAccount.findMany({ where: { userId: user.id }, select: { id: true, username: true, profilePictureUrl: true } });
  const { byMedia, shopifyConnected } = await loadUserMediaProducts(user.id);
  return (
    <>
      <PageHeader title={agent ? "New AI agent" : "New reward automation"} description={agent ? "Choose a post, give the agent its knowledge, and test it with real questions. The preview updates as you go." : "Pick a starting point, then adjust everything on the left. The preview updates as you type."}>
        <Link href="/dashboard/automations/new" className="text-sm font-semibold text-graphite hover:text-coral">Change type</Link>
      </PageHeader>
      <AutomationForm accounts={accounts} canFollowUp={PLANS[user.plan].followUps} mediaProducts={byMedia} shopifyConnected={shopifyConnected} aiAvailable={aiConfigured()} showProducts={isMerchant(user.goal, shopifyConnected)} type={agent ? "AGENT" : "REWARD"} />
    </>
  );
}
