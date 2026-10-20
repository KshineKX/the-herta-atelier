import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {createRequire} from 'node:module';
export function inspectHost({resources,profileDir,env=process.env}={}) {
  const result={desktopVersion:null,schemaVersion:null,schemaSource:null,tested:false};
  if(profileDir){try{const require=createRequire(path.join(profileDir,'package.json'));const entry=require.resolve('@deepseek-ai/schemastery');let dir=path.dirname(entry);for(let i=0;i<5;i++,dir=path.dirname(dir)){const file=path.join(dir,'package.json');if(fs.existsSync(file)){const pkg=JSON.parse(fs.readFileSync(file));if(pkg.name==='@deepseek-ai/schemastery'){result.schemaVersion=pkg.version;result.schemaSource='profile';break;}}}}catch{}}
  const candidates=resources?[path.join(resources,'app.asar')]:[
    path.join(env.LOCALAPPDATA||'','Programs','DeepSeek Harness','resources','app.asar'),
    path.join(env.USERPROFILE||os.homedir(),'AppData','Local','Programs','DeepSeek Harness','resources','app.asar'),
    path.join(env.ProgramFiles||'','DeepSeek Harness','resources','app.asar')];
  const archive=candidates.find(file=>fs.existsSync(file));if(!archive)return result;
  const fd=fs.openSync(archive,'r');try{const h=Buffer.alloc(16);fs.readSync(fd,h,0,16,0);const length=h.readUInt32LE(12);if(length>50*1024*1024)throw Error('Archive header too large');const b=Buffer.alloc(length);fs.readSync(fd,b,0,b.length,16);const tree=JSON.parse(b.toString()),offset=8+h.readUInt32LE(4);
    const read=e=>{if(!e?.offset||e.size>2*1024*1024)return null;const data=Buffer.alloc(e.size);fs.readSync(fd,data,0,data.length,offset+Number(e.offset));return data.toString();};
    result.desktopVersion=JSON.parse(read(tree.files['package.json'])||'{}').version||null;
    function walk(node,p=''){for(const[name,e]of Object.entries(node.files||{})){const next=p?p+'/'+name:name;if(e.files)walk(e,next);else if(next.endsWith('/schemastery/package.json')){try{const pkg=JSON.parse(read(e));if(pkg.name==='@deepseek-ai/schemastery'&&!result.schemaVersion){result.schemaVersion=pkg.version;result.schemaSource='desktop';}}catch{}}}}walk(tree);
    result.tested=result.desktopVersion==='0.2.1-rc.2';
  }catch(error){result.warning=error.message;}finally{fs.closeSync(fd);}return result;
}
export function hasBootSchema(info){const m=/^(\d+)\.(\d+)\.(\d+)/.exec(info.schemaVersion||'');return !!m&&(+m[1]>3||(+m[1]===3&&(+m[2]>18||(+m[2]===18&&+m[3]>=4))));}
