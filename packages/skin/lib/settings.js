import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
export function dataDirectory({env=process.env,home=os.homedir(),installedConfig=fileURLToPath(new URL('../runtime-config.json',import.meta.url))}={}) {
  if(env.HERTA_ATELIER_HOME)return path.resolve(env.HERTA_ATELIER_HOME);
  try{const installed=JSON.parse(fs.readFileSync(installedConfig,'utf8'));if(typeof installed.dataDirectory==='string'&&path.isAbsolute(installed.dataDirectory))return path.resolve(installed.dataDirectory);}catch{}
  return path.resolve(path.join(env.DSH_HOME || path.join(home,'.dsh'),'herta-atelier'));
}
export function localSettings({dataDir=dataDirectory()}={}) {
  const fallback=path.join(dataDir,'gallery');
  try {const value=JSON.parse(fs.readFileSync(path.join(dataDir,'settings.json'),'utf8'));const chosen=value.galleryDirectory;
    return {dataDir,galleryDirectory:typeof chosen==='string'&&path.isAbsolute(chosen)?path.resolve(chosen):fallback,valid:true};
  } catch(error) {return {dataDir,galleryDirectory:fallback,valid:error.code==='ENOENT'};}
}
