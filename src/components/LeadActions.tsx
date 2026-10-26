"use client";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LeadActions({ id, status, needsAttention }: { id: string; status: string; needsAttention: boolean }) {
  const router = useRouter();
  async function patch(body: object, ok: string) {
    const r = await fetch(`/api/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) return toast.error("Could not update");
    toast.success(ok);
    router.refresh();
  }
  return (
    <div className="flex items-center justify-end gap-2">
      {needsAttention && <Button size="sm" variant="outline" onClick={() => patch({ needsAttention: false }, "Marked as handled")}><Check /> Handled</Button>}
      <Select value={status} onValueChange={(v) => patch({ status: v }, "Status updated")}>
        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="contacted">Contacted</SelectItem><SelectItem value="customer">Customer</SelectItem></SelectContent>
      </Select>
    </div>
  );
}
