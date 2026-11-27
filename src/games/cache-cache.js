import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';
import { playerSetup } from '../core/players.js';
import { passTo, scoreTable } from './kit.js';

const THEMES = [
  ['🌲 Forêt', '🌲🌳🍄🌿🪨🌸🍂🌲🌳🌿🪵🐌'], ['🏖️ Plage', '🐚🦀🌴🏖️⛱️🪸🐠🌊🐚🪨🦩🍹'], ['🏙️ Ville', '🏢🏠🚗🚕🌳🚦🏪🚲🏢🏬🚌🛵'],
  ['🍽️ Buffet', '🍕🍔🍟🌭🥗🍰🍩🍪🧁🍓🥐🥨'], ['🌌 Espace', '⭐🌙🪐☄️🛸🌟✨🌍🚀🌑⭐✨'], ['🧸 Chambre', '🧸🎮📚🧦🛏️🪀🎨🧩🪁👟🎧📦'],
];
const W = 8, H = 10;

export default {
  async start(ctx) {
    const mode = ctx.mode || 'soiree', party = mode === 'soiree';
    const R = mode === 'jour' ? makeRng('cache-' + todayKey()) : ctx.rng;
    let players = [{ name: 'Toi', emoji: '🕵️', color: '#4cc9f0' }];
    if (party) { players = await playerSetup(ctx.stage, { min: 2, max: 8, title: 'Qui joue ?', cta: 'Se cacher 🙈' }); if (!ctx.alive) return; }
    players.forEach((p) => { p.pts = 0; p.found = 0; });
    const scene = h('div.center-stage', { style: { gap: '10px' } }); ctx.stage.append(scene);
    const makeScene = () => { const [name, set] = R.pick(THEMES); const em = typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter().segment(set)].map((s) => s.segment) : Array.from(set).filter((c) => c !== '\uFE0F'); return { name, cells: Array.from({ length: W * H }, () => R.pick(em)) }; };
    const board = (sc, onTap, marks = new Map(), sel = -1) => h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${W},1fr)`, gap: '2px', width: `min(94vw, calc((100dvh - 240px) * ${W / H}), 420px)` } },
      sc.cells.map((e, k) => { const m = marks.get(k); return h('button', { style: { aspectRatio: '1', border: 0, borderRadius: '6px', padding: 0, fontSize: 'clamp(16px,5.4vw,26px)', cursor: 'pointer', background: k === sel ? 'rgba(255,210,63,.6)' : m != null ? `hsla(${Math.min(220, m * 40)},85%,50%,.55)` : 'rgba(255,255,255,.05)', position: 'relative' }, onclick: () => onTap(k) }, e, m != null ? h('b', { style: { position: 'absolute', right: '2px', bottom: '0', fontSize: '10px', color: '#fff' } }, m) : ''); }));
    const dist = (a, b) => Math.max(Math.abs((a % W) - (b % W)), Math.abs(Math.floor(a / W) - Math.floor(b / W)));
    let flair = false, ghost = false;

    if (!party) {
      // Solo : l'ordi se cache 6 fois
      let total = 0;
      for (let r = 0; r < 6 && ctx.alive; r++) {
        const sc = makeScene(), spot = R.int(0, W * H - 1); const marks = new Map(); let taps = 0;
        ctx.hud({ round: `${r + 1}/6`, pts: `${total} pts` });
        await new Promise((res) => {
          const render = () => scene.replaceChildren(h('div.faint', `CACHETTE ${r + 1}/6 · ${sc.name}`), h('div.big-msg', { style: { fontSize: '20px' } }, taps ? `${taps} essai${taps > 1 ? 's' : ''} · le chiffre = distance` : 'L’ordi s’est caché derrière un emoji…'), board(sc, tap, marks));
          const tap = (k) => {
            if (marks.has(k)) return; taps++;
            if (k === spot) { if (taps === 1) flair = true; const p = Math.max(10, 150 - (taps - 1) * 15); total += p; sfx.win(); ctx.flash('rgba(61,220,151,.3)'); vibrate([20, 30, 20]); scene.replaceChildren(h('div', { style: { fontSize: '64px' } }, '🙈'), h('div.big-msg', `Trouvé en ${taps} essai${taps > 1 ? 's' : ''} !`), h('div', { style: { fontWeight: 800, color: 'var(--ok)' } }, `+${p}`)); return ctx.timeout(res, 1400); }
            const d = dist(k, spot); marks.set(k, d); d <= 1 ? sfx.ok() : sfx.tick(); vibrate(d <= 1 ? 12 : 4); render();
          };
          render();
        });
      }
      if (!ctx.alive) return;
      return ctx.end({ score: total, display: `${total} pts`, emoji: '🙈', board: mode === 'jour' ? 'jour' : null, title: total >= 700 ? 'Détective de génie' : total >= 450 ? 'Bon flair' : 'Les cachettes ont gagné', label: '6 cachettes', feats: [flair && 'flair', total >= 700 && 'detective'].filter(Boolean) });
    }

    // Soirée : chacun se cache une fois, les autres cherchent (3 essais chacun)
    for (const hider of players) {
      if (!ctx.alive) return;
      const sc = makeScene();
      await passTo(scene, hider, 'Choisis ta cachette en secret 🤫'); if (!ctx.alive) return;
      const spot = await new Promise((res) => { let sel = -1; const render = () => scene.replaceChildren(h('div.faint', sc.name), h('div.big-msg', { style: { fontSize: '20px' } }, `${hider.emoji} ${hider.name}, où te caches-tu ?`), board(sc, (k) => { sel = k; sfx.tick(); render(); }, new Map(), sel), h('button.btn.btn-primary.btn-lg', { disabled: sel < 0, onclick: () => res(sel) }, 'Je me cache ici')); render(); });
      if (!ctx.alive) return;
      const seekers = players.filter((p) => p !== hider); const marks = new Map(); let foundBy = null, misses = 0;
      const tries = new Map(seekers.map((p) => [p, 3]));
      outer: for (let round = 0; round < 3; round++) for (const s of seekers) {
        await passTo(scene, s, `Trouve ${hider.emoji} ${hider.name} · essai ${4 - tries.get(s)}/3`); if (!ctx.alive) return;
        const k = await new Promise((res) => scene.replaceChildren(h('div.faint', `${sc.name} · chiffre = distance`), h('div.big-msg', { style: { fontSize: '20px' } }, `${s.emoji} ${s.name}, touche une case`), board(sc, (k) => !marks.has(k) && res(k), marks)));
        if (!ctx.alive) return; tries.set(s, tries.get(s) - 1);
        if (k === spot) { foundBy = s; break outer; }
        misses++; const d = dist(k, spot); marks.set(k, d); sfx.tick();
        await new Promise((res) => { scene.replaceChildren(h('div', { style: { fontSize: '48px' } }, d <= 1 ? '🔥' : d <= 3 ? '🌤️' : '🥶'), h('div.big-msg', d <= 1 ? 'Brûlant !' : d <= 3 ? 'Tiède' : 'Froid'), h('p.muted', `À ${d} case${d > 1 ? 's' : ''} de la cachette`)); ctx.timeout(res, 1100); });
      }
      if (!ctx.alive) return;
      if (foundBy) { foundBy.pts += 3; foundBy.found++; hider.pts += misses; sfx.win(); vibrate([20, 30, 20]); }
      else { hider.pts += 5; sfx.go(); if (hider === players[0]) ghost = true; }
      await new Promise((res) => scene.replaceChildren(h('div', { style: { fontSize: '48px' } }, foundBy ? '🙈' : '🫥'), h('div.big-msg', { style: { fontSize: '22px', textAlign: 'center' } }, foundBy ? `${foundBy.emoji} ${foundBy.name} a trouvé ${hider.name} !` : `Personne n’a trouvé ${hider.name} !`), board(sc, () => {}, marks, spot), scoreTable(players), h('button.btn.btn-primary.btn-lg', { onclick: res }, 'Suite')));
    }
    if (!ctx.alive) return;
    const top = [...players].sort((a, b) => b.pts - a.pts)[0];
    ctx.end({ multi: true, win: true, emoji: '🙈', display: top.emoji, title: `${top.name} gagne la partie de cache-cache !`, label: `${players.length} cachettes`, extra: scoreTable(players), feats: [ghost && 'fantome'].filter(Boolean) });
  },
};
