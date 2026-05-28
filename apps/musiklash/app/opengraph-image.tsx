import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

export const runtime = "edge";
export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(145deg, #0a0a12 0%, #14101f 45%, #1a0f1a 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(900px 480px at 70% 15%, rgba(255,47,109,0.35) 0%, rgba(255,107,44,0.12) 45%, transparent 78%)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 20, position: "relative" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "linear-gradient(140deg, #ff2f6d 0%, #ff6b2c 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 12px 40px rgba(255,47,109,0.35)",
            }}
          >
            <svg width="42" height="42" viewBox="0 0 100 100" fill="none">
              <path
                d="M38 20L18 50L38 80"
                stroke="white"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M62 20L82 50L62 80"
                stroke="white"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="50" cy="50" r="9.5" fill="white" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 52, fontWeight: 900, letterSpacing: "-0.03em" }}>
              {SITE_NAME}
            </span>
            <span style={{ fontSize: 24, color: "rgba(255,255,255,0.72)", marginTop: 4 }}>
              {SITE_TAGLINE}
            </span>
          </div>
        </div>

        <div style={{ position: "relative", maxWidth: 900 }}>
          <p
            style={{
              fontSize: 34,
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.88)",
              margin: 0,
            }}
          >
            {SITE_DESCRIPTION}
          </p>
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          {["Brackets", "Tierlists", "Blindtests", "BattleFeat", "Stream Clash"].map((label) => (
            <span
              key={label}
              style={{
                padding: "10px 18px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.06)",
                fontSize: 20,
                fontWeight: 600,
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
