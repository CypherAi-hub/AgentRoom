"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bot, CheckSquare, Gauge, GitBranch, Home, PlayCircle, PlugZap, Settings, Workflow } from "lucide-react";
import { useAgentRoomStore } from "@/lib/store/agent-room-store";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/rooms", label: "Rooms", icon: Gauge },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/runs", label: "Runs", icon: PlayCircle },
  { href: "/integrations", label: "Integrations", icon: PlugZap },
  { href: "/settings", label: "Settings", icon: Settings },
];

function roomSlugFromPath(pathname: string) {
  const [, root, slug] = pathname.split("/");
  return root === "rooms" && slug ? slug : "fofit";
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { getRoomBySlug } = useAgentRoomStore();
  const currentSlug = roomSlugFromPath(pathname);
  const currentRoom = getRoomBySlug(currentSlug);
  const roomSlug = currentRoom?.slug ?? currentSlug;
  const roomLabel = currentRoom ? currentRoom.name + " Room" : "Current Room";
  const roomNav = [
    { href: `/rooms/${roomSlug}`, label: "Overview", icon: Gauge },
    { href: `/rooms/${roomSlug}/tasks`, label: "Tasks", icon: CheckSquare },
    { href: `/rooms/${roomSlug}/activity`, label: "Activity", icon: Activity },
    { href: `/rooms/${roomSlug}/workflows`, label: "Workflows", icon: Workflow },
    { href: `/rooms/${roomSlug}/approvals`, label: "Approvals", icon: GitBranch },
  ];

  const item = (x: (typeof nav)[number]) => {
    const active = pathname === x.href || (x.href !== "/dashboard" && pathname.startsWith(x.href));
    return (
      <Link
        key={x.href}
        href={x.href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
          active && "bg-secondary text-foreground",
        )}
      >
        <x.icon className="size-4" />
        {x.label}
      </Link>
    );
  };

  return (
    <aside className="flex h-full flex-col border-r bg-background/80 p-4 backdrop-blur">
      <Link href="/dashboard" onClick={onNavigate} className="mb-6 flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-lg border bg-secondary font-mono text-sm font-black">AR</div>
        <div>
          <div className="text-sm font-semibold">Agent Room</div>
          <div className="text-xs text-muted-foreground">AI operations room</div>
        </div>
      </Link>
      <nav className="flex flex-col gap-1">{nav.map(item)}</nav>
      <div className="mt-8">
        <div className="mb-2 px-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{roomLabel}</div>
        <nav className="flex flex-col gap-1">{roomNav.map(item)}</nav>
      </div>
      <div className="mt-auto rounded-lg border bg-card/70 p-3">
        <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Mock-first</div>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">
          No real API keys, auth, billing, or database writes are active.
        </p>
      </div>
    </aside>
  );
}
