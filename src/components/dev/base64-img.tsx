"use client";

import type { CSSProperties } from "react";

type Base64ImgProps = {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Wrapper around a plain `<img>` for base64 / data URLs.
 *
 * `next/image` cannot optimize data URLs (no remote loader, no width/height
 * known ahead of time), so the agent screenshot rows render a raw `<img>`.
 * This component centralizes the `next/no-img-element` ESLint disable so
 * callers stay clean.
 */
export function Base64Img({ src, alt, className, style }: Base64ImgProps) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} src={src} className={className} style={style} />;
}
