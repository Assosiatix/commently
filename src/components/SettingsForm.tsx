"use client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [v, setV] = useState(name);
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: v }) });
    setBusy(false);
    if (!r.ok) return toast.error("Could not save");
    toast.success("Profile saved");
    router.refresh();
  }
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle><CardDescription>Your name appears in the dashboard greeting.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="n">Name</Label><Input id="n" value={v} onChange={(e) => setV(e.target.value)} maxLength={80} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input value={email} disabled /></div>
            <Button disabled={busy}>{busy && <Loader2 className="animate-spin" />} Save changes</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Appearance</CardTitle><CardDescription>Follows your device by default.</CardDescription></CardHeader>
        <CardContent className="flex items-center gap-3"><ThemeToggle className="border" /><span className="text-sm text-muted-foreground">Switch between light and dark.</span></CardContent>
      </Card>
    </div>
  );
}
