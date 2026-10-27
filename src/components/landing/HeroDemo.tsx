"use client";
import { CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// One looping story: comment -> public reply -> first DM -> they answer -> follow-up.
const STEP_MS = [700, 1500, 1500, 1700, 1500, 3800];

export default function HeroDemo() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return setStep(5);
    const t = setTimeout(() => setStep((s) => (s >= 5 ? 0 : s + 1)), STEP_MS[step]);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      {/* post + comments */}
      <div className="rounded-3xl border bg-card p-4 shadow-card-hover">
        <div className="flex items-center gap-2.5 pb-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-coral to-coral-tint" />
          <div className="text-sm"><p className="font-medium leading-tight">studio.alma</p><p className="text-xs text-muted-foreground">Free brand guide, link in comments</p></div>
        </div>
        <div className="aspect-[16/9] rounded-2xl bg-coral-tint p-4">
          <p className="font-display text-2xl leading-tight">The 2026<br />Brand Guide</p>
        </div>
        <div className="mt-3 min-h-[92px] space-y-2.5 text-sm">
          <div className={cn("transition-all duration-500", step >= 1 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}>
            <p><b className="font-semibold">maya.codes</b> <span className="text-foreground/80">guide</span></p>
          </div>
          <div className={cn("ml-5 border-l-2 border-coral pl-3 transition-all duration-500", step >= 2 ? "opacity-100" : "opacity-0")}>
            <p><b className="font-semibold">studio.alma</b> <span className="text-foreground/80">@maya.codes sent you a DM!</span></p>
          </div>
        </div>
      </div>

      {/* DM thread */}
      <div className="relative -mt-3 ml-8 rounded-3xl border bg-card p-4 shadow-card-hover">
        <div className="mb-3 flex items-center justify-between border-b pb-2.5">
          <div className="flex items-center gap-2"><div className="h-6 w-6 rounded-full bg-gradient-to-br from-coral to-coral-tint" /><span className="text-xs font-semibold">studio.alma</span></div>
          <span className="text-[11px] text-muted-foreground">Direct message</span>
        </div>
        <div className="min-h-[156px] space-y-2 text-[13px]">
          <Bubble show={step >= 3} mine>Hey @maya.codes! Reply YES and I’ll send the brand guide.</Bubble>
          <Bubble show={step >= 4}>YES</Bubble>
          <Bubble show={step >= 5} mine>Here you go: alma.studio/guide</Bubble>
          <div className={cn("flex items-center justify-end gap-1 text-[11px] text-muted-foreground transition-opacity", step >= 5 ? "opacity-100" : "opacity-0")}><CheckCheck className="h-3 w-3 text-success" /> Delivered</div>
        </div>
      </div>

      <div className="absolute -left-4 top-1/2 hidden rounded-2xl border bg-card px-4 py-3 text-xs shadow-card-hover sm:block animate-float" aria-hidden>
        <p className="font-medium text-graphite">Follow-ups sent</p>
        <p className="mt-1 font-display text-2xl leading-none">128</p>
        <p className="mt-1 text-[10px] text-ash">sample data</p>
      </div>
    </div>
  );
}

function Bubble({ show, mine, children }: { show: boolean; mine?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("flex transition-all duration-500", mine ? "justify-end" : "justify-start", show ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}>
      <p className={cn("max-w-[82%] rounded-2xl px-3.5 py-2", mine ? "rounded-br-md bg-coral text-white" : "rounded-bl-md bg-muted")}>{children}</p>
    </div>
  );
}
