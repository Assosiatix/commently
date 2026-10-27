"use client";
import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Stacked daily columns (first DMs + follow-ups), no chart library.
// Spec (dataviz skill): columns <= 24px with a 4px rounded top and square base, 2px surface gap
// between segments, hairline solid grid, clean ticks, legend + per-column tooltip + table view.
// Series colours are --chart-1/--chart-2 (globals.css), validated separately for light and dark.

export type BarPoint = { label: string; dms: number; followUps: number };

const SERIES = [
  { key: "dms", name: "First DMs", color: "var(--chart-1)" },
  { key: "followUps", name: "Follow-ups", color: "var(--chart-2)" },
] as const;
type SeriesKey = (typeof SERIES)[number]["key"];

const fmt = (n: number) => n.toLocaleString("en");
const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}K` : String(n));

/** Round the axis up to a clean top value and split it into 4 even steps. */
function scale(max: number) {
  if (max <= 0) return { top: 4, ticks: [0, 1, 2, 3, 4] };
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  const step = Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow);
  const top = Math.ceil(max / step) * step;
  return { top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step) };
}

export function BarChart({ data, height = 200 }: { data: BarPoint[]; height?: number }) {
  const [active, setActive] = useState<number | null>(null);
  const [focusSeries, setFocusSeries] = useState<SeriesKey | null>(null);
  const [table, setTable] = useState(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const totals = useMemo(() => ({ dms: data.reduce((a, d) => a + d.dms, 0), followUps: data.reduce((a, d) => a + d.followUps, 0) }), [data]);
  const { top, ticks } = useMemo(() => scale(Math.max(0, ...data.map((d) => d.dms + d.followUps))), [data]);
  const empty = totals.dms + totals.followUps === 0;
  const labelEvery = Math.ceil(data.length / 7);
  const last = data.length - 1;
  // thinned x labels; the last day is always labelled, so drop a regular label that would crowd it
  const showLabel = (i: number) => i === last || (i % labelEvery === 0 && last - i >= labelEvery);

  function onKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const from = active ?? 0;
    const next = Math.min(last, Math.max(0, from + (e.key === "ArrowRight" ? 1 : -1)));
    buttons.current[next]?.focus();
  }

  const a = active !== null ? data[active] : null;

  return (
    <div>
      {/* legend: identity never rides on colour alone; hover a series to isolate it */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {SERIES.map((s) => (
            <button key={s.key} type="button" onMouseEnter={() => setFocusSeries(s.key)} onMouseLeave={() => setFocusSeries(null)} onFocus={() => setFocusSeries(s.key)} onBlur={() => setFocusSeries(null)}
              className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition-opacity", focusSeries && focusSeries !== s.key && "opacity-40")}>
              <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} />
              <span className="text-graphite">{s.name}</span>
              <b className="font-semibold tabular-nums">{fmt(totals[s.key])}</b>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setTable((t) => !t)} aria-expanded={table} className="text-[13px] font-semibold text-graphite underline decoration-coral underline-offset-4 hover:text-foreground">
          {table ? "Show chart" : "Show as table"}
        </button>
      </div>

      {table ? (
        <div className="mt-5 max-h-[280px] overflow-auto rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-left text-[13px] text-graphite">
              <tr><th className="px-4 py-2.5 font-medium">Day</th>{SERIES.map((s) => <th key={s.key} className="px-4 py-2.5 text-right font-medium">{s.name}</th>)}<th className="px-4 py-2.5 text-right font-medium">Total</th></tr>
            </thead>
            <tbody className="divide-y">
              {data.map((d) => (
                <tr key={d.label}><td className="px-4 py-2">{d.label}</td><td className="px-4 py-2 text-right tabular-nums">{fmt(d.dms)}</td><td className="px-4 py-2 text-right tabular-nums">{fmt(d.followUps)}</td><td className="px-4 py-2 text-right font-semibold tabular-nums">{fmt(d.dms + d.followUps)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-6 flex gap-3">
          {/* y axis */}
          <div className="relative w-7 shrink-0 text-right text-[11px] tabular-nums text-ash" style={{ height }} aria-hidden>
            {ticks.map((t) => <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>{compact(t)}</span>)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="relative" style={{ height }} onMouseLeave={() => setActive(null)}>
              {/* grid: hairline, solid, recessive; the baseline a step stronger */}
              {ticks.map((t) => <div key={t} aria-hidden className={cn("absolute inset-x-0 border-t", t === 0 ? "border-foreground/20" : "border-border/70")} style={{ bottom: `${(t / top) * 100}%` }} />)}

              {empty && <p className="absolute inset-0 grid place-items-center text-sm text-graphite">No messages in this period yet.</p>}

              <div role="group" aria-label="Messages sent per day" onKeyDown={onKey} className="absolute inset-0 flex">
                {data.map((d, i) => {
                  const total = d.dms + d.followUps;
                  const h = (total / top) * 100;
                  const dim = active !== null && active !== i;
                  return (
                    <button key={d.label + i} ref={(el) => { buttons.current[i] = el; }} type="button"
                      aria-label={`${d.label}: ${fmt(d.dms)} first DMs, ${fmt(d.followUps)} follow-ups, ${fmt(total)} in total`}
                      onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}
                      className="group relative flex h-full flex-1 items-end justify-center outline-none">
                      {/* hover band: the whole slot is the hit target, not just the painted bar */}
                      <span aria-hidden className={cn("absolute inset-x-[3px] inset-y-0 rounded-lg bg-muted transition-opacity duration-150", active === i ? "opacity-100" : "opacity-0", "group-focus-visible:ring-2 group-focus-visible:ring-coral")} />
                      {total > 0 && (
                        <span aria-hidden className={cn("relative flex w-[62%] max-w-[24px] origin-bottom animate-bar-grow flex-col-reverse gap-[2px] overflow-hidden rounded-t-[4px] transition-opacity duration-150", dim && "opacity-40")}
                          style={{ height: `${h}%`, animationDelay: `${i * 30}ms` }}>
                          {SERIES.map((s) => d[s.key] > 0 && (
                            <span key={s.key} className={cn("block min-h-[2px] transition-opacity duration-150", focusSeries && focusSeries !== s.key && "opacity-20")} style={{ flexGrow: d[s.key], flexBasis: 0, background: s.color }} />
                          ))}
                        </span>
                      )}
                      {/* one direct label: the latest day's total, so the reader has today without hovering */}
                      {i === last && total > 0 && active === null && (
                        <span aria-hidden className="absolute text-[11px] font-semibold tabular-nums text-foreground" style={{ bottom: `calc(${h}% + 6px)` }}>{fmt(total)}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* tooltip: values lead, series names follow; line keys, not boxes */}
              {a && active !== null && (
                <div role="status" className="pointer-events-none absolute z-20 w-44 rounded-2xl border bg-card p-3 text-[13px] shadow-card-hover"
                  // beside the column, never over it: right of it in the first half, left of it after
                  style={active < data.length / 2
                    ? { top: 0, left: `calc(${((active + 1) / data.length) * 100}% + 6px)` }
                    : { top: 0, right: `calc(${((data.length - active) / data.length) * 100}% + 6px)` }}>
                  <p className="font-medium text-graphite">{a.label}</p>
                  <ul className="mt-2 space-y-1.5">
                    {[...SERIES].reverse().map((s) => (
                      <li key={s.key} className="flex items-center gap-2"><i className="h-[3px] w-3 rounded-full" style={{ background: s.color }} /><b className="font-semibold tabular-nums">{fmt(a[s.key])}</b><span className="text-graphite">{s.name}</span></li>
                    ))}
                  </ul>
                  <p className="mt-2 flex justify-between border-t pt-2"><span className="text-graphite">Total</span><b className="font-semibold tabular-nums">{fmt(a.dms + a.followUps)}</b></p>
                </div>
              )}
            </div>

            {/* x axis: thinned labels, the hovered day always shown */}
            <div className="mt-2 flex" aria-hidden>
              {data.map((d, i) => (
                <span key={d.label + i} className={cn("flex-1 truncate text-center text-[11px] tabular-nums", active === i ? "font-semibold text-foreground" : "text-ash")}>
                  {active === i || ((active === null || Math.abs(active - i) > 1) && showLabel(i)) ? d.label : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
