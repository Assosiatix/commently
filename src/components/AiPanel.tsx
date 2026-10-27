"use client";
import { Check, CheckCircle2, Loader2, ShieldAlert, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Knows = { coverage: { key: string; label: string; ok: boolean }[]; context: string; products: string[]; model: string };
type TestResult = Knows & {
  result: { usable: boolean; answer?: string; reason?: string; intent?: string; confidence?: number; needsHuman?: boolean; missingInfo?: boolean } | null;
};

const EXAMPLES = ["how much is this?", "is medium available?", "which colours do you have?", "how long is delivery?", "is cash on delivery available?"];
const HINTS: Record<string, string> = {
  sizes: "Add sizes/variants to the product in Shopify, or mention them in the notes.",
  colors: "Add a Colour option in Shopify, or write the colours in the notes.",
  description: "Add a product description in Shopify so the agent can describe it.",
  delivery: "Write delivery times in the notes, for example “Delivery 3-5 working days across Pakistan”.",
  payment: "Say whether COD or other payment methods are available.",
  returns: "Write your return or exchange policy.",
};

export default function AiPanel({ instructions, onInstructions, accountId, mediaId, available, productCount, showProducts = true }: {
  showProducts?: boolean; instructions: string; onInstructions: (v: string) => void;
  accountId: string; mediaId: string | null; available: boolean; productCount: number;
}) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<TestResult | null>(null);
  const [knows, setKnows] = useState<Knows | null>(null);

  // Free (no AI call): what the agent would be shown for this post, refreshed as the notes change.
  useEffect(() => {
    if (!accountId) return;
    const t = setTimeout(async () => {
      const r = await fetch("/api/ai/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId, mediaId, instructions }) });
      if (r.ok) setKnows(await r.json());
    }, 400);
    return () => clearTimeout(t);
  }, [accountId, mediaId, instructions]);

  async function run(text = q) {
    if (!text.trim()) return toast.error("Type a customer comment to try");
    setQ(text);
    setBusy(true);
    setRes(null);
    const r = await fetch("/api/ai/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId, mediaId, comment: text, instructions }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return toast.error("Could not test", { description: j.error });
    setRes(j);
  }

  const gaps = (knows?.coverage ?? []).filter((c) => !c.ok && HINTS[c.key]);

  return (
    <div className="space-y-5 rounded-2xl bg-surface p-5">
      <div>
        <p className="font-display text-base font-semibold">What the agent knows</p>
        <p className="text-xs text-muted-foreground">{showProducts ? "Your linked products plus the notes below." : "The notes below."} It answers from these only. What it cannot back up it hands to you instead of guessing.</p>
      </div>
      {!available && <p className="rounded-xl bg-warning-soft px-3 py-2 text-xs font-medium text-warning">AI is not configured on this server yet (GEMINI_API_KEY).</p>}

      {available && (<>
        {showProducts && productCount === 0 && <p className="rounded-xl bg-card px-3 py-2 text-xs text-graphite">No products are linked to this post, so the AI can only use the notes below. Assign products in Catalog for price, size and stock answers.</p>}

        {knows && showProducts && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {knows.coverage.map((c) => (
                <span key={c.key} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", c.ok ? "bg-success-soft text-success" : "bg-card text-graphite")}>
                  {c.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}{c.label}
                </span>
              ))}
            </div>
            {gaps.length > 0 && (
              <ul className="space-y-0.5 text-xs text-muted-foreground">
                {gaps.slice(0, 3).map((g) => <li key={g.key}>• {HINTS[g.key]}</li>)}
              </ul>
            )}
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">See exactly what the agent is shown</summary>
              <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-card p-3 font-mono text-[11px] leading-relaxed">{knows.context}</pre>
            </details>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="ai-notes">Notes for this agent <span className="font-normal text-muted-foreground">(optional)</span></label>
          <Textarea id="ai-notes" value={instructions} onChange={(e) => onInstructions(e.target.value)} maxLength={1500} className="min-h-24" placeholder={showProducts ? "e.g. Delivery takes 3-5 working days across Pakistan. Cash on delivery available. Returns within 7 days. Free delivery above Rs 5,000." : "e.g. I teach web design. My course costs Rs 15,000 and starts on 1 November. Book a free call: https://yourlink.com"} />
          {showProducts && <p className="text-xs text-muted-foreground">Notes that apply to your whole store (delivery, COD, returns) can be saved once on the <Link href="/dashboard/shopify" className="font-semibold text-foreground underline decoration-coral underline-offset-4 hover:text-coral">Shopify page</Link> and are shared by every agent.</p>}
        </div>

        <div className="space-y-3 rounded-2xl bg-card p-4 shadow-card">
          <p className="text-sm font-medium">Try a customer comment</p>
          <div className="flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); run(); } }} placeholder="e.g. is size M available?" maxLength={500} />
            <Button type="button" onClick={() => run()} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Test</Button>
          </div>
          <div className="flex flex-wrap gap-1.5">{EXAMPLES.map((e) => <button key={e} type="button" onClick={() => run(e)} className="rounded-full border bg-card px-3 py-1 text-xs font-medium transition hover:border-coral hover:bg-coral-soft">{e}</button>)}</div>

          {res?.result && (
            <div className="space-y-2 rounded-2xl bg-surface p-4 text-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                {res.result.usable
                  ? <Badge variant="success"><CheckCircle2 className="h-3 w-3" /> Would be sent</Badge>
                  : <Badge variant="warning"><ShieldAlert className="h-3 w-3" /> Blocked, your written message is used</Badge>}
                {res.result.intent && <Badge variant="secondary">{res.result.intent.replace("_", " ")}</Badge>}
                {typeof res.result.confidence === "number" && <Badge variant="secondary">{Math.round(res.result.confidence * 100)}% sure</Badge>}
                {res.result.missingInfo && <Badge variant="warning">Part of it needs you</Badge>}
                {res.result.needsHuman && <Badge variant="destructive"><UserRound className="h-3 w-3" /> Flagged for you</Badge>}
              </div>
              {res.result.answer && <p className="whitespace-pre-wrap rounded-xl bg-coral-soft px-3.5 py-2.5 text-foreground">{res.result.answer}</p>}
              {!res.result.usable && res.result.reason && <p className="text-xs text-muted-foreground">Why: {res.result.reason}</p>}
              {(res.result.missingInfo || res.result.needsHuman) && <p className="text-xs text-muted-foreground">The agent did not have this information. Add it to the product in Shopify or to the notes, then test again.</p>}
              <p className="text-[11px] text-muted-foreground">{res.products.length ? `Products used: ${res.products.join(", ")}` : "No products linked"} · {res.model}</p>
            </div>
          )}
        </div>
      </>)}
    </div>
  );
}
