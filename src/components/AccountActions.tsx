"use client";
import { Unplug } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export default function DisconnectButton({ id, username }: { id: string; username: string }) {
  const router = useRouter();
  async function go() {
    const r = await fetch(`/api/instagram/accounts/${id}`, { method: "DELETE" });
    if (!r.ok) return toast.error("Could not disconnect");
    toast.success(`@${username} disconnected`);
    router.refresh();
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="outline" size="sm" className="text-destructive hover:text-destructive"><Unplug /> Disconnect</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Disconnect @{username}?</AlertDialogTitle><AlertDialogDescription>Its automations, activity log and conversations will be deleted. You can reconnect any time.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={go}>Disconnect</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
