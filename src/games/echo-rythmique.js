import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { rng } from '../core/rng.js';
import { PCOLORS } from '../core/players.js';

const PADS = [{ c: '#ff4fa3', f: 0 }, { c: '#00c2ff', f: 1 }, { c: '#ffd23f', f: 2 }, { c: '#3ddc97', f: 3 }];

export default {
  start(ctx) {
    const duel = ctx.mode === 'duel';
    const seq = [rng.int(0, 3)];
    let input = 0, phase = 'watch', player = 0;
    const msg = h('div.big-msg', { style: { fontSize: 'clamp(22px,5vw,34px)' } });
    const sub = h('p.muted');
    const pads = PADS.map((p, i) => h('button', { 'aria-label': `Pad ${i + 1}`, style: { aspectRatio: '1', borderRadius: i === 0 ? '100% 18px 18px 18px' : i === 1 ? '18px 100% 18px 18px' : i === 2 ? '18px 18px 18px 100%' : '18px 18px 100% 18px', border: 0, background: p.c, opacity: 0.35, transition: 'opacity .12s, transform .12s, box-shadow .12s', touchAction: 'manipulation' },
      onpointerdown: (e) => { e.preventDefault(); press(i); } }));
    const board = h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', width: 'min(84vw,52vh,420px)', position: 'relative' } }, pads,
      h('div', { style: { position: 'absolute', left: '50%', top: '50%', width: '32%', aspectRatio: '1', transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'var(--bg)', display: 'grid', placeItems: 'center', boxShadow: '0 0 0 10px var(--bg)', pointerEvents: 'none' } }, h('b', { id: 'echo-n', style: { fontSize: 'clamp(28px,7vw,44px)' } }, '1')));
    ctx.stage.append(h('div.center-stage', msg, board, sub));
    const nEl = board.querySelector('#echo-n');
    const flash = (i, ms = 260) => { const p = pads[i]; p.style.opacity = 1; p.style.transform = 'scale(.97)'; p.style.boxShadow = `0 0 50px ${PADS[i].c}`; sfx.note(PADS[i].f + 1); setTimeout(() => { p.style.opacity = 0.35; p.style.transform = ''; p.style.boxShadow = ''; }, ms); };
    const who = () => (duel ? h('span', { style: { color: PCOLORS[player] } }, `Joueur ${player + 1}`) : null);

    const playSeq = async () => {
      phase = 'watch'; msg.replaceChildren('Écoute bien…'); sub.textContent = duel ? '' : `Séquence de ${seq.length}`;
      nEl.textContent = seq.length; ctx.hud({ len: `${seq.length} notes` });
      await ctx.wait(600);
      const gap = Math.max(180, 520 - seq.length * 22);
      for (const i of seq) { if (!ctx.alive) return; flash(i, gap * 0.7); await ctx.wait(gap); }
      phase = 'input'; input = 0;
      msg.replaceChildren(...(duel ? [who(), ' : rejoue la séquence'] : ['À toi !']));
    };
    const press = (i) => {
      if (phase === 'add') { seq.push(i); flash(i); phase = 'pass'; vibrate(10); player = 1 - player; msg.replaceChildren('Note ajoutée ! Passe à ', who()); nEl.textContent = seq.length; ctx.timeout(playSeq, 1300); return; }
      if (phase !== 'input') return;
      flash(i, 180); vibrate(8);
      if (seq[input] !== i) return fail();
      input++;
      if (input === seq.length) {
        sfx.ok();
        if (duel) { phase = 'add'; msg.replaceChildren(who(), ' : ajoute une note !'); sub.textContent = 'Touche un pad pour allonger la séquence'; }
        else { seq.push(rng.int(0, 3)); phase = 'wait'; msg.replaceChildren('Parfait ✨'); ctx.timeout(playSeq, 800); }
      }
    };
    const fail = () => {
      phase = 'over'; sfx.bad(); vibrate([60, 40, 60]); board.classList.add('anim-shake');
      ctx.timeout(() => {
        if (duel) return ctx.end({ emoji: '🎵', display: `Joueur ${2 - player}`, title: `Joueur ${2 - player} gagne !`, label: `Séquence record : ${seq.length} notes`, win: true });
        const n = seq.length - 1;
        ctx.end({ score: n, display: `${n} notes`, title: n >= 12 ? 'Mémoire d’éléphant' : n >= 7 ? 'Bonne oreille' : 'Encore un effort', label: 'Plus longue séquence répétée', share: `🎵 Écho Rythmique : ${n} notes de suite. Ta mémoire fait mieux ?` });
      }, 700);
    };
    ctx.on(window, 'keydown', (e) => { const k = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, KeyQ: 0, KeyW: 1, KeyA: 2, KeyS: 3 }[e.code]; if (k != null) press(k); });
    playSeq();
  },
};
