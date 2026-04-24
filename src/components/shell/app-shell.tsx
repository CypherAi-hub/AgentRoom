"use client";
import { useState } from "react";
import { CommandBar } from "@/components/shell/command-bar";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { Button } from "@/components/ui/primitives";
export function AppShell({ children }: { children: React.ReactNode }) { const [mobileOpen, setMobileOpen] = useState(false); const [commandOpen, setCommandOpen] = useState(false); return <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground"><div className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block"><Sidebar /></div>{mobileOpen ? <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-background/70" onClick={() => setMobileOpen(false)} /><div className="absolute inset-y-0 left-0 w-72"><Sidebar onNavigate={() => setMobileOpen(false)} /></div><Button variant="secondary" size="sm" className="absolute right-4 top-4" onClick={() => setMobileOpen(false)}>Close</Button></div> : null}<div className="min-w-0 lg:pl-72"><Topbar onMenu={() => setMobileOpen(true)} onCommand={() => setCommandOpen(true)} /><main className="mx-auto w-full max-w-[1500px] min-w-0 overflow-x-hidden p-4 xl:p-6">{children}</main></div><CommandBar open={commandOpen} onOpenChange={setCommandOpen} /></div>; }
