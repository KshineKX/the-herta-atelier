import fs from 'node:fs';import {fileURLToPath} from 'node:url';import {renderClientBundle} from './bundle.mjs';import {writeBuildMeta} from './build-fingerprint.mjs';
const pkg=JSON.parse(fs.readFileSync(new URL('./package.json',import.meta.url),'utf8'));
fs.writeFileSync(new URL('./src/project.generated.js',import.meta.url),'export const PROJECT_VERSION='+JSON.stringify(pkg.version)+';\n');
fs.mkdirSync(new URL('./lib/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./lib/client.js',import.meta.url),renderClientBundle());
const meta=writeBuildMeta(fileURLToPath(new URL('./',import.meta.url)));
console.log(JSON.stringify({skinBundle:true,fingerprint:meta.fingerprint,sourceCommit:meta.sourceCommit,path:meta.path}));
