import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {inventory,isVisual} from '../tools/release-policy.mjs';
test('market previews lead with dark/light showcase and retain historical reading examples last',()=>{
 const root=fileURLToPath(new URL('../',import.meta.url)),entries=inventory(root),screenshots=JSON.parse(fs.readFileSync(path.join(root,'packages/skin/screenshots.json'))),core=!entries.some(e=>isVisual(e.path));
 if(core){assert.deepEqual(screenshots,[]);return;}
 assert.deepEqual(screenshots,['preview/showcase-beta14-dark.jpg','preview/showcase-beta14-light.jpg','preview/overview-beta11-light.jpg','preview/overview-beta11-dark.jpg']);
 const media=JSON.parse(fs.readFileSync(path.join(root,'media-manifest.json')));
 for(const file of screenshots){const rel='packages/skin/'+file,entry=entries.find(e=>e.path===rel),approved=media.files.find(e=>e.path===rel);assert.ok(entry&&approved);assert.equal(entry.sha256,approved.sha256);assert.equal(entry.bytes,approved.bytes)}
 for(const doc of ['README.md','packages/skin/README.md']){const text=fs.readFileSync(path.join(root,doc),'utf8');const dark=text.indexOf('showcase-beta14-dark.jpg'),light=text.indexOf('showcase-beta14-light.jpg'),reading=text.indexOf('overview-beta11-light.jpg');assert.ok(dark>=0&&light>dark&&reading>light);assert.ok(text.includes('隔离预览'));}
});
