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
    points: ["Uses your Shopify products and your store notes", "Replies in the language they wrote, Roman Urdu included", "Never guesses: unsure or angry people are flagged for you"],
    best: "Product reels where people ask “kitne ka hai?”",
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
            <Link key={key} href={`/dashboard/automations/new?type=${key}`} className="group flex flex-col rounded-2xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary"><Icon className="h-5 w-5" /></span>
                <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">{tag}</span>
              </div>
              <h2 className="mt-5 font-display text-3xl">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              <ul className="mt-5 space-y-2 text-sm">{points.map((p) => <li key={p} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{p}</li>)}</ul>
              <p className="mt-5 border-t pt-4 text-xs text-muted-foreground"><b className="font-medium text-foreground">Best for:</b> {best}</p>
              {key === "agent" && !ai && <p className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">AI is not configured on this server yet (GEMINI_API_KEY).</p>}
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary">Set up <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
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
        <Link href="/dashboard/automations/new" className="text-sm text-muted-foreground hover:text-foreground">Change type</Link>
      </PageHeader>
      <AutomationForm accounts={accounts} canFollowUp={PLANS[user.plan].followUps} mediaProducts={byMedia} shopifyConnected={shopifyConnected} aiAvailable={aiConfigured()} showProducts={isMerchant(user.goal, shopifyConnected)} type={agent ? "AGENT" : "REWARD"} />
    </>
  );
}
