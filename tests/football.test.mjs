import test from 'node:test';
import assert from 'node:assert/strict';
import { createLeague, roster, recordPlayedGame } from '../engine.js';
import { createMatch, PLAYBOOK, DEFENSE_CALLS, FORMATIONS, ROUTES, playArt, FIELD_W } from '../football.js';

const seeded = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const league = createLeague(11);
const match = (seed, extra = {}, h = 0, a = 5) => createMatch({ home: league.teams[h], away: league.teams[a], homeRoster: roster(league, h), awayRoster: roster(league, a), rng: seeded(seed), ...extra });

test('playbook is internally consistent', () => {
  assert.ok(PLAYBOOK.length >= 18);
  assert.equal(new Set(PLAYBOOK.map(p => p.id)).size, PLAYBOOK.length);
  for (const p of PLAYBOOK) {
    const slots = FORMATIONS[p.form].slots.map(s => s.k);
    for (const [slot, route] of Object.entries(p.routes)) {
      assert.ok(slots.includes(slot), `${p.id}: ${slot} is not in ${p.form}`);
      assert.ok(route === 'block' || ROUTES[route.replace(/[<>]/, '')], `${p.id}: unknown route ${route}`);
    }
    if (p.type === 'pass') assert.ok(Object.values(p.routes).filter(r => r !== 'block').length >= 3, `${p.id} needs reads`);
    for (const flip of [1, -1]) for (const pt of playArt(p.id, flip).routes.flat()) assert.ok(pt.y >= 0 && pt.y <= FIELD_W);
  }
  // Receivers on a pass play do not all run the same route.
  for (const p of PLAYBOOK.filter(p => p.cat === 'quick' || p.cat === 'deep')) assert.ok(new Set(Object.values(p.routes)).size >= 3 || p.id === 'verts', p.id);
});

test('every play lines up eleven on eleven against every defensive call', () => {
  const m = match(3, { userTeamId: 0 });
  for (const p of PLAYBOOK) for (const flip of [1, -1]) {
    m.phase = 'playcall';
    assert.ok(m.choosePlay(p.id, flip));
    assert.equal(m.ents.filter(e => !e.team).length, 11, p.id);
    assert.equal(m.ents.filter(e => e.team).length, 11, p.id);
    assert.ok(m.ents.every(e => Number.isFinite(e.x) && e.y > 0 && e.y < FIELD_W), p.id);
    const rushers = m.ents.filter(e => e.job.type === 'rush').length;
    assert.ok(rushers >= 4 && rushers <= 7);
    assert.ok(m.ents.filter(e => e.team).every(e => ['rush', 'man', 'zone'].includes(e.job.type)));
  }
});

test('full simulated games finish with coherent rules and statistics', () => {
  let points = 0, attempts = 0, completions = 0, rushes = 0, rushYards = 0;
  for (let seed = 1; seed <= 16; seed++) {
    const h = seed * 2 - 2, a = seed * 2 - 1, m = match(seed, {}, h, a), r = m.simGame();
    assert.equal(m.phase, 'final');
    assert.notEqual(r.homeScore, r.awayScore);
    points += r.homeScore + r.awayScore;
    const lines = Object.values(r.playerStats);
    for (const l of lines) {
      assert.ok(Object.values(l).every(v => typeof v !== 'number' || Number.isFinite(v)));
      assert.ok(l.completions <= l.passAttempts && l.catches <= l.targets);
      attempts += l.passAttempts; completions += l.completions; rushes += l.rushAttempts; rushYards += l.rushYards;
    }
    const sum = k => lines.reduce((n, l) => n + l[k], 0);
    assert.equal(sum('completions'), sum('catches'));
    assert.equal(sum('passYards'), sum('recYards'));
    assert.equal(sum('passTD'), sum('recTD'));
    assert.equal(sum('interceptions'), sum('defInt'));
    // Scoring drives account for every point except safeties and defensive scores.
    assert.ok(r.drives.length >= 8 && r.drives.every(d => [h, a].includes(d.teamId)));
    assert.ok(r.drives.reduce((n, d) => n + d.points, 0) <= r.homeScore + r.awayScore);
  }
  const perTeam = points / 32, completion = completions / attempts, perCarry = rushYards / rushes;
  assert.ok(perTeam > 8 && perTeam < 34, `points per team ${perTeam}`);
  assert.ok(completion > 0.5 && completion < 0.78, `completion rate ${completion}`);
  assert.ok(perCarry > 3 && perCarry < 6.5, `yards per carry ${perCarry}`);
});

