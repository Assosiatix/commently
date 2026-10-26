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
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-primary/15 blur-3xl" aria-hidden />
      {/* post + comments */}
      <div className="rounded-3xl border bg-card p-4 shadow-xl">
        <div className="flex items-center gap-2.5 pb-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-amber-400" />
          <div className="text-sm"><p className="font-medium leading-tight">studio.alma</p><p className="text-xs text-muted-foreground">Free brand guide, link in comments</p></div>
        </div>
        <div className="aspect-[16/9] rounded-xl bg-secondary p-4">
          <p className="font-display text-3xl leading-none text-foreground/80">The 2026<br />Brand Guide</p>
        </div>
        <div className="mt-3 min-h-[92px] space-y-2.5 text-sm">
          <div className={cn("transition-all duration-500", step >= 1 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}>
            <p><b className="font-medium">maya.codes</b> <span className="text-foreground/80">guide</span></p>
          </div>
          <div className={cn("ml-5 border-l-2 border-primary pl-3 transition-all duration-500", step >= 2 ? "opacity-100" : "opacity-0")}>
            <p><b className="font-medium">studio.alma</b> <span className="text-foreground/80">@maya.codes sent you a DM!</span></p>
          </div>
        </div>
      </div>

      {/* DM thread */}
      <div className="relative -mt-3 ml-8 rounded-3xl border bg-card p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between border-b pb-2.5">
          <div className="flex items-center gap-2"><div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-amber-400" /><span className="text-xs font-medium">studio.alma</span></div>
          <span className="text-[11px] text-muted-foreground">Direct message</span>
        </div>
        <div className="min-h-[156px] space-y-2 text-[13px]">
          <Bubble show={step >= 3} mine>Hey @maya.codes! Reply YES and I’ll send the brand guide.</Bubble>
          <Bubble show={step >= 4}>YES</Bubble>
          <Bubble show={step >= 5} mine>Here you go: alma.studio/guide</Bubble>
          <div className={cn("flex items-center justify-end gap-1 text-[11px] text-muted-foreground transition-opacity", step >= 5 ? "opacity-100" : "opacity-0")}><CheckCheck className="h-3 w-3 text-primary" /> Delivered</div>
        </div>
      </div>

      <div className="absolute -left-4 top-1/2 hidden rounded-2xl border bg-card px-3.5 py-2.5 text-xs shadow-lg sm:block animate-float" aria-hidden>
        <p className="text-muted-foreground">Follow-ups sent</p>
        <p className="font-display text-2xl leading-none">128</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">sample data</p>
      </div>
    </div>
  );
}

function Bubble({ show, mine, children }: { show: boolean; mine?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("flex transition-all duration-500", mine ? "justify-end" : "justify-start", show ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}>
      <p className={cn("max-w-[82%] rounded-2xl px-3.5 py-2", mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted")}>{children}</p>
    </div>
  );
}
