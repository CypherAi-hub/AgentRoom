import { Buffer } from "node:buffer";
import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaContentBlockParam,
  BetaMessageParam,
  BetaToolResultBlockParam,
  BetaToolUseBlock,
} from "@anthropic-ai/sdk/resources/beta/messages";
import {
  appendAgentLog,
  getActiveSandbox,
  getAgentState,
  isAgentRunning,
  setAgentIterationCount,
  setAgentStatus,
  type DevDesktopSandbox,
} from "@/lib/dev/e2b-sandbox-store";
import { insertUsageLogAdmin } from "@/lib/data/usage-logs";
import { updateRunAdmin } from "@/lib/data/runs";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const COMPUTER_USE_BETA = "computer-use-2025-01-24";
const DISPLAY_WIDTH = 1024;
const DISPLAY_HEIGHT = 720;

const SYSTEM_PROMPT =
  "You are controlling a sandboxed desktop for a dev smoke test inside Agent Room. Keep actions simple. Do not log into accounts. Do not access secrets. Do not delete files. Do not modify repositories. Complete the requested task safely, then stop.";

type ComputerInput = {
  action?: unknown;
  coordinate?: unknown;
  start_coordinate?: unknown;
  end_coordinate?: unknown;
  text?: unknown;
  key?: unknown;
  scroll_direction?: unknown;
  direction?: unknown;
  scroll_amount?: unknown;
  amount?: unknown;
  duration?: unknown;
  ms?: unknown;
  seconds?: unknown;
};

type DispatchResult = {
  block: BetaToolResultBlockParam;
};

function messageFromError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return String(error || "Unknown error");
}

function asComputerInput(input: unknown): ComputerInput {
  return input && typeof input === "object" ? (input as ComputerInput) : {};
}

function asAction(input: ComputerInput) {
  return typeof input.action === "string" ? input.action : "unknown";
}

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampCoordinate(value: number, max: number) {
  return Math.max(0, Math.min(max, Math.round(value)));
}

function readCoordinate(input: ComputerInput, key: "coordinate" | "start_coordinate" | "end_coordinate" = "coordinate"): [number, number] | null {
  const value = input[key];

  if (Array.isArray(value) && value.length >= 2) {
    const x = Number(value[0]);
    const y = Number(value[1]);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return [clampCoordinate(x, DISPLAY_WIDTH), clampCoordinate(y, DISPLAY_HEIGHT)];
    }
  }

  if (value && typeof value === "object" && "x" in value && "y" in value) {
    const point = value as { x: unknown; y: unknown };
    const x = Number(point.x);
    const y = Number(point.y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return [clampCoordinate(x, DISPLAY_WIDTH), clampCoordinate(y, DISPLAY_HEIGHT)];
    }
  }

  return null;
}

function normalizeKey(key: string) {
  return key
    .split("+")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .map((part) => {
      if (part === "return") return "enter";
      if (part === "ctrl") return "control";
      if (part === "cmd") return "command";
      if (part === "escape") return "esc";
      return part;
    });
}

function assistantText(content: BetaContentBlockParam[]) {
  return content
    .filter((block) => block.type === "text")
    .map((block) => ("text" in block ? block.text : ""))
    .filter(Boolean)
    .join("\n\n");
}

function toolUseBlocks(content: BetaContentBlockParam[]) {
  return content.filter((block): block is BetaToolUseBlock => block.type === "tool_use");
}

function resultBlock(toolUseId: string, content: string | BetaToolResultBlockParam["content"], isError = false): BetaToolResultBlockParam {
  return {
    type: "tool_result",
    tool_use_id: toolUseId,
    content,
    ...(isError ? { is_error: true } : {}),
  };
}

function unsupportedResult(toolUseId: string, action: string, input: ComputerInput, reason?: string): DispatchResult {
  const message = reason ? `unsupported action: ${action} (${reason})` : `unsupported action: ${action}`;
  appendAgentLog({
    type: "unsupported_action",
    payload: { action, input, reason: reason || "not supported by this smoke-test dispatcher" },
  });
  return { block: resultBlock(toolUseId, message, true) };
}

