import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {remux,leadingBox} from '../packages/boot/src/remux.js';
import {mount,settle,state} from '../packages/boot/verify/screen-harness.mjs';

function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'herta-boot-regression-'));t.after(()=>{const target=path.resolve(root);assert.ok(target.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(target).startsWith('herta-boot-regression-'));fs.rmSync(target,{recursive:true,force:true})});return root}
function box(type,payload=Buffer.alloc(0)){const header=Buffer.alloc(8);header.writeUInt32BE(8+payload.length);header.write(type,4,'latin1');return Buffer.concat([header,payload])}
function movie(type,{fast=false,large=false,extended=false}={}){
 const ftyp=box('ftyp',Buffer.from('isom0000isom')),padding=large?Buffer.alloc(100*1024):Buffer.alloc(0);
 let prefix=box('free',padding);
 if(extended){const header=Buffer.alloc(16);header.writeUInt32BE(1);header.write('free',4,'latin1');header.writeBigUInt64BE(BigInt(16+padding.length),8);prefix=Buffer.concat([header,padding])}
 const data=Buffer.from('unchanged media payload'),mdat=box('mdat',data),width=type==='co64'?8:4,payload=Buffer.alloc(8+width);payload.writeUInt32BE(1,4);
 const offset=ftyp.length+prefix.length+8;
 if(width===8)payload.writeBigUInt64BE(BigInt(offset),8);else payload.writeUInt32BE(offset,8);
 const moov=box('moov',box('trak',box('mdia',box('minf',box('stbl',box(type,payload))))));
 return{bytes:Buffer.concat(fast?[ftyp,prefix,moov,mdat]:[ftyp,prefix,mdat,moov]),moov,data,offset};
}
for(const type of ['stco','co64'])test('remux rewrites '+type+' offsets and preserves the original media bytes',async t=>{
 const root=fixture(t),input=movie(type,{large:true}),file=path.join(root,'中文 movie.mp4'),out=path.join(root,'output');fs.writeFileSync(file,input.bytes);
 assert.equal(await leadingBox(file),false);assert.match(remux(file,out,true),/^WROTE/);
 const result=fs.readFileSync(path.join(out,'中文 movie.faststart.mp4')),at=result.indexOf(Buffer.from(type))+12;
 assert.equal(type==='co64'?result.readBigUInt64BE(at):BigInt(result.readUInt32BE(at)),BigInt(input.offset+input.moov.length));
 assert.ok(result.includes(input.data));assert.equal(result.length,input.bytes.length);assert.deepEqual(fs.readFileSync(file),input.bytes);assert.equal(await leadingBox(path.join(out,'中文 movie.faststart.mp4')),true);
});
test('faststart inspection skips large and extended-size metadata headers',async t=>{
 const root=fixture(t);for(const extended of [false,true]){const file=path.join(root,String(extended)+'.mp4');fs.writeFileSync(file,movie('stco',{large:true,extended,fast:true}).bytes);assert.equal(await leadingBox(file),true)}
});
test('a truncated MP4 is neither certified nor rewritten',async t=>{
 const root=fixture(t),file=path.join(root,'bad.mp4'),bytes=Buffer.alloc(12);bytes.writeUInt32BE(1000000);bytes.write('free',4,'latin1');fs.writeFileSync(file,bytes);assert.equal(await leadingBox(file),undefined);assert.throws(()=>remux(file,path.join(root,'out'),true),/malformed/);assert.deepEqual(fs.readFileSync(file),bytes);assert.equal(fs.existsSync(path.join(root,'out')),false);
});
for(const enterMode of ['tail','end'])test('missing client-ready signal releases decorative boot at the hard deadline in '+enterMode+' mode',async()=>{
 const f=mount({sound:false,enterMode});await settle();assert.notEqual(state(f),'leaving');const deadline=f.timers.find(timer=>timer.ms===15000);assert.ok(deadline);deadline.handler();assert.equal(state(f),'leaving');assert.equal(f.sandbox.__DSH_BOOT_ANIM__.timeoutReleased,true);
});
test('the hard deadline respects a ready client and an explicit click-only preference',async()=>{
 const ready=mount({sound:false});await settle();ready.sandbox.__DSH_BOOT_ANIM__.clientReady();ready.timers.find(timer=>timer.ms===15000).handler();assert.notEqual(state(ready),'leaving');
 const manual=mount({sound:false,enterMode:'click'});await settle();manual.timers.find(timer=>timer.ms===15000).handler();assert.notEqual(state(manual),'leaving');
});
