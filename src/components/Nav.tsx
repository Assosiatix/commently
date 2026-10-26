"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [["/dashboard", "Overview"], ["/dashboard/accounts", "Accounts"], ["/dashboard/automations", "Automations"], ["/dashboard/logs", "Activity"], ["/dashboard/webhooks", "Webhooks"]];

export default function Nav({ name, email }: { name: string; email: string }) {
  const path = usePathname();
  const router = useRouter();
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); router.refresh(); }
  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
        <Link href="/dashboard" className="font-bold">{name}</Link>
        <nav className="flex gap-1 text-sm">
          {links.map(([href, label]) => {
            const active = href === "/dashboard" ? path === href : path.startsWith(href);
            return <Link key={href} href={href} className={`rounded-lg px-3 py-1.5 ${active ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}>{label}</Link>;
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm text-slate-400"><span className="hidden sm:inline">{email}</span><button onClick={logout} className="btn-ghost !py-1.5">Log out</button></div>
      </div>
    </header>
  );
}
