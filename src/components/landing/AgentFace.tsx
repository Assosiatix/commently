"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// The Commiko agent: the logo's speech bubble with a face. It only reacts to what the visitor
// does (looks at the pointer, watches the comment box, thinks, types, smiles when the DM is sent).

export type Mood = "idle" | "watching" | "thinking" | "typing" | "happy";

/** Where the pupils point, -1..1 on each axis; null = follow the pointer. */
const FIXED_LOOK: Partial<Record<Mood, { x: number; y: number }>> = {
  watching: { x: 0.35, y: 0.9 },
  thinking: { x: 0.5, y: -0.85 },
  typing: { x: 0.2, y: 0.85 },
};

const MOUTH: Record<Mood, string> = {
  idle: "M50 70 Q60 77 70 70",
  watching: "M54 72 Q60 75 66 72",
  thinking: "M53 72 L67 71",
  typing: "M55 71 Q60 74 65 71",
  happy: "M46 67 Q60 84 74 67 Z",
};

export default function AgentFace({ mood, className }: { mood: Mood; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    function move(e: PointerEvent) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const clamp = (v: number) => Math.max(-1, Math.min(1, v));
        setPointer({ x: clamp(dx / 300), y: clamp(dy / 300) });
      });
    }
    let t: ReturnType<typeof setTimeout>;
    const loop = () => { t = setTimeout(() => { setBlink(true); setTimeout(() => setBlink(false), 140); loop(); }, 2800 + Math.random() * 2600); };
    loop();
    window.addEventListener("pointermove", move);
    return () => { window.removeEventListener("pointermove", move); cancelAnimationFrame(frame); clearTimeout(t); };
  }, []);

  const look = FIXED_LOOK[mood] ?? pointer;
  const px = look.x * 4.5;
  const py = look.y * 4;
  const happy = mood === "happy";

  return (
    <svg ref={ref} viewBox="0 0 120 112" className={cn("overflow-visible", className)} aria-hidden>
      {/* body: the logo bubble */}
      <g className={cn("origin-bottom transition-transform duration-300 [transform-box:fill-box]", happy && "-translate-y-1 scale-[1.04]")}>
        <path d="M22 8h76a16 16 0 0 1 16 16v48a16 16 0 0 1-16 16H60L36 106V88H22A16 16 0 0 1 6 72V24A16 16 0 0 1 22 8Z" className="fill-coral" />
        <path d="M22 8h76a16 16 0 0 1 16 16v6H6v-6A16 16 0 0 1 22 8Z" className="fill-white/15" />
        {/* cheeks */}
        <circle cx="30" cy="66" r="6" className={cn("fill-white/25 transition-opacity", happy ? "opacity-100" : "opacity-0")} />
        <circle cx="90" cy="66" r="6" className={cn("fill-white/25 transition-opacity", happy ? "opacity-100" : "opacity-0")} />
        {/* eyes */}
        {happy ? (
          <>
            <path d="M33 47 Q41 37 49 47" className="fill-none stroke-white" strokeWidth="5" strokeLinecap="round" />
            <path d="M71 47 Q79 37 87 47" className="fill-none stroke-white" strokeWidth="5" strokeLinecap="round" />
          </>
        ) : (
          [41, 79].map((cx) => (
            <g key={cx}>
              <ellipse cx={cx} cy="46" rx="11" ry={blink ? 1.2 : 12} className="fill-white transition-[ry] duration-100" />
              {!blink && <circle cx={cx + px} cy={46 + py} r="5.2" className="fill-foreground transition-[cx,cy] duration-200 ease-out dark:fill-background" />}
            </g>
          ))
        )}
        {/* mouth */}
        <path d={MOUTH[mood]} className={cn("stroke-white transition-all duration-200", happy ? "fill-white" : "fill-none")} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* thinking dots */}
      {mood === "thinking" && (
        <g className="fill-coral">
          {[0, 1, 2].map((i) => <circle key={i} cx={96 + i * 9} cy={-2 - i * 4} r={2.5 + i} className="animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />)}
        </g>
      )}
    </svg>
  );
}
