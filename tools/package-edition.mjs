import fs from 'node:fs';
import path from 'node:path';
import { isVisual } from './release-policy.mjs';

export function includeForEdition(name, edition) {
  return edition !== 'core' || (!isVisual(name) && !name.startsWith('packages/skin/motion/'));
}

export function prepareEdition(stage, edition) {
  if (edition === 'core') {
    const file = path.join(stage, 'packages/skin/package.json');
    const pkg = JSON.parse(fs.readFileSync(file));
    pkg.files = pkg.files.filter(entry => entry !== 'motion');
    fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
  }
  const file = path.join(stage, 'media-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(file));
  manifest.files = manifest.files.filter(entry => includeForEdition(entry.path, edition));
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
}
