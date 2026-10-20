import fs from 'node:fs';import path from 'node:path';import {localSettings} from './settings.js';
const formats={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.gif':'image/gif'};
const valid=name=>typeof name==='string'&&!/[\\/\0:*?"<>|]/.test(name)&&Object.hasOwn(formats,path.extname(name).toLowerCase());
export function registerGallery(register,{directory,base='/herta-atelier/'}={}) {
  const folder=()=>directory||localSettings().galleryDirectory;
  register({kind:'exact',path:base+'mirror-gallery.json',handler(req,res){
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    const dir=folder();const images=[];let status='ready';
    try {for(const name of fs.readdirSync(dir).filter(valid).sort((a,b)=>a.localeCompare(b,'zh-CN'))){
      try{const stat=fs.lstatSync(path.join(dir,name));if(!stat.isFile())continue;images.push({id:'folder:'+name,title:name,src:base+'mirror-image?name='+encodeURIComponent(name)+'&v='+stat.mtimeMs,fit:'contain'});}catch{/* A file removed during enumeration is skipped. */}
    }}catch(error){status=error.code==='ENOENT'?'missing':'unavailable';}
    const body=JSON.stringify({directory:dir,status,images});res.writeHead(200,{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);
  }});
  register({kind:'exact',path:base+'mirror-image',handler(req,res){
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    let name;try{name=new URL(req.url,'http://localhost').searchParams.get('name');}catch{res.writeHead(400);res.end();return;}
    if(!valid(name)){res.writeHead(404);res.end();return;}
    const file=path.join(folder(),name);let stat;try{stat=fs.lstatSync(file);if(!stat.isFile())throw Error();}catch{res.writeHead(404);res.end();return;}
    res.writeHead(200,{'Content-Type':formats[path.extname(name).toLowerCase()],'Content-Length':stat.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD'){res.end();return;}const stream=fs.createReadStream(file);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  }});
}
