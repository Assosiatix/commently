/** Client-safe message templating (no database imports, so the wizard preview can use it too). */

export type ProductVars = {
  title: string;
  url: string | null;
  currency: string | null;
  // Everything below is only used by the AI (never rendered into templates).
  description?: string | null;
  vendor?: string | null;
  productType?: string | null;
  tags?: string[];
  options?: { name: string; values: string[] }[]; // e.g. Color: Red, Blue / Size: S, M, L
  facts?: { key: string; value: string }[]; // product metafields: material, fit, care...
  variants: { title: string; price: string; compareAtPrice?: string | null; qty: number | null; available: boolean; options?: { name: string; value: string }[] }[];
};

export function formatMoney(amount: string | number, currency?: string | null) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  const whole = Number.isInteger(n);
  try {
    if (currency) return new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(n);
  } catch { /* unknown currency code */ }
  return n.toLocaleString("en", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
}

const live = (p: ProductVars) => p.variants.filter((v) => v.available);

/** "PKR 1,200" or "PKR 1,200 – PKR 1,800" across variants. */
export function priceText(p: ProductVars) {
  const prices = p.variants.map((v) => Number(v.price)).filter(Number.isFinite);
  if (!prices.length) return "";
  const lo = Math.min(...prices), hi = Math.max(...prices);
  return lo === hi ? formatMoney(lo, p.currency) : `${formatMoney(lo, p.currency)} – ${formatMoney(hi, p.currency)}`;
}

export function stockText(p: ProductVars) {
  const ok = live(p);
  if (!ok.length) return "Out of stock";
  const known = ok.every((v) => v.qty !== null);
  const total = ok.reduce((s, v) => s + (v.qty ?? 0), 0);
  return known && total > 0 && total <= 5 ? `Only ${total} left` : "In stock";
}

/** One line per variant, e.g. "Small: PKR 1,200 (in stock)". Single-variant products have nothing to list. */
export function variantsText(p: ProductVars) {
  if (p.variants.length <= 1) return stockText(p);
  return p.variants.map((v) => `${v.title}: ${formatMoney(v.price, p.currency)} (${v.available ? "in stock" : "sold out"})`).join("\n");
}

export type TemplateVars = { username?: string | null; products?: ProductVars[] };

/**
 * {{username}}                  commenter's @name
 * {{product.title|price|link|stock|variants}}   first product linked to the post
 * {{products}}                  one line per linked product ("• Title: price")
 */
export function renderTemplate(tpl: string, vars: TemplateVars) {
  const first = vars.products?.[0];
  const map: Record<string, string> = {
    username: vars.username ? `@${vars.username}` : "there",
    "product.title": first?.title ?? "",
    "product.price": first ? priceText(first) : "",
    "product.link": first?.url ?? "",
    "product.stock": first ? stockText(first) : "",
    "product.variants": first ? variantsText(first) : "",
    products: (vars.products ?? []).map((p) => `• ${p.title}: ${priceText(p)}`).join("\n"),
  };
  return tpl.replace(/\{\{\s*([a-z_.]+)\s*\}\}/gi, (m, key: string) => (key.toLowerCase() in map ? map[key.toLowerCase()] : m));
}

export const TEMPLATE_VARIABLES = [
  { token: "{{username}}", label: "Their @name" },
  { token: "{{product.title}}", label: "Product name" },
  { token: "{{product.price}}", label: "Price" },
  { token: "{{product.stock}}", label: "Stock" },
  { token: "{{product.variants}}", label: "Sizes / variants" },
  { token: "{{product.link}}", label: "Product link" },
  { token: "{{products}}", label: "All products" },
] as const;
