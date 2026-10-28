"use client";
import { useEffect, useRef, useState } from "react";

// Two quiet mouse effects for the hero, desktop + hover only (off for reduced motion):
// 1. depth: the video drifts a few pixels against the pointer, eased, so the scene feels like
//    a window with depth instead of a flat background;
// 2. a "Try it live" pill trails the pointer over the character's half; clicking there scrolls
//    to the demo. The pill is decorative for pointer users; keyboard users have the hero CTA.

const DRIFT = { x: 22, y: 14 }; // px at the hero edges
const EASE = 0.08; // how quickly the video catches up (0..1 per frame)
const PILL_EASE = 0.22;

export default function HeroPointer({ video, paused, target = "#demo" }: {
  video: React.RefObject<HTMLVideoElement | null>;
  paused: boolean;
  target?: string;
}) {
  const pill = useRef<HTMLSpanElement>(null);
  const pausedRef = useRef(paused);
  const [on, setOn] = useState(false); // pill visible
  useEffect(() => { pausedRef.current = paused; if (paused) setOn(false); }, [paused]);

  useEffect(() => {
    const v = video.current;
    const hero = v?.parentElement;
    if (!v || !hero) return;
    const fine = window.matchMedia("(hover: hover) and (min-width: 1024px)");
    if (!fine.matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const goal = { x: 0, y: 0 }, now = { x: 0, y: 0 };
    const pGoal = { x: 0, y: 0 }, pNow = { x: 0, y: 0 };
    let raf = 0, inPill = false;

    function tick() {
      raf = 0;
      now.x += (goal.x - now.x) * EASE; now.y += (goal.y - now.y) * EASE;
      pNow.x += (pGoal.x - pNow.x) * PILL_EASE; pNow.y += (pGoal.y - pNow.y) * PILL_EASE;
      v!.style.transform = `translate3d(${now.x.toFixed(2)}px, ${now.y.toFixed(2)}px, 0) scale(1.04)`;
      if (pill.current) pill.current.style.transform = `translate3d(${pNow.x}px, ${pNow.y}px, 0)`;
      const moving = Math.abs(goal.x - now.x) + Math.abs(goal.y - now.y) + Math.abs(pGoal.x - pNow.x) + Math.abs(pGoal.y - pNow.y) > 0.1;
      if (moving) raf = requestAnimationFrame(tick);
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

    function onMove(e: PointerEvent) {
      if (pausedRef.current) return;
      const r = hero!.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
      goal.x = inside ? -(x / r.width - 0.5) * 2 * DRIFT.x : 0;
      goal.y = inside ? -(y / r.height - 0.5) * 2 * DRIFT.y : 0;
      // pill: only over the character's half, and not over links/buttons or the header
      const overUi = (e.target as Element | null)?.closest?.("a, button, input, header");
      const show = inside && x > r.width * 0.5 && !overUi;
      if (show && !inPill) { pNow.x = x + 18; pNow.y = y + 18; } // appear at the cursor, don't fly in
      pGoal.x = x + 18; pGoal.y = y + 18;
      if (show !== inPill) { inPill = show; setOn(show); }
      kick();
    }
    function onLeave() { goal.x = goal.y = 0; if (inPill) { inPill = false; setOn(false); } kick(); }
    function onClick(e: MouseEvent) {
      if (!inPill || (e.target as Element | null)?.closest?.("a, button, input")) return;
      document.querySelector(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("pointerleave", onLeave);
    hero.addEventListener("click", onClick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      hero.removeEventListener("click", onClick);
      v.style.transform = "";
    };
  }, [video, target]);

  useEffect(() => {
    const hero = video.current?.parentElement;
    if (hero) hero.style.cursor = on ? "pointer" : "";
  }, [on, video]);

  return (
    <span ref={pill} aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-[3] hidden will-change-transform lg:block">
      <span className={`flex items-center gap-2 rounded-full bg-foreground py-2 pl-2.5 pr-4 text-sm font-semibold text-background shadow-card-hover transition-[opacity,transform] duration-200 ease-out ${on ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}>
        <span className="grid h-5 w-5 place-items-center rounded-full bg-coral">
          <svg viewBox="0 0 10 10" className="ml-px h-2 w-2 fill-white"><path d="M2 1.2v7.6L8.6 5z" /></svg>
        </span>
        Try it live
      </span>
    </span>
  );
}
