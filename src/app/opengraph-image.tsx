import { ImageResponse } from "next/og";

// Static OG share card — generated once at build time (static export safe).
export const dynamic = "force-static";
export const alt = "LoopTV — channel-surf YouTube like it's TV";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090b",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* TV glyph */}
          <div
            style={{
              width: 96,
              height: 72,
              borderRadius: 12,
              border: "3px solid #3f3f46",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderTop: "16px solid transparent",
                borderBottom: "16px solid transparent",
                borderLeft: "28px solid #dc2626",
                marginLeft: 6,
              }}
            />
          </div>
          <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: -2 }}>
            LoopTV
          </div>
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 34,
            color: "#a1a1aa",
            maxWidth: 820,
            textAlign: "center",
          }}
        >
          Channel-surf YouTube like it&apos;s TV. Random clips, nonstop.
        </div>
      </div>
    ),
    { ...size },
  );
}
