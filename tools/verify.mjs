import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'))),skin=JSON.parse(fs.readFileSync(path.join(root,'packages/skin/package.json'))),meta=JSON.parse(fs.readFileSync(path.join(root,'packages/skin/skin.json')));
assert.equal(pkg.version,skin.version);assert.equal(pkg.version,meta.version);assert.equal(meta.author,'Kshine');
assert.equal(pkg.license,'PolyForm-Noncommercial-1.0.0');assert.equal(skin.license,pkg.license);
const ownLicense=fs.readFileSync(path.join(root,'LICENSE'),'utf8');assert.ok(ownLicense.includes('PolyForm Noncommercial License 1.0.0'));assert.ok(ownLicense.includes('Required Notice: Copyright (c) 2026 Kshine.'));assert.equal(fs.readFileSync(path.join(root,'packages/skin/LICENSE'),'utf8'),ownLicense);
assert.ok(fs.readFileSync(path.join(root,'packages/skin/licenses/CC-BY-NC-SA-4.0.txt'),'utf8').includes('Attribution-NonCommercial-ShareAlike'));
const boot=JSON.parse(fs.readFileSync(path.join(root,'packages/boot/package.json')));assert.equal(pkg.version,boot.version);assert.equal(pkg.engines.node,boot.engines.node);
for(const [folder,p] of [['skin',skin],['boot',boot]]){
 const base=path.join(root,'packages',folder);
 const checkExport=value=>{if(typeof value==='string'){assert.ok(value.startsWith('./'));assert.ok(fs.existsSync(path.join(base,value)),'Missing export '+folder+'/'+value);}else for(const v of Object.values(value))checkExport(v);};
 for(const value of Object.values(p.exports))checkExport(value);
 assert.ok(fs.existsSync(path.join(base,p.dsh.bundle.patch)),'Missing DSH bundle patch '+folder);
 for(const name of p.files)assert.ok(fs.existsSync(path.join(base,name)),'Missing packaged target '+folder+'/'+name);
}
const source=fs.readFileSync(path.join(root,'packages/skin/src/client.js'),'utf8'),mirror=fs.readFileSync(path.join(root,'packages/skin/src/mirror.js'),'utf8').replace(/^export /gm,'');
const motion=fs.readFileSync(path.join(root,'packages/skin/src/motion.js'),'utf8').replace(/^export /gm,'');
const dock=fs.readFileSync(path.join(root,'packages/skin/src/dock.js'),'utf8').replace(/^export /gm,'');
const body=source.replace(/^import \{ createMirror \} from '\.\/mirror\.js';\r?\n/m,'').replace(/^import \{ createIdleMotion \} from '\.\/motion\.js';\r?\n/m,'').replace(/^import \{ createToolDock \} from '\.\/dock\.js';\r?\n/m,'').replace(/^export /gm,'');
const expected="window.__ModuleLoader__.load({id:'dsh-herta-atelier',factory:function(require){\nconst module={exports:{}};const exports=module.exports;\n"+mirror+'\n'+motion+'\n'+dock+'\n'+body+"\nObject.assign(exports,{apply});return module.exports;\n}});\n";
assert.equal(fs.readFileSync(path.join(root,'packages/skin/lib/client.js'),'utf8'),expected,'Stale skin bundle');assert.ok(source.includes('v'+pkg.version));
const forbidden=['qq'+'-bridge','guest'+'-workspace','mirror'+'-portrait-sole','ref'+'-dragon','herta-pv'+'-native-1080p.mp4'];
let textFiles=0;const forbiddenFiles=[];const checked=[];
function walk(dir,rel=''){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['.git','dist','private-media','runtime-data'].includes(e.name)||(e.name==='node_modules'&&!rel.endsWith('/vendor')))continue;const p=path.join(dir,e.name),r=rel?rel+'/'+e.name:e.name;if(e.isSymbolicLink())throw Error('Unexpected source symlink '+r);if(e.isDirectory())walk(p,r);else if(/\.(?:mjs|js|json|md|yml|yaml|cmd|ps1|svg|txt)$/.test(e.name)||e.name==='LICENSE'){
 const s=fs.readFileSync(p,'utf8');for(const word of forbidden)if(s.includes(word))throw Error('Private legacy marker '+word+' in '+r);
 if(/[A-Za-z]:[\\/]+Users[\\/]+[^\\/\s"'<>]+/.test(s))throw Error('Machine-specific user path in '+r);
 if(/\.(?:mjs|js)$/.test(e.name)){const run=spawnSync(process.execPath,['--check',p],{windowsHide:true,encoding:'utf8'});assert.equal(run.status,0,run.stderr);checked.push(r);}
 if(/\.(?:cmd|ps1)$/.test(e.name))assert.ok([...s].every(c=>c.charCodeAt(0)<128),'Windows bootstrap must remain ASCII: '+r);
 textFiles++;
 }else if(/\.(?:mp4|mov|webm|jpg|jpeg)$/.test(e.name)&&!r.startsWith('docs/screenshots/')&&!/^packages\/skin\/motion\/[a-z-]+\/video\.mp4$/.test(r))forbiddenFiles.push(r);
}}
walk(root);assert.deepEqual(forbiddenFiles,[],'Private/video/raster residue');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'release-manifest.json')));for(const e of manifest.files){const p=path.resolve(root,e.path);assert.ok(p.startsWith(path.resolve(root)+path.sep));assert.equal(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),e.sha256,'Manifest drift '+e.path);}
if(manifest.edition==='core')assert.ok(!manifest.files.some(e=>e.path.endsWith('.webp')||e.path.startsWith('docs/screenshots/')),'Core includes portrait media');
const report={version:pkg.version,readOnly:true,sourceTextFiles:textFiles,syntaxChecked:checked.length,manifestFiles:manifest.files.length,edition:manifest.edition,ownerPathsAbsent:true,userGalleryAndVideoAbsent:true,mediaRights:manifest.mediaRights,bundleTargetsPresent:true,bundleFresh:true};console.log(JSON.stringify(report,null,2));
