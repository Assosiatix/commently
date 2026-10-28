/**
 * Fetches a Google Font as raw bytes for use in `next/og`'s ImageResponse
 * (Satori needs the actual font file, not a CSS @font-face rule). Two-step:
 * ask Google's CSS endpoint for the font, then fetch the ttf URL it returns.
 * Cached in memory per server instance — only runs when opengraph-image is
 * actually requested. Mirrors assosiatix-ai/src/lib/og-font.ts.
 */
const cache = new Map<string, ArrayBuffer>();

export async function loadGoogleFont(family: string, weight: number): Promise<ArrayBuffer> {
  const cacheKey = `${family}:${weight}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({ family: `${family}:wght@${weight}` });
  const cssRes = await fetch(`https://fonts.googleapis.com/css2?${params.toString()}`, {
    headers: {
      // Satori can only parse ttf/otf, not woff2. Google only serves ttf to
      // very old browsers that predate woff2 support, so pretend to be one.
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/534.57.2 (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2",
    },
  });
  const css = await cssRes.text();
  const match = css.match(/src: url\(([^)]+)\)/);
  const fontUrl = match?.[1];
  if (!fontUrl) throw new Error(`Could not resolve font URL for ${family} ${weight}`);

  const fontRes = await fetch(fontUrl);
  const buffer = await fontRes.arrayBuffer();
  cache.set(cacheKey, buffer);
  return buffer;
}
