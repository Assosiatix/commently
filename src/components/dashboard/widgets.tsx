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

// The chart lives in its own client component (it is interactive).
export { BarChart } from "@/components/dashboard/BarChart";
