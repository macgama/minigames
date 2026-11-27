import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { rng } from '../core/rng.js';

const POOL = [['🍎', 'Pomme'], ['🍌', 'Banane'], ['🍉', 'Pastèque'], ['🍓', 'Fraise'], ['🍕', 'Pizza'], ['🍔', 'Burger'], ['🌮', 'Taco'], ['🍩', 'Donut'],
  ['🐶', 'Chien'], ['🐱', 'Chat'], ['🐸', 'Grenouille'], ['🐷', 'Cochon'], ['🦊', 'Renard'], ['🐼', 'Panda'], ['🐧', 'Pingouin'], ['🦁', 'Lion'], ['🐙', 'Pieuvre'], ['🦄', 'Licorne'],
  ['🚗', 'Voiture'], ['🚀', 'Fusée'], ['🚲', 'Vélo'], ['✈️', 'Avion'], ['🚒', 'Camion de pompiers'], ['⛵', 'Voilier'],
  ['🌈', 'Arc-en-ciel'], ['🌵', 'Cactus'], ['🌻', 'Tournesol'], ['🍄', 'Champignon'], ['🌋', 'Volcan'], ['⛄', 'Bonhomme de neige'],
  ['⚽', 'Ballon de foot'], ['🎸', 'Guitare'], ['🎈', 'Ballon'], ['💎', 'Diamant'], ['🔥', 'Feu'], ['👑', 'Couronne'], ['🎃', 'Citrouille'], ['🧀', 'Fromage'], ['🍒', 'Cerises'], ['🐢', 'Tortue']];
const ROUNDS = 8, REVEAL = 9000;
const LEVELS = [3, 4, 5, 6, 8, 10, 13, 16, 22, 30, 44, 64];

export default {
  start(ctx) {
    const deck = rng.shuffle(POOL).slice(0, ROUNDS);
    let round = 0, score = 0, bet = 1, raf = 0, t0 = 0, answered = false, streak = 0;
    const src = document.createElement('canvas'); src.width = src.height = 128;
    const sg = src.getContext('2d', { willReadFrequently: true });
    const view = h('canvas', { width: 320, height: 320, style: { width: 'min(70vw, 44vh, 340px)', height: 'auto', aspectRatio: '1', borderRadius: '24px', imageRendering: 'pixelated', background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,.45), 0 0 0 6px rgba(255,255,255,.08)' } });
    const vg = view.getContext('2d');
    const bar = h('div.bar', { style: { maxWidth: '340px' } }, h('i', { style: { width: '0%' } }));
    const betSeg = h('div.seg', { role: 'group', 'aria-label': 'Mise' });
    const choices = h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', maxWidth: '460px' } });
    const info = h('p.muted', { style: { minHeight: '1.5em', fontWeight: 600 } });
    ctx.stage.append(h('div.center-stage', { style: { gap: '14px', justifyContent: 'space-evenly' } }, view, bar, betSeg, choices, info));

    const paintBet = () => betSeg.replaceChildren(...[1, 2, 3].map((b) => h('button', { 'aria-pressed': String(b === bet), onclick: () => { if (!answered) { bet = b; sfx.click(); paintBet(); } } }, `Mise ×${b}`)));
    const pixelate = (n) => {
      const d = sg.getImageData(0, 0, 128, 128).data; const s = 128 / n; vg.fillStyle = '#fff'; vg.fillRect(0, 0, 320, 320);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        let r = 0, gg = 0, b = 0, a = 0, c = 0;
        for (let yy = Math.floor(y * s); yy < Math.floor((y + 1) * s); yy += 2) for (let xx = Math.floor(x * s); xx < Math.floor((x + 1) * s); xx += 2) { const i = (yy * 128 + xx) * 4; const al = d[i + 3] / 255; r += d[i] * al + 255 * (1 - al); gg += d[i + 1] * al + 255 * (1 - al); b += d[i + 2] * al + 255 * (1 - al); c++; }
        vg.fillStyle = `rgb(${r / c | 0},${gg / c | 0},${b / c | 0})`; vg.fillRect(Math.floor(x * 320 / n), Math.floor(y * 320 / n), Math.ceil(320 / n), Math.ceil(320 / n));
      }
    };
    const next = () => {
      if (round >= ROUNDS) return finish();
      answered = false; const [emoji, name] = deck[round];
      ctx.hud({ round: `${round + 1}/${ROUNDS}`, score: `${score} pts` });
      sg.clearRect(0, 0, 128, 128); sg.font = '104px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; sg.textAlign = 'center'; sg.textBaseline = 'middle'; sg.fillText(emoji, 64, 70);
      const opts = rng.shuffle([name, ...rng.shuffle(POOL.filter((p) => p[1] !== name)).slice(0, 3).map((p) => p[1])]);
      choices.replaceChildren(...opts.map((o) => h('button.btn.btn-lg', { style: { whiteSpace: 'normal', fontSize: '16px', minHeight: '56px' }, onclick: (e) => answer(o === name, e.currentTarget, name) }, o)));
      info.textContent = 'Choisis ta mise, puis devine !';
      t0 = performance.now(); let lastLvl = -1;
      const tick = () => {
        const p = Math.min(1, (performance.now() - t0) / REVEAL);
        const lvl = Math.min(LEVELS.length - 1, Math.floor(p * LEVELS.length));
        if (lvl !== lastLvl) { pixelate(LEVELS[lvl]); lastLvl = lvl; if (lvl) sfx.tick(); }
        bar.firstChild.style.width = (p * 100) + '%';
        if (p < 1) raf = requestAnimationFrame(tick); else if (!answered) answer(false, null, name, true);
      };
      raf = requestAnimationFrame(tick);
    };
    const answer = (ok, btn, name, timeout = false) => {
      if (answered) return; answered = true; cancelAnimationFrame(raf);
      const p = Math.min(1, (performance.now() - t0) / REVEAL);
      pixelate(64);
      let gain;
      if (ok) { streak++; gain = Math.round((40 + 160 * (1 - p)) * bet); sfx.ok(); vibrate(15); }
      else { streak = 0; gain = -40 * bet; sfx.bad(); vibrate([40, 30, 40]); }
      score = Math.max(0, score + gain);
      [...choices.children].forEach((b) => { b.disabled = true; if (b.textContent === name) b.style.background = 'rgba(61,220,151,.35)'; });
      if (btn && !ok) { btn.style.background = 'rgba(255,92,122,.35)'; btn.classList.add('anim-shake'); }
      info.innerHTML = '';
      info.append(h('span', { style: { color: ok ? 'var(--ok)' : 'var(--bad)', fontSize: '20px', fontWeight: 800 } }, `${gain >= 0 ? '+' : ''}${gain} pts`), timeout ? ' · Trop tard !' : ok && streak > 1 ? ` · série de ${streak} 🔥` : '');
      ctx.hud({ score: `${score} pts` });
      round++; ctx.timeout(next, 1400);
    };
    const finish = () => ctx.end({ score, display: `${score} pts`, title: score > 900 ? 'Œil de lynx !' : score > 500 ? 'Bien vu !' : 'Myope ?', label: `${ROUNDS} images devinées en jouant tes mises`, share: `🖼️ Bluff Pixel : ${score} points. Tu devines plus vite que moi ?` });
    ctx.onCleanup(() => cancelAnimationFrame(raf));
    paintBet(); next();
  },
};
