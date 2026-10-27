import {beginTrial,finishTrial,writeJson,atomicWrite as journalWrite,hashFile as journalHash,recoverInterrupted} from './transaction.mjs';
import {RECOVERY_FILES} from './recovery-files.mjs';
import {copyTree} from './copy-tree.mjs';
import fs from'node:fs';import path from'node:path';import crypto from'node:crypto';import{fileURLToPath}from'node:url';
import{makePlan,install,locations,patchMatchesExpected,reconstructBeta10Patch}from'./profile.mjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),exists=p=>fs.existsSync(p),read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const inside=(p,root)=>path.resolve(p).startsWith(path.resolve(root)+path.sep);
function tree(folder){if(!exists(folder))return null;const entries={};function walk(dir,rel=''){for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const r=rel?rel+'/'+e.name:e.name,p=path.join(dir,e.name);if(e.isSymbolicLink())throw Error('Motion symlinks are preserved by refusing trial');if(e.isDirectory()){entries[r+'/']=null;walk(p,r)}else if(e.isFile())entries[r]=sha(fs.readFileSync(p));else throw Error('Unexpected motion entry')}}if(fs.lstatSync(folder).isSymbolicLink())throw Error('Motion directory must be regular');walk(folder);return entries}
function fileHash(file){return exists(file)?sha(fs.readFileSync(file)):null}
function expectedAfterPatch(plan,backup,receipt){
 const snapshot=path.join(backup,'after-profile-patch.yml');
 if(exists(snapshot)){if(fileHash(snapshot)!==receipt.afterFiles['profile-patch.yml'])throw Error('Installed patch snapshot integrity mismatch');return fs.readFileSync(snapshot,'utf8');}
 // beta.10 receipts did not save the after text. Rebuild the exact bytes from
 // the integrity-checked before files and hash-bound installed state. The
 // original receipt's after hash must match before accepting marker removal.
 if(receipt.version!=='0.4.0-beta.10')throw Error('Profile changed after trial; no verified installed patch snapshot');
 const current=read(plan.stateFile),previous=receipt.beforeFiles['install-state.json']===null?null:read(path.join(backup,'install-state.json'));
 if(current.version!==receipt.version||typeof current.managedBlock!=='string')throw Error('Installed state does not match the trial');
 const before=fs.readFileSync(path.join(backup,'profile-patch.yml'),'utf8'),expected=reconstructBeta10Patch(before,previous,current.managedBlock);
 if(sha(Buffer.from(expected))!==receipt.afterFiles['profile-patch.yml'])throw Error('Cannot reconstruct the exact beta.10 installed patch');
 return expected;
}
function files(plan){return{'profile-package.json':plan.manifestFile,'profile-patch.yml':plan.patchFile,'install-state.json':plan.stateFile}}
function links(plan){return Object.fromEntries(plan.names.map(n=>{const p=path.join(plan.profileDir,'node_modules',n);if(!['dsh-herta-atelier','dsh-boot-animation'].includes(n))throw Error('Unexpected owned package');try{if(!fs.lstatSync(p).isSymbolicLink())throw Error('A non-link package must not be replaced');return[n,fs.realpathSync(p)]}catch(e){if(e.code==='ENOENT')return[n,null];throw e}}))}
export function makeTrialPlan(options={}){
 const core=makePlan(options);if(!options.motionPack)throw Error('Supply the separately reviewed motion pack');const pack=path.resolve(options.motionPack),catalog=read(path.join(pack,'motion-manifest.json'));
 const home=['home-enter','home-exit','home-idle','home-rise','home-sit'];const complete=[...home,'campus-idle','campus-greet','campus-reset','room-idle','room-roll','room-roll-reset','room-tilt','room-tilt-reset'].sort();const ids=Object.keys(catalog.clips||{}).sort();if(catalog.schemaVersion!==1||![home,complete].some(set=>JSON.stringify(ids)===JSON.stringify(set)))throw Error('Expected five legacy home clips or the complete thirteen-clip pack');
 for(const[id,entry]of Object.entries(catalog.clips)){const file=path.join(pack,entry.file||'');if(entry.file!==id+'/video.mp4'||!Number.isFinite(entry.duration)||entry.duration<=0||!inside(fs.realpathSync(file),fs.realpathSync(pack))||fs.lstatSync(file).isSymbolicLink()||!fs.statSync(file).isFile()||!entry.sha256||fileHash(file)!==entry.sha256)throw Error('Motion pack hash/path mismatch: '+id)}
 tree(path.join(core.dataDir,'motion'));return{core,pack,catalog,options};
}
function restoreProfile(plan,backup,receipt){for(const[name,target]of Object.entries(receipt.beforeLinks)){const link=path.join(plan.profileDir,'node_modules',name);try{const stat=fs.lstatSync(link);if(!stat.isSymbolicLink())throw Error('Refusing to remove a non-link package');fs.unlinkSync(link)}catch(e){if(e.code!=='ENOENT')throw e}if(target){fs.mkdirSync(path.dirname(link),{recursive:true});fs.symlinkSync(target,link,process.platform==='win32'?'junction':'dir')}}for(const[key,file]of Object.entries(files(plan))){if(receipt.beforeFiles[key]===null){if(exists(file))fs.unlinkSync(file)}else{fs.mkdirSync(path.dirname(file),{recursive:true});fs.copyFileSync(path.join(backup,key),file)}}}
export function applyTrial(plan,{onPhase=()=>{}}={}){
 if(plan.core.previousState?.version===plan.core.release.version)throw Error('Candidate already installed; keep the existing rollback baseline');
 const p=plan.core,backup=path.join(p.dataDir,'trial-backups','trial-'+Date.now()+'-'+crypto.randomUUID()),motion=path.join(p.dataDir,'motion'),staged=path.join(backup,'motion-staged'),beforeMotion=tree(motion),receipt={schemaVersion:1,version:p.release.version,profile:p.profile,profileDir:p.profileDir,dataDir:p.dataDir,beforeFiles:{},beforeLinks:links(p),beforeMotion,phase:'prepared'};
 fs.mkdirSync(backup,{recursive:true});for(const[key,file]of Object.entries(files(p))){receipt.beforeFiles[key]=fileHash(file);if(exists(file))fs.copyFileSync(file,path.join(backup,key))}
 fs.mkdirSync(path.join(backup,'tools'));for(const name of RECOVERY_FILES)fs.copyFileSync(fileURLToPath(new URL(name,import.meta.url)),path.join(backup,'tools',name));
 fs.writeFileSync(path.join(backup,'RollbackThisTrial.mjs'),"import fs from'node:fs';import path from'node:path';import{fileURLToPath}from'node:url';import{rollbackTrial}from'./tools/trial.mjs';const backup=path.dirname(fileURLToPath(import.meta.url)),r=JSON.parse(fs.readFileSync(path.join(backup,'receipt.json'),'utf8'));console.log(JSON.stringify(rollbackTrial({dshHome:path.dirname(path.dirname(r.profileDir)),profile:r.profile,dataDir:r.dataDir,backup,apply:true})));\n");
 fs.writeFileSync(path.join(backup,'Rollback.cmd'),'@echo off\r\nsetlocal DisableDelayedExpansion\r\n"'+process.execPath.replaceAll('%','%%')+'" "%~dp0RollbackThisTrial.mjs"\r\npause\r\n');
 if(exists(motion))copyTree(motion,staged);else fs.mkdirSync(staged);
 for(const[id,e]of Object.entries(plan.catalog.clips)){const target=path.join(staged,e.file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(plan.pack,e.file),target);if(fileHash(target)!==e.sha256)throw Error('Motion changed during copy: '+id)}
 fs.writeFileSync(path.join(staged,'motion-manifest.json'),JSON.stringify(plan.catalog,null,2)+'\n');
 const latest=path.join(p.dataDir,'latest-trial-'+p.profile+'.json'),nextPointer=JSON.stringify({backup})+'\n';
 receipt.beforeLatest=journalHash(latest);receipt.plannedLatest=sha(Buffer.from(nextPointer));if(receipt.beforeLatest!==null)fs.copyFileSync(latest,path.join(backup,'latest-trial-before.json'));
 receipt.preparedMotion=tree(staged);receipt.afterLinks=p.targets;const receiptFile=path.join(backup,'receipt.json');writeJson(receiptFile,receipt);beginTrial(p,backup);
 try{
  install(p,{onPhase(phase){if(phase==='core-state-written'){receipt.afterFiles=Object.fromEntries(Object.entries(files(p)).map(([key,file])=>[key,fileHash(file)]));fs.copyFileSync(p.patchFile,path.join(backup,'planned-profile-patch.yml'));receipt.phase='core-installed';writeJson(receiptFile,receipt);}onPhase(phase);}});
  if(exists(motion))fs.renameSync(motion,path.join(backup,'motion-before'));onPhase('old-motion-moved');
  fs.renameSync(staged,motion);onPhase('motion-activated');receipt.afterFiles=Object.fromEntries(Object.entries(files(p)).map(([key,file])=>[key,fileHash(file)]));fs.copyFileSync(p.patchFile,path.join(backup,'after-profile-patch.yml'));receipt.afterLinks=links(p);receipt.afterMotion=tree(motion);receipt.phase='installed';writeJson(receiptFile,receipt);journalWrite(latest,nextPointer);onPhase('trial-committed');finishTrial(p);
  return{status:'trial-installed',version:p.release.version,backup,nativeAcceptance:'pending restart'};
 }catch(error){try{recoverInterrupted(p,{apply:true,allowLive:true});}catch(recovery){throw Error(error.message+'; recovery stopped to preserve changes: '+recovery.message);}throw error;}
}

