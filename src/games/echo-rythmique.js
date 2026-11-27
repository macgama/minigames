import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { PCOLORS } from '../core/players.js';

const COLS = ['#ff4fa3', '#00c2ff', '#ffd23f', '#3ddc97', '#b388ff', '#ff9f43'];

export default {
  start(ctx) {
    const R = ctx.rng, mode = ctx.mode || 'solo';
    const duel = mode === 'duel', six = mode === 'six', inverse = mode === 'inverse';
    const N = six ? 6 : 4;
    const seq = [R.int(0, N - 1)];
    let input = 0, phase = 'watch', player = 0, lives = duel ? 0 : 1, usedLife = false;
    const msg = h('div.big-msg', { style: { fontSize: 'clamp(22px,5vw,34px)', textAlign: 'center' } });
    const sub = h('p.muted', { style: { textAlign: 'center', minHeight: '1.3em' } });
    const radius = (i) => (six ? '22px' : i === 0 ? '100% 18px 18px 18px' : i === 1 ? '18px 100% 18px 18px' : i === 2 ? '18px 18px 18px 100%' : '18px 18px 100% 18px');
    const pads = Array.from({ length: N }, (_, i) => h('button', { 'aria-label': `Pad ${i + 1}`, style: { aspectRatio: '1', borderRadius: radius(i), border: 0, background: COLS[i], opacity: 0.35, transition: 'opacity .12s, transform .12s, box-shadow .12s', touchAction: 'manipulation' },
      onpointerdown: (e) => { e.preventDefault(); press(i); } }));
    const nEl = h('b', { style: { fontSize: 'clamp(28px,7vw,44px)' } }, '1');
    const ring = h('div', { style: { position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(#fff var(--p,0%), transparent 0)', opacity: 0.25 } });
    const center = h('div', { style: { position: 'absolute', left: '50%', top: '50%', width: '32%', aspectRatio: '1', transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'var(--bg)', display: 'grid', placeItems: 'center', boxShadow: '0 0 0 10px var(--bg)', pointerEvents: 'none' } }, ring, nEl);
    const board = h('div', { style: { display: 'grid', gridTemplateColumns: six ? '1fr 1fr 1fr' : '1fr 1fr', gap: '14px', width: six ? 'min(90vw,46vh,440px)' : 'min(84vw,52vh,420px)', position: 'relative' } }, pads, six ? null : center);
    const counter = six ? h('div', { style: { fontSize: '40px', fontWeight: 900 } }, nEl) : null;
    ctx.stage.append(h('div.center-stage', { style: { gap: '14px' } }, msg, counter, board, sub));
    const light = (i, ms = 260) => { const p = pads[i]; p.style.opacity = 1; p.style.transform = 'scale(.97)'; p.style.boxShadow = `0 0 50px ${COLS[i]}`; sfx.note(i + 1); setTimeout(() => { p.style.opacity = 0.35; p.style.transform = ''; p.style.boxShadow = ''; }, ms); };
    const who = () => (duel ? h('span', { style: { color: PCOLORS[player] } }, `Joueur ${player + 1}`) : null);
    const expected = () => (inverse ? [...seq].reverse() : seq);
    const hud = () => ctx.hud({ len: `${seq.length} notes`, lives: duel ? null : lives ? '💚 2e chance' : '🖤' });
    const setProg = (k) => ring.style.setProperty('--p', `${(k / seq.length) * 100}%`);

    const playSeq = async () => {
      phase = 'watch'; msg.replaceChildren(inverse ? 'Écoute… puis rejoue À L’ENVERS' : 'Écoute bien…'); sub.textContent = duel ? '' : `Séquence de ${seq.length}`;
      nEl.textContent = seq.length; hud(); setProg(0);
      await ctx.wait(600);
      // Le tempo accélère par paliers de 5 notes.
      const gap = Math.max(170, 540 - Math.floor(seq.length / 5) * 70 - seq.length * 8);
      for (const i of seq) { if (!ctx.alive) return; light(i, gap * 0.7); await ctx.wait(gap); }
      phase = 'input'; input = 0;
      msg.replaceChildren(...(duel ? [who(), ' : rejoue la séquence'] : [inverse ? 'À toi, à l’envers ↩' : 'À toi !']));
    };
    const press = (i) => {
      if (phase === 'add') { seq.push(i); light(i); phase = 'pass'; vibrate(10); player = 1 - player; msg.replaceChildren('Note ajoutée ! Passe à ', who()); nEl.textContent = seq.length; ctx.timeout(playSeq, 1300); return; }
      if (phase !== 'input') return;
      light(i, 180); vibrate(8);
      if (expected()[input] !== i) return fail();
      input++; setProg(input);
      if (input === seq.length) {
        sfx.ok();
        if (duel) { phase = 'add'; msg.replaceChildren(who(), ' : ajoute une note !'); sub.textContent = 'Touche un pad pour allonger la séquence'; return; }
        const n = seq.length;
        if (n % 5 === 0) { ctx.flash('rgba(255,255,255,.2)'); ctx.pop(`PALIER ${n} ⚡ plus vite !`, ctx.stage.clientWidth / 2, ctx.stage.clientHeight * 0.25, '#ffd23f', 28); sfx.win(); }
        seq.push(R.int(0, N - 1)); phase = 'wait'; msg.replaceChildren(n % 5 === 0 ? 'Palier !' : 'Parfait ✨'); ctx.timeout(playSeq, n % 5 === 0 ? 1300 : 800);
      }
    };
    const fail = () => {
      phase = 'over'; sfx.bad(); vibrate([60, 40, 60]); board.animate([{ transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'none' }], { duration: 250 });
      if (lives > 0) {
        lives--; usedLife = true; hud();
        msg.replaceChildren('Raté… 2e chance !'); sub.textContent = 'On réécoute la même séquence';
        return ctx.timeout(playSeq, 1300);
      }
      ctx.shake(6);
      ctx.timeout(() => {
        if (duel) return ctx.end({ emoji: '🎵', display: `Joueur ${2 - player}`, title: `Joueur ${2 - player} gagne !`, label: `Séquence record : ${seq.length} notes`, win: true, multi: true });
        const n = seq.length - 1;
        ctx.end({
          score: n, display: `${n} notes`, board: mode === 'solo' ? null : mode,
          title: n >= 15 ? 'Mémoire d’éléphant' : n >= 8 ? 'Bonne oreille' : 'Encore un effort',
          label: `Plus longue séquence répétée${inverse ? ' à l’envers' : ''}${usedLife ? '' : ' · sans 2e chance'}`,
          feats: [mode === 'solo' && n >= 20 && 'vingt', inverse && n >= 10 && 'miroir', six && n >= 12 && 'six', !usedLife && n >= 12 && 'sansfaute'].filter(Boolean),
        });
      }, 700);
    };
    ctx.on(window, 'keydown', (e) => { const k = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5 }[e.code]; if (k != null && k < N) press(k); });
    playSeq();
  },
};
