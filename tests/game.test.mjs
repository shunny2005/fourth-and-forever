import test from 'node:test';
import assert from 'node:assert/strict';
import { startGame } from '../game.js';
import { createLeague, roster } from '../engine.js';
const league=createLeague(3);

// A deliberately minimal DOM/Canvas host tests the public component and input
// boundary. Browser visual checks complement these lifecycle and football tests.
class Element {
  constructor() { this.style={}; this.nodes=new Map(); this.children=[]; this.dataset={}; this.hidden=false; this.disabled=false; this.textContent=''; }
  set innerHTML(value) { this.html=value; }
  get innerHTML() { return this.html; }
  querySelector(selector) { if(!this.nodes.has(selector)) this.nodes.set(selector,new Element()); return this.nodes.get(selector); }
  querySelectorAll() { return []; }
  getBoundingClientRect(){return {left:0,top:0,width:390,height:650};}
  setPointerCapture(id){this.captured=id;}
  append(...nodes) { this.children.push(...nodes); }
  get width(){return this._w||0;} set width(v){this._w=v;}
  replaceChildren(...nodes) { this.children=nodes; }
  remove() { this.removed=true; }
  getContext() { return new Proxy({},{get:()=>()=>({width:0})}); }
}
function host(seed=1) {
  const original={document:globalThis.document,window:globalThis.window,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame,random:Math.random};
  let pending=null,time=0,rng=seed;
  const listeners={};
  globalThis.document={createElement:()=>new Element()};
  globalThis.window={addEventListener:(k,fn)=>listeners[k]=fn,removeEventListener:k=>delete listeners[k]};
  globalThis.requestAnimationFrame=fn=>{pending=fn;return 1;};
  globalThis.cancelAnimationFrame=()=>pending=null;
  Math.random=()=>((rng=(Math.imul(rng,1664525)+1013904223)>>>0)/4294967296);
  return {
    listeners,
    press(key) { listeners.keydown?.({key,preventDefault(){},repeat:false}); },
    release(key) { listeners.keyup?.({key}); },
    step() { const callback=pending;pending=null;callback?.(time+=40); },
    restore() { for(const key of ['document','window','requestAnimationFrame','cancelAnimationFrame']) { if(original[key]===undefined) delete globalThis[key];else globalThis[key]=original[key]; } Math.random=original.random; }
  };
}
const clubs={home:{id:0,abbr:'HOM',city:'Home',color:'#225577',secondary:'#ffffff',scheme:{offense:'West Coast',defense:'4-3'}},away:{id:1,abbr:'AWY',city:'Away',color:'#aa3333',secondary:'#eeeeee',scheme:{offense:'Power Run',defense:'Blitz'}}};
const cards=root=>root.querySelector('.fb-panel').children.find(c=>c.className==='fb-cards').children;
const overlayButton=(root,text)=>root.querySelector('.fb-overlay').children.find(c=>c.textContent?.startsWith(text));

test('a full game is playable through the interface: play calls, snaps, throws, defense and kicks',()=>{
  for(let strategy=0;strategy<4;strategy++) {
    const env=host(923+strategy),container=new Element();let result,game;
    try {
      game=startGame(container,{home:league.teams[0],away:league.teams[1],homeRoster:roster(league,0),awayRoster:roster(league,1),userTeamId:strategy%2,muted:true,onFinish:r=>result=r});
      const root=container.children[0],m=game.match;
      for(let frame=0;frame<120000&&!result;frame++) {
        const panel=root.querySelector('.fb-panel');
        if(!panel.hidden&&m.phase==='pat') panel.children[1].children[strategy===3?1:0].onclick();
        else if(!panel.hidden&&m.phase==='playcall') {
          if(m.off===m.user) {
            if(m.down===4&&!m.conv) { if(m.los>=62) m.fieldGoal(0); else m.punt(); }
            else { const list=cards(root);list[(frame+strategy)%list.length].onclick(); }
          } else if(strategy<2) { const list=cards(root);list[frame%list.length].onclick(); }
          else panel.children.find(c=>c.className==='fb-row').children[0].onclick();
        }
        else if(m.phase==='presnap'&&m.off===m.user) { env.press(' ');env.release(' '); }
        else if(m.phase==='live'&&m.off===m.user) {
          const passing=strategy%2===0&&m.play.type==='pass'&&m.carrier===m.qb&&!m.ball.thrown;
          if(!passing) env.press('ArrowUp');
          else { env.release('ArrowUp');if(m.t>1.2&&frame%7===0){ const key=String(1+frame%5);env.press(key);env.release(key);env.press(key);env.release(key); } }
        }
        else if(m.phase==='live') { env.press('ArrowDown');if(frame%40===0){env.press(' ');env.release(' ');} }
        else if(m.phase==='dead') { env.release('ArrowUp');env.release('ArrowDown');env.press(' ');env.release(' '); }
        env.step();
        const overlay=root.querySelector('.fb-overlay'),done=!overlay.hidden&&overlayButton(root,'Return');
        if(done) done.onclick();
      }
      assert.ok(result,`strategy ${strategy} must reach final whistle`);
      assert.notEqual(result.homeScore,result.awayScore,'overtime must resolve a tie');
      assert.ok(Number.isInteger(result.homeScore)&&result.homeScore>=0&&Number.isInteger(result.awayScore)&&result.awayScore>=0);
      assert.ok(result.userStats.completions<=result.userStats.passAttempts);
      assert.ok(Object.values(result.userStats).every(Number.isFinite));
      assert.ok(result.userStats.rushAttempts+result.userStats.passAttempts>5,'the user ran real plays');
      if(strategy%2===0) assert.ok(result.userStats.passAttempts>0,'number keys throw passes');
      assert.ok(result.drives.length>4);
      assert.ok(root.removed,'completion tears down the component');
      assert.equal(Object.keys(env.listeners).length,0,'completion removes keyboard and blur listeners');
    } finally { game?.destroy();env.restore(); }
  }
});

