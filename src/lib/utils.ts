import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const appName = () => process.env.NEXT_PUBLIC_APP_NAME || "Commiko";

export function timeAgo(d: Date | string | number) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days < 30 ? `${days}d ago` : new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export const fmt = (n: number) => n.toLocaleString("en-US");
export const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
