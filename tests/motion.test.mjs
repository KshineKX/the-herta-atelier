import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';import {registerMotion} from '../packages/skin/lib/motion.js';
test('authored motion serves only declared local MP4 files and supports seeking',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'herta-motion-test-'));t.after(()=>{const resolved=path.resolve(dir);assert.ok(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('herta-motion-test-'));fs.rmSync(resolved,{recursive:true,force:true})});
 const routes=new Map();registerMotion(r=>routes.set(r.path,r),{directory:dir});const server=http.createServer((req,res)=>{const r=routes.get(new URL(req.url,'http://localhost').pathname);if(r)r.handler(req,res);else{res.writeHead(404);res.end()}});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port;
 let response=await fetch(base+'/herta-atelier/motion-manifest.json');assert.equal((await response.json()).status,'missing');
 fs.mkdirSync(path.join(dir,'home-idle'));fs.writeFileSync(path.join(dir,'home-idle/video.mp4'),Buffer.from('0123456789ABCDEF'));fs.writeFileSync(path.join(dir,'secret.txt'),'not public');
 fs.writeFileSync(path.join(dir,'motion-manifest.json'),JSON.stringify({schemaVersion:1,clips:{'home-idle':{file:'home-idle/video.mp4',duration:8},'not-video':{file:'../secret.txt'},'missing-file':{file:'missing-file/video.mp4'}}}));
 const catalog=await (await fetch(base+'/herta-atelier/motion-manifest.json')).json();assert.deepEqual(Object.keys(catalog.clips),['home-idle']);assert.ok(!JSON.stringify(catalog).includes(dir));
 const url=base+catalog.clips['home-idle'].url;response=await fetch(url,{headers:{range:'bytes=3-7'}});assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),'bytes 3-7/16');assert.equal(await response.text(),'34567');
 for(const range of ['bytes=99-','bytes=-5','bytes=8-3','bytes=0-1,5-6'])assert.equal((await fetch(url,{headers:{range}})).status,416);
 for(const id of ['../secret.txt','home-idle/../../secret.txt','missing-file','not-video'])assert.equal((await fetch(base+'/herta-atelier/motion-video?id='+encodeURIComponent(id))).status,404);
 assert.equal((await fetch(url,{method:'POST'})).status,405);response=await fetch(url,{method:'HEAD'});assert.equal(response.headers.get('content-length'),'16');assert.equal((await response.arrayBuffer()).byteLength,0);
});
