// Per-play diagnostics for tuning: outcomes by play and by defensive call.
import { createLeague, roster } from '../engine.js';
import { createMatch } from '../football.js';
const games = Number(process.argv[2] || 30), league = createLeague(7);
let seed = 5; const rng = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const by = {}, byD = {}, hist = {};
const rec = (map, key, last, m, yac) => { const r = map[key] ||= { n: 0, yds: 0, cmp: 0, inc: 0, int: 0, sack: 0, td: 0, yac: 0, t: 0, big: 0, loss: 0 }; r.n++; r.yds += last.gain; r.t += m.t; if (last.kind === 'incomplete') r.inc++; else if (last.kind === 'int') r.int++; else if (last.kind === 'sack') r.sack++; else { if (yac !== null) { r.cmp++; r.yac += yac; } } if (last.kind === 'td') r.td++; if (last.gain >= 20) r.big++; if (last.gain < 0) r.loss++; };
for (let g = 0; g < games; g++) {
  const h = g % 32, a = (g * 5 + 9) % 32 === h ? (h + 1) % 32 : (g * 5 + 9) % 32;
  const m = createMatch({ home: league.teams[h], away: league.teams[a], homeRoster: roster(league, h), awayRoster: roster(league, a), rng });
  for (let i = 0; i < 6000 && m.phase !== 'final'; i++) {
    const wasLive = m.phase === 'presnap', c0 = m;
    m.autoPhase();
    if (wasLive && m.phase === 'dead' && m.last.kind !== 'special') {
      const c = m.carrier, yac = m.play.type !== 'run' && c && c !== m.qb && c.caughtAt !== undefined ? (m.last.kind === 'td' ? 100 : c.x) - c.caughtAt : null;
      rec(by, m.play.id, m.last, m, yac); rec(byD, m.dcall.id, m.last, m, yac); rec(byD, m.play.type, m.last, m, yac);
      const b = Math.max(-5, Math.min(40, Math.floor(m.last.gain / 5) * 5)); (hist[m.play.type] ||= {})[b] = (hist[m.play.type][b] || 0) + 1;
    }
  }
}
const show = map => console.table(Object.fromEntries(Object.entries(map).map(([k, r]) => [k, { n: r.n, avg: +(r.yds / r.n).toFixed(1), 'cmp%': r.cmp + r.inc + r.int ? Math.round(100 * r.cmp / (r.cmp + r.inc + r.int)) : '', 'int%': r.cmp + r.inc + r.int ? +(100 * r.int / (r.cmp + r.inc + r.int)).toFixed(1) : '', 'sack%': +(100 * r.sack / r.n).toFixed(1), yac: r.cmp ? +(r.yac / r.cmp).toFixed(1) : '', 'td%': +(100 * r.td / r.n).toFixed(1), 'big%': +(100 * r.big / r.n).toFixed(1), 'loss%': +(100 * r.loss / r.n).toFixed(1), secs: +(r.t / r.n).toFixed(1) }])));
show(by); show(byD); console.log(hist);
