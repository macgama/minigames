import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';

const PAINTS = [['Rouge', [0.89, 0.14, 0.17]], ['Jaune', [1, 0.86, 0.1]], ['Bleu', [0.12, 0.33, 0.85]], ['Blanc', [1, 1, 1]], ['Noir', [0.08, 0.08, 0.1]]];
const ROUNDS = 6, MAXD = 12;
// Mélange « soustractif » approché : moyenne géométrique pondérée par canal
const mix = (counts) => { const n = counts.reduce((a, b) => a + b, 0); if (!n) return [0.92, 0.92, 0.92]; return [0, 1, 2].map((c) => Math.exp(counts.reduce((s, k, i) => s + (k / n) * Math.log(Math.max(0.02, PAINTS[i][1][c])), 0))); };
const css = (c) => `rgb(${c.map((v) => Math.round(v * 255)).join(',')})`;
const lab = (c) => { const lin = c.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); const X = (lin[0] * 0.4124 + lin[1] * 0.3576 + lin[2] * 0.1805) / 0.95047, Y = lin[0] * 0.2126 + lin[1] * 0.7152 + lin[2] * 0.0722, Z = (lin[0] * 0.0193 + lin[1] * 0.1192 + lin[2] * 0.9505) / 1.08883; const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116); return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))]; };
const simil = (a, b) => { const A = lab(a), B = lab(b); const d = Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); return Math.max(0, Math.round(100 - d * 1.1)); };
const hsl = (H, S, L) => { const a = S * Math.min(L, 1 - L), f = (n) => { const k = (n + H / 30) % 12; return L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [f(0), f(8), f(4)]; };

export default {
  start(ctx) {
    const mode = ctx.mode || 'gouttes', sliders = mode === 'curseurs';
    const R = mode === 'jour' ? makeRng('couleur-' + todayKey()) : ctx.rng;
    let total = 0, r = 0, best = 0, over90 = 0, eco = false;
    const scene = h('div.center-stage', { style: { gap: '12px' } }); ctx.stage.append(scene);
    const swatch = (c, label) => h('div', { style: { flex: 1, display: 'grid', gap: '4px', justifyItems: 'center' } }, h('div', { style: { width: '100%', aspectRatio: '1', maxWidth: '170px', borderRadius: '22px', background: css(c), boxShadow: '0 10px 30px rgba(0,0,0,.35), inset 0 0 0 3px rgba(255,255,255,.15)', transition: 'background .25s' } }), h('div.faint', { style: { fontWeight: 700 } }, label));
    const target = () => {
      if (sliders) return hsl(R.float(0, 360), R.float(0.35, 0.95), R.float(0.25, 0.75));
      const counts = [0, 0, 0, 0, 0]; const n = R.int(2 + Math.min(2, r), 4 + Math.min(4, r));
      const base = R.shuffle([0, 1, 2]).slice(0, R.int(1, 2)); for (let i = 0; i < n; i++) counts[R.float(0, 1) < 0.25 ? R.int(3, 4) : R.pick(base)]++;
      return mix(counts);
    };
    const round = () => new Promise((res) => {
      const T = target();
      let counts = [0, 0, 0, 0, 0], hist = [], hv = 180, sv = 0.5, lv = 0.5;
      const cur = () => (sliders ? hsl(hv, sv, lv) : mix(counts));
      const mineBox = h('div', { style: { flex: 1 } });
      const meter = h('div', { style: { fontWeight: 800, minHeight: '22px' } });
      const ctrls = h('div', { style: { display: 'grid', gap: '8px', width: 'min(94vw,440px)' } });
      const paint = () => {
        mineBox.replaceChildren(swatch(cur(), sliders ? 'Ton mélange' : `Ton mélange · ${counts.reduce((a, b) => a + b, 0)}/${MAXD} gouttes`));
        meter.textContent = r < 2 || sliders ? `Ressemblance : ${simil(cur(), T)} %` : 'Fais confiance à ton œil 👁️';
        if (!sliders) ctrls.firstChild?.querySelectorAll('[data-i]').forEach((b) => (b.querySelector('b').textContent = counts[+b.dataset.i] || ''));
      };
      if (sliders) {
        const sl = (label, min, max, step, get, set) => h('label', { style: { display: 'grid', gap: '2px', fontWeight: 700 } }, label, h('input', { type: 'range', min, max, step, value: get(), oninput: (e) => { set(+e.target.value); paint(); } }));
        ctrls.append(sl('Teinte', 0, 360, 1, () => hv, (v) => (hv = v)), sl('Saturation', 0, 1, 0.01, () => sv, (v) => (sv = v)), sl('Luminosité', 0.05, 0.95, 0.01, () => lv, (v) => (lv = v)));
      } else {
        ctrls.append(h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '6px' } }, PAINTS.map(([name, c], i) => h('button.btn', { 'data-i': i, style: { flexDirection: 'column', minHeight: '70px', padding: '4px', gap: '2px' }, onclick: () => { if (counts.reduce((a, b) => a + b, 0) >= MAXD) return; hist.push(counts.slice()); counts[i]++; sfx.pop(); vibrate(5); paint(); } },
          h('span', { style: { width: '28px', height: '28px', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: css(c), boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.3)' } }), h('span', { style: { fontSize: '11px' } }, name), h('b', { style: { fontSize: '12px', minHeight: '14px' } })))),
          h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center' } }, h('button.btn', { onclick: () => { if (hist.length) { counts = hist.pop(); paint(); } } }, '↶ Annuler'), h('button.btn', { onclick: () => { hist.push(counts.slice()); counts = [0, 0, 0, 0, 0]; paint(); } }, '🗑️ Vider')));
      }
      scene.replaceChildren(h('div.faint', { style: { fontSize: '12px', fontWeight: 700, letterSpacing: '.1em' } }, `COULEUR ${r + 1}/${ROUNDS}`), h('div', { style: { display: 'flex', gap: '12px', width: 'min(94vw,440px)' } }, swatch(T, '🎯 Cible'), mineBox), meter, ctrls,
        h('button.btn.btn-primary.btn-lg', { onclick: () => { const s = simil(cur(), T); res({ s, drops: counts.reduce((a, b) => a + b, 0), T, C: cur() }); } }, 'Valider'));
      paint();
    });
    const run = async () => {
      for (r = 0; r < ROUNDS && ctx.alive; r++) {
        ctx.hud({ pts: `${total} pts`, round: `🎨 ${r + 1}/${ROUNDS}` });
        const { s, drops, T, C } = await round(); if (!ctx.alive) return;
        const p = Math.max(0, Math.round((s - 50) * 2)); total += p; best = Math.max(best, s); if (s >= 90) over90++; if (s >= 98 && !sliders && drops <= 6) eco = true;
        s >= 95 ? (sfx.win(), ctx.flash('rgba(61,220,151,.3)')) : s >= 80 ? sfx.ok() : sfx.bad(); vibrate(10);
        scene.replaceChildren(h('div', { style: { display: 'flex', width: 'min(80vw,320px)', height: '120px', borderRadius: '22px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,.35)' } }, h('div', { style: { flex: 1, background: css(T) } }), h('div', { style: { flex: 1, background: css(C) } })),
          h('div.big-msg', { style: { fontSize: '40px' } }, `${s} %`), h('div', { style: { fontWeight: 800, color: s >= 90 ? 'var(--ok)' : s >= 75 ? '#ffd23f' : 'var(--bad)' } }, `${s >= 98 ? 'Œil de peintre !' : s >= 90 ? 'Très proche' : s >= 75 ? 'Pas mal' : 'Ça ne se ressemble pas beaucoup'} · +${p}`));
        await ctx.wait(1700);
      }
      if (!ctx.alive) return;
      ctx.end({
        score: total, display: `${total} pts`, emoji: '🎨', board: mode === 'gouttes' ? null : mode,
        title: total >= 500 ? 'Œil de peintre' : total >= 350 ? 'Bon coloriste' : 'Un joli nuancier quand même',
        label: `${ROUNDS} couleurs · meilleure à ${best} %`,
        feats: [best >= 98 && 'pile', over90 === ROUNDS && 'artiste', eco && 'econome'].filter(Boolean),
      });
    };
    run();
  },
};
