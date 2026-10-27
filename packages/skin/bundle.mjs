import fs from 'node:fs';
export function renderClientBundle(base=new URL('./',import.meta.url)){
 const names=['palette','scenes','theme-icon','styles','project.generated','host','mirror','motion','dock','client'];
 const modules=names.map(name=>fs.readFileSync(new URL('./src/'+name+'.js',base),'utf8').replace(/^import .*? from '\.\/[^']+\.js';\r?\n/gm,'').replace(/^export /gm,''));
 return "window.__ModuleLoader__.load({id:'dsh-herta-atelier',factory:function(require){\nconst module={exports:{}};const exports=module.exports;\n"+modules.join('\n')+"\nObject.assign(exports,{apply});return module.exports;\n}});\n";
}
