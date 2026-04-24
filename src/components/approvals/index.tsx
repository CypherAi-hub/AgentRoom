"use client";
import { useState } from "react";
import { ShieldCheck, ShieldX } from "lucide-react";
import { RiskBadge } from "@/components/cards";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { getAgent, getIntegration } from "@/lib/mock-data";
import { formatDateTime, titleCase } from "@/lib/utils";
import type { Approval, ApprovalStatus } from "@/types";
export function ApprovalCard({ approval }: { approval: Approval }) { const [status, setStatus] = useState<ApprovalStatus>(approval.status); const agent = getAgent(approval.requestedByAgentId); const integration = getIntegration(approval.integrationId); const decided = status !== "pending"; return <Card className="glass-panel"><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle className="text-base">{approval.summary}</CardTitle><p className="mt-2 text-sm text-muted-foreground">{integration?.name ?? "Unknown tool"} requested by {agent?.name ?? "Agent"}</p></div><RiskBadge risk={approval.riskLevel} /></div></CardHeader><CardContent className="flex flex-col gap-4"><div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><span className="rounded-full border px-2.5 py-0.5">{titleCase(approval.actionType)}</span><span className="rounded-full border px-2.5 py-0.5">{formatDateTime(approval.requestedAt)}</span><span className="rounded-full border px-2.5 py-0.5">Status: {titleCase(status)}</span></div><div className="flex flex-wrap gap-2"><Button size="sm" disabled={decided} onClick={() => setStatus("approved")}><ShieldCheck className="size-4" />Approve</Button><Button size="sm" variant="outline" disabled={decided} onClick={() => setStatus("denied")}><ShieldX className="size-4" />Deny</Button></div></CardContent></Card>; }
