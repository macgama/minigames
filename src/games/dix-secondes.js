import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { store } from '../core/store.js';
import { playerSetup } from '../core/players.js';

const fmt = (ms) => (ms / 1000).toFixed(2).replace('.', ',');
const verdict = (d) => d < 5 ? 'PILE ! Légendaire.' : d <= 20 ? 'Chirurgical !' : d <= 60 ? 'Excellent' : d <= 150 ? 'Très bien' : d <= 400 ? 'Presque…' : d <= 1000 ? 'Tu peux mieux faire' : 'Ton horloge interne est en vacances';

/**
 * Un essai : affiche le cadran, résout avec le temps mesuré (ms).
 * visibleMs : durée pendant laquelle le chrono reste visible.
 */
function attempt(ctx, host, { target, visibleMs, title, sub }) {
  return new Promise((resolve) => {
    let state = 'idle', t0 = 0, raf = 0, lastSec = 0;
    const time = h('div.mono', { style: { fontSize: 'clamp(64px,19vw,140px)', fontWeight: 800, letterSpacing: '-0.04em', transition: 'filter .4s' } }, '0,00');
    const hint = h('p.muted', { style: { fontSize: '18px', minHeight: '1.6em' } }, 'Touche le cadran pour lancer le chrono');
    const arc = h('div', { style: { position: 'absolute', inset: '-10px', borderRadius: '50%', background: `conic-gradient(rgba(255,255,255,.85) 0deg, transparent 0deg)`, mask: 'radial-gradient(circle, transparent 66%, #000 67%)', WebkitMask: 'radial-gradient(circle, transparent 66%, #000 67%)', transition: 'opacity .4s' } });
    const ring = h('button', { 'aria-label': 'Lancer ou arrêter le chrono',
      style: { position: 'relative', width: 'min(70vw,44vh,340px)', aspectRatio: '1', borderRadius: '50%', border: '0', display: 'grid', placeItems: 'center', color: '#fff', touchAction: 'manipulation',
        background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,.25), transparent 50%), linear-gradient(135deg,#ffb547,#ff4f4f)',
        boxShadow: '0 30px 80px rgba(255,79,79,.35), inset 0 -10px 30px rgba(0,0,0,.2)', transition: 'transform .12s' } },
      arc, h('div', time, h('div', { style: { fontSize: '16px', fontWeight: 700, opacity: 0.85, marginTop: '-4px' } }, 'secondes')));
    host.replaceChildren(h('div.center-stage', { style: { gap: '16px' } },
      sub && h('p.faint', { style: { fontWeight: 700, letterSpacing: '.12em', fontSize: '12px', textTransform: 'uppercase' } }, sub),
      h('div.big-msg', title, h('span.grad-text', `${fmt(target)} s`)), ring, hint));
    const tick = () => {
      const ms = performance.now() - t0;
      if (ms < visibleMs) { time.textContent = fmt(ms); arc.style.background = `conic-gradient(rgba(255,255,255,.85) ${(ms / target) * 360}deg, transparent 0deg)`; }
      else if (time.dataset.hidden !== '1') { time.dataset.hidden = '1'; time.textContent = '?,??'; time.style.filter = 'blur(3px)'; arc.style.opacity = '0'; sfx.tick(); hint.textContent = 'Chrono caché… compte dans ta tête'; }
      const sec = Math.floor(ms / 1000); if (sec !== lastSec && ms < visibleMs) { lastSec = sec; sfx.tick(); }
      raf = requestAnimationFrame(tick);
    };
    const press = (e) => {
      e?.preventDefault?.();
      ring.style.transform = 'scale(.95)'; setTimeout(() => (ring.style.transform = ''), 120);
      if (state === 'idle') { state = 'run'; t0 = performance.now(); sfx.go(); vibrate(20); hint.textContent = `Arrête à ${fmt(target)} s`; if (visibleMs <= 0) { time.dataset.hidden = '1'; time.textContent = '?,??'; time.style.filter = 'blur(3px)'; arc.style.opacity = '0'; } raf = requestAnimationFrame(tick); }
      else if (state === 'run') {
        state = 'done'; cancelAnimationFrame(raf);
        const ms = Math.round(performance.now() - t0); const diff = Math.abs(ms - target);
        time.style.filter = ''; arc.style.opacity = '1'; arc.style.background = `conic-gradient(${diff < 60 ? '#3ddc97' : '#fff'} ${(Math.min(ms, target * 1.5) / target) * 360}deg, transparent 0deg)`;
        // Révélation : le compteur défile jusqu'à la valeur
        const tStart = performance.now();
        const roll = () => { const p = Math.min(1, (performance.now() - tStart) / 600); time.textContent = fmt(ms * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(roll); };
        roll();
        hint.replaceChildren(h('b', { style: { color: diff < 60 ? 'var(--ok)' : diff < 300 ? 'var(--warn)' : 'var(--bad)' } }, diff < 5 ? 'PILE !' : `${ms < target ? '−' : '+'}${fmt(diff)} s`), ` · ${verdict(diff)}`);
        vibrate(diff < 20 ? [30, 40, 30, 40, 80] : 40); diff <= 60 ? sfx.win() : sfx.pop();
        ctx.onCleanup(() => cancelAnimationFrame(raf));
        ctx.timeout(() => resolve(ms), 1300);
      }
    };
    ctx.on(ring, 'pointerdown', press);
    const key = (e) => { if (e.code === 'Space' || e.code === 'Enter') press(e); };
    ctx.on(window, 'keydown', key);
    ctx.onCleanup(() => cancelAnimationFrame(raf));
  });
}

