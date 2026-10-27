import Link from "next/link";
import { Logo } from "@/components/Logo";
import { appName } from "@/lib/utils";

export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur"><div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6"><Logo name={appName()} /><Link href="/" className="text-sm font-semibold text-graphite hover:text-coral">Back to home</Link></div></header>
      <main className="mx-auto max-w-3xl px-6 py-14">
        <div className="rounded-[28px] bg-coral-soft px-6 py-10 md:px-10"><h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
        {updated && <p className="mt-3 text-sm text-graphite">Last updated {updated}</p>}</div>
        <div className="mt-10 space-y-4 text-[15px] leading-relaxed text-graphite [&_a]:font-semibold [&_a]:text-foreground [&_a]:underline [&_a]:decoration-coral [&_a]:underline-offset-4 [&_b]:text-foreground [&_h2]:pt-6 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1">{children}</div>
      </main>
    </div>
  );
}
