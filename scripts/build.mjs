import {readFile,writeFile,mkdir} from 'node:fs/promises';
const engine=await readFile('engine.js','utf8'),game=await readFile('game.js','utf8');
const football=await readFile('football.js','utf8'),footballExports=[...football.matchAll(/export (?:const|function) (\w+)/g)].map(x=>x[1]);
const exports=[...engine.matchAll(/export (?:const|function) (\w+)/g)].map(x=>x[1]);
const source=`const E=(()=>{${engine.replaceAll('export ','')}\nreturn {${exports.join(',')}}})();\nconst F=(()=>{${football.replaceAll('export ','')}\nreturn {${footballExports.join(',')}}})();\n${game.replace(/^import .*;\n/gm,'').replaceAll('export ','')}\n${(await readFile('validation.js','utf8')).replaceAll('export ','')}\n${(await readFile('app.js','utf8')).replace(/^import .*;\n/gm,'')}`;
const css=await readFile('style.css','utf8');
let html=await readFile('index.html','utf8');
html=html.replace('<link rel="stylesheet" href="style.css">',()=>`<style>${css}</style>`).replace('<script type="module" src="app.js"></script>',()=>`<script type="module">${source.replaceAll('</script','<\\/script')}</script>`);
await mkdir('dist',{recursive:true});await writeFile('dist/Fourth-and-Forever.html',html);console.log(`Built standalone game (${Math.round(html.length/1024)} KB). Open dist/Fourth-and-Forever.html directly; no server or install required.`);
