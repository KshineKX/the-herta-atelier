import fs from 'node:fs';
export function desktopMetadata(archive,anchors=[]){
 const fd=fs.openSync(archive,'r');
 try{
  const header=Buffer.alloc(16);if(fs.readSync(fd,header,0,16,0)!==16)throw Error('Truncated archive');const length=header.readUInt32LE(12);
  if(length>50*1024*1024)throw Error('Archive header limit');const bytes=Buffer.alloc(length);fs.readSync(fd,bytes,0,length,16);const tree=JSON.parse(bytes.toString()),offset=8+header.readUInt32LE(4),files=[];
  function walk(node,prefix=''){for(const[name,entry]of Object.entries(node.files||{})){const rel=prefix?prefix+'/'+name:name;if(entry.files)walk(entry,rel);else files.push({path:rel,entry});}}walk(tree);
  function read(entry,limit=2*1024*1024){if(!entry||entry.offset===undefined||!Number.isSafeInteger(entry.size)||entry.size<0||entry.size>limit)return null;const start=offset+Number(entry.offset);if(!Number.isSafeInteger(start)||start<offset)throw Error('Invalid archive offset');const data=Buffer.alloc(entry.size);if(fs.readSync(fd,data,0,data.length,start)!==data.length)throw Error('Truncated archive file');return data.toString('utf8');}
  const result={desktopVersion:JSON.parse(read(tree.files?.['package.json'])||'{}').version||null,desktopSchemaVersion:null,contract:{found:[],missing:[...anchors]}};
  for(const item of files.filter(file=>file.path.endsWith('/schemastery/package.json')).sort((a,b)=>a.path.length-b.path.length)){try{const pkg=JSON.parse(read(item.entry)||'{}');if(pkg.name==='@deepseek-ai/schemastery'){result.desktopSchemaVersion=pkg.version;break;}}catch{}}
  let scanned=0;
  for(const item of files.filter(file=>file.path.endsWith('.js'))){if(!result.contract.missing.length)break;if(item.entry.size>32*1024*1024||scanned+item.entry.size>80*1024*1024)continue;const source=read(item.entry,32*1024*1024);if(source===null)continue;scanned+=item.entry.size;result.contract.missing=result.contract.missing.filter(name=>{if(source.includes(name)){result.contract.found.push(name);return false;}return true;});}
  result.contract.matched=anchors.length>0&&result.contract.missing.length===0;return result;
 }finally{fs.closeSync(fd);}
}