async function moveIfCoordinate(sandbox: DevDesktopSandbox, input: ComputerInput) {
  const coordinate = readCoordinate(input);
  if (!coordinate) return null;
  if (!sandbox.moveMouse) throw new Error("E2B moveMouse is unavailable");
  await sandbox.moveMouse(coordinate[0], coordinate[1]);
  return coordinate;
}

type RunContext = {
  userId: string;
  runId: string;
};

function logUsage(ctx: RunContext | null, type: "agent_step" | "screenshot", credits: number) {
  if (!ctx) return;
  insertUsageLogAdmin(ctx.userId, { runId: ctx.runId, type, creditsUsed: credits }).catch(() => {});
}

async function dispatchComputerAction(
  sandbox: DevDesktopSandbox,
  toolUse: BetaToolUseBlock,
  ctx: RunContext | null,
): Promise<DispatchResult> {
  const input = asComputerInput(toolUse.input);
  const action = asAction(input);

  try {
    switch (action) {
      case "screenshot": {
        if (!sandbox.screenshot) return unsupportedResult(toolUse.id, action, input, "screenshot() is unavailable");

        const bytes = await sandbox.screenshot("bytes");
        const b64 = Buffer.from(bytes).toString("base64");
        appendAgentLog({
          type: "screenshot",
          payload: {
            tool_use_id: toolUse.id,
            b64,
          },
        });
        appendAgentLog({ type: "tool_result", payload: { tool_use_id: toolUse.id, action, ok: true } });
        logUsage(ctx, "screenshot", 0);

        return {
          block: resultBlock(toolUse.id, [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: b64,
              },
            },
          ]),
        };
      }

      case "mouse_move": {
        const coordinate = readCoordinate(input);
        if (!coordinate) return unsupportedResult(toolUse.id, action, input, "missing coordinate");
        if (!sandbox.moveMouse) return unsupportedResult(toolUse.id, action, input, "moveMouse() is unavailable");
        await sandbox.moveMouse(coordinate[0], coordinate[1]);
        appendAgentLog({ type: "tool_result", payload: { tool_use_id: toolUse.id, action, ok: true, coordinate } });
        return { block: resultBlock(toolUse.id, "ok") };
      }

      case "left_click": {
        if (!sandbox.leftClick) return unsupportedResult(toolUse.id, action, input, "leftClick() is unavailable");
        const coordinate = await moveIfCoordinate(sandbox, input);
        await sandbox.leftClick();
        appendAgentLog({ type: "tool_result", payload: { tool_use_id: toolUse.id, action, ok: true, coordinate } });
        return { block: resultBlock(toolUse.id, "ok") };
      }

      case "right_click": {
        if (!sandbox.rightClick) return unsupportedResult(toolUse.id, action, input, "rightClick() is unavailable");
        const coordinate = await moveIfCoordinate(sandbox, input);
        await sandbox.rightClick();
        appendAgentLog({ type: "tool_result", payload: { tool_use_id: toolUse.id, action, ok: true, coordinate } });
        return { block: resultBlock(toolUse.id, "ok") };
      }

      case "middle_click": {
        if (!sandbox.middleClick) return unsupportedResult(toolUse.id, action, input, "middleClick() is unavailable");
        const coordinate = await moveIfCoordinate(sandbox, input);
        await sandbox.middleClick();
        appendAgentLog({ type: "tool_result", payload: { tool_use_id: toolUse.id, action, ok: true, coordinate } });
        return { block: resultBlock(toolUse.id, "ok") };
      }

      case "double_click": {
        if (!sandbox.doubleClick) return unsupportedResult(toolUse.id, action, input, "doubleClick() is unavailable");
        const coordinate = await moveIfCoordinate(sandbox, input);
        await sandbox.doubleClick();
        appendAgentLog({ type: "tool_result", payload: { tool_use_id: toolUse.id, action, ok: true, coordinate } });
        return { block: resultBlock(toolUse.id, "ok") };
      }

      case "left_click_drag": {
        if (!sandbox.drag) return unsupportedResult(toolUse.id, action, input, "drag() is unavailable");
        const start = readCoordinate(input, "start_coordinate");
        const end = readCoordinate(input, "coordinate") || readCoordinate(input, "end_coordinate");
        if (!start || !end) return unsupportedResult(toolUse.id, action, input, "missing start or end coordinate");
        await sandbox.drag(start, end);
        appendAgentLog({ type: "tool_result", payload: { tool_use_id: toolUse.id, action, ok: true, start, end } });
        return { block: resultBlock(toolUse.id, "ok") };
      }

      case "type": {
        const text = asText(input.text);
        if (!text) return unsupportedResult(toolUse.id, action, input, "missing text");
        if (!sandbox.write) return unsupportedResult(toolUse.id, action, input, "write() is unavailable");
        await sandbox.write(text, { chunkSize: 25, delayInMs: 50 });
        appendAgentLog({ type: "tool_result", payload: { tool_use_id: toolUse.id, action, ok: true, textLength: text.length } });
        return { block: resultBlock(toolUse.id, "ok") };
      }

      case "key": {
        const key = asText(input.key);
        if (!key) return unsupportedResult(toolUse.id, action, input, "missing key");
        if (!sandbox.press) return unsupportedResult(toolUse.id, action, input, "press() is unavailable");
        const keys = normalizeKey(key);
        await sandbox.press(keys.length > 1 ? keys : keys[0]);
        appendAgentLog({ type: "tool_result", payload: { tool_use_id: toolUse.id, action, ok: true, key } });
        return { block: resultBlock(toolUse.id, "ok") };
      }

      case "scroll": {
        if (!sandbox.scroll) return unsupportedResult(toolUse.id, action, input, "scroll() is unavailable");
        const directionValue = asText(input.scroll_direction || input.direction || "down").toLowerCase();
        if (directionValue !== "up" && directionValue !== "down") {
          return unsupportedResult(toolUse.id, action, input, "only vertical up/down scroll is supported");
        }
        const amount = Math.max(1, Math.min(20, Math.round(asNumber(input.scroll_amount ?? input.amount, 3))));
        await sandbox.scroll(directionValue, amount);
        appendAgentLog({ type: "tool_result", payload: { tool_use_id: toolUse.id, action, ok: true, direction: directionValue, amount } });
        return { block: resultBlock(toolUse.id, "ok") };
      }

      case "wait": {
        const seconds = Number.isFinite(Number(input.seconds)) ? Number(input.seconds) * 1000 : undefined;
        const duration = Number.isFinite(Number(input.duration)) ? Number(input.duration) * 1000 : undefined;
        const msValue = asNumber(input.ms ?? duration ?? seconds, 1000);
        const ms = Math.max(100, Math.min(5000, Math.round(msValue)));
        if (sandbox.wait) {
          await sandbox.wait(ms);
        } else {
          await new Promise((resolve) => setTimeout(resolve, ms));
        }
        appendAgentLog({ type: "tool_result", payload: { tool_use_id: toolUse.id, action, ok: true, ms } });
        return { block: resultBlock(toolUse.id, "ok") };
      }

      case "cursor_position": {
        if (!sandbox.getCursorPosition) return unsupportedResult(toolUse.id, action, input, "getCursorPosition() is unavailable");
        const position = await sandbox.getCursorPosition();
        appendAgentLog({ type: "tool_result", payload: { tool_use_id: toolUse.id, action, ok: true, position } });
        return { block: resultBlock(toolUse.id, JSON.stringify(position)) };
      }

      case "triple_click":
      case "hold_key":
        return unsupportedResult(toolUse.id, action, input);

      default:
        return unsupportedResult(toolUse.id, action, input);
    }
  } catch (error) {
    const message = messageFromError(error);
    appendAgentLog({ type: "tool_result", payload: { tool_use_id: toolUse.id, action, ok: false, error: message } });
    return { block: resultBlock(toolUse.id, message, true) };
  }
}

