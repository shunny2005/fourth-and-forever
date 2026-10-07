// Headless AI-vs-AI batch: prints league-wide gameplay rates for tuning.
import { createLeague, roster } from '../engine.js';
import { createMatch } from '../football.js';
const games = Number(process.argv[2] || 60), league = createLeague(7);
let seed = 99; const rng = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const T = { pts: 0, att: 0, cmp: 0, py: 0, ptd: 0, int: 0, ra: 0, ry: 0, rtd: 0, sacks: 0, plays: 0, fum: 0, drives: 0, ot: 0, max: 0, shut: 0 }, results = {};
const t0 = Date.now();
for (let g = 0; g < games; g++) {
  const h = g % 32, a = (g * 7 + 3) % 32 === h ? (h + 1) % 32 : (g * 7 + 3) % 32;
  const m = createMatch({ home: league.teams[h], away: league.teams[a], homeRoster: roster(league, h), awayRoster: roster(league, a), rng, difficulty: 'pro' });
  const r = m.simGame();
  if (m.phase !== 'final') throw new Error('game did not finish');
  T.pts += r.homeScore + r.awayScore; T.max = Math.max(T.max, r.homeScore, r.awayScore); if (!r.homeScore || !r.awayScore) T.shut++;
  if (m.quarter > 4) T.ot++;
  for (const l of Object.values(r.playerStats)) { T.att += l.passAttempts; T.cmp += l.completions; T.py += l.passYards; T.ptd += l.passTD; T.int += l.interceptions; T.ra += l.rushAttempts; T.ry += l.rushYards; T.rtd += l.rushTD; T.sacks += l.sacks; T.fum += l.forcedFumbles; }
  for (const s of ['home', 'away']) T.plays += r.teamStats[s].plays;
  T.drives += r.drives.length;
  for (const d of r.drives) results[d.result] = (results[d.result] || 0) + 1;
}
const n = games * 2, f = x => x.toFixed(2);
console.log(`${games} games in ${Date.now() - t0}ms`);
console.log(`pts/team ${f(T.pts / n)} (max ${T.max}, shutouts ${T.shut}, OT ${T.ot})  plays/team ${f(T.plays / n)}  drives/team ${f(T.drives / n)}`);
console.log(`pass: ${f(T.att / n)} att, ${f(100 * T.cmp / T.att)}% cmp, ${f(T.py / T.att)} y/att, ${f(T.py / n)} yds, TD ${f(T.ptd / n)}, INT ${f(100 * T.int / T.att)}%, sack ${f(100 * T.sacks / (T.att + T.sacks))}%`);
console.log(`rush: ${f(T.ra / n)} att, ${f(T.ry / T.ra)} y/att, ${f(T.ry / n)} yds, TD ${f(T.rtd / n)}, forced fumbles/team ${f(T.fum / n)}`);
console.log('drives', results);
