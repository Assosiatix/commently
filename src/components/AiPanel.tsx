"use client";
import { CheckCircle2, Loader2, ShieldAlert, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type TestResult = {
  result: { usable: boolean; answer?: string; reason?: string; intent?: string; confidence?: number; needsHuman?: boolean };
  products: string[];
  model: string;
};

const EXAMPLES = ["kitne ka hai?", "Medium size hai?", "delivery kitne din mein?", "Do you have a discount?"];

export default function AiPanel({ instructions, onInstructions, accountId, mediaId, available, productCount }: {
  instructions: string; onInstructions: (v: string) => void;
  accountId: string; mediaId: string | null; available: boolean; productCount: number;
}) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<TestResult | null>(null);

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

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div>
        <p className="text-sm font-semibold">What the agent knows</p>
        <p className="text-xs text-muted-foreground">Your linked products plus the notes below. It answers from these only, and passes everything else to you.</p>
      </div>
      {!available && <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">AI is not configured on this server yet (GEMINI_API_KEY).</p>}

      {available && (<>
        {productCount === 0 && <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">No products are linked to this post, so the AI can only use the store notes below. Assign products in Catalog for price and stock answers.</p>}
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="ai-notes">Store notes <span className="font-normal text-muted-foreground">(optional)</span></label>
          <Textarea id="ai-notes" value={instructions} onChange={(e) => onInstructions(e.target.value)} maxLength={1500} className="min-h-24" placeholder="e.g. Delivery takes 3-5 working days across Pakistan. Cash on delivery available. Returns within 7 days. Free delivery above Rs 5,000." />
          <p className="text-xs text-muted-foreground">The AI will only promise what is written here or in your products. Anything else (discounts, delivery, colours) is passed to you instead of guessed.</p>
        </div>

        <div className="space-y-2 rounded-lg bg-muted/50 p-3">
          <p className="text-sm font-medium">Try a customer comment</p>
          <div className="flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); run(); } }} placeholder="e.g. size M hai?" maxLength={500} />
            <Button type="button" onClick={() => run()} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Test</Button>
          </div>
          <div className="flex flex-wrap gap-1.5">{EXAMPLES.map((e) => <button key={e} type="button" onClick={() => run(e)} className="rounded-full border bg-card px-2.5 py-1 text-xs transition hover:border-primary/50 hover:text-primary">{e}</button>)}</div>

          {res && (
            <div className="space-y-2 rounded-lg border bg-card p-3 text-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                {res.result.usable
                  ? <Badge variant="success"><CheckCircle2 className="h-3 w-3" /> Would be sent</Badge>
                  : <Badge variant="warning"><ShieldAlert className="h-3 w-3" /> Blocked, your written message is used</Badge>}
                {res.result.intent && <Badge variant="secondary">{res.result.intent.replace("_", " ")}</Badge>}
                {typeof res.result.confidence === "number" && <Badge variant="secondary">{Math.round(res.result.confidence * 100)}% sure</Badge>}
                {res.result.needsHuman && <Badge variant="destructive"><UserRound className="h-3 w-3" /> Flagged for you</Badge>}
              </div>
              {res.result.answer && <p className="whitespace-pre-wrap rounded-lg bg-primary-soft px-3 py-2 text-foreground">{res.result.answer}</p>}
              {!res.result.usable && res.result.reason && <p className="text-xs text-muted-foreground">Why: {res.result.reason}</p>}
              <p className="text-[11px] text-muted-foreground">{res.products.length ? `Products used: ${res.products.join(", ")}` : "No products linked"} · {res.model}</p>
            </div>
          )}
        </div>
      </>)}
    </div>
  );
}
