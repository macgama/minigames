import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';

const fmt = (ms) => (ms / 1000).toFixed(2).replace('.', ',');
const verdict = (d) => d === 0 ? 'PARFAIT. Légendaire.' : d <= 20 ? 'Chirurgical !' : d <= 80 ? 'Excellent' : d <= 200 ? 'Pas mal du tout' : d <= 500 ? 'Presque…' : d <= 1000 ? 'Tu peux mieux faire' : 'Ton horloge interne est en vacances';

export default {
  start(ctx) {
    const { stage } = ctx;
    let state = 'idle', t0 = 0, raf = 0;
    const time = h('div.mono', { style: { fontSize: 'clamp(64px,20vw,150px)', fontWeight: 800, letterSpacing: '-0.04em', transition: 'filter .4s, opacity .4s' } }, '0,00');
    const hint = h('p.muted', { style: { fontSize: '18px' } }, 'Touche l’écran pour lancer le chrono');
    const ring = h('button', {
      'aria-label': 'Lancer ou arrêter le chrono',
      style: { width: 'min(72vw,360px)', aspectRatio: '1', borderRadius: '50%', border: '0', display: 'grid', placeItems: 'center', color: '#fff',
        background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,.25), transparent 50%), linear-gradient(135deg,#ffb547,#ff4f4f)',
        boxShadow: '0 30px 80px rgba(255,79,79,.35), inset 0 -10px 30px rgba(0,0,0,.2)', transition: 'transform .12s' } },
      h('div', time, h('div', { style: { fontSize: '18px', fontWeight: 700, opacity: 0.85, marginTop: '-6px' } }, 'secondes')));
    stage.append(h('div.center-stage', h('div.big-msg', 'Objectif : ', h('span.grad-text', '10,00 s')), ring, hint));

    const tick = () => {
      const ms = performance.now() - t0;
      if (ms < 3000) time.textContent = fmt(ms);
      else if (time.dataset.hidden !== '1') { time.dataset.hidden = '1'; time.textContent = '?,??'; time.style.filter = 'blur(2px)'; sfx.tick(); hint.textContent = 'Chrono caché… compte dans ta tête'; }
      raf = requestAnimationFrame(tick);
    };
    const press = (e) => {
      e?.preventDefault?.();
      ring.style.transform = 'scale(.95)'; setTimeout(() => (ring.style.transform = ''), 120);
      if (state === 'idle') { state = 'run'; t0 = performance.now(); sfx.go(); vibrate(20); hint.textContent = 'Arrête à 10,00 s'; raf = requestAnimationFrame(tick); }
      else if (state === 'run') {
        state = 'done'; cancelAnimationFrame(raf);
        const ms = Math.round(performance.now() - t0); const diff = Math.abs(ms - 10000);
        time.style.filter = ''; time.textContent = fmt(ms); vibrate(40);
        diff <= 80 ? sfx.win() : sfx.pop();
        ctx.timeout(() => ctx.end({
          score: Math.round(diff / 10), lowerIsBetter: true, display: fmt(ms) + ' s', win: diff <= 50,
          title: verdict(diff), label: diff === 0 ? 'Pile à la milliseconde.' : `Écart : ${fmt(diff)} s ${ms < 10000 ? 'trop tôt' : 'trop tard'}`,
          share: `⏱️ 10 Secondes Pile : ${fmt(ms)} s (écart ${fmt(diff)} s). Tu fais mieux ?`,
        }), 900);
      }
    };
    ctx.on(ring, 'pointerdown', press);
    ctx.on(window, 'keydown', (e) => { if (e.code === 'Space' || e.code === 'Enter') press(e); });
    ctx.onCleanup(() => cancelAnimationFrame(raf));
  },
};
