import { h } from '../core/dom.js';
import { createCanvas } from '../core/canvas.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';

const CITIES = {
  monde: [['Lima', -12.05, -77.04], ['Tokyo', 35.68, 139.69], ['Le Caire', 30.04, 31.24], ['Sydney', -33.87, 151.21], ['New York', 40.71, -74.01], ['Rio de Janeiro', -22.91, -43.17], ['Moscou', 55.76, 37.62], ['Mumbai', 19.08, 72.88], ['Le Cap', -33.92, 18.42], ['Mexico', 19.43, -99.13], ['Pékin', 39.9, 116.41], ['Buenos Aires', -34.6, -58.38], ['Nairobi', -1.29, 36.82], ['Los Angeles', 34.05, -118.24], ['Bangkok', 13.76, 100.5], ['Reykjavik', 64.15, -21.94], ['Dakar', 14.72, -17.47], ['Santiago du Chili', -33.45, -70.67], ['Singapour', 1.35, 103.82], ['Vancouver', 49.28, -123.12], ['Istanbul', 41.01, 28.98], ['Lagos', 6.52, 3.38], ['Téhéran', 35.69, 51.39], ['Anchorage', 61.22, -149.9], ['Honolulu', 21.31, -157.86], ['Auckland', -36.85, 174.76], ['Bogota', 4.71, -74.07], ['Montréal', 45.5, -73.57], ['Séoul', 37.57, 126.98], ['Jakarta', -6.21, 106.85], ['Dubaï', 25.2, 55.27], ['Addis-Abeba', 9.03, 38.74]],
  europe: [['Paris', 48.86, 2.35], ['Berlin', 52.52, 13.4], ['Madrid', 40.42, -3.7], ['Rome', 41.9, 12.5], ['Lisbonne', 38.72, -9.14], ['Varsovie', 52.23, 21.01], ['Vienne', 48.21, 16.37], ['Prague', 50.08, 14.44], ['Budapest', 47.5, 19.04], ['Amsterdam', 52.37, 4.9], ['Bruxelles', 50.85, 4.35], ['Copenhague', 55.68, 12.57], ['Stockholm', 59.33, 18.07], ['Oslo', 59.91, 10.75], ['Dublin', 53.35, -6.26], ['Londres', 51.51, -0.13], ['Athènes', 37.98, 23.73], ['Bucarest', 44.43, 26.1], ['Kiev', 50.45, 30.52], ['Belgrade', 44.79, 20.45], ['Marseille', 43.3, 5.37], ['Barcelone', 41.39, 2.17], ['Munich', 48.14, 11.58], ['Milan', 45.46, 9.19], ['Édimbourg', 55.95, -3.19], ['Naples', 40.85, 14.27], ['Séville', 37.39, -5.98], ['Zagreb', 45.81, 15.98], ['Riga', 56.95, 24.11], ['Sofia', 42.7, 23.32], ['Bordeaux', 44.84, -0.58], ['Porto', 41.15, -8.61], ['Lyon', 45.76, 4.84], ['Hambourg', 53.55, 9.99], ['Cracovie', 50.06, 19.94], ['Venise', 45.44, 12.32], ['Helsinki', 60.17, 24.94]],
  suisse: [['Genève', 46.2, 6.14], ['Lausanne', 46.52, 6.63], ['Berne', 46.95, 7.45], ['Zurich', 47.37, 8.54], ['Bâle', 47.56, 7.59], ['Lugano', 46.0, 8.95], ['Lucerne', 47.05, 8.31], ['Saint-Gall', 47.42, 9.37], ['Sion', 46.23, 7.36], ['Neuchâtel', 46.99, 6.93], ['Fribourg', 46.8, 7.15], ['Coire', 46.85, 9.53], ['Zermatt', 46.02, 7.75], ['Interlaken', 46.69, 7.86], ['Locarno', 46.17, 8.8], ['Montreux', 46.43, 6.91], ['Schaffhouse', 47.7, 8.63], ['Davos', 46.8, 9.84], ['Saint-Moritz', 46.5, 9.84], ['Delémont', 47.36, 7.34], ['Bellinzone', 46.19, 9.02], ['Aarau', 47.39, 8.04], ['Thoune', 46.76, 7.63], ['Martigny', 46.1, 7.07], ['Yverdon-les-Bains', 46.78, 6.64], ['La Chaux-de-Fonds', 47.1, 6.83], ['Winterthour', 47.5, 8.72], ['Zoug', 47.17, 8.52], ['Grindelwald', 46.62, 8.04], ['Verbier', 46.1, 7.23]],
};
const SCALE = { monde: 1500, europe: 350, suisse: 30 };
const ROUNDS = 8;
const km = (a, b) => { const r = Math.PI / 180, dl = (b[1] - a[1]) * r, dp = (b[0] - a[0]) * r; const x = Math.sin(dp / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dl / 2) ** 2; return 6371 * 2 * Math.asin(Math.sqrt(x)); };
let mapsP = null;

