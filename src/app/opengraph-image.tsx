import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { loadGoogleFont } from "@/lib/og-font";

export const alt = "Commiko — Turn Instagram comments into conversations";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const [sora700, inter500, logoBuffer] = await Promise.all([
    loadGoogleFont("Sora", 700),
    loadGoogleFont("Inter", 500),
    readFile(join(process.cwd(), "public", "logo-mark.png")),
  ]);
  const logoSrc = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: "#F2F2F2",
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={48} height={48} alt="" />
          <span
            style={{ color: "#000000", fontSize: 28, fontWeight: 700, fontFamily: "Sora" }}
          >
            Commiko
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <span
            style={{
              color: "#FF5D73",
              fontSize: 20,
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Instagram Automation
          </span>
          <div
            style={{
              display: "flex",
              color: "#000000",
              fontSize: 58,
              fontWeight: 700,
              lineHeight: 1.12,
              letterSpacing: "-0.02em",
              fontFamily: "Sora",
              maxWidth: "1020px",
            }}
          >
            Turn Instagram comments into conversations.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(0,0,0,0.12)",
            paddingTop: "24px",
          }}
        >
          <span style={{ color: "#494949", fontSize: 20 }}>
            Auto-replies, DMs and follow-ups on your posts
          </span>
          <span
            style={{
              color: "#7C7A7A",
              fontSize: 16,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            A product by ASSOSIATIX
          </span>
        </div>
      </div>
    ),
    {
      width: size.width,
      height: size.height,
      fonts: [
        { name: "Sora", data: sora700, weight: 700, style: "normal" },
        { name: "Inter", data: inter500, weight: 500, style: "normal" },
      ],
    }
  );
}
