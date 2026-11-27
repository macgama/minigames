import { defineConfig } from 'vite';
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

/** Génère dist/sw.js avec la liste de tous les fichiers à mettre en cache (jeu 100 % hors ligne). */
function serviceWorker() {
  let outDir;
  return {
    name: 'manigames-sw',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const files = [];
      const walk = (d) => readdirSync(d).forEach((f) => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(relative(outDir, p).split('\\').join('/')); });
      walk(outDir);
      const precache = files.filter((f) => !/(\.htaccess|sw\.js|og\.png)$/.test(f)).map((f) => (f === 'index.html' ? './' : f));
      const version = createHash('sha1').update(precache.join()).update(String(Date.now())).digest('hex').slice(0, 10);
      writeFileSync(join(outDir, 'sw.js'), `// Généré au build — ne pas éditer.
const CACHE = 'manigames-${version}';
const PRECACHE = ${JSON.stringify(precache)};
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') { e.respondWith(fetch(req).catch(() => caches.match('./', { ignoreVary: true }))); return; }
  e.respondWith(caches.match(req, { ignoreVary: true }).then((hit) => hit || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })));
});
`);
    },
  };
}

export default defineConfig({
  base: './', // chemins relatifs : marche à la racine (Infomaniak) comme dans un sous-dossier
  build: { target: 'es2020', assetsInlineLimit: 0 },
  plugins: [serviceWorker()],
});
