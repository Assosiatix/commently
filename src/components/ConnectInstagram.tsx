"use client";
import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";

export default function ConnectInstagram({ label = "Connect Instagram", onConnected, ...btn }: { label?: string; onConnected?: () => void } & Pick<ButtonProps, "variant" | "size" | "className">) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const popup = useRef<Window | null>(null);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.origin !== window.location.origin || e.data?.type !== "ig-connect") return;
      setBusy(false);
      if (e.data.ok) {
        toast.success(`Connected @${e.data.username}`, { description: e.data.warning });
        router.refresh();
        onConnected?.();
      } else toast.error("Could not connect", { description: e.data.error || "Connection failed" });
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [router, onConnected]);

  function open() {
    const w = 520, h = 720;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    popup.current = window.open("/api/instagram/connect", "ig-connect", `width=${w},height=${h},left=${left},top=${top}`);
    if (!popup.current) return toast.error("Popup blocked", { description: "Allow popups for this site and try again." });
    setBusy(true);
    const t = setInterval(() => { if (popup.current?.closed) { clearInterval(t); setBusy(false); } }, 800);
  }

  return (
    <Button onClick={open} disabled={busy} {...btn}>
      <Camera /> {busy ? "Waiting for Instagram…" : label}
    </Button>
  );
}
