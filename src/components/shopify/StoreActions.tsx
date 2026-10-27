"use client";
import { Loader2, Package, RefreshCw, Unplug } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export default function StoreActions({ id, name, syncing }: { id: string; name: string; syncing: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // While a sync runs on the server, keep the page fresh so the product count and status update by themselves.
  useEffect(() => {
    if (!syncing) return;
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [syncing, router]);

  async function sync() {
    setBusy(true);
    const r = await fetch("/api/shopify/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId: id }) });
    setBusy(false);
    if (!r.ok) return toast.error("Could not start the sync");
    toast.success("Updating your products");
    router.refresh();
  }
  async function disconnect() {
    const r = await fetch(`/api/shopify/store?id=${id}`, { method: "DELETE" });
    if (!r.ok) return toast.error("Could not disconnect");
    toast.success(`${name} disconnected`);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={sync} disabled={busy || syncing}>{busy || syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />} {syncing ? "Updating…" : "Update products"}</Button>
      <Button asChild variant="outline" size="sm"><Link href="/dashboard/catalog"><Package /> Open catalog</Link></Button>
      <AlertDialog>
        <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Unplug /> Disconnect</Button></AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Disconnect {name}?</AlertDialogTitle><AlertDialogDescription>We delete the synced products and the reel-to-product links. Your Shopify store is not changed. You can also remove the app from Shopify admin, under Settings, Apps.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={disconnect}>Disconnect</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
