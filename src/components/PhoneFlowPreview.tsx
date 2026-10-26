"use client";
import { Bookmark, ChevronLeft, Heart, MessageCircle, MoreHorizontal, Music2, Phone, Play, RotateCcw, Send, Signal, Video, Wifi } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { renderTemplate, type ProductVars } from "@/lib/render";
import { cn } from "@/lib/utils";

export type Scene = "comment" | "dm" | "gate" | "final";
type Btn = { title: string; url: string };
export type FlowState = {
  account: { username: string; avatar?: string | null };
  mediaThumb?: string | null;
  mediaKind?: "reel" | "post" | null; // reel = 9:16 Reels viewer, post = 4:5 feed post
  comment: string;
  publicReply: string;
  products?: ProductVars[]; // fills {{product.*}} in the preview
  agent?: boolean; // AI agent: first answer, then the chat continues in the DM
  dm: { text: string; buttons: Btn[]; chip: string };
  gate: { on: boolean; text: string; chip: string };
  final: { text: string; buttons: Btn[] };
};

const FAN = "maya.codes";
type Msg = { from: "biz" | "fan"; text: string; buttons?: Btn[]; chips?: string[] };

/** The thread as the commenter would see it, up to the chosen scene. */
function buildThread(f: FlowState, scene: Exclude<Scene, "comment">): Msg[] {
  const v = { username: FAN, products: f.products };
  const opener: Msg = { from: "biz", text: renderTemplate(f.dm.text, v) || "Your first message appears here", buttons: f.dm.buttons.filter((b) => b.title && b.url), chips: f.dm.chip ? [f.dm.chip] : [] };
  const tapped: Msg = { from: "fan", text: f.dm.chip || "Yes please!" };
  const gate: Msg = { from: "biz", text: renderTemplate(f.gate.text, v), chips: [f.gate.chip || "I'm following"] };
  const gateTapped: Msg = { from: "fan", text: f.gate.chip || "I'm following" };
  const final: Msg = { from: "biz", text: renderTemplate(f.final.text, v) || "Your final message appears here", buttons: f.final.buttons.filter((b) => b.title && b.url) };
  if (scene === "dm") return [opener];
  if (f.agent) {
    const p = f.products?.[0];
    return [opener, { from: "fan", text: p?.variants[1] ? `${p.variants[1].title} hai?` : "Aur koi color hai?" }, { from: "biz", text: p?.variants[1] ? `Ji haan, ${p.variants[1].title} available hai. (Example answer)` : "Ji, details yeh hain. (Example answer)" }];
  }
  if (scene === "gate") return [opener, tapped, gate];
  return f.gate.on ? [opener, tapped, gate, gateTapped, final] : [opener, tapped, final];
}

