"use client";
import { Activity, ChevronsUpDown, Package, ShoppingBag, Users, CreditCard, LayoutDashboard, LogOut, Menu, MessagesSquare, Settings, Webhook, Workflow, Camera } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/theme";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean };
const groups: { label: string; items: NavItem[] }[] = [
  { label: "Automate", items: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
    { href: "/dashboard/automations", label: "Automations", icon: Workflow },
    { href: "/dashboard/conversations", label: "Conversations", icon: MessagesSquare },
    { href: "/dashboard/leads", label: "Leads", icon: Users },
    { href: "/dashboard/catalog", label: "Catalog", icon: Package },
    { href: "/dashboard/activity", label: "Activity log", icon: Activity },
  ] },
  { label: "Manage", items: [
    { href: "/dashboard/accounts", label: "Instagram accounts", icon: Camera },
    { href: "/dashboard/shopify", label: "Shopify", icon: ShoppingBag },
    { href: "/dashboard/webhooks", label: "Webhooks", icon: Webhook },
    { href: "/dashboard/billing", label: "Plan & usage", icon: CreditCard },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ] },
];

type Props = { appName: string; email: string; name: string | null; planName: string; used: number; limit: number };

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav className="space-y-6">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{g.label}</p>
          <ul className="space-y-0.5">
            {g.items.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? path === href : path.startsWith(href);
              return (
                <li key={href}>
                  <Link href={href} onClick={onNavigate} className={cn("group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors", active ? "bg-ink text-background font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UsageMeter({ planName, used, limit }: Pick<Props, "planName" | "used" | "limit">) {
  const unlimited = !Number.isFinite(limit);
  const ratio = unlimited ? 0 : Math.round((used / limit) * 100);
  return (
    <Link href="/dashboard/billing" className="block rounded-xl border bg-card p-3.5 transition-colors hover:border-primary/40">
      <div className="flex items-center justify-between text-xs"><span className="font-medium">{planName} plan</span><span className="text-muted-foreground">{used.toLocaleString()} / {unlimited ? "∞" : limit.toLocaleString()} DMs</span></div>
      <Progress value={ratio} className="mt-2.5 h-1.5" indicatorClassName={ratio >= 90 ? "bg-destructive" : undefined} />
      <p className="mt-2 text-[11px] text-muted-foreground">Resets on the 1st of each month</p>
    </Link>
  );
}

export default function Sidebar(props: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  const initials = (props.name || props.email).slice(0, 2).toUpperCase();

  const UserMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-3 rounded-xl border bg-card p-2.5 text-left transition-colors hover:bg-accent">
          <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{initials}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{props.name || "Your account"}</p><p className="truncate text-xs text-muted-foreground">{props.email}</p></div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>{props.email}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => router.push("/dashboard/settings")}><Settings /> Settings</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/dashboard/billing")}><CreditCard /> Plan & usage</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout} className="text-destructive focus:text-destructive"><LogOut /> Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      {/* desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-6 border-r bg-card/60 p-4 pb-5 backdrop-blur lg:flex">
        <div className="flex items-center justify-between px-2 pt-1"><Logo name={props.appName} href="/dashboard" /><ThemeToggle /></div>
        <div className="flex-1 overflow-y-auto"><NavList /></div>
        <div className="space-y-3">
          <UsageMeter {...props} />
          {UserMenu}
        </div>
      </aside>

      {/* mobile */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur lg:hidden">
        <Logo name={props.appName} href="/dashboard" />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></Button>
        </div>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex flex-col gap-6 p-4">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="px-2 pt-1"><Logo name={props.appName} href="/dashboard" /></div>
          <div className="flex-1 overflow-y-auto"><NavList onNavigate={() => setOpen(false)} /></div>
          <div className="space-y-3"><UsageMeter {...props} />{UserMenu}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}
