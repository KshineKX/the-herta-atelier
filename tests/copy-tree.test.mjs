import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {copyTree} from '../tools/copy-tree.mjs';

function fixture(t) {
  const base = fs.realpathSync.native(os.tmpdir());
  const root = fs.mkdtempSync(path.join(base, 'herta-copy-'));
  t.after(() => {
    assert.ok(path.resolve(root).startsWith(base + path.sep) && path.basename(root).startsWith('herta-copy-'));
    fs.rmSync(root, {recursive:true, force:true});
  });
  const source = path.join(root, '中文 source');
  fs.mkdirSync(path.join(source, '子目录'), {recursive:true});
  fs.mkdirSync(path.join(source, '空目录'));
  fs.writeFileSync(path.join(source, '子目录', '文件.bin'), Buffer.from([0,255,1,128]));
  return {root,source,destination:path.join(root, '中文 destination')};
}
test('managed directory copy preserves Unicode names, empty directories and binary bytes', t => {
  const f = fixture(t); copyTree(f.source,f.destination);
  assert.deepEqual(fs.readFileSync(path.join(f.destination,'子目录','文件.bin')),Buffer.from([0,255,1,128]));
  assert.deepEqual(fs.readdirSync(path.join(f.destination,'空目录')),[]);
});
test('managed directory copy refuses existing or nested destinations without changing source', t => {
  const f=fixture(t);
  assert.throws(()=>copyTree(f.source,path.join(f.source,'nested')),/outside/);
  assert.throws(()=>copyTree(f.source,f.source),/outside/);
  fs.mkdirSync(f.destination);fs.writeFileSync(path.join(f.destination,'keep.txt'),'keep');
  assert.throws(()=>copyTree(f.source,f.destination),/already exists/);
  assert.equal(fs.readFileSync(path.join(f.destination,'keep.txt'),'utf8'),'keep');
  assert.equal(fs.existsSync(path.join(f.source,'nested')),false);
});
test('managed directory copy refuses junctions and leaves external files intact', t => {
  const f=fixture(t),external=path.join(f.root,'external');fs.mkdirSync(external);
  fs.writeFileSync(path.join(external,'keep.txt'),'external');
  fs.symlinkSync(external,path.join(f.source,'link'),process.platform==='win32'?'junction':'dir');
  assert.throws(()=>copyTree(f.source,f.destination),/symbolic link/);
  assert.equal(fs.readFileSync(path.join(external,'keep.txt'),'utf8'),'external');
});