export default {
  async start(ctx) {
    const mode = ['europe', 'suisse', 'jour'].includes(ctx.mode) ? ctx.mode : 'monde';
    const region = mode === 'jour' ? 'monde' : mode;
    const R = mode === 'jour' ? makeRng('carte-' + todayKey()) : ctx.rng;
    const loading = h('div.center-stage', h('p.muted', 'Chargement de la carte…')); ctx.stage.append(loading);
    let maps; try { maps = await (mapsP ||= fetch('data/cartes.json').then((r) => r.json())); } catch { loading.replaceChildren(h('p', 'Carte indisponible hors ligne. Recharge la page en ligne une fois.')); return; }
    if (!ctx.alive) return; loading.remove();
    const M = maps[region];
    const view = createCanvas(ctx.stage, { onResize: () => draw() }); ctx.onCleanup(view.destroy);
    const { g } = view;
    const label = h('div', { style: { position: 'absolute', top: '10px', left: 0, right: 0, textAlign: 'center', zIndex: 3, pointerEvents: 'none' } });
    const next = h('button.btn.btn-primary.btn-lg', { style: { position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 3, display: 'none' } }, 'Ville suivante');
    ctx.stage.append(label, next);
    const [W, S, E, N] = M.box; const lat0 = (S + N) / 2; const kx = Math.cos((lat0 * Math.PI) / 180) * (region === 'monde' ? 1 / Math.cos((lat0 * Math.PI) / 180) : 1);
    const geo = () => { const ww = (E - W) * kx, hh = N - S; const top = 70, bot = 80; const s = Math.min((view.w - 16) / ww, (view.h - top - bot) / hh); return { s, ox: (view.w - ww * s) / 2, oy: top + (view.h - top - bot - hh * s) / 2 }; };
    const toXY = (lat, lon) => { const { s, ox, oy } = geo(); return [ox + (lon - W) * kx * s, oy + (N - lat) * s]; };
    const toLL = (x, y) => { const { s, ox, oy } = geo(); return [N - (y - oy) / s, W + (x - ox) / (kx * s)]; };
    const cities = R.shuffle(CITIES[region]).slice(0, ROUNDS);
    let round = 0, total = 0, guess = null, phase = 'ask', t0 = 0, best = Infinity;
    function draw() {
      g.fillStyle = '#0d2a4a'; g.fillRect(0, 0, view.w, view.h);
      const rings = region === 'suisse' ? M.rings : M.rings.map((r) => ({ r, ch: true }));
      for (const { r, ch } of rings) {
        g.beginPath(); r.forEach(([lon, lat], i) => { const [x, y] = toXY(lat, lon); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath();
        g.fillStyle = ch ? '#2f8f6a' : '#24574a'; g.fill(); g.strokeStyle = region === 'monde' ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.35)'; g.lineWidth = region === 'suisse' && ch ? 2 : 0.8; g.stroke();
      }
      if (phase === 'result') {
        const c = cities[round]; const [tx, ty] = toXY(c[1], c[2]); const [gx, gy] = toXY(guess[0], guess[1]);
        g.strokeStyle = '#ffd23f'; g.setLineDash([6, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(gx, gy); g.lineTo(tx, ty); g.stroke(); g.setLineDash([]);
        g.fillStyle = '#ff5c7a'; g.beginPath(); g.arc(gx, gy, 7, 0, 7); g.fill();
        g.font = '26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText('⭐', tx, ty + 12);
      }
    }
    const ask = () => {
      phase = 'ask'; guess = null; next.style.display = 'none';
      const c = cities[round];
      label.replaceChildren(h('div.faint', { style: { fontSize: '12px', fontWeight: 700, letterSpacing: '.1em' } }, `VILLE ${round + 1}/${ROUNDS}`), h('div.big-msg', { style: { fontSize: 'clamp(24px,6vw,36px)' } }, `📍 ${c[0]}`));
      ctx.hud({ pts: `${total} pts` }); t0 = performance.now(); draw(); sfx.count();
    };
    ctx.on(view.canvas, 'pointerdown', (e) => {
      if (phase !== 'ask') return;
      const p = view.pos(e); guess = toLL(p.x, p.y);
      const c = cities[round]; const d = km([c[1], c[2]], guess); best = Math.min(best, d);
      const sec = (performance.now() - t0) / 1000;
      const base = Math.round(1000 * Math.exp(-d / SCALE[region])); const speed = base > 200 ? Math.round(Math.max(0, 100 - sec * 12)) : 0;
      total += base + speed; phase = 'result'; draw();
      label.replaceChildren(h('div.big-msg', { style: { fontSize: '26px' } }, `${c[0]} : ${d < 10 ? d.toFixed(1).replace('.', ',') : Math.round(d).toLocaleString('fr-CH')} km`), h('div', { style: { fontWeight: 800, color: base >= 700 ? 'var(--ok)' : base >= 300 ? '#ffd23f' : 'var(--bad)' } }, `+${base}${speed ? ` · rapide +${speed}` : ''}`));
      base >= 800 ? (sfx.win(), ctx.flash('rgba(61,220,151,.2)')) : base >= 300 ? sfx.ok() : sfx.bad(); vibrate(15);
      ctx.hud({ pts: `${total} pts` });
      next.style.display = ''; next.textContent = round < ROUNDS - 1 ? 'Ville suivante' : 'Résultats';
    });
    next.onclick = () => { round++; if (round < ROUNDS) ask(); else finish(); };
    const finish = () => ctx.end({
      score: total, display: `${total} pts`, emoji: '🗺️', board: region === 'monde' && mode !== 'jour' ? null : mode,
      title: total >= 6000 ? 'GPS humain' : total >= 4000 ? 'Bon sens de l’orientation' : 'Un atlas pour Noël ?',
      label: `${ROUNDS} villes · meilleure : ${best < 10 ? best.toFixed(1).replace('.', ',') : Math.round(best)} km`,
      feats: [best < 25 && 'gps', region === 'monde' && total >= 6000 && 'globe', region === 'suisse' && total >= 6500 && 'helvete'].filter(Boolean),
    });
    ask();
  },
};
