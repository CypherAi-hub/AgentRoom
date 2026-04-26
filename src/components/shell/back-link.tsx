import Link from "next/link";

/**
 * BackLink — small "← {label}" navigation affordance for sub-pages.
 *
 * Renders a link styled with body-small typography in text.secondary, transitioning
 * to text.primary on hover. Includes a visible focus ring tied to border-focus.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={`Back to ${label}`}
      className="inline-flex items-center gap-1 text-text-secondary transition-colors duration-200 ease-out hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base rounded-sm"
      style={{ fontSize: "13px", lineHeight: "1.5" }}
    >
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </Link>
  );
}

export default BackLink;
