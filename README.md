# Fourth & Forever

An original, free single-player football franchise game. No account, paid API, external assets, dependencies, or backend.

## Play

**Open `dist/Fourth-and-Forever.html` in a modern desktop browser.** It is a self-contained game and needs no server or internet connection. Keep using the same browser and file location for your saves. If your browser restricts storage for local files, use the local web option below or export backups.

For development, from this directory:

```sh
npm start
```

Open http://localhost:4173. This uses Python 3's static file server. Alternatively run `python3 -m http.server 4173` directly. No installation is needed.

```sh
npm test       # 20 seasons, franchise invariants, football engine, playable games, malformed saves
npm run check  # JavaScript syntax checks
npm run build  # regenerate standalone HTML after edits
```

Node 20+ is sufficient for build/tests. The browser game itself does not require Node or Python.

## Controls

Every down: pick a play from the playbook (Coach picks, Run, Quick, Deep, Trick, Special), read the defense, snap. The whole game can be played from the keyboard.

| Action | Keyboard | Touch |
|---|---|---|
| Call a play or a defense | 1–9 picks a card, ←/→ changes tab, 0 sims a defensive drive | Tap a card |
| Move quarterback / ball carrier / your defender | WASD or arrows | Left stick |
| Snap, skip a result, stop the kick meter | Space | SNAP / tap the field |
| Sprint with whoever you control: quarterback, runner, receiver or defender (limited stamina) | Hold Space | Hold SPRINT |
| Pass, led to a receiver | Press 1–5 to see the aim point and miss radius, press it again to throw (hold the second press to lob). The pause menu can switch number keys to throw at once | Tap or hold the numbered target |
| Pass, free aim | Move the mouse to any spot (the preview shows who can get there and the miss radius), click to throw, hold to lob | Tap or hold a spot on the field |
| Juke | Shift or J | JUKE |
| Throw the ball away | Q or X | — |
| Switch to the defender nearest the ball | E or Tab | SWITCH |
| Flip the play at the line | F | Flip |
| Timeout (cancels the clock runoff) | T | Timeout |
| Pause: box score and drives, coach mode, auto-sim defense, how to play, exit | Escape or P | II |

- Receiver targets are ringed green (open), yellow (tight) or red (covered). The ball is led along the route; a lob goes over underneath defenders, a bullet gets there before the safety.
- The quarterback takes his drop on his own until you move him. A runner or a receiver after the catch keeps running on his own until you steer, so you never stand still while your hands are on the number keys.
- How a pass is decided: it depends on who has position when the ball arrives, and the label on the field says which case it was.
  - Defender in front of the receiver (between him and the passer) and closer to the ball: he undercuts it. Usually broken up, sometimes intercepted, rarely caught.
  - Defender level with the receiver: a contested catch decided by contested-catching against coverage.
  - Defender behind the receiver: he cannot reach a bullet. It is caught unless he arrives hard enough to jar it loose, and it is never intercepted.
  - A lob can be played from behind, so a deep defender on top of the route is in position.
  - A defender who steps into the throwing lane on the way tips it; the closer to the catch point, the more surely.
- Receivers with a ★ are elite route runners: they sell double moves against man, sit down in the hole against zone and work open when you scramble.
- Calling the same play repeatedly is punished: the defense reacts faster to a play it has seen, zone defenders break to where the route is going, and the CPU leans toward the coverage that beats what you keep calling. The pre-snap banner warns you when a play has been recognised.
- Before the snap the banner gives a coordinator's read of the look (safeties deep, men in the box, a creeping linebacker); it is hidden on Expert. A red ! marks a rusher who has come free.
- The Special tab has field goal, punt, kneel (burn clock) and spike (stop clock).
- On defense you call the coverage. Your highlighted defender's zone or man is drawn on the field; he plays it himself whenever you let go of the stick. "Sim this drive" resolves the possession instantly with the same engine.
- Coach mode (pause menu): you call every play and the AI executes it.
- After a touchdown choose the extra point or a two-point try. Field goals use a timing meter.

