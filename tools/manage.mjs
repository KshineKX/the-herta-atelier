import {inspectInterrupted,recoverInterrupted,assertNoInterrupted} from './transaction.mjs';
import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';import {makePlan,publicPlan,install,uninstall,locations,inspectPatch} from './profile.mjs';import {inspectHost} from './host.mjs';import {makeTrialPlan,applyTrial,rollbackTrial} from './trial.mjs';
const args=process.argv.slice(2),command=args.shift()||'doctor',opts={};let input;
const names={'--dsh-home':'dshHome','--profile':'profile','--data-dir':'dataDir','--resources':'resources','--source-root':'sourceRoot','--backup':'backup'};
try{
 while(args.length){const key=args.shift();if(names[key]){if(!args.length)throw Error('Missing '+key+' value');opts[names[key]]=args.shift();}else if(key==='--apply')opts.apply=true;else if(key==='--with-boot')opts.withBoot=true;else if(key==='--open')opts.open=true;else if(key==='--set'){opts.set=args.shift();if(!opts.set)throw Error('Missing folder path');}else if(key==='--file'){input=args.shift();if(!input)throw Error('Drop a video onto ImportVideo.cmd');}else throw Error('Unknown argument '+key);}
 const loc=locations(opts);
 if(!['doctor','recover-install'].includes(command))assertNoInterrupted(loc);
 if(command==='recover-install'){console.log(JSON.stringify(recoverInterrupted(loc,{apply:!!opts.apply}),null,2));process.exit(0);}
 if(command==='install'){
 const source=opts.sourceRoot||fileURLToPath(new URL('../',import.meta.url)),pack=path.join(source,'packages/skin/motion');
 const plan=makePlan(opts);console.log(JSON.stringify(publicPlan(plan),null,2));
 if(fs.existsSync(path.join(pack,'motion-manifest.json'))){
  const trial=makeTrialPlan({...opts,motionPack:pack});
  if(Object.keys(trial.catalog.clips).length!==13)throw Error('Complete installation requires thirteen motion clips.');
  if(opts.apply){
   if(plan.previousState?.version===plan.release.version){
    const result=install(plan);for(const e of Object.values(trial.catalog.clips)){const f=path.join(loc.dataDir,'motion',e.file);if(!fs.existsSync(f)||fs.readFileSync(f).compare(fs.readFileSync(path.join(pack,e.file)))!==0)throw Error('Installed motion differs; preserve it and use a new version.');}console.log(JSON.stringify(result));
   }else{const result=applyTrial(trial);console.log(JSON.stringify(result,null,2));}
  }else console.log(JSON.stringify({motionClips:13,readOnly:true}));
 }else{if(plan.release.edition==='theme')throw Error('Complete theme package is missing motion assets.');if(opts.apply)console.log(JSON.stringify(install(plan),null,2));}
}
else if(command==='rollback'||command==='recover-beta10'){
 const backup=opts.backup||JSON.parse(fs.readFileSync(path.join(loc.dataDir,'latest-trial-'+loc.profile+'.json'),'utf8')).backup;
 if(command==='recover-beta10'&&JSON.parse(fs.readFileSync(path.join(backup,'receipt.json'),'utf8')).version!=='0.4.0-beta.10')throw Error('Recovery entry requires an existing beta.10 trial receipt; nothing was changed.');
 console.log(JSON.stringify(rollbackTrial({...opts,backup}),null,2));
}
 else if(command==='uninstall')console.log(JSON.stringify(uninstall(opts),null,2));
 else if(command==='doctor'){
   const profileFound=fs.existsSync(path.join(loc.profileDir,'package.json'))&&fs.existsSync(path.join(loc.profileDir,'cordis.patch.yml'));
   let state=null;if(fs.existsSync(loc.stateFile))state=JSON.parse(fs.readFileSync(loc.stateFile));
   const report={readOnly:true,node:process.version,profileFound,profile:loc.profile,installedVersion:state?.version||null,sourceCommit:state?.sourceCommit||null,interruptedInstall:inspectInterrupted(loc),host:inspectHost({...opts,profileDir:loc.profileDir}),dataDirectory:loc.dataDir,userGalleryExists:fs.existsSync(path.join(loc.dataDir,'gallery')),runtimeAcceptance:'Check in DSH after restart; configuration status alone is not acceptance.'};
   if(profileFound){report.themePatch=inspectPatch(fs.readFileSync(path.join(loc.profileDir,'cordis.patch.yml'),'utf8'));const manifest=JSON.parse(fs.readFileSync(path.join(loc.profileDir,'package.json')));report.profileFormatSupported=!!manifest.dsh?.profile&&Array.isArray(manifest.dsh.profile.bundles);}
   report.compatibility=report.host.tested?'observed-beta-baseline; current build native acceptance remains separate':'untested-host; preserve a rollback and run native acceptance after host upgrades';
   console.log(JSON.stringify(report,null,2));if(!profileFound)process.exitCode=2;
 }
 else if(command==='gallery'){
   const file=path.join(loc.dataDir,'settings.json');let value={schemaVersion:1,galleryDirectory:path.join(loc.dataDir,'gallery')};if(fs.existsSync(file))value={...value,...JSON.parse(fs.readFileSync(file))};
   if(opts.set){if(!opts.apply)throw Error('Changing gallery requires --apply');value.galleryDirectory=path.resolve(opts.set);fs.mkdirSync(value.galleryDirectory,{recursive:true});fs.mkdirSync(loc.dataDir,{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
   if(opts.open){fs.mkdirSync(value.galleryDirectory,{recursive:true});if(process.platform==='win32')spawn('explorer.exe',[value.galleryDirectory],{detached:true,stdio:'ignore',windowsHide:true}).unref();}
   console.log(value.galleryDirectory);
 }
 else if(command==='import-video'){
   if(!input||!opts.apply)throw Error('Drop a personal video onto ImportVideo.cmd, or use --file <path> --apply');
   const from=path.resolve(input);if(!/\.(mp4|webm|m4v|mov)$/i.test(from)||!fs.statSync(from).isFile())throw Error('Expected a regular MP4/WebM/M4V/MOV file');
   const dir=path.join(loc.dataDir,'boot-videos'),out=path.join(dir,path.basename(from));fs.mkdirSync(dir,{recursive:true});if(fs.existsSync(out))throw Error('A video with this name already exists; rename it first');fs.copyFileSync(from,out);console.log('Imported personal video: '+path.basename(from));
 }
 else throw Error('Expected install, uninstall, doctor, gallery or import-video');
}catch(error){console.error('Herta Atelier: '+error.message);process.exitCode=2;}
