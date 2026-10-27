import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Delta({ now, prev }: { now: number; prev: number }) {
  if (!prev && !now) return <span className="text-xs text-muted-foreground">no data yet</span>;
  if (!prev) return <span className="text-xs font-semibold text-success">new</span>;
  const d = Math.round(((now - prev) / prev) * 100);
  const Icon = d > 0 ? ArrowUpRight : d < 0 ? ArrowDownRight : Minus;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", d > 0 ? "text-success" : d < 0 ? "text-warning" : "text-muted-foreground")}>
      <Icon className="h-3.5 w-3.5" />{Math.abs(d)}% <span className="font-normal text-muted-foreground">vs previous</span>
    </span>
  );
}

export function StatCard({ label, value, icon: Icon, foot, tone }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; foot?: React.ReactNode; tone?: "default" | "bad" }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-graphite">{label}</p>
        <span className={cn("grid h-9 w-9 place-items-center rounded-full", tone === "bad" ? "bg-coral-tint text-warning" : "bg-coral-soft text-coral")}><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-4 font-display text-4xl font-bold leading-none tabular-nums">{value}</p>
      <div className="mt-2 min-h-4">{foot}</div>
    </Card>
  );
}

/** Dependency-free stacked bar chart (DMs + follow-ups per day). */
export function BarChart({ data }: { data: { label: string; dms: number; followUps: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.dms + d.followUps));
  const ticks = [max, Math.round(max / 2), 0];
  return (
    <div className="flex gap-3">
      <div className="flex h-44 flex-col justify-between pb-6 text-[11px] tabular-nums text-muted-foreground">{ticks.map((t, i) => <span key={i}>{t}</span>)}</div>
      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-x-0 top-0 flex h-44 flex-col justify-between pb-6">
          {ticks.map((_, i) => <div key={i} className="border-t border-dashed border-border" />)}
        </div>
        <div className="relative flex h-44 items-end gap-1.5">
          {data.map((d, i) => {
            const total = d.dms + d.followUps;
            const h = (total / max) * 100;
            return (
              <div key={i} className="group relative flex h-full flex-1 flex-col justify-end pb-6" title={`${d.label}: ${d.dms} DMs, ${d.followUps} follow-ups`}>
                <div className="flex w-full flex-col justify-end overflow-hidden rounded-t-lg transition-opacity group-hover:opacity-80" style={{ height: `${h}%`, minHeight: total ? 4 : 0 }}>
                  <div className="bg-foreground/85" style={{ flex: d.followUps }} />
                  <div className="bg-coral" style={{ flex: d.dms }} />
                </div>
                <span className="absolute inset-x-0 bottom-0 truncate text-center text-[10px] text-muted-foreground">{i % 2 === 0 || data.length <= 8 ? d.label : ""}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Legend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-coral" /> First DMs</span>
      <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-foreground/85" /> Follow-ups</span>
    </div>
  );
}
