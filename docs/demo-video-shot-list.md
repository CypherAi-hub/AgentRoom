# Demo Video Shot List — Agent Room

Eight shots, 75 seconds total. Times are inclusive of transitions. URLs are production (`https://www.agentroom.app`). Test mode for Stripe. Pre-seed test account with three successful runs visible in the passing dashboard.

---

## Shot 01 — Title card "Agent Room"

- **Time**: 0:00 – 0:05 (5.0s)
- **Source**: Remotion title card
- **URL**: n/a
- **Action**: Black hold (0.4s) → fade in wordmark "Agent Room" centered, then tagline "Give your agents a real desktop." appears 0.6s later, one line below, 60% opacity.
- **Text overlay**: "Agent Room" 96pt, Inter 600. Tagline 28pt, Inter 400, color `#A3A3A3`.
- **Motion**: Wordmark fade-in 0.5s ease-out. Tagline fades + slides up 8px, 0.4s ease-out. Hold 2.5s. Cross-dissolve to Shot 02 over 0.4s.
- **Audio**: Music starts at 0:00 quiet, no kick yet.

## Shot 02 — Type a task in the sandbox prompt

- **Time**: 0:05 – 0:12 (7.0s)
- **Source**: real screen recording
- **URL**: `https://www.agentroom.app/dev/sandbox-test`
- **Action**: Cursor moves into the prompt textarea, types the task `Open Wikipedia, find the page on cloud computing, copy the first paragraph into a new TextEdit document, and save it as cloud.txt.` at ~30 char/s. Cursor moves to the "Start Agent" button, hovers (button glow), clicks.
- **Text overlay**: lower-third "Start with a sentence." 36pt Inter 600, white on 60% black plate, anchored bottom-left at 0:06.5, exits at 0:11.5.
- **Motion**: Static frame. Subtle Ken Burns zoom-in 4% across the shot to keep energy.
- **Transition**: Hard cut to Shot 03 on the click.
- **Audio**: Music kick drops on the click.

## Shot 03 — VM viewport comes alive

- **Time**: 0:12 – 0:25 (13.0s)
- **Source**: real screen recording
- **URL**: `https://www.agentroom.app/dev/sandbox-test` (same page, focus on the VM iframe)
- **Action**: Status pill flips `STARTING → READY → RUNNING`. The desktop appears in the noVNC iframe. The agent's mouse cursor moves, opens Firefox, types `wikipedia.org/wiki/Cloud_computing`, presses Enter. Page renders.
- **Text overlay**: "A real cloud desktop." top-center, 32pt, fades in at 0:13, fades out at 0:17.
- **Motion**: Zoom from full-page framing into the iframe rect over 0:12–0:14 (1.5s ease-out, 1.0× → 1.4×). Hold zoomed.
- **Transition**: 0.3s cross-dissolve to Shot 04.
- **Audio**: Music drives. UI click SFX on the agent's first action (subtle, -18 dB).

## Shot 04 — Activity drawer streaming tool_use events

- **Time**: 0:25 – 0:35 (10.0s)
- **Source**: real screen recording
- **URL**: `https://www.agentroom.app/dev/sandbox-test` (Activity drawer in focus)
- **Action**: Camera moves to the right rail. Tool-use events stream in: `screenshot`, `mouse_move (820, 410)`, `left_click`, `type "cloud computing"`, `key "Return"`, `screenshot`. Each event lights up green for 200ms as it lands.
- **Text overlay**: "See every step." 36pt, bottom-right plate, 0:26 → 0:31.
- **Motion**: Pan-and-zoom from iframe to drawer over 0:25–0:26.5 (1.5s). Hold. Slight scroll auto-tracks the latest event.
- **Transition**: Hard cut to Shot 05.
- **Audio**: Tiny synth blip per event landing, -22 dB, sidechained under the music.

## Shot 05 — Task completes

- **Time**: 0:35 – 0:45 (10.0s)
- **Source**: real screen recording
- **URL**: `https://www.agentroom.app/dev/sandbox-test`
- **Action**: Final agent action saves `cloud.txt`. Status pill animates `RUNNING → DONE` (green). Final screenshot artifact appears in the activity feed; thumbnail expands to ~480px wide for 1.2s.
- **Text overlay**: "Done. Receipts included." 36pt center, 0:38 → 0:44.
- **Motion**: Pull back to full viewport at 0:35 (1.0s ease-in-out). Status pill scales 1.0 → 1.15 → 1.0 over 400ms when it flips. Screenshot artifact slides up 12px on enter.
- **Transition**: 0.4s cross-dissolve to Shot 06.
- **Audio**: Soft success chime on the DONE flip, -16 dB.

## Shot 06 — /runs timeline

- **Time**: 0:45 – 0:55 (10.0s)
- **Source**: real screen recording
- **URL**: `https://www.agentroom.app/runs` then `https://www.agentroom.app/runs/<run_id>`
- **Action**: Click sidebar `Runs`. Page loads with the just-completed run at the top. Click into it. Run detail page opens; cursor scrolls slowly through the timeline (start, 6 tool_use events, screenshot, done) over 5s.
- **Text overlay**: "Auditable by default." 36pt, bottom-left, 0:48 → 0:53.
- **Motion**: Static framing. Smooth programmatic scroll at 80 px/s.
- **Transition**: Hard cut to Shot 07.
- **Audio**: Music continues, no SFX.

## Shot 07 — /pricing, hover Build Pack

- **Time**: 0:55 – 1:05 (10.0s)
- **Source**: real screen recording
- **URL**: `https://www.agentroom.app/pricing`
- **Action**: Page loads. Cursor moves across all four plan cards (Free, Build Pack, Pro, Scale) — each lifts on hover. Settles on **Build Pack**. Clicks the CTA. Stripe Checkout (test mode) modal/page begins to load. Cut before payment fields appear.
- **Text overlay**: "Pay for runs, not seats." 36pt, top-right, 0:57 → 1:03.
- **Motion**: Static framing. Each hover triggers the existing card lift animation. No extra zoom.
- **Transition**: 0.3s dip-to-black to Shot 08.
- **Audio**: Music tail begins de-crescendo at 1:03.

## Shot 08 — Closing title card

- **Time**: 1:05 – 1:15 (10.0s)
- **Source**: Remotion title card
- **URL**: n/a
- **Action**: Black. "Stop watching screens." appears centered (32pt) at 1:05.5. After 1.2s, second line "Start shipping work." swaps in (same line, cross-fade). At 1:08, both fade and `agentroom.app` wordmark resolves at center, 64pt. CTA pill appears below: "Start your first run →" (24pt, green border `#3EE98C`, 60% fill, link to `https://www.agentroom.app/signup`).
- **Text overlay**: as above.
- **Motion**: Cross-fade swaps for the headline. Wordmark fades in 0.6s. CTA pill scales 0.96 → 1.0 + fades in 0.4s. Hold 4s. Fade to black 0.5s.
- **Audio**: Music resolves to the final downbeat at 1:14.5. Silence to 1:15.

---

## Total

8 shots × stated durations = 75.0 seconds.

## Asset checklist

- [ ] Three takes per product shot (02–07), best-take selection.
- [ ] Remotion project for Shots 01 and 08, exported as MOV ProRes 422 HQ.
- [ ] Voiceover stems from `docs/demo-video-narration.md`.
- [ ] Music stem with -16 LUFS pre-bake.
- [ ] Captions `.srt` file matching the narration.
- [ ] 9:16 reframe pass — re-shoot Shots 02–07 in portrait viewport, do NOT crop center.
