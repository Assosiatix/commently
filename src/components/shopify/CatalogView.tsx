"use client";
import { Check, Link2, Loader2, Package, Pencil, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

export type CatalogProduct = { id: string; title: string; imageUrl: string | null; price: string; stock: string; inStock: boolean; variants: number; store: string };
type Acc = { id: string; username: string };
type Media = { id: string; caption?: string; permalink?: string; thumbnail_url?: string; media_url?: string; media_type?: string };

function Thumb({ src, className }: { src?: string | null; className?: string }) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [src]);
  // eslint-disable-next-line @next/next/no-img-element
  return src && !bad ? <img src={src} alt="" onError={() => setBad(true)} className={cn("object-cover", className)} /> : <div className={cn("grid place-items-center bg-muted text-muted-foreground", className)}><Package className="h-5 w-5" /></div>;
}

export default function CatalogView({ products, accounts, initialLinks }: { products: CatalogProduct[]; accounts: Acc[]; initialLinks: Record<string, Record<string, string[]>> }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [links, setLinks] = useState(initialLinks);
  const [media, setMedia] = useState<Media[] | null>(null);
  const [mErr, setMErr] = useState("");
  const [editing, setEditing] = useState<Media | null>(null);
  const [q, setQ] = useState("");
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const loadMedia = useCallback(async () => {
    if (!accountId) return;
    setMedia(null); setMErr("");
    const r = await fetch(`/api/instagram/media?accountId=${accountId}`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setMErr(j.error || "Could not load your posts"); else setMedia(j.media);
  }, [accountId]);
  useEffect(() => { loadMedia(); }, [loadMedia]);

  const accLinks = links[accountId] ?? {};
  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const ids of Object.values(accLinks)) for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [accLinks]);
  const shown = products.filter((p) => p.title.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <Tabs defaultValue="reels">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList><TabsTrigger value="reels">Reels &amp; posts</TabsTrigger><TabsTrigger value="products">Products ({products.length})</TabsTrigger></TabsList>
          {accounts.length > 1 && (
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>@{a.username}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value="reels">
          {!accounts.length ? (
            <EmptyState icon={Link2} title="Connect Instagram first" text="Then you can choose which products each reel talks about."><Button asChild><Link href="/dashboard/accounts">Connect Instagram</Link></Button></EmptyState>
          ) : mErr ? (
            <p className="rounded-2xl bg-coral-soft px-4 py-3 text-sm font-medium text-warning">{mErr}</p>
          ) : !media ? (
            <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading your reels and posts…</p>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">Assign one or more products to a reel. When someone comments on it, replies can use those products’ price, sizes and stock.</p>
              <div className="grid grid-cols-2 items-start gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {media.map((m) => {
                  const reel = !!m.permalink?.includes("/reel");
                  const ids = accLinks[m.id] ?? [];
                  const linked = ids.map((id) => byId.get(id)).filter(Boolean) as CatalogProduct[];
                  return (
                    <Card key={m.id} className="overflow-hidden">
                      <div className={cn("relative w-full bg-muted", reel ? "aspect-[9/16]" : "aspect-[4/5]")}>
                        <Thumb src={m.thumbnail_url || m.media_url} className="h-full w-full" />
                        <Badge className="absolute left-2 top-2 bg-black/60 text-white backdrop-blur">{reel ? "Reel" : m.media_type === "CAROUSEL_ALBUM" ? "Album" : "Post"}</Badge>
                      </div>
                      <div className="space-y-2.5 p-3">
                        {linked.length ? (
                          <ul className="space-y-1 text-xs">{linked.slice(0, 2).map((p) => <li key={p.id} className="flex items-center gap-1.5"><Check className="h-3 w-3 shrink-0 text-success" /><span className="truncate">{p.title}</span></li>)}{linked.length > 2 && <li className="text-muted-foreground">+{linked.length - 2} more</li>}</ul>
                        ) : <p className="text-xs text-muted-foreground">No products yet</p>}
                        <Button size="sm" variant={linked.length ? "outline" : "default"} className="w-full" onClick={() => setEditing(m)} disabled={!products.length}>{linked.length ? <Pencil /> : <Link2 />}{linked.length ? "Edit products" : "Assign products"}</Button>
                      </div>
                    </Card>
                  );
                })}
                {!media.length && <p className="col-span-full text-sm text-muted-foreground">No posts found on this account.</p>}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="products">
          <div className="relative mb-4 max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="pl-9" /></div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {shown.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                <Thumb src={p.imageUrl} className="aspect-square w-full" />
                <div className="space-y-1.5 p-3">
                  <p className="line-clamp-2 text-sm font-medium leading-snug">{p.title}</p>
                  <p className="text-sm">{p.price}</p>
                  <div className="flex flex-wrap gap-1.5"><Badge variant={p.inStock ? "success" : "destructive"}>{p.stock}</Badge>{p.variants > 1 && <Badge variant="secondary">{p.variants} variants</Badge>}</div>
                  <p className="text-xs text-muted-foreground">{usage.get(p.id) ? `On ${usage.get(p.id)} reel${usage.get(p.id)! > 1 ? "s" : ""}` : "Not on any reel"}</p>
                </div>
              </Card>
            ))}
            {!shown.length && <p className="col-span-full py-8 text-center text-sm text-muted-foreground">No products match.</p>}
          </div>
        </TabsContent>
      </Tabs>

      {editing && (
        <AssignDialog
          media={editing}
          accountId={accountId}
          products={products}
          selected={accLinks[editing.id] ?? []}
          onClose={() => setEditing(null)}
          onSaved={(ids) => { setLinks((p) => ({ ...p, [accountId]: { ...(p[accountId] ?? {}), [editing.id]: ids } })); setEditing(null); }}
        />
      )}
    </>
  );
}

