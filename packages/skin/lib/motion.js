import fs from 'node:fs';import path from 'node:path';import {dataDirectory} from './settings.js';
const clipId=/^[a-z][a-z0-9-]{1,50}$/;
export function registerMotion(register,{directory,base='/herta-atelier/'}={}){
 const folder=()=>directory||path.join(dataDirectory(),'motion');
 function clipFile(id,entry){
  if(!clipId.test(id)||typeof entry?.file!=='string'||!new RegExp('^'+id+'/video\\.mp4$').test(entry.file))return null;
  try{const root=fs.realpathSync(folder()),file=path.join(folder(),entry.file),stat=fs.lstatSync(file);if(!stat.isFile()||!fs.realpathSync(file).startsWith(root+path.sep))return null;return {file,stat}}catch{return null}
 }
 function catalog(){try{const raw=JSON.parse(fs.readFileSync(path.join(folder(),'motion-manifest.json'),'utf8'));if(raw.schemaVersion!==1||!raw.clips)return {};return raw.clips}catch{return {}}}
 register({kind:'exact',path:base+'motion-manifest.json',handler(req,res){
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
  const clips={};for(const [id,entry] of Object.entries(catalog())){const found=clipFile(id,entry);if(found)clips[id]={url:base+'motion-video?id='+encodeURIComponent(id)+'&v='+found.stat.mtimeMs+'-'+found.stat.size,duration:entry.duration}}
  const body=JSON.stringify({schemaVersion:1,status:Object.keys(clips).length?'ready':'missing',clips});res.writeHead(200,{'Content-Type':'application/json;charset=utf-8','Content-Length':Buffer.byteLength(body),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);
 }});
 register({kind:'exact',path:base+'motion-video',handler(req,res){
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
  let id;try{id=new URL(req.url,'http://localhost').searchParams.get('id')}catch{}
  if(!id||!clipId.test(id)){res.writeHead(404);res.end();return}const found=clipFile(id,catalog()[id]);if(!found){res.writeHead(404);res.end();return}
  const {file,stat}=found;let start=0,end=stat.size-1,status=200;const headers={'Content-Type':'video/mp4','Accept-Ranges':'bytes','Cache-Control':'private,max-age=600','X-Content-Type-Options':'nosniff'};
  if(req.headers.range){const m=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!m){res.writeHead(416,{'Content-Range':'bytes */'+stat.size});res.end();return}start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),end):end;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=stat.size){res.writeHead(416,{'Content-Range':'bytes */'+stat.size});res.end();return}status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`}
  headers['Content-Length']=end-start+1;res.writeHead(status,headers);if(req.method==='HEAD'){res.end();return}const stream=fs.createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
 }});
}
