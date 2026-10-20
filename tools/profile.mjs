import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';import {inspectHost,hasBootSchema} from './host.mjs';
export const projectRoot=fileURLToPath(new URL('../',import.meta.url));
const BEGIN='# BEGIN THE-HERTA-ATELIER MANAGED',END='# END THE-HERTA-ATELIER MANAGED';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>fs.readFileSync(p,'utf8');const json=p=>JSON.parse(read(p));
const within=(p,base)=>p===base||p.startsWith(base+path.sep);
const exists=p=>{try{fs.lstatSync(p);return true;}catch{return false;}};
const write=(p,text)=>{fs.mkdirSync(path.dirname(p),{recursive:true});const temp=p+'.herta.tmp';fs.writeFileSync(temp,text);fs.renameSync(temp,p);};
const clone=x=>structuredClone(x);
function format(j,old){const indent=/\n([ \t]+)"/.exec(old)?.[1]||'  ';return JSON.stringify(j,null,indent).replaceAll('\n',old.includes('\r\n')?'\r\n':'\n')+(old.includes('\r\n')?'\r\n':'\n');}
export function locations(options={}){
 const dshHome=path.resolve(options.dshHome||process.env.DSH_HOME||path.join(os.homedir(),'.dsh')),profile=options.profile||'desktop';
 if(!/^[\w-]+$/.test(profile))throw Error('Invalid profile name');
 const dataDir=path.resolve(options.dataDir||process.env.HERTA_ATELIER_HOME||path.join(dshHome,'herta-atelier'));
 return {dshHome,profile,dataDir,profileDir:path.join(dshHome,'profiles',profile),stateFile:path.join(dataDir,'install-state-'+profile+'.json')};
}
function ownedBlock(text){const a=text.indexOf(BEGIN);if(a<0)return null;const b=text.indexOf(END,a);if(b<0||text.indexOf(BEGIN,a+BEGIN.length)>=0)throw Error('Ambiguous managed YAML block');const end=b+END.length+(text.slice(b+END.length).startsWith('\r\n')?2:text[b+END.length]==='\n'?1:0);return {start:a,end,text:text.slice(a,end)};}
function skinIds(text){return [...new Set([...text.matchAll(/^\s*-\s*id:\s*(ui-skin-[\w-]+)\s*$/gm)].map(m=>m[1]))].filter(id=>id!=='ui-skin-herta-atelier');}
export function makePlan(options={}){
 const loc=locations(options),source=path.resolve(options.sourceRoot||projectRoot),manifestFile=path.join(loc.profileDir,'package.json'),patchFile=path.join(loc.profileDir,'cordis.patch.yml');
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
 const block=ownedBlock(patch);if(block&&(!state||block.text!==state.managedBlock))throw Error('Managed block was edited or is unowned; refusing to overwrite it.');
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
 const without=block?patch.slice(0,block.start)+patch.slice(block.end):patch;
 const separator=without&&!/[\r\n]$/.test(without)?eol:'';const nextPatch=without+separator+managedBlock;
 const next=clone(manifest);next.dependencies??={};
 for(const name of names){next.dependencies[name]='link:'+targets[name].replaceAll('\\','/');if(!next.dsh.profile.bundles.includes(name))next.dsh.profile.bundles.push(name);}
 return {...loc,source,manifestFile,patchFile,raw,manifest,patch,nextRaw:format(next,raw),nextPatch,managedBlock,separator,release,versionDir,names,targets,previousState:state,host,withBoot,bundledSchema};
}
export function publicPlan(plan){return {version:plan.release.version,edition:plan.release.edition,profile:plan.profile,installDirectory:plan.versionDir,dataDirectory:plan.dataDir,optionalBoot:plan.withBoot,bundledBootSchema:plan.bundledSchema,host:plan.host,actions:['verify release hashes','back up profile and prior links','install runtime','update owned profile entries','activate Herta theme'],nativeAcceptance:'pending restart'};}
export function install(plan,{onPhase=()=>{}}={}){
 const current=fs.existsSync(plan.stateFile)?json(plan.stateFile):null;
 if(current?.version===plan.release.version&&read(plan.manifestFile)===plan.nextRaw&&read(plan.patchFile)===plan.nextPatch){
   const files=plan.release.files.filter(e=>e.path.startsWith('packages/skin/')||(plan.withBoot&&e.path.startsWith('packages/boot/')));
   if(files.every(e=>fs.existsSync(path.join(plan.versionDir,e.path)))){for(const e of files)if(hash(fs.readFileSync(path.join(plan.versionDir,e.path)))!==e.sha256)throw Error('Installed runtime was edited: '+e.path);return {status:'already-installed',version:current.version};}
 }
 if(read(plan.manifestFile)!==plan.raw||read(plan.patchFile)!==plan.patch)throw Error('Profile changed after planning; run again.');
 const stamp=new Date().toISOString().replace(/[:.]/g,'-'),backup=path.join(plan.dataDir,'backups',stamp+'-'+plan.profile),beforeLinks={};
 fs.mkdirSync(backup,{recursive:true});fs.copyFileSync(plan.manifestFile,path.join(backup,'package.json'));fs.copyFileSync(plan.patchFile,path.join(backup,'cordis.patch.yml'));
 for(const name of plan.names){const link=path.join(plan.profileDir,'node_modules',name);beforeLinks[name]=exists(link)?fs.realpathSync(link):null;}
 const oldState=fs.existsSync(plan.stateFile)?read(plan.stateFile):null;const changedLinks=[];
 try{
  for(const e of plan.release.files.filter(e=>e.path.startsWith('packages/skin/')||(plan.withBoot&&e.path.startsWith('packages/boot/')))){
    const out=path.resolve(plan.versionDir,e.path);if(!within(out,plan.versionDir))throw Error('Install path escaped');
    if(fs.existsSync(out)){if(hash(fs.readFileSync(out))!==e.sha256)throw Error('An installed version was modified; use a new version.');continue;}
    fs.mkdirSync(path.dirname(out),{recursive:true});fs.copyFileSync(path.join(plan.source,e.path),out);
  }
  fs.mkdirSync(path.join(plan.dataDir,'gallery'),{recursive:true});
  if(!fs.existsSync(path.join(plan.dataDir,'settings.json')))write(path.join(plan.dataDir,'settings.json'),JSON.stringify({schemaVersion:1,galleryDirectory:path.join(plan.dataDir,'gallery')},null,2)+'\n');
  const locator=path.join(plan.targets['dsh-herta-atelier'],'runtime-config.json');
  if(fs.existsSync(locator)&&json(locator).dataDirectory!==plan.dataDir)throw Error('Installed data locator was modified');
  if(!fs.existsSync(locator))write(locator,JSON.stringify({schemaVersion:1,dataDirectory:plan.dataDir},null,2)+'\n');
  if(plan.withBoot){const bootRoot=plan.targets['dsh-boot-animation'],sdk=path.join(bootRoot,'vendor/packages'),modules=path.join(bootRoot,'node_modules');if(!fs.existsSync(modules))fs.cpSync(sdk,modules,{recursive:true,dereference:true});const videos=path.join(bootRoot,'assets/videos');fs.mkdirSync(path.dirname(videos),{recursive:true});if(fs.existsSync(videos)&&fs.readdirSync(videos).length===0)fs.rmdirSync(videos);if(!exists(videos))fs.symlinkSync(path.join(plan.dataDir,'boot-videos'),videos,process.platform==='win32'?'junction':'dir');}
  for(const name of plan.names){const link=path.join(plan.profileDir,'node_modules',name);fs.mkdirSync(path.dirname(link),{recursive:true});if(exists(link)&&fs.realpathSync(link)===plan.targets[name])continue;changedLinks.push(name);if(exists(link))fs.unlinkSync(link);fs.symlinkSync(plan.targets[name],link,process.platform==='win32'?'junction':'dir');}
  write(plan.manifestFile,plan.nextRaw);write(plan.patchFile,plan.nextPatch);onPhase('profile-written');
  const original=clone(plan.previousState?.original||{dependencies:{},bundles:[],links:{}});
  for(const name of plan.names)if(!Object.hasOwn(original.dependencies,name)){original.dependencies[name]=plan.manifest.dependencies?.[name]??null;original.links[name]=beforeLinks[name];if(plan.manifest.dsh.profile.bundles.includes(name))original.bundles.push(name);}
  const state={schemaVersion:1,version:plan.release.version,profileDir:plan.profileDir,dataDir:plan.dataDir,backup,managedBlock:plan.managedBlock,separator:plan.previousState?.separator??plan.separator,original,installed:Object.fromEntries(plan.names.map(n=>[n,{dependency:'link:'+plan.targets[n].replaceAll('\\','/'),target:plan.targets[n]}]))};
  write(plan.stateFile,JSON.stringify(state,null,2)+'\n');
  return {status:'installed',version:state.version,backup,nativeAcceptance:'pending restart'};
 }catch(error){
  write(plan.manifestFile,plan.raw);write(plan.patchFile,plan.patch);
  for(const name of changedLinks.reverse()){const link=path.join(plan.profileDir,'node_modules',name);if(exists(link))fs.unlinkSync(link);if(beforeLinks[name])fs.symlinkSync(beforeLinks[name],link,process.platform==='win32'?'junction':'dir');}
  if(oldState!==null)write(plan.stateFile,oldState);else if(fs.existsSync(plan.stateFile))fs.unlinkSync(plan.stateFile);
  throw error;
 }
}
export function uninstall(options={}){
 const loc=locations(options);if(!fs.existsSync(loc.stateFile))return {status:'not-installed'};
 const state=json(loc.stateFile),manifestFile=path.join(loc.profileDir,'package.json'),patchFile=path.join(loc.profileDir,'cordis.patch.yml'),raw=read(manifestFile),manifest=JSON.parse(raw),patch=read(patchFile),block=ownedBlock(patch);
 if(!block||block.text!==state.managedBlock)throw Error('Managed patch was changed; preserve it and resolve manually.');
 for(const [name,entry]of Object.entries(state.installed)){if(manifest.dependencies?.[name]!==entry.dependency)throw Error('Package dependency changed after install: '+name);const link=path.join(loc.profileDir,'node_modules',name);if(!exists(link)||!fs.lstatSync(link).isSymbolicLink()||fs.realpathSync(link)!==entry.target)throw Error('Package link changed after install: '+name);}
 if(!options.apply)return {status:'uninstall-plan',packages:Object.keys(state.installed),userData:'preserved'};
 const backup=path.join(loc.dataDir,'backups','uninstall-'+Date.now());fs.mkdirSync(backup,{recursive:true});fs.copyFileSync(manifestFile,path.join(backup,'package.json'));fs.copyFileSync(patchFile,path.join(backup,'cordis.patch.yml'));
 const next=clone(manifest);for(const name of Object.keys(state.installed)){if(state.original.dependencies[name]===null)delete next.dependencies[name];else next.dependencies[name]=state.original.dependencies[name];if(!state.original.bundles.includes(name))next.dsh.profile.bundles=next.dsh.profile.bundles.filter(n=>n!==name);}
 const suffix=patch.slice(block.end);let prefix=patch.slice(0,block.start);if(state.separator&&!suffix&&prefix.endsWith(state.separator))prefix=prefix.slice(0,-state.separator.length);const nextPatch=prefix+suffix;
 const done=[];try{for(const name of Object.keys(state.installed)){const link=path.join(loc.profileDir,'node_modules',name);done.push(name);fs.unlinkSync(link);if(state.original.links[name])fs.symlinkSync(state.original.links[name],link,process.platform==='win32'?'junction':'dir');}write(manifestFile,format(next,raw));write(patchFile,nextPatch);fs.renameSync(loc.stateFile,loc.stateFile+'.removed-'+Date.now());return {status:'uninstalled',backup,userData:'preserved'};}catch(error){write(manifestFile,raw);write(patchFile,patch);for(const name of done){const link=path.join(loc.profileDir,'node_modules',name);if(exists(link))fs.unlinkSync(link);fs.symlinkSync(state.installed[name].target,link,process.platform==='win32'?'junction':'dir');}throw error;}
}
