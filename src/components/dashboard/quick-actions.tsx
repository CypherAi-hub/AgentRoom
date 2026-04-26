import Link from "next/link";
import { Play, Plus, Plug } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Action = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const ACTIONS: Action[] = [
  { label: "Start a sandbox", href: "/dev/sandbox-test", icon: Play },
  { label: "New agent", href: "/agents", icon: Plus },
  { label: "Connect a tool", href: "/integrations", icon: Plug },
];

export function QuickActions() {
  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface p-2">
      <ul className="flex flex-col gap-1">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <li key={action.href}>
              <Link
                href={action.href}
                className="flex items-center gap-3 rounded-md p-3 text-sm text-text-primary transition hover:bg-bg-surface-hi"
              >
                <Icon className="size-4 text-text-secondary" aria-hidden />
                <span>{action.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
