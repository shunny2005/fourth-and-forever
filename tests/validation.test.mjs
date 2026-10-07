import test from 'node:test';
import assert from 'node:assert/strict';
import {createLeague} from '../engine.js';
import {validateSave} from '../validation.js';
test('complete saves validate and malformed imports are rejected',()=>{const s=createLeague('validation');assert.equal(validateSave(s),s);for(const key of ['prospects','news','picks','history']){const bad={...s};delete bad[key];assert.throws(()=>validateSave(bad));}const broken=JSON.parse(JSON.stringify(s));delete broken.players[0].contract;assert.throws(()=>validateSave(broken));});
