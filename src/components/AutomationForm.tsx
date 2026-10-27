"use client";
import { ArrowLeft, ArrowRight, Check, ImageIcon, Link2, Loader2, Package, Plus, RefreshCw, Trash2, UserCheck, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import AiPanel from "@/components/AiPanel";
import PhoneFlowPreview, { type Scene } from "@/components/PhoneFlowPreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TEMPLATE_VARIABLES, type ProductVars } from "@/lib/render";
import { cn } from "@/lib/utils";

type Acc = { id: string; username: string; profilePictureUrl?: string | null };
type Media = { id: string; caption?: string; permalink?: string; thumbnail_url?: string; media_url?: string; media_type?: string };
type Btn = { title: string; url: string };
export type AutomationInit = {
  id?: string; name: string; accountId: string; mediaId: string | null; mediaPermalink: string | null; mediaThumbUrl: string | null;
  matchType: "CONTAINS" | "EXACT" | "ANY"; keywords: string[]; dmText: string; dmButtons: Btn[]; dmQuickReply: string; publicReplies: string[];
  requireFollow: boolean; productButtons: boolean; type: "REWARD" | "AGENT"; questionsOnly: boolean; aiInstructions: string; followGateText: string; followGateButton: string; followUpText: string; followUpButtons: Btn[]; oncePerUser: boolean; enabled: boolean;
};

export const TEMPLATES: { id: string; title: string; text: string; keywords: string[]; dm: string; chip: string; reply: string; follow: string; label: string; gate: boolean }[] = [
  { id: "lead", title: "Lead magnet", text: "Send a free guide or PDF", keywords: ["guide"], dm: "Hey {{username}}! Thanks for commenting. Tap below and I'll send you the free guide.", chip: "Send me the guide", reply: "Check your DMs!", follow: "Here you go! Hope it helps, and let me know what you think.", label: "Download guide", gate: true },
  { id: "product", title: "Product link", text: "Share price and buy link", keywords: ["link", "price"], dm: "Hi {{username}}! Here are the details you asked about. Tap below to get the link.", chip: "Send me the link", reply: "Sent you a DM!", follow: "Here is the link to grab it:", label: "Shop now", gate: false },
  { id: "giveaway", title: "Giveaway entry", text: "Confirm entries automatically", keywords: ["enter"], dm: "You're almost in, {{username}}! Tap below to confirm your entry.", chip: "Confirm my entry", reply: "You're entered!", follow: "Confirmed! Winner is announced on Friday. Good luck!", label: "", gate: true },
];

const EMPTY: AutomationInit = {
  name: "", accountId: "", mediaId: null, mediaPermalink: null, mediaThumbUrl: null, matchType: "CONTAINS", keywords: [],
  dmText: "Hey {{username}}! Thanks for commenting. Tap below and I'll send it over.", dmButtons: [], dmQuickReply: "Send me the link", publicReplies: ["Sent you a DM!"],
  requireFollow: false, productButtons: false, type: "REWARD", questionsOnly: true, aiInstructions: "", followGateText: "Looks like you're not following us yet. Follow, then tap the button below and I'll send it right away!", followGateButton: "I'm following",
  followUpText: "Here you go! Thanks for being here.", followUpButtons: [], oncePerUser: true, enabled: true,
};

type StepDef = { id: string; label: string; scene: Scene };
const REWARD_STEPS: StepDef[] = [
  { id: "trigger", label: "Trigger", scene: "comment" },
  { id: "dm", label: "First DM", scene: "dm" },
  { id: "gate", label: "Follow check", scene: "gate" },
  { id: "final", label: "Final message", scene: "final" },
  { id: "review", label: "Review", scene: "final" },
];
const AGENT_STEPS: StepDef[] = [
  { id: "source", label: "Post", scene: "comment" },
  { id: "agent", label: "Agent", scene: "dm" },
  { id: "review", label: "Review", scene: "final" },
];

/** What a new AI agent starts with: it listens to every comment on its post and answers the questions. */
const AGENT_DEFAULTS: Partial<AutomationInit> = {
  type: "AGENT", matchType: "ANY", keywords: [], dmText: "Thanks for your comment! Our team will get back to you shortly.", dmQuickReply: "", publicReplies: ["Sent you a DM!"],
  requireFollow: false, followUpText: "", followUpButtons: [], oncePerUser: false, productButtons: true,
};

function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>;
}