export default function PhoneFlowPreview({ flow, scene, onScene }: { flow: FlowState; scene: Scene; onScene: (s: Scene) => void }) {
  const [playing, setPlaying] = useState(false);
  const [shown, setShown] = useState<number | null>(null); // null = show everything
  const [typing, setTyping] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scroller = useRef<HTMLDivElement>(null);

  const reelView = scene === "comment" && flow.mediaKind === "reel";
  const thread = useMemo(() => (scene === "comment" ? [] : buildThread(flow, scene)), [flow, scene]);
  const stop = () => { timers.current.forEach(clearTimeout); timers.current = []; setPlaying(false); setTyping(false); setShown(null); };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { stop(); }, [scene]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [shown, typing, thread.length]);

  function play() {
    stop();
    const full = buildThread(flow, "final");
    onScene("final");
    setPlaying(true);
    setShown(0);
    let t = 600;
    full.forEach((m, i) => {
      if (m.from === "biz") { timers.current.push(setTimeout(() => setTyping(true), t)); t += 1100; }
      else t += 900;
      timers.current.push(setTimeout(() => { setTyping(false); setShown(i + 1); }, t));
    });
    timers.current.push(setTimeout(() => { setPlaying(false); setShown(null); }, t + 400));
  }

  const visible = shown === null ? thread : thread.slice(0, shown);
  const lastBizIdx = visible.map((m) => m.from).lastIndexOf("biz");
  const scenes: [Scene, string][] = flow.agent
    ? [["comment", "Comment"], ["dm", "First answer"], ["final", "Chat continues"]]
    : [["comment", "Comment"], ["dm", "First DM"], ...(flow.gate.on ? ([["gate", "Follow check"]] as [Scene, string][]) : []), ["final", "Final"]];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="inline-flex rounded-lg bg-muted p-1 text-xs font-medium">
          {scenes.map(([k, label]) => (
            <button key={k} type="button" onClick={() => onScene(k)} className={cn("rounded-md px-2.5 py-1.5 transition", scene === k ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}>{label}</button>
          ))}
        </div>
        <button type="button" onClick={playing ? stop : play} className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-xs font-medium transition hover:border-primary/50">
          {playing ? <><RotateCcw className="h-3.5 w-3.5" /> Reset</> : <><Play className="h-3.5 w-3.5" /> Play flow</>}
        </button>
      </div>

      {/* phone */}
      <div className="mx-auto w-full max-w-[320px] rounded-[44px] border-[10px] border-neutral-900 bg-neutral-900 shadow-2xl">
        <div className={cn("relative h-[560px] overflow-hidden rounded-[34px]", reelView ? "bg-black text-white" : "bg-white text-neutral-900")}>
          <div className="absolute left-1/2 top-2 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-neutral-900" aria-hidden />
          <div className={cn("relative z-10 flex items-center justify-between px-6 pb-1 pt-2.5 text-[11px] font-semibold", reelView && "absolute inset-x-0 top-0")}><span>9:41</span><span className="flex items-center gap-1"><Signal className="h-3 w-3" /><Wifi className="h-3 w-3" /></span></div>

          {scene === "comment" ? <CommentScreen flow={flow} /> : (
            <div className="flex h-[calc(100%-26px)] flex-col">
              <div className="flex items-center gap-2.5 border-b border-neutral-200 px-3 py-2">
                <ChevronLeft className="h-5 w-5" />
                <Avatar src={flow.account.avatar} name={flow.account.username} size={28} />
                <div className="min-w-0 flex-1 leading-tight"><p className="truncate text-[13px] font-semibold">{flow.account.username}</p><p className="text-[10px] text-neutral-500">Active now</p></div>
                <Phone className="h-4 w-4" /><Video className="h-[18px] w-[18px]" />
              </div>
              <div ref={scroller} className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
                <div className="flex flex-col items-center pb-3 pt-1 text-center">
                  <Avatar src={flow.account.avatar} name={flow.account.username} size={56} />
                  <p className="mt-1.5 text-[13px] font-semibold">{flow.account.username}</p>
                  <p className="text-[10px] text-neutral-500">Instagram · Business</p>
                </div>
                {visible.map((m, i) => (
                  <div key={i} className="animate-pop-in">
                    {m.from === "biz" ? (
                      <div className="flex items-end gap-1.5">
                        <Avatar src={flow.account.avatar} name={flow.account.username} size={20} />
                        <div className="max-w-[78%] space-y-1">
                          <p className="whitespace-pre-wrap break-words rounded-[18px] bg-neutral-100 px-3 py-2 text-[13px] leading-snug">{m.text}</p>
                          {m.buttons?.map((b, j) => <p key={j} className="rounded-[14px] bg-neutral-100 py-2 text-center text-[13px] font-semibold text-[#0064e0]">{b.title}</p>)}
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end"><p className="max-w-[78%] whitespace-pre-wrap break-words rounded-[18px] bg-[#3797f0] px-3 py-2 text-[13px] leading-snug text-white">{m.text}</p></div>
                    )}
                    {i === lastBizIdx && i === visible.length - 1 && m.chips && m.chips.length > 0 && (
                      <div className="mt-2 flex flex-wrap justify-end gap-1.5">{m.chips.map((c) => <span key={c} className="rounded-full border border-[#3797f0] px-3 py-1 text-[12px] font-medium text-[#3797f0]">{c}</span>)}</div>
                    )}
                  </div>
                ))}
                {typing && (
                  <div className="flex items-end gap-1.5"><Avatar src={flow.account.avatar} name={flow.account.username} size={20} />
                    <p className="flex gap-1 rounded-[18px] bg-neutral-100 px-3.5 py-3">{[0, 1, 2].map((d) => <i key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: `${d * 120}ms` }} />)}</p>
                  </div>
                )}
              </div>
              <div className="m-3 flex items-center rounded-full border border-neutral-300 px-3.5 py-2 text-[13px] text-neutral-400">Message…</div>
            </div>
          )}
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-muted-foreground">Preview of what <b className="font-medium text-foreground">{FAN}</b> sees. Real Instagram styling can differ slightly.</p>
    </div>
  );
}