function historyLine(key, val) {
  const hist = store.get(key, []); hist.push(val); while (hist.length > 12) hist.shift(); store.set(key, hist);
  const max = Math.max(...hist, 1);
  return h('div', { style: { display: 'grid', gap: '6px' } },
    h('small.faint', `Tes ${hist.length} derniers écarts (plus bas = mieux)`),
    h('div', { style: { display: 'flex', alignItems: 'flex-end', gap: '4px', height: '48px', justifyContent: 'center' } },
      hist.map((v, i) => h('span', { title: fmt(v) + ' s', style: { width: '14px', height: Math.max(4, (v / max) * 48) + 'px', borderRadius: '4px', background: i === hist.length - 1 ? 'var(--brand-3)' : v <= 60 ? 'var(--ok)' : 'rgba(255,255,255,.25)' } }))));
}

export default {
  async start(ctx) {
    const host = h('div'); ctx.stage.append(host);
    const mode = ctx.mode || 'classic';
    if (mode === 'classic' || mode === 'aveugle') {
      const blind = mode === 'aveugle';
      const ms = await attempt(ctx, host, { target: 10000, visibleMs: blind ? 0 : 3000, title: 'Objectif : ', sub: blind ? 'Mode aveugle : rien n’est affiché' : null });
      if (!ctx.alive) return;
      const diff = Math.abs(ms - 10000), cs = Math.round(diff / 10);
      return ctx.end({
        score: cs, board: blind ? 'aveugle' : null, display: fmt(ms) + ' s', win: diff <= 50,
        title: verdict(diff), label: diff < 5 ? 'Pile à la milliseconde.' : `Écart : ${fmt(diff)} s ${ms < 10000 ? 'trop tôt' : 'trop tard'}`,
        feats: [cs === 0 && 'pile', blind && cs <= 5 && 'aveugle', !blind && cs <= 3 && 'sniper'].filter(Boolean),
        extra: historyLine('hist:10s:' + mode, cs * 10),
      });
    }
    if (mode === 'serie') {
      const targets = Array.from({ length: 5 }, () => ctx.rng.int(30, 150) * 100);
      let total = 0; const parts = [];
      for (let i = 0; i < targets.length; i++) {
        ctx.hud({ round: `${i + 1}/5`, err: `Écart ${fmt(total)} s` });
        const ms = await attempt(ctx, host, { target: targets[i], visibleMs: Math.min(2000, targets[i] * 0.3), title: 'Cible : ', sub: `Cible ${i + 1} sur 5` });
        if (!ctx.alive) return;
        const d = Math.abs(ms - targets[i]); total += d; parts.push(d);
      }
      const cs = Math.round(total / 10);
      return ctx.end({ score: cs, board: 'serie', display: fmt(total) + ' s', title: cs <= 30 ? 'Métronome humain' : cs <= 100 ? 'Belle régularité' : 'Rythme à travailler', label: 'Écart total sur 5 cibles (3 à 15 s)',
        feats: parts.every((d) => d <= 100) ? ['serie'] : [], extra: h('div.btn-row', parts.map((d, i) => h('span.chip', `${fmt(targets[i])} → ±${fmt(d)}`))) });
    }
    // Tour de table : chacun son essai, classement final
    const players = await playerSetup(ctx.stage, { min: 2, max: 8, title: 'Qui joue ?', cta: 'Au premier !' });
    if (!ctx.alive) return;
    const scores = [];
    for (const p of players) {
      await new Promise((res) => host.replaceChildren(h('div.center-stage', h('div.card', h('div.tile', { style: { background: p.color } }, p.emoji), h('h2', `À ${p.name} !`), h('p.muted', 'Les autres regardent… et se taisent.'), h('button.btn.btn-primary.btn-lg.btn-block', { onclick: res }, 'Je suis prêt·e')))));
      if (!ctx.alive) return;
      const ms = await attempt(ctx, host, { target: 10000, visibleMs: 3000, title: `${p.emoji} ${p.name} : `, sub: 'Tour de table' });
      if (!ctx.alive) return;
      scores.push({ p, ms, d: Math.abs(ms - 10000) });
    }
    scores.sort((a, b) => a.d - b.d);
    ctx.end({ multi: true, emoji: '🏆', title: `${scores[0].p.name} gagne !`, display: `${fmt(scores[0].ms)} s`, win: true, label: 'Le plus proche de 10,00 s',
      extra: h('div', { style: { display: 'grid', gap: '6px' } }, scores.map((s, i) => h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '8px 12px', borderRadius: '12px', background: i ? 'rgba(255,255,255,.04)' : 'rgba(255,200,87,.15)' } }, h('b', `${i + 1}. ${s.p.emoji} ${s.p.name}`), h('span.mono', `${fmt(s.ms)} s (±${fmt(s.d)})`)))) });
  },
};
