import Link from "next/link";
import { Logo } from "@/components/Logo";
import { appName } from "@/lib/utils";

export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b"><div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6"><Logo name={appName()} /><Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Back to home</Link></div></header>
      <main className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="font-display text-5xl">{title}</h1>
        {updated && <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>}
        <div className="mt-8 space-y-4 leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_b]:text-foreground [&_h2]:pt-6 [&_h2]:font-display [&_h2]:text-3xl [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1">{children}</div>
      </main>
    </div>
  );
}
