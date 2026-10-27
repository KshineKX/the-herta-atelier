import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
// Build before local tests so complete-package tests never exercise a stale manifest.
for(const args of [['tools/build.mjs'],['--test','tests/*.test.mjs']]){
  const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit',windowsHide:true});
  if(result.status!==0)process.exit(result.status||1);
}