function AssignDialog({ media, accountId, products, selected, onClose, onSaved }: { media: Media; accountId: string; products: CatalogProduct[]; selected: string[]; onClose: () => void; onSaved: (ids: string[]) => void }) {
  const [picked, setPicked] = useState<string[]>(selected);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const list = products.filter((p) => p.title.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function save() {
    setBusy(true);
    const r = await fetch("/api/shopify/media-links", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, mediaId: media.id, mediaPermalink: media.permalink ?? null, mediaThumbUrl: media.thumbnail_url || media.media_url || null, productIds: picked }),
    });
    setBusy(false);
    if (!r.ok) return toast.error("Could not save", { description: (await r.json().catch(() => ({}))).error });
    toast.success(picked.length ? `${picked.length} product${picked.length > 1 ? "s" : ""} linked` : "Products removed");
    onSaved(picked);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Products in this {media.permalink?.includes("/reel") ? "reel" : "post"}</DialogTitle><DialogDescription>Pick every product shown. If it has several, replies can list them all.</DialogDescription></DialogHeader>
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="pl-9" /></div>
        <ul className="max-h-[50vh] space-y-1.5 overflow-y-auto pr-1">
          {list.map((p) => {
            const on = picked.includes(p.id);
            return (
              <li key={p.id}>
                <button type="button" onClick={() => toggle(p.id)} className={cn("flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition", on ? "border-coral bg-coral-soft" : "hover:bg-surface")}>
                  <Thumb src={p.imageUrl} className="h-11 w-11 shrink-0 rounded-xl" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{p.title}</span><span className="text-xs text-muted-foreground">{p.price} · {p.stock}</span></span>
                  <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border", on ? "border-coral bg-coral text-white" : "border-input")}>{on && <Check className="h-3.5 w-3.5" />}</span>
                </button>
              </li>
            );
          })}
          {!list.length && <li className="py-6 text-center text-sm text-muted-foreground">No products match.</li>}
        </ul>
        <DialogFooter className="items-center sm:justify-between"><span className="text-sm text-muted-foreground">{picked.length} selected</span><div className="flex gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Save</Button></div></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
