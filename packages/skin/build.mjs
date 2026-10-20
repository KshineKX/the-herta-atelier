import fs from 'node:fs';
const mirror=fs.readFileSync(new URL('./src/mirror.js',import.meta.url),'utf8').replace(/^export /gm,'');
const source=fs.readFileSync(new URL('./src/client.js',import.meta.url),'utf8').replace(/^import \{ createMirror \} from '\.\/mirror\.js';\r?\n/m,'').replace(/^export /gm,'');
fs.mkdirSync(new URL('./lib/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('./lib/client.js',import.meta.url),"window.__ModuleLoader__.load({id:'dsh-herta-atelier',factory:function(require){\nconst module={exports:{}};const exports=module.exports;\n"+mirror+'\n'+source+"\nObject.assign(exports,{apply});return module.exports;\n}});\n");
