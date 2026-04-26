import type { ReactNode } from "react";
import { tokens } from "@/styles/design-tokens";

/**
 * PageHeader — consistent top-of-page header for shell routes.
 *
 * Layout:
 *   [optional backLink]
 *   [title              ] [actions →]
 *   [subtitle           ]
 *
 * Uses design tokens for typography, spacing, and the bottom hairline.
 */
export interface PageHeaderProps {
  backLink?: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ backLink, title, subtitle, actions }: PageHeaderProps) {
  return (
    <header
      className="border-b border-border-subtle"
      style={{ paddingBottom: tokens.space[8] }}
    >
      {backLink ? <div style={{ marginBottom: tokens.space[2] }}>{backLink}</div> : null}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1
            className="text-text-primary"
            style={{
              fontSize: tokens.typography.display.size,
              lineHeight: tokens.typography.display.lineHeight,
              fontWeight: tokens.typography.display.weight,
              margin: 0,
            }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              className="text-text-secondary"
              style={{
                fontSize: tokens.typography.body.size,
                lineHeight: tokens.typography.body.lineHeight,
                fontWeight: tokens.typography.body.weight,
                marginTop: tokens.space[1],
                marginBottom: 0,
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export default PageHeader;
