import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
export const ROOT_FILES=['package.json','package-lock.json','recovery-manifest.json','media-manifest.json','source-provenance.json','README.md','LICENSE','NOTICE.md','CHANGELOG.md','AGENTS.md','CONTRIBUTING.md','SECURITY.md','SUPPORT.md','.gitignore','.gitattributes','Install.cmd','InstallWithBoot.cmd','Uninstall.cmd','Check.cmd','OpenGallery.cmd','ImportVideo.cmd','Rollback.cmd','RecoverBeta10.cmd','RecoverInstall.cmd'];
export const ROOT_DIRS=['packages','tools','tests','docs','.github'];
export const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export const isVisual=rel=>/\.(webp|png|jpe?g|gif|avif|mp4|webm|mov|m4v)$/i.test(rel);
const isBinary=rel=>isVisual(rel)||/\.(ttf|otf|woff2?)$/i.test(rel);
const textFile=rel=>/\.(mjs|js|json|md|ya?ml|cmd|ps1|svg|txt|html|css)$/i.test(rel)||/(^|\/)LICENSE$/.test(rel)||ROOT_FILES.includes(rel);
export function inventory(root,{strict=false}={}){
 root=path.resolve(root);const entries=[];
 function walk(dir,rel=''){for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const name=rel?rel+'/'+entry.name:entry.name,file=path.join(dir,entry.name);
  if(!strict&&['node_modules','.git','dist','runtime-data','private-media'].includes(entry.name))continue;
  if(!rel&&entry.name==='release-manifest.json')continue;
  if(!strict&&!rel&&!ROOT_FILES.includes(entry.name)&&!ROOT_DIRS.includes(entry.name))continue;
  if(entry.isSymbolicLink())throw Error('Release symlink refused: '+name);
  if(entry.isDirectory())walk(file,name);else if(entry.isFile()){const bytes=fs.readFileSync(file);entries.push({path:name,bytes:bytes.length,sha256:digest(bytes)});}else throw Error('Unexpected release entry: '+name);
 }}walk(root);return entries;
}
export function verifyPrivacy(root,entries=inventory(root)){
 const forbidden=['qq'+'-bridge','guest'+'-workspace','mirror'+'-portrait-sole','ref'+'-dragon','herta-pv'+'-native-1080p.mp4'];
 for(const entry of entries){const rel=entry.path;
  if(/(^|\/)(?:\.env(?:\..*)?|credentials?\.[^/]+|ROUND\d+-FEEDBACK[^/]*|handoff)(?:\/|$)/i.test(rel))throw Error('Private release path: '+rel);
  if(!textFile(rel))continue;const value=fs.readFileSync(path.join(root,rel),'utf8');
  for(const token of forbidden)if(value.includes(token))throw Error('Private legacy marker in '+rel);
  if(/[A-Za-z]:[\\/]+Users[\\/]+[^\\/\s"'<>]+/.test(value))throw Error('Machine-specific user path in '+rel);
 }return entries;
}
export function verifyMedia(root,entries=inventory(root)){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'media-manifest.json'),'utf8'));
 if(manifest.schemaVersion!==1||!Array.isArray(manifest.files))throw Error('Expected reviewed media manifest');const approved=new Map();
 for(const entry of manifest.files){if(approved.has(entry.path)||!isBinary(entry.path)||!Number.isSafeInteger(entry.bytes)||!/^[a-f0-9]{64}$/.test(entry.sha256))throw Error('Invalid reviewed media entry');approved.set(entry.path,entry);}
 const binary=entries.filter(entry=>isBinary(entry.path));
 for(const entry of binary){const expected=approved.get(entry.path);if(!expected||expected.bytes!==entry.bytes||expected.sha256!==entry.sha256)throw Error('Unreviewed or changed media: '+entry.path);}
 for(const name of approved.keys())if(!binary.some(entry=>entry.path===name))throw Error('Reviewed media missing: '+name);
 return{reviewedMedia:binary.length};
}
export function verifyInventory(root,manifest,{strict=false}={}){
 const actual=inventory(root,{strict}),seen=new Set();
 for(const entry of manifest.files){if(seen.has(entry.path)||path.isAbsolute(entry.path)||entry.path.split(/[\\/]/).includes('..'))throw Error('Unsafe or duplicate manifest path');seen.add(entry.path);const found=actual.find(file=>file.path===entry.path);if(!found||found.sha256!==entry.sha256||found.bytes!==entry.bytes)throw Error('Manifest mismatch: '+entry.path);}
 if(actual.length!==seen.size||actual.some(entry=>!seen.has(entry.path)))throw Error('Unlisted release files');verifyPrivacy(root,actual);verifyMedia(root,actual);return actual;
}
