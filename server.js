const express = require("express");
const chokidar = require("chokidar");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const app = express();
const PORT = Number(process.env.PORT || 4545);

app.use(express.json());

const repoPath = __dirname;
const feedDir = path.resolve(repoPath, ".agent-feed");
const screenshotsDir = path.resolve(feedDir, "screenshots");
const videosDir = path.resolve(feedDir, "videos");
const screenshotPath = path.resolve(screenshotsDir, "latest.png");
const videoPath = path.resolve(videosDir, "latest.mp4");

const feedFiles = {
  main: {
    label: "Main",
    primary: path.resolve(feedDir, "live.md"),
    fallback: path.resolve(feedDir, "main.md"),
  },
  a: {
    label: "Agent A",
    primary: path.resolve(feedDir, "agent-a.md"),
  },
  b: {
    label: "Agent B",
    primary: path.resolve(feedDir, "agent-b.md"),
  },
  c: {
    label: "Agent C",
    primary: path.resolve(feedDir, "agent-c.md"),
  },
  g: {
    label: "Agent G",
    primary: path.resolve(feedDir, "agent-g.md"),
  },
};

const feedAliases = {
  main: "main",
  live: "main",
  a: "a",
  "agent-a": "a",
  b: "b",
  "agent-b": "b",
  c: "c",
  "agent-c": "c",
  g: "g",
  "agent-g": "g",
};

const proofFreshMs = 15 * 60 * 1000;
const devSandboxState = {
  sandbox: null,
  sandboxId: "",
  streamUrl: "",
  status: "idle",
  startedAt: "",
  lastError: "",
};

let DesktopSandbox = null;

fs.mkdirSync(feedDir, { recursive: true });
fs.mkdirSync(screenshotsDir, { recursive: true });
fs.mkdirSync(videosDir, { recursive: true });

if (!fs.existsSync(feedFiles.main.primary)) {
  fs.writeFileSync(feedFiles.main.primary, "# Agent Live Feed\n\nWaiting for updates...\n");
}

function normalizeAgent(value) {
  return feedAliases[String(value || "main").toLowerCase()] || "main";
}

function selectedFeedInfo(agent) {
  const normalized = normalizeAgent(agent);
  const config = feedFiles[normalized];

  if (normalized === "main" && fs.existsSync(config.primary)) {
    return { ...config, key: normalized, path: config.primary, exists: true };
  }

  if (normalized === "main" && fs.existsSync(config.fallback)) {
    return { ...config, key: normalized, path: config.fallback, exists: true };
  }

  if (fs.existsSync(config.primary)) {
    return { ...config, key: normalized, path: config.primary, exists: true };
  }

  return { ...config, key: normalized, path: config.primary, exists: false };
}

function readFeed(feedInfo) {
  if (!feedInfo.exists) {
    return `# ${feedInfo.label} Feed\n\nWaiting for ${feedInfo.label} checkpoints...`;
  }

  try {
    return fs.readFileSync(feedInfo.path, "utf8");
  } catch {
    return `# ${feedInfo.label} Feed\n\nCould not read feed file.`;
  }
}

function getBranch() {
  try {
    return execFileSync("git", ["branch", "--show-current"], {
      cwd: repoPath,
      encoding: "utf8",
      timeout: 1000,
    }).trim() || "unknown";
  } catch {
    return "unknown";
  }
}

function getLatestCheckpointTime(content) {
  const matches = [...content.matchAll(/^Time:\s*(.+)$/gm)];
  if (!matches.length) return "waiting for checkpoint";
  return matches[matches.length - 1][1].trim();
}

function baseFileInfo(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return {
      exists: true,
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      ageMs: Date.now() - stat.mtimeMs,
    };
  } catch {
    return {
      exists: false,
      mtimeMs: 0,
      size: 0,
      ageMs: 0,
    };
  }
}

function validPng(filePath) {
  try {
    const signature = fs.readFileSync(filePath, { start: 0, end: 7 });
    return signature.length >= 8
      && signature[0] === 0x89
      && signature[1] === 0x50
      && signature[2] === 0x4e
      && signature[3] === 0x47
      && signature[4] === 0x0d
      && signature[5] === 0x0a
      && signature[6] === 0x1a
      && signature[7] === 0x0a;
  } catch {
    return false;
  }
}

function validMp4(filePath) {
  try {
    const header = fs.readFileSync(filePath, { start: 0, end: 11 });
    return header.length >= 12 && header.slice(4, 8).toString("ascii") === "ftyp";
  } catch {
    return false;
  }
}

function proofInfo(kind) {
  const filePath = kind === "video" ? videoPath : screenshotPath;
  const contentType = kind === "video" ? "video/mp4" : "image/png";
  const base = baseFileInfo(filePath);
  const valid = base.exists && (kind === "video" ? validMp4(filePath) : validPng(filePath));
  const state = !base.exists
    ? "missing"
    : !valid
      ? "invalid"
      : base.ageMs > proofFreshMs
        ? "stale"
        : "fresh";

  return {
    ...base,
    valid,
    state,
    path: filePath,
    relativePath: path.relative(repoPath, filePath),
    contentType,
  };
}

function snapshot(agent = "main") {
  const activeAgent = normalizeAgent(agent);
  const feedInfo = selectedFeedInfo(activeAgent);
  const content = readFeed(feedInfo);

  return {
    content,
    meta: {
      mode: "external live-feed",
      repo: repoPath,
      branch: getBranch(),
      activeAgent,
      feedLabel: feedInfo.label,
      feedExists: feedInfo.exists,
      feedFile: path.relative(repoPath, feedInfo.path),
      latestCheckpointTime: getLatestCheckpointTime(content),
      screenshot: proofInfo("screenshot"),
      video: proofInfo("video"),
    },
  };
}

