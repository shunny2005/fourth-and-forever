# Status — 2026-10-02

Runnable original game delivered as dist/Fourth-and-Forever.html and modular development source. Product brief: docs/PROJECT_PROMPT.md.

## Gameplay v2 (2026-10-02)

The on-field game was rebuilt after the owner reported v1 was not fun (plan: docs/plans/completed/gameplay-v2.md).

VERIFIED
- `npm test`, `npm run check`, `npm run build` (standalone HTML includes football.js).
- AI-vs-AI batches (`node scripts/balance.mjs 100`) finish every game; current rates are in the human-perspective section below.
- Browser, desktop 800x600: quick play; called pass, run and kick plays; snapped, threw, handed off, punted; called a defense and watched the CPU drive; simmed a drive; a full franchise game in coach mode with auto-sim defense finished 21-18 and saved real player lines, 15 drives, the win and the coach/sim settings to IndexedDB.
- Browser, 375x812 emulation: play-call sheet, pre-snap and live layouts render without overlap.

Human-perspective pass (later on 2026-10-02)
- `scripts/humanbot.mjs` drives the user's inputs with reaction delays. Before fixes it was sacked on 18-30% of dropbacks and the coordinator suggested the same three plays all game. Causes found and fixed: pass blockers stepped forward and let blitzers run past, the line blocked blitzers before down linemen, backs never picked up a free rusher, and suggestions were ranked by a static score.
- After fixes (40 games each): novice 15 wins, 14.3 points, 12.6% sacked; average 22 wins, 18.7 points, 8.5% sacked; sharp 25 wins, 20.7 points, 3.2% sacked. AI-vs-AI: 16.7 points/team, 66% completions, 4.5 yards/carry.
- Added: keyboard play-calling, kneel and spike, pause-menu box score and drive log, quarter/halftime/overtime notices, pre-snap reads, defender assignment overlay, free-rusher marker, pass-result animations, two-press aimed throws, player of the game. `npm test` 18/18.
- Browser: keyboard play call, pre-snap read text, special tab, pause menu and box score, defensive assignment overlay, aim preview and the tipped-pass animation were seen working.

Owner feedback pass 2 (2026-10-02): catch logic unclear, no yards after catch, Four Verticals farmable, sprint not universal, wants route craft and a throwing alternative.
- Cause of "no YAC": after a catch the receiver was under user control with no input, so he stood still. Runners and receivers now keep running until steered.
- Pass arrival is decided by position (in front / level / behind, bullet vs lob) and every outcome is labelled with the reason.
- Spamming one play (sharp bot, 30 games): Four Verticals 13.3 -> 12.1 yards/attempt with 8.5% interceptions and 13 wins; Stick 29.6 -> 20.3 points; Flood 31.8 -> 20.0 points. Normal mixed play-calling scores about 21.
- Added free-aim throws (mouse or tap a spot), optional one-press number throws, sprint for defenders, elite route craft, play recognition. `npm test` 20/20.

INFERRED / UNVERIFIED
- Broken-up, intercepted, dropped and overthrown animations, the halftime/quarter notices and the free-rusher marker are covered by engine tests for the underlying events but were not seen on screen.
- Feel of manual control at 60 fps: the automation pane throttled animation frames, so movement was verified with a timer-driven loop and by headless tests, not by hand at full frame rate.
- Real phone hardware and audio output were not tested.
- Human scoring is expected to exceed the AI-vs-AI 15 points/team; not measured.

## Verified earlier (2026-10-01)

- 20-season simulation, 20 champions, 19 full offseason drafts of 224 picks each; mean simulated scoring 25.04 points per team/game; legal CPU rosters/caps, trades, contracts, aging, deterministic generation and save continuation.
- Save schema tests reject malformed imports before replacement. Browser reload resumed the exact draft pick via IndexedDB.

## Known gaps

- `pwa.js` registers `sw.js`, which does not exist; the browser logs a failed fetch. Gameplay is unaffected.
- Simulated league games (engine.js) and played games (football.js) use different models, so simulated scores run higher than played ones.
- See README for intentional simplifications.
