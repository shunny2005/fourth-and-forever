/** Canvas presentation, input and audio for the live game. All football logic lives in football.js. */
import * as F from './football.js';

const CSS = `
.football-game{position:fixed;inset:0;z-index:200;background:#0d1b16;color:#fff;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;flex-direction:column;height:100dvh;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}
.football-game *{box-sizing:border-box}
.football-game [hidden]{display:none!important}
.football-game button{font:inherit;color:#fff;cursor:pointer;touch-action:none;border:0}
.football-game button:active{transform:none}
.fb-top{display:flex;align-items:center;gap:10px;padding:calc(6px + env(safe-area-inset-top)) 12px 6px;background:#0b141c;border-bottom:1px solid #223542;flex:none}
.fb-team{display:flex;align-items:center;gap:8px;min-width:74px}
.fb-team i{width:6px;height:28px;border-radius:2px;display:block}
.fb-team small{display:block;font-size:10px;letter-spacing:1px;color:#9db2bd}
.fb-team small b{color:#ffd166;font-weight:700;letter-spacing:2px}
.fb-score{font:800 24px/1 ui-monospace,SFMono-Regular,Menlo,monospace}
.fb-mid{flex:1;text-align:center;min-width:0}
.fb-mid small{display:block;font:700 11px ui-monospace,Menlo,monospace;color:#9db2bd;letter-spacing:1px}
.fb-mid b{font-size:13px;white-space:nowrap}
.fb-top .fb-icon{background:#1d2f3b;border-radius:6px;min-width:38px;height:36px;font-size:11px;padding:0 8px}
.fb-field{position:relative;flex:1;min-height:0;overflow:hidden}
.fb-field canvas.fb-canvas{width:100%;height:100%;display:block}
.fb-banner{position:absolute;top:10px;left:10px;right:10px;text-align:center;pointer-events:none;text-shadow:0 2px 0 #000a}
.fb-banner strong{display:block;font:800 17px ui-monospace,Menlo,monospace;letter-spacing:1px;color:#ffe08a}
.fb-banner small{display:block;font-size:12px;margin-top:3px;color:#eaf2ea}
.fb-stamina{position:absolute;left:50%;top:62px;width:120px;height:5px;margin-left:-60px;background:#0008;border-radius:3px;overflow:hidden}
.fb-stamina i{display:block;height:100%;background:#8fe36b}
.fb-panel{position:absolute;left:0;right:0;bottom:0;background:#0b141cf2;border-top:1px solid #2c4352;padding:8px 10px calc(10px + env(safe-area-inset-bottom));max-height:62%;display:flex;flex-direction:column;gap:7px}
.fb-panel[hidden],.fb-bar[hidden],.fb-meter[hidden],.fb-controls[hidden],.fb-stamina[hidden],.fb-overlay[hidden],.fb-throw[hidden]{display:none}
.fb-panel header{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:12px;color:#b9cad3}
.fb-panel header b{color:#fff;font-size:13px}
.fb-tabs{display:flex;gap:4px;overflow-x:auto}
.fb-tabs button{background:#16242e;border-radius:5px;padding:7px 11px;font-size:11px;font-weight:700;letter-spacing:.8px;white-space:nowrap;color:#a9bcc7}
.fb-tabs button.active{background:#ffd166;color:#1b1400}
.fb-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:6px;overflow-y:auto;min-height:0}
.fb-card{display:flex;gap:8px;align-items:center;text-align:left;background:#132029;border:1px solid #2a3f4d;border-radius:6px;padding:6px;min-height:62px}
.fb-card:hover{border-color:#ffd166}
.fb-card canvas{width:70px;height:60px;flex:none;background:#1f5a3b;border-radius:3px}
.fb-card b{display:block;font-size:12px}
.fb-card small{display:block;font-size:10px;color:#9db2bd;margin-top:2px;line-height:1.25}

.fb-card kbd{display:inline-block;min-width:16px;margin-right:5px;padding:0 4px;border:1px solid #4a6474;border-radius:3px;font:700 10px ui-monospace,Menlo,monospace;color:#b9cad3;text-align:center}
.fb-lines{display:grid;grid-template-columns:1fr 1fr;gap:4px 22px;font-size:12px;color:#dbe7ea;text-align:left;max-width:640px}
.fb-lines b{color:#ffd166;font-size:11px;letter-spacing:1px}
.fb-lines div{line-height:1.5}
@media(hover:none){.fb-card kbd{display:none}}
.fb-card em{font-style:normal;color:#ffd166;font-size:9px;font-weight:800;letter-spacing:.8px}
.fb-row{display:flex;gap:6px;flex-wrap:wrap}
.fb-row button,.fb-bar button{background:#1d2f3b;border-radius:6px;padding:9px 12px;font-size:11px;font-weight:700;letter-spacing:.5px}
.fb-row button[disabled]{opacity:.4}
.fb-bar{position:absolute;left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap}
.fb-bar span{font-size:12px;color:#dbe7ea;background:#0b141ccc;padding:8px 10px;border-radius:6px}
.fb-bar .fb-go{background:#ffd166;color:#1b1400;font-size:14px;padding:12px 26px}
.fb-controls{position:absolute;inset:0;pointer-events:none}
.fb-controls>*{pointer-events:auto}
.fb-joystick{position:absolute;left:18px;bottom:calc(22px + env(safe-area-inset-bottom));width:112px;height:112px;border:2px solid #ffffff44;border-radius:50%;background:#0b141c55;display:flex;align-items:center;justify-content:center;touch-action:none}
.fb-stick{width:46px;height:46px;border-radius:50%;background:#e9f4e4aa;border:2px solid #fff;pointer-events:none}
.fb-a,.fb-b{position:absolute;right:18px;border-radius:32px;font-weight:800;letter-spacing:1px}
.fb-a{bottom:calc(22px + env(safe-area-inset-bottom));height:62px;min-width:104px;background:#ffd166;color:#1b1400!important}
.fb-b{bottom:calc(94px + env(safe-area-inset-bottom));height:44px;min-width:104px;background:#1d2f3bdd;border:1px solid #6d8796!important}
.football-game .fb-throw,.football-game .fb-throw:active{transform:translate(-50%,-50%)}
.football-game .fb-throw{position:absolute;width:42px;height:42px;padding:0;border-radius:50%;border:3px solid #fff;background:#0b141ccc;font:800 16px ui-monospace,Menlo,monospace;z-index:2;line-height:1}
.football-game .fb-throw.charging{background:#ffd166;color:#1b1400}
.fb-meter{position:absolute;left:50%;bottom:22%;width:min(320px,80%);transform:translateX(-50%);text-align:center}
.fb-meter div{position:relative;height:22px;background:#0b141cdd;border:2px solid #fff;border-radius:4px;margin:8px 0}
.fb-meter div u{position:absolute;top:0;bottom:0;background:#4fd17a88}
.fb-meter div i{position:absolute;top:-4px;bottom:-4px;width:4px;background:#ffd166}
.fb-meter small{font-size:12px}
.fb-overlay{position:absolute;inset:0;background:#070f15f0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:5;padding:20px;text-align:center;overflow:auto}
.fb-overlay h2{font:800 28px ui-monospace,Menlo,monospace;margin:0;letter-spacing:2px}
.fb-overlay p{margin:0;color:#c9d7de;font-size:14px}
.fb-overlay button{padding:12px 22px;background:#ffd166;color:#1b1400;border-radius:6px;font-weight:800;min-width:240px}
.fb-overlay button.alt{background:#1d2f3b;color:#fff}
.fb-overlay table{width:auto;border-collapse:collapse;font-size:12px;color:#dbe7ea;white-space:normal}
.fb-overlay td{padding:3px 10px;border:0;text-align:left}
.fb-help{font-size:11px;color:#9db2bd;line-height:1.6;max-width:460px}
@media(max-width:520px){.football-game .fb-throw{width:34px;height:34px;font-size:14px}.fb-top{gap:6px;padding-left:8px;padding-right:8px}.fb-team{min-width:0;gap:5px}.fb-score{font-size:20px}.fb-mid b{font-size:11px;white-space:normal;display:block;line-height:1.2}.fb-top .fb-icon{min-width:34px;padding:0 6px;font-size:10px}.fb-cards{grid-template-columns:1fr 1fr}.fb-card{flex-direction:column;align-items:flex-start}.fb-card canvas{width:100%;height:64px}}
@media(max-height:520px){.fb-panel{max-height:78%}.fb-banner strong{font-size:13px}.fb-banner small{display:none}}
@media(hover:hover) and (pointer:fine){.fb-joystick{opacity:.35}.football-game .fb-throw{width:30px;height:30px;font-size:13px;border-width:2px}}
`;