export function rollbackTrial(options={}){
 const loc=locations(options),backup=path.resolve(options.backup||'');if(!inside(backup,path.join(loc.dataDir,'trial-backups'))||!path.basename(backup).startsWith('trial-'))throw Error('Expected a managed trial backup');const receipt=read(path.join(backup,'receipt.json'));
 if(receipt.schemaVersion!==1||receipt.profileDir!==loc.profileDir||receipt.dataDir!==loc.dataDir||receipt.profile!==loc.profile)throw Error('Trial receipt does not match this profile');if(receipt.phase==='rolled-back'||receipt.phase==='failed-restored')return{status:'already-restored',readOnly:true};if(receipt.phase!=='installed')throw Error('Trial has not finished installing');
 const p={...loc,manifestFile:path.join(loc.profileDir,'package.json'),patchFile:path.join(loc.profileDir,'cordis.patch.yml'),names:Object.keys(receipt.beforeLinks)};
 for(const[k,h]of Object.entries(receipt.beforeFiles))if(h!==null&&fileHash(path.join(backup,k))!==h)throw Error('Backup integrity mismatch');
 for(const[k,f]of Object.entries(files(p)))if(k!=='profile-patch.yml'&&fileHash(f)!==receipt.afterFiles[k])throw Error('Profile changed after trial; preserved: '+k);
 if(fileHash(p.patchFile)!==receipt.afterFiles['profile-patch.yml']&&(!exists(p.patchFile)||!patchMatchesExpected(fs.readFileSync(p.patchFile,'utf8'),expectedAfterPatch(p,backup,receipt))))throw Error('Profile changed after trial; preserved: profile-patch.yml');
 if(JSON.stringify(links(p))!==JSON.stringify(receipt.afterLinks))throw Error('Package links changed after trial; preserved');const motion=path.join(loc.dataDir,'motion');if(JSON.stringify(tree(motion))!==JSON.stringify(receipt.afterMotion))throw Error('Motion changed after trial; preserved');
 if(receipt.beforeMotion!==null&&JSON.stringify(tree(path.join(backup,'motion-before')))!==JSON.stringify(receipt.beforeMotion))throw Error('Previous motion backup changed');
 if(!options.apply)return{status:'rollback-plan',readOnly:true,version:receipt.version};
 if(receipt.version==='0.4.0-beta.10'&&!exists(path.join(backup,'after-profile-patch.yml'))){const original=path.join(backup,'receipt-before-recovery.json'),receiptFile=path.join(backup,'receipt.json');if(exists(original)){if(fileHash(original)!==fileHash(receiptFile))throw Error('Original recovery receipt differs; preserved');}else fs.copyFileSync(receiptFile,original,fs.constants.COPYFILE_EXCL);}
 fs.renameSync(motion,path.join(backup,'motion-after'));if(receipt.beforeMotion!==null)fs.renameSync(path.join(backup,'motion-before'),motion);restoreProfile(p,backup,receipt);receipt.phase='rolled-back';fs.writeFileSync(path.join(backup,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');return{status:'trial-rolled-back',preservedTrialMotion:path.join(backup,'motion-after')};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const args=process.argv.slice(2),command=args.shift()||'plan',options={};for(let i=0;i<args.length;i++){if(args[i]==='--apply'){options.apply=true;continue}const key={'--motion-pack':'motionPack','--dsh-home':'dshHome','--data-dir':'dataDir','--profile':'profile','--backup':'backup'}[args[i]];if(!key||!args[i+1])throw Error('Unknown or missing argument: '+args[i]);options[key]=args[++i]}
 if(command==='rollback')console.log(JSON.stringify(rollbackTrial(options),null,2));else{const plan=makeTrialPlan(options);if(command==='install'&&options.apply)console.log(JSON.stringify(applyTrial(plan),null,2));else if(command==='plan')console.log(JSON.stringify({status:'trial-plan',readOnly:true,version:plan.core.release.version,motionClips:Object.keys(plan.catalog.clips),reminder:'Review first; fully exit DSH before install. No restart is performed.'},null,2));else throw Error('Use plan, install --apply, or rollback [--apply]')}
 }catch(error){console.error('Herta trial: '+error.message);process.exitCode=2}
}
