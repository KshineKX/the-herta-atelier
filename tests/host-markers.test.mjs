import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {makePlan,install,uninstall,withoutManagedMarkers,reconstructBeta10Patch} from '../tools/profile.mjs';import {makeTrialPlan,applyTrial,rollbackTrial} from '../tools/trial.mjs';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),manage=fileURLToPath(new URL('../tools/manage.mjs',import.meta.url));
function fixture(t,eol='\r\n'){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'herta-markers-'));t.after(()=>{assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(root).startsWith('herta-markers-'));fs.rmSync(root,{recursive:true,force:true});});
 const home=path.join(root,'中文 home'),dataDir=path.join(root,'用户 data'),profile=path.join(home,'profiles/desktop');fs.mkdirSync(profile,{recursive:true});
 fs.writeFileSync(path.join(profile,'package.json'),JSON.stringify({dependencies:{other:'1'},dsh:{profile:{bundles:['other']}}}));fs.writeFileSync(path.join(profile,'cordis.patch.yml'),['# unrelated','- id: other','  config: { keep: true }',''].join(eol));
 function source(version){const sourceRoot=path.join(root,version),values={'packages/skin/package.json':JSON.stringify({name:'dsh-herta-atelier',version}),'packages/skin/lib/index.js':'export const version='+JSON.stringify(version)+';'},files=[];for(const[rel,text]of Object.entries(values)){const p=path.join(sourceRoot,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,text);files.push({path:rel,bytes:Buffer.byteLength(text),sha256:hash(text)});}fs.writeFileSync(path.join(sourceRoot,'release-manifest.json'),JSON.stringify({version,edition:'core',files}));return sourceRoot;}
 const opts={dshHome:home,dataDir,sourceRoot:source('0.4.0-beta.8'),hostInfo:{}};install(makePlan(opts));
 const before=Object.fromEntries(['package.json','cordis.patch.yml'].map(n=>[n,fs.readFileSync(path.join(profile,n))]));before.state=fs.readFileSync(path.join(dataDir,'install-state-desktop.json'));before.link=fs.realpathSync(path.join(profile,'node_modules/dsh-herta-atelier'));
 const source10=source('0.4.0-beta.10'),pack=path.join(root,'motion-pack'),clips={};for(const id of ['home-idle','home-rise','home-exit','home-enter','home-sit']){const text='synthetic '+id,file=id+'/video.mp4';fs.mkdirSync(path.join(pack,id),{recursive:true});fs.writeFileSync(path.join(pack,file),text);clips[id]={file,duration:8,sha256:hash(text)};}fs.writeFileSync(path.join(pack,'motion-manifest.json'),JSON.stringify({schemaVersion:1,clips}));
 const result=applyTrial(makeTrialPlan({...opts,sourceRoot:source10,motionPack:pack}));const patchFile=path.join(profile,'cordis.patch.yml'),expected=fs.readFileSync(patchFile,'utf8');fs.writeFileSync(patchFile,withoutManagedMarkers(expected));
 return {root,profile,dataDir,opts,source,pack,source10,before,result,patchFile,expected,normalized:withoutManagedMarkers(expected),receiptFile:path.join(result.backup,'receipt.json')};
}
function assertBefore(f){for(const n of ['package.json','cordis.patch.yml'])assert.deepEqual(fs.readFileSync(path.join(f.profile,n)),f.before[n]);assert.deepEqual(fs.readFileSync(path.join(f.dataDir,'install-state-desktop.json')),f.before.state);assert.equal(fs.realpathSync(path.join(f.profile,'node_modules/dsh-herta-atelier')),f.before.link);}
test('host deletion of exactly two markers permits byte-exact trial restore for LF and CRLF',t=>{for(const eol of ['\n','\r\n']){const f=fixture(t,eol);assert.equal(rollbackTrial({...f.opts,backup:f.result.backup}).status,'rollback-plan');rollbackTrial({...f.opts,backup:f.result.backup,apply:true});assertBefore(f);}});
test('legacy beta.10 receipt is reconstructed without rewriting receipt or before backups; recovery CLI returns beta.8',t=>{
 const f=fixture(t);fs.unlinkSync(path.join(f.result.backup,'after-profile-patch.yml'));const receipt=fs.readFileSync(f.receiptFile),beforePatch=fs.readFileSync(path.join(f.result.backup,'profile-patch.yml'));
 assert.equal(rollbackTrial({...f.opts,backup:f.result.backup}).status,'rollback-plan');assert.deepEqual(fs.readFileSync(f.receiptFile),receipt);assert.deepEqual(fs.readFileSync(path.join(f.result.backup,'profile-patch.yml')),beforePatch);
 const r=spawnSync(process.execPath,[manage,'recover-beta10','--backup',f.result.backup,'--dsh-home',f.opts.dshHome,'--data-dir',f.dataDir,'--apply'],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);assertBefore(f);assert.deepEqual(fs.readFileSync(path.join(f.result.backup,'receipt-before-recovery.json')),receipt);assert.deepEqual(fs.readFileSync(path.join(f.result.backup,'profile-patch.yml')),beforePatch);
});
test('normalized installed block supports repeat install, upgrade and exact restore of the prior normalized version',t=>{
 const f=fixture(t);assert.equal(install(makePlan({...f.opts,sourceRoot:f.source10})).status,'already-installed');assert.equal(fs.readFileSync(f.patchFile,'utf8'),f.normalized);
 const result=applyTrial(makeTrialPlan({...f.opts,sourceRoot:f.source('0.4.0-beta.11'),motionPack:f.pack}));fs.writeFileSync(f.patchFile,withoutManagedMarkers(fs.readFileSync(f.patchFile,'utf8')));
 assert.equal(install(makePlan({...f.opts,sourceRoot:path.join(f.root,'0.4.0-beta.11')})).status,'already-installed');rollbackTrial({...f.opts,backup:result.backup,apply:true});assert.equal(fs.readFileSync(f.patchFile,'utf8'),f.normalized);assert.equal(JSON.parse(fs.readFileSync(path.join(f.dataDir,'install-state-desktop.json'))).version,'0.4.0-beta.10');
 fs.unlinkSync(path.join(f.result.backup,'after-profile-patch.yml'));rollbackTrial({...f.opts,backup:f.result.backup,apply:true});assertBefore(f);
});
test('extra user comments, value edits, whitespace edits and partial marker removal are never normalized away',t=>{
 const f=fixture(t);fs.unlinkSync(path.join(f.result.backup,'after-profile-patch.yml'));const receipt=fs.readFileSync(f.receiptFile);
 for(const edited of [f.normalized+'# user addition\r\n',f.normalized.replace('keep: true','keep: false'),f.normalized.replace('disabled: false','disabled: true'),f.normalized.replace('  config:','   config:'),f.expected.replace('# BEGIN THE-HERTA-ATELIER MANAGED\r\n','')]){
  fs.writeFileSync(f.patchFile,edited);assert.throws(()=>rollbackTrial({...f.opts,backup:f.result.backup,apply:true}),/Profile changed/);assert.equal(fs.readFileSync(f.patchFile,'utf8'),edited);assert.deepEqual(fs.readFileSync(f.receiptFile),receipt);
 }
 fs.writeFileSync(f.patchFile,f.normalized.replace('disabled: false','disabled: true'));assert.throws(()=>makePlan({...f.opts,sourceRoot:f.source10}),/Managed patch/);
});
test('unrelated later edits survive normalized-block upgrade/uninstall; owned edits and duplicate ownership are refused',t=>{
 const f=fixture(t);fs.appendFileSync(f.patchFile,'# later user edit\r\n');install(makePlan({...f.opts,sourceRoot:f.source('0.4.0-beta.11')}));fs.writeFileSync(f.patchFile,withoutManagedMarkers(fs.readFileSync(f.patchFile,'utf8')));uninstall({...f.opts,apply:true});assert.ok(fs.readFileSync(f.patchFile,'utf8').endsWith('# later user edit\r\n'));assert.equal(fs.readFileSync(f.patchFile,'utf8').includes('ui-skin-herta-atelier'),false);
 const g=fixture(t);fs.appendFileSync(g.patchFile,'- id: ui-skin-herta-atelier\r\n  disabled: false\r\n');assert.throws(()=>makePlan({...g.opts,sourceRoot:g.source10}),/Managed patch/);
});
test('legacy recovery keeps package/state/backup integrity checks strict',t=>{
 const f=fixture(t);fs.unlinkSync(path.join(f.result.backup,'after-profile-patch.yml'));
 for(const file of [path.join(f.profile,'package.json'),path.join(f.dataDir,'install-state-desktop.json'),path.join(f.result.backup,'profile-patch.yml')]){const before=fs.readFileSync(file);fs.appendFileSync(file,' ');assert.throws(()=>rollbackTrial({...f.opts,backup:f.result.backup,apply:true}),/Profile changed|Backup integrity/);assert.equal(fs.readFileSync(file).at(-1),32);fs.writeFileSync(file,before);}
 const r=JSON.parse(fs.readFileSync(f.receiptFile));r.afterFiles['profile-patch.yml']='0'.repeat(64);fs.writeFileSync(f.receiptFile,JSON.stringify(r));assert.throws(()=>rollbackTrial({...f.opts,backup:f.result.backup,apply:true}),/Cannot reconstruct/);
});
test('checked recovery launcher rejects changed tools and can restore a legacy beta.10 directly to beta.8',async t=>{
 const f=fixture(t),root=path.join(f.root,'recovery only'),source=fileURLToPath(new URL('../',import.meta.url));fs.unlinkSync(path.join(f.result.backup,'after-profile-patch.yml'));
 const {RECOVERY_FILES}=await import('../tools/recovery-files.mjs');const names=RECOVERY_FILES.map(name=>'tools/'+name);for(const name of [...names,'tools/recover-beta10.ps1']){fs.mkdirSync(path.dirname(path.join(root,name)),{recursive:true});fs.copyFileSync(path.join(source,name),path.join(root,name));}
 fs.writeFileSync(path.join(root,'recovery-manifest.json'),JSON.stringify({schemaVersion:1,version:'0.4.0-beta.11',targetReceipt:'0.4.0-beta.10',files:names.map(name=>({path:name,sha256:hash(fs.readFileSync(path.join(root,name)))}))}));
 const tool=path.join(root,'tools/trial.mjs'),original=fs.readFileSync(tool),run=()=>spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(root,'tools/recover-beta10.ps1'),'-DshHome',f.opts.dshHome,'-DataDir',f.dataDir,'-Backup',f.result.backup,'-Apply'],{encoding:'utf8',windowsHide:true,timeout:30000});
 fs.appendFileSync(tool,'\n// changed');let result=run();assert.notEqual(result.status,0);assert.match(result.stdout,/integrity mismatch/);assert.equal(fs.readFileSync(f.patchFile,'utf8'),f.normalized);
 fs.writeFileSync(tool,original);result=run();assert.equal(result.status,0,result.stdout+result.stderr);assertBefore(f);
});
test('legacy beta.10 duplicate rows require whole-patch receipt proof before repeat or upgrade; prior rows remain exact',t=>{
 const f=fixture(t);rollbackTrial({...f.opts,backup:f.result.backup,apply:true});
 const plan=makeTrialPlan({...f.opts,sourceRoot:f.source10,motionPack:f.pack}),oldStateFile=path.join(f.dataDir,'install-state-desktop.json'),oldState=JSON.parse(fs.readFileSync(oldStateFile)),body=withoutManagedMarkers(oldState.managedBlock);
 delete oldState.installedPatch;fs.writeFileSync(oldStateFile,JSON.stringify(oldState));const before=withoutManagedMarkers(fs.readFileSync(f.patchFile,'utf8'))+body+body;fs.writeFileSync(f.patchFile,before);
 plan.core.patch=before;plan.core.nextPatch=reconstructBeta10Patch(before,null,plan.core.managedBlock);plan.core.previousState=oldState;
 const result=applyTrial(plan,{onPhase(phase){if(phase==='motion-activated'){const state=JSON.parse(fs.readFileSync(oldStateFile));delete state.installedPatch;fs.writeFileSync(oldStateFile,JSON.stringify(state));}}});
 fs.unlinkSync(path.join(result.backup,'after-profile-patch.yml'));fs.writeFileSync(path.join(f.dataDir,'latest-trial-desktop.json'),JSON.stringify({backup:result.backup}));const expected=fs.readFileSync(f.patchFile,'utf8'),normalized=withoutManagedMarkers(expected);fs.writeFileSync(f.patchFile,normalized);
 assert.equal(install(makePlan({...f.opts,sourceRoot:f.source10})).status,'already-installed');fs.appendFileSync(f.patchFile,'# actual user change\r\n');assert.throws(()=>makePlan({...f.opts,sourceRoot:f.source10}),/ambiguous/);fs.writeFileSync(f.patchFile,normalized);
 const upgrade=applyTrial(makeTrialPlan({...f.opts,sourceRoot:f.source('0.4.0-beta.11'),motionPack:f.pack}));fs.writeFileSync(f.patchFile,withoutManagedMarkers(fs.readFileSync(f.patchFile,'utf8')));assert.equal(install(makePlan({...f.opts,sourceRoot:path.join(f.root,'0.4.0-beta.11')})).status,'already-installed');rollbackTrial({...f.opts,backup:upgrade.backup,apply:true});assert.equal(fs.readFileSync(f.patchFile,'utf8'),normalized);
 rollbackTrial({...f.opts,backup:result.backup,apply:true});assert.equal(fs.readFileSync(f.patchFile,'utf8'),before);
});
