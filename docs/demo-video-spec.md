# Demo Video Spec — Agent Room

Phase 5.8 spec for the agentroom.app launch / Anthropic FDE submission demo.

## Goals

- Convey in <90 seconds that Agent Room gives AI agents a real cloud desktop and ships work end-to-end.
- Make the viewer want to type their first prompt at agentroom.app.
- Be reusable: hero on the marketing page, social posts, FDE application packet.

## Top-line spec

| Field             | Value                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------- |
| Target length     | 75 seconds (hard ceiling 80s; 60s social cut required as B-deliverable)               |
| Tone              | Confident, fast, real. Linear/Cursor cadence. No marketing puffery, no hedging.        |
| Music             | Driving, mid-tempo, sub-bass + sparse synth. Drop on Shot 03 reveal.                   |
| Voiceover        | Yes. Single voice, calm and direct. Recorded separately to a quiet room mic.          |
| Captions          | Yes. Burned-in, white text + 60% black plate, bottom third, max 7 words/line.         |
| Aspect — primary  | 16:9, 1920×1080, 60 fps                                                                |
| Aspect — secondary| 9:16, 1080×1920, 60 fps for X / LinkedIn / TikTok / Reels                              |
| File format       | H.264 MP4, AAC stereo 192 kbps. Loudness target -16 LUFS integrated, true peak -1 dBFS|
| Subtitles file    | Side-car `.srt` for YouTube and accessibility                                          |

## Music — three royalty-free options

1. **Epidemic Sound** — "Building a New World" by Anbr (mid-tempo, 110 BPM, synth pad + soft pulse). Use the 75s edit; drop the kick at 0:12 to land on the desktop reveal.
2. **Artlist** — "Future Disruption" by Stereo Jam (electronic, 100 BPM, builds across 60s). Trim the intro 4 bars; loop tail two beats to fit 75s.
3. **YouTube Audio Library** — "Patience" by Density & Time (ambient electronic, free, no attribution required). Less premium feel; use as the safe fallback.

Default pick: option 1. Backup: option 3 if license budget is zero.

## Distribution

- agentroom.app hero — autoplay muted, loop, with a "Watch with sound" button that swaps to the captioned 16:9 cut.
- X / LinkedIn — 9:16 60s social cut, captions burned in, no audio assumed.
- YouTube — full 75s 16:9 with captions and `.srt`.
- Anthropic FDE submission — full 75s 16:9 plus a written 150-word voiceover transcript (`docs/demo-video-narration.md`).

## Tooling — hybrid

- **Remotion** for the two title cards (Shot 01, Shot 08), the lower-third overlays, the run-status pill animation, and any inter-shot transitions.
- **Real screen recordings** for everything inside the product (Shots 02–07). No fake UI.
- **DaVinci Resolve** (or Final Cut) for the final assembly, color, audio mix, and subtitle burn-in.
- **Whisper** for first-pass captions, hand-corrected against the narration script.

## Recording setup — appendix

- **Browser**: Google Chrome, Incognito window, no extensions, no profile, 1920×1080 viewport, page zoom 150%. Verify with DevTools that `window.devicePixelRatio === 2`.
- **Recorder**: QuickTime Player screen recording at 60 fps, or Loom Pro 1080p. Crop to the Chrome content rect on export.
- **Cursor**: macOS System Settings → Accessibility → Display → Pointer size set to 2.5x ("Big Cursor"). Disable shake-to-find.
- **Keystrokes**: KeyCastr, "Default" theme, anchored bottom-right, font size 18, fade after 1.2s. Disable for any password / email entry.
- **Audio**: separate take in QuickTime via a USB condenser mic (Shure MV7 or similar). Treat the room: rug, blanket on monitor, mic 6 inches off-axis. Record dry, no plug-ins.
- **Test account**: pre-seed `cypheros.ai+demo@gmail.com` with a $20 Stripe test top-up. Run three successful sandbox runs the day before so the dashboard, `/runs`, and Activity drawer have real history visible in passing shots. Set the display name to "Agent Room Demo".
- **Network**: hardwired ethernet. Disable VPN, Bluetooth, Time Machine, Dropbox, anything that pings.
- **Notifications**: macOS Focus → Do Not Disturb. Hide the dock. Hide the menu bar via Bartender.
- **Browser chrome**: bookmark bar off, no other tabs, no devtools open.
- **Timing**: shoot each shot three times. Pick the take with the cleanest cursor path.

## Success criteria

- A first-time viewer can paraphrase what Agent Room does after one watch.
- The product footage looks fast — no spinner takes more than 1.5s of screen time.
- The 9:16 cut still makes sense without sound.

## Out of scope

- No customer testimonials this round.
- No founder face cam.
- No pricing breakdown beyond the brief Build Pack hover in Shot 07.
