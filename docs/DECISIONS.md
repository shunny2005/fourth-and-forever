# Decisions

- Use dependency-free ES modules and Canvas to provide a completely free, portable game without installation or network dependencies.
- Package a standalone HTML artifact as the primary launch path; keep separate source modules for testing and maintenance.
- Keep franchise state serializable and separate from real-time gameplay. Seeded generation and simulated franchise actions use a stored PRNG state.
- Use IndexedDB rather than localStorage: review measured over 12 MB of raw state after 20 seasons, exceeding common localStorage quotas. Export/import remains the portable backup path.
- 2026-10-02: Replace the v1 live game with a headless football engine (`football.js`) plus a thin Canvas/input layer (`game.js`). Evidence: v1 resolved catches, tackles and whole defensive drives with dice rolls and gave every receiver the same route, which the owner found not fun. Rejected a Phaser/TypeScript migration: no gameplay benefit and it would break the zero-dependency single-file build.
- 2026-10-02: Defense is playable but optional. The user calls coverage and may steer one defender; untouched, the AI plays him. "Sim this drive" and the auto-sim setting run the same engine headlessly, so there is one football model on the field.
- 2026-10-02: Difficulty scales CPU reaction time, coverage disguise, play-call adaptation and AI quarterback decision noise, never ratings.
- 2026-10-02: Game length is four 4:00 quarters with a 22-second runoff (about 30 plays per team) to keep a played game near ten minutes. Per-play rates are tuned to realistic values, so played games score lower than a 60-minute game; accepted over inflating efficiency.
- Expose intentional simplifications in README rather than presenting them as full professional-league rules.
