# AgentRoom

AgentRoom is a local mission-control dashboard for AI coding agents. It watches local feed files and turns agent activity into visible checkpoints, commands run, files touched, blockers, validation status, and screenshot/video proof.

## Why It Exists

AI coding agents often work invisibly and return with vague claims. AgentRoom gives that work a local control room so you can see:

- what each agent is doing
- which files it inspected or touched
- what commands it ran
- what passed, failed, or blocked progress
- whether there is screenshot or video proof

## Quick Start

```bash
npm install
npm start
```

Then open:

```text
http://localhost:4545
```

AgentRoom reads from the repo-local `.agent-feed` directory.

## Feed Format

Agents should append checkpoint blocks to `.agent-feed/live.md` or a per-agent file such as `.agent-feed/agent-a.md`.

```md
## LIVE FEED CHECKPOINT
Time:
Agent:
Phase:
Status:
Files inspected:
Commands run:
Touched files:
Key finding:
Blockers:
Next action:
```

## Proof Files

AgentRoom displays:

- `.agent-feed/screenshots/latest.png`
- `.agent-feed/videos/latest.mp4`

Use repo-local `$PWD` paths so the commands work on any machine:

```bash
xcrun simctl io booted screenshot "$PWD/.agent-feed/screenshots/latest.png"
xcrun simctl io booted recordVideo "$PWD/.agent-feed/videos/latest.mp4"
```

## Safety Note

AgentRoom is a local dashboard. It reads local feed/proof files and serves them in your browser. It does not execute agent code, deploy projects, modify databases, or push to GitHub.

Keep secrets, env files, credentials, and private screenshots out of `.agent-feed` before publishing or sharing a repo.

## Roadmap

- Per-agent proof folders
- Run history and archived sessions
- Search and filters for checkpoints
- Merge-readiness summaries
- Command allowlists for proof capture
- Native macOS AgentRoom after the web workflow stabilizes
