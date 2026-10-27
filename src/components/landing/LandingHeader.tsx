"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Sits over the hero video fully transparent; once the page scrolls it turns into a frosted
// white bar, so the nav stays readable over the white sections below.
export default function LandingHeader({ children }: { children: React.ReactNode }) {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={cn("fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300",
      solid ? "bg-background/85 shadow-[0_1px_0_oklch(var(--border))] backdrop-blur-md" : "bg-transparent")}>
      {children}
    </header>
  );
}
