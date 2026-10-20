import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';
import {makePlan,install,uninstall} from '../tools/profile.mjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function fixture(t,{newline='\r\n',ending=true}={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'herta-test-'));t.after(()=>{const target=path.resolve(dir),base=path.resolve(os.tmpdir());if(!target.startsWith(base+path.sep)||!path.basename(target).startsWith('herta-test-'))throw Error('Cleanup boundary');fs.rmSync(target,{recursive:true,force:true});});
 const home=path.join(dir,'测试 DSH home'),profile=path.join(home,'profiles/desktop'),source=path.join(dir,'发布 包'),dataDir=path.join(dir,'用户数据');fs.mkdirSync(profile,{recursive:true});fs.mkdirSync(path.join(source,'packages/skin/lib'),{recursive:true});fs.mkdirSync(path.join(source,'packages/boot/lib'),{recursive:true});
 const original={name:'test-profile',dependencies:{'other-plugin':'1.0'},dsh:{profile:{bundles:['other-plugin']}},note:'中文原样保留'};
 fs.writeFileSync(path.join(profile,'package.json'),JSON.stringify(original,null,2).replaceAll('\n',newline)+newline);
 const patch=['# 用户自己的配置','- id: ui-skin-example','  disabled: false','- id: unrelated','  config: { keep: true }'].join(newline)+(ending?newline:'');fs.writeFileSync(path.join(profile,'cordis.patch.yml'),patch);
 for(const [pkg,name]of [['skin','dsh-herta-atelier'],['boot','dsh-boot-animation']]){fs.writeFileSync(path.join(source,'packages',pkg,'package.json'),JSON.stringify({name,version:'test'}));fs.writeFileSync(path.join(source,'packages',pkg,'lib/index.js'),'export const test=true;\n');}
 const sdk='packages/boot/vendor/packages/@deepseek-ai/schemastery/package.json';fs.mkdirSync(path.dirname(path.join(source,sdk)),{recursive:true});fs.writeFileSync(path.join(source,sdk),JSON.stringify({name:'@deepseek-ai/schemastery',version:'3.18.5',license:'MIT'}));
 const files=[];for(const pkg of ['skin','boot'])for(const file of ['package.json','lib/index.js']){const rel='packages/'+pkg+'/'+file,b=fs.readFileSync(path.join(source,rel));files.push({path:rel,sha256:sha(b),bytes:b.length});}
 const sdkBytes=fs.readFileSync(path.join(source,sdk));files.push({path:sdk,sha256:sha(sdkBytes),bytes:sdkBytes.length});fs.writeFileSync(path.join(source,'release-manifest.json'),JSON.stringify({version:'0.4.0-test',edition:'core',files}));
 return {dir,home,profile,source,dataDir,original,patch,options:{dshHome:home,dataDir,sourceRoot:source,hostInfo:{desktopVersion:'test',schemaVersion:'3.18.4'}}};
}
test('plan is read-only; install is idempotent and uninstall preserves private data and later unrelated edits',t=>{
 const f=fixture(t);const before=fs.readFileSync(path.join(f.profile,'package.json'));const p=makePlan(f.options);assert.equal(fs.existsSync(f.dataDir),false);assert.deepEqual(fs.readFileSync(path.join(f.profile,'package.json')),before);
 assert.equal(install(p).status,'installed');assert.equal(install(makePlan(f.options)).status,'already-installed');
 const state=JSON.parse(fs.readFileSync(path.join(f.dataDir,'install-state-desktop.json')));assert.equal(JSON.parse(fs.readFileSync(path.join(state.installed['dsh-herta-atelier'].target,'runtime-config.json'))).dataDirectory,f.dataDir);
 const manifestFile=path.join(f.profile,'package.json'),j=JSON.parse(fs.readFileSync(manifestFile));j.dependencies['later-plugin']='2.0';fs.writeFileSync(manifestFile,JSON.stringify(j,null,2)+'\r\n');fs.appendFileSync(path.join(f.profile,'cordis.patch.yml'),'# later edit\r\n');
 fs.writeFileSync(path.join(f.dataDir,'gallery','private.jpg'),'personal bytes');assert.equal(uninstall({...f.options,apply:true}).status,'uninstalled');
 const after=JSON.parse(fs.readFileSync(manifestFile));assert.equal(after.note,f.original.note);assert.equal(after.dependencies['later-plugin'],'2.0');assert.equal(after.dependencies['dsh-herta-atelier'],undefined);assert.deepEqual(after.dsh.profile.bundles,['other-plugin']);
 assert.equal(fs.readFileSync(path.join(f.profile,'cordis.patch.yml'),'utf8'),f.patch+'# later edit\r\n');assert.equal(fs.readFileSync(path.join(f.dataDir,'gallery/private.jpg'),'utf8'),'personal bytes');
});
test('a failure after profile writes rolls back both files and junctions',t=>{
 const f=fixture(t),p=makePlan(f.options);assert.throws(()=>install(p,{onPhase(){throw Error('simulated interruption');}}),/simulated/);
 assert.equal(fs.readFileSync(path.join(f.profile,'cordis.patch.yml'),'utf8'),f.patch);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.profile,'package.json'))),f.original);assert.equal(fs.existsSync(path.join(f.profile,'node_modules/dsh-herta-atelier')),false);
});
test('existing Herta junction and dependency are restored exactly',t=>{
 const f=fixture(t),old=path.join(f.dir,'旧版本');fs.mkdirSync(old);fs.writeFileSync(path.join(old,'package.json'),JSON.stringify({name:'dsh-herta-atelier'}));fs.mkdirSync(path.join(f.profile,'node_modules'),{recursive:true});const link=path.join(f.profile,'node_modules/dsh-herta-atelier');fs.symlinkSync(old,link,process.platform==='win32'?'junction':'dir');
 const file=path.join(f.profile,'package.json'),j=JSON.parse(fs.readFileSync(file));j.dependencies['dsh-herta-atelier']='link:'+old;j.dsh.profile.bundles.push('dsh-herta-atelier');fs.writeFileSync(file,JSON.stringify(j));
 install(makePlan(f.options));uninstall({...f.options,apply:true});assert.equal(fs.realpathSync(link),old);assert.equal(JSON.parse(fs.readFileSync(file)).dependencies['dsh-herta-atelier'],'link:'+old);
});
test('edited managed state or payload is refused before replacing user changes',t=>{
 const f=fixture(t);fs.appendFileSync(path.join(f.source,'packages/skin/lib/index.js'),'modified');assert.throws(()=>makePlan(f.options),/integrity/);assert.equal(fs.existsSync(f.dataDir),false);
});
test('non-link package and optional boot without user video fail preflight',t=>{
 const f=fixture(t);assert.throws(()=>makePlan({...f.options,withBoot:true,hostInfo:{}}),/video/i);fs.mkdirSync(path.join(f.profile,'node_modules/dsh-herta-atelier'),{recursive:true});assert.throws(()=>makePlan(f.options),/non-link/);assert.equal(fs.existsSync(f.dataDir),false);
});
test('an original YAML document without a final newline restores byte-for-byte',t=>{
 const f=fixture(t,{newline:'\n',ending:false});install(makePlan(f.options));uninstall({...f.options,apply:true});assert.equal(fs.readFileSync(path.join(f.profile,'cordis.patch.yml'),'utf8'),f.patch);
});
test('managed block edits are preserved by refusing uninstall',t=>{
 const f=fixture(t);install(makePlan(f.options));const file=path.join(f.profile,'cordis.patch.yml');fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('  disabled: false\r\n# END','  disabled: true\r\n# END'));fs.appendFileSync(file,'# user\r\n');const edited=fs.readFileSync(file,'utf8');
 // Change an owned line explicitly, regardless of other theme rows.
 fs.writeFileSync(file,edited.replace('- id: ui-skin-herta-atelier\r\n  disabled: false','- id: ui-skin-herta-atelier\r\n  disabled: true'));assert.throws(()=>uninstall({...f.options,apply:true}),/Managed patch/);
});
test('a version upgrade preserves the first-install rollback baseline',t=>{
 const f=fixture(t);install(makePlan(f.options));const manifestFile=path.join(f.source,'release-manifest.json'),release=JSON.parse(fs.readFileSync(manifestFile));release.version='0.4.1-test';fs.writeFileSync(manifestFile,JSON.stringify(release));
 install(makePlan(f.options));const state=JSON.parse(fs.readFileSync(path.join(f.dataDir,'install-state-desktop.json')));assert.equal(state.version,'0.4.1-test');assert.equal(state.original.dependencies['dsh-herta-atelier'],null);uninstall({...f.options,apply:true});assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.profile,'package.json'))),f.original);
});
test('optional boot uses an external video folder and survives a normal upgrade invocation',t=>{
 const f=fixture(t);fs.mkdirSync(path.join(f.dataDir,'boot-videos'),{recursive:true});fs.writeFileSync(path.join(f.dataDir,'boot-videos/personal.mp4'),'transport fixture');install(makePlan({...f.options,withBoot:true}));
 const state=JSON.parse(fs.readFileSync(path.join(f.dataDir,'install-state-desktop.json')));assert.equal(fs.realpathSync(path.join(state.installed['dsh-boot-animation'].target,'assets/videos')),path.join(f.dataDir,'boot-videos'));assert.equal(install(makePlan(f.options)).status,'already-installed');uninstall({...f.options,apply:true});assert.equal(fs.readFileSync(path.join(f.dataDir,'boot-videos/personal.mp4'),'utf8'),'transport fixture');
});
test('manual dependency changes after installation are not silently overwritten',t=>{
 const f=fixture(t);install(makePlan(f.options));const file=path.join(f.profile,'package.json'),j=JSON.parse(fs.readFileSync(file));j.dependencies['dsh-herta-atelier']='link:manual-change';fs.writeFileSync(file,JSON.stringify(j));assert.throws(()=>makePlan(f.options),/edited/);assert.equal(JSON.parse(fs.readFileSync(file)).dependencies['dsh-herta-atelier'],'link:manual-change');
});
