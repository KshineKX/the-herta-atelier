import {RECOVERY_FILES} from './recovery-files.mjs';
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {inventory,verifyPrivacy,verifyMedia,digest} from './release-policy.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vendor=path.join(root,'packages/boot/vendor/packages'),modules=path.join(root,'packages/boot/node_modules');if(fs.existsSync(vendor)&&!fs.existsSync(modules))fs.cpSync(vendor,modules,{recursive:true,dereference:true});
for(const[cwd,file]of [['packages/skin','build.mjs'],['packages/boot','build-client.mjs']]){const result=spawnSync(process.execPath,[file],{cwd:path.join(root,cwd),stdio:'inherit',windowsHide:true});if(result.status!==0)process.exit(result.status||1);}
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'))).version;
const recoveryFiles=RECOVERY_FILES.map(file=>'tools/'+file).map(name=>({path:name,sha256:digest(fs.readFileSync(path.join(root,name)))}));
fs.writeFileSync(path.join(root,'recovery-manifest.json'),JSON.stringify({schemaVersion:1,version,targetReceipt:'0.4.0-beta.10',files:recoveryFiles},null,2)+'\n');
const files=inventory(root);verifyPrivacy(root,files);verifyMedia(root,files);const art=files.filter(entry=>/^packages\/skin\/assets\/art-.*\.webp$/.test(entry.path)).length;
if(art!==0&&art!==10)throw Error('Expected all ten reviewed portrait variants, or an explicit core edition');
const compatibility=JSON.parse(fs.readFileSync(path.join(root,'packages/skin/host-compatibility.json')));
fs.writeFileSync(path.join(root,'release-manifest.json'),JSON.stringify({schemaVersion:2,project:'The Herta Atelier',author:'Kshine',version,edition:art===10?'theme':'core',mediaRights:art===10?'maintainer-generated character artwork; see NOTICE for separate character rights':'core without portrait media',observedDesktopBaseline:compatibility.primaryBaseline,nativeAcceptance:'Per-build native acceptance remains separate from historical host evidence',files},null,2)+'\n');
console.log(JSON.stringify({built:version,files:files.length,edition:art===10?'theme':'core'}));
