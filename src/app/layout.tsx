import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeScript } from "@/components/theme";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
const display = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-display" });

const name = process.env.NEXT_PUBLIC_APP_NAME || "Commently";
export const metadata: Metadata = {
  title: { default: `${name} — Turn Instagram comments into conversations`, template: `%s · ${name}` },
  description: "Reply to Instagram comments and send DMs and follow-ups automatically, with the official Instagram API. Track every conversation in one dashboard.",
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#faf6ef" }, { media: "(prefers-color-scheme: dark)", color: "#0f0d0c" }] };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable} ${display.variable}`}>
      <head><ThemeScript /></head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
