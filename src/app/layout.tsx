import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeScript } from "@/components/theme";
import { absoluteUrl, siteName, siteUrl } from "@/lib/seo";
import "./globals.css";

// Same fonts as assosiatix.com and /tools.
const sora = Sora({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-sora", display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jetbrains", display: "swap" });

const name = process.env.NEXT_PUBLIC_APP_NAME || "Commiko";
const description =
  "Commiko replies to Instagram comments and sends DMs and follow-ups automatically, using the official Instagram API. A product by ASSOSIATIX.";
const title = `${name} — Turn Instagram comments into conversations`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: `%s · ${name}` },
  description,
  applicationName: name,
  authors: [{ name: "ASSOSIATIX", url: "https://assosiatix.com" }],
  creator: "ASSOSIATIX",
  publisher: "ASSOSIATIX",
  alternates: { canonical: absoluteUrl("/") },
  robots: { index: true, follow: true },
  openGraph: { type: "website", title, description, url: absoluteUrl("/"), siteName },
  twitter: { card: "summary_large_image", title, description },
};
// Light only for now (see DARK_MODE_ENABLED in components/theme.tsx).
export const viewport: Viewport = { themeColor: "#ffffff", colorScheme: "light" };

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
