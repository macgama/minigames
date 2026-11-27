// Génère public/data/mots.txt (dictionnaire 3-7 lettres, sans accents)
// et public/data/tirages.json (tirages de 7 lettres riches en mots).
// Source : an-array-of-french-words (MIT). Usage : node scripts/build-words.mjs
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const all = require('an-array-of-french-words');
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const set = new Set();
for (const w of all) { const n = norm(w); if (/^[a-z]{3,7}$/.test(n)) set.add(n); }
const words = [...set].sort();
writeFileSync('public/data/mots.txt', words.join('\n'));
const count = (w) => { const c = {}; for (const ch of w) c[ch] = (c[ch] || 0) + 1; return c; };
const fits = (w, pool) => { const c = count(w); for (const k in c) if ((pool[k] || 0) < c[k]) return false; return true; };
// candidats : mots de 7 lettres courants (heuristique : présents sous forme brute sans accent ni tiret)
const sevens = words.filter((w) => w.length === 7);
const rng = (() => { let s = 42; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const sample = [];
for (let i = 0; i < 2500; i++) sample.push(sevens[Math.floor(rng() * sevens.length)]);
const scored = [];
for (const base of new Set(sample)) {
  const pool = count(base);
  if (Object.keys(pool).length < 6) continue;
  const vowels = [...base].filter((c) => 'aeiouy'.includes(c)).length;
  if (vowels < 2 || vowels > 4) continue;
  let n = 0; for (const w of words) if (fits(w, pool)) n++;
  if (n >= 40) scored.push([base, n]);
}
scored.sort((a, b) => b[1] - a[1]);
const picks = scored.slice(0, 365).map(([w]) => w);
writeFileSync('public/data/tirages.json', JSON.stringify(picks));
console.log(words.length, 'mots ;', picks.length, 'tirages', scored.slice(0, 5));
