"use client";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

// Decorative looping background for the hero (the Commiko character answering comments).
// Once the hero scrolls away, the video flies into a small frame at the bottom right and keeps
// playing from the same moment; scrolling back up hands it back to the hero. The frame can be
// dragged anywhere on screen (mouse, touch, or arrow keys); a click without dragging goes to the top.
// Muted + playsInline so it autoplays on phones; no motion for people who prefer reduced motion.

const SRC = "/commiko-hero-bg-v2.webm";
const EDGE = 8; // keep the frame this far from the screen edges
const HEADER = 72; // and below the fixed header
const DRAG_START = 5; // px of movement before a press counts as a drag, not a click

type Pos = { x: number; y: number };

export default function HeroVideo({ className }: { className?: string }) {
  const hero = useRef<HTMLVideoElement>(null);
  const mini = useRef<HTMLVideoElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const reduce = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [away, setAway] = useState(false); // hero video scrolled (mostly) above the viewport
  const [closed, setClosed] = useState(false); // closed for this trip down the page only
  const floating = away && !closed;
  const [pos, setPos] = useState<Pos | null>(null); // null = default bottom-right corner
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);

  /** Keep a top-left position fully on screen and below the header. */
  function clamp(x: number, y: number): Pos {
    const c = card.current;
    const w = c?.offsetWidth ?? 0, h = c?.offsetHeight ?? 0;
    return {
      x: Math.min(Math.max(EDGE, x), window.innerWidth - w - EDGE),
      y: Math.min(Math.max(HEADER, y), window.innerHeight - h - EDGE),
    };
  }

  // a resized window must never strand the frame off screen
  useEffect(() => {
    if (!pos) return;
    const onResize = () => setPos((p) => (p ? clamp(p.x, p.y) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pos === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const toTop = () => window.scrollTo({ top: 0, behavior: reduce.current ? "auto" : "smooth" });

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || !card.current) return;
    const r = card.current.getBoundingClientRect();
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, moved: false };
    card.current.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < DRAG_START) return;
    if (!d.moved) { d.moved = true; setDragging(true); }
    setPos(clamp(e.clientX - d.dx, e.clientY - d.dy));
  }
  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (d && !d.moved) toTop(); // a plain click, not a drag
  }
  /** Arrow keys move the focused frame; Shift moves it further. */
  function onKeyDown(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 64 : 24;
    const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!move || !card.current) return;
    e.preventDefault();
    const r = card.current.getBoundingClientRect();
    setPos(clamp(r.left + move[0], r.top + move[1]));
  }

  // back at the hero = a fresh start: the next scroll down brings the frame back
  useEffect(() => { if (!away) setClosed(false); }, [away]);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduce.current = mq.matches;
    if (!mq.matches) hero.current?.play().catch(() => { /* autoplay blocked: the first frame still shows */ });
    const el = hero.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setAway(e.intersectionRatio < 0.25 && e.boundingClientRect.top < 0),
      { threshold: [0, 0.25, 0.5, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // hand playback between the two players so it never restarts from zero
  useEffect(() => {
    const h = hero.current, m = mini.current;
    if (!h || !m) return;
    const play = (v: HTMLVideoElement) => { if (!reduce.current) v.play().catch(() => {}); };
    if (floating) {
      m.currentTime = h.currentTime;
      play(m);
      h.pause();
      flyIn();
    } else {
      if (!m.paused) h.currentTime = m.currentTime;
      m.pause();
      if (away) h.pause(); else play(h);
    }
  }, [floating, away]); // eslint-disable-line react-hooks/exhaustive-deps

  /** FLIP: start the frame where the hero video is, then let it settle into the corner. */
  function flyIn() {
    const c = card.current, h = hero.current;
    if (!c || !h || reduce.current) return;
    const to = c.getBoundingClientRect();
    const from = h.getBoundingClientRect();
    if (!to.width || !from.width) return;
    c.style.transition = "none";
    c.style.transformOrigin = "top left";
    c.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
    c.style.opacity = "0.3";
    c.getBoundingClientRect(); // commit the start position before animating
    c.style.transition = "transform 750ms cubic-bezier(.22,1,.36,1), opacity 350ms ease-out";
    c.style.transform = "";
    c.style.opacity = "";
  }

  return (
    <>
      <video ref={hero} src={SRC} autoPlay muted loop playsInline preload="auto" aria-hidden tabIndex={-1}
        className={cn("pointer-events-none select-none object-cover", className)} />

      {mounted && createPortal(
        <div ref={card}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          style={pos ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" } : undefined}
          className={cn(
            "group fixed bottom-4 right-4 z-30 w-[150px] origin-bottom-right touch-none select-none overflow-hidden rounded-2xl border bg-[#F2F2F2] transition-[opacity,transform,box-shadow] duration-300 sm:bottom-6 sm:right-6 sm:w-[240px] sm:rounded-3xl lg:w-[280px]",
            dragging ? "cursor-grabbing shadow-[0_24px_60px_-12px_oklch(0.25_0.01_20/0.35)]" : "cursor-grab shadow-card-hover",
            floating ? "opacity-100" : "pointer-events-none translate-y-4 scale-95 opacity-0",
          )}
          aria-hidden={!floating}>
          {/* keyboard path: Enter goes to the top, arrow keys move the frame (pointer clicks are handled on pointer up) */}
          <button type="button" tabIndex={floating ? 0 : -1} aria-label="Commiko video. Drag or use the arrow keys to move it, press Enter to go back to the top."
            onClick={(e) => { if (e.detail === 0) toTop(); }} onKeyDown={onKeyDown} className="block w-full cursor-[inherit] focus-visible:outline-none">
            <video ref={mini} src={SRC} muted loop playsInline preload="auto" aria-hidden tabIndex={-1} className="pointer-events-none block aspect-[4/3] w-full origin-[82%_42%] scale-[1.35] select-none object-cover object-[84%_50%]" />
          </button>
          {/* drag handle: tells people the frame can be picked up */}
          <span aria-hidden className="pointer-events-none absolute left-1/2 top-2 h-1 w-8 -translate-x-1/2 rounded-full bg-black/25 opacity-70 transition-opacity group-hover:opacity-100 sm:top-2.5 sm:w-10" />
          <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] ring-coral ring-offset-0 group-has-[:focus-visible]:ring-4" />
          <button type="button" tabIndex={floating ? 0 : -1} aria-label="Close video" onPointerDown={(e) => e.stopPropagation()} onClick={() => setClosed(true)}
            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-foreground shadow-card transition-colors hover:bg-white sm:right-3 sm:top-3 sm:h-8 sm:w-8">
            <X className="h-4 w-4" />
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}
