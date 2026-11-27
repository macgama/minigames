import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';

const FACES = ['🧑', '👩', '👨‍🦳', '👧', '🧔', '👩‍🦱', '🧑‍💼', '👵', '🧑‍🍳', '👮', '🧑‍🎓', '🕵️'];
const CAP = 4;

export default {
  start(ctx) {
    const mode = ctx.mode || 'classic', rush = mode === 'rush';
    const R = mode === 'jour' ? makeRng('ascenseur-' + todayKey()) : ctx.rng;
    const NF = rush ? 10 : 7, PAT = rush ? 17 : 20;
    let left = 90, lives = 3, delivered = 0, angry = 0, bestDrop = 0, over = false, spawnT = 1, t = 0;
    const lift = { pos: 0, target: 0, doors: 0, riders: [] };
    const waiting = Array.from({ length: NF }, () => []);
    const wrap = h('div', { style: { position: 'absolute', inset: '8px 8px 8px 8px', display: 'grid', gridTemplateColumns: '54px 64px 1fr', gridTemplateRows: `repeat(${NF},1fr)`, gap: '0 6px' } });
    ctx.stage.append(wrap);
    const rows = [];
    for (let f = NF - 1; f >= 0; f--) {
      const r = NF - 1 - f;
      const btn = h('button.btn', { style: { gridColumn: 1, gridRow: r + 1, margin: '3px 0', padding: 0, fontWeight: 900, fontSize: '18px' }, onpointerdown: (e) => { e.preventDefault(); go(f); } }, f === 0 ? 'RDC' : String(f));
      const hall = h('div', { style: { gridColumn: 3, gridRow: r + 1, display: 'flex', alignItems: 'center', gap: '4px', borderBottom: '2px solid rgba(255,255,255,.08)', overflow: 'hidden', padding: '0 4px' } });
      wrap.append(btn, hall); rows[f] = { btn, hall };
    }
    const shaft = h('div', { style: { gridColumn: 2, gridRow: `1 / span ${NF}`, position: 'relative', background: 'rgba(255,255,255,.04)', borderRadius: '10px' } });
    const cab = h('div', { style: { position: 'absolute', left: '2px', right: '2px', borderRadius: '10px', background: 'linear-gradient(180deg,#ffd23f,#ff9f43)', display: 'grid', gridTemplateColumns: '1fr 1fr', placeItems: 'center', fontSize: '15px', color: '#1b1450', fontWeight: 900, boxShadow: '0 4px 14px rgba(0,0,0,.4)', transition: 'filter .2s' } });
    shaft.append(cab); wrap.append(shaft);
    const person = (p, inCab) => {
      const k = Math.max(0, p.pat / PAT);
      return h('div', { style: { position: 'relative', display: 'grid', placeItems: 'center', minWidth: inCab ? 0 : '34px' } },
        h('span', { style: { fontSize: inCab ? '14px' : '24px', filter: !inCab && k < 0.3 ? 'drop-shadow(0 0 6px #ff3d5a)' : '' } }, inCab ? '' : p.face),
        h('b', { style: { position: inCab ? 'static' : 'absolute', top: '-6px', right: '-4px', fontSize: inCab ? '14px' : '11px', background: inCab ? 'transparent' : `hsl(${k * 120},80%,50%)`, color: inCab ? '#1b1450' : '#111', borderRadius: '8px', padding: inCab ? 0 : '0 4px' } }, p.dest === 0 ? 'R' : p.dest));
    };
    const paint = () => {
      const rowH = shaft.clientHeight / NF;
      cab.style.height = `${rowH - 4}px`; cab.style.top = `${(NF - 1 - lift.pos) * rowH + 2}px`;
      cab.style.filter = lift.doors > 0 ? 'brightness(1.25)' : '';
      cab.replaceChildren(...lift.riders.map((p) => person(p, true)));
      for (let f = 0; f < NF; f++) { rows[f].hall.replaceChildren(...waiting[f].map((p) => person(p, false))); rows[f].btn.style.outline = lift.target === f ? '2px solid #ffd23f' : ''; }
    };
    const go = (f) => { if (over) return; lift.target = f; sfx.tick(); vibrate(5); if (lift.pos === f && lift.doors <= 0) arrive(f); paint(); };
    const spawn = () => {
      const from = R.float(0, 1) < 0.35 ? 0 : R.int(0, NF - 1); let dest; do dest = R.float(0, 1) < 0.3 ? 0 : R.int(0, NF - 1); while (dest === from);
      if (waiting[from].length >= 5) return;
      waiting[from].push({ face: R.pick(FACES), dest, pat: PAT, born: t });
    };
    const arrive = (f) => {
      lift.doors = 0.6;
      const out = lift.riders.filter((p) => p.dest === f);
      if (out.length) {
        lift.riders = lift.riders.filter((p) => p.dest !== f); delivered += out.length; bestDrop = Math.max(bestDrop, out.length);
        sfx.ok(); vibrate(10); ctx.pop(`+${out.length}${out.length >= 3 ? ' 🔥' : ''}`, ctx.stage.clientWidth * 0.65, ctx.stage.clientHeight * ((NF - f - 0.5) / NF), '#3ddc97', 22);
        if (out.length >= 4) ctx.flash('rgba(61,220,151,.25)');
      }
      while (lift.riders.length < CAP && waiting[f].length) lift.riders.push(waiting[f].shift());
      ctx.hud({ n: `🧍 ${delivered}`, time: `${Math.ceil(left)} s`, lives: '😊'.repeat(lives) + '😡'.repeat(3 - lives) });
    };
    ctx.interval(() => {
      if (over) return; const dt = 0.05; t += dt; left -= dt;
      spawnT -= dt; if (spawnT <= 0) { spawn(); spawnT = Math.max(rush ? 0.9 : 1.4, (rush ? 2.2 : 3) - t * 0.02) * R.float(0.7, 1.3); }
      if (lift.doors > 0) lift.doors -= dt;
      else if (Math.abs(lift.target - lift.pos) > 0.001) {
        const d = lift.target - lift.pos, step = Math.sign(d) * Math.min(Math.abs(d), 2.6 * dt); lift.pos += step;
        if (Math.abs(lift.target - lift.pos) < 0.001) { lift.pos = lift.target; arrive(lift.target); }
      }
      for (let f = 0; f < NF; f++) for (const p of waiting[f]) p.pat -= dt;
      for (let f = 0; f < NF; f++) {
        const gone = waiting[f].filter((p) => p.pat <= 0);
        if (gone.length) { waiting[f] = waiting[f].filter((p) => p.pat > 0); lives -= gone.length; angry += gone.length; sfx.bad(); ctx.shake(5); vibrate([40, 30, 40]); ctx.pop('😡', ctx.stage.clientWidth * 0.7, ctx.stage.clientHeight * ((NF - f - 0.5) / NF), '#ff5c7a', 30); }
      }
      if (Math.round(t * 20) % 10 === 0) ctx.hud({ n: `🧍 ${delivered}`, time: `${Math.max(0, Math.ceil(left))} s`, lives: '😊'.repeat(Math.max(0, lives)) + '😡'.repeat(3 - Math.max(0, lives)) });
      paint();
      if (left <= 0 || lives <= 0) end();
    }, 50);
    const end = () => {
      over = true; sfx.win();
      ctx.timeout(() => ctx.end({
        score: delivered, display: `${delivered} passagers`, emoji: '🛗', board: mode === 'classic' ? null : mode,
        title: lives <= 0 ? 'Trop de colères !' : delivered >= 30 ? 'Liftier légendaire' : delivered >= 18 ? 'Service efficace' : 'Ça bouchonne au hall',
        label: `${angry} passager${angry > 1 ? 's' : ''} en colère · meilleur arrêt : ${bestDrop}`,
        feats: [bestDrop >= 4 && 'express', delivered >= 20 && angry === 0 && 'zen', rush && delivered >= 40 && 'rush'].filter(Boolean),
      }), 600);
    };
    for (let k = 0; k < 3; k++) spawn();
    ctx.hud({ n: '🧍 0', time: '90 s', lives: '😊😊😊' });
    requestAnimationFrame(paint);
  },
};
