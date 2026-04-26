"use client";

import Link from "next/link";
import { ArrowLeft, RotateCw, Share2 } from "lucide-react";
import { useState } from "react";

export function RunDetailHeader({
  taskPrompt,
}: {
  taskPrompt: string;
}) {
  return (
    <header className="flex flex-col gap-4">
      <Link
        href="/runs"
        className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        <span>Runs</span>
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="line-clamp-2 max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">
          {taskPrompt}
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          <ActionButton icon={<RotateCw className="size-3.5" />} label="Re-run" />
          <ActionButton icon={<Share2 className="size-3.5" />} label="Share" />
        </div>
      </div>
    </header>
  );
}

function ActionButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  const [showTip, setShowTip] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        disabled
        aria-label={label}
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        onFocus={() => setShowTip(true)}
        onBlur={() => setShowTip(false)}
        className="inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-md border bg-secondary/40 px-3 text-xs font-medium text-muted-foreground opacity-70 transition hover:opacity-100"
      >
        {icon}
        {label}
      </button>
      {showTip ? (
        <span className="pointer-events-none absolute right-0 top-full z-10 mt-1.5 whitespace-nowrap rounded-md border bg-card px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground shadow">
          Coming soon
        </span>
      ) : null}
    </span>
  );
}