test('the same seed replays the same game', () => {
  const a = match(77).simGame(), b = match(77).simGame();
  assert.deepEqual([a.homeScore, a.awayScore, a.drives], [b.homeScore, b.awayScore, b.drives]);
});

test('user input moves the ball: handoff, throw, timeouts and kicks', () => {
  // Use the first seed where the opening run is an ordinary gain, so the drive continues.
  let m, runoff;
  for (let seed = 9; seed < 40; seed++) {
    m = match(seed, { userTeamId: 0 });
    assert.equal(m.off, 0); assert.equal(m.phase, 'playcall');
    assert.equal(m.suggest().length, 3);
    m.choosePlay('inside', 1); m.snap();
    for (let i = 0; i < 400 && m.phase === 'live'; i++) m.step(1 / 30, { x: 1, y: 0, sprint: true });
    assert.equal(m.phase, 'dead');
    assert.equal([...m.sides[0].lines.values()].reduce((n, l) => n + l.rushAttempts, 0), 1);
    runoff = m.pendingRunoff;
    m.advance();
    if (m.phase === 'playcall' && m.off === 0 && m.down === 2) break;
  }
  if (runoff > 0) { assert.ok(m.timeout()); assert.equal(m.pendingRunoff, 0); assert.equal(m.sides[0].timeouts, 2); }
  m.choosePlay('slants', 1);
  const shown = m.dcall.id;
  m.choosePlay('curls', -1);
  assert.equal(m.dcall.id, shown, 'an audible does not change the defense already shown');
  assert.equal(m.audibled, true);
  m.snap();
  let threw = false;
  for (let i = 0; i < 400 && m.phase === 'live'; i++) { const go = !threw && m.t > 1.4; m.step(1 / 30, go ? { throwTo: 2, lob: false } : {}); if (go) threw = true; }
  assert.equal(m.phase, 'dead');
  assert.equal([...m.sides[0].lines.values()].reduce((n, l) => n + l.passAttempts, 0), 1);
  m.advance();
  if (m.phase === 'playcall' && m.off === 0) { const before = m.sides[0].score; m.los = 80; const good = m.fieldGoal(0); assert.equal(good, true); assert.equal(m.sides[0].score, before + 3); }
});

test('the user can call defense, steer a defender, or sim the drive with the same engine', () => {
  const m = match(21, { userTeamId: 5 });
  assert.equal(m.off, 1, 'user receives the opening kickoff');
  m.punt(); m.advance();
  assert.equal(m.off, 0); assert.equal(m.phase, 'playcall');
  assert.ok(m.chooseDefense('cover2'));
  assert.equal(m.phase, 'presnap');
  for (let i = 0; i < 600 && m.phase !== 'dead'; i++) m.step(1 / 30, { x: -1, y: 0.2, switch: i === 50 });
  assert.equal(m.phase, 'dead');
  assert.equal(m.manual, true);
  assert.ok(m.steeredAt > 0, 'steering is timestamped so the AI can take the defender back');
  m.advance();
  if (m.off === 0 && m.phase === 'playcall') { const log = m.simDrive(); assert.ok(log.length > 0); assert.ok(m.phase !== 'presnap', 'the user makes the next call after a simmed drive'); }
  assert.ok(m.off === 1 || m.phase === 'final' || m.quarter >= 3);
});

