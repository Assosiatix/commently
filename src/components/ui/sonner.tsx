"use client";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "!rounded-2xl !border !border-border !bg-card !text-foreground !shadow-card-hover !font-sans",
          description: "!text-muted-foreground",
        },
      }}
    />
  );
}
