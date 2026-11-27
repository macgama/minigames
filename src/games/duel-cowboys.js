import { h } from '../core/dom.js';
import { sfx, vibrate, tone } from '../core/sfx.js';

const FAKES = ['PAF', 'PIN', 'PAS', 'BAN', '🌵', 'PFF', 'PANG ?'];

export default {
  start(ctx) {
    const mode = ctx.mode || 'duo', bot = mode === 'bot', piege = mode === 'piege', R = ctx.rng;
    const names = bot ? ['Toi', 'Le shérif'] : ['Joueur bas', 'Joueur haut'];
    const wins = [0, 0];
    let state = 'idle', drawAt = 0, best = Infinity, early = 0, roundN = 0, botTimer = null;
    const half = (k) => h('div', { style: { flex: 1, display: 'grid', placeItems: 'center', position: 'relative', touchAction: 'none', transform: k === 1 ? 'rotate(180deg)' : '', background: k === 1 ? 'linear-gradient(0deg,rgba(255,92,122,.12),transparent)' : 'linear-gradient(180deg,rgba(76,201,240,.12),transparent)' } });
    const H = [half(0), half(1)];
    const info = [h('div', { style: { textAlign: 'center' } }), h('div', { style: { textAlign: 'center' } })];
    H.forEach((el, k) => el.append(info[k]));
    const sign = h('div', { style: { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', fontSize: 'clamp(40px,14vw,84px)', fontWeight: 900, zIndex: 3, pointerEvents: 'none', textShadow: '0 6px 0 rgba(0,0,0,.35)', whiteSpace: 'nowrap' } });
    const wrap = h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column-reverse' } }, H[0], h('div', { style: { height: '4px', background: 'repeating-linear-gradient(90deg,#c8762c 0 12px,transparent 12px 20px)' } }), H[1], sign);
    ctx.stage.append(wrap);
    const paint = (k, big, sub) => info[k].replaceChildren(h('div', { style: { fontSize: '56px' } }, k === 0 ? '🤠' : bot ? '⭐' : '🤠'), h('div', { style: { fontWeight: 900, fontSize: '22px' } }, big), h('div.faint', sub || `${names[k]} · ${wins[k]} manche${wins[k] > 1 ? 's' : ''}`));
    const say = (t, c = '#fff', anim = true) => { sign.textContent = t; sign.style.color = c; if (anim) sign.animate([{ transform: 'translate(-50%,-50%) scale(1.6)' }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: 220 }); };
    const hud = () => ctx.hud({ score: `${wins[0]} – ${wins[1]}` });

    const round = async () => {
      roundN++; state = 'ready'; say('Prêts ?', '#ffd23f');
      [0, 1].forEach((k) => paint(k, 'Pose ton doigt…', null));
      if (bot) paint(1, 'Le shérif attend', null);
      await ctx.wait(1100); if (!ctx.alive || state !== 'ready') return;
      state = 'wait'; say('…', '#fff');
      const delay = R.float(1.4, 4.2);
      // Faux signaux en mode Piège
      if (piege) { let t = 0.5; while (t < delay - 0.4) { const at = t; ctx.timeout(() => { if (state === 'wait') { say(R.pick(FAKES), '#ff9f43'); tone(300, 0.08, { type: 'square', vol: 0.08 }); } }, at * 1000); t += R.float(0.5, 1.2); } }
      ctx.timeout(() => {
        if (state !== 'wait') return;
        state = 'draw'; drawAt = performance.now(); say('PAN !', '#ff3d5a'); sfx.go(); vibrate(30); ctx.flash('rgba(255,255,255,.35)');
        if (bot) { const react = Math.max(190, 400 - roundN * 18 - wins[0] * 25 + R.float(-50, 80)); botTimer = ctx.timeout(() => shoot(1), react); }
      }, delay * 1000);
    };
    const shoot = (k) => {
      if (state === 'wait' || state === 'ready') {
        // Trop tôt !
        if (k === 0) early++;
        state = 'over'; wins[1 - k]++; sfx.bad(); vibrate([50, 30, 50]); ctx.shake(8);
        say('Trop tôt !', '#ff5c7a'); paint(k, '💥 Trop tôt', `${names[k]} · ${wins[k]}`); paint(1 - k, '🏆 Manche gagnée', `${names[1 - k]} · ${wins[1 - k]}`);
        return next();
      }
      if (state !== 'draw') return;
      state = 'over'; const ms = Math.round(performance.now() - drawAt);
      if (k === 0) best = Math.min(best, ms);
      wins[k]++; tone(140, 0.25, { type: 'sawtooth', vol: 0.2, slide: -80 }); ctx.shake(6); vibrate(40);
      say(`${ms} ms`, k === 0 ? '#4cc9f0' : '#ff5c7a');
      paint(k, `🏆 ${ms} ms`, `${names[k]} · ${wins[k]}`); paint(1 - k, '💀 Touché', `${names[1 - k]} · ${wins[1 - k]}`);
      next();
    };
    const next = async () => {
      hud(); await ctx.wait(1800); if (!ctx.alive) return;
      if (wins[0] >= 3 || wins[1] >= 3) return finish();
      round();
    };
    H.forEach((el, k) => el.addEventListener('pointerdown', (e) => { e.preventDefault(); if (bot && k === 1) return; shoot(k); }));
    ctx.on(window, 'keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); shoot(0); } if (!bot && e.key === 'Enter') shoot(1); });
    const finish = () => {
      const w = wins[0] > wins[1] ? 0 : 1;
      if (!bot) return ctx.end({ multi: true, win: true, emoji: '🤠', display: `${wins[0]} – ${wins[1]}`, title: `${names[w]} est le plus rapide !`, label: best < Infinity ? `Réaction la plus rapide du bas : ${best} ms` : 'Premier à 3 manches' });
      const score = w === 0 ? (wins[0] - wins[1]) * 100 + Math.max(0, Math.round(400 - best)) : 0;
      ctx.end({
        score, record: true, win: w === 0, emoji: w === 0 ? '🤠' : '⭐', display: `${wins[0]} – ${wins[1]}`,
        title: w === 0 ? (wins[1] === 0 ? 'Nouveau shérif en ville' : 'Plus rapide que le shérif') : 'Le shérif a dégainé avant toi',
        label: best < Infinity ? `Meilleure réaction : ${best} ms` : 'Aucun tir réussi',
        feats: [best < 250 && 'eclair', w === 0 && early === 0 && 'sangfroid', w === 0 && wins[1] === 0 && 'sherif'].filter(Boolean),
      });
    };
    hud(); round();
  },
};