test('a played game writes real player lines and drives into the franchise', () => {
  const s = createLeague('live'), g = s.schedule.find(x => x.home === 0 || x.away === 0);
  const m = createMatch({ home: s.teams[g.home], away: s.teams[g.away], homeRoster: roster(s, g.home), awayRoster: roster(s, g.away), userTeamId: 0, rng: seeded(4) });
  const r = m.simGame();
  recordPlayedGame(s, g.id, r);
  for (const [side, id] of [['home', g.home], ['away', g.away]]) {
    const box = g.box[side], sum = k => box.lines.reduce((n, l) => n + l[k], 0);
    assert.equal(box.teamId, id);
    assert.equal(sum('recYards'), sum('passYards'));
    assert.equal(box.yards, box.passYards + box.rushYards);
    assert.ok(box.lines.some(l => l.tackles > 0), 'defensive stats are real');
    for (const l of box.lines) { const p = s.players.find(p => p.id === l.playerId); assert.equal(p.teamId, id); assert.equal(p.season.games, 1); assert.equal(p.season.recYards, l.recYards); }
  }
  assert.equal(g.homeScore, r.homeScore);
  assert.ok(g.box.drives.length > 0 && g.box.drives.every(d => d.teamId === g.home || d.teamId === g.away));
});

test('a throw can be previewed, and every pass that is not caught reports how it ended', () => {
  const m = match(31, { userTeamId: 0 });
  m.choosePlay('curls', 1); m.snap();
  for (let i = 0; i < 40; i++) m.step(1 / 30, {});
  const a = m.aim(1);
  assert.ok(a && Number.isFinite(a.x) && a.radius > 0.2 && a.radius < 8);
  assert.equal(m.ball.thrown, undefined, 'previewing does not throw');
  assert.equal(m.aim(9), null);
  const seen = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    const g = match(seed);
    for (let i = 0; i < 4000 && g.phase !== 'final'; i++) {
      g.autoPhase();
      for (const e of g.events) if (e.type === 'pass') { seen.add(e.result); assert.ok(Number.isFinite(e.x + e.y + e.vx + e.vy)); if (e.result !== 'miss' && e.result !== 'drop') assert.ok(e.by?.team === 1); }
      if (g.phase === 'dead' && g.last.kind === 'incomplete' && g.last.text !== 'Thrown away') assert.ok(g.events.some(e => e.type === 'pass'), g.last.text);
      if (g.phase === 'dead') g.events.length = 0;
    }
  }
  for (const kind of ['tip', 'int', 'breakup', 'drop', 'miss']) assert.ok(seen.has(kind), `${kind} occurs and is reported`);
});

test('kneel and spike manage the clock and cost a down', () => {
  const m = match(8, { userTeamId: 0 });
  m.pendingRunoff = 22; m.clock = 100;
  assert.ok(m.clockPlay('spike'));
  assert.equal(m.down, 2); assert.ok(m.clock >= 95, 'a spike saves the runoff');
  m.advance();
  const los = m.los; m.clock = 100; m.pendingRunoff = 22;
  assert.ok(m.clockPlay('kneel'));
  assert.equal(m.down, 3); assert.equal(m.los, los - 1); assert.ok(m.clock <= 76, 'a kneel burns the runoff');
  assert.equal(m.pendingRunoff, 22, 'and the clock keeps running after it');
  m.advance(); m.clockPlay('kneel'); m.advance();
  assert.equal(m.down, 4);
  m.clockPlay('kneel'); m.advance();
  assert.equal(m.off, 1, 'kneeling on fourth down turns it over');
});

