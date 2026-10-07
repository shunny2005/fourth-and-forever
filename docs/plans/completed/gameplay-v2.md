# Gameplay v2 — make the on-field game fun

Started 2026-10-02. Owner complaint: gameplay not fun, playcalling uninspiring, players/bots do not move realistically.

## Diagnosis of v1 (facts, from `game.js` at 92 lines)

| Problem | Evidence in v1 |
|---|---|
| No reads | All four receivers ran the same route; six plays, one formation. |
| No skill in passing | Press 1–4; catch = `0.56 + catching*0.004 - near*0.14` dice roll; INT = flat roll if a defender was near. |
| Unrealistic movement | Velocity set instantly toward target (no momentum/acceleration); defenders chased current position, not an intercept point; man coverage was a fixed 3.2-yard offset. |
| No line play | Blocking = stun nearest enemy on a timer. No pocket, no gaps, no blitz. |
| Defense not a game | One random number per opponent drive (34% TD). Ratings were averaged into one scalar. |
| Stats faked | Receiving shares were allocated 40/24/… from team totals; no defensive stats. |

## Research inputs

- Retro Bowl's appeal: short games, one aimed throw as the core skill, timing/receiver-choice reads, offense-only focus. (Guides surfaced by search; consistent with first-hand design knowledge.)
- Football AI practice (gamedev.net "American football AI", Madden gameplay notes): steering behaviours with momentum; pursuit by intercept angle; blockers stay between rusher and QB; zone defenders own a landmark and match threats inside it; coverage must be assigned per play call, not per defender, so the shell is coherent.

## Design decisions

1. **Headless football engine** `football.js` (no DOM): formations, playbook, AI, physics, rules, per-player stats. `game.js` becomes rendering/input/audio only. The same engine runs user plays, CPU plays, simmed drives and tests.
2. **Momentum movement**: every player accelerates toward a desired velocity; cuts cost speed; ratings map to top speed / acceleration / change of direction.
3. **Real play design**: 5 formations, ~20 plays with per-receiver routes from a route tree, run plays with a designed hole, pulling/lead blockers, play-action and screens.
4. **Coverage as a call**: Cover 1/0/2/3/4, fire-zone and run-stuff calls with man assignments, zone landmarks, shells you can read pre-snap; disguise frequency scales with difficulty.
5. **Spatial pass resolution**: lead throw along the route, bullet (tap) vs lob (hold), accuracy error from rating/pressure/moving; catch/breakup/INT decided by who is where when the ball arrives.
6. **Line play**: block engagements with shed hazard from ratings; pass pocket that collapses; run blocks that drive defenders away from the hole.
7. **Playable defense**: user picks the defensive call and may steer one defender (AI assists if untouched); "sim drive" runs the same engine instantly. No more coin-flip drives.
8. **Playcalling UI**: tabs, play-art thumbnails, coordinator suggestion, scheme-fit marks, flip, audible, timeouts, 2-pt choice, field-goal meter.
9. **Real box score**: per-player passing/rushing/receiving/defense lines and drive log for both teams go to `engine.recordPlayedGame`.
10. Difficulty changes CPU reaction, disguise, play-calling adaptation and AI QB decision noise — not ratings.

Rejected: Phaser/TypeScript migration (no gameplay benefit, breaks the zero-dependency single-file build); full 22-player manual control (brief forbids it).

## Verification

- Headless AI-vs-AI batch for balance: target ~58–68% completions, 6–8 yds/att, 3.8–4.8 yds/carry, sack 4–9%, INT 1.5–4%, 17–28 pts/team.
- `npm test`, `npm run check`, `npm run build`; browser play-through on desktop and 390×844.
