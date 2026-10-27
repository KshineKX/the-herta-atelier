import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export const hashFile=file=>fs.existsSync(file)?hash(fs.readFileSync(file)):null;
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const ownedNames=['dsh-herta-atelier','dsh-boot-animation'];
const files=loc=>({'profile-package.json':path.join(loc.profileDir,'package.json'),'profile-patch.yml':path.join(loc.profileDir,'cordis.patch.yml'),'install-state.json':loc.stateFile});
const inside=(file,root)=>path.resolve(file).startsWith(path.resolve(root)+path.sep);
export function atomicWrite(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.'+crypto.randomUUID()+'.tmp',fd=fs.openSync(temp,'wx');try{fs.writeFileSync(fd,value);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}try{fs.renameSync(temp,file);}catch(error){if(fs.existsSync(temp))fs.unlinkSync(temp);throw error;}}
export const writeJson=(file,value)=>atomicWrite(file,JSON.stringify(value,null,2)+'\n');
export function withoutManagedMarkers(text){const lines=text.match(/[^\n]*\n|[^\n]+$/g)||[];let begin=0,end=0;const result=lines.filter(line=>{const value=line.replace(/\r?\n$/,'');if(value==='# BEGIN THE-HERTA-ATELIER MANAGED'){begin++;return false;}if(value==='# END THE-HERTA-ATELIER MANAGED'){end++;return false;}return true;}).join('');return begin===1&&end===1?result:null;}
export const patchMatchesExpected=(actual,expected)=>actual===expected||withoutManagedMarkers(expected)===actual;
export function treeHashes(folder){if(!fs.existsSync(folder))return null;if(fs.lstatSync(folder).isSymbolicLink())throw Error('Journal media directory is not regular');const result={};function walk(dir,rel=''){for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const name=rel?rel+'/'+entry.name:entry.name,file=path.join(dir,entry.name);if(entry.isSymbolicLink())throw Error('Journal media symlinks are preserved by refusal');if(entry.isDirectory()){result[name+'/']=null;walk(file,name);}else if(entry.isFile())result[name]=hashFile(file);else throw Error('Unexpected media entry');}}walk(folder);return result;}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function packageLinks(loc,names){const result={};for(const name of names){if(!ownedNames.includes(name))throw Error('Unexpected managed package');const file=path.join(loc.profileDir,'node_modules',name);try{if(!fs.lstatSync(file).isSymbolicLink())throw Error('Non-link package preserved');result[name]=fs.realpathSync(file);}catch(error){if(error.code!=='ENOENT')throw error;result[name]=null;}}return result;}
export const pendingFile=(loc,kind)=>path.join(loc.dataDir,'pending-'+kind+'-'+loc.profile+'.json');
function validateLocation(loc,record,kind){if(record.schemaVersion!==1||record.profileDir!==loc.profileDir||record.dataDir!==loc.dataDir||record.profile!==loc.profile)throw Error('Interrupted installation belongs to another profile');if(typeof record.backup!=='string'||!inside(record.backup,path.join(loc.dataDir,kind==='core'?'backups':'trial-backups'))||fs.lstatSync(record.backup).isSymbolicLink())throw Error('Journal backup escaped managed data');}
function assertOwnerStopped(record,allowLive){if(record.ownerPid===process.pid&&allowLive)return;try{process.kill(record.ownerPid,0);}catch(error){if(error.code==='ESRCH')return;throw Error('Cannot prove the previous installer stopped; preserve the journal');}throw Error('Previous installer is still running; wait before recovery');}
function validSnapshots(record,backup){for(const[name,expected]of Object.entries(record.beforeFiles)){if(!Object.hasOwn(files({profileDir:'',stateFile:''}),name))throw Error('Unexpected backup file');if(expected!==null&&hashFile(path.join(backup,name))!==expected)throw Error('Interrupted-install backup changed');}}
function validateState(loc,record,backup){
 validSnapshots(record,backup);
 for(const[name,file]of Object.entries(files(loc))){const current=hashFile(file);if(current===record.beforeFiles[name]||record.afterFiles&&current===record.afterFiles[name])continue;
  const snapshot=path.join(backup,'planned-'+name);
  if(name==='profile-patch.yml'&&record.afterFiles&&hashFile(snapshot)===record.afterFiles[name]&&current!==null&&patchMatchesExpected(fs.readFileSync(file,'utf8'),fs.readFileSync(snapshot,'utf8')))continue;
  throw Error('Profile changed after interruption; preserved: '+name);
 }
 const current=packageLinks(loc,Object.keys(record.beforeLinks));
 for(const[name,target]of Object.entries(current))if(target!==record.beforeLinks[name]&&target!==record.afterLinks?.[name]){
  const change=record.linkOperations?.[name],recovery=record.recoveryLinkOperations?.[name];
  const switching=change?.phase==='switching'&&change.from===record.beforeLinks[name]&&change.to===record.afterLinks?.[name];
  const restoring=recovery?.phase==='restoring'&&recovery.target===record.beforeLinks[name];
  if(target!==null||!switching&&!restoring)throw Error('Package link changed after interruption; preserved');
 }
}
function restoreState(loc,record,backup,journalFile,onPhase){
 for(const[name,target]of Object.entries(record.beforeLinks)){
  const file=path.join(loc.profileDir,'node_modules',name),current=packageLinks(loc,[name])[name];if(current===target)continue;
  record.phase='recovering-link';record.recoveryLinkOperations??={};record.recoveryLinkOperations[name]={phase:'restoring',target};writeJson(journalFile,record);
  if(current!==null)fs.unlinkSync(file);onPhase('recovery-link-removed');
  if(target){fs.mkdirSync(path.dirname(file),{recursive:true});fs.symlinkSync(target,file,process.platform==='win32'?'junction':'dir');}
  delete record.recoveryLinkOperations[name];if(record.linkOperations)delete record.linkOperations[name];record.phase='recovering-profile';writeJson(journalFile,record);
 }
 for(const[name,file]of Object.entries(files(loc))){if(record.beforeFiles[name]===null){if(fs.existsSync(file))fs.unlinkSync(file);}else atomicWrite(file,fs.readFileSync(path.join(backup,name)));}
}
export function switchPackageLink(loc,record,name,{onPhase=()=>{}}={}){
 const file=path.join(loc.profileDir,'node_modules',name),current=packageLinks(loc,[name])[name],target=record.afterLinks[name];if(current===target)return;
 if(current!==record.beforeLinks[name])throw Error('Package link changed before activation; preserved');
 record.phase='link-switch';record.linkOperations??={};record.linkOperations[name]={phase:'switching',from:record.beforeLinks[name],to:target};writeJson(pendingFile(loc,'core'),record);
 if(current!==null)fs.unlinkSync(file);onPhase('package-link-removed');
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.symlinkSync(target,file,process.platform==='win32'?'junction':'dir');
 delete record.linkOperations[name];record.phase='links-updated';writeJson(pendingFile(loc,'core'),record);onPhase('package-link-written');
}
export function beginCore(plan,backup,beforeLinks,intendedState,stagingDir){
 const file=pendingFile(plan,'core');if(fs.existsSync(file))throw Error('Interrupted installation detected; run recover-install first');
 const record={schemaVersion:1,kind:'core',ownerPid:process.pid,profile:plan.profile,profileDir:plan.profileDir,dataDir:plan.dataDir,backup,stagingDir,versionDir:plan.versionDir,beforeFiles:{},afterFiles:{},beforeLinks,afterLinks:plan.targets,phase:'prepared'};
 const after={'profile-package.json':plan.nextRaw,'profile-patch.yml':plan.nextPatch,'install-state.json':JSON.stringify(intendedState,null,2)+'\n'};
 for(const[name,target]of Object.entries(files(plan))){record.beforeFiles[name]=hashFile(target);if(record.beforeFiles[name]!==null)fs.copyFileSync(target,path.join(backup,name));record.afterFiles[name]=hash(Buffer.from(after[name]));atomicWrite(path.join(backup,'planned-'+name),after[name]);}
 fs.writeFileSync(file,JSON.stringify(record,null,2)+'\n',{flag:'wx'});return record;
}
export function finishCore(loc,record){
 const current=Object.fromEntries(Object.entries(files(loc)).map(([name,file])=>[name,hashFile(file)]));if(!same(current,record.afterFiles)||!same(packageLinks(loc,Object.keys(record.afterLinks)),record.afterLinks))throw Error('Installation changed before commit; preserve it');
 record.phase='committed';writeJson(path.join(record.backup,'core-transaction.json'),record);fs.unlinkSync(pendingFile(loc,'core'));
}
export function beginTrial(loc,backup){const record={schemaVersion:1,kind:'trial',ownerPid:process.pid,profile:loc.profile,profileDir:loc.profileDir,dataDir:loc.dataDir,backup};fs.writeFileSync(pendingFile(loc,'trial'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});return record;}
export function finishTrial(loc){fs.unlinkSync(pendingFile(loc,'trial'));}
export function inspectInterrupted(loc){const entries=[];for(const kind of ['core','trial']){const file=pendingFile(loc,kind);if(fs.existsSync(file)){const record=read(file);validateLocation(loc,record,kind);entries.push({kind,backup:record.backup,ownerPid:record.ownerPid});}}return entries;}
export function assertNoInterrupted(loc){if(inspectInterrupted(loc).length)throw Error('Interrupted installation detected; run recover-install (read-only), then recover-install --apply');}

