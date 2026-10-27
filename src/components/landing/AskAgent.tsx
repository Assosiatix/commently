"use client";
import { Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import AgentFace, { type Mood } from "@/components/landing/AgentFace";
import { cn } from "@/lib/utils";

// "What it does, and what it won't" as a conversation: the visitor taps the question they
// actually have, and the same agent from the hero answers with a clear Yes or Never.

type Q = { q: string; verdict: "yes" | "never"; tag: string; a: string };

const QUESTIONS: Q[] = [
  { q: "Will you DM people who never commented?", verdict: "never", tag: "Never", a: "Every message starts with a comment on your own post. That keeps you inside Instagram’s rules." },
  { q: "Can you reply on just one reel?", verdict: "yes", tag: "Yes", a: "Pick one reel for a giveaway, or run a single rule across your whole profile." },
  { q: "Do you need my Instagram password?", verdict: "never", tag: "Never", a: "You log in on Instagram’s own page. I only get permission to read comments and send replies." },
  { q: "Will you follow up after they reply?", verdict: "yes", tag: "Yes", a: "One DM per comment, then the follow-up the moment they answer. That’s the order Instagram allows." },
  { q: "Will you use bots or scraping?", verdict: "never", tag: "Never", a: "Only the official Instagram API. Nothing that can get your account flagged." },
  { q: "Can you check they follow me first?", verdict: "yes", tag: "Yes, if you want", a: "Not following yet? They get a friendly nudge and a button to try again." },
  { q: "Will you make up a price?", verdict: "never", tag: "Never", a: "If it isn’t in your products or notes, I don’t guess. That comment comes to you instead." },
  { q: "What if Instagram sends a comment twice?", verdict: "yes", tag: "I answer once", a: "Each comment is locked to one DM, so nobody gets the same message twice." },
  { q: "What if a message fails?", verdict: "yes", tag: "I retry it", a: "Every event from Instagram is saved first and retried if it fails. You can see each one." },
];

export default function AskAgent() {
  const [asked, setAsked] = useState<number[]>([0]);
  const [pending, setPending] = useState<number | null>(null);
  const [mood, setMood] = useState<Mood>("idle");
  const thread = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: "smooth" }); }, [asked, pending]);

  function ask(i: number) {
    if (pending !== null || asked.includes(i)) return;
    timers.current.forEach(clearTimeout);
    const wait = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900;
    setPending(i);
    setMood("thinking");
    timers.current.push(setTimeout(() => {
      setAsked((a) => [...a, i]);
      setPending(null);
      setMood(QUESTIONS[i].verdict === "yes" ? "happy" : "idle");
    }, wait));
    timers.current.push(setTimeout(() => setMood("idle"), wait + 2200));
  }

  const left = QUESTIONS.length - asked.length;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
      {/* the questions: under the chat on phones (one swipeable row), beside it on desktop */}
      <div className="order-2 min-w-0 lg:order-1">
        <ul className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
          {QUESTIONS.map((x, i) => {
            const done = asked.includes(i);
            return (
              <li key={x.q} className={cn("shrink-0 lg:order-none lg:shrink", done && "order-last")}>
                <button type="button" onClick={() => ask(i)} disabled={done || pending !== null}
                  className={cn("inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2.5 text-left text-[15px] font-medium transition-all duration-200 lg:whitespace-normal",
                    done ? "border-transparent bg-muted text-graphite" : "bg-card shadow-card hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-card-hover",
                    pending === i && "border-coral bg-coral-soft")}>
                  {done && <Check className="h-3.5 w-3.5 shrink-0 text-ash" strokeWidth={3} aria-label="Asked" />}
                  {x.q}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-5 text-sm text-graphite" aria-live="polite">
          {left ? `${left} more question${left > 1 ? "s" : ""} to ask.` : "That’s everything. Anything else is in the FAQ below."}
        </p>
      </div>

      {/* the conversation */}
      <div className="order-1 rounded-[32px] bg-coral-soft p-4 sm:p-6 lg:order-2">
        <div className="flex items-center gap-3 px-1 pb-4">
          <AgentFace mood={mood} className="h-12 w-[52px] shrink-0" />
          <div className="leading-tight">
            <p className="font-display text-base font-semibold">Ask the agent</p>
            <p className="text-[13px] text-graphite">{pending !== null ? "Thinking…" : "Straight answers, including the no’s."}</p>
          </div>
        </div>

        <div ref={thread} className="h-[300px] space-y-4 overflow-y-auto rounded-3xl bg-card p-4 shadow-card sm:h-[380px] sm:p-5" aria-live="polite">
          {asked.map((i) => {
            const x = QUESTIONS[i];
            const yes = x.verdict === "yes";
            return (
              <div key={x.q} className="space-y-2 animate-pop-in">
                <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-foreground px-4 py-2.5 text-[14px] text-background">{x.q}</p>
                <div className="max-w-[90%] rounded-2xl rounded-bl-md border bg-surface px-4 py-3">
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", yes ? "bg-success-soft text-success" : "bg-coral-tint text-warning")}>
                    {yes ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-3 w-3" strokeWidth={3} />}{x.tag}
                  </span>
                  <p className="mt-2 text-[14px] leading-relaxed">{x.a}</p>
                </div>
              </div>
            );
          })}
          {pending !== null && (
            <div className="space-y-2">
              <p className="ml-auto w-fit max-w-[85%] animate-pop-in rounded-2xl rounded-br-md bg-foreground px-4 py-2.5 text-[14px] text-background">{QUESTIONS[pending].q}</p>
              <p className="flex w-fit gap-1 rounded-2xl rounded-bl-md border bg-surface px-4 py-3.5">{[0, 1, 2].map((d) => <i key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-ash" style={{ animationDelay: `${d * 120}ms` }} />)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
