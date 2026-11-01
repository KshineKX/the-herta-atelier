import fs from 'node:fs';import os from 'node:os';import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {skinFingerprint,readBuildMeta,parseGitHubRemote,FINGERPRINT_INPUTS} from '../packages/skin/build-fingerprint.mjs';
const source=fileURLToPath(new URL('../',import.meta.url)),skin=path.join(source,'packages/skin');
test('committed skin.build.json matches the shipped runtime inputs',()=>{const meta=readBuildMeta(skin);assert.ok(meta,'missing packages/skin/skin.build.json; run node packages/skin/build.mjs');assert.equal(meta.schema,1);assert.ok(/^[0-9a-f]{64}$/.test(meta.fingerprint));assert.equal(meta.fingerprint,skinFingerprint(skin),'stale skin.build.json; rebuild before committing');assert.ok(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(meta.repository));assert.equal(meta.path,'packages/skin');assert.ok(meta.sourceCommit===null||/^[0-9a-f]{40}$/.test(meta.sourceCommit));assert.deepEqual([...FINGERPRINT_INPUTS],['lib/client.js','lib/index.js','lib/motion.js','cordis.patch.yml','skin.json']);});
test('GitHub remote parsing accepts the documented forms only',()=>{assert.equal(parseGitHubRemote('https://github.com/KshineKX/the-herta-atelier.git'),'KshineKX/the-herta-atelier');assert.equal(parseGitHubRemote('git@github.com:KshineKX/the-herta-atelier.git'),'KshineKX/the-herta-atelier');assert.equal(parseGitHubRemote('git://github.com/KshineKX/the-herta-atelier'),'KshineKX/the-herta-atelier');assert.equal(parseGitHubRemote('https://example.com/KshineKX/the-herta-atelier.git'),null);assert.equal(parseGitHubRemote(''),null);});

test('changing only Host motion routing changes the skin build identity',t=>{
 const root=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'herta-motion-identity-'));
 t.after(()=>{assert.equal(path.dirname(root),fs.realpathSync.native(os.tmpdir()));assert.ok(path.basename(root).startsWith('herta-motion-identity-'));fs.rmSync(root,{recursive:true,force:true})});
 for(const input of FINGERPRINT_INPUTS){const target=path.join(root,input);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(skin,input),target)}
 const before=skinFingerprint(root);fs.appendFileSync(path.join(root,'lib/motion.js'),'\n// fixture Host-only change\n');assert.notEqual(skinFingerprint(root),before);
});
