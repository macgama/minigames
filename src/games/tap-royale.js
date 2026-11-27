import { h, sleep } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { rng } from '../core/rng.js';

const COLORS = [['ROUGE', '#ff3d5a'], ['BLEU', '#3a8bff'], ['VERT', '#2ecc71'], ['JAUNE', '#ffd23f']];
const CHALLENGES = ['green', 'target', 'stroop', 'mash', 'green', 'target', 'stroop'];

export default {
  start(ctx) {
    const { stage } = ctx;
    // 99 adversaires simulés avec un niveau propre
    const bots = Array.from({ length: 99 }, () => ({ skill: rng.float(0.75, 1.35), alive: true }));
    let round = 0, alive = 100, eliminatedAt = 0;
    const dots = h('div', { 'aria-hidden': 'true', style: { display: 'grid', gridTemplateColumns: 'repeat(20,1fr)', gap: '3px', width: 'min(92vw,420px)' } },
      Array.from({ length: 100 }, (_, i) => h('i', { style: { aspectRatio: '1', borderRadius: '50%', background: i === 0 ? '#fff' : 'var(--p4)', transition: 'all .4s', display: 'block' } })));
    const head = h('div', { style: { textAlign: 'center' } });
    const arena = h('div', { style: { position: 'relative', width: 'min(92vw,520px)', flex: 1, maxHeight: '420px', minHeight: '260px', borderRadius: '28px', background: 'rgba(255,255,255,.05)', border: '1px solid var(--border)', overflow: 'hidden', display: 'grid', placeItems: 'center', touchAction: 'manipulation' } });
    stage.append(h('div.center-stage', { style: { justifyContent: 'flex-start', paddingTop: '18px', gap: '16px' } }, head, dots, arena));

    const paintDots = () => { let k = 0; [...dots.children].forEach((d, i) => { const on = i === 0 ? !eliminatedAt : bots[i - 1].alive; d.style.background = on ? (i === 0 ? '#fff' : 'var(--p4)') : 'rgba(255,255,255,.08)'; d.style.transform = on ? '' : 'scale(.6)'; if (on) k++; }); };
    const setHead = (title, sub) => head.replaceChildren(h('div', { style: { fontSize: '13px', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700 } }, sub), h('div.big-msg', { style: { fontSize: 'clamp(24px,6vw,38px)' } }, title));

    // Chaque épreuve résout avec le temps du joueur en s (Infinity = raté)
    const play = (type) => new Promise((res) => {
      let t0 = 0, done = false; const finish = (v) => { if (!done) { done = true; res(v); } };
      ctx.timeout(() => finish(Infinity), 4500);
      if (type === 'green') {
        setHead('Touche quand c’est VERT', 'Réflexe');
        const pad = h('button', { style: { position: 'absolute', inset: 0, border: 0, background: '#ff3d5a', color: '#fff', fontSize: '30px', fontWeight: 800, transition: 'background .05s' } }, 'Attends…');
        arena.replaceChildren(pad);
        const delay = rng.float(900, 2600);
        ctx.timeout(() => { if (done) return; pad.style.background = '#2ecc71'; pad.textContent = 'MAINTENANT !'; t0 = performance.now(); }, delay);
        pad.onpointerdown = () => { if (!t0) { pad.textContent = 'Trop tôt !'; sfx.bad(); finish(Infinity); } else finish((performance.now() - t0) / 1000); };
      } else if (type === 'target') {
        setHead('Touche la cible', 'Précision');
        arena.replaceChildren(h('p.muted', 'Prépare-toi…'));
        ctx.timeout(() => {
          const x = rng.float(12, 88), y = rng.float(15, 85);
          arena.replaceChildren(h('button', { 'aria-label': 'Cible', onpointerdown: (e) => { e.stopPropagation(); sfx.pop(); finish((performance.now() - t0) / 1000); },
            style: { position: 'absolute', left: x + '%', top: y + '%', transform: 'translate(-50%,-50%)', width: '64px', height: '64px', borderRadius: '50%', border: '0', background: 'radial-gradient(circle,#fff 0 18%,#ff3d5a 19% 42%,#fff 43% 60%,#ff3d5a 61%)', boxShadow: '0 0 30px #ff3d5a88', animation: 'pop .25s var(--spring) both' } }));
          arena.onpointerdown = () => { sfx.bad(); finish(Infinity); };
          t0 = performance.now();
        }, rng.float(500, 1200));
      } else if (type === 'stroop') {
        const [word, col] = rng.pick(COLORS); const ink = rng.pick(COLORS.filter((c) => c !== COLORS.find((x) => x[0] === word)))[1];
        setHead('Touche la couleur ÉCRITE', 'Attention');
        arena.replaceChildren(h('div', { style: { display: 'grid', gap: '16px', placeItems: 'center', width: '100%', padding: '16px' } },
          h('div', { style: { fontSize: 'clamp(44px,12vw,72px)', fontWeight: 900, color: ink, letterSpacing: '.04em' } }, word),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' } },
            rng.shuffle(COLORS).map(([n, c]) => h('button', { 'aria-label': n, style: { height: '64px', borderRadius: '18px', border: 0, background: c }, onpointerdown: () => { if (c === col) { sfx.ok(); finish((performance.now() - t0) / 1000); } else { sfx.bad(); finish(Infinity); } } })))));
        t0 = performance.now();
      } else {
        setHead('Tape 10 fois, vite !', 'Endurance');
        let n = 0; const cnt = h('div', { style: { fontSize: '64px', fontWeight: 900 } }, '0/10');
        const btn = h('button', { style: { position: 'absolute', inset: 0, border: 0, background: 'radial-gradient(circle at 50% 40%,#ffd23f55,transparent 70%)' } }, cnt);
        btn.onpointerdown = () => { if (!t0) t0 = performance.now(); n++; cnt.textContent = `${n}/10`; sfx.tick(); vibrate(5); btn.style.transform = `scale(${1 + (n % 2) * 0.01})`; if (n >= 10) finish((performance.now() - t0) / 1000 + 0.6); };
        arena.replaceChildren(btn);
      }
    });
    const botTime = (type, skill) => {
      const fail = { green: 0.06, target: 0.04, stroop: 0.12, mash: 0.02 }[type] / skill;
      if (Math.random() < fail) return Infinity;
      const base = { green: 0.36, target: 0.62, stroop: 0.95, mash: 1.9 }[type];
      return base / skill + Math.abs(rng.float(-0.12, 0.25)) * base;
    };

    const loopRounds = async () => {
      while (ctx.alive) {
        round++;
        ctx.hud({ round: `Manche ${round}`, alive: `${alive} en lice` });
        setHead(`Manche ${round}`, `${alive} joueurs`);
        arena.replaceChildren(h('div.countdown', { style: { fontSize: '80px' } }, '⚡'));
        await sleep(900); if (!ctx.alive) return;
        const type = CHALLENGES[(round - 1) % CHALLENGES.length];
        const mine = await play(type); if (!ctx.alive) return;
        arena.onpointerdown = null;
        const live = bots.filter((b) => b.alive).map((b) => ({ b, t: botTime(type, b.skill) }));
        const all = [...live, { me: true, t: mine }].sort((a, b) => a.t - b.t);
        const keep = alive <= 3 ? alive - 1 : Math.max(1, Math.round(alive * 0.62));
        const survivors = new Set(all.slice(0, keep).filter((x) => x.t < Infinity));
        live.forEach((x) => { if (!survivors.has(x)) x.b.alive = false; });
        const meOk = [...survivors].some((x) => x.me);
        const myRank = all.findIndex((x) => x.me) + 1;
        alive = survivors.size; paintDots();
        arena.replaceChildren(h('div', { style: { textAlign: 'center', display: 'grid', gap: '8px' } },
          h('div', { style: { fontSize: '56px' } }, meOk ? '✅' : '❌'),
          h('div.big-msg', { style: { fontSize: '28px' } }, mine === Infinity ? 'Raté !' : `${(mine * 1000) | 0} ms`),
          h('p.muted', meOk ? `${myRank}e sur ${all.length}. Qualifié !` : `${myRank}e sur ${all.length}. Éliminé…`)));
        meOk ? sfx.ok() : (sfx.boom(), vibrate(120));
        await sleep(1500); if (!ctx.alive) return;
        if (!meOk) { eliminatedAt = alive + 1; paintDots(); return end(alive + 1); }
        if (alive <= 1) return end(1);
      }
    };
    const end = (rank) => ctx.end({
      score: 101 - rank, display: rank === 1 ? '#1' : `#${rank}`, emoji: rank === 1 ? '👑' : rank <= 10 ? '🥈' : '💀', win: rank === 1,
      title: rank === 1 ? 'TOP 1 ! Couronné !' : rank <= 10 ? 'Top 10, respect' : 'Éliminé', label: `Classement final sur 100 joueurs · ${round} manches`,
      share: `👑 Tap Royale : ${rank === 1 ? 'TOP 1 sur 100 !' : `#${rank} sur 100`}. Viens me détrôner.`,
    });
    loopRounds();
  },
};
