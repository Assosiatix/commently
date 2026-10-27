import Link from "next/link";
import { BarChart } from "@/components/dashboard/widgets";
import AskAgent from "@/components/landing/AskAgent";
import CommentDemo from "@/components/landing/CommentDemo";
import Faq from "@/components/landing/Faq";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { PLAN_ORDER, PLANS, unlimited } from "@/lib/plan-data";
import { getSessionUserId } from "@/lib/session";
import { appName, cn } from "@/lib/utils";

// Everything is free for now. Flip this when paid plans launch; the section and nav link come back.
const SHOW_PRICING = false;

const NAV = [["How it works", "#how"], ...(SHOW_PRICING ? [["Pricing", "#pricing"]] : []), ["FAQ", "#faq"]];

// Illustrative numbers for the preview card only (labelled "Sample data" on the page).
const SAMPLE = Array.from({ length: 14 }, (_, i) => ({ label: `${i + 14} Oct`, dms: [12, 18, 15, 26, 31, 22, 17, 29, 38, 44, 36, 28, 41, 52][i], followUps: [4, 7, 6, 11, 13, 9, 6, 12, 17, 20, 15, 11, 18, 24][i] }));

// A real sequence, so it gets times instead of decorative numbers.
const TIMELINE = [
  ["0 sec", "They comment “how much?” on your reel.", "You were asleep, or busy, or on comment number 200. Doesn’t matter."],
  ["2 sec", "A reply shows up under their comment.", "Everyone scrolling sees you answered. Write a few versions and one is picked at random, so it never looks copy-pasted."],
  ["3 sec", "They get a DM with the answer.", "The price, the sizes in stock and a Buy button, taken from your Shopify products. Or your guide, your link, your discount code."],
  ["When they reply", "The follow-up goes out.", "Instagram only lets you send more after they answer, so the first DM asks a small question and the follow-up carries the link."],
  ["Later", "You see how it went.", "Who replied, who tapped Buy, and who asked something only a human should answer."],
];

const ASKED = [
  { q: "Do you have it in medium?", a: "Yes, Medium is in stock (3 left). It fits a 38 to 40 inch chest." },
  { q: "Is cash on delivery available?", a: "Yes, cash on delivery is available nationwide." },
  { q: "do you ship to Dubai?", flagged: true },
];

