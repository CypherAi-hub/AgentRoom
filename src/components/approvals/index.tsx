"use client";

import { useState } from "react";
import { ShieldCheck, ShieldX } from "lucide-react";
import { RiskBadge } from "@/components/cards";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { getAgent, getIntegration } from "@/lib/mock-data";
import { useAgentRoomStore } from "@/lib/store/agent-room-store";
import { formatDateTime, titleCase } from "@/lib/utils";
import type { Approval, ApprovalStatus, RoomId } from "@/types";

export function RoomApprovalsList({ roomId }: { roomId: RoomId }) {
  const { getRoomState, updateApprovalStatus } = useAgentRoomStore();
  const roomState = getRoomState(roomId);

  if (!roomState.localApprovals.length) {
    return (
      <Card className="border-dashed bg-card/45">
        <CardContent className="p-8 text-center">
          <h2 className="text-base font-semibold">No approvals pending</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Risky deploy, merge, billing, data, environment, and external-message actions will appear here before
            anything can execute.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {roomState.localApprovals.map((approval) => (
        <ApprovalCard key={approval.id} approval={approval} onReview={(status) => updateApprovalStatus(roomId, approval.id, status)} />
      ))}
    </div>
  );
}

export function ApprovalCard({
  approval,
  onReview,
}: {
  approval: Approval;
  onReview?: (status: ApprovalStatus) => void;
}) {
  const [localStatus, setLocalStatus] = useState<ApprovalStatus>(approval.status);
  const status = onReview ? approval.status : localStatus;
  const agent = getAgent(approval.requestedByAgentId);
  const integration = getIntegration(approval.integrationId);
  const decided = status !== "pending";

  function review(nextStatus: ApprovalStatus) {
    if (onReview) onReview(nextStatus);
    else setLocalStatus(nextStatus);
  }

  return (
    <Card className="glass-panel">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">{approval.summary}</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              {integration?.name ?? "Unknown tool"} requested by {agent?.name ?? "Agent"}
            </p>
          </div>
          <RiskBadge risk={approval.riskLevel} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border px-2.5 py-0.5">{titleCase(approval.actionType)}</span>
          <span className="rounded-full border px-2.5 py-0.5">{formatDateTime(approval.requestedAt)}</span>
          <span className="rounded-full border px-2.5 py-0.5">Status: {titleCase(status)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={decided} onClick={() => review("approved")}>
            <ShieldCheck className="size-4" />
            Approve
          </Button>
          <Button size="sm" variant="outline" disabled={decided} onClick={() => review("denied")}>
            <ShieldX className="size-4" />
            Deny
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
