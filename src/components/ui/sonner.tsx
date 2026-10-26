"use client";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !border !border-border !bg-card !text-foreground !shadow-lg !font-sans",
          description: "!text-muted-foreground",
        },
      }}
    />
  );
}
