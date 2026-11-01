import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inventory,verifyMedia} from '../tools/release-policy.mjs';

test('market preview copies retain reviewed identity and pass the release media gate',()=>{
 const root=fileURLToPath(new URL('../',import.meta.url));
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'media-manifest.json'),'utf8'));
 for(const mode of ['dark','light']){
  const source=manifest.files.find(e=>e.path===`docs/screenshots/overview-beta11-${mode}.jpg`);
  const preview=manifest.files.find(e=>e.path===`packages/skin/preview/overview-beta11-${mode}.jpg`);
  assert.ok(source&&preview,'reviewed original and market copy must both be registered');
  assert.equal(preview.bytes,source.bytes);
  assert.equal(preview.sha256,source.sha256);
 }
 assert.equal(verifyMedia(root,inventory(root)).reviewedMedia,manifest.files.length);
});