const TABS = [['coach', 'COACH'], ['run', 'RUN'], ['quick', 'QUICK'], ['deep', 'DEEP'], ['action', 'TRICK'], ['kick', 'SPECIAL']];
const KEYS = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' ', 'shift', 'j', 'q', 'x', 'e', 'tab', 'f', 't', 'p', 'escape', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function startGame(container, options) {
  const { home, away, onFinish, onExit, onSettings } = options;
  const match = F.createMatch({ ...options, coach: !!options.settings?.coach, simDefense: !!options.settings?.simDefense });
  let quickThrow = !!options.settings?.quickThrow, cursor = null, spotThrow = null;
  const userSide = match.user, me = match.sides[userSide], them = match.sides[1 - userSide];
  let muted = !!options.muted, audio = null, crowd = null, dead = false, frame = 0, last = 0, paused = false;
  let tab = 'coach', flip = 1, resultTimer = 0, holdTimer = 0, banner = { title: '', sub: '' }, shownPhase = '', shownKey = '';
  let cardActions = [], notices = [];
  let meter = null, audible = false, aimLabel = 0, fx = null, pendingThrow = null, summary = null, shake = 0, particles = [], floats = [];
  let stickX = 0, stickY = 0, stickPointer = null, aPointer = null;
  let edge = { juke: false, away: false, switch: false };
  const keys = new Set();

  const root = document.createElement('div');
  root.className = 'football-game';
  root.innerHTML = `<style>${CSS}</style>
<div class="fb-top">
  <div class="fb-team"><i data-color="home"></i><div><small data-team="home"></small><span class="fb-score" data-score="home">0</span></div></div>
  <div class="fb-mid"><small data-clock></small><b data-down></b></div>
  <div class="fb-team"><div style="text-align:right"><small data-team="away"></small><span class="fb-score" data-score="away">0</span></div><i data-color="away"></i></div>
  <button class="fb-icon" data-pause aria-label="Pause game">II</button>
  <button class="fb-icon" data-mute aria-label="Toggle sound"></button>
</div>
<div class="fb-field">
  <canvas class="fb-canvas" width="600" height="800" aria-label="Football field"></canvas>
  <div class="fb-banner"><strong data-message></strong><small data-sub></small></div>
  <div class="fb-stamina" hidden><i data-stamina></i></div>
  ${[1, 2, 3, 4, 5].map(n => `<button class="fb-throw" data-throw="${n}" aria-label="Pass to receiver ${n}" hidden>${n}</button>`).join('')}
  <div class="fb-controls" hidden>
    <div class="fb-joystick" role="application" aria-label="Drag to move"><div class="fb-stick"></div></div>
    <button class="fb-b" data-b></button><button class="fb-a" data-a></button>
  </div>
  <div class="fb-meter" hidden><small data-meter-label></small><div><u data-meter-zone></u><i data-meter-mark></i></div><small>Press SPACE or tap to kick</small></div>
  <div class="fb-bar" hidden></div>
  <div class="fb-panel" hidden></div>
  <div class="fb-overlay" hidden></div>
</div>`;
  container.append(root);
  const $ = s => root.querySelector(s);
  const canvas = $('.fb-canvas'), ctx = canvas.getContext('2d'), overlay = $('.fb-overlay'), panel = $('.fb-panel'), bar = $('.fb-bar'), controls = $('.fb-controls');
  const joystick = $('.fb-joystick'), stick = $('.fb-stick'), btnA = $('[data-a]'), btnB = $('[data-b]'), meterBox = $('.fb-meter');
  const throwButtons = [1, 2, 3, 4, 5].map(n => { const b = $(`[data-throw="${n}"]`); b.dataset.throw = String(n); return b; });
  $('[data-team="home"]').textContent = home.abbr; $('[data-team="away"]').textContent = away.abbr;
  $('[data-color="home"]').style.background = home.color || '#3c8cca'; $('[data-color="away"]').style.background = away.color || '#c75248';
  const make = (tag, className, text) => { const e = document.createElement(tag); if (className) e.className = className; if (text !== undefined) e.textContent = text; return e; };
  const button = (text, fn, className) => { const b = make('button', className, text); b.onclick = () => { blip(330, 0.04); fn(); }; return b; };

  /* ---------- audio ---------- */
  function ac() {
    if (muted) return null;
    try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume?.(); return audio; } catch { return null; }
  }
  function blip(freq = 440, length = 0.1, type = 'square', gain = 0.035, slide = 0) {
    const a = ac(); if (!a) return;
    try {
      const o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.value = freq;
      if (slide) o.frequency.linearRampToValueAtTime?.(Math.max(30, freq + slide), a.currentTime + length);
      g.gain.setValueAtTime(gain, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + length);
      o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + length);
    } catch { /* audio is optional */ }
  }
  function noise(length = 0.2, gain = 0.05, freq = 900, q = 0.8) {
    const a = ac(); if (!a) return;
    try {
      const buffer = a.createBuffer(1, Math.floor(a.sampleRate * length), a.sampleRate), data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      src.buffer = buffer; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      g.gain.setValueAtTime(gain, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + length);
      src.connect(f); f.connect(g); g.connect(a.destination); src.start();
    } catch { /* audio is optional */ }
  }
  function startCrowd() {
    const a = ac(); if (!a || crowd) return;
    try {
      const buffer = a.createBuffer(1, a.sampleRate * 2, a.sampleRate), data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      src.buffer = buffer; src.loop = true; f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 0.5; g.gain.value = 0.012;
      src.connect(f); f.connect(g); g.connect(a.destination); src.start();
      crowd = { src, gain: g };
    } catch { /* audio is optional */ }
  }
  function cheer(level) {
    if (!crowd || !audio) return;
    try { const g = crowd.gain.gain, t = audio.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(0.012 + level * 0.06, t); g.linearRampToValueAtTime(0.012, t + 1.5 + level * 2); } catch { /* audio is optional */ }
  }
  const whistle = () => { blip(2100, 0.22, 'sine', 0.03, 120); blip(2300, 0.22, 'sine', 0.02, -80); };

  function sounds() {
    // The engine reports what happened; this turns it into sound and screen feedback.
    for (const e of match.events) {
      const mine = match.off === userSide;
      if (e.type === 'snap') { blip(160, 0.05); startCrowd(); }
      else if (e.type === 'throw') noise(0.16, 0.035, e.lob ? 700 : 1400, 1.2);
      else if (e.type === 'catch') { blip(660, 0.07, 'triangle', 0.05); fx = { result: 'catch', by: e.receiver, why: e.why, t: 0 }; }
      else if (e.type === 'craft') { floats.push({ text: e.text, x: e.receiver.x, y: e.receiver.y, t: -0.6 }); blip(880, 0.05, 'triangle', 0.025); }
      else if (e.type === 'pass') passFx(e);
      else if (e.type === 'tackle') { noise(0.18, 0.09, 180, 0.7); blip(90, 0.12, 'sine', 0.08, -40); shake = e.big ? 9 : 4; }
      else if (e.type === 'broken') { noise(0.1, 0.06, 300); float('BROKEN TACKLE'); }
      else if (e.type === 'juke') blip(520, 0.05, 'triangle', 0.03, 200);
      else if (e.type === 'pressure' && mine && match.carrier === match.qb) float('PRESSURE');
      else if (e.type === 'first') { blip(520, 0.08, 'triangle', 0.04); blip(780, 0.12, 'triangle', 0.04); cheer(mine ? 0.3 : 0.05); }
      else if (e.type === 'touchdown' || e.type === 'score') { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => !dead && blip(f, 0.18, 'square', 0.04), i * 110)); cheer(mine ? 1 : 0.15); if (e.type === 'touchdown') confetti(mine); }
      else if (e.type === 'turnover' || e.type === 'interception') { blip(180, 0.3, 'sawtooth', 0.04, -80); cheer(mine ? 0.1 : 0.8); shake = 6; }
      else if (e.type === 'sack') cheer(mine ? 0.05 : 0.6);
      else if (e.type === 'timeout') whistle();
      else if (e.type === 'quarter') { whistle(); notice(`END OF Q${match.quarter - 1} · ${scoreLine()}`, [`${match.sides[match.off].team.abbr} ball`]); }
      else if (e.type === 'half') { whistle(); notice(`HALFTIME · ${scoreLine()}`, [teamLine(me), teamLine(them), `${match.sides[match.off].team.abbr} receives the second-half kickoff`]); }
      else if (e.type === 'overtime') { whistle(); notice(`OVERTIME · ${scoreLine()}`, ['Sudden death: the first score wins.', `${match.sides[match.off].team.abbr} won the toss`]); }
      else if (e.type === 'final') whistle();
    }
    match.events.length = 0;
  }
  /** Start the short replay-style animation that shows how a pass ended. */
  function passFx(e) {
    const away = e.by ? Math.sign(e.y - e.by.y) || 1 : 0, kind = e.result;
    const loose = { tip: [e.vx * 0.22, e.vy * 0.22 + away * 2.5, 5.5], breakup: [e.vx * 0.1, away * 3.5, 3.2], drop: [e.vx * 0.15, e.vy * 0.15, 2.4], miss: [e.vx * 0.55, e.vy * 0.55, 0] }[kind];
    fx = { result: kind, by: e.by, why: e.why, receiver: e.receiver, t: 0, x0: e.x, y0: e.y, x: e.x, y: e.y, h: Math.max(0.3, e.h), vx: loose?.[0] || 0, vy: loose?.[1] || 0, vh: loose?.[2] || 0, loose: !!loose };
    if (kind === 'tip' || kind === 'tip-int') noise(0.08, 0.07, 1800);
    else if (kind === 'breakup') { noise(0.12, 0.08, 400); shake = 3; }
    else if (kind === 'drop' || kind === 'miss') blip(200, 0.12, 'triangle', 0.03, -60);
  }
  function stepFx(dt) {
    if (!fx) return;
    fx.t += dt;
    if (!fx.loose) return;
    // The loose ball pops off, falls and bounces to a stop.
    fx.x += fx.vx * dt; fx.y += fx.vy * dt; fx.vh -= 20 * dt; fx.h += fx.vh * dt;
    if (fx.h <= 0) { fx.h = 0; fx.vh = Math.abs(fx.vh) * 0.42; fx.vx *= 0.55; fx.vy *= 0.55; if (fx.vh < 0.8) fx.vh = 0; }
  }
  // Every label says why it happened, in terms of who had position on the ball.
  const FX_LABEL = { tip: 'STEPPED IN FRONT · TIPPED', 'tip-int': 'TIPPED AND PICKED OFF', int: 'INTERCEPTED', breakup: 'BROKEN UP', drop: 'DROPPED',
    'int:undercut': 'BEAT HIM TO THE BALL · INTERCEPTED', 'int:overthrown': 'OVERTHROWN · PICKED OFF', 'int:contested': 'WON THE FIGHT · INTERCEPTED',
    'breakup:undercut': 'IN FRONT OF THE RECEIVER · BROKEN UP', 'breakup:contested': 'CONTESTED · BROKEN UP', 'breakup:jarred': 'HIT AS HE CAUGHT IT',
    'catch:contested': 'CONTESTED CATCH', 'catch:shielded': 'DEFENDER BEHIND HIM · CAUGHT', 'catch:stolen': 'TOOK IT AWAY FROM THE DEFENDER' };
  const fxLabel = f => FX_LABEL[`${f.result}:${f.why}`] || FX_LABEL[f.result];

  const scoreLine = () => `${me.team.abbr} ${me.score} — ${them.team.abbr} ${them.score}`;
  function teamLine(side) { const t = side.totals; return `${side.team.abbr}: ${t.passYards + t.rushYards} yards (${t.passYards} pass, ${t.rushYards} rush), ${t.firstDowns} first downs, ${t.turnovers} turnovers`; }
  function notice(title, lines) { notices.push({ title, lines, t: 0 }); }

  function float(text) { const c = match.carrier || match.qb; if (c) floats.push({ text, x: c.x, y: c.y, t: 0 }); }
  function confetti(mine) {
    const colors = mine ? [me.team.color, me.team.secondary, '#ffd166'] : [them.team.color, '#ffffff'];
    for (let i = 0; i < 70; i++) particles.push({ x: Math.random(), y: -0.1 - Math.random() * 0.3, vx: (Math.random() - 0.5) * 0.2, vy: 0.25 + Math.random() * 0.4, c: colors[i % colors.length] || '#fff', t: 0 });
  }

  /* ---------- flow ---------- */
  const userOffense = () => match.off === userSide;
  const say = (title, sub = '') => { banner = { title, sub }; };
  const ordinal = ['', '1st', '2nd', '3rd', '4th'];
  function downText() {
    if (match.conv) return 'Two-point try';
    const toGo = match.firstAt >= 100 ? 'Goal' : Math.max(1, Math.round(match.firstAt - match.los));
    const spot = Math.round(match.los), where = spot === 50 ? '50' : spot < 50 ? `own ${spot}` : `opp ${100 - spot}`;
    return `${ordinal[Math.min(4, match.down)]} & ${toGo} · ${where}`;
  }
  const clockText = () => `${match.quarter > 4 ? 'OT' : `Q${match.quarter}`} ${Math.floor(Math.max(0, match.clock) / 60)}:${String(Math.floor(Math.max(0, match.clock) % 60)).padStart(2, '0')}`;

  function playCard(play) {
    const scheme = me.team.scheme?.offense, b = make('button', 'fb-card');
    const art = document.createElement('canvas'); art.width = 116; art.height = 100;
    drawArt(art.getContext('2d'), F.playArt(play.id, flip), 116, 100);
    const text = make('div');
    text.append(title(play.name), make('small', '', play.note));
    if (play.fits?.includes(scheme)) text.append(make('em', '', 'SCHEME FIT'));
    b.append(art, text);
    return act(b, () => { if (match.choosePlay(play.id, flip)) { audible = false; blip(330, 0.04); refresh(true); } });
  }
  function defenseCard(call) {
    const b = make('button', 'fb-card'), art = document.createElement('canvas'); art.width = 116; art.height = 100;
    drawDefenseArt(art.getContext('2d'), call, 116, 100);
    const text = make('div'); text.append(title(call.name), make('small', '', call.note));
    b.append(art, text);
    return act(b, () => { if (match.chooseDefense(call.id)) { blip(330, 0.04); refresh(true); } });
  }
  // Cards are numbered so the whole play call can be made from the keyboard.
  function title(name) { const b = make('b'); b.append(make('kbd', '', String(cardActions.length + 1)), name); return b; }
  function act(b, fn) { b.onclick = fn; cardActions.push(fn); return b; }
  function textCard(name, note, fn) { const b = make('button', 'fb-card'), text = make('div'); text.append(title(name), make('small', '', note)); b.append(text); return act(b, fn); }
  function timeoutButton() {
    const b = button(match.pendingRunoff > 0 ? `Timeout (${me.timeouts}) · saves ${match.pendingRunoff}s` : `Timeouts: ${me.timeouts}`, () => { if (match.timeout()) refresh(true); });
    b.disabled = !(match.pendingRunoff > 0 && me.timeouts > 0);
    return b;
  }

  function buildPanel() {
    panel.replaceChildren(); cardActions = [];
    const head = make('header');
    if (match.phase === 'pat') {
      head.append(make('b', '', 'TOUCHDOWN'), make('span', '', 'Choose the try'));
      const cards = make('div', 'fb-cards');
      cards.append(textCard('Kick the extra point', 'One point, almost automatic.', () => { match.pat('kick'); refresh(true); }), textCard('Go for two', 'One play from the 2-yard line.', () => { match.pat('two'); refresh(true); }));
      panel.append(head, cards);
      return;
    }
    if (userOffense()) {
      head.append(make('b', '', `YOUR BALL · ${downText()}`), make('span', '', `${FORMATION_HINT[tab] || ''}`));
      const tabs = make('div', 'fb-tabs');
      for (const [id, label] of TABS) { if (id === 'kick' && match.conv) continue; const b = button(label, () => { tab = id; buildPanel(); }, id === tab ? 'active' : ''); tabs.append(b); }
      const cards = make('div', 'fb-cards');
      if (tab === 'kick') {
        const yards = Math.round(100 - match.los + 17);
        cards.append(
          textCard(`Field goal · ${yards} yards`, `${Math.round(match.fieldGoalChance() * 100)}% kicker range. Time the meter.`, () => startKick()),
          textCard('Punt', 'Flip the field and play defense.', () => { audible = false; match.punt(); refresh(true); }),
          textCard('Kneel', 'Lose a yard, keep the clock running.', () => { audible = false; match.clockPlay('kneel'); refresh(true); }),
          textCard('Spike', 'Stop the clock. Costs the down.', () => { audible = false; match.clockPlay('spike'); refresh(true); }));
      } else {
        const ids = tab === 'coach' ? match.suggest() : F.PLAYBOOK.filter(p => p.cat === tab).map(p => p.id);
        for (const id of ids) cards.append(playCard(F.PLAYBOOK.find(p => p.id === id)));
      }
      const row = make('div', 'fb-row');
      row.append(button(flip > 0 ? 'Strength: right' : 'Strength: left', () => { flip = -flip; buildPanel(); }), timeoutButton(), button('How to play', pause));
      panel.append(head, tabs, cards, row);
    } else {
      head.append(make('b', '', `DEFENSE · ${them.team.abbr} ${downText()}`), make('span', '', 'Call your coverage'));
      const cards = make('div', 'fb-cards');
      for (const call of F.DEFENSE_CALLS) cards.append(defenseCard(call));
      const row = make('div', 'fb-row');
      row.append(button('Sim this drive (0)', simulateDrive), timeoutButton(), button('How to play', pause));
      panel.append(head, cards, row);
    }
  }
  const FORMATION_HINT = { coach: 'Coordinator picks for this down', run: 'Follow the arrow, read the blocks', quick: 'Get it out fast', deep: 'Needs time in the pocket', action: 'Fakes and screens', kick: 'Kicks and clock plays' };
  function cycleTab(step) { const ids = TABS.map(t => t[0]).filter(id => !(id === 'kick' && match.conv)); tab = ids[(ids.indexOf(tab) + step + ids.length) % ids.length]; blip(300, 0.03); buildPanel(); }

  function buildBar() {
    bar.replaceChildren();
    if (match.phase !== 'presnap') return;
    if (userOffense()) {
      bar.append(make('span', '', `${match.play.name} · ${F.FORMATIONS[match.play.form].name}`));
      if (!match.coach) bar.append(button('SNAP', () => snap(), 'fb-go'));
      if (!match.audibled) bar.append(button('Audible', () => { audible = true; flip = match.flip; tab = 'coach'; refresh(true); }));
      bar.append(button('Flip', () => { flip = -match.flip; match.choosePlay(match.play.id, flip); refresh(true); }));
      if (match.pendingRunoff > 0 && me.timeouts > 0) bar.append(timeoutButton());
    } else bar.append(make('span', '', `${match.dcall.name} · steer your defender or let him play`));
  }

  function snap() { if (match.phase === 'presnap' && userOffense() && !paused && !audible) { clearInput(); match.snap(); refresh(true); } }

  function startKick() {
    if (match.coach) { match.fieldGoal(); refresh(true); return; }
    const chance = match.fieldGoalChance(), yards = Math.round(100 - match.los + 17);
    meter = { pos: -1, dir: 1, speed: 1.5 + yards * 0.022, zone: clamp(chance * 0.8, 0.08, 0.8), yards };
    refresh(true);
  }
  function kick() { if (!meter) return; const aim = meter.pos; meter = null; noise(0.12, 0.08, 240); match.fieldGoal(aim); refresh(true); }

  function simulateDrive() {
    const lines = match.simDrive();
    // Keep only the events that matter after a simmed drive: period changes.
    const keep = match.events.filter(e => ['quarter', 'half', 'overtime'].includes(e.type));
    match.events.length = 0; match.events.push(...keep);
    summary = { title: `DRIVE SUMMARY · ${scoreLine()}`, lines: lines.slice(-7).map(l => l.text), t: 0 };
    whistle();
    refresh(true);
  }

  /** Bring the DOM in line with the match phase. Rebuilds only when the phase or situation changes. */
  function refresh(force) {
    const key = `${match.phase}|${match.off}|${match.down}|${Math.round(match.los)}|${match.conv}|${match.pendingRunoff}|${me.timeouts}|${!!meter}|${!!summary}|${match.coach}|${audible}`;
    if (!force && key === shownKey) return;
    shownKey = key;
    const phase = match.phase, live = phase === 'live', human = !match.coach;
    const choosing = !meter && !summary && (phase === 'pat' ? userOffense() : phase === 'playcall' || (audible && phase === 'presnap'));
    panel.hidden = !choosing;
    if (choosing) buildPanel();
    bar.hidden = phase !== 'presnap' || !!summary || audible;
    if (!bar.hidden) buildBar();
    controls.hidden = !(human && (live || (phase === 'presnap' && !userOffense())));
    meterBox.hidden = !meter;
    btnA.textContent = 'SPRINT';
    btnB.textContent = userOffense() ? 'JUKE' : 'SWITCH';
    if (phase !== shownPhase) {
      shownPhase = phase;
      if (phase === 'playcall' || phase === 'presnap') fx = null;
      const fresh = match.drive?.plays === 0 && !match.conv ? `New drive at the ${downText().split(' · ')[1]}. ` : '';
      if (phase === 'playcall') say(userOffense() ? 'CALL A PLAY' : `${them.team.abbr} BALL`, userOffense() ? `${fresh}Keys: 1-9 pick a play, arrows change tab.` : `${fresh}Pick a defense, or sim the drive.`);
      else if (phase === 'presnap') say(userOffense() ? 'READ THE DEFENSE' : 'DEFENSE', readLook());
      else if (phase === 'live') say('', '');
      else if (phase === 'dead') { const l = match.last; say(headline(l), l.text); resultTimer = l.big || l.score || l.turnover ? 2.8 : 1.9; holdTimer = 0.45; }
      else if (phase === 'pat') say('TOUCHDOWN', '');
      else if (phase === 'final') { say('', ''); finalScreen(); }
    }
  }
  /** A coordinator's one-line read of what the other side is showing. Hidden on Expert. */
  function readLook() {
    const los = match.los, by = match.ballY, expert = String(options.difficulty || '').toLowerCase() === 'expert';
    if (!userOffense()) {
      const backs = match.ents.filter(e => !e.team && e.back).length, wide = match.ents.filter(e => !e.team && e.pos === 'WR').length;
      return `${them.team.abbr} in ${F.FORMATIONS[match.play.form].name}: ${backs > 1 ? 'two backs, watch the run' : wide >= 3 ? `${wide} wide, expect a pass` : 'balanced look'}. Move your man, Space sprints, E switches.`;
    }
    const seen = me.called?.[match.play.id] || 0, warn = match.recognized > 0.2 ? `They have seen ${match.play.name} ${seen} times and will jump it. ` : '';
    const how = warn + (match.play.run ? 'Space to snap, then follow the arrow.' : `Space to snap. ${quickThrow ? 'Number throws' : 'Number aims, same number throws'}, or click a spot.`);
    if (expert) return how;
    const def = match.ents.filter(e => e.team), deep = def.filter(e => e.x > los + 10).length, box = def.filter(e => e.x < los + 5.5 && Math.abs(e.y - by) < 8).length;
    const creeping = def.some(e => e.role !== 'dl' && e.x < los + 3 && Math.abs(e.y - by) < 8);
    let read = deep === 0 ? 'No safety deep: pressure is coming, throw quick or go over the top.' : deep === 1 ? 'One safety deep: seams and sidelines are open.' : `${deep === 2 ? 'Two' : 'Three or more'} deep: work underneath and between the safeties.`;
    if (match.play.run) read = `${box} in the box${box >= 8 ? ': crowded, consider an audible.' : box <= 6 ? ': light, good look to run.' : '.'}`;
    else if (creeping && deep > 0) read += ' A linebacker is creeping up.';
    return `${read} ${how}`;
  }

  function headline(l) {
    if (l.kind === 'td') return 'TOUCHDOWN';
    if (l.kind === 'int') return 'INTERCEPTED';
    if (l.kind === 'fumble') return 'FUMBLE';
    if (l.kind === 'sack') return 'SACK';
    if (l.kind === 'incomplete') return 'INCOMPLETE';
    if (l.kind === 'special') return l.score ? 'IT IS GOOD' : 'SPECIAL TEAMS';
    return `${l.gain >= 0 ? '+' : ''}${l.gain} YARDS`;
  }

  const statText = l => [l.passAttempts ? `${l.completions}/${l.passAttempts}, ${l.passYards} yds, ${l.passTD} TD, ${l.interceptions} INT` : '', l.rushAttempts ? `${l.rushAttempts} car, ${l.rushYards} yds${l.rushTD ? `, ${l.rushTD} TD` : ''}` : '', l.catches ? `${l.catches} rec, ${l.recYards} yds${l.recTD ? `, ${l.recTD} TD` : ''}` : '', l.tackles ? `${l.tackles} tkl${l.sacks ? `, ${l.sacks} sack` : ''}${l.defInt ? `, ${l.defInt} INT` : ''}${l.forcedFumbles ? `, ${l.forcedFumbles} FF` : ''}` : ''].filter(Boolean).join(' · ');
  const impact = l => l.passYards * 0.04 + l.passTD * 4 - l.interceptions * 2 + l.rushYards * 0.1 + l.rushTD * 6 + l.recYards * 0.1 + l.recTD * 6 + l.tackles * 0.5 + l.sacks * 3 + l.defInt * 5 + l.forcedFumbles * 3;
  /** Team totals, the leading players for both teams and the drive log, built from the live match. */
  function boxScore() {
    const wrap = make('div'), table = make('table');
    const rowOf = (label, a, b) => { const tr = make('tr'); tr.append(make('td', '', label), make('td', '', String(a)), make('td', '', String(b))); return tr; };
    const a = me.totals, b = them.totals;
    table.append(rowOf('', me.team.abbr, them.team.abbr), rowOf('Total yards', a.passYards + a.rushYards, b.passYards + b.rushYards), rowOf('Passing', a.passYards, b.passYards), rowOf('Rushing', a.rushYards, b.rushYards), rowOf('First downs', a.firstDowns, b.firstDowns), rowOf('Turnovers', a.turnovers, b.turnovers), rowOf('Sacks allowed', a.sacksAllowed, b.sacksAllowed));
    const lines = make('div', 'fb-lines');
    for (const side of [me, them]) {
      const col = make('div'); col.append(make('b', '', side.team.abbr));
      const top = [...side.lines.values()].sort((x, y) => impact(y) - impact(x)).slice(0, 6);
      for (const l of top) col.append(make('div', '', `${l.pos} ${l.name}: ${statText(l)}`));
      if (!top.length) col.append(make('div', '', 'No stats yet'));
      lines.append(col);
    }
    const drives = make('p', 'fb-help', match.drives.slice(-8).map(d => `${match.sides.find(s => s.team.id === d.teamId)?.team.abbr} ${d.result.toLowerCase()} (${d.plays} plays, ${d.yards} yds)`).join(' · ') || 'No completed drives yet');
    wrap.append(table, lines, drives);
    wrap.style.display = 'grid'; wrap.style.gap = '12px'; wrap.style.justifyItems = 'center';
    return wrap;
  }

  function finalScreen() {
    const r = match.result(), mine = me.score, theirs = them.score;
    overlay.hidden = false; overlay.replaceChildren();
    const star = [...me.lines.values(), ...them.lines.values()].sort((x, y) => impact(y) - impact(x))[0];
    const done = make('button', '', 'Return to franchise');
    done.onclick = () => { destroy(); onFinish?.(r); };
    overlay.append(make('h2', '', mine > theirs ? 'VICTORY' : mine < theirs ? 'DEFEAT' : 'FINAL'), make('p', '', scoreLine()));
    if (star) overlay.append(make('p', '', `Player of the game: ${star.pos} ${star.name} · ${statText(star)}`));
    overlay.append(boxScore(), done);
    blip(mine > theirs ? 980 : 210, 0.4);
  }

  function setting(key, value) { if (key === 'quickThrow') quickThrow = value; else match[key] = value; onSettings?.({ coach: match.coach, simDefense: match.simDefense, quickThrow }); }
  function pause() {
    if (match.phase === 'final') return;
    paused = !paused; clearInput();
    overlay.hidden = !paused;
    if (!paused) return;
    overlay.replaceChildren();
    const resume = make('button', '', 'Resume game'); resume.dataset.resume = '1'; resume.onclick = pause;
    const coach = make('button', 'alt', `Coach mode: ${match.coach ? 'ON · AI runs your plays' : 'OFF · you control the ball'}`);
    coach.onclick = () => { setting('coach', !match.coach); paused = false; pause(); };
    const sim = make('button', 'alt', `Defense: ${match.simDefense ? 'auto-sim every drive' : 'you call and play it'}`);
    sim.onclick = () => { setting('simDefense', !match.simDefense); paused = false; pause(); };
    const numbers = make('button', 'alt', `Number keys: ${quickThrow ? 'throw at once' : 'aim first, press again to throw'}`);
    numbers.onclick = () => { setting('quickThrow', !quickThrow); paused = false; pause(); };
    const exit = make('button', 'alt', 'Exit without saving game'); exit.dataset.exit = '1'; exit.onclick = () => { destroy(); onExit?.(); };
    const stats = make('button', 'alt', 'Box score and drives');
    stats.onclick = () => { overlay.replaceChildren(make('h2', '', scoreLine()), boxScore(), button('Back', () => { paused = false; pause(); })); };
    const help = make('div', 'fb-lines');
    const tips = [['CALLING PLAYS', ['1-9 picks a card, arrows change tab', 'F flips the play, T calls timeout', 'Audible once per down at the line', 'SPECIAL tab: kicks, kneel, spike']], ['OFFENSE', ['Space snaps, hold it to sprint (anyone)', 'Number aims a pass, same number throws', 'Or click any spot: tap bullet, hold lob', 'Runners keep going until you steer', 'Shift jukes, Q throws it away', '★ marks an elite route runner']], ['DEFENSE', ['Pick a coverage or sim the drive (0)', 'Stick or WASD steers your man', 'Let go and he plays his assignment', 'Hold Space to sprint', 'E switches to the nearest defender']], ['READING IT', ['Defender in front of your man: do not throw', 'Defender behind him: he can only tackle', 'Lobs can be played from behind', 'Repeat a play and the defense jumps it', 'A red ! is a free rusher: get rid of it']]];
    for (const [head, items] of tips) { const col = make('div'); col.append(make('b', '', head)); for (const item of items) col.append(make('div', '', item)); help.append(col); }
    overlay.append(make('h2', '', 'TIMEOUT'), resume, stats, numbers, coach, sim, exit, help);
    // Tests and assistive tech look these up by attribute.
    $('[data-resume]').onclick = resume.onclick; $('[data-exit]').onclick = exit.onclick;
  }

  /* ---------- per-frame update ---------- */
  function readInput() {
    const up = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - stickY;
    const right = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0) + stickX;
    const d = viewDir();
    const input = { x: up * d, y: right * d, sprint: keys.has(' ') || aPointer !== null, juke: edge.juke, throwAway: edge.away, switch: edge.switch };
    if (pendingThrow) {
      pendingThrow.held += lastDt;
      if (pendingThrow.released || pendingThrow.held > 0.45) { input.throwTo = pendingThrow.label; input.lob = pendingThrow.held > 0.2; pendingThrow = null; }
    }
    if (spotThrow) {
      spotThrow.held += lastDt;
      if (spotThrow.released || spotThrow.held > 0.45) { input.throwAt = fieldAt(cursor.sx, cursor.sy); input.lob = spotThrow.held > 0.2; spotThrow = null; }
    }
    edge = { juke: false, away: false, switch: false };
    return input;
  }
  let lastDt = 0.016;
  function update(dt) {
    lastDt = dt;
    if (paused) return;
    for (const p of particles) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    particles = particles.filter(p => p.t < 3);
    for (const f of floats) f.t += dt;
    floats = floats.filter(f => f.t < 1);
    shake = Math.max(0, shake - dt * 30);
    stepFx(dt);
    if (match.phase !== 'live' || match.ball.thrown) aimLabel = 0;
    sounds();
    if (!summary && notices.length) { summary = notices.shift(); refresh(true); }
    if (summary) { summary.t += dt; if (summary.t > 3.2) { summary = null; refresh(true); } return; }
    if (meter) { meter.pos += meter.dir * meter.speed * dt; if (meter.pos > 1) { meter.pos = 1; meter.dir = -1; } if (meter.pos < -1) { meter.pos = -1; meter.dir = 1; } return; }
    const phase = match.phase;
    if (phase === 'playcall' && !userOffense() && match.simDefense) { simulateDrive(); return; }
    if (phase === 'presnap' && userOffense() && match.coach) { holdTimer += dt; if (holdTimer > 1.2) { holdTimer = 0; match.snap(); } }
    if (phase === 'presnap' || phase === 'live') { match.step(dt * (userOffense() || !match.coach ? 1 : 1.5), readInput()); sounds(); }
    else if (phase === 'dead') { resultTimer -= dt; holdTimer -= dt; if (resultTimer <= 0) match.advance(); }
    refresh(false);
  }

  /* ---------- rendering ---------- */
  let viewW = 600, viewH = 800, scale = 10, camX = 30, camY = F.FIELD_W / 2;
  const viewDir = () => (userSide < 0 || userOffense() ? 1 : -1);
  const fieldAt = (sx, sy) => ({ x: camX - (sy - viewH * 0.5) / (scale * viewDir()), y: camY + (sx - viewW / 2) / (scale * viewDir()) });
  const passing = () => match.phase === 'live' && userOffense() && !match.coach && match.carrier === match.qb && !match.ball.thrown;
  const px = (x, y) => [viewW / 2 + (y - camY) * scale * viewDir(), viewH * 0.5 - (x - camX) * scale * viewDir()];
  function text(t, x, y, size = 12, color = '#fff', align = 'center') { ctx.fillStyle = color; ctx.font = `800 ${size}px ui-monospace,Menlo,monospace`; ctx.textAlign = align; ctx.fillText(t, x, y); }
  const rect = (x0, y0, x1, y1, color) => { const [a, b] = px(x0, y0), [c, d] = px(x1, y1); ctx.fillStyle = color; ctx.fillRect(Math.min(a, c), Math.min(b, d), Math.abs(c - a), Math.abs(d - b)); };
  const hline = (x, color, width = 2) => { const [a, b] = px(x, 0), [c] = px(x, F.FIELD_W); ctx.fillStyle = color; ctx.fillRect(Math.min(a, c), b - width / 2, Math.abs(c - a), width); };

  function draw() {
    const box = canvas.getBoundingClientRect();
    viewW = Math.max(1, box.width || 600); viewH = Math.max(1, box.height || 800);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(viewW * dpr) || canvas.height !== Math.round(viewH * dpr)) { canvas.width = Math.round(viewW * dpr); canvas.height = Math.round(viewH * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Wide screens show the whole width of the field; narrow ones crop the sideline margins.
    scale = (F.FIELD_W + 5) * (viewH / 44) <= viewW ? Math.min(22, viewH / 44) : Math.min(viewH / 44, viewW / 45);
    const yards = viewH / scale, c = match.carrier, b = match.ball;
    const focus = b?.air ? b : c || { x: match.los, y: match.ballY };
    const tx = (match.phase === 'live' ? focus.x : match.los) + yards * 0.2, fits = (F.FIELD_W + 5) * scale <= viewW;
    const ty = fits ? F.FIELD_W / 2 : clamp(match.phase === 'live' ? focus.y : match.ballY, viewW / scale / 2 - 2.5, F.FIELD_W - viewW / scale / 2 + 2.5);
    const ease = Math.min(1, lastDt * 6), limit = Math.max(0, 62 - yards / 2);
    camX += (clamp(tx, 50 - limit, 50 + limit) - camX) * (Math.abs(tx - camX) > 30 ? 1 : ease); camY += (ty - camY) * ease;
    ctx.save();
    if (shake > 0.2) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    ctx.fillStyle = '#12261c'; ctx.fillRect(-20, -20, viewW + 40, viewH + 40);
    drawField();
    if (match.phase === 'presnap') drawPlayArt();
    drawPlayers();
    drawAssignment();
    drawAim();
    drawThreats();
    drawBall();
    drawFx();
    for (const f of floats) { const [x, y] = px(f.x, f.y); ctx.globalAlpha = 1 - Math.max(0, f.t); text(f.text, x, y - 22 - f.t * 24, 11, '#ffe08a'); ctx.globalAlpha = 1; }
    ctx.restore();
    for (const p of particles) { ctx.fillStyle = p.c; ctx.fillRect(p.x * viewW, p.y * viewH, 5, 8); }
    if (summary) drawSummary();
    placeThrowButtons();
  }

  function drawField() {
    const W = F.FIELD_W, offense = match.sides[match.off].team, defense = match.sides[1 - match.off].team;
    // Stands and sideline.
    rect(-12, -9, 112, W + 9, '#1b2a33'); rect(-10.6, -1.4, 110.6, W + 1.4, '#e8eee2'); rect(-10, 0, 110, W, '#2c7a48');
    for (let yard = 0; yard < 100; yard += 5) rect(yard, 0, yard + 5, W, (yard / 5) % 2 ? '#2f8050' : '#2a7446');
    rect(-10, 0, 0, W, offense.color || '#326689'); rect(100, 0, 110, W, defense.color || '#94413d');
    const [ex, ey] = px(-5, W / 2), [fx, fy] = px(105, W / 2);
    text(offense.abbr || '', ex, ey + 8, Math.max(14, scale * 2.4), '#ffffffaa'); text(defense.abbr || '', fx, fy + 8, Math.max(14, scale * 2.4), '#ffffffaa');
    for (let yard = 0; yard <= 100; yard += 5) hline(yard, yard === 0 || yard === 100 ? '#ffffff' : '#ffffff66', yard % 10 ? 1 : 1.5);
    ctx.fillStyle = '#ffffff88';
    for (let yard = 1; yard < 100; yard++) for (const hash of [23.6, 29.7, 0.7, W - 0.7]) { const [x, y] = px(yard, hash); ctx.fillRect(x - 2, y, 4, 1); }
    for (let yard = 10; yard < 100; yard += 10) for (const side of [9, W - 9]) { const [x, y] = px(yard, side); text(String(yard <= 50 ? yard : 100 - yard), x, y + scale * 0.5, Math.max(11, scale * 1.5), '#ffffff77'); }
    if (match.phase !== 'final' && match.los) { hline(match.los, '#58b7ff', 2); if (match.firstAt < 100 && !match.conv) hline(match.firstAt, '#ffd166', 2); }
  }

  const ROUTE_COLORS = ['#ffd166', '#7fe3ff', '#ff9d7a', '#c7f58d', '#e3b3ff'];
  function drawPlayArt() {
    if (!userOffense()) return;
    ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
    for (const e of match.targets) {
      ctx.strokeStyle = ROUTE_COLORS[e.label - 1];
      ctx.beginPath(); let [x, y] = px(e.x, e.y); ctx.moveTo(x, y);
      for (const p of e.job.pts) { [x, y] = px(p.x, p.y); ctx.lineTo(x, y); }
      ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.setLineDash([]);
    if (match.play.run) {
      const holeY = match.ballY + match.play.run.hole * match.flip, [x0, y0] = px(match.los - 1.2, holeY), [x1, y1] = px(match.los + 5, holeY);
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.fillStyle = '#ffd166'; ctx.beginPath(); const d = Math.sign(y1 - y0) || -1; ctx.moveTo(x1, y1 + d * 10); ctx.lineTo(x1 - 9, y1 - d * 2); ctx.lineTo(x1 + 9, y1 - d * 2); ctx.fill();
    }
  }

  function drawPlayers() {
    const r = clamp(scale * 0.72, 7, 15), live = match.phase === 'live';
    const ordered = [...match.ents].sort((a, b) => (b.x - a.x) * viewDir());
    for (const e of ordered) {
      const [x, y] = px(e.x, e.y), mine = (e.team === 0) === userOffense(), team = (mine ? me : them).team;
      const body = team.color || (mine ? '#3c8cca' : '#c75248'), helmet = team.secondary || '#f1eadd';
      const speed = Math.hypot(e.vx, e.vy), stride = live && !paused && speed > 0.6 ? Math.sin(performance.now() / 55 + e.sy * 3) * r * 0.35 : 0;
      ctx.fillStyle = '#00000055'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.75, r * 0.95, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      const controlled = live && !match.coach && (userOffense() ? e === match.carrier : e === match.userEnt);
      if (controlled || (!live && !userOffense() && e === match.userEnt)) { ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, y + r * 0.6, r * 1.5, r * 0.8, 0, 0, Math.PI * 2); ctx.stroke(); }
      if (e.stun > 0) { ctx.fillStyle = body; ctx.fillRect(Math.round(x - r), Math.round(y), Math.round(r * 2), Math.round(r * 0.7)); continue; }
      // Legs, jersey with shoulder pads, helmet with a stripe: chunky pixels, top-down.
      ctx.fillStyle = '#e9e6da'; ctx.fillRect(Math.round(x - r * 0.6), Math.round(y + r * 0.2), Math.round(r * 0.45), Math.round(r * 0.7 + stride)); ctx.fillRect(Math.round(x + r * 0.15), Math.round(y + r * 0.2), Math.round(r * 0.45), Math.round(r * 0.7 - stride));
      ctx.fillStyle = body; ctx.fillRect(Math.round(x - r), Math.round(y - r * 0.55), Math.round(r * 2), Math.round(r * 0.95));
      ctx.fillStyle = '#00000033'; ctx.fillRect(Math.round(x - r), Math.round(y + r * 0.15), Math.round(r * 2), Math.round(r * 0.25));
      ctx.fillStyle = helmet; ctx.fillRect(Math.round(x - r * 0.55), Math.round(y - r * 1.15), Math.round(r * 1.1), Math.round(r * 0.95));
      ctx.fillStyle = body; ctx.fillRect(Math.round(x - r * 0.12), Math.round(y - r * 1.15), Math.round(r * 0.24), Math.round(r * 0.95));
      if (e === match.carrier && !match.ball.air) { ctx.fillStyle = '#9a5a2b'; ctx.fillRect(Math.round(x + r * 0.75), Math.round(y - r * 0.2), Math.round(r * 0.55), Math.round(r * 0.8)); }
      if (e.label && userOffense() && match.phase === 'presnap') {
        const color = ROUTE_COLORS[e.label - 1];
        ctx.fillStyle = '#0b141c'; ctx.fillRect(Math.round(x - 8), Math.round(y - r * 1.2 - 19), 16, 15);
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(Math.round(x - 8), Math.round(y - r * 1.2 - 19), 16, 15);
        text(String(e.label), x, y - r * 1.2 - 7, 11, color);
        if (e.elite) text('★', x + 14, y - r * 1.2 - 7, 11, '#ffd166');
      }
    }
  }

  function drawBall() {
    const b = match.ball;
    if (!b?.air) return;
    const [x, y] = px(b.x, b.y), lift = (b.h - 2) * scale * 0.9 + 6;
    ctx.fillStyle = '#00000055'; ctx.beginPath(); ctx.ellipse(x, y, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b0672f'; ctx.beginPath(); ctx.ellipse(x, y - lift, 4.5, 7, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - lift - 2, 2, 4);
    const [tx, ty] = px(b.tx, b.ty);
    ctx.strokeStyle = '#ffffffaa'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(tx, ty, 9, 0, Math.PI * 2); ctx.stroke();
  }

  /** On defense, show what your highlighted defender is responsible for. */
  function drawAssignment() {
    const u = match.userEnt;
    if (userOffense() || match.coach || !u || (match.phase !== 'presnap' && match.phase !== 'live') || match.t - match.steeredAt < 0.5 && match.phase === 'live') return;
    const job = u.job, [ux, uy] = px(u.x, u.y);
    ctx.strokeStyle = '#ffd166aa'; ctx.fillStyle = '#ffd16622'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
    if (job.type === 'zone') { const [zx, zy] = px(job.x, job.y); ctx.beginPath(); ctx.ellipse(zx, zy, job.w * scale, (job.deep ? 6 : 4) * scale, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); if (match.phase === 'presnap') text(job.deep ? 'YOUR DEEP ZONE' : 'YOUR ZONE', zx, zy + 4, 10, '#ffd166'); }
    else if (job.type === 'man' && job.r) { const [rx, ry] = px(job.r.x, job.r.y); ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(rx, ry); ctx.stroke(); ctx.strokeRect(rx - 13, ry - 15, 26, 28); if (match.phase === 'presnap') text('YOUR MAN', rx, ry - 20, 10, '#ffd166'); }
    else if (job.type === 'rush' && match.qb) { const [qx, qy] = px(match.qb.x, match.qb.y); ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(qx, qy); ctx.stroke(); if (match.phase === 'presnap') text('RUSH THE PASSER', ux, uy + 30, 10, '#ffd166'); }
    ctx.setLineDash([]);
  }

  /** Flag any rusher who has come free while you still hold the ball. */
  function drawThreats() {
    if (match.phase !== 'live' || !userOffense() || match.coach || match.carrier !== match.qb || match.ball.thrown) return;
    for (const d of match.ents) {
      if (!d.team || d.eng || d.stun > 0 || d.job.type !== 'rush' || d.x > match.los + 0.5 || Math.hypot(d.x - match.qb.x, d.y - match.qb.y) > 8) continue;
      const [x, y] = px(d.x, d.y);
      ctx.fillStyle = '#ff6b5e'; ctx.fillRect(Math.round(x - 7), Math.round(y - 34), 14, 16); text('!', x, y - 21, 13, '#fff');
    }
  }

  /** First press of a number: show where the ball would go and how far it could miss. */
  function drawAim() {
    // A number key previews a throw led to that receiver; the mouse previews a throw to any spot.
    const free = !aimLabel && cursor && passing() && (spotThrow || performance.now() - cursor.at < 2500);
    const a = aimLabel ? match.aim(aimLabel, false) : free ? match.aim(fieldAt(cursor.sx, cursor.sy), spotThrow?.held > 0.2) : null;
    if (!a) return;
    const [qx, qy] = px(match.qb.x, match.qb.y), [x, y] = px(a.x, a.y), r = Math.max(6, a.radius * scale), color = a.pressure ? '#ff6b5e' : '#ffd166';
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = color + '33'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color; ctx.fillRect(x - 5, y - 1, 10, 2); ctx.fillRect(x - 1, y - 5, 2, 10);
    if (a.receiver) { const [rx, ry] = px(a.receiver.x, a.receiver.y); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(Math.round(rx - 13), Math.round(ry - 15), 26, 28); }
    const who = a.receiver ? `${a.receiver.pos} ${a.receiver.p.name}` : 'NOBODY CAN GET THERE';
    text(aimLabel ? `${who} · ${aimLabel} AGAIN TO THROW` : `${who} · CLICK TO THROW, HOLD TO LOB`, clamp(x, 200, viewW - 200), Math.max(86, y - r - 6), 10, color);
  }

  function tag(label, x, y, color) {
    ctx.font = '800 11px ui-monospace,Menlo,monospace';
    const w = ctx.measureText(label).width + 12;
    x = clamp(x, w / 2 + 4, viewW - w / 2 - 4); y = Math.max(y, 80);
    ctx.fillStyle = '#0b141cee'; ctx.fillRect(Math.round(x - w / 2), Math.round(y - 16), Math.round(w), 18);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(Math.round(x - w / 2), Math.round(y - 16), Math.round(w), 18);
    text(label, x, y - 3, 11, color);
  }
  function drawFx() {
    if (!fx || fx.t > 2.6) return;
    const who = fx.by, pulse = 1 + Math.sin(fx.t * 14) * 0.15, mineMade = who && (who.team === 0) === userOffense();
    const color = fx.result === 'catch' ? '#57e389' : mineMade ? '#57e389' : '#ff6b5e';
    if (fx.result === 'catch') {
      if (!who) return;
      const [x, y] = px(who.x, who.y);
      if (fx.t < 0.45) { ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.globalAlpha = 1 - fx.t / 0.45; ctx.beginPath(); ctx.arc(x, y, 10 + fx.t * 60, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
      if (fx.t < 1.1 && fxLabel(fx)) tag(fxLabel(fx), x, y - 26, color);
      return;
    }
    const [cx, cy] = px(fx.x0, fx.y0);
    if (fx.result !== 'miss' && fx.t < 0.4) {
      // Burst at the point of contact.
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.globalAlpha = 1 - fx.t / 0.4;
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r0 = 5 + fx.t * 30, r1 = r0 + 7; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    if (who) {
      const [x, y] = px(who.x, who.y);
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y + 4, 17 * pulse, 12 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
      tag(fxLabel(fx), clamp(x, 130, viewW - 130), y - 26, color);
      if (!fx.loose) { ctx.fillStyle = '#b0672f'; ctx.beginPath(); ctx.ellipse(x + 7, y - 10 - Math.min(1, fx.t * 4) * 6, 4.5, 7, 0.5, 0, Math.PI * 2); ctx.fill(); }
    }
    if (fx.loose) {
      const [x, y] = px(fx.x, fx.y), lift = fx.h * scale * 0.9;
      ctx.fillStyle = '#00000055'; ctx.beginPath(); ctx.ellipse(x, y, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b0672f'; ctx.beginPath(); ctx.ellipse(x, y - lift, 4.5, 7, fx.t * 9, 0, Math.PI * 2); ctx.fill();
      if (!who && fx.receiver) {
        // Nobody touched it: show how far the ball was from the receiver.
        const [rx, ry] = px(fx.receiver.x, fx.receiver.y);
        if (fx.result === 'miss') { ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(cx, cy); ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(cx - 5, cy - 5); ctx.lineTo(cx + 5, cy + 5); ctx.moveTo(cx + 5, cy - 5); ctx.lineTo(cx - 5, cy + 5); ctx.stroke(); }
        tag(fx.result === 'drop' ? 'DROPPED' : (match.last?.text || 'INCOMPLETE').toUpperCase(), fx.result === 'drop' ? rx : cx, (fx.result === 'drop' ? ry : cy) - 24, '#ffd166');
      }
    }
  }

  function drawSummary() {
    const h = 44 + summary.lines.length * 18, y0 = viewH * 0.3;
    ctx.fillStyle = '#0b141ce8'; ctx.fillRect(12, y0, viewW - 24, h);
    text(summary.title, viewW / 2, y0 + 24, 13, '#ffd166');
    summary.lines.forEach((l, i) => { ctx.font = '12px ui-sans-serif,system-ui,sans-serif'; ctx.fillStyle = '#dbe7ea'; ctx.textAlign = 'center'; ctx.fillText(l.slice(0, Math.floor(viewW / 7)), viewW / 2, y0 + 46 + i * 18); });
  }

  function placeThrowButtons() {
    const can = match.phase === 'live' && userOffense() && !match.coach && match.carrier === match.qb && !match.ball.thrown && match.qb.x <= match.los + 0.3;
    for (const b of throwButtons) {
      const e = can ? match.targets.find(t => t.label === Number(b.dataset.throw)) : null;
      b.hidden = !e;
      if (!e) continue;
      const [x, y] = px(e.x, e.y);
      b.style.left = `${clamp(x, 24, viewW - 24)}px`; b.style.top = `${clamp(y - 30, 28, viewH - 150)}px`;
      b.style.borderColor = e.open > 2.6 ? '#57e389' : e.open > 1.3 ? '#ffd166' : '#ff6b5e';
      b.className = pendingThrow?.label === e.label || aimLabel === e.label ? 'fb-throw charging' : 'fb-throw';
    }
  }

  function drawArt(c, art, w, h) {
    const X = y => (y / F.FIELD_W) * w, Y = x => h * 0.7 - x * (h / 32);
    c.fillStyle = '#1f5a3b'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#ffffff55'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, Y(0)); c.lineTo(w, Y(0)); c.stroke();
    art.routes.forEach((route, i) => {
      c.strokeStyle = art.run ? '#ffd166' : ROUTE_COLORS[i % 5]; c.lineWidth = art.run ? 4 : 2.5; c.beginPath();
      route.forEach((p, j) => (j ? c.lineTo(X(p.y), Y(p.x)) : c.moveTo(X(p.y), Y(p.x)))); c.stroke();
      const end = route[route.length - 1]; c.fillStyle = c.strokeStyle; c.beginPath(); c.arc(X(end.y), Y(end.x), 3.5, 0, Math.PI * 2); c.fill();
    });
    for (const p of art.players) { c.fillStyle = p.kind === 'ol' ? '#dfe7df' : p.kind === 'qb' ? '#ffd166' : '#fff'; if (p.kind === 'ol') c.fillRect(X(p.y) - 3, Y(p.x) - 3, 6, 6); else { c.beginPath(); c.arc(X(p.y), Y(p.x), 3.5, 0, Math.PI * 2); c.fill(); } }
  }
  function drawDefenseArt(c, call, w, h) {
    c.fillStyle = '#1f5a3b'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#ffffff55'; c.beginPath(); c.moveTo(0, h * 0.82); c.lineTo(w, h * 0.82); c.stroke();
    c.fillStyle = '#7fe3ff66'; c.strokeStyle = '#7fe3ff';
    for (const f of call.deep) { c.beginPath(); c.ellipse(f * w, h * 0.2, w / (call.deep.length * 2.4), h * 0.13, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
    c.fillStyle = '#ffd16655'; c.strokeStyle = '#ffd166';
    for (const [f, depth] of call.under || []) { c.beginPath(); c.ellipse(f * w, h * 0.82 - depth * h * 0.045, w / ((call.under.length) * 2.6), h * 0.09, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
    if (call.man) { c.strokeStyle = '#fff'; c.lineWidth = 2; for (const f of [0.1, 0.3, 0.6, 0.9]) { c.beginPath(); c.moveTo(f * w, h * 0.62); c.lineTo(f * w, h * 0.78); c.stroke(); c.fillStyle = '#fff'; c.fillRect(f * w - 3, h * 0.56, 6, 6); } }
    c.fillStyle = '#ff6b5e';
    for (let i = 0; i < call.rush; i++) { const x = w * (0.5 + (i - (call.rush - 1) / 2) * 0.09); c.beginPath(); c.moveTo(x, h * 0.97); c.lineTo(x - 4, h * 0.86); c.lineTo(x + 4, h * 0.86); c.fill(); }
  }

  /* ---------- input ---------- */
  function clearInput() { keys.clear(); stickX = stickY = 0; stickPointer = aPointer = null; pendingThrow = null; spotThrow = null; stick.style.transform = 'translate(0,0)'; }
  function primary() {
    // Space / the big button: kick, skip, snap, or switch defender depending on context.
    if (paused) return;
    if (meter) return kick();
    if (summary) { summary.t = 9; return; }
    if (match.phase === 'dead' && holdTimer <= 0) { resultTimer = 0; return; }
    if (match.phase === 'presnap' && userOffense()) return snap();
  }
  function beginThrow(label) { if (match.phase === 'live' && userOffense() && !paused && !pendingThrow) pendingThrow = { label, held: 0, released: false }; }
  function endThrow(label) { if (pendingThrow?.label === label) pendingThrow.released = true; }
  function keydown(e) {
    const k = e.key.toLowerCase();
    if (!KEYS.includes(k)) return;
    e.preventDefault();
    if (k === 'escape' || k === 'p') { if (!e.repeat) pause(); return; }
    if (paused) return;
    keys.add(k);
    if (e.repeat) return;
    if (!panel.hidden && !summary && !meter) {
      // The play-call sheet is fully keyboard driven.
      if (/^[1-9]$/.test(k)) { cardActions[Number(k) - 1]?.(); return; }
      if (k === '0' && !userOffense() && match.phase === 'playcall') { simulateDrive(); return; }
      if ((k === 'arrowright' || k === 'd') && userOffense() && match.phase !== 'pat') { cycleTab(1); return; }
      if ((k === 'arrowleft' || k === 'a') && userOffense() && match.phase !== 'pat') { cycleTab(-1); return; }
      if (k === 'f' && userOffense() && match.phase !== 'pat') { flip = -flip; buildPanel(); return; }
    }
    if (k === ' ') primary();
    else if (/^[1-5]$/.test(k)) {
      // Keyboard passing is two presses: the first shows the aim point, the second throws.
      const n = Number(k);
      if (aimLabel === n || (quickThrow && match.phase === 'live' && userOffense() && !match.coach)) beginThrow(n);
      else if (match.phase === 'live' && userOffense() && !match.coach && match.aim(n)) { aimLabel = n; blip(440, 0.03); }
    }
    else if (k === 'shift' || k === 'j') edge.juke = true;
    else if (k === 'q' || k === 'x') edge.away = true;
    else if (k === 'e' || k === 'tab') edge.switch = true;
    else if (k === 'f' && match.phase === 'presnap' && userOffense()) { flip = -match.flip; match.choosePlay(match.play.id, flip); refresh(true); }
    else if (k === 't' && match.timeout()) refresh(true);
  }
  function keyup(e) { const k = e.key.toLowerCase(); keys.delete(k); if (/^[1-5]$/.test(k)) endThrow(Number(k)); }
  function blur() { clearInput(); if (!paused && match.phase !== 'final') pause(); }
  window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup); window.addEventListener('blur', blur);
  $('[data-pause]').onclick = pause;
  const muteButton = $('[data-mute]');
  const showMute = () => { muteButton.textContent = muted ? 'Muted' : 'Sound'; };
  muteButton.onclick = () => { muted = !muted; showMute(); if (muted && crowd) { try { crowd.src.stop(); } catch { /* already stopped */ } crowd = null; } };
  showMute();

  function moveStick(e) {
    if (e.pointerId !== stickPointer) return;
    const r = joystick.getBoundingClientRect(), radius = r.width * 0.34, dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2, len = Math.hypot(dx, dy), factor = len > radius ? radius / len : 1;
    stickX = dx * factor / radius; stickY = dy * factor / radius;
    stick.style.transform = `translate(${dx * factor}px,${dy * factor}px)`;
  }
  joystick.onpointerdown = e => { e.preventDefault(); if (stickPointer !== null || paused) return; stickPointer = e.pointerId; joystick.setPointerCapture(e.pointerId); moveStick(e); };
  joystick.onpointermove = moveStick;
  joystick.onpointerup = joystick.onpointercancel = joystick.onlostpointercapture = e => { if (e.pointerId !== stickPointer) return; stickPointer = null; stickX = stickY = 0; stick.style.transform = 'translate(0,0)'; };
  btnA.onpointerdown = e => { e.preventDefault(); if (aPointer !== null || paused) return; aPointer = e.pointerId; btnA.setPointerCapture(e.pointerId); };
  btnA.onpointerup = btnA.onpointercancel = btnA.onlostpointercapture = e => { if (e.pointerId === aPointer) aPointer = null; };
  btnB.onpointerdown = e => { e.preventDefault(); if (paused) return; if (userOffense()) edge.juke = true; else edge.switch = true; };
  for (const b of throwButtons) {
    const label = Number(b.dataset.throw);
    b.onpointerdown = e => { e.preventDefault(); e.stopPropagation(); beginThrow(label); };
    b.onpointerup = b.onpointercancel = e => { e.preventDefault(); endThrow(label); };
  }
  const track = e => { const box = canvas.getBoundingClientRect(); cursor = { sx: e.clientX - box.left, sy: e.clientY - box.top, at: performance.now() }; };
  canvas.onpointermove = track;
  canvas.onpointerdown = e => {
    e.preventDefault();
    if (meter || summary || match.phase === 'dead') return primary();
    // Free aim: click or tap any spot on the field to throw there; hold to lob.
    if (passing() && !paused) { track(e); aimLabel = 0; spotThrow = { held: 0, released: false }; }
  };
  canvas.onpointerup = canvas.onpointercancel = e => { if (spotThrow) { track(e); spotThrow.released = true; } };
  meterBox.onpointerdown = e => { e.preventDefault(); kick(); };

  function hud() {
    $('[data-score="home"]').textContent = match.sides[0].score; $('[data-score="away"]').textContent = match.sides[1].score;
    const pips = side => '●'.repeat(side.timeouts) + '○'.repeat(3 - side.timeouts);
    $('[data-team="home"]').innerHTML = `${home.abbr} <b>${pips(match.sides[0])}</b>`; $('[data-team="away"]').innerHTML = `<b>${pips(match.sides[1])}</b> ${away.abbr}`;
    $('[data-clock]').textContent = clockText(); $('[data-down]').textContent = match.phase === 'final' ? 'Final' : `${match.sides[match.off].team.abbr} · ${downText()}`;
    $('[data-message]').textContent = banner.title; $('[data-sub]').textContent = banner.sub;
    const showStamina = match.phase === 'live' && !match.coach;
    $('.fb-stamina').hidden = !showStamina; $('[data-stamina]').style.width = `${Math.round(match.stamina * 100)}%`;
    if (meter) { $('[data-meter-label]').textContent = `${meter.yards}-yard field goal`; $('[data-meter-zone]').style.left = `${50 - meter.zone * 50}%`; $('[data-meter-zone]').style.width = `${meter.zone * 100}%`; $('[data-meter-mark]').style.left = `calc(${50 + meter.pos * 50}% - 2px)`; }
  }

  function tick(t) {
    if (dead) return;
    const dt = Math.min(0.04, (t - last) / 1000 || 0.016); last = t;
    update(dt); draw(); hud();
    frame = requestAnimationFrame(tick);
  }
  function destroy() {
    if (dead) return;
    dead = true; clearInput(); cancelAnimationFrame(frame);
    window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', blur);
    try { crowd?.src.stop(); } catch { /* already stopped */ }
    audio?.close(); root.remove();
  }
  refresh(true); hud();
  frame = requestAnimationFrame(tick);
  return { destroy, match };
}
