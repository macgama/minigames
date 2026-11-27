import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';
import { fr } from './kit.js';

const ROUNDS = 8;

export default {
  start(ctx) {
    const mode = ctx.mode || 'classic', noisy = mode === 'brouillage';
    const R = mode === 'jour' ? makeRng('chrono-inv-' + todayKey()) : ctx.rng;
    // Durées : de 1,5–4 s au début à 5–11 s à la fin
    const durs = Array.from({ length: ROUNDS }, (_, i) => +R.float(1.5 + i * 0.5, 4 + i).toFixed(1));
    let round = 0, total = 0, streak = 0, bestStreak = 0, exact = false;
    const hist = [];
    const orb = h('div', { style: { width: 'min(46vw,220px)', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#fff3,#ff9f4322 60%,transparent)', border: '2px solid rgba(255,255,255,.12)', display: 'grid', placeItems: 'center', fontSize: '64px', transition: 'transform .1s, box-shadow .1s' } }, '⏳');
    const title = h('div.big-msg', { style: { fontSize: 'clamp(22px,5vw,32px)' } });
    const sub = h('p.muted', { style: { minHeight: '1.4em' } });
    const zone = h('div', { style: { display: 'grid', gap: '12px', justifyItems: 'center', width: 'min(92vw,420px)' } });
    const histEl = h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' } });
    ctx.stage.append(h('div.center-stage', { style: { gap: '16px' } }, title, orb, sub, zone, histEl));
    const beep = () => { sfx.go(); vibrate(25); orb.style.transform = 'scale(1.12)'; orb.style.boxShadow = '0 0 80px #ff9f43'; setTimeout(() => { orb.style.transform = ''; orb.style.boxShadow = ''; }, 180); };

    const ask = () => new Promise((res) => {
      let v = 5;
      const val = h('div', { style: { fontSize: '54px', fontWeight: 900, fontVariantNumeric: 'tabular-nums' } });
      const paint = () => (val.textContent = `${fr(v)} s`);
      const step = (d) => h('button.btn', { style: { minWidth: '62px', minHeight: '52px', fontWeight: 800 }, onclick: () => { v = Math.min(15, Math.max(0.5, +(v + d).toFixed(1))); slider.value = v; sfx.tick(); paint(); } }, `${d > 0 ? '+' : '−'}${fr(Math.abs(d))}`);
      const slider = h('input', { type: 'range', min: 0.5, max: 15, step: 0.1, value: v, style: { width: '100%' }, oninput: (e) => { v = +e.target.value; paint(); } });
      zone.replaceChildren(val, slider, h('div', { style: { display: 'flex', gap: '8px' } }, step(-1), step(-0.1), step(0.1), step(1)), h('button.btn.btn-primary.btn-lg.btn-block', { onclick: () => res(v) }, 'Valider'));
      paint();
    });

    const play = async () => {
      await ctx.wait(400);
      for (round = 0; round < ROUNDS && ctx.alive; round++) {
        ctx.hud({ round: `${round + 1}/${ROUNDS}`, pts: `${total} pts` });
        title.textContent = `Manche ${round + 1}`; sub.textContent = 'Concentre-toi…'; zone.replaceChildren(); orb.textContent = '👂';
        await ctx.wait(1100); if (!ctx.alive) return;
        const d = durs[round];
        beep(); orb.textContent = '🔔'; sub.textContent = 'Premier bip !';
        const t0 = performance.now();
        // Brouillage : tic-tac irréguliers et flashs pendant l'attente
        const noise = [];
        if (noisy) { let t = R.float(0.3, 0.8); while (t < d - 0.3) { noise.push(t); t += R.float(0.35, 1.1); } noise.forEach((t) => ctx.timeout(() => { sfx.tick(); orb.textContent = R.pick(['⏰', '🕐', '🕓', '⌛']); orb.style.transform = `rotate(${R.int(-20, 20)}deg)`; }, t * 1000)); }
        await ctx.wait(400); if (!ctx.alive) return; orb.textContent = '…'; sub.textContent = '';
        await new Promise((r) => ctx.timeout(r, d * 1000 - (performance.now() - t0)));
        if (!ctx.alive) return;
        beep(); orb.textContent = '🔔'; orb.style.transform = ''; sub.textContent = 'Deuxième bip ! Combien de temps ?';
        const guess = await ask(); if (!ctx.alive) return;
        const err = Math.abs(guess - d);
        const pts = Math.max(0, Math.round(100 - (err / d) * 250));
        total += pts; hist.push(err);
        if (err < 0.05) exact = true;
        streak = err < 0.3 ? streak + 1 : 0; bestStreak = Math.max(bestStreak, streak);
        zone.replaceChildren(h('div', { style: { fontSize: '20px' } }, `Réponse : ${fr(d)} s · toi : ${fr(guess)} s`), h('div.big-msg', { style: { fontSize: '34px', color: pts >= 80 ? 'var(--ok)' : pts >= 50 ? '#ffd23f' : 'var(--bad)' } }, `+${pts}`));
        histEl.append(h('span.chip', { style: { borderColor: pts >= 80 ? 'var(--ok)' : pts >= 50 ? '#ffd23f' : 'var(--bad)' } }, `${err < 0.05 ? '🎯' : (guess > d ? '+' : '−') + fr(err)}`));
        if (pts >= 90) { ctx.flash('rgba(61,220,151,.25)'); sfx.win(); } else pts >= 50 ? sfx.ok() : sfx.bad();
        ctx.hud({ pts: `${total} pts` });
        await ctx.wait(1700);
      }
      if (!ctx.alive) return;
      const avg = hist.reduce((a, b) => a + b, 0) / hist.length;
      ctx.end({
        score: total, display: `${total} pts`, emoji: '⏳', board: mode === 'classic' ? null : mode,
        title: total >= 700 ? 'Horloge atomique' : total >= 550 ? 'Très bon timing' : total >= 400 ? 'Pas mal du tout' : 'Le temps file…',
        label: `Écart moyen ${fr(avg, 2)} s sur ${ROUNDS} manches`,
        feats: [exact && 'pile', total >= 700 && 'horloge', bestStreak >= 5 && 'serie'].filter(Boolean),
      });
    };
    play();
  },
};
