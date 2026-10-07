# Fourth & Forever

Build a free offline-capable franchise football game with original branding.

- [x] Headless seeded league/franchise engine and 20-season invariant tests.
- [x] Canvas playable offense with simulated defense and complete game rules.
- [x] Responsive franchise UI: roster, player cards, depth, standings, schedule, stats, scouting, draft, contracts, trades, coaches, history.
- [x] Multiple local saves, export/import, recovery and autosave.
- [x] Integrate, exercise browser workflows, balance, document verified result.

Architecture: dependency-free ES modules; engine.js owns serializable domain state, game.js owns live football, app.js owns UI and persistence. Static hosting only; no runtime network or account.

Evidence: npm test covers 20 seasons and six complete playable games; actual browser exercised season/playoffs/offseason/scouting/all seven draft rounds/camp/new season and reload persistence. Standalone bundle rendered in browser. See docs/STATUS.md for scope and limitations.
