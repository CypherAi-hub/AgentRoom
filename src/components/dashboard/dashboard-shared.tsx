import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-3xl font-semibold leading-tight">{value}</div>
        {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  cta,
  secondary,
  emphasize = false,
}: {
  title: string;
  description: string;
  cta?: { label: string; href: string };
  secondary?: { label: string; href: string };
  emphasize?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 px-6 py-12 text-center sm:py-16">
      {emphasize ? (
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
      ) : (
        <h3 className="text-base font-semibold">{title}</h3>
      )}
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {cta || secondary ? (
        <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
          {cta ? (
            <Link
              href={cta.href}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              {cta.label}
            </Link>
          ) : null}
          {secondary ? (
            <Link
              href={secondary.href}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              {secondary.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <header className="flex items-end justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    running: "border-sky-300/35 bg-sky-300/10 text-sky-100",
    completed: "border-emerald-300/35 bg-emerald-300/10 text-emerald-100",
    pending: "border-white/10 bg-white/[0.04] text-muted-foreground",
    stopped: "border-amber-300/35 bg-amber-300/10 text-amber-100",
    error: "border-red-300/35 bg-red-300/10 text-red-100",
    idle: "border-white/10 bg-white/[0.04] text-muted-foreground",
    working: "border-emerald-300/35 bg-emerald-300/10 text-emerald-100",
    reviewing: "border-sky-300/35 bg-sky-300/10 text-sky-100",
    blocked: "border-red-300/35 bg-red-300/10 text-red-100",
    active: "border-emerald-300/35 bg-emerald-300/10 text-emerald-100",
    archived: "border-white/10 bg-white/[0.04] text-muted-foreground",
  };
  const style = styles[status] || "border-white/10 bg-white/[0.04] text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${style}`}>
      {status}
    </span>
  );
}

export function relativeTime(value: string | null | undefined) {
  if (!value) return "—";
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return "—";
  const diffMs = Date.now() - ts;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function durationLabel(startedAt: string | null, endedAt: string | null) {
  if (!startedAt) return "—";
  const start = Date.parse(startedAt);
  const end = endedAt ? Date.parse(endedAt) : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "—";
  const sec = Math.round((end - start) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remainder = sec % 60;
  return `${min}m ${remainder}s`;
}
