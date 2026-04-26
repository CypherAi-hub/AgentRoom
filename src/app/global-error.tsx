"use client";

import { useEffect } from "react";

const BG = "#0A0A0A";
const FG = "#FAFAFA";
const ACCENT = "#3EE98C";
const ACCENT_FG = "#0A0A0A";
const MUTED = "#6B6B6B";
const SUBTLE_BORDER = "rgba(255,255,255,0.06)";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof console !== "undefined") {
      console.error("[global error boundary]", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: BG,
          color: FG,
          fontFamily:
            'Inter, "Geist", "Geist Fallback", ui-sans-serif, system-ui, sans-serif',
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 9999,
              border: `1px solid ${SUBTLE_BORDER}`,
              padding: "4px 12px",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#E24B4A",
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            }}
          >
            FATAL
          </span>
          <h1
            style={{
              marginTop: 24,
              fontSize: 32,
              lineHeight: 1.2,
              fontWeight: 700,
              letterSpacing: "-0.01em",
            }}
          >
            Something went wrong
          </h1>
          <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5, color: "#A1A1A1" }}>
            The app hit an unrecoverable error. Reload to try again.
          </p>
          {error.digest ? (
            <code
              style={{
                marginTop: 16,
                display: "inline-block",
                border: `1px solid ${SUBTLE_BORDER}`,
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 11,
                color: MUTED,
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              }}
            >
              digest: {error.digest}
            </code>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 32,
              cursor: "pointer",
              border: 0,
              borderRadius: 8,
              padding: "12px 20px",
              fontSize: 14,
              fontWeight: 600,
              background: ACCENT,
              color: ACCENT_FG,
            }}
          >
            Reload app
          </button>
        </div>
      </body>
    </html>
  );
}
