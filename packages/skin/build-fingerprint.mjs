import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';
// Deterministic build identity read by DSH skin managers (skin.build.json, schema 1).
// Only shipped runtime inputs are hashed; docs, tests and this metadata file stay out.
export const META_FILE='skin.build.json';
export const FINGERPRINT_INPUTS=['lib/client.js','lib/index.js','cordis.patch.yml','skin.json'];
export function skinFingerprint(base){
 const hash=crypto.createHash('sha256');
 for(const input of FINGERPRINT_INPUTS){const text=fs.readFileSync(path.join(base,input),'utf8').replaceAll('\r\n','\n');hash.update(input+'\0'+Buffer.byteLength(text)+'\0');hash.update(text);}
 return hash.digest('hex');
}
function git(base,args){const result=spawnSync('git',['-C',base,...args],{encoding:'utf8',windowsHide:true});return result.status===0&&result.stdout.trim()!==''?result.stdout.trim():null;}
export function parseGitHubRemote(url){if(typeof url!=='string'||url==='')return null;const match=/github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?\/?$/.exec(url.trim());return match===null?null:match[1]+'/'+match[2];}
function packageRepository(base){try{const value=JSON.parse(fs.readFileSync(path.join(base,'package.json'),'utf8')).repository;return parseGitHubRemote(typeof value==='string'?value:value?.url)??null;}catch{return null;}}
export function readBuildMeta(base){try{const value=JSON.parse(fs.readFileSync(path.join(base,META_FILE),'utf8'));return value.schema===1&&typeof value.fingerprint==='string'&&/^[0-9a-f]{64}$/.test(value.fingerprint)?value:null;}catch{return null;}}
export function writeBuildMeta(base){
 const dir=path.resolve(base),fingerprint=skinFingerprint(dir),previous=readBuildMeta(dir),head=git(dir,['rev-parse','HEAD']),root=git(dir,['rev-parse','--show-toplevel']);
 // Head before this build is the ancestry anchor; keep the recorded one while the runtime bytes do not move, so a docs-only commit never rewrites this file.
 const sourceCommit=previous!==null&&previous.fingerprint===fingerprint&&/^[0-9a-f]{40}$/.test(previous.sourceCommit??'')?previous.sourceCommit:(/^[0-9a-f]{40}$/.test(head??'')?head:null);
 const repository=packageRepository(dir)??parseGitHubRemote(git(dir,['remote','get-url','origin'])??'')??previous?.repository??null;
 if(repository===null)throw Error('skin.build.json needs a GitHub repository in package.json');
 const relative=root===null?null:path.relative(root,dir).replaceAll('\\','/');
 const meta={schema:1,fingerprint,sourceCommit,repository,path:relative===null||relative===''?(previous?.path??'packages/skin'):relative};
 fs.writeFileSync(path.join(dir,META_FILE),JSON.stringify(meta,null,2)+'\n');
 return meta;
}
