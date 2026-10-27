"use client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

export default function StoreNotes({ id, initial }: { id: string; initial: string }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    const r = await fetch("/api/shopify/store", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, notes: v }) });
    setBusy(false);
    if (!r.ok) return toast.error("Could not save the notes");
    toast.success("Store notes saved");
    router.refresh();
  }
  return (
    <div className="space-y-3">
      <Textarea value={v} onChange={(e) => setV(e.target.value)} maxLength={3000} className="min-h-32"
        placeholder={"Delivery: 3-5 working days across Pakistan, 1-2 days in Karachi/Lahore. Free delivery above Rs 5,000.\nPayment: Cash on delivery, bank transfer, JazzCash.\nReturns: exchange within 7 days if unworn.\nSize guide: M fits chest 38-40 inches."} />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{v.length}/3000. Only what you write here (and your products) is ever promised to customers.</p>
        <Button size="sm" onClick={save} disabled={busy || v === initial}>{busy && <Loader2 className="animate-spin" />} Save notes</Button>
      </div>
    </div>
  );
}
