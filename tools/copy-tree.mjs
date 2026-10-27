import fs from 'node:fs';
import path from 'node:path';

// Node 22.19's native cpSync can abort on Windows Unicode directory paths.
// These managed trees contain regular files/directories only; never follow links.
export function copyTree(source, destination) {
  const from = path.resolve(source), to = path.resolve(destination);
  const compare = value => process.platform === 'win32' ? value.toLowerCase() : value;
  if (compare(to) === compare(from) || compare(to).startsWith(compare(from) + path.sep)) {
    throw Error('Copy destination must be outside the source tree');
  }
  try { fs.lstatSync(to); throw Error('Copy destination already exists'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  function copy(input, output) {
    const stat = fs.lstatSync(input);
    if (stat.isSymbolicLink()) throw Error('Refusing to copy a symbolic link');
    if (stat.isDirectory()) {
      fs.mkdirSync(output);
      for (const name of fs.readdirSync(input)) copy(path.join(input, name), path.join(output, name));
    } else if (stat.isFile()) {
      fs.copyFileSync(input, output, fs.constants.COPYFILE_EXCL);
    } else throw Error('Refusing to copy a non-regular entry');
  }
  copy(from, to);
}
