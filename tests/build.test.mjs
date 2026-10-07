import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
test('standalone build preserves JavaScript literal dollar signs and embeds all source',()=>{execFileSync(process.execPath,['scripts/build.mjs']);const html=readFileSync('dist/Fourth-and-Forever.html','utf8');assert.ok(html.includes('`$${Number(v||0).toFixed(1)}M`'));assert.ok(html.includes('function validateSave'));assert.ok(html.includes('function startGame'));assert.equal(/(?:src="(?:app|engine|game)\.js|href="style.css")/.test(html),false);});