test('pause freezes clock and exit cancels without committing a result',()=>{
  const env=host(),container=new Element();let completed=false,exited=false,game;
  try {
    game=startGame(container,{...clubs,userTeamId:0,muted:true,onFinish:()=>completed=true,onExit:()=>exited=true});
    const root=container.children[0];cards(root)[0].onclick();env.press(' ');env.release(' ');env.step();
    assert.equal(game.match.phase,'live');
    env.press('Escape');
    const clock=game.match.clock;
    for(let i=0;i<500;i++)env.step();
    assert.equal(game.match.clock,clock);
    assert.equal(root.querySelector('.fb-overlay').hidden,false);
    root.querySelector('[data-exit]').onclick();
    assert.equal(exited,true);assert.equal(completed,false);assert.ok(root.removed);
    assert.equal(Object.keys(env.listeners).length,0);
  } finally { game?.destroy();env.restore(); }
});

test('destroy is idempotent with an active audio context',()=>{
  const env=host(),container=new Element();let closed=0;
  class Audio {constructor(){this.currentTime=0;this.destination={};}resume(){}createOscillator(){return {frequency:{},connect(){},start(){},stop(){}}}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}close(){assert.equal(closed,0,'audio must close only once');closed++;}}
  window.AudioContext=Audio;
  try {const game=startGame(container,{...clubs,userTeamId:0,muted:false});cards(container.children[0])[0].onclick();env.press(' ');game.destroy();game.destroy();assert.equal(closed,1);}finally{env.restore();}
});

test('touch snap, joystick, receiver targets and cancelled pointers work together',()=>{
  const env=host(42),container=new Element();let game;
  const pointer=(id,x=195,y=100)=>({pointerId:id,clientX:x,clientY:y,preventDefault(){},stopPropagation(){}});
  try {
    game=startGame(container,{...clubs,userTeamId:0,muted:true});
    const root=container.children[0],m=game.match,joystick=root.querySelector('.fb-joystick');
    m.choosePlay('curls',1);env.step();
    const bar=root.querySelector('.fb-bar');
    assert.equal(bar.hidden,false,'the pre-snap bar offers snap, audible and flip');
    bar.children.find(b=>b.textContent==='SNAP').onclick();env.step();
    assert.equal(m.phase,'live');
    assert.equal(root.querySelector('.fb-panel').hidden,true,'playbook clears the live field');
    assert.equal(root.querySelector('.fb-controls').hidden,false);
    joystick.onpointerdown(pointer(2));
    assert.equal(joystick.captured,2);
    joystick.onpointerdown(pointer(3,0,0));
    assert.equal(joystick.captured,2,'second finger cannot steal the movement pointer');
    joystick.onpointercancel(pointer(2));
    assert.equal(root.querySelector('.fb-stick').style.transform,'translate(0,0)');
    for(let i=0;i<20;i++)env.step();
    const receiver=root.querySelector('[data-throw="1"]');
    assert.equal(receiver.hidden,false,'eligible receivers have visible passing targets');
    receiver.onpointerdown(pointer(4));for(let i=0;i<8;i++)env.step();receiver.onpointerup(pointer(4));env.step();
    assert.equal(m.ball.thrown,true,'releasing a held target throws the ball');
    assert.equal(m.ball.lob,true,'holding the target lobs it');
    assert.equal(receiver.hidden,true,'targets clear once ball is in flight');
    env.listeners.blur();
    assert.equal(root.querySelector('.fb-overlay').hidden,false,'losing focus pauses play');
  } finally {game?.destroy();env.restore();}
});

test('the whole play call works from the keyboard, with clock plays and a box score in the pause menu',()=>{
  const env=host(7),container=new Element();let game;
  try {
    game=startGame(container,{home:league.teams[0],away:league.teams[1],homeRoster:roster(league,0),awayRoster:roster(league,1),userTeamId:0,muted:true});
    const root=container.children[0],m=game.match,panel=root.querySelector('.fb-panel');
    const tabs=()=>panel.children.find(c=>c.className==='fb-tabs').children;
    assert.equal(tabs().find(b=>b.className==='active').textContent,'COACH');
    env.press('ArrowRight');env.release('ArrowRight');
    assert.equal(tabs().find(b=>b.className==='active').textContent,'RUN');
    env.press('ArrowLeft');env.release('ArrowLeft');env.press('ArrowLeft');env.release('ArrowLeft');
    assert.equal(tabs().find(b=>b.className==='active').textContent,'SPECIAL','tabs wrap around');
    assert.equal(cards(root).length,4,'field goal, punt, kneel and spike');
    env.press('3');env.release('3');
    assert.equal(m.phase,'dead');assert.match(m.last.text,/takes a knee/);
    for(let i=0;i<200&&m.phase==='dead';i++)env.step();
    assert.equal(m.phase,'playcall');assert.equal(m.down,2);
    env.press('ArrowRight');env.release('ArrowRight');env.press('ArrowRight');env.release('ArrowRight');
    env.press('2');env.release('2');
    assert.equal(m.phase,'presnap','a number key calls the play');
    assert.equal(m.play.type,'run');
    env.step();
    assert.match(root.querySelector('[data-sub]').textContent,/in the box/,'the pre-snap read describes the defense');
    env.press('Escape');
    const overlay=root.querySelector('.fb-overlay');
    overlay.children.find(c=>c.textContent==='Box score and drives').onclick();
    assert.ok(overlay.children.length===3,'score, box score and a back button');
  } finally {game?.destroy();env.restore();}
});
