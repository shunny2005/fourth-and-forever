// Plays the user's side through the same input path a person uses (move, sprint, juke, throw by label)
// with human-like limits: reaction delay, reads only the open-ness rings, simple steering.
import { createLeague, roster } from '../engine.js';
import { createMatch, FIELD_W } from '../football.js';
const games = Number(process.argv[2] || 30), skill = process.argv[3] || 'average', league = createLeague(7);
let seed = 42; const rng = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const S = { novice: { wait: 0.7, need: 2.0, hold: 4.2, dodge: 0.3 }, average: { wait: 0.35, need: 2.4, hold: 3.6, dodge: 0.7 }, sharp: { wait: 0.15, need: 2.7, hold: 3.2, dodge: 1 } }[skill];
const byCall = {};
const T = { pts: 0, opp: 0, att: 0, cmp: 0, yds: 0, int: 0, sacks: 0, ra: 0, ry: 0, wins: 0, plays: 0, td: 0 }, byPlay = {};
for (let g = 0; g < games; g++) {
  const h = g % 32, a = (g * 7 + 3) % 32 === h ? (h + 1) % 32 : (g * 7 + 3) % 32;
  const m = createMatch({ home: league.teams[h], away: league.teams[a], homeRoster: roster(league, h), awayRoster: roster(league, a), rng, difficulty: 'pro', userTeamId: h });
  for (let guard = 0; guard < 4000 && m.phase !== 'final'; guard++) {
    if (m.phase === 'dead') { m.advance(); continue; }
    if (m.phase === 'pat') { m.pat('kick'); continue; }
    if (m.off !== 0) { m.simDrive(); continue; }
    if (m.phase === 'playcall') {
      if (m.down === 4 && !m.conv) { if (m.los >= 63) m.fieldGoal(); else if (m.firstAt - m.los > 2 || m.los < 45) m.punt(); else m.choosePlay('dive', 1); continue; }
      // FARM=<play id> calls the same play every down to test whether one call can be abused.
      const picks = process.env.FARM ? [process.env.FARM] : m.suggest(); m.choosePlay(picks[Math.floor(rng() * picks.length)], rng() < 0.5 ? 1 : -1); continue;
    }
    if (m.phase === 'presnap') { m.snap(); continue; }
    // live
    let decided = null, since = 0, aimed = 0;
    const id = m.play.id;
    while (m.phase === 'live') {
      const inp = { x: 0, y: 0 }, c = m.carrier;
      if (c === m.qb && !m.ball.thrown && m.play.type !== 'run') {
        const ready = m.play.ready + (m.play.pa ? 0.5 : 0);
        let best = null; for (const r of m.targets) if (!best || r.open > best.open) best = r;
        let rush = 9; for (const e of m.ents) if (e.team && !e.eng && e.stun <= 0) rush = Math.min(rush, Math.hypot(e.x - c.x, e.y - c.y));
        if (!decided && m.t > ready && best && (best.open > S.need || m.t > S.hold || rush < 3)) { decided = best; since = 0; }
        if (decided) { since += 1 / 30; if (since > S.wait) { if (decided.open < 0.6 && rush < 3 && m.t < S.hold) inp.throwAway = true; else { inp.throwTo = decided.label; inp.lob = decided.x - c.x > 18; } } }
      } else if (c && m.ball.thrown) {
        // carry: head for the hole, then upfield, leaning away from the nearest free defender ahead
        let gx = 1, gy = 0;
        if (m.play.run && c.x < m.los + 1 && m.holeY !== undefined) { gy = Math.sign(m.holeY - c.y) * Math.min(1, Math.abs(m.holeY - c.y) / 2); }
        let near = null, nd = 7;
        for (const e of m.ents) if (e.team && !e.eng && e.stun <= 0 && e.x > c.x - 1) { const d = Math.hypot(e.x - c.x, e.y - c.y); if (d < nd) { nd = d; near = e; } }
        if (near) { gy += Math.sign(c.y - near.y || 1) * S.dodge * (1.6 - nd / 7); if (nd < 1.8 && rng() < S.dodge * 0.25) inp.juke = true; }
        if (c.y < 3) gy = 1; if (c.y > FIELD_W - 3) gy = -1;
        inp.x = gx; inp.y = gy; inp.sprint = c.x > m.los;
      }
      m.step(1 / 30, inp);
    }
    const l = m.last, r = byPlay[id] ||= { n: 0, yds: 0, sack: 0 }; r.n++; r.yds += l.gain; if (l.kind === 'sack') r.sack++;
    if (m.play.type !== 'run') { const d = byCall[m.dcall.id] ||= { n: 0, sack: 0, t: 0, by: {} }; d.n++; if (l.kind === 'sack') { d.sack++; d.t += m.t; const who = m.ents.find(e => e.team && e.p.name && l.text.startsWith(e.p.name)); const k = who ? who.role + (who.home?.type !== 'rush' ? '/' + who.home?.type : '') : '?'; d.by[k] = (d.by[k] || 0) + 1; } }
    T.plays++;
  }
  const res = m.result(), u = res.userStats;
  T.pts += res.homeScore; T.opp += res.awayScore; T.att += u.passAttempts; T.cmp += u.completions; T.yds += u.passYards; T.int += u.interceptions; T.sacks += u.sacks; T.ra += u.rushAttempts; T.ry += u.rushYards; T.td += u.passTD + u.rushTD;
  if (res.homeScore > res.awayScore) T.wins++;
}
const f = x => x.toFixed(2);
console.log(`${skill} human-bot, ${games} games: ${T.wins} wins, ${f(T.pts / games)} pts for, ${f(T.opp / games)} against, ${f(T.plays / games)} plays`);
console.log(`pass ${f(T.att / games)} att ${f(100 * T.cmp / T.att)}% ${f(T.yds / T.att)} y/att INT ${f(100 * T.int / T.att)}% sack ${f(100 * T.sacks / (T.att + T.sacks))}% | rush ${f(T.ra / games)} att ${f(T.ry / T.ra)} y/car`);
console.table(Object.fromEntries(Object.entries(byPlay).map(([k, r]) => [k, { n: r.n, avg: +(r.yds / r.n).toFixed(1), 'sack%': +(100 * r.sack / r.n).toFixed(0) }])));

console.log(Object.fromEntries(Object.entries(byCall).map(([k, d]) => [k, `${d.n} passes, ${(100 * d.sack / d.n).toFixed(0)}% sacked at ${(d.t / Math.max(1, d.sack)).toFixed(1)}s by ${JSON.stringify(d.by)}`])));
