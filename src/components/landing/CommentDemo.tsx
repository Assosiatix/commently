"use client";
import { ArrowUp, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// The hero: a reel's comment sheet the visitor can actually comment on, and the DM that follows.
// Replies are scripted per keyword so it works without an account.

type Comment = { user: string; text: string; reply?: boolean; mine?: boolean };
type Dm = { text: string; button?: string };

const SHOP = "noor.linen";
const SEED: Comment[] = [
  { user: "hira.k", text: "the olive one 😍" },
  { user: "ahmed_r", text: "price?", reply: true },
];
const SUGGESTIONS = ["how much?", "is M in stock?", "do you deliver?", "link please"];

function answer(text: string): Dm {
  const t = text.toLowerCase();
  if (/price|rate|how much|cost/.test(t)) return { text: "The linen shirt is Rs 2,499. S and M are in stock, and L is back on Friday.", button: "Buy linen shirt" };
  if (/size|\bm\b|medium|small|large|stock/.test(t)) return { text: "Yes, Medium is in stock (3 left). It fits a 38 to 40 inch chest.", button: "Buy in Medium" };
  if (/deliver|shipping|ship/.test(t)) return { text: "We deliver in 3 to 5 working days, and delivery is free on orders above Rs 5,000.", button: "Open the shop" };
  if (/link|shop|buy|order/.test(t)) return { text: "Here you go! Free delivery in Karachi and Lahore on orders above Rs 5,000.", button: "Open the shop" };
  return { text: "Thanks for the comment! Reply YES and I'll send you the price and sizes." };
}

export default function CommentDemo() {
  const [comments, setComments] = useState<Comment[]>(SEED);
  const [value, setValue] = useState("");
  const [dm, setDm] = useState<Dm | null>(null);
  const [typing, setTyping] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" }); }, [comments]);

  function send(text: string) {
    const clean = text.trim().slice(0, 80);
    if (!clean) return;
    timers.current.forEach(clearTimeout);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const at = (ms: number) => (reduce ? 0 : ms);
    setValue("");
    setDm(null);
    setTyping(false);
    setComments((c) => [...c.filter((x) => !x.mine), { user: "you", text: clean, mine: true }]);
    timers.current.push(setTimeout(() => setComments((c) => c.map((x) => (x.mine ? { ...x, reply: true } : x))), at(900)));
    timers.current.push(setTimeout(() => setTyping(true), at(1400)));
    timers.current.push(setTimeout(() => { setTyping(false); setDm(answer(clean)); }, at(2600)));
  }

  return (
    <div className="relative mx-auto w-full max-w-[440px]">
      {/* comment sheet */}
      <div className="overflow-hidden rounded-[28px] border bg-card shadow-card-hover">
        <div className="flex items-center gap-3 bg-coral-tint px-5 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-foreground font-display text-sm font-bold text-background">N</span>
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-semibold">{SHOP}</p>
            <p className="truncate text-xs text-graphite">New linen drop in 4 colours</p>
          </div>
        </div>

        <ul ref={list} className="h-[212px] space-y-4 overflow-y-auto px-5 py-5 text-[14px] leading-snug" aria-live="polite">
          {comments.map((c, i) => (
            <li key={i}>
              <p><b className="font-semibold">{c.user}</b> <span className={cn(c.mine && "rounded-md bg-coral-soft px-1")}>{c.text}</span></p>
              {c.reply && (
                <p className="mt-1.5 animate-pop-in border-l-2 border-coral pl-3 text-graphite">
                  <b className="font-semibold text-foreground">{SHOP}</b> @{c.user} sent you a DM 📩
                </p>
              )}
            </li>
          ))}
        </ul>

        <form onSubmit={(e) => { e.preventDefault(); send(value); }} className="border-t px-4 pb-4 pt-3">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => send(s)} className="rounded-full bg-muted px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-coral-tint">{s}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-full border bg-card py-1 pl-4 pr-1 focus-within:border-coral focus-within:ring-4 focus-within:ring-coral/15">
            <label htmlFor="demo-comment" className="sr-only">Write a comment</label>
            <input id="demo-comment" value={value} onChange={(e) => setValue(e.target.value)} maxLength={80} placeholder="Comment on this reel…" autoComplete="off" className="h-9 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ash" />
            <button type="submit" aria-label="Post comment" disabled={!value.trim()} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-background transition-colors hover:bg-coral disabled:opacity-30">
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      {/* the DM it triggers */}
      <div className={cn("relative z-10 -mt-4 ml-6 mr-[-0.5rem] min-h-[132px] rounded-[24px] bg-foreground p-4 text-background shadow-card-hover transition-all duration-500 sm:ml-16 sm:mr-[-1.5rem]", dm || typing ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0")} aria-live="polite">
        <p className="text-xs font-medium text-background/60">Direct message from {SHOP}</p>
        {typing && <p className="mt-3 flex w-fit gap-1 rounded-2xl bg-background/10 px-3.5 py-3">{[0, 1, 2].map((d) => <i key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-background/60" style={{ animationDelay: `${d * 120}ms` }} />)}</p>}
        {dm && (
          <div className="animate-pop-in">
            <p className="mt-2.5 rounded-2xl bg-background/10 px-3.5 py-2.5 text-[14px] leading-snug">{dm.text}</p>
            {dm.button && <p className="mt-1.5 flex items-center justify-center gap-2 rounded-2xl bg-background px-3.5 py-2.5 text-[14px] font-semibold text-foreground"><ShoppingBag className="h-4 w-4" />{dm.button}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