export function recoverInterrupted(loc,{apply=false,allowLive=false,onPhase=()=>{}}={}){
 const coreFile=pendingFile(loc,'core'),trialFile=pendingFile(loc,'trial'),core=fs.existsSync(coreFile)?read(coreFile):null,pointer=fs.existsSync(trialFile)?read(trialFile):null;
 if(!core&&!pointer)return{status:'no-interrupted-install',readOnly:true};
 if(core){validateLocation(loc,core,'core');assertOwnerStopped(core,allowLive);validateState(loc,core,core.backup);if(core.stagingDir&&(!inside(core.stagingDir,path.join(loc.dataDir,'versions'))||!path.basename(core.stagingDir).startsWith('.stage-')||fs.existsSync(core.stagingDir)&&fs.lstatSync(core.stagingDir).isSymbolicLink()))throw Error('Unexpected runtime staging directory');}
 let receipt,activeMotion,beforeMotion,stagedMotion,motion,prior,latest,latestValue;
 if(pointer){
  validateLocation(loc,pointer,'trial');assertOwnerStopped(pointer,allowLive);receipt=read(path.join(pointer.backup,'receipt.json'));validateLocation(loc,{...receipt,backup:pointer.backup},'trial');validSnapshots(receipt,pointer.backup);
  if(core){for(const key of Object.keys(core.beforeFiles))if(core.beforeFiles[key]!==receipt.beforeFiles[key])throw Error('Pending core and trial have different starting states');}
  else validateState(loc,receipt,pointer.backup);
  motion=path.join(loc.dataDir,'motion');prior=path.join(pointer.backup,'motion-before');activeMotion=treeHashes(motion);beforeMotion=treeHashes(prior);stagedMotion=treeHashes(path.join(pointer.backup,'motion-staged'));
  if(!same(activeMotion,receipt.beforeMotion)&&!same(activeMotion,receipt.preparedMotion)&&activeMotion!==null)throw Error('Media changed after interruption; preserved');
  if(beforeMotion!==null&&!same(beforeMotion,receipt.beforeMotion))throw Error('Previous media backup changed; preserved');
  if(stagedMotion!==null&&!same(stagedMotion,receipt.preparedMotion))throw Error('Staged media changed; preserved');
  if(receipt.beforeMotion!==null&&!same(activeMotion,receipt.beforeMotion)&&!same(beforeMotion,receipt.beforeMotion))throw Error('Previous media is missing; preserve state for manual recovery');
  latest=path.join(loc.dataDir,'latest-trial-'+loc.profile+'.json');latestValue=hashFile(latest);
  if(latestValue!==receipt.beforeLatest&&latestValue!==receipt.plannedLatest)throw Error('Trial pointer changed after interruption; preserved');
  if(receipt.beforeLatest!==null&&hashFile(path.join(pointer.backup,'latest-trial-before.json'))!==receipt.beforeLatest)throw Error('Previous trial pointer backup changed');
 }
 if(!apply)return{status:'interrupted-install-recovery-plan',readOnly:true,kinds:[...(core?['core']:[]),...(pointer?['trial']:[])]};
 if(core){restoreState(loc,core,core.backup,coreFile,onPhase);if(core.stagingDir&&fs.existsSync(core.stagingDir)){if(!inside(core.stagingDir,path.join(loc.dataDir,'versions'))||!path.basename(core.stagingDir).startsWith('.stage-')||fs.lstatSync(core.stagingDir).isSymbolicLink())throw Error('Unexpected runtime staging directory');fs.renameSync(core.stagingDir,path.join(core.backup,'incomplete-runtime-'+crypto.randomUUID()));}core.phase='recovered';writeJson(path.join(core.backup,'core-transaction.json'),core);fs.unlinkSync(coreFile);}
 if(pointer){
  if(!same(activeMotion,receipt.beforeMotion)){if(activeMotion!==null)fs.renameSync(motion,path.join(pointer.backup,'motion-after-recovery-'+crypto.randomUUID()));if(receipt.beforeMotion!==null)fs.renameSync(prior,motion);}
  const original=path.join(pointer.backup,'receipt-before-interruption-recovery.json');if(!fs.existsSync(original))fs.copyFileSync(path.join(pointer.backup,'receipt.json'),original,fs.constants.COPYFILE_EXCL);
  restoreState(loc,receipt,pointer.backup,path.join(pointer.backup,'receipt.json'),onPhase);
  if(receipt.beforeLatest===null){if(fs.existsSync(latest))fs.unlinkSync(latest);}else atomicWrite(latest,fs.readFileSync(path.join(pointer.backup,'latest-trial-before.json')));
  receipt.phase='failed-restored';receipt.recovery='interrupted-install';writeJson(path.join(pointer.backup,'receipt.json'),receipt);fs.unlinkSync(trialFile);
 }
 return{status:'interrupted-install-restored',backups:[core?.backup,pointer?.backup].filter(Boolean),userData:'preserved'};
}
