import type { NextConfig } from "next";

// Content-Security-Policy for the sandbox stream pages.
// The E2B SDK's `stream.getUrl()` returns URLs of the form
// `https://<port>-<sandboxId>.e2b.app` (default) or `*.e2b.dev`
// (when E2B_DOMAIN points at the dev cluster). Allowlist both so
// the noVNC iframe can frame-render while keeping `frame-src` tight.
const E2B_FRAME_SOURCES = ["https://*.e2b.app", "https://*.e2b.dev"].join(" ");

const SANDBOX_CSP = [
  "default-src 'self'",
  // Next.js + framer-motion + dev tooling need inline + eval in dev.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  `frame-src 'self' ${E2B_FRAME_SOURCES}`,
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply CSP only to the dev sandbox-test surface, where the E2B
        // iframe lives. Keeps the rest of the app unaffected.
        source: "/dev/sandbox-test/:path*",
        headers: [
          { key: "Content-Security-Policy", value: SANDBOX_CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/dev/sandbox-test",
        headers: [
          { key: "Content-Security-Policy", value: SANDBOX_CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
