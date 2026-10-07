import assert from 'node:assert/strict';
import {createLeague,advance,autoDraft,validateLeague,roster,capUsed,scout,currentPick,draftPlayer,signPlayer,trade,marketValue,recordPlayedGame,releasePlayer,generateTradeOffers,acceptTradeOffer} from '../engine.js';
const a=createLeague('test',0),b=createLeague('test',0);
assert.deepEqual(a,b,'Seed must reproduce universe');
assert.equal(a.players.filter(p=>p.teamId!==null).length,1696);
assert.equal(a.schedule.length,272);
for(let t=0;t<32;t++){const games=a.schedule.filter(g=>g.home===t||g.away===t);assert.equal(games.length,17);assert.equal(new Set(games.map(g=>g.week)).size,17);assert.ok(Math.abs(games.filter(g=>g.home===t).length-games.filter(g=>g.away===t).length)<=1);let previous=null,streak=0;for(const g of games){const home=g.home===t;streak=home===previous?streak+1:1;previous=home;assert.ok(streak<=5,'Long home/away streak');}}
assert.deepEqual(validateLeague(a),[]);
const snapshot=JSON.parse(JSON.stringify(a));advance(a);advance(snapshot);assert.deepEqual(a,snapshot,'Save roundtrip preserves PRNG');
for(const g of a.schedule.filter(g=>g.played)){for(const side of ['home','away'])assert.equal(g.box.drives.filter(d=>d.teamId===g[side]).reduce((n,d)=>n+d.points,0),g[side+'Score']);}
assert.ok(a.players.every(p=>p.season.games<=1),'A player may appear once per game');
const offers=createLeague('offers');generateTradeOffers(offers);assert.ok(offers.tradeOffers.length);assert.equal(acceptTradeOffer(offers,offers.tradeOffers[0].id),'Trade accepted.');
const tx=createLeague('transactions');
const departing=roster(tx).find(p=>p.pos==='WR');assert.match(releasePlayer(tx,departing.id),/released/);
const fa=tx.players.find(p=>p.teamId===null&&p.ovr<60);assert.match(signPlayer(tx,fa.id,2,marketValue(fa)*1.2),/signed/);assert.equal(fa.teamId,0);
const played=createLeague('played');const game=played.schedule.find(g=>g.home===0||g.away===0);recordPlayedGame(played,game.id,{homeScore:21,awayScore:14,userStats:{passAttempts:15,completions:10,passYards:210,passTD:2,interceptions:1,rushAttempts:8,rushYards:60,rushTD:1,sacks:2}});const box=game.home===0?game.box.home:game.box.away;assert.equal(box.passYards,210);assert.equal(box.rushYards,60);assert.equal(box.lines.filter(p=>p.pos==='QB')[0].passAttempts,15);assert.equal(box.lines.reduce((n,p)=>n+(p.recYards||0),0),210);assert.ok(played.players.every(p=>p.season.games<=1));
const gift=a.picks.find(p=>p.teamId===0&&p.year===a.year+2);assert.equal(trade(a,1,[],[],[gift.id],[]),'Trade accepted.');assert.equal(gift.teamId,1);
const invalid=JSON.stringify(a);assert.match(trade(a,1,[],[],[a.picks[0].id,a.picks[0].id],[]),/unique/);assert.equal(JSON.stringify(a),invalid);
let seasons=0,drafts=0,firstQB=a.players.find(p=>p.pos==='QB'&&p.teamId===0),initialAge=firstQB.age;const ratings=[],scores=[];
while(seasons<20){if(a.phase==='draft'){assert.equal(a.draft.order.length,224);const p=a.prospects[0];if(currentPick(a).teamId===0)draftPlayer(a,p.id);autoDraft(a);assert.equal(a.draft.index,224);assert.equal(a.draft.selections.length,224);drafts++;}else if(a.phase==='scouting'){assert.equal(a.prospects.length,300);const before=a.scoutingPoints;scout(a,a.prospects[0].id);assert.equal(a.scoutingPoints,before-15);advance(a);}else{const before=a.phase;advance(a);if(before==='playoffs'&&a.phase==='offseason'){seasons++;assert.equal(a.history.length,seasons);assert.ok(a.history.at(-1).awards.length>=2);assert.equal(a.schedule.filter(g=>g.label==='Crown Championship'&&g.played).length,1);for(const g of a.schedule.filter(g=>!g.playoff))scores.push(g.homeScore,g.awayScore);ratings.push(a.players.filter(p=>p.teamId!==null).reduce((n,p)=>n+p.ovr,0)/1696);}if(a.phase==='regular'){assert.deepEqual(validateLeague(a),[]);for(const t of a.teams)assert.ok(capUsed(a,t.id)<=a.cap+.01);}}}
assert.equal(drafts,19);assert.ok(firstQB.age>initialAge);assert.ok(a.hallOfFame.length>0);assert.ok(a.players.some(p=>p.draftYear>2026));assert.ok(a.history.at(-1).leaders.passYards.value>1000);
const average=scores.reduce((a,b)=>a+b,0)/scores.length;assert.ok(average>15&&average<34,`Scoring ${average}`);assert.ok(ratings.at(-1)<80,`Inflation ${ratings}`);
console.log(JSON.stringify({seasons,drafts,meanPoints:average,meanRatings:ratings.map(x=>Math.round(x)),champions:new Set(a.history.map(h=>h.champion)).size,hallOfFame:a.hallOfFame.length,players:a.players.length},null,2));
console.log('Franchise invariants passed.');
