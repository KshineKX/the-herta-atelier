import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {inventory,verifyMedia,isVisual} from '../tools/release-policy.mjs';
import {prepareEdition} from '../tools/package-edition.mjs';

test('market preview copies retain reviewed identity and pass the release media gate',()=>{
 const root=fileURLToPath(new URL('../',import.meta.url));
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'media-manifest.json'),'utf8'));
 const entries=inventory(root),core=!entries.some(e=>isVisual(e.path));
 for(const mode of ['dark','light']){
  const source=manifest.files.find(e=>e.path===`docs/screenshots/overview-beta11-${mode}.jpg`);
  const preview=manifest.files.find(e=>e.path===`packages/skin/preview/overview-beta11-${mode}.jpg`);
  if(core){assert.equal(source,undefined);assert.equal(preview,undefined);continue;}
  assert.ok(source&&preview,'reviewed original and market copy must both be registered');
  assert.equal(preview.bytes,source.bytes);
  assert.equal(preview.sha256,source.sha256);
 }
 assert.equal(verifyMedia(root,entries).reviewedMedia,manifest.files.length);
});

test('core edition removes package declarations and screenshot links for excluded previews',t=>{
 const root=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'herta-core-preview-'));
 t.after(()=>{assert.equal(path.dirname(root),fs.realpathSync.native(os.tmpdir()));assert.ok(path.basename(root).startsWith('herta-core-preview-'));fs.rmSync(root,{recursive:true,force:true})});
 fs.mkdirSync(path.join(root,'packages/skin'),{recursive:true});
 fs.writeFileSync(path.join(root,'packages/skin/package.json'),JSON.stringify({files:['lib','motion','preview','assets','screenshots.json']}));
 fs.writeFileSync(path.join(root,'packages/skin/screenshots.json'),'["preview/example.jpg"]');
 fs.writeFileSync(path.join(root,'media-manifest.json'),JSON.stringify({schemaVersion:1,files:[]}));
 prepareEdition(root,'core');
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'packages/skin/package.json'))).files,['lib','assets','screenshots.json']);
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'packages/skin/screenshots.json'))),[]);
});