function sendNoStore(res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

function sendProofError(res, info, label) {
  const detail = info.state === "missing"
    ? `Waiting for ${label} at ${info.path}`
    : `Invalid ${label} at ${info.path}`;
  res.status(info.state === "missing" ? 404 : 422).type("text/plain").send(detail);
}

async function getDesktopSandbox() {
  if (!DesktopSandbox) {
    const e2bDesktop = await import("@e2b/desktop");
    DesktopSandbox = e2bDesktop.Sandbox;
  }

  return DesktopSandbox;
}

function errorMessage(error) {
  if (!error) return "";
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

function sendDevOnly404(req, res, next) {
  if (process.env.NODE_ENV === "production") {
    res.status(404).type("text/plain").send("Not found");
    return;
  }

  next();
}

function sandboxPublicState() {
  return {
    apiKeyConfigured: Boolean(process.env.E2B_API_KEY),
    sandboxId: devSandboxState.sandboxId,
    streamUrl: devSandboxState.streamUrl,
    hasStreamUrl: Boolean(devSandboxState.streamUrl),
    status: devSandboxState.status,
    startedAt: devSandboxState.startedAt,
    lastError: devSandboxState.lastError,
  };
}

function resetSandboxState(status = "idle") {
  devSandboxState.sandbox = null;
  devSandboxState.sandboxId = "";
  devSandboxState.streamUrl = "";
  devSandboxState.status = status;
  devSandboxState.startedAt = "";
}

async function stopDevSandbox() {
  const sandbox = devSandboxState.sandbox;
  if (!sandbox) {
    resetSandboxState("idle");
    devSandboxState.lastError = "";
    return;
  }

  devSandboxState.status = "stopping";

  try {
    if (sandbox.stream && typeof sandbox.stream.stop === "function") {
      await sandbox.stream.stop().catch(() => {});
    }

    if (typeof sandbox.kill === "function") {
      await sandbox.kill();
    }

    resetSandboxState("idle");
    devSandboxState.lastError = "";
  } catch (error) {
    devSandboxState.status = "cleanup_failed";
    devSandboxState.lastError = errorMessage(error);
    throw error;
  }
}

function sandboxTestPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AgentRoom Dev Sandbox Test</title>
  <link rel="icon" href="data:," />
  <style>
    :root {
      color-scheme: dark;
      --bg: #050505;
      --panel: #0f0f0f;
      --line: #262626;
      --text: #f5f5f5;
      --muted: #9a9a9a;
      --dim: #666;
      --green: #3ee98c;
      --blue: #6fafe3;
      --yellow: #f5b544;
      --red: #e24b4a;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    button { font: inherit; }

    .shell {
      width: min(1180px, calc(100vw - 36px));
      margin: 0 auto;
      padding: 34px 0;
    }

    header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 18px;
    }

    h1 {
      margin: 12px 0 7px;
      font-size: clamp(26px, 3.4vw, 42px);
      line-height: 1.02;
      letter-spacing: 0;
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 9px;
      border: 1px solid rgba(62, 233, 140, 0.3);
      border-radius: 5px;
      background: rgba(62, 233, 140, 0.08);
      color: var(--green);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      font-weight: 800;
    }

    .eyebrow::before {
      content: "";
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      animation: pulse 1.25s infinite;
    }

    .subtitle {
      max-width: 760px;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.55;
    }

    .actions {
      display: flex;
      gap: 9px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .button {
      min-height: 38px;
      border: 1px solid #343434;
      border-radius: 7px;
      background: #181818;
      color: var(--text);
      cursor: pointer;
      font-size: 13px;
      font-weight: 800;
      padding: 9px 12px;
    }

    .button.primary {
      border-color: rgba(62, 233, 140, 0.42);
      background: rgba(62, 233, 140, 0.12);
      color: var(--green);
    }

    .button.danger {
      border-color: rgba(226, 75, 74, 0.38);
      background: rgba(226, 75, 74, 0.1);
      color: #ff8d8c;
    }

    .button:disabled {
      cursor: wait;
      opacity: 0.55;
    }

    .stage {
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
      background: var(--panel);
    }

    .stage-top {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 18px;
      padding: 18px 22px 16px;
      border-bottom: 1px solid #1a1a1a;
    }

    .run-title {
      font-size: 18px;
      font-weight: 800;
    }

    .run-meta {
      margin-top: 5px;
      color: var(--muted);
      font-size: 12px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      border: 1px solid rgba(111, 175, 227, 0.36);
      border-radius: 5px;
      background: rgba(111, 175, 227, 0.1);
      color: var(--blue);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      font-weight: 800;
      padding: 6px 9px;
    }

    .badge[data-state="running"] {
      border-color: rgba(62, 233, 140, 0.36);
      background: rgba(62, 233, 140, 0.09);
      color: var(--green);
    }

    .badge[data-state="cleanup_failed"],
    .badge[data-state="creation_failed"],
    .badge[data-state="missing_api_key"],
    .badge[data-state="stream_unavailable"] {
      border-color: rgba(226, 75, 74, 0.38);
      background: rgba(226, 75, 74, 0.1);
      color: #ff8d8c;
    }

    .stage-body {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 16px;
      padding: 18px 22px 22px;
      background: #070707;
    }

    .monitor-label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }

    .agent-chip {
      display: flex;
      align-items: center;
      gap: 9px;
      min-width: 0;
    }

    .avatar {
      width: 25px;
      height: 25px;
      border: 1px solid #1d7c4d;
      border-radius: 50%;
      background: #0f2a1a;
      color: var(--green);
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10px;
      font-weight: 900;
    }

    .agent-name {
      font-size: 13px;
      font-weight: 800;
    }

    .agent-sub {
      margin-top: 2px;
      color: var(--muted);
      font-size: 11px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .rec {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid rgba(226, 75, 74, 0.34);
      border-radius: 5px;
      background: rgba(226, 75, 74, 0.1);
      color: var(--red);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10px;
      font-weight: 850;
      padding: 4px 8px;
    }

    .rec::before {
      content: "";
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      animation: pulse 1s infinite;
    }

    .monitor {
      border: 1px solid #2a2a2a;
      border-radius: 10px;
      background: #191919;
      padding: 10px;
    }

    .screen {
      position: relative;
      aspect-ratio: 16 / 10;
      overflow: hidden;
      border-radius: 5px;
      background: #0b0b0b;
    }

    iframe {
      width: 100%;
      height: 100%;
      border: 0;
      background: #0b0b0b;
    }

    .hidden { display: none; }

    .empty {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 24px;
      text-align: center;
      background:
        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
        #101010;
      background-size: 34px 34px;
    }

    .empty strong {
      display: block;
      margin-bottom: 8px;
      font-size: 16px;
    }

    .empty span {
      display: block;
      max-width: 520px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.55;
    }

    .status-grid {
      display: grid;
      gap: 10px;
    }

    .status-card {
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      padding: 12px;
    }

    .label {
      margin-bottom: 6px;
      color: var(--dim);
      font-size: 10px;
      font-weight: 850;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .value {
      overflow: hidden;
      color: var(--text);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      line-height: 1.45;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .value.ok { color: var(--green); }
    .value.warn { color: var(--yellow); }
    .value.error { color: #ff8d8c; }

    .event-log {
      margin-top: 14px;
      border-top: 1px solid #1a1a1a;
      padding: 15px 22px 18px;
    }

    .event-log h2 {
      margin: 0 0 10px;
      font-size: 14px;
    }

    .log-list {
      display: grid;
      gap: 7px;
    }

    .log-row {
      display: grid;
      grid-template-columns: 72px 88px minmax(0, 1fr);
      gap: 9px;
      align-items: center;
      color: var(--muted);
      font-size: 12px;
    }

    .log-row code {
      color: var(--dim);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10px;
    }

    .log-type {
      justify-self: start;
      border-radius: 4px;
      background: #1f1f1f;
      color: var(--blue);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10px;
      font-weight: 850;
      padding: 3px 6px;
      text-transform: uppercase;
    }

    @media (max-width: 880px) {
      header, .stage-top, .stage-body {
        grid-template-columns: 1fr;
      }

      header { align-items: flex-start; }
      .actions { justify-content: flex-start; }
    }

    @keyframes pulse {
      0%, 49% { opacity: 1; }
      50%, 100% { opacity: 0.35; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <div>
        <div class="eyebrow">DEV SMOKE TEST</div>
        <h1>Live VM Stage</h1>
        <div class="subtitle">Isolated E2B desktop sandbox validation for the future AgentRoom Live Stage. This page does not touch runs, agents, tasks, approvals, integrations, Supabase, FoFit, commits, or deployments.</div>
      </div>
      <div class="actions">
        <button class="button primary" id="startButton" type="button">Start Sandbox</button>
        <button class="button" id="refreshButton" type="button">Refresh</button>
        <button class="button danger" id="stopButton" type="button">Stop / Cleanup</button>
      </div>
    </header>

    <section class="stage" aria-label="E2B sandbox smoke test stage">
      <div class="stage-top">
        <div>
          <div class="run-title">Desktop Sandbox Stream</div>
          <div class="run-meta">Provider: E2B Desktop SDK - Resolution: 1024x720 - Timeout: 5 minutes</div>
        </div>
        <div class="badge" id="statusBadge" data-state="idle">IDLE</div>
      </div>

      <div class="stage-body">
        <div>
          <div class="monitor-label">
            <div class="agent-chip">
              <div class="avatar">VM</div>
              <div>
                <div class="agent-name">Sandbox Desktop</div>
                <div class="agent-sub" id="streamSub">Waiting for stream URL</div>
              </div>
            </div>
            <div class="rec">STREAMING</div>
          </div>
          <div class="monitor">
            <div class="screen">
              <iframe id="streamFrame" class="hidden" title="E2B desktop stream" allow="clipboard-read; clipboard-write; fullscreen"></iframe>
              <div class="empty" id="emptyState">
                <div>
                  <strong id="emptyTitle">Ready to start a desktop sandbox.</strong>
                  <span id="emptyCopy">Set E2B_API_KEY in the shell that starts AgentRoom, then click Start Sandbox. The live desktop stream will appear here if E2B returns a stream URL.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside class="status-grid" aria-label="Sandbox status">
          <div class="status-card"><div class="label">API key</div><div class="value" id="apiKeyValue">Checking...</div></div>
          <div class="status-card"><div class="label">Sandbox status</div><div class="value" id="statusValue">idle</div></div>
          <div class="status-card"><div class="label">Sandbox ID</div><div class="value" id="sandboxIdValue">none</div></div>
          <div class="status-card"><div class="label">Started at</div><div class="value" id="startedAtValue">not started</div></div>
          <div class="status-card"><div class="label">Stream URL</div><div class="value" id="streamUrlValue">unavailable</div></div>
          <div class="status-card"><div class="label">Last error</div><div class="value" id="lastErrorValue">none</div></div>
        </aside>
      </div>

      <div class="event-log">
        <h2>Smoke Test Activity</h2>
        <div class="log-list" id="logList"></div>
      </div>
    </section>
  </div>

  <script>
    const statusBadge = document.getElementById("statusBadge");
    const startButton = document.getElementById("startButton");
    const refreshButton = document.getElementById("refreshButton");
    const stopButton = document.getElementById("stopButton");
    const apiKeyValue = document.getElementById("apiKeyValue");
    const statusValue = document.getElementById("statusValue");
    const sandboxIdValue = document.getElementById("sandboxIdValue");
    const startedAtValue = document.getElementById("startedAtValue");
    const streamUrlValue = document.getElementById("streamUrlValue");
    const lastErrorValue = document.getElementById("lastErrorValue");
    const streamFrame = document.getElementById("streamFrame");
    const streamSub = document.getElementById("streamSub");
    const emptyState = document.getElementById("emptyState");
    const emptyTitle = document.getElementById("emptyTitle");
    const emptyCopy = document.getElementById("emptyCopy");
    const logList = document.getElementById("logList");
    const logs = [];

    function addLog(type, message) {
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      logs.unshift({ time, type, message });
      renderLogs();
    }

    function renderLogs() {
      logList.textContent = "";
      if (!logs.length) {
        const row = document.createElement("div");
        row.className = "log-row";
        row.innerHTML = "<code>--:--:--</code><span class=\\"log-type\\">ready</span><span>Waiting for smoke test action.</span>";
        logList.appendChild(row);
        return;
      }

      logs.slice(0, 8).forEach((item) => {
        const row = document.createElement("div");
        row.className = "log-row";
        const time = document.createElement("code");
        time.textContent = item.time;
        const type = document.createElement("span");
        type.className = "log-type";
        type.textContent = item.type;
        const message = document.createElement("span");
        message.textContent = item.message;
        row.append(time, type, message);
        logList.appendChild(row);
      });
    }

    function setBusy(isBusy) {
      startButton.disabled = isBusy;
      refreshButton.disabled = isBusy;
      stopButton.disabled = isBusy;
    }

    function valueClass(element, state) {
      element.className = "value" + (state ? " " + state : "");
    }

    function setEmpty(title, copy) {
      emptyTitle.textContent = title;
      emptyCopy.textContent = copy;
      emptyState.classList.remove("hidden");
      streamFrame.classList.add("hidden");
      streamFrame.removeAttribute("src");
    }

    function renderState(state) {
      const status = state.status || "idle";
      statusBadge.textContent = status.replaceAll("_", " ").toUpperCase();
      statusBadge.dataset.state = status;
      statusValue.textContent = status;
      sandboxIdValue.textContent = state.sandboxId || "none";
      startedAtValue.textContent = state.startedAt ? new Date(state.startedAt).toLocaleString() : "not started";
      streamUrlValue.textContent = state.hasStreamUrl ? state.streamUrl : "unavailable";
      lastErrorValue.textContent = state.lastError || "none";
      streamSub.textContent = state.sandboxId || "Waiting for stream URL";

      apiKeyValue.textContent = state.apiKeyConfigured ? "configured" : "missing E2B_API_KEY";
      valueClass(apiKeyValue, state.apiKeyConfigured ? "ok" : "error");
      valueClass(statusValue, status === "running" ? "ok" : state.lastError ? "error" : "warn");
      valueClass(streamUrlValue, state.hasStreamUrl ? "ok" : "warn");
      valueClass(lastErrorValue, state.lastError ? "error" : "");

      startButton.disabled = status === "starting" || status === "running" || status === "stopping";
      stopButton.disabled = !state.sandboxId || status === "stopping";

      if (!state.apiKeyConfigured) {
        setEmpty("Missing E2B_API_KEY.", "Start AgentRoom with E2B_API_KEY=your_key node server.js, then refresh this page.");
        return;
      }

      if (state.lastError) {
        setEmpty("Sandbox smoke test hit an error.", state.lastError);
        return;
      }

      if (state.hasStreamUrl) {
        streamFrame.src = state.streamUrl;
        streamFrame.classList.remove("hidden");
        emptyState.classList.add("hidden");
        return;
      }

      if (status === "starting") {
        setEmpty("Creating desktop sandbox...", "E2B is booting the desktop and starting VNC streaming.");
        return;
      }

      if (status === "stream_unavailable") {
        setEmpty("Stream URL unavailable.", "The sandbox started, but E2B did not return a stream URL. Try cleanup and start again.");
        return;
      }

      setEmpty("Ready to start a desktop sandbox.", "Click Start Sandbox. The live E2B desktop stream will render here when available.");
    }

    async function requestState(path, options) {
      const response = await fetch(path, Object.assign({ cache: "no-store" }, options || {}));
      const state = await response.json().catch(() => ({}));
      renderState(state);
      if (!response.ok) throw new Error(state.lastError || "Request failed");
      return state;
    }

    async function refresh() {
      const state = await requestState("/dev/sandbox-test/state");
      addLog("state", "Status refreshed: " + state.status);
    }

    startButton.addEventListener("click", async () => {
      setBusy(true);
      addLog("start", "Creating E2B desktop sandbox.");
      try {
        const state = await requestState("/dev/sandbox-test/start", { method: "POST" });
        addLog("stream", state.hasStreamUrl ? "Live stream URL received." : state.lastError || "Sandbox started without stream URL.");
      } catch (error) {
        addLog("error", error.message);
      } finally {
        setBusy(false);
        requestState("/dev/sandbox-test/state").catch(() => {});
      }
    });

    refreshButton.addEventListener("click", () => {
      refresh().catch((error) => addLog("error", error.message));
    });

    stopButton.addEventListener("click", async () => {
      setBusy(true);
      addLog("stop", "Cleaning up E2B desktop sandbox.");
      try {
        await requestState("/dev/sandbox-test/stop", { method: "POST" });
        addLog("cleanup", "Sandbox cleanup completed.");
      } catch (error) {
        addLog("error", error.message);
      } finally {
        setBusy(false);
      }
    });

    renderLogs();
    requestState("/dev/sandbox-test/state").catch((error) => addLog("error", error.message));
  </script>
</body>
</html>`;
}

app.use("/dev/sandbox-test", sendDevOnly404);

app.get("/dev/sandbox-test", (req, res) => {
  sendNoStore(res);
  res.type("html").send(sandboxTestPage());
});

app.get("/dev/sandbox-test/state", (req, res) => {
  sendNoStore(res);
  res.json(sandboxPublicState());
});

app.post("/dev/sandbox-test/start", async (req, res) => {
  sendNoStore(res);

  if (!process.env.E2B_API_KEY) {
    devSandboxState.status = "missing_api_key";
    devSandboxState.lastError = "Missing E2B_API_KEY. Start AgentRoom with E2B_API_KEY=your_key node server.js.";
    res.json(sandboxPublicState());
    return;
  }

  if (devSandboxState.sandbox && devSandboxState.status === "running") {
    res.json(sandboxPublicState());
    return;
  }

  if (devSandboxState.status === "starting" || devSandboxState.status === "stopping") {
    res.status(409).json(sandboxPublicState());
    return;
  }

  if (devSandboxState.sandbox) {
    await stopDevSandbox().catch(() => {});
  }

  let sandbox = null;
  devSandboxState.status = "starting";
  devSandboxState.lastError = "";
  devSandboxState.streamUrl = "";
  devSandboxState.sandboxId = "";
  devSandboxState.startedAt = new Date().toISOString();

  try {
    const Sandbox = await getDesktopSandbox();
    sandbox = await Sandbox.create({
      resolution: [1024, 720],
      dpi: 96,
      timeoutMs: 300_000,
    });

    await sandbox.stream.start();

    const streamUrl = sandbox.stream.getUrl();
    devSandboxState.sandbox = sandbox;
    devSandboxState.sandboxId = sandbox.sandboxId || sandbox.id || "";
    devSandboxState.streamUrl = streamUrl || "";
    devSandboxState.status = streamUrl ? "running" : "stream_unavailable";

    if (!streamUrl) {
      devSandboxState.lastError = "E2B sandbox started, but no stream URL was returned.";
      res.status(502).json(sandboxPublicState());
      return;
    }

    res.json(sandboxPublicState());
  } catch (error) {
    if (sandbox && typeof sandbox.kill === "function") {
      await sandbox.kill().catch(() => {});
    }

    devSandboxState.sandbox = null;
    devSandboxState.sandboxId = "";
    devSandboxState.streamUrl = "";
    devSandboxState.status = "creation_failed";
    devSandboxState.lastError = errorMessage(error);
    res.status(500).json(sandboxPublicState());
  }
});

app.post("/dev/sandbox-test/stop", async (req, res) => {
  sendNoStore(res);

  try {
    await stopDevSandbox();
    res.json(sandboxPublicState());
  } catch {
    res.status(500).json(sandboxPublicState());
  }
});

app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <title>AgentRoom v0.1.1</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      color-scheme: dark;
      --bg: #07090f;
      --panel: #0b0f19;
      --panel-2: #101622;
      --line: rgba(255,255,255,0.1);
      --text: #f5f8ff;
      --muted: rgba(245,248,255,0.62);
      --dim: rgba(245,248,255,0.38);
      --green: #22e69a;
      --blue: #3a78ff;
      --yellow: #ffd166;
      --red: #ff5c7a;
      --shadow: rgba(34,230,154,0.18);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at 12% 0%, rgba(58,120,255,0.16), transparent 28%),
        radial-gradient(circle at 86% 10%, rgba(34,230,154,0.1), transparent 28%),
        linear-gradient(145deg, #07090f 0%, #090d15 48%, #05070b 100%);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    button {
      font: inherit;
    }

    .shell {
      min-height: 100vh;
      display: grid;
      grid-template-rows: auto 1fr;
    }

    .topbar {
      position: sticky;
      top: 0;
      z-index: 10;
      padding: 16px 20px;
      border-bottom: 1px solid var(--line);
      background: rgba(7,9,15,0.9);
      backdrop-filter: blur(18px);
    }

    .brand-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 12px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .mark {
      width: 38px;
      height: 38px;
      border-radius: 13px;
      border: 1px solid rgba(34,230,154,0.42);
      background: linear-gradient(145deg, rgba(34,230,154,0.18), rgba(58,120,255,0.14));
      box-shadow: 0 0 24px var(--shadow);
      display: grid;
      place-items: center;
      color: var(--green);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.04em;
    }

    h1 {
      margin: 0;
      font-size: 18px;
      line-height: 1.08;
      letter-spacing: 0;
    }

    .subtitle {
      margin-top: 4px;
      color: var(--muted);
      font-size: 12px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 11px;
      border-radius: 999px;
      border: 1px solid rgba(34,230,154,0.3);
      background: rgba(34,230,154,0.08);
      color: var(--green);
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }

    .status-badge::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: currentColor;
      box-shadow: 0 0 16px currentColor;
    }

    .status-live {
      border-color: rgba(34,230,154,0.32);
      background: rgba(34,230,154,0.08);
      color: var(--green);
    }

    .status-paused {
      border-color: rgba(255,209,102,0.38);
      background: rgba(255,209,102,0.1);
      color: var(--yellow);
    }

    .status-blocked {
      border-color: rgba(255,92,122,0.42);
      background: rgba(255,92,122,0.1);
      color: var(--red);
    }

    .status-error {
      border-color: rgba(255,92,122,0.48);
      background: rgba(255,92,122,0.12);
      color: var(--red);
    }

    .status-verified {
      border-color: rgba(58,120,255,0.38);
      background: linear-gradient(145deg, rgba(58,120,255,0.13), rgba(34,230,154,0.08));
      color: #78d7ff;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 0.75fr 1.45fr 0.8fr 1fr;
      gap: 10px;
    }

    .meta-card,
    .health-card,
    .checkpoint-card,
    .proof-card,
    .command-strip {
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.035);
    }

    .meta-card {
      min-width: 0;
      border-radius: 12px;
      padding: 9px 11px;
    }

    .label {
      margin-bottom: 5px;
      color: var(--dim);
      font-size: 10px;
      line-height: 1;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .value {
      overflow: hidden;
      color: var(--text);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      line-height: 1.35;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .main {
      display: grid;
      grid-template-columns: minmax(430px, 1.12fr) minmax(360px, 0.9fr) minmax(280px, 0.62fr);
      gap: 16px;
      padding: 16px;
      min-height: 0;
    }

    .panel {
      min-width: 0;
      min-height: calc(100vh - 150px);
      border: 1px solid var(--line);
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(16,22,34,0.92), rgba(8,11,18,0.94));
      box-shadow: 0 22px 80px rgba(0,0,0,0.34);
      overflow: hidden;
    }

    .panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 15px;
      border-bottom: 1px solid var(--line);
      background: rgba(255,255,255,0.025);
    }

    .panel-title {
      font-size: 13px;
      font-weight: 850;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .panel-kicker {
      color: var(--muted);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      white-space: nowrap;
    }

    .feed-panel,
    .proof-panel,
    .health-panel {
      display: grid;
      grid-template-rows: auto 1fr;
    }

    .feed-head {
      display: block;
      padding-bottom: 10px;
    }

    .feed-head-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .tabs {
      display: flex;
      gap: 7px;
      overflow-x: auto;
    }

    .tab,
    .utility-button {
      border: 1px solid var(--line);
      border-radius: 999px;
      background: rgba(255,255,255,0.04);
      color: var(--muted);
      cursor: pointer;
      font-size: 12px;
      font-weight: 800;
    }

    .tab {
      padding: 8px 11px;
      white-space: nowrap;
    }

    .tab.active {
      border-color: rgba(58,120,255,0.44);
      background: rgba(58,120,255,0.13);
      color: #d8e5ff;
    }

    .utility-button {
      padding: 8px 10px;
    }

    .utility-button:hover,
    .tab:hover {
      border-color: rgba(34,230,154,0.35);
      color: var(--text);
    }

    .feed-scroll {
      min-height: 0;
      overflow: auto;
      padding: 14px;
    }

    .timeline {
      display: grid;
      gap: 12px;
    }

    .checkpoint-card {
      border-radius: 16px;
      padding: 14px;
      background: linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02));
    }

    .checkpoint-top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }

    .phase {
      color: var(--text);
      font-size: 14px;
      font-weight: 850;
      line-height: 1.25;
    }

    .time {
      color: var(--dim);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      white-space: nowrap;
    }

    .checkpoint-status {
      display: inline-flex;
      margin-bottom: 11px;
      padding: 5px 8px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .checkpoint-text {
      color: rgba(245,248,255,0.75);
      font-size: 12px;
      line-height: 1.5;
    }

    .checkpoint-next {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid rgba(255,255,255,0.08);
      color: rgba(245,248,255,0.63);
      font-size: 12px;
      line-height: 1.45;
    }

    .raw-feed {
      display: none;
      margin: 0;
      color: rgba(245,248,255,0.82);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      line-height: 1.62;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .show-raw .timeline {
      display: none;
    }

    .show-raw .raw-feed {
      display: block;
    }

    .proof-body {
      display: grid;
      grid-template-rows: minmax(290px, 1fr) minmax(230px, 0.75fr) auto;
      gap: 14px;
      padding: 14px;
      min-height: 0;
    }

    .proof-card {
      position: relative;
      min-height: 0;
      border-radius: 16px;
      background: #05070b;
      overflow: hidden;
    }

    .proof-label {
      position: absolute;
      top: 12px;
      left: 12px;
      z-index: 2;
      padding: 6px 8px;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 999px;
      background: rgba(7,9,15,0.72);
      backdrop-filter: blur(12px);
      color: var(--muted);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .proof-label[data-state="fresh"] {
      border-color: rgba(34,230,154,0.32);
      color: var(--green);
    }

    .proof-label[data-state="stale"] {
      border-color: rgba(255,209,102,0.36);
      color: var(--yellow);
    }

    .proof-label[data-state="missing"] {
      border-color: rgba(255,255,255,0.12);
      color: var(--dim);
    }

    .proof-label[data-state="invalid"] {
      border-color: rgba(255,92,122,0.42);
      color: var(--red);
    }

    .proof-media {
      width: 100%;
      height: 100%;
      min-height: inherit;
      display: block;
      object-fit: contain;
      background: linear-gradient(145deg, rgba(58,120,255,0.07), rgba(34,230,154,0.04));
    }

    .empty {
      height: 100%;
      min-height: inherit;
      display: grid;
      place-items: center;
      padding: 24px;
      color: var(--dim);
      text-align: center;
    }

    .empty strong {
      display: block;
      margin-bottom: 7px;
      color: rgba(245,248,255,0.76);
      font-size: 14px;
    }

    .empty span {
      color: var(--dim);
      font-size: 12px;
      line-height: 1.45;
    }

    .command-strip {
      border-radius: 16px;
      padding: 13px;
      background: rgba(255,255,255,0.028);
    }

    .copy-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }

    .copy-code {
      margin: 0;
      color: rgba(245,248,255,0.72);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      line-height: 1.55;
      white-space: pre-wrap;
    }

    .health-body {
      display: grid;
      gap: 12px;
      padding: 14px;
      align-content: start;
      overflow: auto;
    }

    .health-card {
      border-radius: 15px;
      padding: 13px;
      background: rgba(255,255,255,0.032);
    }

    .health-title {
      margin-bottom: 9px;
      color: var(--text);
      font-size: 12px;
      font-weight: 850;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .health-list {
      display: grid;
      gap: 7px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .health-list li {
      color: rgba(245,248,255,0.68);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      line-height: 1.42;
      overflow-wrap: anywhere;
    }

    .health-empty {
      color: var(--dim);
      font-size: 12px;
    }

    .hidden {
      display: none !important;
    }

    @media (max-width: 1260px) {
      .main {
        grid-template-columns: minmax(0, 1fr) minmax(360px, 0.85fr);
      }

      .health-panel {
        grid-column: 1 / -1;
        min-height: auto;
      }

      .health-body {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
    }

    @media (max-width: 900px) {
      .meta-grid,
      .main,
      .health-body {
        grid-template-columns: 1fr;
      }

      .panel {
        min-height: 520px;
      }
    }

    @media (max-width: 620px) {
      .topbar {
        padding: 14px;
      }

      .brand-row,
      .feed-head-row {
        align-items: flex-start;
        flex-direction: column;
      }

      .main {
        padding: 12px;
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header class="topbar">
      <div class="brand-row">
        <div class="brand">
          <div class="mark">AR</div>
          <div>
            <h1>AgentRoom</h1>
            <div class="subtitle">Local AI agent mission control - v0.1.1</div>
          </div>
        </div>
        <div class="status-badge status-live" id="statusBadge">Live</div>
      </div>
      <div class="meta-grid">
        <div class="meta-card">
          <div class="label">Mode</div>
          <div class="value" id="mode">external live-feed</div>
        </div>
        <div class="meta-card">
          <div class="label">Repo</div>
          <div class="value" id="repo">Loading...</div>
        </div>
        <div class="meta-card">
          <div class="label">Branch</div>
          <div class="value" id="branch">Loading...</div>
        </div>
        <div class="meta-card">
          <div class="label">Latest checkpoint</div>
          <div class="value" id="checkpoint">Loading...</div>
        </div>
      </div>
    </header>

    <main class="main">
      <section class="panel feed-panel">
        <div class="panel-head feed-head">
          <div class="feed-head-row">
            <div>
              <div class="panel-title">Live Checkpoints</div>
              <div class="panel-kicker" id="feedFile">.agent-feed/live.md</div>
            </div>
            <button class="utility-button" id="rawToggle" type="button">Raw feed</button>
          </div>
          <div class="tabs" role="tablist" aria-label="Agent feeds">
            <button class="tab active" type="button" data-agent="live">Main</button>
            <button class="tab" type="button" data-agent="a">Agent A</button>
            <button class="tab" type="button" data-agent="b">Agent B</button>
            <button class="tab" type="button" data-agent="c">Agent C</button>
            <button class="tab" type="button" data-agent="g">Agent G</button>
          </div>
        </div>
        <div class="feed-scroll" id="feedScroll">
          <div class="timeline" id="timeline"></div>
          <pre class="raw-feed" id="rawFeed">Loading...</pre>
        </div>
      </section>

      <aside class="panel proof-panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">Visual Proof</div>
            <div class="panel-kicker">screenshot on top, video below</div>
          </div>
        </div>
        <div class="proof-body">
          <div class="proof-card">
            <div class="proof-label" id="screenshotLabel" data-state="missing">Screenshot · missing</div>
            <img id="screenshot" class="proof-media hidden" alt="Latest simulator screenshot" />
            <div id="screenshotEmpty" class="empty">
              <div>
                <strong id="screenshotEmptyTitle">Waiting for simulator screenshot...</strong>
                <span id="screenshotEmptyCopy">Run the screenshot command below and AgentRoom will refresh this panel automatically.</span>
              </div>
            </div>
          </div>

          <div class="proof-card">
            <div class="proof-label" id="videoLabel" data-state="missing">Video · missing</div>
            <video id="video" class="proof-media hidden" controls playsinline muted></video>
            <div id="videoEmpty" class="empty">
              <div>
                <strong id="videoEmptyTitle">Waiting for demo video...</strong>
                <span id="videoEmptyCopy">Record to the absolute video path below and AgentRoom will refresh this panel automatically.</span>
              </div>
            </div>
          </div>

          <div class="command-strip">
            <div class="copy-row">
              <div>
                <div class="label">Proof capture</div>
                <div class="value">Simulator commands</div>
              </div>
              <button class="utility-button" id="copyProof" type="button">Copy proof commands</button>
            </div>
            <pre class="copy-code" id="proofCommands">xcrun simctl io booted screenshot ${screenshotPath}
xcrun simctl io booted recordVideo ${videoPath}</pre>
          </div>
        </div>
      </aside>

      <aside class="panel health-panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">Agent Health</div>
            <div class="panel-kicker" id="healthStatus">Waiting</div>
          </div>
        </div>
        <div class="health-body">
          <div class="health-card">
            <div class="health-title">Repo status</div>
            <ul class="health-list" id="repoList"></ul>
          </div>
          <div class="health-card">
            <div class="health-title">Commands run</div>
            <ul class="health-list" id="commandsList"></ul>
          </div>
          <div class="health-card">
            <div class="health-title">Blockers</div>
            <ul class="health-list" id="blockersList"></ul>
          </div>
          <div class="health-card">
            <div class="health-title">Touched files</div>
            <ul class="health-list" id="touchedList"></ul>
          </div>
          <div class="health-card">
            <div class="health-title">Verification</div>
            <ul class="health-list" id="verificationList"></ul>
          </div>
        </div>
      </aside>
    </main>
  </div>

  <script>
    const statusBadge = document.getElementById("statusBadge");
    const mode = document.getElementById("mode");
    const repo = document.getElementById("repo");
    const branch = document.getElementById("branch");
    const checkpoint = document.getElementById("checkpoint");
    const feedFile = document.getElementById("feedFile");
    const feedScroll = document.getElementById("feedScroll");
    const timeline = document.getElementById("timeline");
    const rawFeed = document.getElementById("rawFeed");
    const rawToggle = document.getElementById("rawToggle");
    const screenshotLabel = document.getElementById("screenshotLabel");
    const screenshot = document.getElementById("screenshot");
    const screenshotEmpty = document.getElementById("screenshotEmpty");
    const screenshotEmptyTitle = document.getElementById("screenshotEmptyTitle");
    const screenshotEmptyCopy = document.getElementById("screenshotEmptyCopy");
    const videoLabel = document.getElementById("videoLabel");
    const video = document.getElementById("video");
    const videoEmpty = document.getElementById("videoEmpty");
    const videoEmptyTitle = document.getElementById("videoEmptyTitle");
    const videoEmptyCopy = document.getElementById("videoEmptyCopy");
    const copyProof = document.getElementById("copyProof");
    const proofCommands = document.getElementById("proofCommands");
    const healthStatus = document.getElementById("healthStatus");
    const repoList = document.getElementById("repoList");
    const commandsList = document.getElementById("commandsList");
    const blockersList = document.getElementById("blockersList");
    const touchedList = document.getElementById("touchedList");
    const verificationList = document.getElementById("verificationList");
    const tabs = Array.from(document.querySelectorAll(".tab"));

    let activeAgent = "main";
    let eventSource = null;
    let screenshotStamp = "";
    let videoStamp = "";

    function normalizeText(value, fallback) {
      const text = String(value || "").trim();
      return text || fallback;
    }

    function statusClass(status) {
      const s = String(status || "").toLowerCase();
      if (s.includes("error") || s.includes("failed") || s.includes("fail")) return "status-error";
      if (s.includes("blocked") || s.includes("paused") || s.includes("pending") || s.includes("waiting")) return "status-paused";
      if (s.includes("verified") || s.includes("pass")) return "status-verified";
      if (s.includes("partial")) return "status-verified";
      return "status-live";
    }

    function statusLabel(status) {
      const value = normalizeText(status, "Live");
      const lower = value.toLowerCase();
      if (lower.includes("error") || lower.includes("failed") || lower.includes("fail")) return "Error";
      if (lower.includes("blocked")) return "Blocked";
      if (lower.includes("paused")) return "Paused";
      if (lower.includes("waiting")) return "Waiting";
      if (lower.includes("verified")) return "Verified";
      if (lower.includes("partial")) return "Partially Verified";
      if (lower.includes("in progress")) return "Live";
      return value;
    }

    function parseCheckpoints(content) {
      const parts = String(content || "").split(/^## LIVE FEED CHECKPOINT/gm).slice(1);
      return parts.map((part) => {
        const fields = {};
        let currentKey = "";
        part.split(/\\r?\\n/).forEach((line) => {
          const match = line.match(/^([A-Za-z ]+):[ ]*(.*)$/);
          if (match) {
            currentKey = match[1].trim().toLowerCase().replaceAll(" ", "_");
            fields[currentKey] = match[2].trim();
          } else if (currentKey && line.trim()) {
            fields[currentKey] = fields[currentKey] ? fields[currentKey] + "\\n" + line.trim() : line.trim();
          }
        });
        return fields;
      }).filter((checkpoint) => Object.keys(checkpoint).length > 0);
    }

    function splitItems(value, emptyText) {
      const raw = normalizeText(value, "");
      if (!raw || /^(none|n\\/a|no blockers reported|no touched files yet|no commands recorded yet)$/i.test(raw)) {
        return [emptyText];
      }
      return raw
        .split(/;|\\r?\\n/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 10);
    }

    function createEl(tag, className, text) {
      const el = document.createElement(tag);
      if (className) el.className = className;
      if (text !== undefined) el.textContent = text;
      return el;
    }

    function renderTimeline(checkpoints, content) {
      timeline.textContent = "";
      rawFeed.textContent = content || "Waiting for live feed...";

      if (!checkpoints.length) {
        const empty = createEl("div", "checkpoint-card");
        empty.appendChild(createEl("div", "phase", "Waiting for live feed..."));
        empty.appendChild(createEl("div", "checkpoint-text", "AgentRoom is watching the selected feed file for checkpoint blocks."));
        timeline.appendChild(empty);
        return;
      }

      checkpoints.slice().reverse().forEach((item) => {
        const card = createEl("article", "checkpoint-card");
        const top = createEl("div", "checkpoint-top");
        top.appendChild(createEl("div", "phase", normalizeText(item.phase, "Checkpoint")));
        top.appendChild(createEl("div", "time", normalizeText(item.time, "time pending")));
        card.appendChild(top);

        const pill = createEl("div", "checkpoint-status " + statusClass(item.status), statusLabel(item.status));
        card.appendChild(pill);
        card.appendChild(createEl("div", "checkpoint-text", normalizeText(item.key_finding, "No key finding recorded.")));
        card.appendChild(createEl("div", "checkpoint-next", "Next: " + normalizeText(item.next_action, "No next action recorded.")));

        if (item.blockers && !/^none$/i.test(item.blockers.trim())) {
          card.appendChild(createEl("div", "checkpoint-next", "Blockers: " + item.blockers));
        }

        timeline.appendChild(card);
      });
    }

    function setList(target, items, emptyText) {
      target.textContent = "";
      const list = items && items.length ? items : [emptyText];
      list.forEach((item) => {
        target.appendChild(createEl("li", item === emptyText ? "health-empty" : "", item));
      });
    }

    function proofSummary(label, info) {
      const state = info && info.state ? info.state : "missing";
      const size = info && info.size ? " · " + Math.round(info.size / 1024) + " KB" : "";
      return label + ": " + state + size;
    }

    function repoHealthItems(latest, meta) {
      return [
        "Branch: " + normalizeText(meta && meta.branch, "unknown"),
        "Feed: " + normalizeText(meta && meta.feedFile, ".agent-feed/live.md"),
        "Latest checkpoint: " + normalizeText(meta && meta.latestCheckpointTime, "waiting for checkpoint"),
        "Current status: " + statusLabel(latest && latest.status),
        proofSummary("Screenshot proof", meta && meta.screenshot),
        proofSummary("Video proof", meta && meta.video),
      ];
    }

    function verificationItems(latest, meta) {
      const status = statusLabel(latest && latest.status);
      const commands = splitItems(latest && latest.commands_run, "No commands recorded yet")
        .filter((cmd) => /tsc|test|check|lint|pass|verify|validation/i.test(cmd));
      const items = ["Status: " + status];
      if (latest && latest.time) items.push("Latest checkpoint: " + latest.time);
      items.push(proofSummary("Screenshot proof", meta && meta.screenshot));
      items.push(proofSummary("Video proof", meta && meta.video));
      commands.forEach((cmd) => items.push(cmd));
      return items;
    }

    function renderHealth(checkpoints, meta) {
      const latest = checkpoints.length ? checkpoints[checkpoints.length - 1] : {};
      const status = statusLabel(latest.status);
      healthStatus.textContent = status;
      statusBadge.textContent = status;
      statusBadge.className = "status-badge " + statusClass(latest.status || "Live");

      setList(repoList, repoHealthItems(latest, meta), "Repo status pending");
      setList(commandsList, splitItems(latest.commands_run, "No commands recorded yet"), "No commands recorded yet");
      setList(blockersList, splitItems(latest.blockers, "No blockers reported"), "No blockers reported");
      setList(touchedList, splitItems(latest.touched_files, "No touched files yet"), "No touched files yet");
      setList(verificationList, verificationItems(latest, meta), "Verification pending");
    }

    function stamp(info) {
      return info && info.exists ? String(info.mtimeMs || Date.now()) : "";
    }

    function proofEmptyText(kind, info) {
      const state = info && info.state ? info.state : "missing";
      if (state === "invalid") {
        return {
          title: kind === "screenshot" ? "Screenshot file is not a valid PNG." : "Video file is not a valid MP4.",
          copy: "Replace the proof file using the command below and AgentRoom will refresh automatically.",
        };
      }
      return {
        title: kind === "screenshot" ? "Waiting for simulator screenshot..." : "Waiting for demo video...",
        copy: kind === "screenshot"
          ? "Run the screenshot command below and AgentRoom will refresh this panel automatically."
          : "Record to the absolute video path below and AgentRoom will refresh this panel automatically.",
      };
    }

    function setProofLabel(target, label, info) {
      const state = info && info.state ? info.state : "missing";
      target.dataset.state = state;
      target.textContent = label + " · " + state;
    }

    function setProof(meta) {
      setProofLabel(screenshotLabel, "Screenshot", meta.screenshot);
      setProofLabel(videoLabel, "Video", meta.video);

      const nextScreenshotStamp = meta.screenshot && meta.screenshot.state !== "invalid" ? stamp(meta.screenshot) : "";
      if (nextScreenshotStamp) {
        screenshot.classList.remove("hidden");
        screenshotEmpty.classList.add("hidden");
        if (nextScreenshotStamp !== screenshotStamp) {
          screenshotStamp = nextScreenshotStamp;
          screenshot.src = "/proof/screenshot?t=" + encodeURIComponent(nextScreenshotStamp);
        }
      } else {
        screenshot.classList.add("hidden");
        screenshotEmpty.classList.remove("hidden");
        screenshot.removeAttribute("src");
        const text = proofEmptyText("screenshot", meta.screenshot);
        screenshotEmptyTitle.textContent = text.title;
        screenshotEmptyCopy.textContent = text.copy;
        screenshotStamp = "";
      }

      const nextVideoStamp = meta.video && meta.video.state !== "invalid" ? stamp(meta.video) : "";
      if (nextVideoStamp) {
        video.classList.remove("hidden");
        videoEmpty.classList.add("hidden");
        if (nextVideoStamp !== videoStamp) {
          videoStamp = nextVideoStamp;
          video.src = "/proof/video?t=" + encodeURIComponent(nextVideoStamp);
          video.load();
        }
      } else {
        video.classList.add("hidden");
        videoEmpty.classList.remove("hidden");
        video.removeAttribute("src");
        const text = proofEmptyText("video", meta.video);
        videoEmptyTitle.textContent = text.title;
        videoEmptyCopy.textContent = text.copy;
        videoStamp = "";
      }
    }

    function render(payload) {
      const content = payload.content || "";
      const checkpoints = parseCheckpoints(content);

      mode.textContent = payload.meta.mode || "external live-feed";
      repo.textContent = payload.meta.repo || "unknown";
      branch.textContent = payload.meta.branch || "unknown";
      checkpoint.textContent = payload.meta.latestCheckpointTime || "waiting for checkpoint";
      feedFile.textContent = payload.meta.feedFile || ".agent-feed/live.md";

      renderTimeline(checkpoints, content);
      renderHealth(checkpoints, payload.meta);
      setProof(payload.meta);
    }

    async function refreshSnapshot() {
      const response = await fetch("/snapshot?agent=" + encodeURIComponent(activeAgent), { cache: "no-store" });
      render(await response.json());
    }

    function connectEvents() {
      if (eventSource) eventSource.close();
      eventSource = new EventSource("/events?agent=" + encodeURIComponent(activeAgent));
      eventSource.onopen = () => {
        if (!statusBadge.textContent || statusBadge.textContent === "Connecting") {
          statusBadge.textContent = "Live";
        }
      };
      eventSource.onmessage = (event) => {
        try {
          render(JSON.parse(event.data));
        } catch {
          rawFeed.textContent = event.data;
        }
      };
      eventSource.onerror = () => {
        if (!/blocked|paused|verified/i.test(statusBadge.textContent)) {
          statusBadge.textContent = "Paused";
          statusBadge.className = "status-badge status-paused";
        }
      };
    }

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        activeAgent = tab.dataset.agent || "main";
        tabs.forEach((item) => item.classList.toggle("active", item === tab));
        connectEvents();
        refreshSnapshot().catch(() => {});
      });
    });

    rawToggle.addEventListener("click", () => {
      feedScroll.classList.toggle("show-raw");
      rawToggle.textContent = feedScroll.classList.contains("show-raw") ? "Parsed cards" : "Raw feed";
    });

    copyProof.addEventListener("click", async () => {
      const text = proofCommands.textContent.trim();
      try {
        await navigator.clipboard.writeText(text);
        copyProof.textContent = "Copied";
        setTimeout(() => {
          copyProof.textContent = "Copy proof commands";
        }, 1400);
      } catch {
        copyProof.textContent = "Copy failed";
      }
    });

    connectEvents();
    refreshSnapshot().catch(() => {
      rawFeed.textContent = "Dashboard could not load the first snapshot.";
    });

    setInterval(() => {
      refreshSnapshot().catch(() => {});
    }, 3000);
  </script>
</body>
</html>`);
});

app.get("/snapshot", (req, res) => {
  sendNoStore(res);
  res.json(snapshot(req.query.agent));
});

app.get("/proof/screenshot", (req, res) => {
  sendNoStore(res);
  const info = proofInfo("screenshot");
  if (info.state === "missing" || info.state === "invalid") {
    sendProofError(res, info, "simulator screenshot");
    return;
  }
  res.type(info.contentType);
  res.setHeader("X-AgentRoom-Proof-State", info.state);
  res.sendFile(info.path, { dotfiles: "allow" });
});

app.get("/proof/video", (req, res) => {
  sendNoStore(res);
  const info = proofInfo("video");
  if (info.state === "missing" || info.state === "invalid") {
    sendProofError(res, info, "demo video");
    return;
  }
  res.type(info.contentType);
  res.setHeader("X-AgentRoom-Proof-State", info.state);
  res.sendFile(info.path, { dotfiles: "allow" });
});

app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = () => {
    res.write(`data: ${JSON.stringify(snapshot(req.query.agent))}\n\n`);
  };

  send();

  const watchTargets = [
    feedDir,
    screenshotsDir,
    videosDir,
    ...Object.values(feedFiles).flatMap((feed) => [feed.primary, feed.fallback].filter(Boolean)),
    screenshotPath,
    videoPath,
  ];

  const watcher = chokidar.watch(watchTargets, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  });

  watcher.on("add", send);
  watcher.on("change", send);
  watcher.on("unlink", send);

  const keepAlive = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 15000);

  req.on("close", () => {
    clearInterval(keepAlive);
    watcher.close();
  });
});

app.listen(PORT, () => {
  console.log(`AgentRoom running at http://localhost:${PORT}`);
  console.log(`Watching feed directory: ${feedDir}`);
  console.log(`Watching screenshot: ${screenshotPath}`);
  console.log(`Watching video: ${videoPath}`);
});
