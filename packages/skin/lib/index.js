import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {registerGallery} from './gallery.js';import {registerMotion} from './motion.js';
const folder=fileURLToPath(new URL('../assets/',import.meta.url));
export const ASSETS=['herta-mirror.svg','herta-mirror-mark.svg','herta-view.svg','herta-focus.svg','herta-symbol.svg','herta-wordmark.svg','herta-wordmark-on-light.svg','herta-wordmark-plaque.svg','herta-serif-title.ttf','ornament-corner.svg','ornament-crest.svg','ornament-divider.svg','ornament-damask.svg','ornament-key.svg','neutral-background.svg',
  ...['home-dark','home-light'].flatMap(n=>['soft','crisp','ultra'].map(q=>'art-'+n+'-'+q+'.webp')),
  ...['room','campus'].flatMap(n=>['soft','ultra'].map(q=>'art-'+n+'-'+q+'.webp'))];
export const name='ui-skin-herta-atelier';
export function registerAssets(register,{base='/herta-atelier/'}={}) {
  for(const asset of ASSETS)register({kind:'exact',path:base+asset,handler(req,res){
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    let file=path.join(folder,asset),stat;try{stat=fs.statSync(file);}catch{if(!asset.startsWith('art-')){res.writeHead(404);res.end();return;}file=path.join(folder,'neutral-background.svg');stat=fs.statSync(file);}
    const ext=path.extname(file);const mime=({'.svg':'image/svg+xml','.ttf':'font/ttf','.webp':'image/webp'})[ext]||'application/octet-stream';
    const headers={'Content-Type':mime,'Accept-Ranges':'bytes','Cache-Control':'public,max-age=3600','X-Content-Type-Options':'nosniff'};let start=0,end=stat.size-1,status=200;
    if(req.headers.range){const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!range){res.writeHead(416,{'Content-Range':'bytes */'+stat.size});res.end();return;}start=Number(range[1]);end=range[2]?Math.min(Number(range[2]),end):end;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=stat.size){res.writeHead(416,{'Content-Range':'bytes */'+stat.size});res.end();return;}status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;}
    headers['Content-Length']=String(end-start+1);res.writeHead(status,headers);if(req.method==='HEAD'){res.end();return;}const stream=fs.createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  }});
}
export function apply(root){root.inject(['webServer'],ctx=>{const register=route=>ctx.effect(()=>ctx.webServer.register(route),'herta:'+route.path);registerAssets(register);registerGallery(register);registerMotion(register);});}
