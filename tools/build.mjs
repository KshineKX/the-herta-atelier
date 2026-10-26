import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const vendor=path.join(root,'packages/boot/vendor/packages'),bootModules=path.join(root,'packages/boot/node_modules');
if(fs.existsSync(vendor)&&!fs.existsSync(bootModules))fs.cpSync(vendor,bootModules,{recursive:true,dereference:true});
for(const [cwd,file]of [['packages/skin','build.mjs'],['packages/boot','build-client.mjs']]){const r=spawnSync(process.execPath,[file],{cwd:path.join(root,cwd),stdio:'inherit',windowsHide:true});if(r.status!==0)process.exit(r.status||1);}
const files=[];
function walk(dir,rel=''){for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){if((e.name==='node_modules'&&!rel.endsWith('/vendor'))||e.name.startsWith('.'))continue;const p=rel?rel+'/'+e.name:e.name,full=path.join(dir,e.name);if(e.isDirectory())walk(full,p);else if(e.isFile())files.push({path:p,bytes:fs.statSync(full).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex')});}}
for(const pkg of ['skin','boot'])walk(path.join(root,'packages',pkg),'packages/'+pkg);
for(const dir of ['tools','tests','docs','.github'])if(fs.existsSync(path.join(root,dir)))walk(path.join(root,dir),dir);
for(const name of ['package.json','README.md','LICENSE','NOTICE.md','CHANGELOG.md','AGENTS.md','CONTRIBUTING.md','SECURITY.md','SUPPORT.md','.gitignore','.gitattributes','Install.cmd','InstallWithBoot.cmd','Uninstall.cmd','Check.cmd','OpenGallery.cmd','ImportVideo.cmd','Rollback.cmd']){
  const full=path.join(root,name);if(fs.existsSync(full))files.push({path:name,bytes:fs.statSync(full).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex')});
}
const art=files.filter(e=>e.path.endsWith('.webp')).length;if(art!==0&&art!==10)throw Error('Incomplete artwork set; expected 0 or 10 files');
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'))).version;
fs.writeFileSync(path.join(root,'release-manifest.json'),JSON.stringify({schemaVersion:1,project:'The Herta Atelier',author:'Kshine',version,edition:art===10?'theme':'core',mediaRights:art===10?'user-generated character artwork included at maintainer request':'core edition without portrait artwork',testedDesktop:'0.2.1-rc.2',files},null,2)+'\n');
console.log(JSON.stringify({built:version,edition:art===10?'theme':'core',runtimeFiles:files.length}));
