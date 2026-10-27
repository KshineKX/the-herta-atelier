import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {extractArchive} from '../tools/release-source.mjs';

function fixture(t,entries){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'herta-zip-'));
 t.after(()=>{const target=path.resolve(root);assert.ok(target.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(target).startsWith('herta-zip-'));fs.rmSync(target,{recursive:true,force:true})});
 const zip=path.join(root,'fixture.zip'),destination=path.join(root,'解压 with spaces');
 const script="Add-Type -AssemblyName System.IO.Compression.FileSystem; $hertaSpec=$env:HERTA_ZIP_TEST_SPEC | ConvertFrom-Json; $hertaZip=[IO.Compression.ZipFile]::Open($hertaSpec.zip,'Create'); try { foreach($hertaValue in $hertaSpec.entries){ $hertaEntry=$hertaZip.CreateEntry($hertaValue.name); if($null -ne $hertaValue.attributes){$hertaEntry.ExternalAttributes=$hertaValue.attributes}; $hertaWriter=[IO.StreamWriter]::new($hertaEntry.Open()); try{$hertaWriter.Write($hertaValue.text)}finally{$hertaWriter.Dispose()} } }finally{$hertaZip.Dispose()}";
 const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{env:{...process.env,HERTA_ZIP_TEST_SPEC:JSON.stringify({zip,entries})},encoding:'utf8',windowsHide:true});
 assert.equal(result.status,0,result.stderr||result.stdout);return{root,zip,destination};
}
test('ZIP extraction preserves Unicode paths and refuses an existing destination',t=>{
 const f=fixture(t,[{name:'package/docs/中文.txt',text:'hello'}]);extractArchive(f.zip,f.destination);assert.equal(fs.readFileSync(path.join(f.destination,'package/docs/中文.txt'),'utf8'),'hello');assert.throws(()=>extractArchive(f.zip,f.destination),/already exists/);assert.equal(fs.readFileSync(path.join(f.destination,'package/docs/中文.txt'),'utf8'),'hello');
});
for(const [label,entries]of [
 ['path traversal',[{name:'good.txt',text:'before'},{name:'../escaped.txt',text:'unsafe'}]],
 ['case-insensitive duplicate',[{name:'package/File.txt',text:'one'},{name:'package/file.txt',text:'two'}]],
 ['symlink',[{name:'package/link',text:'../outside',attributes:-1577123840}]],
])test('ZIP rejects '+label+' before extracting any file',t=>{const f=fixture(t,entries);assert.throws(()=>extractArchive(f.zip,f.destination),/Unsafe ZIP|duplicate ZIP/);assert.equal(fs.existsSync(f.destination),false);assert.equal(fs.existsSync(path.join(f.root,'escaped.txt')),false)});
