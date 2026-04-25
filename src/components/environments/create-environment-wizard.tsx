"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Progress } from "@/components/ui/primitives";
import { mockAgents, mockIntegrations } from "@/lib/mock-data";
import { useAgentRoomStore, type CreateEnvironmentInput } from "@/lib/store/agent-room-store";
import { cn, titleCase } from "@/lib/utils";
import type { AgentId, IntegrationId, RoomStatus } from "@/types";

const steps = ["Basics", "Context", "Select Agents", "Name Agents", "Select Tools", "Launch Summary"] as const;
const loadingSteps = [
  "Initializing operating environment",
  "Loading agents",
  "Connecting selected tools",
  "Creating task queue",
  "Approval gates active",
  "Entering room",
];
const defaultAgentIds = ["agent_product", "agent_engineer", "agent_qa", "agent_security", "agent_deployment"] as AgentId[];
const defaultToolIds = ["integration_github", "integration_vercel", "integration_supabase", "integration_sentry"] as IntegrationId[];

function toggle<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function CreateEnvironmentWizard() {
  const router = useRouter();
  const { createEnvironment } = useAgentRoomStore();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [isLaunching, setIsLaunching] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [form, setForm] = useState<CreateEnvironmentInput>({
    name: "",
    mission: "",
    projectType: "Web app",
    status: "planning",
    launchProgress: 10,
    githubRepo: "",
    vercelProject: "",
    websiteUrl: "",
    notes: "",
    selectedAgentIds: defaultAgentIds,
    customAgentNames: {},
    selectedIntegrationIds: defaultToolIds,
  });

  const selectedAgents = useMemo(
    () => mockAgents.filter((agent) => form.selectedAgentIds.includes(agent.id)),
    [form.selectedAgentIds],
  );
  const selectedTools = useMemo(
    () => mockIntegrations.filter((integration) => form.selectedIntegrationIds.includes(integration.id)),
    [form.selectedIntegrationIds],
  );

  function update<K extends keyof CreateEnvironmentInput>(key: K, value: CreateEnvironmentInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validate(targetStep = step) {
    if (targetStep >= 0 && (!form.name.trim() || !form.mission.trim())) {
      setError("Room name and mission are required.");
      setStep(0);
      return false;
    }
    if (targetStep >= 2 && form.selectedAgentIds.length === 0) {
      setError("Select at least one agent.");
      setStep(2);
      return false;
    }
    if (targetStep >= 4 && form.selectedIntegrationIds.length === 0) {
      setError("Select at least one tool.");
      setStep(4);
      return false;
    }
    setError("");
    return true;
  }

  function next() {
    if (!validate(step)) return;
    setStep((current) => Math.min(steps.length - 1, current + 1));
  }

  async function launch() {
    if (!validate(steps.length - 1)) return;
    setIsLaunching(true);
    for (let index = 0; index < loadingSteps.length; index += 1) {
      setLoadingIndex(index);
      await wait(420);
    }
    const room = createEnvironment({
      ...form,
      name: form.name.trim(),
      mission: form.mission.trim(),
      githubRepo: form.githubRepo?.trim(),
      vercelProject: form.vercelProject?.trim(),
      websiteUrl: form.websiteUrl?.trim(),
      notes: form.notes?.trim(),
    });
    await wait(120);
    router.push("/rooms/" + room.slug);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className="glass-panel rounded-xl border p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">Create Environment</p>
            <h1 className="mt-2 text-3xl font-semibold">Initialize a new Agent Room</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Create Room, name agents, select tools, seed context, initialize locally, then enter the live console.
            </p>
          </div>
          <Badge variant="outline">LocalStorage MVP</Badge>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-base">Flow</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {steps.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  if (index <= step || validate(index - 1)) setStep(index);
                }}
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-secondary",
                  index === step ? "border-primary/50 bg-primary/10 text-foreground" : "border-border text-muted-foreground",
                )}
              >
                <span className="mr-2 text-xs">{index + 1}</span>
                {label}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">{steps[step]}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Step {step + 1} of {steps.length}</p>
              </div>
              <div className="min-w-40">
                <Progress value={((step + 1) / steps.length) * 100} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {error ? <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">{error}</div> : null}
            {isLaunching ? (
              <div className="flex min-h-[420px] flex-col justify-center gap-4">
                {loadingSteps.map((label, index) => (
                  <div key={label} className="flex items-center gap-3 rounded-lg border bg-secondary/20 p-3">
                    {index < loadingIndex ? (
                      <CheckCircle2 className="size-4 text-emerald-300" />
                    ) : index === loadingIndex ? (
                      <Loader2 className="size-4 animate-spin text-primary" />
                    ) : (
                      <span className="size-4 rounded-full border" />
                    )}
                    <span className={cn("text-sm", index <= loadingIndex ? "text-foreground" : "text-muted-foreground")}>{label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {step === 0 ? (
                  <div className="grid gap-4">
                    <label className="grid gap-2 text-sm">
                      <span className="font-medium">Room name</span>
                      <input className="h-10 rounded-md border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring" value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="FoFit Growth Sprint" />
                    </label>
                    <label className="grid gap-2 text-sm">
                      <span className="font-medium">Mission</span>
                      <textarea className="min-h-28 rounded-md border bg-background px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring" value={form.mission} onChange={(event) => update("mission", event.target.value)} placeholder="Ship the next useful version with agents, tools, and approvals in one room." />
                    </label>
                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="grid gap-2 text-sm">
                        <span className="font-medium">Project type</span>
                        <select className="h-10 rounded-md border bg-background px-3 outline-none" value={form.projectType} onChange={(event) => update("projectType", event.target.value)}>
                          <option>Web app</option>
                          <option>Mobile app</option>
                          <option>Launch campaign</option>
                          <option>Client project</option>
                          <option>Content engine</option>
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm">
                        <span className="font-medium">Status</span>
                        <select className="h-10 rounded-md border bg-background px-3 outline-none" value={form.status} onChange={(event) => update("status", event.target.value as RoomStatus)}>
                          <option value="planning">Planning</option>
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm">
                        <span className="font-medium">Launch progress</span>
                        <input type="number" min={0} max={100} className="h-10 rounded-md border bg-background px-3 outline-none" value={form.launchProgress} onChange={(event) => update("launchProgress", Number(event.target.value))} />
                      </label>
                    </div>
                  </div>
                ) : null}

                {step === 1 ? (
                  <div className="grid gap-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="grid gap-2 text-sm">
                        <span className="font-medium">GitHub repo</span>
                        <input className="h-10 rounded-md border bg-background px-3 outline-none" value={form.githubRepo} onChange={(event) => update("githubRepo", event.target.value)} placeholder="owner/repo" />
                      </label>
                      <label className="grid gap-2 text-sm">
                        <span className="font-medium">Vercel project</span>
                        <input className="h-10 rounded-md border bg-background px-3 outline-none" value={form.vercelProject} onChange={(event) => update("vercelProject", event.target.value)} placeholder="agent-room" />
                      </label>
                      <label className="grid gap-2 text-sm">
                        <span className="font-medium">Website URL</span>
                        <input className="h-10 rounded-md border bg-background px-3 outline-none" value={form.websiteUrl} onChange={(event) => update("websiteUrl", event.target.value)} placeholder="https://..." />
                      </label>
                    </div>
                    <label className="grid gap-2 text-sm">
                      <span className="font-medium">Notes/context</span>
                      <textarea className="min-h-36 rounded-md border bg-background px-3 py-2 outline-none" value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="What should this room remember before agents start working?" />
                    </label>
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {mockAgents.map((agent) => {
                      const selected = form.selectedAgentIds.includes(agent.id);
                      return (
                        <button key={agent.id} type="button" onClick={() => update("selectedAgentIds", toggle(form.selectedAgentIds, agent.id))} className={cn("rounded-lg border p-4 text-left transition-colors hover:border-primary/40", selected ? "border-primary/50 bg-primary/10" : "border-border bg-secondary/20")}>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium">{agent.name}</div>
                              <p className="mt-1 text-xs text-muted-foreground">{agent.role}</p>
                            </div>
                            {selected ? <CheckCircle2 className="size-4 text-emerald-300" /> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {step === 3 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {selectedAgents.map((agent) => (
                      <label key={agent.id} className="grid gap-2 text-sm">
                        <span className="font-medium">{agent.role}</span>
                        <input className="h-10 rounded-md border bg-background px-3 outline-none" value={form.customAgentNames[agent.id] ?? agent.name} onChange={(event) => update("customAgentNames", { ...form.customAgentNames, [agent.id]: event.target.value })} />
                      </label>
                    ))}
                  </div>
                ) : null}

                {step === 4 ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {mockIntegrations.filter((integration) => integration.key !== "local_agent_feed").map((integration) => {
                      const selected = form.selectedIntegrationIds.includes(integration.id);
                      return (
                        <button key={integration.id} type="button" onClick={() => update("selectedIntegrationIds", toggle(form.selectedIntegrationIds, integration.id))} className={cn("rounded-lg border p-4 text-left transition-colors hover:border-primary/40", selected ? "border-primary/50 bg-primary/10" : "border-border bg-secondary/20")}>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium">{integration.name}</div>
                              <p className="mt-1 text-xs text-muted-foreground">{titleCase(integration.category)}</p>
                            </div>
                            {selected ? <CheckCircle2 className="size-4 text-emerald-300" /> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {step === 5 ? (
                  <div className="grid gap-4">
                    <div className="rounded-lg border bg-secondary/20 p-4">
                      <h2 className="text-lg font-semibold">{form.name || "Untitled room"}</h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{form.mission || "No mission yet."}</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <SummaryBlock label="Agents" value={String(selectedAgents.length)} detail={selectedAgents.map((agent) => form.customAgentNames[agent.id] ?? agent.name).join(", ")} />
                      <SummaryBlock label="Tools" value={String(selectedTools.length)} detail={selectedTools.map((tool) => tool.name).join(", ")} />
                      <SummaryBlock label="Approval mode" value="Active" detail="High-risk actions stay gated." />
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>Back</Button>
                  {step < steps.length - 1 ? (
                    <Button type="button" onClick={next}>Continue</Button>
                  ) : (
                    <Button type="button" onClick={launch}>Initialize Agent Room</Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryBlock({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border bg-secondary/20 p-4">
      <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  );
}
