import type { Metadata } from "next";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://commiko.assosiatix.com").replace(
  /\/$/,
  "",
);

export const siteName = "Commiko";

export function absoluteUrl(path = "/") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${normalized}`;
}

/** Trim to a search-snippet length at a word boundary. */
export function clip(text: string, max = 155) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.;:—-]+$/, "")}…`;
}

type PageMetaInput = {
  /** Short page title, e.g. "Privacy Policy" — the root layout's `%s · Commiko`
   * template formats the top-level `<title>` from the page's own plain
   * `title` string, so this is only used for the Open Graph/Twitter share title. */
  title: string;
  description: string;
  /** Path of this page, e.g. "/privacy" — becomes the self-referencing canonical. */
  path: string;
  noindex?: boolean;
};

/**
 * Spread into a page's own `metadata` object (alongside its plain `title`
 * string) to guarantee a self-referencing canonical and Open Graph/Twitter
 * tags, instead of silently inheriting (or not inheriting) the root
 * layout's. Canonical especially must be set per page — Next.js doesn't
 * deep-merge `alternates` from the layout.
 */
export function pageMetadata({ title, description, path, noindex = false }: PageMetaInput): Metadata {
  const url = absoluteUrl(path);
  const shareTitle = `${title} — ${siteName}`;
  return {
    description,
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { type: "website", title: shareTitle, description, url, siteName },
    twitter: { card: "summary_large_image", title: shareTitle, description },
  };
}