async function persistRunStatus(
  ctx: RunContext | null,
  patch: Parameters<typeof updateRunAdmin>[2],
) {
  if (!ctx) return;
  try {
    await updateRunAdmin(ctx.userId, ctx.runId, patch);
  } catch {
    // RLS or env issues should not crash the loop.
  }
}

function finishStopped(ctx: RunContext | null) {
  if (getAgentState().status === "stopped") return;
  setAgentStatus("stopped");
  appendAgentLog({ type: "stopped", payload: { message: "Agent stopped." } });
  void persistRunStatus(ctx, { status: "stopped", endedAt: new Date().toISOString() });
}

function finishDone(ctx: RunContext | null, message = "Agent finished.") {
  setAgentStatus("done");
  appendAgentLog({ type: "done", payload: { message } });
  void persistRunStatus(ctx, { status: "completed", endedAt: new Date().toISOString() });
}

function finishError(ctx: RunContext | null, error: unknown) {
  const message = messageFromError(error);
  setAgentStatus("error", message);
  appendAgentLog({ type: "error", payload: { message } });
  void persistRunStatus(ctx, { status: "error", endedAt: new Date().toISOString(), errorMessage: message });
}

export async function runAgentLoop(taskPrompt: string, ctx: RunContext | null = null) {
  const sandbox = getActiveSandbox();

  if (!sandbox) {
    finishError(ctx, "No active sandbox is available for the agent.");
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    finishError(ctx, "Missing ANTHROPIC_API_KEY. Add it to .env.local or the shell running npm run dev.");
    return;
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const messages: BetaMessageParam[] = [{ role: "user", content: taskPrompt }];

  try {
    while (isAgentRunning()) {
      const agent = getAgentState();

      if (agent.abortFlag) {
        finishStopped(ctx);
        return;
      }

      if (agent.startedAt && Date.now() - agent.startedAt > agent.maxRuntimeMs) {
        appendAgentLog({ type: "max_runtime_reached", payload: { maxRuntimeMs: agent.maxRuntimeMs } });
        finishDone(ctx, "Agent stopped at the max runtime safety cap.");
        return;
      }

      if (agent.iterationCount >= agent.maxIterations) {
        appendAgentLog({ type: "max_iterations_reached", payload: { maxIterations: agent.maxIterations } });
        finishDone(ctx, "Agent stopped at the max iteration safety cap.");
        return;
      }

      const iteration = agent.iterationCount + 1;
      setAgentIterationCount(iteration);

      const response = await client.beta.messages.create({
        betas: [COMPUTER_USE_BETA],
        max_tokens: 4096,
        messages,
        model,
        system: SYSTEM_PROMPT,
        tools: [
          {
            type: "computer_20250124",
            name: "computer",
            display_width_px: DISPLAY_WIDTH,
            display_height_px: DISPLAY_HEIGHT,
            display_number: 1,
          },
        ],
      });

      if (!isAgentRunning() || getAgentState().abortFlag) {
        finishStopped(ctx);
        return;
      }

      const responseContent = response.content as BetaContentBlockParam[];
      messages.push({ role: "assistant", content: responseContent });

      appendAgentLog({
        type: "assistant_message",
        payload: {
          iteration,
          stop_reason: response.stop_reason,
          text: assistantText(responseContent),
          content: response.content,
        },
      });

      const uses = toolUseBlocks(responseContent);

      if (!uses.length) {
        finishDone(ctx);
        return;
      }

      const toolResults: BetaToolResultBlockParam[] = [];

      for (const toolUse of uses) {
        if (getAgentState().abortFlag) {
          finishStopped(ctx);
          return;
        }

        const input = asComputerInput(toolUse.input);
        const action = asAction(input);
        appendAgentLog({
          type: "tool_use",
          payload: {
            tool_use_id: toolUse.id,
            name: toolUse.name,
            action,
            input,
          },
        });

        if (toolUse.name !== "computer") {
          toolResults.push(unsupportedResult(toolUse.id, `tool:${toolUse.name}`, input, "only the computer tool is available").block);
          continue;
        }

        const result = await dispatchComputerAction(sandbox, toolUse, ctx);
        if (action !== "screenshot") logUsage(ctx, "agent_step", 0);
        toolResults.push(result.block);
      }

      messages.push({ role: "user", content: toolResults });
    }

    if (getAgentState().abortFlag) {
      finishStopped(ctx);
    }
  } catch (error) {
    finishError(ctx, error);
  }
}
