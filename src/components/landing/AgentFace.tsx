"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// The Commiko agent: the pink plush character, waving. public/commiko-wave.webp is a cropped
// 160px animated copy of public/commiko-waving.gif; commiko-wave.png is its first frame, shown
// instead when someone prefers reduced motion. The mood only adds small cues on top of it:
// typing dots while it works, a little hop when the DM goes out.

export type Mood = "idle" | "watching" | "thinking" | "typing" | "happy";

export default function AgentFace({ mood, className }: { mood: Mood; className?: string }) {
  const [still, setStill] = useState(false);
  useEffect(() => { setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);
  const busy = mood === "thinking" || mood === "typing";

  return (
    <span aria-hidden className={cn("relative block", className)}>
      <Image key={mood === "happy" ? "hop" : "rest"} src={still ? "/commiko-wave.png" : "/commiko-wave.webp"} alt=""
        width={160} height={160} unoptimized draggable={false}
        className={cn("h-full w-full select-none object-contain", mood === "happy" && !still && "animate-pop-in")} />
      {busy && (
        <span className="absolute -right-1 top-0 flex gap-0.5 rounded-full bg-card px-1.5 py-1 shadow-card">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1 w-1 animate-bounce rounded-full bg-graphite" style={{ animationDelay: `${i * 120}ms` }} />
          ))}
        </span>
      )}
    </span>
  );
}
