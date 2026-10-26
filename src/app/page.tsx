import { ArrowRight, BellRing, Check, Fingerprint, Gauge, Layers, MessageSquareReply, Repeat2, ShieldCheck, Target } from "lucide-react";
import Link from "next/link";
import { BarChart, Legend } from "@/components/dashboard/widgets";
import Faq from "@/components/landing/Faq";
import HeroDemo from "@/components/landing/HeroDemo";
import { Reveal } from "@/components/landing/Reveal";
import UseCases from "@/components/landing/UseCases";
import { Logo } from "@/components/Logo";
import PlanCards from "@/components/PlanCards";
import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { getSessionUserId } from "@/lib/session";
import { appName } from "@/lib/utils";

const NAV = [["How it works", "#how"], ["Features", "#features"], ["Pricing", "#pricing"], ["FAQ", "#faq"]];

// Illustrative numbers for the preview card only (labelled "Sample data" on the page).
const SAMPLE = Array.from({ length: 14 }, (_, i) => ({ label: `D${i + 1}`, dms: [12, 18, 15, 26, 31, 22, 17, 29, 38, 44, 36, 28, 41, 52][i], followUps: [4, 7, 6, 11, 13, 9, 6, 12, 17, 20, 15, 11, 18, 24][i] }));

export default async function Home() {
  const name = appName();
  const signedIn = !!(await getSessionUserId());
  return (
    <div className="overflow-x-clip">
      {/* header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Logo name={name} />
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            {NAV.map(([l, h]) => <a key={h} href={h} className="transition-colors hover:text-foreground">{l}</a>)}
          </nav>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            {signedIn ? <Button asChild><Link href="/dashboard">Dashboard</Link></Button> : (<><Button asChild variant="ghost" className="hidden sm:inline-flex"><Link href="/login">Log in</Link></Button><Button asChild><Link href="/signup">Get started</Link></Button></>)}
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="grain relative">
        <div className="dotgrid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" aria-hidden />
        <div className="container relative grid items-center gap-16 py-16 sm:py-24 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 text-xs font-medium animate-pop-in"><ShieldCheck className="h-3.5 w-3.5 text-success" /> Built on the official Instagram API</p>
            <h1 className="mt-6 font-display text-[3.4rem] leading-[0.98] sm:text-7xl lg:text-[5.6rem] animate-fade-up">
              Every comment,<br />answered like <em className="text-primary">you were there.</em>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground animate-fade-up [animation-delay:120ms]">
              When someone comments your keyword, {name} replies under the post, sends them a DM, and follows up the moment they answer. Then it shows you exactly who replied and what was sent.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3 animate-fade-up [animation-delay:220ms]">
              <Button asChild size="lg"><Link href={signedIn ? "/dashboard" : "/signup"}>{signedIn ? "Open dashboard" : "Start free"} <ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="outline"><a href="#how">See how it works</a></Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground animate-fade-up [animation-delay:320ms]">
              {["Free plan, no card", "No password sharing", "Disconnect any time"].map((t) => <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />{t}</li>)}
            </ul>
          </div>
          <div className="animate-fade-up [animation-delay:200ms]"><HeroDemo /></div>
        </div>
      </section>

      {/* how */}
      <section id="how" className="border-y bg-card/50 py-24">
        <div className="container">
          <Reveal className="max-w-2xl"><p className="text-sm font-medium text-primary">How it works</p><h2 className="mt-3 font-display text-5xl leading-none sm:text-6xl">Three steps. About five minutes.</h2></Reveal>
          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {[
              ["01", "Connect Instagram", "Sign in on Instagram’s own page with a Business or Creator account. We never see your password."],
              ["02", "Write the rule", "Choose a post, a keyword, the DM, and an optional follow-up. A live preview shows exactly what people will see."],
              ["03", "Watch it work", "Every DM, reply and follow-up lands in your dashboard, so you know who answered and what to improve."],
            ].map(([n, t, d], i) => (
              <Reveal key={n} delay={i * 100}>
                <p className="font-display text-7xl leading-none text-primary/90">{n}</p>
                <h3 className="mt-4 text-xl font-semibold">{t}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* features */}
      <section id="features" className="py-24">
        <div className="container">
          <Reveal className="max-w-2xl"><p className="text-sm font-medium text-primary">Features</p><h2 className="mt-3 font-display text-5xl leading-none sm:text-6xl">Everything between a comment and a conversation.</h2></Reveal>
          <div className="mt-14 grid gap-4 md:grid-cols-6">
            <Reveal className="md:col-span-4">
              <div className="h-full rounded-2xl border bg-card p-7">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="mt-4 text-xl font-semibold">Keyword triggers that behave</h3>
                <p className="mt-2 max-w-lg text-muted-foreground">Match when a comment contains a word, is exactly a word, or fires on every comment. Case, spacing and accents are handled for you.</p>
                <div className="mt-6 flex flex-wrap gap-2">{["guide", "price", "link", "ready", "enter", "info"].map((k) => <span key={k} className="rounded-full border bg-background px-3.5 py-1.5 font-mono text-sm">{k}</span>)}</div>
              </div>
            </Reveal>
            <Reveal className="md:col-span-2" delay={80}>
              <div className="h-full rounded-2xl border bg-ink p-7 text-background">
                <Layers className="h-5 w-5 text-primary" />
                <h3 className="mt-4 text-xl font-semibold">One post or all of them</h3>
                <p className="mt-2 text-background/70">Pick a specific reel for a giveaway, or run a default rule across your whole profile.</p>
              </div>
            </Reveal>
            <Reveal className="md:col-span-2">
              <div className="h-full rounded-2xl border bg-card p-7">
                <MessageSquareReply className="h-5 w-5 text-primary" />
                <h3 className="mt-4 text-xl font-semibold">Follow-ups after a reply</h3>
                <p className="mt-2 text-muted-foreground">Ask for a tiny “YES”, then deliver the link automatically. It is the sequence Instagram’s rules are built around.</p>
              </div>
            </Reveal>
            <Reveal className="md:col-span-2" delay={80}>
              <div className="h-full rounded-2xl border bg-card p-7">
                <Repeat2 className="h-5 w-5 text-primary" />
                <h3 className="mt-4 text-xl font-semibold">Public replies, varied</h3>
                <p className="mt-2 text-muted-foreground">Write several replies and one is picked at random, so your comments never look copy-pasted.</p>
              </div>
            </Reveal>
            <Reveal className="md:col-span-2" delay={160}>
              <div className="h-full rounded-2xl border bg-card p-7">
                <Gauge className="h-5 w-5 text-primary" />
                <h3 className="mt-4 text-xl font-semibold">Conversation tracking</h3>
                <p className="mt-2 text-muted-foreground">See who got a DM, who replied, whether the follow-up went out, and your reply rate per automation.</p>
              </div>
            </Reveal>
            <Reveal className="md:col-span-3">
              <div className="h-full rounded-2xl border bg-card p-7">
                <Fingerprint className="h-5 w-5 text-primary" />
                <h3 className="mt-4 text-xl font-semibold">Never double-sends</h3>
                <p className="mt-2 text-muted-foreground">Instagram sometimes delivers an event twice. Each comment is locked to one DM, with an optional “once per person” rule on top.</p>
              </div>
            </Reveal>
            <Reveal className="md:col-span-3" delay={80}>
              <div className="h-full rounded-2xl border bg-card p-7">
                <BellRing className="h-5 w-5 text-primary" />
                <h3 className="mt-4 text-xl font-semibold">Nothing gets lost</h3>
                <p className="mt-2 text-muted-foreground">Every webhook is stored before we answer Instagram and retried if something fails. You can inspect each delivery.</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* dashboard preview */}
      <section className="border-y bg-card/50 py-24">
        <div className="container grid items-center gap-14 lg:grid-cols-[.8fr_1.2fr]">
          <Reveal>
            <p className="text-sm font-medium text-primary">The dashboard</p>
            <h2 className="mt-3 font-display text-5xl leading-none sm:text-6xl">Know what every comment turned into.</h2>
            <p className="mt-5 text-lg text-muted-foreground">DMs sent, people who replied, follow-ups delivered, and anything that failed, per day and per automation. No spreadsheet required.</p>
            <ul className="mt-6 space-y-2.5 text-sm">{["Reply rate for each automation", "Plain-English reasons for every skipped or failed message", "Usage meter so the monthly limit never surprises you"].map((t) => <li key={t} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{t}</li>)}</ul>
          </Reveal>
          <Reveal delay={120}>
            <div className="rounded-2xl border bg-background p-5 shadow-xl sm:p-6">
              <div className="grid grid-cols-3 gap-3">
                {[["First DMs", "469"], ["Replied", "212"], ["Follow-ups", "174"]].map(([l, v]) => <div key={l} className="rounded-xl border bg-card p-3.5"><p className="text-xs text-muted-foreground">{l}</p><p className="font-display text-3xl tabular-nums leading-none mt-1.5">{v}</p></div>)}
              </div>
              <div className="mt-5 flex items-center justify-between"><p className="text-sm font-medium">Messages sent</p><Legend /></div>
              <div className="mt-4"><BarChart data={SAMPLE} /></div>
              <p className="mt-3 text-right text-[11px] text-muted-foreground">Sample data</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* use cases */}
      <section className="py-24">
        <div className="container">
          <Reveal className="max-w-2xl"><p className="text-sm font-medium text-primary">Made for</p><h2 className="mt-3 font-display text-5xl leading-none sm:text-6xl">Whatever people ask you in the comments.</h2></Reveal>
          <Reveal className="mt-10" delay={80}><UseCases /></Reveal>
        </div>
      </section>

      {/* pricing */}
      <section id="pricing" className="border-t bg-card/50 py-24">
        <div className="container">
          <Reveal className="mx-auto max-w-2xl text-center"><p className="text-sm font-medium text-primary">Pricing</p><h2 className="mt-3 font-display text-5xl leading-none sm:text-6xl">Start free. Pay when it earns its keep.</h2><p className="mt-4 text-muted-foreground">Simple monthly plans. Change or cancel whenever you like.</p></Reveal>
          <Reveal className="mt-14" delay={80}><PlanCards mode={{ kind: "landing" }} /></Reveal>
        </div>
      </section>

      {/* faq */}
      <section id="faq" className="py-24">
        <div className="container grid gap-12 lg:grid-cols-[.7fr_1.3fr]">
          <Reveal><p className="text-sm font-medium text-primary">FAQ</p><h2 className="mt-3 font-display text-5xl leading-none sm:text-6xl">Straight answers.</h2><p className="mt-4 text-muted-foreground">Including the things it can’t do.</p></Reveal>
          <Reveal delay={80}><Faq /></Reveal>
        </div>
      </section>

      {/* cta */}
      <section className="container pb-24">
        <Reveal>
          <div className="grain relative overflow-hidden rounded-3xl bg-ink px-6 py-16 text-center text-background sm:px-16 sm:py-20">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary" aria-hidden />
            <h2 className="relative mx-auto max-w-2xl font-display text-5xl leading-[1.02] sm:text-6xl">Your next comment is already waiting for a reply.</h2>
            <p className="relative mx-auto mt-5 max-w-md text-background/70">Connect Instagram and have your first automation live in about five minutes.</p>
            <Button asChild size="lg" className="relative mt-8"><Link href={signedIn ? "/dashboard" : "/signup"}>{signedIn ? "Open dashboard" : "Start free"} <ArrowRight /></Link></Button>
          </div>
        </Reveal>
      </section>

      <footer className="border-t">
        <div className="container flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <Logo name={name} />
          <nav className="flex gap-6"><Link href="/privacy" className="hover:text-foreground">Privacy</Link><Link href="/terms" className="hover:text-foreground">Terms</Link><Link href="/data-deletion" className="hover:text-foreground">Data deletion</Link></nav>
          <p>© {new Date().getFullYear()} {name}. Not affiliated with Instagram or Meta.</p>
        </div>
      </footer>
    </div>
  );
}