function Avatar({ src, name, size }: { src?: string | null; name: string; size: number }) {
  const s = { width: size, height: size };
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" style={s} className="shrink-0 rounded-full object-cover" /> : <span style={{ ...s, fontSize: size * 0.4 }} className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] font-semibold text-white">{name.slice(0, 1).toUpperCase()}</span>;
}

function Media({ src, className }: { src?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  // Instagram CDN links expire after a while, so fall back to a neutral placeholder instead of a broken image.
  // eslint-disable-next-line @next/next/no-img-element
  return src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} className={cn("h-full w-full object-cover", className)} /> : <div className="grid h-full w-full place-items-center bg-gradient-to-br from-neutral-300 to-neutral-400 text-xs text-neutral-600">Your {src ? "post" : "reel or post"}</div>;
}

/** The real thing: a Reel fills the screen (9:16), a photo post sits in the feed at 4:5; comments open as a bottom sheet over both. */
function CommentScreen({ flow }: { flow: FlowState }) {
  const reply = renderTemplate(flow.publicReply, { username: FAN, products: flow.products }).trim();
  const reel = flow.mediaKind === "reel";
  return (
    <div className={cn("relative", reel ? "h-full" : "h-[calc(100%-26px)]")}>
      {reel ? (
        <div className="absolute inset-0">
          <Media src={flow.mediaThumb} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/60" />
          <p className="absolute left-4 top-11 text-[17px] font-semibold">Reels</p>
          <div className="absolute bottom-[42%] right-3 flex flex-col items-center gap-4 text-[11px] font-medium">
            <span className="flex flex-col items-center gap-0.5"><Heart className="h-6 w-6" />1.2K</span>
            <span className="flex flex-col items-center gap-0.5"><MessageCircle className="h-6 w-6" />48</span>
            <Send className="h-6 w-6" /><MoreHorizontal className="h-6 w-6" />
          </div>
          <div className="absolute bottom-[42%] left-3 right-14 space-y-1.5 text-[12.5px]">
            <div className="flex items-center gap-2"><Avatar src={flow.account.avatar} name={flow.account.username} size={26} /><b>{flow.account.username}</b><span className="rounded border border-white/70 px-1.5 py-0.5 text-[10px] font-semibold">Follow</span></div>
            <p className="flex items-center gap-1 text-[11px] opacity-90"><Music2 className="h-3 w-3" />Original audio</p>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 bg-white">
          <div className="flex items-center gap-2.5 px-3 py-2"><Avatar src={flow.account.avatar} name={flow.account.username} size={28} /><p className="flex-1 text-[13px] font-semibold">{flow.account.username}</p><MoreHorizontal className="h-4 w-4" /></div>
          <div className="aspect-[4/5] w-full"><Media src={flow.mediaThumb} /></div>
          <div className="flex items-center gap-3.5 px-3 py-2.5"><Heart className="h-[22px] w-[22px]" /><MessageCircle className="h-[22px] w-[22px]" /><Send className="h-[22px] w-[22px]" /><Bookmark className="ml-auto h-[22px] w-[22px]" /></div>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex h-[44%] flex-col rounded-t-[18px] bg-white text-neutral-900 shadow-[0_-10px_30px_rgba(0,0,0,.28)]">
        <div className="flex flex-col items-center border-b border-neutral-200 pb-2 pt-1.5"><i className="mb-1.5 h-1 w-9 rounded-full bg-neutral-300" /><p className="text-[12.5px] font-semibold">Comments</p></div>
        <div className="flex-1 space-y-3 overflow-hidden px-3 py-3 text-[12.5px] leading-snug">
          <div className="flex gap-2"><Avatar name={FAN} size={26} /><div><p><b>{FAN}</b> <span className="text-neutral-500">now</span></p><p>{flow.comment || "your keyword"}</p></div></div>
          {reply && (
            <div className="ml-8 flex animate-pop-in gap-2"><Avatar src={flow.account.avatar} name={flow.account.username} size={22} /><div><p><b>{flow.account.username}</b> <span className="rounded bg-neutral-100 px-1 text-[10px] text-neutral-500">Author</span></p><p>{reply}</p></div></div>
          )}
        </div>
        <div className="mx-3 mb-3 flex items-center rounded-full border border-neutral-300 px-3.5 py-2 text-[12px] text-neutral-400">Add a comment…</div>
      </div>
    </div>
  );
}