function ButtonsEditor({ value, onChange }: { value: Btn[]; onChange: (b: Btn[]) => void }) {
  const set = (i: number, patch: Partial<Btn>) => onChange(value.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  return (
    <div className="space-y-2.5">
      {value.map((b, i) => (
        <div key={i} className="flex gap-2 rounded-lg border bg-muted/40 p-2.5">
          <div className="grid flex-1 gap-2 sm:grid-cols-[170px_1fr]">
            <Input value={b.title} onChange={(e) => set(i, { title: e.target.value })} placeholder="Button label" maxLength={20} aria-label="Button label" />
            <Input value={b.url} onChange={(e) => set(i, { url: e.target.value })} placeholder="https://yoursite.com/link" aria-label="Button link" inputMode="url" />
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove button"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      {value.length < 3 && <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { title: "", url: "" }])}><Plus /> Add link button</Button>}
      <p className="text-xs text-muted-foreground">Up to 3 buttons that open a link. If Instagram refuses buttons, the links are sent as plain text instead.</p>
    </div>
  );
}

/** Stand-in shown in the phone preview; the real answer is written by the AI for each comment. */
function exampleAnswer(p: ProductVars) {
  const prices = p.variants.map((v) => Number(v.price)).filter(Number.isFinite);
  const price = prices.length ? `${p.title} costs ${p.currency ? p.currency + " " : ""}${Math.min(...prices).toLocaleString("en")}` : p.title;
  return `${price} and is available. (Example: the AI answers each person's actual question.)`;
}

const SAMPLE_PRODUCT: ProductVars = { title: "Linen Shirt", url: "https://yourstore.com/products/linen-shirt", currency: null, variants: [
  { title: "Small", price: "2499", qty: 8, available: true }, { title: "Medium", price: "2499", qty: 3, available: true }, { title: "Large", price: "2499", qty: 0, available: false } ] };

/** Tap-to-insert chips for template variables. */
function VarChips({ onInsert, showProducts }: { onInsert: (t: string) => void; showProducts: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1">
      <span className="text-xs text-muted-foreground">Insert:</span>
      {TEMPLATE_VARIABLES.filter((v) => showProducts || v.token === "{{username}}").map((v) => (
        <button key={v.token} type="button" onClick={() => onInsert(v.token)} title={v.token} className="rounded-full border bg-card px-2.5 py-1 text-xs transition hover:border-primary/50 hover:text-primary">{v.label}</button>
      ))}
    </div>
  );
}

export default function AutomationForm({ accounts, initial, canFollowUp = true, redirectTo = "/dashboard/automations", onSaved, mediaProducts = {}, shopifyConnected = false, aiAvailable = false, type: typeProp = "REWARD", showProducts = true }: {
  accounts: Acc[]; initial?: AutomationInit; canFollowUp?: boolean; redirectTo?: string; onSaved?: (id: string) => void;
  mediaProducts?: Record<string, ProductVars[]>; shopifyConnected?: boolean; aiAvailable?: boolean; type?: "REWARD" | "AGENT"; showProducts?: boolean;
}) {
  const router = useRouter();
  const [f, setF] = useState<AutomationInit>(initial ?? { ...EMPTY, ...(typeProp === "AGENT" ? AGENT_DEFAULTS : {}), accountId: accounts[0]?.id ?? "" });
  const agent = f.type === "AGENT";
  const STEPS = agent ? AGENT_STEPS : REWARD_STEPS;
  const [step, setStep] = useState(0);
  const sid = STEPS[step].id;
  const [scene, setScene] = useState<Scene>("comment");
  const [kw, setKw] = useState("");
  const [media, setMedia] = useState<Media[] | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mErr, setMErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof AutomationInit>(k: K, v: AutomationInit[K]) => setF((p) => ({ ...p, [k]: v }));
  const clearMedia = { mediaId: null, mediaPermalink: null, mediaThumbUrl: null };
  const account = accounts.find((a) => a.id === f.accountId) ?? accounts[0];
  const linkedProducts = f.mediaId ? mediaProducts[f.mediaId] ?? [] : [];
  const previewProducts = linkedProducts.length ? linkedProducts : [SAMPLE_PRODUCT];
  const append = (cur: string, t: string) => (cur ? cur.replace(/\s+$/, "") + " " + t : t);
  const mediaKind: "reel" | "post" | null = f.mediaId ? (f.mediaPermalink?.includes("/reel") ? "reel" : "post") : null;

  function go(i: number) { setStep(i); setScene(STEPS[i].scene === "gate" && !f.requireFollow ? "final" : STEPS[i].scene); }

  async function loadMedia() {
    setMediaLoading(true); setMErr("");
    const r = await fetch(`/api/instagram/media?accountId=${f.accountId}`);
    const j = await r.json().catch(() => ({}));
    setMediaLoading(false);
    if (!r.ok) setMErr(j.error || "Could not load posts"); else setMedia(j.media);
  }
  useEffect(() => { setMedia(null); setMErr(""); }, [f.accountId]);

  const splitKw = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
  const allKeywords = useMemo(() => Array.from(new Set([...f.keywords, ...splitKw(kw)])), [f.keywords, kw]);
  function addKw() { if (kw.trim()) set("keywords", allKeywords); setKw(""); }

  const goodBtns = (b: Btn[]) => b.filter((x) => x.title.trim() || x.url.trim());
  function validate(i: number): string | null {
    const id = STEPS[i].id;
    if (id === "agent") {
      if (!f.dmText.trim()) return "Write the fallback message the agent sends when it is not sure.";
      if (!linkedProducts.length && !f.aiInstructions.trim()) return showProducts ? "Link products to this post (Catalog) or write store notes, so the agent has something to answer from." : "Write a few notes (your offers, prices, links, common questions) so the agent has something to answer from.";
    }
    if (id === "trigger" && f.matchType !== "ANY" && !allKeywords.length) return "Add at least one keyword, or choose “anything”.";
    if (id === "dm") {
      if (!f.dmText.trim()) return "Write the first DM.";
      if (goodBtns(f.dmButtons).some((b) => !b.title.trim() || !/^https?:\/\//i.test(b.url.trim()))) return "Each button needs a label and a link starting with https://";
    }
    if (id === "final") {
      if (f.requireFollow && !f.followUpText.trim()) return "Write the message people get after they follow.";
      if (goodBtns(f.followUpButtons).some((b) => !b.title.trim() || !/^https?:\/\//i.test(b.url.trim()))) return "Each button needs a label and a link starting with https://";
    }
    return null;
  }
  function next() {
    const err = validate(step);
    if (err) return toast.error(err);
    go(Math.min(step + 1, STEPS.length - 1));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    for (let i = 0; i < STEPS.length - 1; i++) { const err = validate(i); if (err) { go(i); return toast.error(err); } }
    setBusy(true);
    const name = f.name.trim() || (agent ? "AI agent" : allKeywords[0] ? `Reply to “${allKeywords[0]}”` : "Reply to every comment");
    const clean = (b: Btn[]) => b.filter((x) => x.title.trim() && x.url.trim()).map((x) => ({ title: x.title.trim(), url: x.url.trim() }));
    const body = {
      ...f, name, keywords: agent ? [] : allKeywords, aiInstructions: f.aiInstructions.trim() || null,
      publicReplies: f.publicReplies.map((s) => s.trim()).filter(Boolean),
      dmButtons: clean(f.dmButtons), followUpButtons: clean(f.followUpButtons),
      dmQuickReply: f.dmQuickReply.trim() || null, followGateText: f.requireFollow ? f.followGateText.trim() : null, followGateButton: f.requireFollow ? f.followGateButton.trim() || null : null,
      followUpText: f.followUpText.trim() || null,
    };
    const res = await fetch(initial?.id ? `/api/automations/${initial.id}` : "/api/automations", { method: initial?.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast.error("Could not save", { description: j.error || "Failed to save" });
    toast.success(initial?.id ? "Automation updated" : "Automation is live");
    if (onSaved) return onSaved(j.id ?? initial?.id ?? "");
    router.push(redirectTo);
    router.refresh();
  }

  function applyTemplate(t: (typeof TEMPLATES)[number]) {
    setF((p) => ({ ...p, name: p.name || t.title, matchType: "CONTAINS", keywords: t.keywords, dmText: t.dm, dmQuickReply: t.chip, publicReplies: [t.reply], followUpText: t.follow, followUpButtons: t.label ? [{ title: t.label, url: "https://yourlink.com" }] : [], requireFollow: t.gate }));
    toast.success(`${t.title} template applied`);
  }

  if (!accounts.length) return (
    <Card className="p-8 text-center"><p className="text-muted-foreground">Connect an Instagram account first.</p><Button asChild className="mt-4"><Link href="/dashboard/accounts">Connect Instagram</Link></Button></Card>
  );

  const productHint = !showProducts ? null : (
    <div className={cn("flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm", linkedProducts.length ? "bg-success-soft text-success" : "bg-muted text-muted-foreground")}>
      <Package className="mt-0.5 h-4 w-4 shrink-0" />
      {linkedProducts.length ? <p>Products on this {mediaKind === "reel" ? "reel" : "post"}: <b>{linkedProducts.map((p) => p.title).join(", ")}</b>. {agent ? "The agent answers from these." : "Use the product variables below."}</p>
        : shopifyConnected ? <p>{agent ? "The agent answers from the products you assign to this reel." : "Product variables fill in from the products you assign to this reel."} <Link href="/dashboard/catalog" className="font-medium text-primary hover:underline">Assign products</Link>{agent ? "." : " (the preview uses a sample product)."}</p>
        : <p>Want prices and stock in your answers? <Link href="/dashboard/shopify" className="font-medium text-primary hover:underline">Connect Shopify</Link>. You can also describe your products in the store notes.</p>}
    </div>
  );

  const flow = {
    account: { username: account.username, avatar: account.profilePictureUrl },
    mediaThumb: f.mediaThumbUrl,
    mediaKind,
    agent,
    comment: agent ? "kitne ka hai?" : f.matchType === "ANY" ? "Love this!" : allKeywords[0] || "keyword",
    publicReply: f.publicReplies.map((s) => s.trim()).find(Boolean) ?? "",
    products: previewProducts,
    dm: {
      text: agent ? (showProducts ? exampleAnswer(previewProducts[0]) : "Great question! Here is the answer, written by the agent from your notes. (Example)") : f.dmText,
      buttons: agent && f.productButtons ? [...f.dmButtons, ...previewProducts.filter((p) => p.url).slice(0, 1).map((p) => ({ title: "Buy " + p.title, url: p.url! }))].slice(0, 3) : f.dmButtons,
      chip: f.dmQuickReply,
    },
    gate: { on: !agent && f.requireFollow, text: f.followGateText, chip: f.followGateButton },
    final: { text: f.followUpText, buttons: [...f.followUpButtons, ...(f.productButtons ? previewProducts.filter((p) => p.url).map((p) => ({ title: "Buy " + p.title, url: p.url! })) : [])].slice(0, 3) },
  };
  const isLast = step === STEPS.length - 1;

  return (
    <form onSubmit={save} className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-5">
        {/* stepper */}
        <ol className="flex items-center gap-1 overflow-x-auto pb-1" aria-label="Automation steps">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex items-center gap-1">
              <button type="button" onClick={() => i <= step || !validate(step) ? go(i) : toast.error(validate(step)!)} className={cn("flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition", i === step ? "bg-ink font-medium text-background" : i < step ? "text-foreground hover:bg-accent" : "text-muted-foreground hover:bg-accent")}>
                <span className={cn("grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold", i === step ? "bg-background text-ink" : i < step ? "bg-success text-white dark:text-background" : "border")}>{i < step ? <Check className="h-3 w-3" /> : i + 1}</span>
                {s.label}
              </button>
              {i < STEPS.length - 1 && <span className="h-px w-3 bg-border" />}
            </li>
          ))}
        </ol>

        {sid === "trigger" && !initial?.id && (
          <div className="grid gap-3 sm:grid-cols-3">
            {TEMPLATES.filter((t) => showProducts || t.id !== "product").map((t) => (
              <button type="button" key={t.id} onClick={() => applyTemplate(t)} className="rounded-xl border bg-card p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm">
                <p className="text-sm font-medium">{t.title}</p><p className="text-xs text-muted-foreground">{t.text}</p>
              </button>
            ))}
          </div>
        )}

        <Card className="animate-pop-in space-y-5 p-5 sm:p-6" key={step}>
          {(sid === "trigger" || sid === "source") && (<>
            {agent
              ? <div><h2 className="text-lg font-semibold">Which post should the agent watch?</h2><p className="text-sm text-muted-foreground">It answers the questions people comment on it (price, size, stock, delivery) and keeps chatting in the DM.</p></div>
              : <div><h2 className="text-lg font-semibold">When should this run?</h2><p className="text-sm text-muted-foreground">Pick the account, the post, and what people have to comment.</p></div>}
            <Field label="Instagram account">
              <Select value={f.accountId} onValueChange={(v) => setF((p) => ({ ...p, accountId: v, ...clearMedia }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>@{a.username}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Post">
              <div className="inline-flex rounded-lg bg-muted p-1">
                <button type="button" onClick={() => { setF((p) => ({ ...p, ...clearMedia })); setMedia(null); }} className={cn("rounded-md px-3.5 py-1.5 text-sm font-medium transition", !f.mediaId && !media ? "bg-card shadow-sm" : "text-muted-foreground")}>All posts</button>
                <button type="button" onClick={() => !media && loadMedia()} className={cn("rounded-md px-3.5 py-1.5 text-sm font-medium transition", f.mediaId || media ? "bg-card shadow-sm" : "text-muted-foreground")}>Specific post or reel</button>
              </div>
              {mediaLoading && <p className="flex items-center gap-2 pt-1 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading your latest posts…</p>}
              {mErr && <p className="pt-1 text-sm text-destructive">{mErr}</p>}
              {f.mediaId && !media && (
                <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border p-2.5 text-sm">
                  <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-md bg-muted", mediaKind === "reel" ? "h-16 w-9" : "h-14 w-14")}>
                    {f.mediaThumbUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={f.mediaThumbUrl} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
                  </span>
                  <div className="min-w-0 flex-1"><p className="font-medium">{mediaKind === "reel" ? "Reel selected" : "Post selected"}</p>{f.mediaPermalink && <a href={f.mediaPermalink} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Open on Instagram</a>}</div>
                  <Button type="button" variant="outline" size="sm" onClick={loadMedia}><RefreshCw /> Change</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setF((p) => ({ ...p, ...clearMedia }))}><X /> Remove</Button>
                </div>
              )}
              {media && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">Tap the post this automation should watch.</p>{f.mediaId && <Button type="button" variant="ghost" size="sm" onClick={() => setMedia(null)}>Cancel</Button>}</div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {media.map((m) => {
                      const img = m.thumbnail_url || m.media_url;
                      const reel = !!m.permalink?.includes("/reel");
                      return (
                        <button type="button" key={m.id} title={m.caption} onClick={() => { setF((p) => ({ ...p, mediaId: m.id, mediaPermalink: m.permalink ?? null, mediaThumbUrl: img ?? null })); setMedia(null); }}
                          className={cn("relative aspect-square overflow-hidden rounded-lg border-2 bg-muted transition hover:scale-[1.03]", f.mediaId === m.id ? "border-primary" : "border-transparent")}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <span className="p-1 text-[10px] text-muted-foreground">{m.caption?.slice(0, 40)}</span>}
                          {(reel || m.media_type === "CAROUSEL_ALBUM") && <span className="absolute right-1 top-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-medium text-white">{reel ? "Reel" : "Album"}</span>}
                          {f.mediaId === m.id && <span className="absolute inset-0 grid place-items-center bg-primary/25"><Check className="h-5 w-5 text-white drop-shadow" /></span>}
                        </button>
                      );
                    })}
                    {!media.length && <p className="col-span-full text-sm text-muted-foreground">No posts found.</p>}
                  </div>
                </div>
              )}
            </Field>
            {!agent && (<>
            <Field label="Comment matches">
              <Select value={f.matchType} onValueChange={(v) => set("matchType", v as AutomationInit["matchType"])}>
                <SelectTrigger className="sm:max-w-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONTAINS">contains a keyword</SelectItem>
                  <SelectItem value="EXACT">is exactly a keyword</SelectItem>
                  <SelectItem value="ANY">anything (every comment)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {f.matchType !== "ANY" && (
              <Field label="Keywords" hint="Press Enter after each word. Capital letters and extra spaces are ignored.">
                <div className="flex flex-wrap gap-1.5">
                  {f.keywords.map((k) => (<Badge key={k} className="gap-1 py-1 pl-2.5 pr-1.5 text-sm">{k}<button type="button" aria-label={`Remove ${k}`} onClick={() => set("keywords", f.keywords.filter((x) => x !== k))}><X className="h-3 w-3" /></button></Badge>))}
                </div>
                <Input value={kw} placeholder="e.g. guide" onChange={(e) => setKw(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKw(); } }} onBlur={addKw} />
              </Field>
            )}
            </>)}
            {agent && productHint}
          </>)}

          {sid === "dm" && (<>
            <div><h2 className="text-lg font-semibold">First DM</h2><p className="text-sm text-muted-foreground">Sent right after the comment. Instagram allows one private message per comment, so make it count.</p></div>
            {productHint}
            <Field label="Message" hint={<span className="flex justify-between"><span>Use {"{{username}}"} to greet them by @name.</span><span>{f.dmText.length}/1000</span></span>}>
              <Textarea value={f.dmText} onChange={(e) => set("dmText", e.target.value)} maxLength={1000} className="min-h-28" />
              <VarChips showProducts={showProducts} onInsert={(t) => set("dmText", append(f.dmText, t))} />
            </Field>
            <Field label="Quick-reply button" hint="A tap-to-reply chip under your message. When they tap it, they have replied, which lets us send the next message. Leave empty to ask them to type a reply instead.">
              <Input value={f.dmQuickReply} onChange={(e) => set("dmQuickReply", e.target.value)} maxLength={20} placeholder="e.g. Send me the link" />
            </Field>
            <Field label="Link buttons (optional)"><ButtonsEditor value={f.dmButtons} onChange={(b) => set("dmButtons", b)} /></Field>
            <Field label="Public reply under their comment (optional)" hint="One per line. One is picked at random so replies don't look copy-pasted.">
              <Textarea value={f.publicReplies.join("\n")} onChange={(e) => set("publicReplies", e.target.value.split("\n"))} className="min-h-20" />
            </Field>
          </>)}

          {sid === "gate" && (<>
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="text-lg font-semibold">Ask them to follow first</h2><p className="text-sm text-muted-foreground">Check whether they follow you before the final message is sent.</p></div>
              <Switch checked={f.requireFollow} onCheckedChange={(v) => { set("requireFollow", v); setScene(v ? "gate" : "final"); }} aria-label="Require follow" />
            </div>
            {f.requireFollow ? (<>
              <div className="flex gap-3 rounded-lg bg-primary-soft p-3.5 text-sm"><UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p>When they tap your button, we check if they follow <b>@{account.username}</b>. Not following gets the message below. Following gets the final message straight away.</p></div>
              <Field label="“Please follow” message"><Textarea value={f.followGateText} onChange={(e) => set("followGateText", e.target.value)} maxLength={1000} className="min-h-24" />
                <VarChips showProducts={showProducts} onInsert={(t) => set("followGateText", append(f.followGateText, t))} /></Field>
              <Field label="Button label" hint="They tap this after following, and we check again."><Input value={f.followGateButton} onChange={(e) => set("followGateButton", e.target.value)} maxLength={20} /></Field>
            </>) : <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Off. Everyone who replies gets the final message.</p>}
          </>)}

          {sid === "final" && (<>
            <div><h2 className="text-lg font-semibold">Final message</h2><p className="text-sm text-muted-foreground">{f.requireFollow ? "Sent once they follow you." : "Sent as soon as they reply to your first DM."}</p></div>
            <Field label="Message" hint={<span className="flex justify-between"><span>Put the main content here, buttons below carry the links.</span><span>{f.followUpText.length}/1000</span></span>}>
              <Textarea value={f.followUpText} onChange={(e) => set("followUpText", e.target.value)} maxLength={1000} className="min-h-28" placeholder="Leave empty to send nothing after the reply." />
              <VarChips showProducts={showProducts} onInsert={(t) => set("followUpText", append(f.followUpText, t))} />
            </Field>
            <Field label="Link buttons"><ButtonsEditor value={f.followUpButtons} onChange={(b) => set("followUpButtons", b)} /></Field>
            {(showProducts && (shopifyConnected || f.productButtons)) && (
              <div className="flex items-center justify-between gap-4 rounded-lg border p-3.5">
                <div><p className="text-sm font-medium">Add a Buy button for each product</p><p className="text-xs text-muted-foreground">Uses the products linked to this reel. Instagram shows up to 3 buttons in total.</p></div>
                <Switch checked={f.productButtons} onCheckedChange={(v) => set("productButtons", v)} aria-label="Buy buttons" />
              </div>
            )}
          </>)}

          {sid === "agent" && (<>
            <div><h2 className="text-lg font-semibold">Your AI agent</h2><p className="text-sm text-muted-foreground">It reads each comment, answers from {showProducts ? "your products and store notes" : "the notes you write"} in the language the person wrote, and carries on in the DM. It never guesses: anything it cannot back up goes to you.</p></div>
            {productHint}
            <AiPanel showProducts={showProducts} instructions={f.aiInstructions} onInstructions={(v) => set("aiInstructions", v)} accountId={f.accountId} mediaId={f.mediaId} available={aiAvailable} productCount={linkedProducts.length} />
            <Field label="Fallback message" hint={<span className="flex justify-between"><span>Sent when the agent is not sure or AI is unavailable. Use {"{{username}}"} for their @name.</span><span>{f.dmText.length}/1000</span></span>}>
              <Textarea value={f.dmText} onChange={(e) => set("dmText", e.target.value)} maxLength={1000} className="min-h-20" />
            </Field>
            <Field label="Public reply under their comment (optional)" hint="One per line. One is picked at random so replies don't look copy-pasted.">
              <Textarea value={f.publicReplies.join("\n")} onChange={(e) => set("publicReplies", e.target.value.split("\n"))} className="min-h-16" />
            </Field>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">Only answer questions</p><p className="text-xs text-muted-foreground">Skip praise, emoji and tags like “🔥” or “@friend”, so you don't spend answers on them.</p></div><Switch checked={f.questionsOnly} onCheckedChange={(v) => set("questionsOnly", v)} /></div>
              {(showProducts && (shopifyConnected || f.productButtons)) && <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">Add a Buy button</p><p className="text-xs text-muted-foreground">Attaches the product link under the answer.</p></div><Switch checked={f.productButtons} onCheckedChange={(v) => set("productButtons", v)} aria-label="Buy buttons" /></div>}
            </div>
          </>)}

          {sid === "review" && (<>
            <div><h2 className="text-lg font-semibold">Review and launch</h2><p className="text-sm text-muted-foreground">Press “Play flow” on the phone to watch the whole conversation.</p></div>
            <Field label="Name (only you see this)"><Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder={agent ? "e.g. Shirt reel agent" : allKeywords[0] ? `Reply to “${allKeywords[0]}”` : "e.g. Free guide giveaway"} /></Field>
            <ul className="divide-y rounded-lg border text-sm">
              {[
                ["Type", agent ? "AI agent" : "Reward automation"],
                ["Account", `@${account.username}`],
                ["Post", f.mediaId ? "One specific post" : "All posts"],
                ...(showProducts ? [["Products", linkedProducts.length ? linkedProducts.map((p) => p.title).join(", ") : "None linked"]] : []),
                ...(agent
                  ? [["Store notes", f.aiInstructions.trim() ? "Written" : "None"], ["Replies to", f.questionsOnly ? "Questions only" : "Every comment"], ["Buy button", f.productButtons ? "On" : "Off"]]
                  : [["Trigger", f.matchType === "ANY" ? "Any comment" : `${f.matchType === "EXACT" ? "Exactly" : "Contains"} ${allKeywords.join(", ")}`],
                     ["First DM", `${f.dmQuickReply ? "with quick reply" : "text only"}${goodBtns(f.dmButtons).length ? `, ${goodBtns(f.dmButtons).length} link(s)` : ""}`],
                     ["Follow check", f.requireFollow ? "On" : "Off"],
                     ["Final message", f.followUpText.trim() ? `Yes${goodBtns(f.followUpButtons).length ? `, ${goodBtns(f.followUpButtons).length} link(s)` : ""}` : "None"]]),
              ].map(([k, v]) => <li key={k} className="flex justify-between gap-4 px-3.5 py-2.5"><span className="text-muted-foreground">{k}</span><span className="text-right font-medium">{v}</span></li>)}
            </ul>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">Only once per person</p><p className="text-xs text-muted-foreground">Skip people who already got this automation.</p></div><Switch checked={f.oncePerUser} onCheckedChange={(v) => set("oncePerUser", v)} /></div>
              <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">Turn on now</p><p className="text-xs text-muted-foreground">Pause any time without deleting.</p></div><Switch checked={f.enabled} onCheckedChange={(v) => set("enabled", v)} /></div>
            </div>
            {!canFollowUp && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Link2 className="h-3.5 w-3.5" /> Follow-ups need a plan upgrade.</p>}
          </>)}
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" size="lg" onClick={() => (step === 0 ? router.back() : go(step - 1))}>{step === 0 ? "Cancel" : <><ArrowLeft /> Back</>}</Button>
          {isLast
            ? <Button type="submit" size="lg" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{initial?.id ? "Save changes" : "Launch automation"}</Button>
            : <Button type="button" size="lg" onClick={next}>Next <ArrowRight /></Button>}
        </div>
      </div>

      <aside className="lg:sticky lg:top-8 lg:self-start">
        <PhoneFlowPreview flow={flow} scene={scene} onScene={setScene} />
      </aside>
    </form>
  );
}
