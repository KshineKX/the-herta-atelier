import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { registerAssets } from '../packages/skin/lib/index.js';
import { registerGallery } from '../packages/skin/lib/gallery.js';
import { registerMotion } from '../packages/skin/lib/motion.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourceModules = ['client', 'palette', 'scenes', 'theme-icon', 'styles', 'host', 'project.generated', 'mirror', 'motion', 'dock'];
const pages = new Map([
  ['/', 'tests/skin-preview.html'],
  ['/home-cycle.html', 'tests/home-cycle.html'],
  ['/demo.html', 'tests/demo.html'],
  ['/skin-preview.html', 'tests/skin-preview.html'],
  ...sourceModules.map(name => ['/packages/skin/src/' + name + '.js', 'packages/skin/src/' + name + '.js']),
]);

// This local-only server uses an explicit file map, never arbitrary paths or user conversations.
export function createPreviewServer({ motionDirectory, galleryDirectory } = {}) {
  const routes = new Map();
  const register = route => routes.set(route.path, route);
  registerAssets(register);
  registerGallery(register, { directory: galleryDirectory || path.join(root, 'runtime-data/gallery') });
  registerMotion(register, { directory: motionDirectory || path.join(root, 'packages/skin/motion') });
  return http.createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const route = routes.get(url.pathname);
      if (route) { route.handler(req, res); return; }
      const rel = pages.get(url.pathname);
      if (!rel || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); res.end(); return; }
      const bytes = fs.readFileSync(path.join(root, rel));
      res.writeHead(200, {
        'Content-Type': rel.endsWith('.html') ? 'text/html;charset=utf-8' : 'text/javascript;charset=utf-8',
        'Content-Length': bytes.length,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch {
      res.writeHead(500); res.end('Local preview unavailable; run npm run build first.');
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.HERTA_PREVIEW_PORT || 43240);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Invalid preview port');
  const server = createPreviewServer();
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log('Herta Atelier local preview: http://127.0.0.1:' + port));
}
