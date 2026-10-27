import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {cleanSource,snapshotSource,extractArchive,releaseWorkspace,removeReleaseWorkspace} from './release-source.mjs';
import {inventory,verifyInventory,digest} from './release-policy.mjs';
import {includeForEdition,prepareEdition} from './package-edition.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),args=process.argv.slice(2);
if(args.some(arg=>!['--core','--personal'].includes(arg)))throw Error('Use release [--core]');
const edition=args.includes('--core')?'core':'theme',revision=cleanSource(root),workspace=releaseWorkspace();let completed=false;
function run(cwd,file,arguments_=[]){const result=spawnSync(process.execPath,[file,...arguments_],{cwd,env:{...process.env,HERTA_TEST_MODULE_ROOT:root},encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});if(result.status!==0)throw Error('Release gate failed: '+file+'\n'+(result.stdout||'')+'\n'+(result.stderr||result.error||''));return result.stdout;}
try{
 const frozen=snapshotSource(root,revision,path.join(workspace,'source'));run(frozen,'tools/build.mjs');run(frozen,'tools/verify.mjs');
 for(const suite of ['entry','degraded','options'])run(frozen,'packages/boot/verify/verify-'+suite+'.mjs');
 const pkg=JSON.parse(fs.readFileSync(path.join(frozen,'package.json'))),source=JSON.parse(fs.readFileSync(path.join(frozen,'release-manifest.json')));
 if(edition==='theme'&&source.edition!=='theme')throw Error('Complete theme requires all reviewed portraits');
 const label='The-Herta-Atelier-'+pkg.version+'-'+edition,stage=path.join(workspace,'package',label),out=path.join(root,'dist'),zip=path.join(out,label+'.zip');
 if(fs.existsSync(zip))throw Error('Existing release ZIP is immutable; choose a new version');fs.mkdirSync(stage,{recursive:true});
 for(const entry of source.files){if(!includeForEdition(entry.path,edition))continue;const file=path.join(stage,entry.path);fs.mkdirSync(path.dirname(file),{recursive:true});fs.copyFileSync(path.join(frozen,entry.path),file);}
 prepareEdition(stage,edition);
 const provenance={schemaVersion:1,commit:revision.commit,tree:revision.tree,version:pkg.version,edition,node:process.version,builtAt:new Date().toISOString()};fs.writeFileSync(path.join(stage,'source-provenance.json'),JSON.stringify(provenance,null,2)+'\n');
 const manifest={...source,edition,source:provenance,files:inventory(stage,{strict:true})};fs.writeFileSync(path.join(stage,'release-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 verifyInventory(stage,manifest,{strict:true});run(stage,'tools/verify.mjs',['--package']);
 const tests=run(stage,'--test',['tests/*.test.mjs']);verifyInventory(stage,manifest,{strict:true});
 const temporaryZip=path.join(workspace,label+'.zip'),archive=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(stage,'tools/archive.ps1'),'-InputDir',stage,'-OutputFile',temporaryZip],{encoding:'utf8',windowsHide:true});
 if(archive.status!==0)throw Error('Archive creation failed: '+(archive.stderr||archive.stdout));
 const extracted=path.join(workspace,'unpacked');extractArchive(temporaryZip,extracted);const packageRoot=path.join(extracted,label);verifyInventory(packageRoot,JSON.parse(fs.readFileSync(path.join(packageRoot,'release-manifest.json'))),{strict:true});run(packageRoot,'tools/verify.mjs',['--package']);
 if(cleanSource(root).commit!==revision.commit)throw Error('Source HEAD changed during release');fs.mkdirSync(out,{recursive:true});fs.copyFileSync(temporaryZip,zip,fs.constants.COPYFILE_EXCL);
 const sha256=digest(fs.readFileSync(zip));fs.writeFileSync(path.join(out,label+'.sha256'),sha256+'  '+path.basename(zip)+'\n',{flag:'wx'});
 const report={...provenance,zip,sha256,bytes:fs.statSync(zip).size,manifestFiles:manifest.files.length,cleanSnapshot:true,sourceVerified:true,packageVerified:true,unpackedVerified:true,testsPassed:true,testOutput:tests.trim()};fs.writeFileSync(path.join(out,label+'.verification.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...report,testOutput:undefined}));completed=true;
}finally{if(completed)removeReleaseWorkspace(workspace);else console.error('Failed release workspace preserved: '+workspace);}
