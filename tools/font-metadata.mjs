import fs from 'node:fs';
export function fontNames(file){const buffer=fs.readFileSync(file);if(buffer.length<12)throw Error('Truncated font');let offset=-1;
 for(let i=0;i<buffer.readUInt16BE(4);i++){const at=12+i*16;if(at+16>buffer.length)throw Error('Invalid font table directory');if(buffer.toString('ascii',at,at+4)==='name')offset=buffer.readUInt32BE(at+8);}
 if(offset<0||offset+6>buffer.length)throw Error('Font name table missing');const result=[];
 for(let i=0;i<buffer.readUInt16BE(offset+2);i++){const at=offset+6+i*12;if(at+12>buffer.length)throw Error('Invalid font name record');const platform=buffer.readUInt16BE(at),id=buffer.readUInt16BE(at+6),length=buffer.readUInt16BE(at+8),start=offset+buffer.readUInt16BE(offset+4)+buffer.readUInt16BE(at+10);if(start+length>buffer.length)throw Error('Font name escaped table');const bytes=Buffer.from(buffer.subarray(start,start+length));if((platform===0||platform===3)&&bytes.length%2)throw Error('Invalid UTF16 font name');const value=platform===0||platform===3?bytes.swap16().toString('utf16le'):bytes.toString('latin1');if(!result.some(entry=>entry.id===id&&entry.value===value))result.push({id,value});}
 return result;
}
