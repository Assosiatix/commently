"use client";
import { ArrowRight, Loader2, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Mirrors the server-side normalisation so people get instant feedback; the server still validates. */
function normalize(v: string) {
  let s = v.trim().toLowerCase().replace(/^https?:\/\//, "");
  const admin = s.match(/^admin\.shopify\.com\/store\/([a-z0-9-]+)/);
  if (admin) s = `${admin[1]}.myshopify.com`;
  s = s.split(/[/?#]/)[0];
  if (/^[a-z0-9][a-z0-9-]*$/.test(s)) s = `${s}.myshopify.com`;
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(s) ? s : null;
}

export default function ShopifyConnectForm({ defaultShop = "", label = "Install app on my store" }: { defaultShop?: string; label?: string }) {
  const [shop, setShop] = useState(defaultShop);
  const [busy, setBusy] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = normalize(shop);
    if (!n) return toast.error("Enter your store address", { description: "It looks like your-store.myshopify.com. Find it in Shopify admin under Settings, Domains." });
    setBusy(true);
    window.location.href = `/api/shopify/auth?shop=${encodeURIComponent(n)}`;
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Label htmlFor="shop">Your Shopify store address</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <ShoppingBag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="shop" value={shop} onChange={(e) => setShop(e.target.value)} placeholder="your-store.myshopify.com" className="h-11 pl-9" autoComplete="off" inputMode="url" />
        </div>
        <Button size="lg" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : null}{label} <ArrowRight /></Button>
      </div>
    </form>
  );
}
