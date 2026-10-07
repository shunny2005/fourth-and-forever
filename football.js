/**
 * Headless football: formations, playbook, player AI, physics and game rules.
 * No DOM. The same code runs user plays, CPU plays, simmed drives and tests.
 *
 * Coordinates are always in the offense's frame: x is yards downfield (0 = own
 * goal line, 100 = opponent goal line), y is lateral yards (0..FIELD_W).
 */

export const FIELD_W = 53.3;
export const QUARTER_SECONDS = 240;
const RUNOFF = 22, HURRY_RUNOFF = 9;
const OL_POS = ['LT', 'LG', 'C', 'RG', 'RT'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const att = (p, key) => (Number.isFinite(p?.attrs?.[key]) ? p.attrs[key] : (p?.ovr || 65));

// Difficulty changes how well the CPU reads, disguises and adapts, not its ratings.
const DIFFICULTY = {
  casual: { lag: 1.3, react: 1.35, disguise: 0, adapt: 0.35, qbNoise: 1.6 },
  pro: { lag: 1, react: 1, disguise: 0.15, adapt: 0.5, qbNoise: 1 },
  expert: { lag: 0.85, react: 0.8, disguise: 0.4, adapt: 1, qbNoise: 0.6 }
};

const PACE = { QB: 6.3, RB: 7.5, FB: 6.5, WR: 7.7, TE: 6.9, LT: 5.2, LG: 5.2, C: 5.2, RG: 5.2, RT: 5.2, EDGE: 6.7, DT: 5.7, LB: 7.0, CB: 7.7, S: 7.5, K: 5.5, P: 5.5 };
const BLOCK_PENALTY = { TE: 7, FB: 6, RB: 14, WR: 17, QB: 30 };
const SHED_PENALTY = { LB: 5, S: 12, CB: 15 };

/* ---------- Formations ---------- */
// x is relative to the line of scrimmage. Lateral placement: `wide`/`slot` give a
// side (+1 strong, -1 weak) resolved against the sideline; `dy` is yards from the ball.
export const FORMATIONS = {
  single: { name: 'Singleback', qb: -1.3, slots: [
    { k: 'X', pos: ['WR', 0], wide: -1, x: -0.3 }, { k: 'H', pos: ['WR', 2], slot: -1, x: -1.2 },
    { k: 'Y', pos: ['TE', 0], dy: 4.7, x: -0.3 }, { k: 'Z', pos: ['WR', 1], wide: 1, x: -1.2 },
    { k: 'RB', pos: ['RB', 0], dy: 0, x: -6.5 }] },
  trips: { name: 'Gun Trips', qb: -5, slots: [
    { k: 'X', pos: ['WR', 0], wide: -1, x: -0.3 }, { k: 'Y', pos: ['TE', 0], slot: 1, frac: 0.3, x: -1.2 },
    { k: 'H', pos: ['WR', 2], slot: 1, frac: 0.63, x: -1.2 }, { k: 'Z', pos: ['WR', 1], wide: 1, x: -0.3 },
    { k: 'RB', pos: ['RB', 0], dy: -1.9, x: -5.3 }] },
  spread: { name: 'Gun Spread', qb: -5, slots: [
    { k: 'X', pos: ['WR', 0], wide: -1, x: -0.3 }, { k: 'H', pos: ['WR', 2], slot: -1, x: -1.2 },
    { k: 'Y', pos: ['WR', 3], slot: 1, x: -1.2 }, { k: 'Z', pos: ['WR', 1], wide: 1, x: -0.3 },
    { k: 'RB', pos: ['RB', 0], dy: 1.9, x: -5.3 }] },
  iform: { name: 'I-Form', qb: -1.3, slots: [
    { k: 'X', pos: ['WR', 0], wide: -1, x: -0.3 }, { k: 'Y', pos: ['TE', 0], dy: 4.7, x: -0.3 },
    { k: 'Z', pos: ['WR', 1], wide: 1, x: -1.2 }, { k: 'FB', pos: ['FB', 0], dy: 0, x: -4.3 },
    { k: 'RB', pos: ['RB', 0], dy: 0, x: -7.2 }] },
  heavy: { name: 'Heavy', qb: -1.3, slots: [
    { k: 'U', pos: ['TE', 1], dy: -4.7, x: -0.3 }, { k: 'Y', pos: ['TE', 0], dy: 4.7, x: -0.3 },
    { k: 'Z', pos: ['WR', 0], wide: 1, x: -1.2 }, { k: 'FB', pos: ['FB', 0], dy: 0, x: -4.3 },
    { k: 'RB', pos: ['RB', 0], dy: 0, x: -7.2 }] }
};

/* ---------- Route tree ---------- */
// Points are [depth past the line, lateral]; lateral is positive toward the
// receiver's own sideline and negative toward the middle of the field.
export const ROUTES = {
  go: { pts: [[45, 0]] },
  fade: { pts: [[5, 1.5], [45, 2.5]] },
  hitch: { pts: [[6.5, 0], [5.5, -0.8]], stop: true },
  curl: { pts: [[12.5, 0], [10.5, -1.8]], stop: true },
  comeback: { pts: [[15.5, 0], [12.5, 3]], stop: true },
  slant: { pts: [[2.5, 0], [13, -12]] },
  out: { pts: [[10, 0], [10, 10]] },
  quickout: { pts: [[5, 0], [5, 8]] },
  dig: { pts: [[12, 0], [12, -20]] },
  post: { pts: [[12, 0], [40, -14]] },
  corner: { pts: [[11, 0], [28, 12]] },
  drag: { pts: [[1.5, 0], [4.5, -28]] },
  cross: { pts: [[5, 0], [17, -28]] },
  flat: { pts: [[1.5, 5], [3, 13]] },
  wheel: { pts: [[0.5, 6], [5, 9.5], [38, 9.5]] },
  swing: { pts: [[-1.5, 7], [1.5, 14]] },
  check: { pts: [[3.5, 2.5]], stop: true },
  angle: { pts: [[2, 4.5], [9, -4]] },
  screen: { pts: [[-3, 6.5]], stop: true, delay: 0.6 },
  bubble: { pts: [[-1.5, 5]], stop: true },
  leak: { pts: [[1.5, 4], [4, 12]], delay: 1.0 }
};

/* ---------- Playbook ---------- */
// routes: slot key -> route name, optional '>' (strong side) or '<' (weak side)
// for backfield players; 'block' keeps the player in protection.
const pass = (id, name, form, cat, note, routes, x = {}) => ({ id, name, form, cat, type: 'pass', note, routes, drop: 6.5, ready: 1.2, ...x });
const run = (id, name, form, note, r, x = {}) => ({ id, name, form, cat: 'run', type: 'run', note, routes: {}, run: { carrier: 'RB', handoff: 0.45, ...r }, ...x });
export const PLAYBOOK = [
  run('inside', 'Inside Zone', 'single', 'Downhill behind the strong guard', { hole: 1.6 }, { fits: ['Zone Run', 'West Coast'] }),
  run('stretch', 'Outside Zone', 'single', 'Stretch the edge, cut back when it opens', { hole: 7.5, handoff: 0.5 }, { fits: ['Zone Run', 'Play Action'] }),
  run('power', 'Power O', 'iform', 'Fullback leads, backside guard pulls', { hole: 3.6, pull: 'weak', lead: 'FB' }, { fits: ['Power Run'] }),
  run('counter', 'Counter', 'iform', 'Sell strong, hit the weak side', { hole: -3.8, pull: 'strong', lead: 'FB', counter: true, handoff: 0.75 }, { fits: ['Power Run', 'Play Action'] }),
  run('toss', 'Toss Sweep', 'iform', 'Pitch wide and race to the corner', { hole: 9.5, pull: 'strong', lead: 'FB', handoff: 0.3, toss: true }, { fits: ['Zone Run', 'Spread'] }),
  run('dive', 'Dive', 'heavy', 'Short yardage straight ahead', { hole: 0.8, lead: 'FB', handoff: 0.32 }, { fits: ['Power Run'] }),
  run('sneak', 'QB Sneak', 'heavy', 'A yard when you need it', { hole: 0, carrier: 'QB', handoff: 0 }),
  run('draw', 'Draw', 'spread', 'Show pass, hand off late', { hole: -1.2, handoff: 0.7, draw: true }, { fits: ['Spread', 'Vertical'] }),

  pass('slants', 'Slant-Flat', 'single', 'quick', 'Slants behind flats. Beats blitz and off coverage', { X: 'slant', H: 'flat', Y: 'flat', Z: 'slant', RB: 'check' }, { drop: 4, ready: 0.7, fits: ['West Coast'] }),
  pass('stick', 'Stick', 'trips', 'quick', 'Tight end sits at six, out breaks under him', { X: 'slant', Y: 'hitch', H: 'quickout', Z: 'fade', RB: 'swing<' }, { ready: 0.8, fits: ['West Coast', 'Spread'] }),
  pass('curls', 'Curl-Flat', 'single', 'quick', 'Curls at twelve with flats underneath', { X: 'curl', H: 'flat', Y: 'hitch', Z: 'curl', RB: 'flat>' }, { ready: 1.2, fits: ['West Coast', 'Play Action'] }),
  pass('mesh', 'Mesh', 'spread', 'quick', 'Crossers rub man coverage', { X: 'corner', H: 'drag', Y: 'drag', Z: 'dig', RB: 'wheel<' }, { ready: 1.1, fits: ['Spread', 'West Coast'] }),

  pass('verts', 'Four Verticals', 'spread', 'deep', 'Four deep. Punishes single-high safeties', { X: 'go', H: 'go', Y: 'go', Z: 'go', RB: 'check' }, { ready: 1.9, drop: 7.5, fits: ['Vertical', 'Spread'] }),
  pass('flood', 'Flood', 'trips', 'deep', 'Three levels to the strong side overload zones', { X: 'post', Y: 'flat', H: 'out', Z: 'go', RB: 'block' }, { ready: 1.6, fits: ['Vertical', 'Play Action'] }),
  pass('dagger', 'Dagger', 'trips', 'deep', 'Seam clears out a dig behind the linebackers', { X: 'comeback', Y: 'drag', H: 'go', Z: 'dig', RB: 'check' }, { ready: 1.8, fits: ['Vertical', 'West Coast'] }),
  pass('smash', 'Smash', 'single', 'deep', 'Hitch low, corner high. Beats Cover 2', { X: 'hitch', H: 'corner', Y: 'corner', Z: 'hitch', RB: 'check' }, { ready: 1.7, fits: ['Spread', 'Vertical'] }),
  pass('ycross', 'Y-Cross', 'single', 'deep', 'Tight end crosses under a deep post', { X: 'post', H: 'hitch', Y: 'cross', Z: 'comeback', RB: 'block' }, { ready: 1.8, fits: ['Play Action', 'Vertical'] }),

  pass('papost', 'PA Post', 'iform', 'action', 'Fake the run, throw the post over the top', { X: 'post', Y: 'leak', Z: 'cross', FB: 'block', RB: 'block' }, { pa: true, ready: 1.9, drop: 8, fits: ['Play Action', 'Power Run'] }),
  pass('paboot', 'PA Boot', 'single', 'action', 'Fake weak, roll strong with a three-level read', { X: 'post', H: 'cross', Y: 'flat', Z: 'comeback', RB: 'block' }, { pa: true, boot: true, ready: 1.5, fits: ['Play Action', 'Zone Run'] }),
  pass('screen', 'HB Screen', 'trips', 'action', 'Let the rush come, dump it behind them', { X: 'go', Y: 'go', H: 'go', Z: 'go', RB: 'screen<' }, { screen: true, ready: 1.1, fits: ['West Coast', 'Zone Run'] }),
  pass('bubble', 'Bubble Screen', 'trips', 'action', 'Quick throw outside with two blockers', { X: 'hitch', Y: 'block', H: 'bubble', Z: 'block', RB: 'check' }, { ready: 0.35, drop: 5, quick: 'H', fits: ['Spread'] })
];
const PLAY = Object.fromEntries(PLAYBOOK.map(p => [p.id, p]));

/* ---------- Defensive calls ---------- */
// Zone landmarks: deep entries are fractions of field width; under entries are
// [fraction of width, depth past the line].
export const DEFENSE_CALLS = [
  { id: 'cover3', name: 'Cover 3', note: 'Three deep, four under. Balanced', shell: 1, deep: [0.15, 0.5, 0.85], under: [[0.13, 6], [0.37, 7], [0.63, 7], [0.87, 6]], rush: 4 },
  { id: 'cover2', name: 'Cover 2', note: 'Five under. Takes away short throws', shell: 2, deep: [0.25, 0.75], under: [[0.09, 5], [0.3, 7], [0.5, 9.5], [0.7, 7], [0.91, 5]], rush: 4 },
  { id: 'quarters', name: 'Quarters', note: 'Four deep. Stops the bomb', shell: 2, deep: [0.11, 0.37, 0.63, 0.89], under: [[0.2, 6], [0.5, 7], [0.8, 6]], rush: 4 },
  { id: 'man1', name: 'Man Free', note: 'Man coverage with a deep safety', shell: 1, man: true, deep: [0.5], rush: 4, press: true },
  { id: 'blitz0', name: 'All-Out Blitz', note: 'Six rushers, no help deep', shell: 0, man: true, deep: [], rush: 6, press: true },
  { id: 'fire', name: 'Zone Blitz', note: 'Five rush, three deep, three under', shell: 1, deep: [0.15, 0.5, 0.85], under: [[0.2, 6], [0.5, 6], [0.8, 6]], rush: 5 },
  { id: 'stuff', name: 'Run Stuff', note: 'Eight in the box, attack downhill', shell: 1, man: true, deep: [0.5], rush: 4, box: true }
];
const DCALL = Object.fromEntries(DEFENSE_CALLS.map(c => [c.id, c]));

const blankLine = () => ({ passAttempts: 0, completions: 0, passYards: 0, passTD: 0, interceptions: 0, rushAttempts: 0, rushYards: 0, rushTD: 0, targets: 0, catches: 0, recYards: 0, recTD: 0, tackles: 0, sacks: 0, defInt: 0, forcedFumbles: 0 });

function makeSide(team, roster) {
  const healthy = (roster || []).filter(p => !(p.injury?.weeks > 0));
  const byPos = {};
  for (const p of healthy) (byPos[p.pos] ||= []).push(p);
  for (const list of Object.values(byPos)) list.sort((a, b) => (Number(b.starter) || 0) - (Number(a.starter) || 0) || (b.depthPriority || 0) - (a.depthPriority || 0) || (b.ovr || 0) - (a.ovr || 0));
  return {
    team, byPos, score: 0, timeouts: 3, lines: new Map(), energy: new Map(),
    totals: { plays: 0, passYards: 0, rushYards: 0, turnovers: 0, sacksAllowed: 0, firstDowns: 0 },
    tendency: { run: 0, pass: 0, deep: 0 }
  };
}

/** Where everyone lines up and runs for a play, in a neutral frame. Used for play art. */
export function playArt(playId, flip = 1) {
  const play = PLAY[playId], F = FORMATIONS[play.form], los = 0, by = FIELD_W / 2;
  const players = OL_POS.map((_, i) => ({ x: los - 0.6, y: by + (i - 2) * 1.55, kind: 'ol' }));
  players.push({ x: los + F.qb, y: by, kind: 'qb' });
  const routes = [];
  for (const s of F.slots) {
    const y = slotY(s, by, flip), start = { x: los + s.x, y };
    players.push({ ...start, kind: 'skill' });
    const spec = play.routes[s.k];
    if (spec && spec !== 'block') routes.push([start, ...routePoints(spec, start, los, by, flip)]);
  }
  if (play.run) {
    const c = play.run.carrier === 'QB' ? { x: los + F.qb, y: by } : players[players.length - 1];
    const hy = by + play.run.hole * flip;
    routes.push([c, ...(play.run.counter ? [{ x: c.x + 1, y: c.y - Math.sign(play.run.hole) * flip * 2 }] : []), { x: los - 1, y: lerp(c.y, hy, 0.8) }, { x: los + 7, y: hy }]);
  }
  return { players, routes, run: !!play.run };
}

function slotY(s, by, flip) {
  if (s.dy !== undefined) return by + s.dy * flip;
  const side = (s.wide || s.slot) * flip, edge = side < 0 ? 5.5 : FIELD_W - 5.5;
  if (s.wide) return edge;
  const tackle = by + side * 3.2;
  return tackle + (edge - tackle) * (s.frac ?? 0.55);
}

function routePoints(spec, start, los, by, flip) {
  const side = spec.endsWith('>') ? flip : spec.endsWith('<') ? -flip : (Math.abs(start.y - by) < 0.5 ? flip : Math.sign(start.y - by));
  const route = ROUTES[spec.replace(/[<>]/, '')];
  return route.pts.map(([depth, lat]) => ({ x: los + depth, y: clamp(start.y + lat * side, 1.5, FIELD_W - 1.5) }));
}

export function createMatch(o) {
  const rng = o.rng || Math.random;
  const gauss = () => (rng() + rng() + rng() + rng() - 2) * 1.732;
  const D = DIFFICULTY[String(o.difficulty || 'pro').toLowerCase()] || DIFFICULTY.pro;
  const sides = [makeSide(o.home, o.homeRoster), makeSide(o.away, o.awayRoster)];
  const user = o.userTeamId == null ? -1 : (o.home.id === o.userTeamId ? 0 : 1);
  for (const side of sides) for (const list of Object.values(side.byPos)) for (const p of list) side.energy.set(p.id, 1 - clamp((p.fatigue || 0) / 250, 0, 0.3));

  const m = {
    sides, user, coach: !!o.coach, simDefense: !!o.simDefense, autoAll: user < 0,
    phase: 'playcall', off: user >= 0 ? user : 1, quarter: 1, clock: o.quarterSeconds || QUARTER_SECONDS,
    los: 25, ballY: FIELD_W / 2, down: 1, firstAt: 35, conv: false, pendingRunoff: 0,
    play: null, flip: 1, dcall: null, shell: 1, ents: [], t: 0, ball: null, carrier: null, qb: null,
    userEnt: null, manual: false, stamina: 1, last: null, next: null, log: [], drives: [], drive: null,
    events: [], audibled: false, final: false, suddenDeath: false
  };
  const quarterLen = m.clock;
  const openingReceiver = m.off;
  let ents = m.ents, qb = null;
  let fallbackId = 0;

  /* ---------- roster and stats ---------- */
  function pickPlayer(side, pos, index = 0) {
    const list = side.byPos[pos] || [];
    if (pos === 'RB' && index === 0 && list.length > 1) {
      // A worn-down starter sits until he recovers; this is where depth matters.
      const e = side.energy.get(list[0].id) ?? 1;
      if (side.resting ? e < 0.72 : e < 0.5) { side.resting = true; return list[1]; }
      side.resting = false;
    }
    return list[index] || list[list.length - 1] || (side.fallback ||= {})[pos + index] || (side.fallback[pos + index] = { id: `sub-${fallbackId++}`, name: pos, pos, ovr: 60, attrs: {}, generic: true });
  }
  function line(side, p) {
    if (!p || p.generic) return blankLine();
    if (!side.lines.has(p.id)) side.lines.set(p.id, { playerId: p.id, name: p.name, pos: p.pos, ...blankLine() });
    return side.lines.get(p.id);
  }
  const O = () => m.sides[m.off], Df = () => m.sides[1 - m.off];
  const event = (type, data = {}) => m.events.push({ type, ...data });
  const isHuman = sideIndex => sideIndex === m.user && !m.autoAll;
  const cpuDefends = () => 1 - m.off !== m.user;

  /* ---------- entity setup ---------- */
  function add(team, p, pos, x, y, extra) {
    const side = team ? Df() : O(), energy = side.energy.get(p.id) ?? 1;
    const speedAttr = pos === 'QB' ? att(p, 'mobility') : att(p, 'speed');
    const e = {
      p, pos, team, x, y, sx: x, sy: y, vx: 0, vy: 0, dvx: 0, dvy: 0,
      max: (PACE[pos] || 6.5) + (speedAttr - 70) * 0.035 * (0.9 + 0.1 * energy) - (1 - energy) * 0.5,
      acc: 15 + (att(p, 'acceleration') - 70) * 0.12 + (att(p, 'agility') - 70) * 0.08,
      stun: 0, tcd: 0, beaten: 0, slow: 0, jukeT: 0, jcd: 0, broken: 0, eng: null, engT: 0, job: { type: 'idle' }, hist: [], open: 3, label: 0,
      ...extra
    };
    ents.push(e);
    return e;
  }

  function lineUp() {
    const play = m.play, F = FORMATIONS[play.form], los = m.los, by = m.ballY, flip = m.flip, off = O();
    ents = m.ents = [];
    OL_POS.forEach((pos, i) => add(0, pickPlayer(off, pos), pos, los - 0.6, by + (i - 2) * 1.55, { role: 'ol', oi: i }));
    qb = m.qb = add(0, pickPlayer(off, 'QB'), 'QB', los + F.qb, by, { role: 'qb' });
    for (const s of F.slots) {
      const e = add(0, pickPlayer(off, s.pos[0], s.pos[1]), s.pos[0], los + s.x, slotY(s, by, flip), { role: 'skill', key: s.k, back: s.x < -3 });
      e.acc += (att(e.p, 'routeRunning') - 70) * 0.15; e.elite = savvy(e) >= 80;
      const spec = play.routes[s.k];
      if (spec && spec !== 'block') {
        const route = ROUTES[spec.replace(/[<>]/, '')];
        e.job = { type: 'route', pts: routePoints(spec, e, los, by, flip), i: 0, stop: !!route.stop, delay: route.delay || 0, name: spec.replace(/[<>]/, '') };
      } else e.job = { type: 'block' };
    }
    const targets = ents.filter(e => e.job.type === 'route').sort((a, b) => a.y - b.y);
    targets.forEach((e, i) => { e.label = i + 1; });
    m.targets = targets;
    lineUpDefense();
    m.carrier = play.run?.carrier === 'QB' || !play.run ? qb : qb;
    m.ball = { air: false };
    m.t = 0; m.stamina = 1; m.manual = false; m.steeredAt = -9; m.events = [];
    const lbs = ents.filter(e => e.team && e.pos === 'LB');
    m.userEnt = lbs.sort((a, b) => Math.abs(a.y - by) - Math.abs(b.y - by))[0] || ents.find(e => e.team);
  }

  function lineUpDefense() {
    const call = m.dcall, los = m.los, by = m.ballY, def = Df(), strong = m.flip;
    const front = ents.filter(e => e.role === 'skill' && !e.back).sort((a, b) => a.y - b.y);
    const wideouts = ents.filter(e => e.role === 'skill' && e.pos === 'WR').length;
    const nickel = wideouts >= 3;
    const press = call.press && m.shell !== 2;
    [[-4.5, 'EDGE', 0], [-1.45, 'DT', 0], [1.45, 'DT', 1], [4.5, 'EDGE', 1]].forEach(([dy, pos, i]) => add(1, pickPlayer(def, pos, i), pos, los + 1, by + dy, { role: 'dl', job: { type: 'rush' } }));
    const lbDepth = call.box ? 3 : 4.6;
    (nickel ? [-2.4, 2.4] : [-4.8, 0, 4.8]).forEach((dy, i) => add(1, pickPlayer(def, 'LB', i), 'LB', los + lbDepth, by + dy, { role: 'lb' }));
    const cbDepth = press ? 1.7 : call.id === 'cover2' ? 5 : 6.8;
    const outside = [front[0], front[front.length - 1]];
    outside.forEach((r, i) => add(1, pickPlayer(def, 'CB', i), 'CB', los + cbDepth, r ? r.y + Math.sign(by - r.y) * 0.6 : by + (i ? 18 : -18), { role: 'cb', over: r }));
    if (nickel) {
      const slot = front.filter(r => !outside.includes(r) && r.pos === 'WR')[0] || front[1];
      add(1, pickPlayer(def, 'CB', 2), 'CB', los + (press ? 2.2 : 5.5), slot ? slot.y : by, { role: 'cb', over: slot });
    }
    const mid = lerp(by, FIELD_W / 2, 0.5);
    const spots = m.shell === 2 ? [[13, FIELD_W * 0.29], [13, FIELD_W * 0.71]] : m.shell === 1 ? [[14, mid], [call.box ? 4.5 : 7, by + strong * 6.5]] : [[8, by - strong * 6], [6, by + strong * 6.5]];
    spots.forEach(([dx, y], i) => add(1, pickPlayer(def, 'S', i), 'S', los + dx, y, { role: 's' }));
    assignCoverage();
  }

  function assignCoverage() {
    const call = m.dcall, los = m.los, def = ents.filter(e => e.team), back7 = def.filter(e => e.role !== 'dl');
    const free = new Set(back7);
    const take = (list, x, y) => { let best = null, bd = 1e9; for (const e of list) if (free.has(e)) { const d = Math.hypot(e.x - x, (e.y - y) * 1.6); if (d < bd) { bd = d; best = e; } } if (best) free.delete(best); return best; };
    // Extra rushers come from the linebackers nearest the line, then the box safety.
    // Blitzers usually creep toward the line before the snap, which is the offense's cue.
    const creep = !cpuDefends() || rng() > D.disguise * 1.5;
    for (let i = 4; i < call.rush; i++) { const e = take(back7.filter(e => e.role === 'lb').concat(back7.filter(e => e.role === 's')), los, m.ballY); if (e) { e.job = { type: 'rush', blitz: true }; if (creep) e.x = e.sx = los + 2.4; } }
    const dbs = back7.filter(e => e.role === 's' || e.role === 'cb');
    const deepWidth = FIELD_W / (2 * Math.max(1, call.deep.length)) + 2;
    for (const f of call.deep) {
      const pool = call.man ? dbs.filter(e => e.role === 's') : dbs;
      const e = take(pool, los + 15, f * FIELD_W) || take(back7, los + 15, f * FIELD_W);
      if (e) e.job = { type: 'zone', x: los + 15, y: f * FIELD_W, w: deepWidth, deep: true };
    }
    if (call.man) {
      const eligible = ents.filter(e => e.role === 'skill').sort((a, b) => (a.back ? 1 : 0) - (b.back ? 1 : 0) || (b.pos === 'WR') - (a.pos === 'WR'));
      for (const r of eligible) {
        const order = r.pos === 'WR' ? ['cb', 's', 'lb'] : r.back ? ['lb', 's', 'cb'] : ['s', 'lb', 'cb'];
        let e = null;
        for (const role of order) { e = take(back7.filter(x => x.role === role), r.x + 4, r.y); if (e) break; }
        if (e) e.job = { type: 'man', r, cushion: Math.max(0.6, e.x - r.x - 0.5) };
      }
      for (const e of [...free]) { e.job = call.rush > 4 ? { type: 'rush', blitz: true } : { type: 'zone', x: los + 6, y: m.ballY, w: 9, robber: true }; free.delete(e); }
    } else {
      const w = FIELD_W / (2 * call.under.length) + 1.5;
      for (const [f, depth] of call.under) { const e = take(back7, los + depth, f * FIELD_W); if (e) e.job = { type: 'zone', x: los + depth, y: f * FIELD_W, w }; }
      for (const e of [...free]) { e.job = { type: 'zone', x: los + 7, y: m.ballY, w: 8 }; free.delete(e); }
    }
    const scale = cpuDefends() ? D : DIFFICULTY.pro;
    // A play the defense has already seen several times gets jumped: quicker reads, tighter coverage.
    const seen = O().called?.[m.play.id] || 0, known = clamp((seen - 1) * 0.14, 0, 0.5) * (cpuDefends() ? 0.6 + D.adapt * 0.5 : 0.8);
    m.recognized = known;
    for (const e of def) {
      const aware = att(e.p, 'awareness');
      e.react = clamp(0.3 - (aware - 70) * 0.006, 0.12, 0.6) * scale.react * (1 - known);
      e.lagScale = scale.lag * (1 - known * 0.8);
      e.home = e.job;
    }
  }

  /* ---------- play calling ---------- */
  function setCall(playId, flip, defenseId, keepLook = false) {
    m.play = PLAY[playId] || PLAYBOOK[0];
    m.flip = flip < 0 ? -1 : 1;
    if (!keepLook) {
      m.dcall = DCALL[defenseId] || DCALL.cover3;
      // A disguised shell shows a different safety look until the snap.
      m.shell = cpuDefends() && rng() < D.disguise ? (m.dcall.shell === 2 ? 1 : 2) : m.dcall.shell;
      m.disguised = m.shell !== m.dcall.shell;
    }
    lineUp();
    m.phase = 'presnap';
    m.snapTimer = isHuman(1 - m.off) && !m.coach ? 1.8 : 1.1;
  }

  function situation() {
    const toGo = m.firstAt - m.los, lead = O().score - Df().score;
    const late = m.quarter >= 4 && m.clock < 150;
    return { toGo, lead, late, redZone: m.los >= 80, goal: m.los >= 95, long: toGo >= 8, short: toGo <= 2 };
  }

  function weighted(options) {
    let total = 0;
    for (const [, w] of options) total += Math.max(0, w);
    let r = rng() * total;
    for (const [value, w] of options) { r -= Math.max(0, w); if (r <= 0) return value; }
    return options[options.length - 1][0];
  }

  function aiOffensePlay() {
    const s = situation(), scheme = O().team.scheme?.offense || '', coach = O().team.coaches?.offense?.playCalling || 70;
    let runW = ['Power Run', 'Zone Run'].includes(scheme) ? 0.52 : scheme === 'Vertical' ? 0.32 : 0.42;
    if (m.down === 1) runW += 0.06;
    if (s.short) runW += 0.25;
    if (s.long && m.down >= 2) runW -= 0.25;
    if (m.down === 3 && s.toGo > 4) runW -= 0.2;
    if (s.late && s.lead < 0) runW -= 0.3;
    if (s.late && s.lead > 0) runW += 0.3;
    if (m.conv) runW = 0.4;
    const wantRun = rng() < clamp(runW, 0.05, 0.92);
    const options = PLAYBOOK.filter(p => (p.type === 'run') === wantRun).map(p => {
      let w = 1 + (p.fits?.includes(scheme) ? 0.8 + (coach - 70) * 0.01 : 0);
      if (p.id === 'sneak') w = s.toGo <= 1 ? 1.4 : 0;
      if (p.id === 'dive') w = s.short || s.goal ? 2 : 0.2;
      if (p.id === 'draw') w *= s.long ? 1.6 : 0.5;
      if (p.cat === 'deep') w *= s.long ? 1.7 : s.short || s.goal ? 0.25 : 1;
      if (p.cat === 'quick') w *= s.short || s.redZone ? 1.6 : s.toGo > 12 ? 0.6 : 1.1;
      if (p.cat === 'action') w *= m.down === 1 ? 1.4 : s.long ? 0.5 : 0.9;
      if (p.form === 'heavy' && !s.short && !s.goal) w *= 0.15;
      return [p.id, w];
    });
    return weighted(options);
  }

  function aiDefenseCall() {
    const s = situation(), scheme = Df().team.scheme?.defense || '', t = O().tendency;
    const seen = t.run + t.pass, adapt = cpuDefends() ? D.adapt : 0.5;
    const runLean = seen >= 6 ? (t.run / seen - 0.42) * adapt : 0, deepLean = t.pass >= 5 ? (t.deep / t.pass - 0.3) * adapt : 0;
    const w = { cover3: 2.2, cover2: 1.6, quarters: 0.9, man1: 1.7, blitz0: 0.5, fire: 0.9, stuff: 0.7 };
    if (scheme === 'Blitz') { w.blitz0 += 0.7; w.fire += 0.9; }
    if (scheme === 'Coverage') { w.quarters += 0.8; w.cover2 += 0.6; w.cover3 += 0.4; }
    if (scheme === 'Nickel') { w.man1 += 0.6; w.cover2 += 0.4; }
    if (scheme === '4-3') { w.cover3 += 0.5; w.stuff += 0.3; }
    if (scheme === '3-4') { w.fire += 0.6; w.man1 += 0.3; }
    if (s.short || s.goal) { w.stuff += 2.2; w.man1 += 0.8; w.quarters = 0.1; w.blitz0 += 0.5; }
    if (s.long && m.down >= 2) { w.quarters += 1.4; w.cover2 += 0.8; w.stuff = 0.05; w.fire += 0.5; }
    if (m.down === 3 && s.toGo > 3) { w.blitz0 += 0.5; w.man1 += 0.5; }
    if (s.late && s.lead < 0) { w.quarters += 1.5; w.stuff = 0.05; }
    w.stuff += runLean * 5; w.cover3 += runLean * 2; w.quarters += deepLean * 5 - runLean * 2; w.cover2 -= deepLean * 2;
    // Scouting: lean toward the call that beats what this offense keeps running.
    const cats = O().catCount || {}, total = Object.values(cats).reduce((a, b) => a + b, 0);
    if (total >= 4) {
      const share = k => (cats[k] || 0) / total, push = Math.max(adapt, 0.35) * 9;
      w.quarters += Math.max(0, share('deep') - 0.3) * push; w.cover2 += Math.max(0, share('deep') - 0.3) * push * 0.4; w.man1 -= Math.max(0, share('deep') - 0.3) * 2; w.cover3 -= Math.max(0, share('deep') - 0.3) * 2;
      w.cover2 += Math.max(0, share('quick') - 0.3) * push; w.fire += Math.max(0, share('quick') - 0.3) * push * 0.3; w.man1 -= Math.max(0, share('quick') - 0.3) * 2; w.blitz0 -= Math.max(0, share('quick') - 0.3);
      w.stuff += Math.max(0, share('run') - 0.4) * push;
      w.cover3 += Math.max(0, share('action') - 0.3) * push * 0.6;
    }
    return weighted(Object.entries(w));
  }

  /** Three situational suggestions from the offensive coordinator: a safe call, a chain-mover and a shot. */
  function suggest() {
    if (m.suggested) return m.suggested;
    const s = situation(), off = O(), scheme = off.team.scheme?.offense || '', used = off.called ||= {};
    const runFirst = ['Power Run', 'Zone Run'].includes(scheme);
    const pool = test => PLAYBOOK.filter(p => test(p) && (p.form !== 'heavy' || s.short || s.goal) && (p.id !== 'sneak' || s.toGo <= 1));
    const runs = pool(p => p.type === 'run' && p.id !== 'draw'), quick = pool(p => p.cat === 'quick'), deep = pool(p => p.cat === 'deep'), action = pool(p => p.cat === 'action'), change = pool(p => ['draw', 'screen', 'bubble'].includes(p.id));
    const hurry = s.late && s.lead < 0;
    let slots;
    if (s.short || s.goal) slots = [runs.filter(p => ['dive', 'sneak', 'power', 'inside'].includes(p.id)), runFirst ? runs : quick, action.filter(p => p.pa).concat(quick)];
    else if (hurry) slots = [quick, deep, deep.concat(action)];
    else if (s.long && m.down >= 2) slots = [change, quick.concat(deep), deep];
    else slots = [runs, quick, m.down === 1 ? action.concat(deep) : deep.concat(action)];
    const picks = [];
    for (const list of slots) {
      const options = (list.length ? list : PLAYBOOK).filter(p => !picks.includes(p.id)).map(p => [p.id, (p.fits?.includes(scheme) ? 2 : 1) / (1 + (used[p.id] || 0) * 0.7) * (p.id === off.lastCall ? 0.2 : 1)]);
      if (options.length) picks.push(weighted(options));
    }
    return (m.suggested = picks);
  }

  function fieldGoalChance() {
    const k = pickPlayer(O(), 'K'), d = 100 - m.los + 17;
    return clamp(0.99 - Math.max(0, d - 25) ** 2 * 0.00042 + (att(k, 'kickAccuracy') - 70) * 0.004 + (d > 45 ? (att(k, 'kickPower') - 70) * 0.004 : 0), 0.02, 0.99);
  }

  function aiFourthDown() {
    const s = situation(), desperate = m.quarter >= 4 && s.lead < 0 && m.clock < 200;
    if (desperate && !(s.lead >= -3 && m.los >= 62)) return 'go';
    if (m.los >= 62 && (s.toGo > 1.5 || m.los < 95)) return 'fg';
    if (s.toGo <= 1.5 && m.los >= 42) return 'go';
    return m.los >= 62 ? 'fg' : 'punt';
  }

  /* ---------- movement primitives ---------- */
  function steer(e, tx, ty, frac = 1, arrive = false) {
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    if (d < 0.08) { e.dvx = e.dvy = 0; return; }
    let sp = e.max * frac;
    if (arrive && d < 2) sp *= Math.max(0.15, d / 2);
    e.dvx = dx / d * sp; e.dvy = dy / d * sp;
  }
  function integrate(e, dt, boost = 1) {
    if (e.stun > 0) { e.vx *= 0.8; e.vy *= 0.8; return; }
    const slow = e.beaten > 0 ? 0.35 : e.slow > 0 ? 0.6 : 1;
    const ax = e.dvx * slow - e.vx, ay = e.dvy * slow - e.vy, a = Math.hypot(ax, ay), maxA = e.acc * boost * dt;
    if (a > maxA) { e.vx += ax / a * maxA; e.vy += ay / a * maxA; } else { e.vx = e.dvx * slow; e.vy = e.dvy * slow; }
    e.x += e.vx * dt; e.y += e.vy * dt;
  }
  const holder = () => m.carrier;
  const freeDefender = e => e.team && e.stun <= 0 && !e.eng;

  /* ---------- offense AI ---------- */
  function projectRoute(r, time) {
    // Where the receiver will be after `time` seconds if he keeps running his route.
    const job = r.job;
    if (job.type !== 'route') return { x: r.x + r.vx * time, y: r.y + r.vy * time };
    let x = r.x, y = r.y, left = Math.max(0, time - Math.max(0, job.delay - m.t)) * r.max * 0.92, i = job.i;
    while (left > 0 && i < job.pts.length) {
      const p = job.pts[i], d = Math.hypot(p.x - x, p.y - y);
      if (d > left) { x += (p.x - x) / d * left; y += (p.y - y) / d * left; left = 0; } else { x = p.x; y = p.y; left -= d; i++; }
    }
    if (left > 0 && !job.stop && job.pts.length) {
      const b = job.pts[job.pts.length - 1], a = job.pts[job.pts.length - 2] || { x: r.sx, y: r.sy }, d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      x += (b.x - a.x) / d * left; y += (b.y - a.y) / d * left;
    }
    return { x: Math.min(x, 108), y: clamp(y, 1.2, FIELD_W - 1.2) };
  }
  function leadPoint(r, speed) {
    let T = { x: r.x, y: r.y };
    for (let i = 0; i < 3; i++) T = projectRoute(r, dist(qb, T) / speed + 0.12);
    return T;
  }
  /** Yards of separation the receiver should have when a throw arrives. */
  function openness(r, speed = 21) {
    const T = leadPoint(r, speed), tf = dist(qb, T) / speed + 0.12;
    let best = 9, lane = false;
    for (const d of ents) {
      if (!d.team || d.stun > 0) continue;
      if (d.eng && d.job.type === 'rush') continue;
      const reach = dist(d, T) - d.max * Math.max(0, tf - 0.35) * (d.job.type === 'man' && d.job.r === r ? 0.35 : 0.8);
      if (reach < best) best = reach;
      // A defender sitting in the throwing lane threatens a bullet pass.
      const px = T.x - qb.x, py = T.y - qb.y, len2 = px * px + py * py || 1, u = ((d.x - qb.x) * px + (d.y - qb.y) * py) / len2;
      if (u > 0.25 && u < 0.9 && Math.hypot(qb.x + px * u - d.x, qb.y + py * u - d.y) < 1.4 && !d.eng) lane = true;
    }
    return { sep: lane ? Math.min(best, 1) : best, lane, T, tf };
  }

  const nearestDefender = (e, range = 9) => { let near = null, nd = range; for (const d of ents) if (freeDefender(d)) { const dd = dist(d, e); if (dd < nd) { nd = dd; near = d; } } return { near, nd }; };
  const manOn = r => ents.find(d => d.team && d.job.type === 'man' && d.job.r === r);
  const savvy = e => (att(e.p, 'routeRunning') + att(e.p, 'awareness')) / 2;

  function routeThink(e) {
    const job = e.job, craft = savvy(e), elite = craft >= 80;
    if (m.t < job.delay) { if (m.play.screen) steer(e, e.sx, e.sy + Math.sign(job.pts[0].y - e.sy) * 0.8, 0.4, true); return; }
    // Scramble drill: once the play breaks down, receivers work to open grass. Better route runners react sooner.
    const broken = !m.play.screen && (Math.abs(qb.y - m.ballY) > 6 || m.t > (elite ? 3.1 : 4.3));
    if (broken && job.i >= Math.min(1, job.pts.length)) {
      if (!job.improv || m.t > job.improv.until) {
        const { near } = nearestDefender(e, 12), deep = e.x - m.los > 12;
        let dx = deep ? -0.5 : 0.8, dy = Math.sign(qb.y - e.y) * 0.5;
        if (near) { const l = dist(near, e) || 1; dx += (e.x - near.x) / l * 1.4; dy += (e.y - near.y) / l * 1.4; }
        const l = Math.hypot(dx, dy) || 1;
        if (!job.improv && elite) event('craft', { receiver: e, text: 'WORKS OPEN' });
        job.improv = { x: clamp(e.x + dx / l * 6, m.los + 1, 108), y: clamp(e.y + dy / l * 6, 2, FIELD_W - 2), until: m.t + 0.7 };
      }
      steer(e, job.improv.x, job.improv.y, 0.9, true);
      return;
    }
    // Double move: an elite receiver sells a break on a vertical stem and the man defender bites.
    if (elite && !job.sold && ['go', 'fade', 'post', 'corner', 'wheel'].includes(job.name) && e.x - m.los > 6.5 && e.x - m.los < 9) {
      job.sold = true;
      const d = manOn(e);
      if (d && rng() < clamp(0.45 + (craft - att(d.p, 'coverage')) * 0.02, 0.15, 0.9)) { e.slow = 0.16; d.biteUntil = m.t + 0.9; d.job.c = 0.4; event('craft', { receiver: e, text: 'DOUBLE MOVE' }); }
    }
    if (job.i < job.pts.length) {
      const p = job.pts[job.i];
      if (Math.hypot(p.x - e.x, p.y - e.y) < 0.9) job.i++;
      steer(e, p.x, p.y, 1, job.stop && job.i >= job.pts.length - 1);
      return;
    }
    if (job.stop) {
      // Settle, then drift away from the nearest defender to stay available.
      const { near } = nearestDefender(e, 5), p = job.pts[job.pts.length - 1];
      if (near && m.t > 2.2) steer(e, clamp(e.x, p.x - 2, p.x + 2), e.y + Math.sign(e.y - near.y || 1) * 2, 0.45); else steer(e, p.x, p.y, 0.6, true);
      return;
    }
    // Against zone, a smart receiver throttles down in the hole between defenders instead of running into the next one.
    if (craft >= 76 && ['dig', 'drag', 'cross', 'slant', 'out'].includes(job.name) && !manOn(e)) {
      const { nd } = nearestDefender(e, 9);
      if (nd > (elite ? 4.2 : 5.2) && e.x > m.los + 2) {
        if (!job.sat) { job.sat = true; if (elite) event('craft', { receiver: e, text: 'SITS IN THE HOLE' }); }
        steer(e, e.x, e.y, 0); e.dvx = e.vx * 0.2; e.dvy = e.vy * 0.2;
        return;
      }
    }
    const b = job.pts[job.pts.length - 1], a = job.pts[job.pts.length - 2] || { x: e.sx, y: e.sy }, d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    let tx = e.x + (b.x - a.x) / d * 10, ty = e.y + (b.y - a.y) / d * 10;
    if (ty < 2.5 || ty > FIELD_W - 2.5) { ty = clamp(ty, 2.5, FIELD_W - 2.5); tx = e.x + 10; }
    if (e.x > 107) tx = 108;
    steer(e, tx, ty);
  }

  function blockSkill(b, mode) { return (att(b.p, mode === 'pass' ? 'passBlock' : 'runBlock') * 0.75 + att(b.p, 'strength') * 0.25) - (BLOCK_PENALTY[b.pos] || 0); }
  function shedSkill(d, mode) { return (att(d.p, mode === 'pass' ? 'passRush' : 'blockShedding') * 0.75 + att(d.p, 'strength') * 0.25) - (SHED_PENALTY[d.pos] || 0); }

  function assignBlocks() {
    const play = m.play, defenders = ents.filter(e => e.team), by = m.ballY;
    const taken = new Set();
    const nearest = (b, list, maxLat = 99) => { let best = null, bd = 1e9; for (const d of list) { if (taken.has(d) || Math.abs(d.y - b.y) > maxLat) continue; const dd = Math.hypot(d.x - b.x, (d.y - b.y) * 1.4); if (dd < bd) { bd = dd; best = d; } } if (best) taken.add(best); return best; };
    if (play.run && !play.run.draw) {
      const holeY = by + play.run.hole * m.flip;
      m.holeY = holeY;
      const frontLine = defenders.filter(d => d.role === 'dl'), second = defenders.filter(d => d.role === 'lb' || (d.role === 's' && d.x < m.los + 8));
      const pullIndex = play.run.pull ? ((play.run.pull === 'strong') === (m.flip > 0) ? 3 : 1) : -1;
      for (const b of ents.filter(e => e.role === 'ol')) {
        if (b.oi === pullIndex) { b.job = { type: 'lead', hx: m.los + 0.5, hy: holeY, mode: 'run' }; continue; }
        const target = nearest(b, frontLine, 3.6) || nearest(b, second, 7) || nearest(b, defenders);
        b.job = { type: 'block', target, mode: 'run' };
      }
      for (const b of ents.filter(e => e.role === 'skill' && e !== runner())) {
        if (b.key === play.run.lead) { b.job = { type: 'lead', hx: m.los + 2, hy: holeY, mode: 'run' }; continue; }
        const pool = b.pos === 'TE' ? frontLine.concat(second) : defenders.filter(d => d.role === 'cb' || d.role === 's');
        b.job = { type: 'block', target: nearest(b, pool.concat(defenders)), mode: 'run' };
      }
    } else {
      // Big on big: the line takes the down linemen first, so any free rusher is a blitzer coming from depth.
      const rushers = defenders.filter(d => d.job.type === 'rush').sort((a, b) => (a.role !== 'dl') - (b.role !== 'dl') || Math.abs(a.y - by) - Math.abs(b.y - by));
      const line = ents.filter(e => e.role === 'ol'), assigned = new Set();
      for (const d of rushers) {
        let best = null, bd = 5.2;
        for (const b of line) if (!assigned.has(b) && Math.abs(b.y - d.y) < bd) { bd = Math.abs(b.y - d.y); best = b; }
        if (best) { assigned.add(best); taken.add(d); best.job = { type: 'block', target: d, mode: 'pass' }; }
      }
      for (const b of line) if (!assigned.has(b)) b.job = { type: 'block', target: null, mode: 'pass' };
      // A back on a short route stays in when a rusher would otherwise come free.
      if (!play.screen) for (const b of ents.filter(e => e.back && e.job.type === 'route' && ['check', 'flat', 'swing', 'angle'].includes(e.job.name))) {
        const free = rushers.filter(d => !taken.has(d)).sort((x, y) => dist(x, qb) - dist(y, qb))[0];
        if (free) { taken.add(free); b.job = { type: 'block', target: free, mode: 'pass', back: true, pickup: true }; }
      }
      for (const b of ents.filter(e => e.role === 'skill' && e.job.type === 'block' && !e.job.pickup)) {
        const wide = Math.abs(b.y - by) > 9;
        b.job = wide ? { type: 'block', target: nearest(b, defenders.filter(d => d.role === 'cb' || d.role === 's')), mode: 'run' }
          : { type: 'block', target: nearest(b, rushers.filter(d => !taken.has(d))), mode: 'pass', back: true };
      }
    }
  }
  const runner = () => (m.play.run ? (m.play.run.carrier === 'QB' ? qb : ents.find(e => e.key === 'RB')) : null);

  function blockThink(b) {
    const job = b.job, c = holder();
    if (b.eng || b.beaten > 0) return;
    if (job.type === 'lead') {
      // Pullers and lead blockers run to the hole, then hit the first free defender there.
      const threat = pickThreat(b, 5.5);
      if (b.x >= job.hx - 1.2 && Math.abs(b.y - job.hy) < 3.5 || m.t > 1.4) {
        if (threat) { job.target = threat; engageOrChase(b, threat, 'run'); } else steer(b, b.x + 6, c ? lerp(b.y, c.y, 0.3) : b.y, 0.9);
      } else if (threat && dist(threat, b) < 2) engageOrChase(b, threat, 'run');
      else steer(b, job.hx, job.hy);
      return;
    }
    let target = job.target;
    const lost = !target || target.stun > 0 || (target.eng && target.eng !== b) || (job.mode === 'pass' && target.job.type !== 'rush' && target.job.type !== 'pursue');
    if (lost) target = job.target = pickThreat(b, job.mode === 'pass' ? 7 : 9, job.mode === 'pass');
    if (!target) {
      if (job.mode === 'pass') steer(b, Math.min(b.sx, m.los - 1.2), b.sy, 0.5, true);
      else steer(b, b.x + 5, c ? lerp(b.y, c.y, 0.4) : b.y, 0.8);
      return;
    }
    engageOrChase(b, target, job.mode);
  }
  function pickThreat(b, range, rushOnly = false) {
    let best = null, bd = range;
    for (const d of ents) {
      if (!d.team || d.stun > 0 || d.eng) continue;
      if (rushOnly && d.job.type !== 'rush' && d.job.type !== 'pursue') continue;
      const dd = dist(d, b);
      if (dd < bd && d.x > b.x - 2.5) { bd = dd; best = d; }
    }
    return best;
  }
  function engageOrChase(b, d, mode) {
    const dd = dist(b, d);
    // A block only sticks when the blocker is in the defender's path, not chasing him from behind.
    const dv = Math.hypot(d.vx, d.vy), inPath = dv < 1.5 || ((b.x - d.x) * d.vx + (b.y - d.y) * d.vy) / (dv * (dd || 1)) > 0.25;
    if (dd < 1.3 && !d.eng && inPath) { b.eng = d; d.eng = b; b.engT = 0; b.engMode = mode; b.openField = b.role !== 'ol' || d.x > m.los + 4; return; }
    if (mode === 'pass') {
      // Stay between the rusher and the passer rather than charging upfield.
      // Slide to the nearest point on the rusher's path to the passer and wait for him there.
      const c = holder() || qb, vx = c.x - d.x, vy = c.y - d.y, l2 = vx * vx + vy * vy || 1;
      const u = clamp(((b.x - d.x) * vx + (b.y - d.y) * vy) / l2, Math.min(0.12, 1.1 / Math.sqrt(l2)), 0.8);
      steer(b, Math.min(d.x + vx * u, m.los + 0.4), d.y + vy * u, 1);
    } else steer(b, d.x + d.vx * 0.25, d.y + d.vy * 0.25);
  }

  function resolveEngagements(dt) {
    const c = holder();
    for (const b of ents) {
      if (b.team || !b.eng) continue;
      const d = b.eng, mode = b.engMode;
      if (d.stun > 0) { b.eng = d.eng = null; continue; }
      b.engT += dt;
      let helped = 0;
      for (const o of ents) if (!o.team && o !== b && !o.eng && o.job.type === 'block' && dist(o, d) < 1.5) helped = 8;
      const adv = blockSkill(b, mode) - shedSkill(d, mode) + helped;
      let px, py, v, hazard;
      if (mode === 'pass') {
        const target = c || qb, vx = target.x - d.x, vy = target.y - d.y, l = Math.hypot(vx, vy) || 1;
        px = vx / l; py = vy / l;
        v = clamp(1.0 - adv * 0.035, 0.25, 2.4);
        hazard = 0.085 * Math.exp(-adv / 14) * (1 + Math.max(0, m.t - 2.8) * 1.2);
        if (c && Math.abs(c.y - m.ballY) > 7) hazard += 0.7;
        d.x += px * v * dt; d.y += py * v * dt;
        b.x = d.x + px * 0.95; b.y = d.y + py * 0.95;
      } else {
        // Drive the defender away from the hole.
        const holeY = m.holeY ?? (c ? c.y : m.ballY), sideSign = Math.sign(d.y - holeY) || (b.oi < 2 ? -1 : 1);
        px = 0.45; py = sideSign * 0.9; const l = Math.hypot(px, py); px /= l; py /= l;
        v = clamp(1.35 + adv * 0.045, -0.3, 2.5);
        hazard = 0.24 * Math.exp(-adv / 14);
        d.x += px * v * dt; d.y += py * v * dt;
        b.x = d.x - px * 0.95; b.y = d.y - py * 0.95;
      }
      d.vx = px * v; d.vy = py * v; b.vx = d.vx; b.vy = d.vy;
      if (b.openField) hazard = hazard * 2.5 + 0.35;
      if (c && c !== qb && dist(c, d) < 4.5) hazard += b.openField ? 3.2 : 0.6;
      if (c === qb && m.play.type !== 'run' && qb.x > m.los) hazard += 1.2;
      if (rng() < hazard * dt) { b.eng = d.eng = null; b.beaten = 1.1; d.slow = 0.25; if (mode === 'pass') event('pressure'); }
    }
  }

  function aiCarry(c) {
    let gx = 1, gy = 0;
    if (m.play.run && c.x < m.los + 1 && m.holeY !== undefined) {
      const dx = m.los + 2 - c.x, dy = m.holeY - c.y, l = Math.hypot(dx, dy) || 1;
      gx = dx / l; gy = dy / l * 1.3;
    }
    let nearest = null, nd = 9;
    for (const d of ents) {
      if (!freeDefender(d)) continue;
      const dx = d.x + d.vx * 0.2 - c.x, dy = d.y + d.vy * 0.2 - c.y, dd = Math.hypot(dx, dy);
      if (dd > 9 || dx < -2) continue;
      const w = 3 / (dd * dd + 0.6);
      gx -= dx / dd * w * 0.3; gy -= dy / dd * w;
      if (dd < nd) { nd = dd; nearest = d; }
    }
    if (c.y < 4) gy += (4 - c.y) * 0.5;
    if (c.y > FIELD_W - 4) gy -= (c.y - (FIELD_W - 4)) * 0.5;
    gx = Math.max(gx, 0.3);
    const l = Math.hypot(gx, gy);
    c.dvx = gx / l * c.max; c.dvy = gy / l * c.max;
    if (nearest && nd < 1.9 && c.jcd <= 0 && rng() < 0.03 + (att(c.p, 'agility') - 60) * 0.0012) juke(c, Math.sign(c.y - nearest.y) || 1);
  }

  function juke(c, dir) {
    if (c.jcd > 0) return false;
    c.jukeT = 0.36; c.jcd = 1.0;
    c.vy += dir * 4.2; c.vx *= 0.78;
    event('juke');
    return true;
  }

  function aiQuarterback(dt) {
    const play = m.play, q = qb, noise = (m.off === m.user ? 1 : D.qbNoise) * (100 - att(q.p, 'decisionMaking')) / 28;
    let rusher = null, rd = 9;
    for (const d of ents) if (freeDefender(d)) { const dd = dist(d, q); if (dd < rd) { rd = dd; rusher = d; } }
    const dropX = m.los - play.drop, dropY = play.boot ? m.ballY + m.flip * 8 : m.ballY;
    if (q.scramble) { aiCarry(q); return; }
    // Hold the drop point, sliding away from the nearest free rusher.
    let tx = dropX, ty = dropY;
    if (rusher && rd < 4.5) { const l = rd || 1, aware = (att(q.p, 'pocketAwareness') - 50) / 50; tx += (q.x - rusher.x) / l * 2 * aware; ty += (q.y - rusher.y) / l * 2.5 * aware; }
    steer(q, clamp(tx, m.los - 10, m.los - 1), ty, play.boot ? 0.85 : 0.7, !play.boot);
    const ready = play.ready + (play.pa ? 0.55 : 0), pressured = rusher && rd < 2.8;
    // A free rusher forces the hot throw before the routes have developed.
    if (m.t < (pressured ? Math.min(ready, play.pa ? 1.1 : 0.8) : ready)) return;
    q.think = (q.think || 0) - dt;
    if (q.think > 0) return;
    q.think = 0.14;
    // Feeling the rush is a skill: a quarterback with poor pocket awareness holds the ball.
    if (pressured && m.t < ready && rng() > (att(q.p, 'pocketAwareness') - 30) / 140) return;
    if (play.quick) { const r = ents.find(e => e.key === play.quick); if (r) { throwBall(r, false); return; } }
    if (play.screen && m.t < 1.15) return;
    let best = null, bv = -9, bo = null;
    for (const r of m.targets) {
      if (r.stun > 0 || (m.t < r.job.delay + 0.3)) continue;
      const o = openness(r), gain = o.T.x - m.los;
      let v = o.sep + gauss() * noise + clamp(gain, -3, 30) * 0.035 + (o.T.x >= m.firstAt ? 0.5 : 0) - (o.lane ? 0.8 : 0);
      if (play.screen && r.key === 'RB') v += 3;
      if (r.job.i === 0 && !r.job.stop && gain < 3 && !play.screen) v -= 1;
      if (v > bv) { bv = v; best = r; bo = o; }
    }
    const elapsed = m.t - ready, threshold = lerp(3.0, 1.1, clamp(elapsed / 2.2, 0, 1));
    if (best && (bv > threshold || (pressured && bv > 0.9))) { throwBall(best, bo.lane && bo.sep > 1.5 || bo.T.x - q.x > 24); return; }
    if (pressured || elapsed > 3.2) {
      if (att(q.p, 'mobility') > 66 + rng() * 22 || elapsed > 3.8) { q.scramble = true; return; }
      if (rng() < (att(q.p, 'pocketAwareness') - 35) / 90) { throwAway(); return; }
      if (best && bv > 0.2) throwBall(best, false);
    }
  }

  /* ---------- defense AI ---------- */
  function pursue(d, c, leverage = 0) {
    // Aim at where the ball will be, with a closing burst once a defender has committed.
    const t = clamp(dist(d, c) / d.max, 0, 1.1) * 0.85;
    steer(d, c.x + c.vx * t + leverage, c.y + c.vy * t, 1.05);
  }
  function sample(r, lag) {
    const want = m.t - lag, h = r.hist;
    for (let i = h.length - 1; i >= 0; i--) if (h[i].t <= want) return h[i];
    return h[0] || { x: r.x, y: r.y, vx: 0, vy: 0 };
  }

  function defenseThink(d) {
    const c = holder(), play = m.play, job = d.job;
    if (d.eng || d.stun > 0) return;
    if (d === m.userEnt && m.t - m.steeredAt < 0.5 && isHuman(1 - m.off) && !m.coach) return;
    const run = play.type === 'run', handoff = play.run?.handoff || 0;
    if (m.ball.air) {
      const b = m.ball;
      if (m.t >= d.breakAt && dist(d, { x: b.tx, y: b.ty }) < 16 && job.type !== 'rush') { steer(d, b.tx + (job.deep ? 0.6 : 0), b.ty); return; }
      if (job.type === 'rush') { steer(d, b.tx, b.ty, 0.8); return; }
    } else if (c && job.type !== 'rush') {
      // Read the play: come up against a run, a scramble or a completed catch.
      const live = c !== qb || qb.x > m.los - 0.5 || (run && play.run.carrier === 'QB');
      if (live) {
        d.readAt ??= m.t + (run ? d.react + (d.role === 'cb' ? 0.3 : d.role === 's' ? 0.12 : 0) - (m.dcall.box ? d.react * 0.5 : 0) + (play.run.counter && d.role === 'lb' ? 0.3 : 0) : d.react * 0.4);
        if (m.t >= d.readAt) { pursue(d, c, job.deep ? 1.5 : 0); return; }
      }
    }
    if (job.type === 'rush') {
      const target = c || qb;
      // Edge rushers keep outside contain instead of running straight at the passer.
      const contain = d.pos === 'EDGE' && target === qb && d.x < qb.x + 6 ? Math.sign(d.sy - m.ballY) * 1.4 : 0;
      if (m.play.draw && m.t < handoff) steer(d, qb.x, qb.y + contain); else pursue(d, target, 0), d.dvy += contain;
      return;
    }
    // Play-action and run looks freeze linebackers and safeties until they read it.
    if ((play.pa || run) && !play.run?.draw && d.role !== 'cb' && !job.deep) {
      const bite = play.pa ? 0.5 + d.react * 1.6 : handoff + d.react;
      if (m.t < bite) {
        const fakeY = play.run?.counter ? m.ballY - Math.sign(play.run.hole) * m.flip * 4 : d.y;
        if (run && !play.run.counter) steer(d, d.sx - 0.6, d.sy, 0.3, true); else steer(d, m.los + 1.8, lerp(d.y, fakeY, 0.5), 0.6);
        return;
      }
    }
    if (job.type === 'man') manCover(d, job);
    else if (job.type === 'zone') zoneCover(d, job);
  }

  function manCover(d, job) {
    const r = job.r;
    if (r.job.type === 'block' && m.t > 1.1) { d.job = { type: 'rush', blitz: true }; return; }
    const lag = clamp(0.19 + (att(r.p, 'routeRunning') - att(d.p, 'coverage')) * 0.004, 0.08, 0.38) * d.lagScale + (m.t < (d.biteUntil || 0) ? 0.22 : 0);
    const past = sample(r, lag);
    // Stay on top of a vertical stem; close hard once the receiver breaks or settles.
    const vertical = past.vx > r.max * 0.6 || m.t < 0.7;
    job.c = vertical ? Math.max(1.4, (job.c ?? job.cushion) - m.dt * 1.2) : Math.max(0.3, (job.c ?? job.cushion) - m.dt * 7);
    const cushion = job.c;
    const inside = Math.sign(m.ballY - past.y) * 0.5;
    steer(d, past.x + past.vx * lag + cushion, past.y + past.vy * lag + inside);
  }

  function zoneCover(d, z) {
    let tx = z.x, ty = z.y, threat = null, score = 1e9, deepest = m.los, deepY = 0, deepN = 0;
    for (const r of ents) {
      if (r.team || r.role !== 'skill' || r.job.type === 'block') continue;
      if (Math.abs(r.y - z.y) < z.w * 1.6) deepest = Math.max(deepest, r.x);
      if (Math.abs(r.y - z.y) > z.w) continue;
      if (z.deep && r.x > m.los + 6) { deepY += r.y + r.vy * 0.3; deepN++; }
      // Underneath defenders carry a vertical route through their zone rather than letting it run free.
      const s = z.deep ? (r.x > m.los + 6 ? -r.x : 1e9) : (r.x - z.x > -7 && r.x - z.x < 11 ? Math.hypot(r.x - z.x, r.y - z.y) : 1e9);
      if (s < score) { score = s; threat = r; }
    }
    if (z.deep) {
      // Never let a receiver get behind a deep zone; with two threats, split them.
      tx = Math.max(z.x, deepest + 2.2);
      if (deepN) ty = lerp(z.y, deepY / deepN, 0.75);
    } else if (threat) {
      // On a play the defense has seen before, he breaks to where the route is going, not where it is.
      const next = m.recognized > 0.1 && threat.job.type === 'route' ? threat.job.pts[Math.min(threat.job.i, threat.job.pts.length - 1)] : null, k = next ? Math.min(0.8, m.recognized * 1.8) : 0;
      const px = next ? lerp(threat.x, next.x, k) : threat.x + threat.vx * 0.25, py = next ? lerp(threat.y, next.y, k) : threat.y + threat.vy * 0.25;
      tx = lerp(z.x, px, 0.72 + k * 0.2) + 0.9 - k;
      ty = lerp(z.y, py, 0.72 + k * 0.2);
    } else if (z.robber) { ty = lerp(z.y, qb.y, 0.5); }
    steer(d, tx, ty, 0.95, true);
  }

  /* ---------- ball ---------- */
  /** Where a throw to this receiver is aimed and how far it may miss (one standard deviation, in yards). */
  function throwSpec(r, lob) {
    const q = qb, off = O(), arm = att(q.p, 'armStrength'), speed = (lob ? 15.5 : 22) + (arm - 70) * 0.1;
    let T = leadPoint(r, speed), d = dist(q, T);
    const range = 42 + (arm - 70) * 0.55;
    if (d > range) { T = { x: q.x + (T.x - q.x) * range / d, y: q.y + (T.y - q.y) * range / d }; d = range; }
    const scheme = off.team.scheme?.offense, fit = m.play.fits?.includes(scheme) ? 2.5 : 0;
    const accuracy = att(q.p, d < 12 ? 'shortAccuracy' : d < 25 ? 'mediumAccuracy' : 'deepAccuracy') + fit + ((off.team.coaches?.offense?.offense || 70) - 70) * 0.05;
    let sigma = d * (0.016 + (100 - accuracy) * 0.001) + 0.2;
    let pressure = false;
    for (const e of ents) if (freeDefender(e) && dist(e, q) < 2.4) pressure = true;
    if (pressure) sigma *= 1.5;
    const moving = Math.hypot(q.vx, q.vy);
    if (moving > 2.5) sigma *= 1 + (moving / q.max) * (1.2 - att(q.p, 'throwOnRun') / 100);
    if (lob) sigma *= 1.12;
    return { T, d, sigma, speed, pressure };
  }
  /** A throw aimed at a spot on the field: who can get there, and how far it may miss. */
  function spotSpec(spot, lob) {
    const q = qb, off = O(), arm = att(q.p, 'armStrength'), speed = (lob ? 15.5 : 22) + (arm - 70) * 0.1;
    let T = { x: clamp(spot.x, m.los - 12, 109), y: clamp(spot.y, 0.5, FIELD_W - 0.5) }, d = dist(q, T);
    const range = 42 + (arm - 70) * 0.55;
    if (d > range) { T = { x: q.x + (T.x - q.x) * range / d, y: q.y + (T.y - q.y) * range / d }; d = range; }
    const scheme = off.team.scheme?.offense, fit = m.play.fits?.includes(scheme) ? 2.5 : 0;
    const accuracy = att(q.p, d < 12 ? 'shortAccuracy' : d < 25 ? 'mediumAccuracy' : 'deepAccuracy') + fit + ((off.team.coaches?.offense?.offense || 70) - 70) * 0.05;
    let sigma = d * (0.016 + (100 - accuracy) * 0.001) + 0.2, pressure = false;
    for (const e of ents) if (freeDefender(e) && dist(e, q) < 2.4) pressure = true;
    if (pressure) sigma *= 1.5;
    const moving = Math.hypot(q.vx, q.vy);
    if (moving > 2.5) sigma *= 1 + (moving / q.max) * (1.2 - att(q.p, 'throwOnRun') / 100);
    if (lob) sigma *= 1.12;
    // The intended receiver is whoever can best get to the spot by the time the ball does.
    const tf = d / speed + 0.12;
    let r = null, best = 8;
    for (const e of ents) { if (e.team || e.role !== 'skill' || e.stun > 0) continue; const P = projectRoute(e, tf), gap = Math.max(dist(P, T) * 0.6, dist(e, T) - e.max * tf); if (gap < best) { best = gap; r = e; } }
    return { T, d, sigma, speed, pressure, r };
  }
  /** Preview of a throw for the interface: target point and miss radius. Pass a label, or a spot for free aim. */
  function aim(target, lob = false) {
    if (m.phase !== 'live' || m.carrier !== qb || m.ball.thrown) return null;
    if (typeof target === 'object') { const spec = spotSpec(target, lob); return { x: spec.T.x, y: spec.T.y, radius: spec.sigma * 1.5, receiver: spec.r, pressure: spec.pressure }; }
    const r = m.targets?.find(t => t.label === target);
    if (!r) return null;
    const spec = throwSpec(r, lob);
    return { x: spec.T.x, y: spec.T.y, radius: spec.sigma * 1.5, receiver: r, pressure: spec.pressure };
  }

  function throwBall(r, lob, spot = null) {
    const q = qb;
    if ((!r && !spot) || m.ball.air || m.carrier !== q || q.x > m.los + 0.3 || m.ball.thrown) return false;
    const off = O(), spec = spot ? spotSpec(spot, lob) : throwSpec(r, lob), { T, d, sigma, speed } = spec;
    if (spot) r = spec.r;
    T.x += gauss() * sigma; T.y += gauss() * sigma * 0.8;
    const dur = d / speed + 0.12;
    m.ball = { air: true, thrown: true, x: q.x, y: q.y, h: 2, sx: q.x, sy: q.y, tx: T.x, ty: T.y, time: 0, dur, lob, peak: lob ? 2.6 + d * 0.13 : 0.25 + d * 0.035, target: r, tipped: new Set(), depth: T.x - m.los };
    m.carrier = null;
    if (r) { if (r.eng) { r.eng.eng = null; r.eng = null; } r.job = { type: 'ball' }; line(off, r.p).targets++; }
    for (const e of ents) if (e.team) e.breakAt = m.t + e.react * (e.job.type === 'man' ? (e.job.r === r ? 1.1 : 2.2) : 0.9);
    line(off, q.p).passAttempts++;
    off.tendency.pass++; if (m.ball.depth > 15) off.tendency.deep++;
    event('throw', { lob });
    return true;
  }

  function throwAway() {
    if (m.ball.air || m.carrier !== qb || qb.x > m.los + 0.3) return false;
    line(O(), qb.p).passAttempts++; O().tendency.pass++;
    endPlay('incomplete', m.los, { text: 'Thrown away' });
    return true;
  }

  function updateBall(dt) {
    const b = m.ball;
    b.time += dt;
    const p = Math.min(1, b.time / b.dur);
    b.x = lerp(b.sx, b.tx, p); b.y = lerp(b.sy, b.ty, p); b.h = 2 + 4 * b.peak * p * (1 - p) - p * 0.8;
    if (p < 1) {
      // Underneath defenders can get a hand on a ball that passes within reach.
      if (p > 0.12 && p < 0.9 && b.h < 2.9) for (const d of ents) {
        if (!freeDefender(d) || b.tipped.has(d) || Math.hypot(d.x - b.x, d.y - b.y) > 0.85) continue;
        b.tipped.add(d);
        // The closer to the catch point he steps in front, the more surely he gets a hand on it.
        if (rng() < (p > 0.55 ? 0.72 : 0.42) + (att(d.p, 'awareness') - 70) * 0.008) {
          if (rng() < 0.12 + (att(d.p, 'catching') - 70) * 0.004) return intercept(d, true);
          passResult('tip', d);
          return endPlay('incomplete', m.los, { text: `Tipped by ${d.p.name}` });
        }
      }
      return;
    }
    const r = b.target, T = { x: b.tx, y: b.ty }, dr = r ? dist(r, T) : 99;
    if (b.ty < 0 || b.ty > FIELD_W || b.tx > 110) { passResult('miss'); return endPlay('incomplete', m.los, { text: 'Thrown out of bounds' }); }
    // Direction the ball is travelling: a defender on the passer's side of the receiver is "in front" of him.
    const fl = Math.hypot(b.tx - b.sx, b.ty - b.sy) || 1, ux = (b.tx - b.sx) / fl, uy = (b.ty - b.sy) / fl;
    let defender = null, dd = 9, front = false;
    for (const d of ents) {
      if (!d.team || d.stun > 0 || (d.eng && d.job.type === 'rush')) continue;
      const x = dist(d, T);
      if (x > 2.6) continue;
      // A bullet can only be played by a defender in front of or level with the receiver; a lob can be played from behind.
      const inFront = !r || b.lob || (d.x - r.x) * ux + (d.y - r.y) * uy < 0.3;
      const reach = inFront ? x : x + 1.2;
      if (reach < (front ? dd : dd + 1.2) || !defender) { defender = d; dd = x; front = inFront; }
    }
    if (dr > 2.3 || !r || r.stun > 0) {
      if (defender && dd < 1.4 && rng() < 0.45 + (att(defender.p, 'catching') - 70) * 0.006) return intercept(defender, false, 'overthrown');
      passResult('miss');
      return endPlay('incomplete', m.los, { text: !r ? 'Nobody there' : dr > 2.3 ? (b.tx > r.x ? 'Overthrown' : 'Off target') : 'Incomplete' });
    }
    const hands = att(r.p, 'catching'), fight = att(r.p, 'contestedCatching') * 0.6 + hands * 0.4;
    if (!defender) {
      if (rng() < clamp(0.96 + (hands - 70) * 0.004 - dr * 0.1, 0.3, 0.99)) return completeCatch(r, false, 'open');
      passResult('drop');
      return endPlay('incomplete', m.los, { text: `Dropped by ${r.p.name}` });
    }
    const cover = att(defender.p, 'coverage'), ballSkill = att(defender.p, 'catching');
    if (front && dd < dr - 0.2) {
      // The defender beat the receiver to the spot: he undercuts the throw.
      const pick = clamp((b.lob ? 0.14 : 0.2) + (ballSkill - 70) * 0.005 + (dr - dd) * 0.08, 0.06, 0.5), grab = clamp(0.16 + (fight - cover) * 0.008, 0.04, 0.4);
      const roll = rng();
      if (roll < pick) return intercept(defender, false, 'undercut');
      if (roll < 1 - grab) { passResult('breakup', defender, 'undercut'); return endPlay('incomplete', m.los, { text: `${defender.p.name} undercuts it and breaks it up` }); }
      return completeCatch(r, true, 'stolen');
    }
    if (front) {
      // Shoulder to shoulder at the catch point: a real fight for the ball.
      const win = clamp(0.42 + (fight - cover) * 0.009 + (dd - dr) * 0.22 + (b.lob ? -0.04 : 0.03), 0.12, 0.85);
      if (rng() < win) return completeCatch(r, true, 'contested');
      if (rng() < clamp(0.07 + (ballSkill - 70) * 0.004, 0.02, 0.3)) return intercept(defender, false, 'contested');
      passResult('breakup', defender, 'contested');
      return endPlay('incomplete', m.los, { text: `Broken up by ${defender.p.name}` });
    }
    // The defender is behind the receiver: he cannot reach the ball, only hit him as it arrives.
    if (rng() < clamp(0.88 + (hands - 70) * 0.004 - dr * 0.1 - (dd < 1.1 ? 0.2 : dd < 1.8 ? 0.08 : 0), 0.3, 0.98)) return completeCatch(r, dd < 1.6, dd < 1.6 ? 'shielded' : 'open');
    passResult(dd < 1.6 ? 'breakup' : 'drop', dd < 1.6 ? defender : null, 'jarred');
    endPlay('incomplete', m.los, { text: dd < 1.6 ? `${defender.p.name} jars it loose` : `Dropped by ${r.p.name}` });
  }

  function completeCatch(r, contested, why = 'open') {
    const b = m.ball, off = O();
    line(off, qb.p).completions++; line(off, r.p).catches++;
    m.ball = { air: false, thrown: true };
    // A clean catch in stride keeps its speed; a fight for the ball costs the receiver his momentum.
    m.carrier = r; r.job = { type: 'carry' }; r.caughtAt = r.x; r.slow = contested ? 0.45 : 0.1;
    m.manual = false;
    event('catch', { contested, receiver: r, why });
    if (r.x >= 100) return endPlay('td', 100);
    for (const e of ents) {
      if (e.team) continue;
      if (e !== r && e !== qb && !e.eng) e.job = { type: 'block', target: null, mode: 'run' };
    }
    m.holeY = undefined;
    void b;
  }

  // Tells the interface how a pass ended so it can show it: who touched the ball, where, and which way it was going.
  function passResult(result, by = null, why = '') {
    const b = m.ball, dur = b.dur || 1;
    event('pass', { result, by, why, receiver: b.target, x: b.x, y: b.y, h: b.h, vx: (b.tx - b.sx) / dur, vy: (b.ty - b.sy) / dur });
  }

  function intercept(d, tipped = false, why = '') {
    const off = O(), def = Df();
    passResult(tipped ? 'tip-int' : 'int', d, why);
    line(off, qb.p).interceptions++; line(def, d.p).defInt++;
    event('interception');
    endPlay('int', clamp(m.ball.x ?? d.x, 1, 99), { by: d, text: `Intercepted by ${d.p.name}` });
  }

  /* ---------- tackling ---------- */
  function tryTackle(d, c) {
    d.tcd = 0.7;
    const sack = c === qb && !m.ball.thrown && m.play.type !== 'run' && c.x < m.los;
    const elusive = att(c.p, 'agility') * 0.5 + att(c.p, 'power') * 0.5;
    let p = 0.87 + (att(d.p, 'tackling') - elusive) * 0.006 + c.broken * 0.1;
    const sp = Math.hypot(c.vx, c.vy) || 1, toC = dist(d, c) || 1;
    const behind = ((c.x - d.x) * c.vx + (c.y - d.y) * c.vy) / (sp * toC);
    if (behind > 0.6) p -= 0.1;
    if (c.jukeT > 0 && behind < 0.5) p -= 0.5 + (att(c.p, 'agility') - 70) * 0.006;
    if (sack) p += 0.06;
    if (sp < 2.5) p += 0.1;
    for (const o of ents) if (o !== d && freeDefender(o) && dist(o, c) < 1.7) p += 0.15;
    if (rng() >= clamp(p, 0.08, 0.98)) {
      d.stun = 1.1; c.broken++; c.slow = 0.3;
      event('broken');
      return false;
    }
    line(Df(), d.p).tackles++;
    if (sack) { line(Df(), d.p).sacks++; return endPlay('sack', c.x, { by: d }), true; }
    const fumble = rng() < 0.011 * (1 + (72 - att(c.p, 'ballSecurity')) / 35) * (c === qb ? 1.6 : 1);
    if (fumble) {
      line(Df(), d.p).forcedFumbles++;
      if (rng() < 0.52) return endPlay('fumble', clamp(c.x, 1, 99), { by: d, text: `Fumble! Forced by ${d.p.name}` }), true;
    }
    endPlay('tackle', c.x + clamp((att(c.p, 'power') - 60) * 0.02, 0, 0.8), { by: d });
    return true;
  }

  /* ---------- live step ---------- */
  function snap() {
    if (m.phase !== 'presnap') return false;
    if (m.pendingRunoff > 0) {
      m.clock -= m.pendingRunoff; m.pendingRunoff = 0;
      if (m.clock <= 0) {
        m.clock = 0;
        if (m.quarter !== 1 && m.quarter !== 3) { closeDrive(m.quarter === 2 ? 'End of half' : 'End of game'); endQuarter(); return false; }
        m.quarter++; m.clock = quarterLen; event('quarter');
      }
    }
    // The defense rotates to its real shell at the snap when it was disguised.
    if (m.disguised) { m.shell = m.dcall.shell; }
    assignBlocks();
    const play = m.play;
    if (play.run) O().tendency.run++;
    (O().called ||= {})[play.id] = (O().called[play.id] || 0) + 1; O().lastCall = play.id;
    (O().catCount ||= {})[play.cat] = (O().catCount[play.cat] || 0) + 1;
    if (play.run?.carrier === 'QB') { m.carrier = qb; line(O(), qb.p).rushAttempts++; m.ball.thrown = true; }
    m.phase = 'live'; m.t = 0;
    O().totals.plays++; if (m.drive) m.drive.plays++;
    event('snap');
    return true;
  }

  function handoffStep() {
    const play = m.play, rb = runner();
    if (!play.run || rb === qb || m.ball.thrown) return;
    const holeY = m.holeY ?? m.ballY;
    if (m.t >= play.run.handoff) {
      m.carrier = rb; m.ball.thrown = true; rb.job = { type: 'carry' }; m.manual = false;
      if (play.run.draw) {
        // The line turns its pass sets into run blocks once the ball is handed off.
        m.holeY = m.ballY + play.run.hole * m.flip;
        for (const b of ents) if (!b.team && b.job.type === 'block') { b.job.mode = 'run'; if (b.eng) b.engMode = 'run'; }
      }
      line(O(), rb.p).rushAttempts++;
      event('handoff');
      return;
    }
    // Before the exchange the back follows the designed path toward the mesh point.
    if (play.run.counter && m.t < 0.3) steer(rb, rb.x + 1, rb.y - Math.sign(play.run.hole) * m.flip * 3, 0.8);
    else if (play.run.draw) steer(rb, rb.sx, rb.sy, 0.3, true);
    else steer(rb, m.los - 1.5, lerp(rb.y, holeY, play.run.toss ? 0.5 : 0.85), 0.92);
    if (play.run.draw) steer(qb, m.los - 5.5, qb.y, 0.6, true); else if (play.run.toss) steer(qb, qb.x - 1, qb.y, 0.4); else steer(qb, lerp(qb.x, rb.x, 0.6), lerp(qb.y, rb.y, 0.6), 0.6);
  }

  function step(dt, input) {
    if (m.phase === 'presnap') {
      if (!isHuman(m.off)) { m.snapTimer -= dt; if (m.snapTimer <= 0) snap(); }
      return;
    }
    if (m.phase !== 'live') return;
    const inp = input || {};
    m.t += dt; m.dt = dt; m.clock = Math.max(0, m.clock - dt);
    for (const e of ents) {
      e.stun = Math.max(0, e.stun - dt); e.tcd = Math.max(0, e.tcd - dt); e.beaten = Math.max(0, e.beaten - dt);
      e.slow = Math.max(0, e.slow - dt); e.jukeT = Math.max(0, e.jukeT - dt); e.jcd = Math.max(0, e.jcd - dt);
      e.dvx = e.dvy = 0;
      if (!e.team && e.role === 'skill') { e.hist.push({ t: m.t, x: e.x, y: e.y, vx: e.vx, vy: e.vy }); if (e.hist.length > 40) e.hist.shift(); }
    }
    handoffStep();
    const c = holder(), humanOffense = isHuman(m.off) && !m.coach, humanDefense = isHuman(1 - m.off) && !m.coach;
    const scripted = !!m.play.run && !m.ball.thrown; // the exchange is scripted until the back has the ball
    let boost = 1;
    for (const e of ents) {
      if (e.team) { defenseThink(e); continue; }
      if (e.stun > 0) continue;
      if (e === c) {
        if (scripted || humanOffense) continue;
        if (e === qb && !m.ball.thrown) aiQuarterback(dt); else aiCarry(e);
      } else if (e === qb) { if (m.ball.thrown && !m.play.run) steer(e, e.x, e.y, 0); }
      else if (e.job.type === 'route') routeThink(e);
      else if (e.job.type === 'ball') { if (m.ball.air) steer(e, m.ball.tx, m.ball.ty, 1, true); }
      else if (e.job.type === 'block' || e.job.type === 'lead') blockThink(e);
    }
    if (m.play.screen && m.t > 0.9 && !m.released) {
      // Screen: the line lets the rush go and gets out in front of the back.
      m.released = true;
      const rb = ents.find(e => e.key === 'RB');
      for (const b of ents) if (b.role === 'ol' && b.oi !== 2) { if (b.eng) { b.eng.eng = null; b.eng = null; } b.job = { type: 'lead', hx: m.los + 1, hy: rb ? rb.job.pts?.[0]?.y ?? rb.y : b.y, mode: 'run' }; }
    }
    if (c && humanOffense && !scripted) boost = userCarry(c, inp, dt);
    if (humanDefense) userDefend(inp);
    for (const e of ents) if (!e.eng) integrate(e, dt, e === c && humanOffense ? boost : 1);
    resolveEngagements(dt);
    separate();
    if (m.phase !== 'live') return;
    if (m.ball.air) { updateBall(dt); if (m.phase !== 'live') return; }
    const carrier = holder();
    if (carrier) {
      if (carrier.x >= 100) return endPlay('td', 100);
      if (carrier.y <= 0 || carrier.y >= FIELD_W) return endPlay('oob', carrier.x);
      for (const d of ents) if (freeDefender(d) && d.tcd <= 0 && dist(d, carrier) < 1.2) { if (tryTackle(d, carrier)) return; }
    }
    m.openTimer = (m.openTimer || 0) - dt;
    if (m.openTimer <= 0 && m.carrier === qb && !m.ball.thrown) { m.openTimer = 0.12; for (const r of m.targets) r.open = openness(r).sep; }
    if (m.t > 16) endPlay(carrier ? 'tackle' : 'incomplete', carrier ? carrier.x : m.los);
  }

  function userCarry(c, inp, dt) {
    let ix = inp.x || 0, iy = inp.y || 0, len = Math.hypot(ix, iy);
    const isPasser = c === qb && !m.ball.thrown;
    if (isPasser) {
      const ready = m.t > (m.play.pa ? 0.65 : 0.2);
      if (inp.throwTo) { const r = m.targets.find(t => t.label === inp.throwTo); if (r && ready) { throwBall(r, !!inp.lob); return 1; } }
      if (inp.throwAt && ready) { throwBall(null, !!inp.lob, inp.throwAt); return 1; }
      if (inp.throwAway && m.t > 0.8) { throwAway(); return 1; }
      // Until the user moves, the quarterback takes his normal drop on his own.
      if (!len && !m.manual) { const p = m.play; steer(c, m.los - p.drop, p.boot ? m.ballY + m.flip * 8 : m.ballY, 0.7, !p.boot); return 1; }
    } else if (!len && !m.manual && !inp.juke) {
      // A runner or receiver keeps going on his own until the user takes the stick.
      aiCarry(c); return 1;
    }
    if (len) m.manual = true;
    if (len > 1) { ix /= len; iy /= len; len = 1; }
    const sprint = !!inp.sprint && m.stamina > 0.03 && len > 0;
    m.stamina = sprint ? Math.max(0, m.stamina - dt * 0.24) : Math.min(1, m.stamina + dt * 0.09);
    const top = c.max * (sprint ? 1.13 : 1) * (isPasser ? 0.92 : 1);
    c.dvx = ix * top; c.dvy = iy * top;
    if (inp.juke && !isPasser && m.stamina > 0.18) {
      let near = null, nd = 6;
      for (const d of ents) if (freeDefender(d)) { const dd = dist(d, c); if (dd < nd) { nd = dd; near = d; } }
      const dir = Math.abs(iy) > 0.3 ? Math.sign(iy) : near ? Math.sign(c.y - near.y) || 1 : 1;
      if (juke(c, dir)) m.stamina -= 0.18;
    }
    return 1.5;
  }

  function userDefend(inp) {
    const u = m.userEnt;
    if (inp.switch) {
      const focus = holder() || (m.ball.air ? { x: m.ball.tx, y: m.ball.ty } : qb);
      let best = null, bd = 1e9;
      for (const d of ents) if (d.team && !d.eng && d.stun <= 0) { const dd = dist(d, focus); if (dd < bd) { bd = dd; best = d; } }
      if (best) m.userEnt = best;
      return;
    }
    const len = Math.hypot(inp.x || 0, inp.y || 0);
    if (!u || u.eng || u.stun > 0) return;
    const sprint = !!inp.sprint && m.stamina > 0.03 && len > 0, top = u.max * (sprint ? 1.12 : 1);
    m.stamina = sprint ? Math.max(0, m.stamina - m.dt * 0.24) : Math.min(1, m.stamina + m.dt * 0.09);
    if (len) { m.manual = true; m.steeredAt = m.t; u.dvx = inp.x / Math.max(1, len) * top; u.dvy = inp.y / Math.max(1, len) * top; }
  }

  function separate() {
    for (let i = 0; i < ents.length; i++) for (let j = i + 1; j < ents.length; j++) {
      const a = ents[i], b = ents[j];
      if (a.eng === b || (a.team !== b.team && (a === m.carrier || b === m.carrier))) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d > 0.85 || d < 0.001) continue;
      const push = (0.85 - d) / 2, ux = dx / d, uy = dy / d;
      const wa = a.eng || a === m.carrier ? 0.2 : 1, wb = b.eng || b === m.carrier ? 0.2 : 1;
      a.x -= ux * push * wa; a.y -= uy * push * wa; b.x += ux * push * wb; b.y += uy * push * wb;
    }
  }

  /* ---------- rules ---------- */
  const name = p => p?.name || 'Player';
  function addScore(sideIndex, points) {
    m.sides[sideIndex].score += points;
    if (m.suddenDeath) m.final = true;
  }
  function closeDrive(result, points = 0) {
    if (!m.drive) return;
    m.drives.push({ teamId: m.sides[m.drive.side].team.id, result, points, yards: Math.round(m.drive.yards), plays: m.drive.plays });
    m.drive = null;
  }
  function startPossession(sideIndex, spot, y = FIELD_W / 2) {
    m.off = sideIndex; m.los = clamp(spot, 1, 99); m.ballY = clamp(y, 23.6, 29.7);
    m.down = 1; m.firstAt = Math.min(100, m.los + 10); m.conv = false; m.pendingRunoff = 0;
    m.drive = { side: sideIndex, start: m.los, plays: 0, yards: 0 };
    beginDown();
  }

  function endPlay(kind, x, info = {}) {
    if (m.phase !== 'live') return;
    const off = O(), def = Df(), offIndex = m.off, play = m.play, c = m.carrier, los = m.los;
    const passed = !!m.ball.thrown && play.type !== 'run' && c && c !== qb;
    let gain = x - los, text = info.text || '', clockRuns = false, big = false;
    m.phase = 'dead';
    m.ball.air = false;
    const credit = (yards, td) => {
      if (passed) {
        const ql = line(off, qb.p), rl = line(off, c.p);
        ql.passYards += yards; rl.recYards += yards; off.totals.passYards += yards;
        if (td) { ql.passTD++; rl.recTD++; }
      } else if (c) {
        const l = line(off, c.p);
        if (c === qb && play.type !== 'run' && !qb.counted) { l.rushAttempts++; qb.counted = true; }
        l.rushYards += yards; off.totals.rushYards += yards;
        if (td) l.rushTD++;
      }
    };
    const who = c ? name(c.p) : name(qb.p);
    const fatigue = () => {
      for (const side of [off, def]) for (const [id, e] of side.energy) side.energy.set(id, Math.min(1, e + 0.035));
      for (const e of ents) { const side = e.team ? def : off, cur = side.energy.get(e.p.id); if (cur !== undefined) side.energy.set(e.p.id, Math.max(0.2, cur - (e === c ? 0.085 + Math.max(0, gain) * 0.002 : 0.012))); }
    };
    fatigue();
    if (m.conv) {
      const good = kind === 'td';
      if (good) addScore(offIndex, 2);
      m.last = { kind, gain: 0, text: good ? 'Two-point conversion is good' : 'Two-point try fails', score: good };
      m.next = { type: 'kickoff', to: 1 - offIndex };
      log(m.last.text); event(good ? 'score' : 'stop');
      return;
    }
    if (kind === 'td') {
      gain = 100 - los; credit(Math.round(gain), true); addScore(offIndex, 6);
      if (m.drive) m.drive.yards += gain;
      text = passed ? `${name(qb.p)} to ${who} for a ${Math.round(gain)}-yard touchdown` : `${who} runs it in from ${Math.round(gain)} yards out`;
      off.totals.firstDowns++;
      m.next = m.final ? { type: 'final' } : { type: 'pat' };
      big = true; event('touchdown');
    } else if (kind === 'int' || kind === 'fumble') {
      if (kind === 'fumble') credit(Math.round(gain), false);
      off.totals.turnovers++;
      const ret = Math.abs(gauss()) * 7, spot = 100 - x + ret;
      closeDrive(kind === 'int' ? 'Interception' : 'Fumble');
      if (spot >= 100) { addScore(1 - offIndex, 6); text += '. Returned for a touchdown'; m.off = 1 - offIndex; m.los = 85; m.next = m.final ? { type: 'final' } : { type: 'pat' }; m.drive = { side: m.off, start: 0, plays: 0, yards: 0 }; }
      else m.next = { type: 'poss', side: 1 - offIndex, spot, y: FIELD_W - (info.by?.y ?? m.ballY) };
      big = true; event('turnover');
    } else if (kind === 'incomplete') {
      text ||= 'Incomplete'; gain = 0;
      m.down++; m.next = { type: 'down' };
    } else {
      const spot = x;
      if (kind === 'sack') {
        const loss = Math.round(gain); off.totals.sacksAllowed++; off.totals.passYards += loss;
        text = `${name(info.by?.p)} sacks ${name(qb.p)} for a loss of ${Math.abs(loss)}`; big = true; event('sack');
      } else {
        credit(Math.round(gain), false);
        const g = Math.round(gain), verb = kind === 'oob' ? 'out of bounds' : info.by ? `tackled by ${name(info.by.p)}` : 'down';
        text = passed ? `${name(qb.p)} complete to ${who} for ${g}, ${verb}` : `${who} ${g >= 0 ? 'gains' : 'loses'} ${Math.abs(g)}, ${verb}`;
        if (g >= 20) big = true;
      }
      if (m.drive) m.drive.yards += gain;
      clockRuns = kind !== 'oob';
      if (spot <= 0) {
        addScore(1 - offIndex, 2); text += '. Safety'; closeDrive('Safety');
        m.next = m.final ? { type: 'final' } : { type: 'poss', side: 1 - offIndex, spot: 38 };
        clockRuns = false; event('turnover');
      } else {
        m.los = clamp(spot, 0.5, 99.5); m.ballY = clamp(c ? c.y : m.ballY, 23.6, 29.7);
        if (m.los >= m.firstAt) { m.down = 1; m.firstAt = Math.min(100, m.los + 10); off.totals.firstDowns++; text += '. First down'; event('first'); }
        else m.down++;
        m.next = { type: 'down' };
      }
    }
    if (m.next.type === 'down' && m.down > 4) {
      text += '. Turnover on downs'; closeDrive('Downs');
      m.next = { type: 'poss', side: 1 - offIndex, spot: 100 - m.los, y: FIELD_W - m.ballY };
      clockRuns = false; event('turnover');
    }
    if (kind === 'tackle' || kind === 'sack') event('tackle', { big: kind === 'sack' });
    if (clockRuns && m.next.type === 'down') {
      const hurry = (m.quarter === 2 || m.quarter >= 4) && m.clock < 120 && off.score <= def.score;
      m.pendingRunoff = hurry ? HURRY_RUNOFF : RUNOFF;
    } else m.pendingRunoff = 0;
    m.last = { kind, gain: Math.round(gain), text, big, score: kind === 'td', turnover: kind === 'int' || kind === 'fumble' };
    log(text);
  }

  function log(text) { m.log.push({ quarter: m.quarter, clock: Math.ceil(m.clock), side: m.off, text }); }

  function special(text, next, extra = {}) {
    m.phase = 'dead'; m.pendingRunoff = 0;
    m.last = { kind: 'special', gain: 0, text, ...extra };
    m.next = next; m.ents = ents = []; m.carrier = null; m.ball = { air: false };
    log(text);
  }

  function fieldGoal(aim) {
    if (m.phase !== 'playcall' && m.phase !== 'presnap') return false;
    const offIndex = m.off, k = pickPlayer(O(), 'K'), chance = fieldGoalChance(), d = Math.round(100 - m.los + 17);
    // A user kick is decided by the meter; a simulated kick by the kicker's odds.
    const good = aim === undefined ? rng() < chance : Math.abs(aim + gauss() * 0.06) < clamp(chance * 0.8, 0.08, 0.8);
    m.clock = Math.max(0, m.clock - m.pendingRunoff - 5);
    if (good) { addScore(offIndex, 3); closeDrive('Field goal', 3); event('score'); }
    else { closeDrive('Missed FG'); event('stop'); }
    special(`${name(k)} ${d}-yard field goal is ${good ? 'good' : 'no good'}`, m.final ? { type: 'final' } : good ? { type: 'kickoff', to: 1 - offIndex } : { type: 'poss', side: 1 - offIndex, spot: Math.max(20, 100 - (m.los - 7)) }, { score: good });
    return good;
  }

  function punt() {
    if (m.phase !== 'playcall' && m.phase !== 'presnap') return false;
    const offIndex = m.off, p = pickPlayer(O(), 'P'), net = clamp(37 + (att(p, 'kickPower') - 70) * 0.25 + gauss() * 5, 18, 62);
    const landing = m.los + net, touchback = landing >= 100;
    m.clock = Math.max(0, m.clock - m.pendingRunoff - 7);
    closeDrive('Punt');
    special(`${name(p)} punts ${Math.round(touchback ? 100 - m.los : net)} yards${touchback ? ' for a touchback' : ''}`, { type: 'poss', side: 1 - offIndex, spot: touchback ? 20 : 100 - landing });
    return true;
  }

  /** Clock plays: a kneel burns time and a yard, a spike stops the clock; both cost a down. */
  function clockPlay(kind) {
    if ((m.phase !== 'playcall' && m.phase !== 'presnap') || m.conv) return false;
    const offIndex = m.off, off = O(), q = pickPlayer(off, 'QB'), kneel = kind === 'kneel';
    m.clock = Math.max(0, m.clock - (kneel ? m.pendingRunoff + 2 : Math.min(m.pendingRunoff, 3) + 1));
    off.totals.plays++; if (m.drive) m.drive.plays++;
    if (kneel) { line(off, q).rushAttempts++; line(off, q).rushYards--; off.totals.rushYards--; m.los = Math.max(0.5, m.los - 1); if (m.drive) m.drive.yards--; }
    else line(off, q).passAttempts++;
    m.down++;
    const text = kneel ? `${name(q)} takes a knee` : `${name(q)} spikes the ball to stop the clock`;
    if (m.down > 4) { closeDrive('Downs'); special(`${text}. Turnover on downs`, { type: 'poss', side: 1 - offIndex, spot: 100 - m.los, y: FIELD_W - m.ballY }); return true; }
    special(text, { type: 'down' });
    m.pendingRunoff = kneel ? RUNOFF : 0;
    return true;
  }

  function pat(choice) {
    if (m.phase !== 'pat') return;
    const offIndex = m.off;
    if (choice === 'two') {
      m.conv = true; m.los = 98; m.firstAt = 100; m.down = 1; m.ballY = FIELD_W / 2; m.pendingRunoff = 0;
      m.phase = 'playcall';
      if (!isHuman(m.off)) cpuTurn();
      return;
    }
    const k = pickPlayer(O(), 'K'), good = rng() < clamp(0.95 + (att(k, 'kickAccuracy') - 70) * 0.002, 0.8, 0.995);
    if (good) addScore(offIndex, 1);
    closeDrive('Touchdown', good ? 7 : 6);
    special(good ? 'Extra point is good' : 'Extra point is no good', { type: 'kickoff', to: 1 - offIndex }, { score: good });
  }

  function timeout(sideIndex = m.user) {
    const side = m.sides[sideIndex];
    if (!side || side.timeouts <= 0 || m.pendingRunoff <= 0 || (m.phase !== 'playcall' && m.phase !== 'presnap')) return false;
    side.timeouts--; m.pendingRunoff = 0;
    event('timeout', { side: sideIndex });
    return true;
  }

  function endQuarter() {
    if (m.quarter === 1 || m.quarter === 3) { m.quarter++; m.clock = quarterLen; event('quarter'); return false; }
    if (m.quarter === 2) {
      m.quarter = 3; m.clock = quarterLen;
      for (const s of m.sides) { s.timeouts = 3; for (const [id, e] of s.energy) s.energy.set(id, Math.min(1, e + 0.2)); }
      closeDrive('End of half');
      startPossession(1 - openingReceiver, 25);
      event('half');
      return true;
    }
    if (m.sides[0].score !== m.sides[1].score) { finish(); return true; }
    m.quarter++; m.clock = quarterLen; m.suddenDeath = true;
    closeDrive('End of regulation');
    startPossession(rng() < 0.5 ? 0 : 1, 25);
    event('overtime');
    return true;
  }
  function finish() { closeDrive('End of game'); m.final = true; m.phase = 'final'; m.ents = ents = []; event('final'); }

  /** Start the next down: the CPU makes its own decisions, the user is asked for theirs. */
  function beginDown() {
    if (m.final) return finish();
    if (m.clock <= 0 && !m.conv) { if (endQuarter()) return; }
    m.phase = 'playcall'; m.audibled = false; m.released = false; m.holeY = undefined; m.cpuPlay = null; m.suggested = null;
    m.ents = ents = []; m.carrier = null;
    for (const i of [0, 1]) {
      if (isHuman(i) || m.pendingRunoff <= 0 || m.sides[i].timeouts <= 0) continue;
      const mine = m.sides[i].score, theirs = m.sides[1 - i].score, onOffense = i === m.off;
      const want = onOffense ? (m.quarter === 2 && m.clock < 50) || (m.quarter >= 4 && m.clock < 110 && mine <= theirs) : (m.quarter >= 4 && m.clock < 120 && mine < theirs);
      if (want) timeout(i);
    }
    if (!isHuman(m.off)) cpuTurn();
  }

  function cpuTurn() {
    if (m.down === 4 && !m.conv) {
      const choice = aiFourthDown();
      if (choice === 'fg') return void fieldGoal();
      if (choice === 'punt') return void punt();
    }
    // Protecting a lead with the clock nearly gone, the CPU kneels it out.
    if (!m.conv && m.quarter === 4 && O().score > Df().score && m.clock <= (4 - m.down) * (RUNOFF + 2) && Df().timeouts === 0) return void clockPlay('kneel');
    m.cpuPlay = aiOffensePlay(); m.cpuFlip = rng() < 0.5 ? 1 : -1;
    // With a human on defense the snap waits for their call.
    if (!isHuman(1 - m.off)) setCall(m.cpuPlay, m.cpuFlip, aiDefenseCall());
  }

  function choosePlay(id, flip = 1) {
    if (m.phase !== 'playcall' && !(m.phase === 'presnap' && isHuman(m.off))) return false;
    // An audible or flip at the line keeps the defense in the look it already showed.
    if (m.phase === 'presnap') { if (id !== m.play.id) m.audibled = true; setCall(id, flip, null, true); }
    else setCall(id, flip, aiDefenseCall());
    return true;
  }
  function chooseDefense(id) {
    if (m.phase !== 'playcall' || isHuman(m.off) || !m.cpuPlay) return false;
    setCall(m.cpuPlay, m.cpuFlip, id);
    return true;
  }

  function advance() {
    if (m.phase !== 'dead') return;
    const n = m.next || { type: 'down' };
    m.next = null;
    if (n.type === 'final' || m.final) return finish();
    if (n.type === 'pat') {
      m.phase = 'pat'; m.ents = ents = [];
      if (!isHuman(m.off)) {
        const s = O().score - Df().score, late = m.quarter >= 4 && m.clock < 200;
        pat(late && (s === -2 || s === -5 || s === -10) ? 'two' : 'kick');
      }
      return;
    }
    if (n.type === 'kickoff') { if (m.conv) closeDrive('Touchdown', O().score && m.last?.score ? 8 : 6); return startPossession(n.to, 25); }
    if (n.type === 'poss') return startPossession(n.side, n.spot, n.y);
    beginDown();
  }

  /* ---------- simulation helpers ---------- */
  function autoPhase() {
    // Advance one decision or one whole play with the AI in charge of both teams.
    if (m.phase === 'playcall') {
      if (m.cpuPlay) return void setCall(m.cpuPlay, m.cpuFlip, aiDefenseCall());
      if (m.down === 4 && !m.conv) { const c = aiFourthDown(); if (c === 'fg') return void fieldGoal(); if (c === 'punt') return void punt(); }
      setCall(aiOffensePlay(), rng() < 0.5 ? 1 : -1, aiDefenseCall());
    } else if (m.phase === 'presnap') {
      if (!snap()) return;
      for (let i = 0; i < 700 && m.phase === 'live'; i++) step(1 / 30, null);
    } else if (m.phase === 'live') { for (let i = 0; i < 700 && m.phase === 'live'; i++) step(1 / 30, null); }
    else if (m.phase === 'pat') pat('kick');
    else if (m.phase === 'dead') advance();
  }

  /** Simulate with the real engine until the ball changes hands or the half/game ends. */
  function simDrive() {
    const side = m.off, half = m.quarter <= 2, start = m.log.length, was = m.autoAll;
    m.autoAll = true;
    for (let i = 0; i < 400 && !m.final && m.phase !== 'final'; i++) {
      if (m.off !== side && (m.phase === 'playcall' || m.phase === 'presnap') && !m.conv) break;
      if ((m.quarter <= 2) !== half) break;
      autoPhase();
    }
    m.autoAll = was;
    // Hand the next decision back to the user rather than keeping the AI's pre-made call.
    if (m.phase === 'presnap' && (isHuman(m.off) || isHuman(1 - m.off))) { m.phase = 'playcall'; m.ents = ents = []; if (isHuman(m.off)) m.cpuPlay = null; }
    else if (m.phase === 'playcall' && !isHuman(m.off) && !m.cpuPlay && !m.final) cpuTurn();
    return m.log.slice(start);
  }
  function simGame() {
    m.autoAll = true;
    for (let i = 0; i < 6000 && m.phase !== 'final'; i++) autoPhase();
    return result();
  }

  function result() {
    const playerStats = {};
    for (const side of m.sides) for (const [id, l] of side.lines) playerStats[id] = { ...l };
    const totals = side => ({ ...side.totals, yards: side.totals.passYards + side.totals.rushYards, timeouts: side.timeouts });
    const out = { homeScore: m.sides[0].score, awayScore: m.sides[1].score, playerStats, teamStats: { home: totals(m.sides[0]), away: totals(m.sides[1]) }, drives: m.drives.slice(), log: m.log.slice() };
    if (m.user >= 0) {
      // Legacy aggregate for the user's offense.
      const u = { passAttempts: 0, completions: 0, passYards: 0, passTD: 0, interceptions: 0, rushAttempts: 0, rushYards: 0, rushTD: 0, sacks: m.sides[m.user].totals.sacksAllowed };
      for (const l of m.sides[m.user].lines.values()) for (const k of Object.keys(u)) if (k !== 'sacks') u[k] += l[k] || 0;
      out.userStats = u;
    }
    return out;
  }

  Object.assign(m, { aim, clockPlay, step, snap, choosePlay, chooseDefense, advance, timeout, fieldGoal, punt, pat, simDrive, simGame, result, suggest, fieldGoalChance, situation, isHuman, autoPhase });
  startPossession(m.off, 25);
  return m;
}
