import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeScript } from "@/components/theme";
import "./globals.css";

// Same fonts as assosiatix.com and /tools.
const sora = Sora({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-sora", display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jetbrains", display: "swap" });

const name = process.env.NEXT_PUBLIC_APP_NAME || "Commiko";
export const metadata: Metadata = {
  title: { default: `${name} — Turn Instagram comments into conversations`, template: `%s · ${name}` },
  description: "Reply to Instagram comments and send DMs and follow-ups automatically, with the official Instagram API. Track every conversation in one dashboard. A product by ASSOSIATIX.",
  applicationName: name,
  authors: [{ name: "ASSOSIATIX", url: "https://assosiatix.com" }],
  creator: "ASSOSIATIX",
  publisher: "ASSOSIATIX",
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#ffffff" }, { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" }] };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sora.variable} ${inter.variable} ${mono.variable}`}>
      <head><ThemeScript /></head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
