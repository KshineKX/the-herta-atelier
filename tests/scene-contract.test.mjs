import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCENE_DEFINITIONS} from '../packages/skin/src/scenes.js';
import {MOTION_SCENES} from '../packages/skin/src/motion.js';

const file=new URL('../packages/skin/motion/motion-manifest.json',import.meta.url);
test('frontend action graph and the complete media manifest reference exactly the same thirteen clips',{skip:!fs.existsSync(file)&&'Core edition has no portrait media'},()=>{
 const ids=new Set();for(const[id,scene]of Object.entries(SCENE_DEFINITIONS)){assert.equal(MOTION_SCENES[id],scene.motion);ids.add(scene.motion.idle);for(const action of Object.values(scene.motion.actions))for(const clip of action.clips)ids.add(clip);for(const name of Object.values(scene.artwork))assert.ok(fs.existsSync(new URL('../packages/skin/assets/'+name,import.meta.url)))}
 const clips=JSON.parse(fs.readFileSync(file)).clips;assert.equal(ids.size,13);assert.deepEqual([...ids].sort(),Object.keys(clips).sort());
});
