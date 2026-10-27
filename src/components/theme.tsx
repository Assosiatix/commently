"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const KEY = "theme";

// Light only for now: no dark class is ever applied and every toggle hides itself.
// The dark tokens stay in globals.css, so flipping this back on is the only change needed.
export const DARK_MODE_ENABLED = false;

/** Runs before paint so there is no light/dark flash. Defaults to the OS preference. */
export function ThemeScript() {
  const code = DARK_MODE_ENABLED
    ? `try{var t=localStorage.getItem("${KEY}");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`
    : `document.documentElement.classList.remove("dark")`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  if (!DARK_MODE_ENABLED) return null;
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem(KEY, next ? "dark" : "light"); } catch { /* storage blocked */ }
  }
  return (
    <Button variant="ghost" size="icon" className={className} onClick={toggle} aria-label="Toggle theme">
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
