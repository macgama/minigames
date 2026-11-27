// Génère les contours pour Carte Mentale (source : world-atlas / Natural Earth, domaine public).
import { readFileSync, writeFileSync } from 'node:fs';
import { feature } from 'topojson-client';
const load = (f) => JSON.parse(readFileSync(new URL(`../node_modules/world-atlas/${f}`, import.meta.url)));
const rings = (geo) => (geo.type === 'Polygon' ? geo.coordinates : geo.type === 'MultiPolygon' ? geo.coordinates.flat() : []);
const round = (r, d) => r.map(([x, y]) => [+x.toFixed(d), +y.toFixed(d)]);
const inBox = (r, [w, s, e, n]) => r.some(([x, y]) => x >= w && x <= e && y >= s && y <= n);
const simplify = (r, eps) => { const out = [r[0]]; for (const p of r) { const q = out[out.length - 1]; if (Math.hypot(p[0] - q[0], p[1] - q[1]) >= eps) out.push(p); } return out; };
const out = {};
const land110 = feature(load('land-110m.json'), load('land-110m.json').objects.land);
out.monde = { box: [-170, -58, 180, 80], rings: land110.features.flatMap((f) => rings(f.geometry)).map((r) => round(simplify(r, 0.6), 1)).filter((r) => r.length > 3) };
const c50 = load('countries-50m.json'); const countries = feature(c50, c50.objects.countries).features;
const EU = [-11, 34, 35, 61];
out.europe = { box: EU, rings: countries.flatMap((f) => rings(f.geometry)).filter((r) => inBox(r, EU)).map((r) => round(simplify(r, 0.12), 2)).filter((r) => r.length > 3) };
const CH = [5.7, 45.6, 10.7, 48.0];
out.suisse = { box: CH, rings: countries.flatMap((f) => rings(f.geometry).map((r) => ({ r, ch: f.properties.name === 'Switzerland' }))).filter(({ r }) => inBox(r, [4.5, 45, 12, 48.8])).map(({ r, ch }) => ({ ch, r: round(simplify(r, 0.01), 3) })) };
writeFileSync(new URL('../public/data/cartes.json', import.meta.url), JSON.stringify(out));
console.log('cartes.json', JSON.stringify(out).length, 'octets');