export default async function Home() {
  const name = appName();
  const signedIn = !!(await getSessionUserId());
  const cta = signedIn ? { href: "/dashboard", label: "Open dashboard" } : { href: "/signup", label: "Start free" };
  return (
    <div className="overflow-x-clip">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Logo name={name} />
          <div className="flex items-center gap-1 sm:gap-2">
            <nav className="mr-4 hidden items-center gap-7 text-sm font-medium text-graphite md:flex">
              {NAV.map(([l, h]) => <a key={h} href={h} className="transition-colors hover:text-foreground">{l}</a>)}
            </nav>
            <ThemeToggle />
            {signedIn ? <Button asChild><Link href="/dashboard">Dashboard</Link></Button> : (<><Button asChild variant="ghost" className="hidden sm:inline-flex"><Link href="/login">Log in</Link></Button><Button asChild><Link href="/signup">Start free</Link></Button></>)}
          </div>
        </div>
      </header>

      <main>
        {/* hero: the visitor comments on a reel and watches it get answered */}
        <section className="container grid items-center gap-12 pb-20 pt-10 md:pt-16 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:pb-32">
          <div className="max-w-xl">
            <h1 className="font-display text-[2.6rem] font-bold leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-[4.1rem]">
              Someone just commented “how much?” on your reel.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-graphite">
              {name} answers them under the post and in their DMs within seconds, with your real price and sizes. At 3 a.m., and on the 200th comment too.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Button asChild size="lg"><Link href={cta.href}>{cta.label}</Link></Button>
              {!signedIn && <p className="text-sm text-graphite">Free to use. No card needed.</p>}
            </div>
          </div>
          <div className="rounded-[32px] bg-coral-soft px-5 pb-8 pt-6 sm:px-10 sm:pb-10">
            <CommentDemo />
          </div>
        </section>

        {/* how it works, as the timeline it really is */}
        <section id="how" className="scroll-mt-20 border-t">
          <div className="container grid gap-10 py-20 md:py-28 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <h2 className="font-display text-3xl font-bold tracking-tight md:text-[2.75rem] md:leading-[1.08]">What happens after someone comments</h2>
              <p className="mt-4 max-w-sm text-base leading-relaxed text-graphite">Setting it up takes about five minutes: connect Instagram, pick a reel, write the messages.</p>
            </div>
            <ol>
              {TIMELINE.map(([time, title, text]) => (
                <li key={time} className="grid gap-1 border-b py-7 first:pt-0 last:border-0 sm:grid-cols-[150px_1fr] sm:gap-6">
                  <span className="font-display text-sm font-semibold text-coral sm:pt-1">{time}</span>
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
                    <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-graphite">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* the AI agent, in the language people actually comment in */}
        <section className="container">
          <div className="grid gap-10 rounded-[32px] bg-foreground px-6 py-14 text-background md:px-14 md:py-20 lg:grid-cols-2 lg:items-center">
            <div className="max-w-md">
              <h2 className="font-display text-3xl font-bold tracking-tight md:text-[2.75rem] md:leading-[1.08]">It answers the question they actually asked.</h2>
              <p className="mt-5 text-base leading-relaxed text-background/70 md:text-lg">Price, sizes, stock, delivery. The AI agent reads each comment, answers from your products and store notes, and replies in the customer’s own language. When it isn’t sure, it doesn’t guess. The comment comes to you instead.</p>
            </div>
            <ul className="space-y-5">
              {ASKED.map((m) => (
                <li key={m.q} className="space-y-2 text-[15px]">
                  <p className="w-fit rounded-2xl rounded-bl-md bg-background/10 px-4 py-2.5">{m.q}</p>
                  {m.flagged ? (
                    <p className="ml-auto w-fit rounded-2xl rounded-br-md border border-dashed border-coral px-4 py-2.5 text-coral">Not in your notes, so it’s waiting for you to answer.</p>
                  ) : (
                    <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-coral px-4 py-2.5 text-white">{m.a}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* honest scope, as questions the visitor asks the agent */}
        <section className="container py-20 md:py-28">
          <div className="mb-10 max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-[2.75rem] md:leading-[1.08]">Ask it what it won’t do.</h2>
            <p className="mt-4 text-base leading-relaxed text-graphite md:text-lg">Tap the question you’d ask before trusting anything with your Instagram. The agent answers straight, including the no’s.</p>
          </div>
          <AskAgent />
        </section>

        {/* dashboard */}
        <section className="border-y bg-surface">
          <div className="container grid items-center gap-12 py-20 md:py-28 lg:grid-cols-[.8fr_1.2fr]">
            <div className="max-w-md">
              <h2 className="font-display text-3xl font-bold tracking-tight md:text-[2.75rem] md:leading-[1.08]">Stop guessing which reel is selling.</h2>
              <p className="mt-5 text-base leading-relaxed text-graphite md:text-lg">See how many people got a DM, how many replied, and which post they came from. When a message fails, it tells you why in plain English, not an error code.</p>
            </div>
            <div className="rounded-3xl border bg-card p-5 shadow-card sm:p-7">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div><p className="text-sm text-graphite">Replied to your DMs, last 14 days</p><p className="mt-1 font-display text-4xl font-bold">212 <span className="text-base font-semibold text-success">45%</span></p></div>
              </div>
              <div className="mt-6"><BarChart data={SAMPLE} /></div>
              <p className="mt-3 text-right text-[11px] text-ash">Sample data</p>
            </div>
          </div>
        </section>

        {/* pricing as one comparison, not three floating cards */}
        {SHOW_PRICING && (
        <section id="pricing" className="container scroll-mt-20 py-20 md:py-28">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-[2.75rem] md:leading-[1.08]">Free until it’s earning for you</h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-graphite">Every plan has follow-ups, follow checks, buttons and the activity log. Change or cancel any month.</p>
          <div className="mt-10 grid overflow-hidden rounded-[28px] border md:grid-cols-3">
            {PLAN_ORDER.map((id, i) => {
              const p = PLANS[id];
              const pick = id === "PRO";
              return (
                <div key={id} className={cn("flex flex-col p-7 md:p-8", i > 0 && "border-t md:border-l md:border-t-0", pick && "bg-coral-soft")}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-xl font-semibold">{p.name}</h3>
                    {pick && <span className="text-sm font-medium text-coral">Most shops start here</span>}
                  </div>
                  <p className="mt-1 text-sm text-graphite">{p.blurb}</p>
                  <p className="mt-6 font-display text-5xl font-bold tabular-nums">${p.price}<span className="ml-1 font-sans text-sm font-normal text-graphite">a month</span></p>
                  <dl className="mt-6 flex-1 space-y-2.5 text-[15px]">
                    {[["DMs a month", p.dms.toLocaleString("en")], ["AI answers", p.aiReplies.toLocaleString("en")], ["Instagram accounts", String(p.accounts)], ["Automations", unlimited(p.automations) ? "Unlimited" : String(p.automations)]].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4"><dt className="text-graphite">{k}</dt><dd className="font-semibold tabular-nums">{v}</dd></div>
                    ))}
                  </dl>
                  <Button asChild size="lg" variant={pick ? "default" : "outline"} className="mt-8 w-full"><Link href="/signup">{p.price ? `Start with ${p.name}` : "Start free"}</Link></Button>
                </div>
              );
            })}
          </div>
        </section>
        )}

        <section id="faq" className="container grid scroll-mt-20 gap-10 pb-20 pt-20 md:pb-28 md:pt-28 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-[2.75rem] md:leading-[1.08]">Questions people ask first</h2>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-graphite">Including the things it can’t do.</p>
          </div>
          <Faq />
        </section>

        <section className="container pb-20 md:pb-28">
          <div className="flex flex-col items-start justify-between gap-8 rounded-[32px] bg-coral-soft px-6 py-12 md:flex-row md:items-center md:px-14 md:py-14">
            <h2 className="max-w-xl font-display text-3xl font-bold tracking-tight md:text-4xl">Your next comment is already waiting for an answer.</h2>
            <Button asChild size="lg"><Link href={cta.href}>{cta.label}</Link></Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container flex flex-col items-start justify-between gap-4 py-8 text-sm text-graphite sm:flex-row sm:items-center">
          <Logo name={name} />
          <nav className="flex gap-6 font-medium"><Link href="/privacy" className="hover:text-foreground">Privacy</Link><Link href="/terms" className="hover:text-foreground">Terms</Link><Link href="/data-deletion" className="hover:text-foreground">Data deletion</Link></nav>
          <p className="text-ash">© {new Date().getFullYear()} {name}. Not affiliated with Instagram or Meta.</p>
        </div>
      </footer>
    </div>
  );
}
