/** Validate portable save structure before replacing a live franchise. */
export function validateSave(s){
 const fail=()=>{throw new Error('Invalid or incompatible franchise backup. Your existing franchise has not been replaced.');};
 if(!s||s.version!==1||!Number.isInteger(s.year)||!Number.isInteger(s.week)||!Number.isFinite(s.rng)||!['regular','playoffs','offseason','freeagency','scouting','draft','camp'].includes(s.phase))fail();
 for(const k of ['teams','players','schedule','prospects','picks','news','history'])if(!Array.isArray(s[k]))fail();
 if(s.teams.length!==32||!s.teams.some(t=>t.id===s.userTeamId)||!Number.isFinite(s.cap))fail();
 for(const t of s.teams)if(!Number.isInteger(t.id)||!t.record||!t.coaches?.head||!t.coaches?.offense||!t.coaches?.defense||typeof t.scheme?.offense!=='string'||typeof t.name!=='string')fail();
 if(new Set(s.teams.map(t=>t.id)).size!==32||new Set(s.players.map(p=>p.id)).size!==s.players.length)fail();
 for(const p of [...s.players,...s.prospects])if(typeof p.id!=='string'||typeof p.name!=='string'||!p.attrs||!p.contract||!p.season||!p.career||!Number.isFinite(p.ovr)||!Number.isFinite(p.age)||!Number.isFinite(p.contract.salary)||!Array.isArray(p.transactions)||!Array.isArray(p.awards))fail();
 for(const g of s.schedule)if(!s.teams[g.home]||!s.teams[g.away]||!Number.isInteger(g.week))fail();
 for(const p of s.picks)if(!s.teams[p.teamId]||!Number.isInteger(p.round))fail();
 if(s.phase==='draft'&&(!Array.isArray(s.draft?.order)||!Number.isInteger(s.draft.index)))fail();
 return s;
}
