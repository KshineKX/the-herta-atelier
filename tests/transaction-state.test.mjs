import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';

// Execute the actual journal module against an in-memory filesystem. This tests
// operation gaps and a second interruption, not Windows junction semantics.
const code=fs.readFileSync(new URL('../tools/transaction.mjs',import.meta.url),'utf8').replace(/^import .*?;\r?\n/,'').replace(/^export /gm,'')+'\nresult={recoverInterrupted};';
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
function fixture({current='new',operation=null,withBoot=false}={}){
 const base=path.resolve('virtual-herta-journal'),loc={profile:'desktop',profileDir:path.join(base,'profile'),dataDir:path.join(base,'data')};loc.stateFile=path.join(loc.dataDir,'install-state-desktop.json');
 const backup=path.join(loc.dataDir,'backups','transaction'),link=path.join(loc.profileDir,'node_modules/dsh-herta-atelier'),old=path.join(loc.dataDir,'versions/old/packages/skin'),next=path.join(loc.dataDir,'versions/new/packages/skin');
 const contents=new Map(),directories=new Set([backup]),links=new Map(),descriptors=new Map();let descriptor=10,writes=0;
 const put=(file,value)=>contents.set(file,Buffer.from(value));
 const missing=()=>Object.assign(new Error('missing'),{code:'ENOENT'});
 const memory={constants:{COPYFILE_EXCL:1},existsSync:file=>contents.has(file)||links.has(file)||directories.has(file),lstatSync(file){if(!this.existsSync(file))throw missing();return{isSymbolicLink:()=>links.has(file)}},readFileSync(file,encoding){if(!contents.has(file))throw missing();return encoding?contents.get(file).toString(encoding):Buffer.from(contents.get(file))},writeFileSync(file,value){writes++;put(typeof file==='number'?descriptors.get(file):file,value)},mkdirSync(file){writes++;directories.add(file)},openSync(file){writes++;const fd=++descriptor;descriptors.set(fd,file);return fd},fsyncSync(){},closeSync(fd){descriptors.delete(fd)},renameSync(from,to){writes++;if(!contents.has(from))throw missing();contents.set(to,contents.get(from));contents.delete(from)},unlinkSync(file){writes++;if(!contents.delete(file)&&!links.delete(file))throw missing()},realpathSync:file=>{if(!links.has(file))throw missing();return links.get(file)},symlinkSync(target,file){writes++;links.set(file,target)},copyFileSync(from,to){writes++;put(to,this.readFileSync(from))}};
 const record={schemaVersion:1,kind:'core',ownerPid:222,profile:loc.profile,profileDir:loc.profileDir,dataDir:loc.dataDir,backup,stagingDir:null,beforeFiles:{},afterFiles:{},beforeLinks:{'dsh-herta-atelier':old},afterLinks:{'dsh-herta-atelier':next},phase:operation?'link-switch':'prepared'};
 const targets={'profile-package.json':path.join(loc.profileDir,'package.json'),'profile-patch.yml':path.join(loc.profileDir,'cordis.patch.yml'),'install-state.json':loc.stateFile};
 for(const[name,file]of Object.entries(targets)){put(path.join(backup,name),'before '+name);put(file,'after '+name);record.beforeFiles[name]=hash('before '+name);record.afterFiles[name]=hash('after '+name)}
 if(operation)record.linkOperations={'dsh-herta-atelier':{phase:'switching',from:old,to:operation==='valid'?next:path.join(base,'wrong-target')}};
 if(current)links.set(link,current==='old'?old:next);
 if(withBoot){const boot='dsh-boot-animation';record.beforeLinks[boot]=old+'-boot';record.afterLinks[boot]=next+'-boot';record.linkOperations??={};record.linkOperations[boot]={phase:'switching',from:old+'-boot',to:next+'-boot'};}
 const journal=path.join(loc.dataDir,'pending-core-desktop.json');put(journal,JSON.stringify(record));
 const context={fs:memory,path,crypto,process:{pid:111,platform:process.platform,kill(){throw Object.assign(new Error('stopped'),{code:'ESRCH'})}},result:null};vm.runInNewContext(code,context,{filename:'actual-transaction.mjs'});
 return{loc,backup,journal,link,old,targets,contents,links,recover:context.result.recoverInterrupted,get writes(){return writes}};
}
test('journal accepts an absent link only at the recorded link-switch gap',()=>{
 const denied=fixture({current:null});assert.throws(()=>denied.recover(denied.loc),/Package link changed/);assert.equal(denied.writes,0);
 const wrong=fixture({current:null,operation:'wrong'});assert.throws(()=>wrong.recover(wrong.loc),/Package link changed/);assert.equal(wrong.writes,0);
 const allowed=fixture({current:null,operation:'valid'});assert.equal(allowed.recover(allowed.loc).status,'interrupted-install-recovery-plan');assert.equal(allowed.writes,0);allowed.recover(allowed.loc,{apply:true});assert.equal(allowed.links.get(allowed.link),allowed.old);for(const[name,file]of Object.entries(allowed.targets))assert.equal(allowed.contents.get(file).toString(),'before '+name);
});
test('a second interruption between unlink and relink during recovery remains recoverable',()=>{
 const f=fixture();assert.throws(()=>f.recover(f.loc,{apply:true,onPhase(phase){if(phase==='recovery-link-removed')throw Error('second interruption')}}),/second interruption/);assert.equal(f.links.has(f.link),false);
 assert.equal(f.recover(f.loc).status,'interrupted-install-recovery-plan');f.recover(f.loc,{apply:true});assert.equal(f.links.get(f.link),f.old);assert.equal(f.recover(f.loc,{apply:true}).status,'no-interrupted-install');
});
test('old and new links are valid recovery states without weakening unrelated edit checks',()=>{
 for(const current of ['old','new']){const f=fixture({current});assert.equal(f.recover(f.loc).readOnly,true);assert.equal(f.writes,0)}
 const f=fixture({current:null,operation:'valid'});const target=Object.values(f.targets)[0];f.contents.set(target,Buffer.from('user changed later'));assert.throws(()=>f.recover(f.loc,{apply:true}),/Profile changed/);assert.equal(f.writes,0);assert.equal(f.contents.get(target).toString(),'user changed later');
});
test('recovering one package does not erase another package link-gap intent',()=>{
 const f=fixture({withBoot:true});assert.equal(f.recover(f.loc).readOnly,true);
 assert.throws(()=>f.recover(f.loc,{apply:true,onPhase(phase){if(phase==='recovery-link-removed')throw Error('second interruption')}}),/second interruption/);
 assert.equal(f.links.has(f.link),false);assert.equal(f.recover(f.loc).readOnly,true);f.recover(f.loc,{apply:true});
 assert.equal(f.links.get(f.link),f.old);assert.equal(f.links.get(path.join(f.loc.profileDir,'node_modules/dsh-boot-animation')),f.old+'-boot');
});