Finish the game and choose Return to franchise to save its result. In-progress field action is not saved; the franchise remains at its pregame state if you close the browser midgame.

## Franchise features

- 32 fictional clubs, two conferences, eight divisions; any team is selectable.
- Seeded players/universes, 53-player opening-day rosters across 17 positions, selectable starters, injury replacements, portraits and player cards.
- 17 games across 18 weeks with one bye, balanced 8/9 home dates, seven playoff seeds per conference and one championship.
- Playable 11-on-11 football on both sides of the ball: five formations, 21 plays built from a 20-route tree, seven defensive calls (Cover 2/3/4, man, blitzes, run stuff) with readable and sometimes disguised shells, momentum-based movement, pursuit angles, block engagements, a collapsing pocket, designed run holes with pulling and lead blockers, play-action, screens, audibles, timeouts, two-point tries, a field-goal meter, fatigue-driven running back rotation, quarters and sudden-death overtime.
- Real box scores from played games: every passing, rushing, receiving and defensive line and every drive comes from what happened on the field.
- Whole-game/week/season simulation; positional attributes, matchups, coaches, schemes, fatigue, injuries and home advantage influence outcomes.
- Recurring offseasons: retirements, contract expirations, free agency, scouting, seven-round 224-pick drafts with 300 prospects, undrafted players and camp.
- Imperfect scouting grades, combine measurements, evaluations, interviews, workouts, team needs and different draft-class strengths.
- Salaries, signing bonuses, dead cap, extensions, releases, CPU free agency, player/current/future-pick trades and incoming CPU offers.
- Head/offensive/defensive coaches, scheme selection, training focus, noisy development, physical decline, breakout chances and hidden potential.
- Season/career player statistics, game boxes, standings, champions, awards, single-season records, Hall of Fame and league news.
- Three IndexedDB save slots, autosave, portable JSON export/import with structural validation. No cloud uploads.

## Architecture

- `engine.js`: serializable, deterministic league state and headless franchise/simulation rules. No UI dependency.
- `football.js`: headless on-field football. Formations, playbook, coverage calls, player AI, physics, rules, clock and per-player stats. No DOM; the same code runs user plays, CPU plays, simmed drives and tests.
- `game.js`: Canvas rendering, play-call UI, keyboard/touch input and procedural audio for `football.js`.
- `app.js` / `style.css`: responsive menus, player cards, transitions and IndexedDB saves.
- `validation.js`: import boundary validation.
- `scripts/build.mjs`: dependency-free packaging into one offline HTML file.
- `tests/`: repeatable franchise, football-engine, interface and save-validation checks.
- `scripts/balance.mjs`, `scripts/plays.mjs`: AI-vs-AI batches that print league-wide and per-play rates for tuning (`node scripts/balance.mjs 100`).
- `scripts/humanbot.mjs`: plays the user's side through the real input path with human-like reaction limits (`node scripts/humanbot.mjs 40 novice|average|sharp`) to check that the game is fair to a person, not just to the AI.

## Intentional simplifications

On the field: no penalties, challenges or injuries during a live game (injuries are rolled when the result is recorded). Kickoffs are touchbacks and punts and turnovers use an abstract return. Games are four 4:00 quarters with a 22-second runoff between in-bounds plays, which gives each team roughly 30 plays; overtime is sudden death. Simulated (not played) games still generate scores and statistical boxes without simulating every snap, and average a few more points than played games.

Off the field: schedule opponents rotate rather than using professional-league division rematches. Camp fills positional vacancies and automatically cuts rosters to 53, including the user's roster. Free agency resolves through offer thresholds and CPU market activity rather than a live multi-day auction. Staff replacements are generated hires. No compensatory picks, practice squads, custom expansion teams or multiplayer.

Roster management and trades are available throughout most phases; the rules simplify real professional transaction calendars. Browser storage can be cleared by browser settings, so export important franchises periodically. Saves on localhost, 127.0.0.1 and a local file are separate browser origins; use export/import to move between them.
