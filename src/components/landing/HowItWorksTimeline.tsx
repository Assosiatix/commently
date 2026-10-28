"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Step = { code: string; title: string; text: string; video: string };

// Screen recordings Rehan dropped in /public, matched to the beat they illustrate.
// `code` is what the timecode readout on the video shows — real elapsed time for the
// fast beats, a status word for the two that don't happen on a fixed clock.
const STEPS: Step[] = [
  {
    code: "0:00",
    title: "They comment “how much?” on your reel.",
    text: "You were asleep, or busy, or on comment number 200. Doesn’t matter.",
    video: "/NEW COMMENT DETECTED.mp4",
  },
  {
    code: "0:02",
    title: "A reply shows up under their comment.",
    text: "Everyone scrolling sees you answered. Write a few versions and one is picked at random, so it never looks copy-pasted.",
    video: "/WORKING.mp4",
  },
  {
    code: "0:03",
    title: "They get a DM with the answer.",
    text: "The price, the sizes in stock and a Buy button, taken from your Shopify products. Or your guide, your link, your discount code.",
    video: "/DM SENT (SUCCESS).mp4",
  },
  {
    code: "· · ·",
    title: "The follow-up goes out.",
    text: "Instagram only lets you send more after they answer, so the first DM asks a small question and the follow-up carries the link.",
    video: "/WAITING.mp4",
  },
  {
    code: "✓",
    title: "You see how it went.",
    text: "Who replied, who tapped Buy, and who asked something only a human should answer.",
    video: "/MILESTONE.mp4",
  },
].map((s) => ({ ...s, video: encodeURI(s.video) }));

/** "How it works," told through the recordings themselves: a timecode burned into the
 * corner of the clip is the sequence marker, not a generic dot-and-line stepper. The
 * clip and its timecode follow whichever step is centered in the viewport on the right. */
export default function HowItWorksTimeline() {
  const [active, setActive] = useState(0);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const reduce = useRef(false);

  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      (entries) => {
        // among steps currently inside the thin center band, keep the one closest to it
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const closest = visible.reduce((a, b) =>
          Math.abs(a.boundingClientRect.top) < Math.abs(b.boundingClientRect.top) ? a : b,
        );
        const idx = itemRefs.current.findIndex((el) => el === closest.target);
        if (idx !== -1) setActive(idx);
      },
      { rootMargin: "-42% 0px -42% 0px", threshold: 0 },
    );
    itemRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  // only the active clip plays; the rest stay paused so five videos aren't decoding at once
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === active) {
        v.currentTime = 0;
        if (!reduce.current) v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, [active]);

  return (
    <section id="how" className="scroll-mt-20 border-t">
      <div className="container grid gap-10 py-20 md:py-28 lg:grid-cols-[1.1fr_.9fr] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative mx-auto aspect-[4/3] w-full max-w-xl overflow-hidden rounded-[28px] border bg-[#F2F2F2] shadow-card-hover">
            {STEPS.map((step, i) => (
              <video
                key={step.video}
                ref={(el) => { videoRefs.current[i] = el; }}
                src={step.video}
                muted
                loop
                playsInline
                preload={i === 0 ? "auto" : "none"}
                aria-hidden
                tabIndex={-1}
                className={cn(
                  "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
                  i === active ? "opacity-100" : "pointer-events-none opacity-0",
                )}
              />
            ))}

            {/* the recording's own chrome: a live indicator and a timecode, not a decorative frame */}
            <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/55 py-1.5 pl-2.5 pr-3 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-coral" />
              </span>
              <span className="font-mono text-[11px] font-medium tracking-wide text-white/90">rec</span>
            </div>
            <div className="pointer-events-none absolute bottom-4 left-4 overflow-hidden rounded-lg bg-black/55 px-2.5 py-1 backdrop-blur-sm">
              <span key={active} className="block animate-pop-in font-mono text-[13px] tabular-nums tracking-wide text-white/90">
                {STEPS[active].code}
              </span>
            </div>
          </div>
        </div>

        <ol className="flex flex-col justify-center">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              ref={(el) => { itemRefs.current[i] = el; }}
              className={cn(
                "relative py-6 transition-[opacity,transform] duration-300",
                i === active ? "opacity-100" : "scale-[0.97] opacity-30",
              )}
              style={{ transformOrigin: "left center" }}
            >
              <h3 className="text-2xl font-semibold tracking-tight md:text-3xl">{step.title}</h3>
              <p className="mt-3 max-w-lg text-base leading-relaxed text-graphite md:text-lg">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
