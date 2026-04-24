import { AppShell } from "@/components/shell/app-shell";
import { AgentRoomStoreProvider } from "@/lib/store/agent-room-store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AgentRoomStoreProvider>
      <AppShell>{children}</AppShell>
    </AgentRoomStoreProvider>
  );
}
