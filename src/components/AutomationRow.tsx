"use client";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { fmt, pct } from "@/lib/utils";

export type AutomationRowData = {
  id: string; name: string; type: "REWARD" | "AGENT"; enabled: boolean; username: string; keywords: string[]; matchType: string; mediaPermalink: string | null; mediaThumbUrl: string | null; hasFollowUp: boolean;
  stats: { triggers: number; dms: number; failed: number; replied: number; followUps: number };
};

export default function AutomationRow({ a }: { a: AutomationRowData }) {
  const router = useRouter();
  const [on, setOn] = useState(a.enabled);

  async function toggle(next: boolean) {
    setOn(next);
    const r = await fetch(`/api/automations/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: next }) });
    if (!r.ok) { setOn(!next); return toast.error("Could not update automation"); }
    toast.success(next ? "Automation turned on" : "Automation paused");
    router.refresh();
  }
  async function del() {
    const r = await fetch(`/api/automations/${a.id}`, { method: "DELETE" });
    if (!r.ok) return toast.error("Could not delete");
    toast.success("Automation deleted");
    router.refresh();
  }

  const trigger = a.type === "AGENT" ? "Answers questions" : a.matchType === "ANY" ? "Any comment" : `${a.matchType === "EXACT" ? "Exactly" : "Contains"}: ${a.keywords.join(", ")}`;
  const s = a.stats;
  return (
    <Card className={`p-4 transition-opacity sm:p-5 ${on ? "" : "opacity-70"}`}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-xs text-muted-foreground">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {a.mediaThumbUrl ? <img src={a.mediaThumbUrl} alt="" className="h-full w-full object-cover" /> : "All posts"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/dashboard/automations/${a.id}`} className="truncate font-semibold hover:text-primary">{a.name}</Link>
            <Badge variant={on ? "success" : "secondary"}>{on ? "Live" : "Paused"}</Badge>
            <Badge variant="outline">{a.type === "AGENT" ? "AI agent" : "Reward"}</Badge>
            {a.hasFollowUp && <Badge variant="outline">Follow-up</Badge>}
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">@{a.username} · {a.mediaPermalink ? "one post" : "all posts"} · {trigger}</p>
        </div>
        <Switch checked={on} onCheckedChange={toggle} aria-label="Toggle automation" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t pt-4 sm:grid-cols-5">
        {[["Triggered", s.triggers], ["DMs sent", s.dms], ["Replied", s.replied], ["Follow-ups", s.followUps], ["Failed", s.failed]].map(([l, v]) => (
          <div key={l as string}>
            <p className="font-display text-2xl tabular-nums leading-none">{fmt(v as number)}{l === "Replied" && s.dms > 0 && <span className="ml-1.5 font-sans text-xs text-muted-foreground">{pct(s.replied, s.dms)}%</span>}</p>
            <p className="mt-1 text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-end gap-1">
        {a.mediaPermalink && <Button asChild variant="ghost" size="sm"><a href={a.mediaPermalink} target="_blank" rel="noreferrer"><ExternalLink /> Post</a></Button>}
        <Button asChild variant="ghost" size="sm"><Link href={`/dashboard/automations/${a.id}`}><Pencil /> Edit</Link></Button>
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 /> Delete</Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete “{a.name}”?</AlertDialogTitle><AlertDialogDescription>Its activity and conversation history will be deleted too. This can’t be undone.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Keep it</AlertDialogCancel><AlertDialogAction onClick={del}>Delete automation</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
}
