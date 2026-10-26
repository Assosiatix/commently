"use client";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function CopyField({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      toast.success("Copied");
      setTimeout(() => setDone(false), 1500);
    } catch {
      toast.error("Copy failed, select the text manually");
    }
  }
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-lg border bg-muted px-3 py-2.5 font-mono text-[13px]">{value}</code>
        <Button type="button" variant="outline" size="icon" className="h-[42px] w-[42px]" onClick={copy} aria-label={`Copy ${label}`}>{done ? <Check /> : <Copy />}</Button>
      </div>
    </div>
  );
}
