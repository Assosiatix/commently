"use client";
import { ArrowUp, CalendarDays, Download, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import AgentFace, { type Mood } from "@/components/landing/AgentFace";
import { cn } from "@/lib/utils";

// The hero: pick a business, comment on its post, and watch the agent answer under the post and
// in the DM. Replies are scripted per keyword so it works without an account.

type Comment = { user: string; text: string; reply?: boolean; mine?: boolean };
type Dm = { text: string; button?: string };
type Scenario = {
  id: string; tab: string; account: string; caption: string;
  seed: Comment[]; suggestions: string[]; icon: typeof ShoppingBag;
  answer: (t: string) => Dm;
};

const SCENARIOS: Scenario[] = [
  {
    id: "store", tab: "Clothing store", account: "noor.linen", caption: "New linen drop in 4 colours", icon: ShoppingBag,
    seed: [{ user: "hira.k", text: "the olive one 😍" }, { user: "ahmed_r", text: "price?", reply: true }],
    suggestions: ["how much?", "is M in stock?", "do you deliver?", "link please"],
    answer: (t) => {
      if (/price|rate|how much|cost/.test(t)) return { text: "The linen shirt is Rs 2,499. S and M are in stock, and L is back on Friday.", button: "Buy linen shirt" };
      if (/size|\bm\b|medium|small|large|stock/.test(t)) return { text: "Yes, Medium is in stock (3 left). It fits a 38 to 40 inch chest.", button: "Buy in Medium" };
      if (/deliver|shipping|ship/.test(t)) return { text: "We deliver in 3 to 5 working days, and delivery is free on orders above Rs 5,000.", button: "Open the shop" };
      if (/link|shop|buy|order/.test(t)) return { text: "Here you go! Free delivery on orders above Rs 5,000.", button: "Open the shop" };
      return { text: "Thanks for the comment! Reply YES and I'll send you the price and sizes." };
    },
  },
  {
    id: "creator", tab: "Creator", account: "sana.makes", caption: "My 30-day content calendar, free", icon: Download,
    seed: [{ user: "zain.edits", text: "this is so useful" }, { user: "amna", text: "guide", reply: true }],
    suggestions: ["guide", "how do I get it?", "send it please", "love this"],
    answer: (t) => {
      if (/guide|calendar|get|send|want|link/.test(t)) return { text: "Here's your free 30-day content calendar. Tell me which week you try first!", button: "Download the calendar" };
      return { text: "Thank you! Comment or reply GUIDE and I'll send you the free calendar." };
    },
  },
  {
    id: "coach", tab: "Coach", account: "fit.with.omar", caption: "5 signs you need a coach", icon: CalendarDays,
    seed: [{ user: "hamza.t", text: "sign 3 is literally me" }, { user: "maria.k", text: "ready", reply: true }],
    suggestions: ["ready", "how much is coaching?", "free call?", "interested"],
    answer: (t) => {
      if (/price|how much|cost|fee/.test(t)) return { text: "Coaching is Rs 15,000 a month, and the first call is free. Want to book it?", button: "Book a free call" };
      if (/ready|call|interest|book|yes/.test(t)) return { text: "Great! Pick any time that suits you for a free 20-minute intro call.", button: "Book a free call" };
      return { text: "Glad it helped! Reply READY and I'll send you a link to book a free call." };
    },
  },
];

const STATUS: Record<Mood, (s: Scenario, c?: string) => string> = {
  idle: (s) => `I answer ${s.account}’s comments. Leave one and watch.`,
  watching: () => "I’m watching the comments…",
  thinking: (_, c) => `Reading “${c}”…`,
  typing: () => "Writing their DM…",
  happy: () => "Done. Replied under the post and sent the DM.",
};

export default function CommentDemo() {
  const [sid, setSid] = useState(SCENARIOS[0].id);
  const s = SCENARIOS.find((x) => x.id === sid)!;
  const [comments, setComments] = useState<Comment[]>(s.seed);
  const [value, setValue] = useState("");
  const [dm, setDm] = useState<Dm | null>(null);
  const [mood, setMood] = useState<Mood>("idle");
  const [last, setLast] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const list = useRef<HTMLUListElement>(null);
  const busy = mood === "thinking" || mood === "typing";

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => clear, []);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" }); }, [comments]);

  function pick(id: string) {
    if (id === sid) return;
    clear();
    const next = SCENARIOS.find((x) => x.id === id)!;
    setSid(id); setComments(next.seed); setDm(null); setValue(""); setMood("idle");
  }

  function send(text: string) {
    const clean = text.trim().slice(0, 80);
    if (!clean || busy) return;
    clear();
    const at = (ms: number) => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms);
    setValue(""); setDm(null); setLast(clean); setMood("thinking");
    setComments((c) => [...c.filter((x) => !x.mine), { user: "you", text: clean, mine: true }]);
    timers.current.push(setTimeout(() => setComments((c) => c.map((x) => (x.mine ? { ...x, reply: true } : x))), at(1100)));
    timers.current.push(setTimeout(() => setMood("typing"), at(1300)));
    timers.current.push(setTimeout(() => { setDm(s.answer(clean.toLowerCase())); setMood("happy"); }, at(2600)));
    timers.current.push(setTimeout(() => setMood("idle"), at(6000)));
  }

  return (
    <div className="mx-auto w-full max-w-[460px]">
      {/* business picker */}
      <div role="radiogroup" aria-label="Example business" className="mx-auto mb-5 flex w-fit flex-wrap justify-center gap-1 rounded-full bg-card p-1 shadow-card">
        {SCENARIOS.map((x) => (
          <button key={x.id} type="button" role="radio" aria-checked={x.id === sid} onClick={() => pick(x.id)}
            className={cn("rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors sm:px-4", x.id === sid ? "bg-foreground text-background" : "text-graphite hover:text-foreground")}>
            {x.tab}
          </button>
        ))}
      </div>

      {/* the agent and what it is doing */}
      <div className="mb-3 flex items-end gap-3">
        <AgentFace mood={mood} className="h-[76px] w-[76px] shrink-0 sm:h-[84px] sm:w-[84px]" />
        <p key={mood + sid} aria-live="polite" className="mb-3 animate-pop-in rounded-2xl rounded-bl-md bg-card px-4 py-2.5 text-[14px] font-medium leading-snug shadow-card">
          {STATUS[mood](s, last)}
        </p>
      </div>

      {/* comment sheet */}
      <div className="overflow-hidden rounded-[28px] border bg-card shadow-card-hover">
        <div className="flex items-center gap-3 bg-coral-tint px-5 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-foreground font-display text-sm font-bold text-background">{s.account[0].toUpperCase()}</span>
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-semibold">{s.account}</p>
            <p className="truncate text-xs text-graphite">{s.caption}</p>
          </div>
        </div>

        <ul ref={list} className="h-[176px] space-y-4 overflow-y-auto px-5 py-5 text-[14px] leading-snug" aria-live="polite">
          {comments.map((c, i) => (
            <li key={sid + i}>
              <p><b className="font-semibold">{c.user}</b> <span className={cn(c.mine && "rounded-md bg-coral-soft px-1")}>{c.text}</span></p>
              {c.reply && (
                <p className="mt-1.5 animate-pop-in border-l-2 border-coral pl-3 text-graphite">
                  <b className="font-semibold text-foreground">{s.account}</b> @{c.user} sent you a DM 📩
                </p>
              )}
            </li>
          ))}
        </ul>

        <form onSubmit={(e) => { e.preventDefault(); send(value); }} className="border-t px-4 pb-4 pt-3">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {s.suggestions.map((x) => (
              <button key={x} type="button" disabled={busy} onClick={() => send(x)} className="rounded-full bg-muted px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-coral-tint disabled:opacity-50">{x}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-full border bg-card py-1 pl-4 pr-1 focus-within:border-coral focus-within:ring-4 focus-within:ring-coral/15">
            <label htmlFor="demo-comment" className="sr-only">Write a comment</label>
            <input id="demo-comment" value={value} maxLength={80} placeholder="Comment on this post…" autoComplete="off"
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => !busy && setMood("watching")}
              onBlur={() => mood === "watching" && setMood("idle")}
              className="h-9 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ash" />
            <button type="submit" aria-label="Post comment" disabled={!value.trim() || busy} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-background transition-colors hover:bg-coral disabled:opacity-30">
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      {/* the DM it sends */}
      <div className={cn("relative z-10 -mt-4 ml-6 mr-[-0.5rem] min-h-[132px] rounded-[24px] bg-foreground p-4 text-background shadow-card-hover transition-all duration-500 sm:ml-16 sm:mr-[-1.5rem]", dm || mood === "typing" ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0")} aria-live="polite">
        <p className="text-xs font-medium text-background/60">Direct message from {s.account}</p>
        {mood === "typing" && <p className="mt-3 flex w-fit gap-1 rounded-2xl bg-background/10 px-3.5 py-3">{[0, 1, 2].map((d) => <i key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-background/60" style={{ animationDelay: `${d * 120}ms` }} />)}</p>}
        {dm && (
          <div className="animate-pop-in">
            <p className="mt-2.5 rounded-2xl bg-background/10 px-3.5 py-2.5 text-[14px] leading-snug">{dm.text}</p>
            {dm.button && <p className="mt-1.5 flex items-center justify-center gap-2 rounded-2xl bg-background px-3.5 py-2.5 text-[14px] font-semibold text-foreground"><s.icon className="h-4 w-4" />{dm.button}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
