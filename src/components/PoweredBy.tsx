import { cn } from "@/lib/utils";

// Commiko is an ASSOSIATIX product; every surface links back to the studio.
// Points at the dedicated product page (not the bare homepage) so the two
// sites' pages about each other link directly to one another.
export const ASSOSIATIX_URL = "https://assosiatix.com/apps/commiko";

export function PoweredBy({ className }: { className?: string }) {
  return (
    <a href={ASSOSIATIX_URL} target="_blank" rel="noopener" className={cn("group inline-flex items-center gap-1.5 text-sm text-graphite transition-colors hover:text-foreground", className)}>
      Powered by
      <span className="font-display font-bold tracking-tight text-foreground underline decoration-coral decoration-2 underline-offset-4 group-hover:text-coral">ASSOSIATIX</span>
    </a>
  );
}
