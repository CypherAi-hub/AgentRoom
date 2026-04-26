import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRecentRuns } from "@/lib/data/runs";
import type { RunWithRefs } from "@/lib/data/types";
import { RunListFilters, type RunRangeFilter, type RunStatusFilter } from "@/components/runs/run-list-filters";
import { RunRow } from "@/components/runs/run-row";
import { RunsListAnimator } from "./runs-list-animator";

export const dynamic = "force-dynamic";

type SearchParams = {
  status?: string;
  range?: string;
  q?: string;
};

const STATUS_VALUES: RunStatusFilter[] = ["all", "completed", "error", "running"];
const RANGE_VALUES: RunRangeFilter[] = ["24h", "7d", "30d", "all"];

function normalizeStatus(value: string | undefined): RunStatusFilter {
  return STATUS_VALUES.includes(value as RunStatusFilter)
    ? (value as RunStatusFilter)
    : "all";
}

function normalizeRange(value: string | undefined): RunRangeFilter {
  return RANGE_VALUES.includes(value as RunRangeFilter)
    ? (value as RunRangeFilter)
    : "7d";
}

function rangeToMs(range: RunRangeFilter): number | null {
  switch (range) {
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
    case "all":
    default:
      return null;
  }
}

function applyFilters(
  runs: RunWithRefs[],
  status: RunStatusFilter,
  range: RunRangeFilter,
  query: string,
): RunWithRefs[] {
  const rangeMs = rangeToMs(range);
  const cutoff = rangeMs ? Date.now() - rangeMs : null;
  const q = query.trim().toLowerCase();
  return runs.filter((run) => {
    if (status !== "all" && run.status !== status) return false;
    if (cutoff !== null) {
      const ts = Date.parse(run.createdAt);
      if (Number.isFinite(ts) && ts < cutoff) return false;
    }
    if (q && !run.id.toLowerCase().includes(q)) return false;
    return true;
  });
}

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const status = normalizeStatus(params.status);
  const range = normalizeRange(params.range);
  const query = params.q ?? "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/runs");

  const runs = await getRecentRuns(user.id, 100);
  const filtered = applyFilters(runs, status, range, query);
  const filterKey = `${status}|${range}|${query}`;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Runs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every agent execution, recorded.
        </p>
      </header>

      <RunListFilters status={status} range={range} query={query} />

      {runs.length === 0 ? (
        <EmptyRuns />
      ) : filtered.length === 0 ? (
        <NoMatches />
      ) : (
        <RunsListAnimator filterKey={filterKey}>
          <div className="overflow-hidden rounded-lg border bg-card">
            <ul className="divide-y [border-color:var(--border)]">
              {filtered.map((run) => (
                <li key={run.id} className="[border-color:var(--border)]">
                  <RunRow run={run} />
                </li>
              ))}
            </ul>
          </div>
        </RunsListAnimator>
      )}
    </div>
  );
}

function EmptyRuns() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-card/40 px-6 py-16 text-center">
      <h1 className="text-xl font-semibold tracking-tight">No runs yet.</h1>
      <p className="max-w-md text-sm leading-6 text-muted-foreground">
        When you give an agent a task, the full execution shows up here — every
        action, every screenshot, every result. Like git log for your agents.
      </p>
      <Link
        href="/dev/sandbox-test"
        className="mt-1 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
      >
        Start your first run →
      </Link>
    </div>
  );
}

function NoMatches() {
  return (
    <div className="rounded-lg border border-dashed bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground">
      No runs match the current filters.
    </div>
  );
}