test('the coordinator varies his suggestions and the pocket holds for two seconds', () => {
  const m = match(12, { userTeamId: 0 }), seen = new Set();
  for (let i = 0; i < 40; i++) { m.suggested = null; const picks = m.suggest(); assert.equal(new Set(picks).size, 3); picks.forEach(p => seen.add(p)); m.sides[0].called[picks[0]] = (m.sides[0].called[picks[0]] || 0) + 1; }
  assert.ok(seen.size >= 10, `only ${seen.size} different plays suggested`);
  assert.ok([...seen].some(id => ['inside', 'stretch', 'power', 'counter', 'toss'].includes(id)), 'runs are suggested on first down');
  let sacks = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const g = match(seed, { userTeamId: 0 });
    // Hold the ball for two seconds without moving against whatever the defense calls.
    g.choosePlay('curls', 1); g.snap();
    for (let i = 0; i < 60 && g.phase === 'live'; i++) g.step(1 / 30, {});
    if (g.phase === 'dead' && g.last.kind === 'sack') sacks++;
  }
  assert.ok(sacks <= 6, `${sacks} of 30 dropbacks sacked inside two seconds`);
});

test('pass outcomes follow position: a defender in front can take it away, one behind cannot intercept a bullet', () => {
  const tally = {};
  for (let seed = 1; seed <= 60; seed++) {
    const g = match(seed);
    for (let i = 0; i < 4000 && g.phase !== 'final'; i++) {
      g.autoPhase();
      for (const e of g.events) {
        if (e.type === 'pass' && e.why) tally[`${e.result}:${e.why}`] = (tally[`${e.result}:${e.why}`] || 0) + 1;
        if (e.type === 'catch') tally[`catch:${e.why}`] = (tally[`catch:${e.why}`] || 0) + 1;
      }
      if (g.phase === 'dead') g.events.length = 0;
    }
  }
  assert.ok(!tally['int:jarred'] && !tally['int:shielded'], 'a trailing defender never intercepts');
  assert.ok(tally['int:undercut'] > 0 && tally['breakup:undercut'] > tally['int:undercut'], 'undercutting defenders mostly break it up, sometimes pick it');
  assert.ok(tally['catch:open'] > tally['catch:contested'], 'most catches are uncontested');
  assert.ok(tally['catch:shielded'] > 0 && tally['breakup:jarred'] > 0);
  assert.ok((tally['catch:stolen'] || 0) < tally['breakup:undercut'], 'a receiver rarely wins the ball from an undercutting defender');
});

test('free aim throws to a spot, runners keep going without input, and defenses jump a repeated play', () => {
  const m = match(14, { userTeamId: 0 });
  m.choosePlay('curls', 1); m.snap();
  for (let i = 0; i < 45; i++) m.step(1 / 30, {});
  const target = m.targets[0], spot = { x: target.x + 1, y: target.y };
  const preview = m.aim(spot);
  assert.ok(preview && preview.receiver, 'the preview names who can reach the spot');
  m.step(1 / 30, { throwAt: spot });
  assert.equal(m.ball.thrown, true);
  assert.ok(Math.hypot(m.ball.tx - spot.x, m.ball.ty - spot.y) < 6, 'the ball goes near the chosen spot');
  // After a handoff the back runs on his own until the user steers.
  let gained = 0, n = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const g = match(seed, { userTeamId: 0 });
    g.choosePlay('inside', 1); g.snap();
    for (let i = 0; i < 400 && g.phase === 'live'; i++) g.step(1 / 30, {});
    gained += g.last.gain; n++;
    assert.equal(g.manual, false);
  }
  assert.ok(gained / n > 1.5, `hands-off runs average ${gained / n}`);
  // Recognition grows with repetition.
  const r = match(5, { userTeamId: 0 });
  r.choosePlay('stick', 1); const first = r.recognized;
  r.sides[0].called = { stick: 5 }; r.phase = 'playcall'; r.choosePlay('stick', 1);
  assert.equal(first, 0); assert.ok(r.recognized > 0.25);
  assert.ok(r.ents.filter(e => e.team).every(e => e.react < 0.5));
});
