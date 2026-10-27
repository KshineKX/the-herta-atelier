import {atomicWrite,writeJson,beginCore,finishCore,switchPackageLink,recoverInterrupted,assertNoInterrupted,withoutManagedMarkers,patchMatchesExpected} from './transaction.mjs';
import {RECOVERY_FILES} from './recovery-files.mjs';
export {withoutManagedMarkers,patchMatchesExpected} from './transaction.mjs';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';import {inspectHost,hasBootSchema} from './host.mjs';
export const projectRoot=fileURLToPath(new URL('../',import.meta.url));
const BEGIN='# BEGIN THE-HERTA-ATELIER MANAGED',END='# END THE-HERTA-ATELIER MANAGED';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>fs.readFileSync(p,'utf8');const json=p=>JSON.parse(read(p));
const within=(p,base)=>p===base||p.startsWith(base+path.sep);
const exists=p=>{try{fs.lstatSync(p);return true;}catch{return false;}};
const write=atomicWrite;
const clone=x=>structuredClone(x);
function format(j,old){const indent=/\n([ \t]+)"/.exec(old)?.[1]||'  ';return JSON.stringify(j,null,indent).replaceAll('\n',old.includes('\r\n')?'\r\n':'\n')+(old.includes('\r\n')?'\r\n':'\n');}
export function locations(options={}){
 const dshHome=path.resolve(options.dshHome||process.env.DSH_HOME||path.join(os.homedir(),'.dsh')),profile=options.profile||'desktop';
 if(!/^[\w-]+$/.test(profile))throw Error('Invalid profile name');
 const dataDir=path.resolve(options.dataDir||process.env.HERTA_ATELIER_HOME||path.join(dshHome,'herta-atelier'));
 return {dshHome,profile,dataDir,profileDir:path.join(dshHome,'profiles',profile),stateFile:path.join(dataDir,'install-state-'+profile+'.json')};
}
function ownedBlock(text){const a=text.indexOf(BEGIN);if(a<0)return null;const b=text.indexOf(END,a);if(b<0||text.indexOf(BEGIN,a+BEGIN.length)>=0)throw Error('Ambiguous managed YAML block');const end=b+END.length+(text.slice(b+END.length).startsWith('\r\n')?2:text[b+END.length]==='\n'?1:0);return {start:a,end,text:text.slice(a,end)};}
function managedBlockIn(text,state){
 const block=ownedBlock(text);if(block){if(!state||block.text!==state.managedBlock)throw Error('Managed patch block was edited or is unowned; refusing to overwrite it.');return block;}
 if(!state)return null;
 const body=withoutManagedMarkers(state.managedBlock||'');
 if(!body||text.includes(BEGIN)||text.includes(END))throw Error('Managed patch was changed; preserve it and resolve manually.');
 const start=text.indexOf(body);
 if(start<0||(start>0&&text[start-1]!=='\n'))throw Error('Managed patch was changed; preserve it and resolve manually.');
 if(text.indexOf(body,start+body.length)>=0||[...text.matchAll(/^\s*-\s*id:\s*ui-skin-herta-atelier\s*$/gm)].length!==1){
  // Historical host-normalized installs may already have duplicate rows.
  // Select only the last block when the WHOLE patch is proven, never by a
  // lastIndexOf heuristic. Earlier rows remain untouched for exact rollback.
  const expected=state.installedPatch||legacyInstalledPatch(state);
  if(!expected||!patchMatchesExpected(text,expected)||!text.endsWith(body))throw Error('Managed patch ownership is ambiguous; preserve it and resolve manually.');
  return{start:text.length-body.length,end:text.length,text:body,hostRemovedMarkers:true};
 }
 return{start,end:start+body.length,text:body,hostRemovedMarkers:true};
}
function legacyInstalledPatch(state){
 if(state.version!=='0.4.0-beta.10')return null;
 try{
  const profile=path.basename(state.profileDir),pointer=json(path.join(state.dataDir,'latest-trial-'+profile+'.json')),backup=path.resolve(pointer.backup),base=path.resolve(state.dataDir,'trial-backups');
  if(!backup.startsWith(base+path.sep))return null;
  const r=json(path.join(backup,'receipt.json'));
  if(r.version!==state.version||r.phase!=='installed'||r.profileDir!==state.profileDir||r.dataDir!==state.dataDir||r.profile!==profile||hash(fs.readFileSync(path.join(state.dataDir,'install-state-'+profile+'.json')))!==r.afterFiles['install-state.json'])return null;
  const before=read(path.join(backup,'profile-patch.yml'));if(hash(Buffer.from(before))!==r.beforeFiles['profile-patch.yml'])return null;
  let previous=null;if(r.beforeFiles['install-state.json']!==null){const raw=read(path.join(backup,'install-state.json'));if(hash(Buffer.from(raw))!==r.beforeFiles['install-state.json'])return null;previous=JSON.parse(raw);}
  const expected=reconstructBeta10Patch(before,previous,state.managedBlock);return hash(Buffer.from(expected))===r.afterFiles['profile-patch.yml']?expected:null;
 }catch{return null;}
}
export function replaceManagedPatch(patch,state,managedBlock){
 const block=managedBlockIn(patch,state),without=block?patch.slice(0,block.start)+patch.slice(block.end):patch;
 const eol=patch.includes('\r\n')?'\r\n':'\n',separator=without&&!/[\r\n]$/.test(without)?eol:'';
 return{nextPatch:without+separator+managedBlock,separator};
}
// Exact beta.10 algorithm, used only with a receipt-bound after hash. Its old
// no-marker behavior appended a block even when a previous install existed.
export function reconstructBeta10Patch(patch,state,managedBlock){
 const block=ownedBlock(patch);if(block&&(!state||block.text!==state.managedBlock))throw Error('Legacy managed patch mismatch');
 const without=block?patch.slice(0,block.start)+patch.slice(block.end):patch,eol=patch.includes('\r\n')?'\r\n':'\n';
 return without+(without&&!/[\r\n]$/.test(without)?eol:'')+managedBlock;
}
function skinIds(text){return [...new Set([...text.matchAll(/^\s*-\s*id:\s*(ui-skin-[\w-]+)\s*$/gm)].map(m=>m[1]))].filter(id=>id!=='ui-skin-herta-atelier');}
export function inspectPatch(text){
 const counts=new Map();for(const m of text.matchAll(/^\s*-\s*id:\s*(ui-skin-[\w-]+)\s*$/gm))counts.set(m[1],(counts.get(m[1])||0)+1);
 const entries=[...counts].map(([id,count])=>({id,count}));
 const managedBlocks=[...text.matchAll(/^# BEGIN THE-HERTA-ATELIER MANAGED\s*$/gm)].length;
 return {readOnly:true,managedBlocks,entries,duplicateIds:entries.filter(x=>x.count>1),legacyHertaEntries:managedBlocks===0?(counts.get('ui-skin-herta-atelier')||0):null,repairApplied:false};
}
export function makePlan(options={}){
 const loc=locations(options);assertNoInterrupted(loc);const source=path.resolve(options.sourceRoot||projectRoot),manifestFile=path.join(loc.profileDir,'package.json'),patchFile=path.join(loc.profileDir,'cordis.patch.yml');
 if(!fs.existsSync(manifestFile)||!fs.existsSync(patchFile))throw Error('DSH desktop profile not found. Start DSH once, or pass --dsh-home / --profile.');
 const raw=read(manifestFile),manifest=JSON.parse(raw),patch=read(patchFile),release=json(path.join(source,'release-manifest.json'));
 if(!manifest.dsh?.profile||!Array.isArray(manifest.dsh.profile.bundles))throw Error('Unsupported DSH profile format; nothing was changed.');
 for(const e of release.files){const from=path.resolve(source,e.path);if(!within(from,source)||hash(fs.readFileSync(from))!==e.sha256)throw Error('Release integrity mismatch: '+e.path);}
 const state=fs.existsSync(loc.stateFile)?json(loc.stateFile):null;
 if(state&&state.profileDir!==loc.profileDir)throw Error('State belongs to a different profile');
 const withBoot=!!options.withBoot||!!state?.installed?.['dsh-boot-animation'];
 const host=options.hostInfo||inspectHost({...options,profileDir:loc.profileDir});
 const schemaFile=path.join(source,'packages/boot/vendor/packages/@deepseek-ai/schemastery/package.json');
 const bundledSchema=fs.existsSync(schemaFile)?json(schemaFile).version:null;
 if(withBoot&&!hasBootSchema({schemaVersion:bundledSchema}))throw Error('Optional boot package is missing its bundled schemastery >=3.18.4.');
 if(withBoot){const videos=path.join(loc.dataDir,'boot-videos');if(!fs.existsSync(videos)||!fs.readdirSync(videos).some(f=>/\.(mp4|webm|m4v|mov)$/i.test(f)))throw Error('Import a personal boot video first using ImportVideo.cmd.');}
 managedBlockIn(patch,state);
 const versionDir=path.join(loc.dataDir,'versions',release.version);
 if(within(versionDir,path.join(source,'packages')))throw Error('Install destination overlaps source packages');
 const names=['dsh-herta-atelier',...(withBoot?['dsh-boot-animation']:[])],targets={};
 for(const name of names){const link=path.join(loc.profileDir,'node_modules',name);const pkg=name==='dsh-herta-atelier'?'skin':'boot';targets[name]=path.join(versionDir,'packages',pkg);
   if(exists(link)&&!fs.lstatSync(link).isSymbolicLink())throw Error('Existing non-link package is preserved: '+name);
   if(exists(link)){const real=fs.realpathSync(link);try{if(json(path.join(real,'package.json')).name!==name)throw Error();}catch{throw Error('Existing link has an unexpected owner: '+name);}if(state?.installed?.[name]&&real!==state.installed[name].target)throw Error('Package link was edited after install: '+name);}
   if(state?.installed?.[name]&&manifest.dependencies?.[name]!==state.installed[name].dependency)throw Error('Dependency was edited after install: '+name);
 }
 const eol=patch.includes('\r\n')?'\r\n':'\n';const switches=skinIds(patch);
 const managedBlock=[BEGIN,'- id: ui-skin-herta-atelier','  disabled: false',...switches.flatMap(id=>['- id: '+id,'  disabled: true']),END,''].join(eol);
 const {nextPatch,separator}=replaceManagedPatch(patch,state,managedBlock);
 const next=clone(manifest);next.dependencies??={};
 for(const name of names){next.dependencies[name]='link:'+targets[name].replaceAll('\\','/');if(!next.dsh.profile.bundles.includes(name))next.dsh.profile.bundles.push(name);}
 return {...loc,source,manifestFile,patchFile,raw,manifest,patch,nextRaw:format(next,raw),nextPatch,managedBlock,separator,release,versionDir,names,targets,previousState:state,host,withBoot,bundledSchema};
}
export function publicPlan(plan){return {version:plan.release.version,edition:plan.release.edition,profile:plan.profile,installDirectory:plan.versionDir,dataDirectory:plan.dataDir,optionalBoot:plan.withBoot,bundledBootSchema:plan.bundledSchema,host:plan.host,actions:['verify release hashes','back up profile and prior links','install runtime','update owned profile entries','activate Herta theme'],nativeAcceptance:'pending restart'};}
function installManagement(plan){
 const base=path.join(plan.dataDir,'management',plan.release.version),tools=path.join(base,'tools');fs.mkdirSync(tools,{recursive:true});
 for(const name of RECOVERY_FILES)fs.copyFileSync(fileURLToPath(new URL('./'+name,import.meta.url)),path.join(tools,name));
 const compatibility=path.join(plan.source,'packages/skin/host-compatibility.json');if(fs.existsSync(compatibility)){const destination=path.join(base,'packages/skin/host-compatibility.json');fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(compatibility,destination);}
 writeJson(path.join(base,'installed-location.json'),{dshHome:plan.dshHome,dataDir:plan.dataDir,profile:plan.profile});
 for(const[name,action]of Object.entries({'Check.cmd':'doctor','Rollback.cmd':'rollback','Uninstall.cmd':'uninstall','OpenGallery.cmd':'gallery','RecoverInstall.cmd':'recover-install'})){
  const target=path.join(plan.dataDir,name),marker='REM THE-HERTA-ATELIER MANAGED ACTION';if(fs.existsSync(target)&&!read(target).includes(marker))continue;
  write(target,'@echo off\r\n'+marker+'\r\nsetlocal DisableDelayedExpansion\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0management\\'+plan.release.version+'\\tools\\installed-action.ps1" -Action '+action+'\r\npause\r\n');
 }
}
export function install(plan,{onPhase=()=>{}}={}){
 const current=fs.existsSync(plan.stateFile)?json(plan.stateFile):null;
 const entries=plan.release.files.filter(entry=>entry.path.startsWith('packages/skin/')||(plan.withBoot&&entry.path.startsWith('packages/boot/')));
 if(current?.version===plan.release.version&&read(plan.manifestFile)===plan.nextRaw&&patchMatchesExpected(read(plan.patchFile),plan.nextPatch)){
  if(entries.every(entry=>fs.existsSync(path.join(plan.versionDir,entry.path)))){for(const entry of entries)if(hash(fs.readFileSync(path.join(plan.versionDir,entry.path)))!==entry.sha256)throw Error('Installed runtime was edited: '+entry.path);return{status:'already-installed',version:current.version};}
 }
 if(read(plan.manifestFile)!==plan.raw||read(plan.patchFile)!==plan.patch)throw Error('Profile changed after planning; run again.');
 const backup=path.join(plan.dataDir,'backups',new Date().toISOString().replace(/[:.]/g,'-')+'-'+plan.profile+'-'+crypto.randomUUID()),beforeLinks={};
 fs.mkdirSync(backup,{recursive:true});fs.copyFileSync(plan.manifestFile,path.join(backup,'package.json'));fs.copyFileSync(plan.patchFile,path.join(backup,'cordis.patch.yml'));
 for(const name of plan.names){const link=path.join(plan.profileDir,'node_modules',name);beforeLinks[name]=exists(link)?fs.realpathSync(link):null;}
 const original=clone(plan.previousState?.original||{dependencies:{},bundles:[],links:{}});
 for(const name of plan.names)if(!Object.hasOwn(original.dependencies,name)){original.dependencies[name]=plan.manifest.dependencies?.[name]??null;original.links[name]=beforeLinks[name];if(plan.manifest.dsh.profile.bundles.includes(name))original.bundles.push(name);}
 const state={schemaVersion:1,version:plan.release.version,sourceCommit:plan.release.source?.commit||null,releaseManifestSha256:hash(fs.readFileSync(path.join(plan.source,'release-manifest.json'))),profileDir:plan.profileDir,dataDir:plan.dataDir,backup,managedBlock:plan.managedBlock,installedPatch:plan.nextPatch,separator:plan.previousState?.separator??plan.separator,original,installed:Object.fromEntries(plan.names.map(name=>[name,{dependency:'link:'+plan.targets[name].replaceAll('\\','/'),target:plan.targets[name]}]))};
 const staging=path.join(plan.dataDir,'versions','.stage-'+plan.release.version+'-'+crypto.randomUUID()),transaction=beginCore(plan,backup,beforeLinks,state,staging);
 try{
  const existing=fs.existsSync(plan.versionDir),destination=existing?plan.versionDir:staging;
  for(const entry of entries){const target=path.resolve(destination,entry.path);if(!within(target,destination))throw Error('Install path escaped');if(existing){if(!fs.existsSync(target)||hash(fs.readFileSync(target))!==entry.sha256)throw Error('Installed runtime was modified; preserve it and use a new version');}else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(plan.source,entry.path),target);if(hash(fs.readFileSync(target))!==entry.sha256)throw Error('Runtime changed during copy');}}
  onPhase('runtime-staged');
  const skin=path.join(destination,'packages/skin'),locator=path.join(skin,'runtime-config.json');if(fs.existsSync(locator)&&json(locator).dataDirectory!==plan.dataDir)throw Error('Installed data locator was modified');if(!fs.existsSync(locator))writeJson(locator,{schemaVersion:1,dataDirectory:plan.dataDir});
  if(plan.withBoot){const boot=path.join(destination,'packages/boot'),modules=path.join(boot,'node_modules');if(!fs.existsSync(modules))fs.cpSync(path.join(boot,'vendor/packages'),modules,{recursive:true,dereference:true});const videos=path.join(boot,'assets/videos');fs.mkdirSync(path.dirname(videos),{recursive:true});if(fs.existsSync(videos)&&fs.readdirSync(videos).length===0)fs.rmdirSync(videos);if(!exists(videos))fs.symlinkSync(path.join(plan.dataDir,'boot-videos'),videos,process.platform==='win32'?'junction':'dir');}
  if(!existing)fs.renameSync(staging,plan.versionDir);onPhase('runtime-activated');
  fs.mkdirSync(path.join(plan.dataDir,'gallery'),{recursive:true});if(!fs.existsSync(path.join(plan.dataDir,'settings.json')))writeJson(path.join(plan.dataDir,'settings.json'),{schemaVersion:1,galleryDirectory:path.join(plan.dataDir,'gallery')});
  for(const name of plan.names)switchPackageLink(plan,transaction,name,{onPhase});
  write(plan.manifestFile,plan.nextRaw);write(plan.patchFile,plan.nextPatch);onPhase('profile-written');writeJson(plan.stateFile,state);onPhase('core-state-written');installManagement(plan);finishCore(plan,transaction);
  return{status:'installed',version:state.version,backup,nativeAcceptance:'pending restart'};
 }catch(error){try{recoverInterrupted(plan,{apply:true,allowLive:true});}catch(recovery){throw Error(error.message+'; recovery stopped to preserve changes: '+recovery.message);}throw error;}
}
export function uninstall(options={}){
 const loc=locations(options);if(!fs.existsSync(loc.stateFile))return {status:'not-installed'};
 const state=json(loc.stateFile),manifestFile=path.join(loc.profileDir,'package.json'),patchFile=path.join(loc.profileDir,'cordis.patch.yml'),raw=read(manifestFile),manifest=JSON.parse(raw),patch=read(patchFile),block=managedBlockIn(patch,state);
 if(!block)throw Error('Managed patch was changed; preserve it and resolve manually.');
 for(const [name,entry]of Object.entries(state.installed)){if(manifest.dependencies?.[name]!==entry.dependency)throw Error('Package dependency changed after install: '+name);const link=path.join(loc.profileDir,'node_modules',name);if(!exists(link)||!fs.lstatSync(link).isSymbolicLink()||fs.realpathSync(link)!==entry.target)throw Error('Package link changed after install: '+name);}
 if(!options.apply)return {status:'uninstall-plan',packages:Object.keys(state.installed),userData:'preserved'};
 const backup=path.join(loc.dataDir,'backups','uninstall-'+Date.now());fs.mkdirSync(backup,{recursive:true});fs.copyFileSync(manifestFile,path.join(backup,'package.json'));fs.copyFileSync(patchFile,path.join(backup,'cordis.patch.yml'));
 const next=clone(manifest);for(const name of Object.keys(state.installed)){if(state.original.dependencies[name]===null)delete next.dependencies[name];else next.dependencies[name]=state.original.dependencies[name];if(!state.original.bundles.includes(name))next.dsh.profile.bundles=next.dsh.profile.bundles.filter(n=>n!==name);}
 const suffix=patch.slice(block.end);let prefix=patch.slice(0,block.start);if(state.separator&&!suffix&&prefix.endsWith(state.separator))prefix=prefix.slice(0,-state.separator.length);const nextPatch=prefix+suffix;
 const done=[];try{for(const name of Object.keys(state.installed)){const link=path.join(loc.profileDir,'node_modules',name);done.push(name);fs.unlinkSync(link);if(state.original.links[name])fs.symlinkSync(state.original.links[name],link,process.platform==='win32'?'junction':'dir');}write(manifestFile,format(next,raw));write(patchFile,nextPatch);fs.renameSync(loc.stateFile,loc.stateFile+'.removed-'+Date.now());return {status:'uninstalled',backup,userData:'preserved'};}catch(error){write(manifestFile,raw);write(patchFile,patch);for(const name of done){const link=path.join(loc.profileDir,'node_modules',name);if(exists(link))fs.unlinkSync(link);fs.symlinkSync(state.installed[name].target,link,process.platform==='win32'?'junction':'dir');}throw error;}
}
