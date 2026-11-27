import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';

// [emoji, nom, catégorie] : les mauvaises réponses viennent de la même catégorie (plus dur, plus drôle)
const POOL = [
  ['🍎', 'Pomme', 'fruit'], ['🍌', 'Banane', 'fruit'], ['🍉', 'Pastèque', 'fruit'], ['🍓', 'Fraise', 'fruit'], ['🍒', 'Cerises', 'fruit'], ['🍍', 'Ananas', 'fruit'], ['🥝', 'Kiwi', 'fruit'], ['🍋', 'Citron', 'fruit'], ['🍇', 'Raisin', 'fruit'], ['🍑', 'Pêche', 'fruit'],
  ['🍕', 'Pizza', 'plat'], ['🍔', 'Burger', 'plat'], ['🌮', 'Taco', 'plat'], ['🍩', 'Donut', 'plat'], ['🧀', 'Fromage', 'plat'], ['🍣', 'Sushi', 'plat'], ['🥐', 'Croissant', 'plat'], ['🍦', 'Glace', 'plat'], ['🌭', 'Hot-dog', 'plat'], ['🥨', 'Bretzel', 'plat'],
  ['🐶', 'Chien', 'animal'], ['🐱', 'Chat', 'animal'], ['🐸', 'Grenouille', 'animal'], ['🐷', 'Cochon', 'animal'], ['🦊', 'Renard', 'animal'], ['🐼', 'Panda', 'animal'], ['🐧', 'Pingouin', 'animal'], ['🦁', 'Lion', 'animal'], ['🐙', 'Pieuvre', 'animal'], ['🦄', 'Licorne', 'animal'], ['🐢', 'Tortue', 'animal'], ['🦒', 'Girafe', 'animal'], ['🐝', 'Abeille', 'animal'], ['🦋', 'Papillon', 'animal'],
  ['🚗', 'Voiture', 'transport'], ['🚀', 'Fusée', 'transport'], ['🚲', 'Vélo', 'transport'], ['✈️', 'Avion', 'transport'], ['🚒', 'Camion de pompiers', 'transport'], ['⛵', 'Voilier', 'transport'], ['🚁', 'Hélicoptère', 'transport'], ['🚂', 'Locomotive', 'transport'], ['🛸', 'Soucoupe volante', 'transport'],
  ['🌈', 'Arc-en-ciel', 'nature'], ['🌵', 'Cactus', 'nature'], ['🌻', 'Tournesol', 'nature'], ['🍄', 'Champignon', 'nature'], ['🌋', 'Volcan', 'nature'], ['⛄', 'Bonhomme de neige', 'nature'], ['🌙', 'Lune', 'nature'], ['🌲', 'Sapin', 'nature'], ['🌊', 'Vague', 'nature'],
  ['⚽', 'Ballon de foot', 'objet'], ['🎸', 'Guitare', 'objet'], ['🎈', 'Ballon', 'objet'], ['💎', 'Diamant', 'objet'], ['👑', 'Couronne', 'objet'], ['🎃', 'Citrouille', 'objet'], ['⏰', 'Réveil', 'objet'], ['🔑', 'Clé', 'objet'], ['🎁', 'Cadeau', 'objet'], ['🧸', 'Ours en peluche', 'objet'], ['📷', 'Appareil photo', 'objet'],
];
const ROUNDS = 10, LIVES = 3;
const STYLES = ['pixel', 'tiles', 'zoom'];
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

export default {
  start(ctx) {
    const R = ctx.rng;
    const deck = R.shuffle(POOL).slice(0, ROUNDS);
    let round = 0, score = 0, bet = 1, raf = 0, t0 = 0, answered = false, streak = 0, bestStreak = 0, lives = LIVES, flash = false, correct = 0;
    const src = document.createElement('canvas'); src.width = src.height = 128;
    const sg = src.getContext('2d', { willReadFrequently: true });
    const view = h('canvas', { width: 320, height: 320, style: { width: 'min(68vw, 40vh, 320px)', height: 'auto', aspectRatio: '1', borderRadius: '24px', imageRendering: 'pixelated', background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,.45), 0 0 0 6px rgba(255,255,255,.08)' } });
    const vg = view.getContext('2d');
    const bar = h('div.bar', { style: { maxWidth: '320px' } }, h('i', { style: { width: '0%' } }));
    const styleTag = h('span.chip');
    const betSeg = h('div.seg', { role: 'group', 'aria-label': 'Mise' });
    const choices = h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', maxWidth: '460px' } });
    const info = h('p.muted', { style: { minHeight: '1.5em', fontWeight: 600 } });
    ctx.stage.append(h('div.center-stage', { style: { gap: '12px', justifyContent: 'space-evenly' } }, styleTag, view, bar, betSeg, choices, info));

    const paintBet = () => betSeg.replaceChildren(...[1, 2, 3].map((b) => h('button', { 'aria-pressed': String(b === bet), onclick: () => { if (!answered) { bet = b; sfx.click(); paintBet(); } } }, `Mise ×${b}`)));
    const hud = () => ctx.hud({ lives: '❤️'.repeat(lives) + '🖤'.repeat(LIVES - lives), round: `${Math.min(round + 1, ROUNDS)}/${ROUNDS}`, score: `${score} pts`, streak: streak > 1 ? `🔥 ×${streak}` : null });
    // Rendus de dévoilement (p de 0 à 1)
    const avgColor = (x0, y0, w, hgt, d) => { let r = 0, g = 0, b = 0, c = 0; for (let y = y0; y < y0 + hgt; y += 2) for (let x = x0; x < x0 + w; x += 2) { const i = (y * 128 + x) * 4, a = d[i + 3] / 255; r += d[i] * a + 255 * (1 - a); g += d[i + 1] * a + 255 * (1 - a); b += d[i + 2] * a + 255 * (1 - a); c++; } return `rgb(${r / c | 0},${g / c | 0},${b / c | 0})`; };
    let tilesOrder = [], zoomAt = [0.5, 0.5];
    const render = (style, p) => {
      vg.fillStyle = '#fff'; vg.fillRect(0, 0, 320, 320);
      if (style === 'pixel') {
        const LV = [3, 4, 5, 6, 8, 10, 13, 16, 22, 32, 64]; const n = LV[Math.min(LV.length - 1, Math.floor(p * LV.length))];
        const d = sg.getImageData(0, 0, 128, 128).data; const s = 128 / n;
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { vg.fillStyle = avgColor(Math.floor(x * s), Math.floor(y * s), Math.max(2, Math.floor(s)), Math.max(2, Math.floor(s)), d); vg.fillRect(Math.floor(x * 320 / n), Math.floor(y * 320 / n), Math.ceil(320 / n), Math.ceil(320 / n)); }
      } else if (style === 'tiles') {
        vg.drawImage(src, 0, 0, 320, 320);
        const shown = Math.floor(p * p * 64);
        vg.fillStyle = '#2a2f5a';
        tilesOrder.slice(shown).forEach((k) => { vg.fillRect((k % 8) * 40, Math.floor(k / 8) * 40, 40, 40); });
        vg.strokeStyle = 'rgba(255,255,255,.12)'; for (let i = 1; i < 8; i++) { vg.beginPath(); vg.moveTo(i * 40, 0); vg.lineTo(i * 40, 320); vg.moveTo(0, i * 40); vg.lineTo(320, i * 40); vg.stroke(); }
      } else {
        const z = 9 - 8 * Math.min(1, p * 1.05); const w = 128 / z;
        const cx = Math.min(128 - w / 2, Math.max(w / 2, zoomAt[0] * 128)), cy = Math.min(128 - w / 2, Math.max(w / 2, zoomAt[1] * 128));
        vg.imageSmoothingEnabled = true; vg.drawImage(src, cx - w / 2, cy - w / 2, w, w, 0, 0, 320, 320);
      }
    };
    const next = () => {
      if (round >= ROUNDS || lives <= 0) return finish();
      answered = false; const [emoji, name, cat] = deck[round];
      const style = round < 3 ? STYLES[round] : R.pick(STYLES);
      styleTag.textContent = { pixel: '🟦 Pixels', tiles: '🧩 Puzzle', zoom: '🔎 Zoom' }[style];
      tilesOrder = R.shuffle([...Array(64).keys()]); zoomAt = [R.float(0.3, 0.7), R.float(0.3, 0.7)];
      hud();
      sg.clearRect(0, 0, 128, 128); sg.font = `104px ${EMOJI_FONT}`; sg.textAlign = 'center'; sg.textBaseline = 'middle'; sg.fillText(emoji, 64, 70);
      const same = POOL.filter((p) => p[2] === cat && p[1] !== name), other = POOL.filter((p) => p[2] !== cat);
      const nSame = round < 3 ? 1 : round < 6 ? 2 : 3; // de plus en plus de pièges de la même famille
      const wrong = [...R.shuffle(same).slice(0, nSame), ...R.shuffle(other).slice(0, 3 - nSame)].map((p) => p[1]);
      const opts = R.shuffle([name, ...wrong]);
      choices.replaceChildren(...opts.map((o) => h('button.btn.btn-lg', { style: { whiteSpace: 'normal', fontSize: '16px', minHeight: '56px' }, onclick: (e) => answer(o === name, e.currentTarget, name) }, o)));
      info.textContent = round === 0 ? 'Choisis ta mise, puis devine !' : `Image ${round + 1} : ça accélère…`;
      const dur = Math.max(4500, 9000 - round * 450);
      t0 = performance.now(); let last = -1;
      const tick = () => {
        const p = Math.min(1, (performance.now() - t0) / dur);
        const step = Math.floor(p * 40); if (step !== last) { render(style, p); if (step % 4 === 0) sfx.tick(); last = step; }
        bar.firstChild.style.width = (p * 100) + '%';
        if (p < 1) raf = requestAnimationFrame(tick); else if (!answered) answer(false, null, name, true);
      };
      tick.dur = dur; raf = requestAnimationFrame(tick); next.dur = dur;
    };
    const answer = (ok, btn, name, timeout = false) => {
      if (answered) return; answered = true; cancelAnimationFrame(raf);
      const el = (performance.now() - t0) / 1000; const p = Math.min(1, el * 1000 / next.dur);
      vg.imageSmoothingEnabled = true; vg.fillStyle = '#fff'; vg.fillRect(0, 0, 320, 320); vg.drawImage(src, 0, 0, 320, 320);
      let gain;
      if (ok) {
        streak++; bestStreak = Math.max(bestStreak, streak); correct++;
        const combo = streak >= 5 ? 2 : streak >= 3 ? 1.5 : 1;
        gain = Math.round((50 + 200 * (1 - p)) * bet * combo); sfx.ok(); vibrate(15);
        if (el < 1.5 && bet === 3) flash = true;
        const r = view.getBoundingClientRect(), s = ctx.stage.getBoundingClientRect();
        ctx.pop(`+${gain}${combo > 1 ? ` · combo ×${combo}` : ''}`, r.left - s.left + r.width / 2, r.top - s.top + r.height / 2, '#3ddc97', 30);
      } else {
        streak = 0; lives--; gain = -40 * bet; sfx.bad(); vibrate([40, 30, 40]); ctx.shake(6);
      }
      score = Math.max(0, score + gain);
      [...choices.children].forEach((b) => { b.style.pointerEvents = 'none'; if (b.textContent === name) b.style.background = 'rgba(61,220,151,.45)'; else b.style.opacity = 0.45; });
      if (btn && !ok) { btn.style.background = 'rgba(255,92,122,.35)'; btn.classList.add('anim-shake'); }
      info.replaceChildren(h('span', { style: { color: ok ? 'var(--ok)' : 'var(--bad)', fontSize: '20px', fontWeight: 800 } }, `${gain >= 0 ? '+' : ''}${gain} pts`), timeout ? ' · Trop tard ! −1 ❤️' : ok ? (streak > 1 ? ` · série de ${streak} 🔥` : '') : ' · −1 ❤️');
      hud(); round++; ctx.timeout(next, 1300);
    };
    const finish = () => ctx.end({
      score, display: `${score} pts`, emoji: lives > 0 ? '🖼️' : '💔',
      title: lives <= 0 ? 'Plus de vies !' : score > 2500 ? 'Œil de lynx !' : score > 1500 ? 'Bien vu !' : 'Myope ?',
      label: `${correct}/${ROUNDS} images · meilleure série ${bestStreak}`, win: lives > 0 && correct >= 8,
      feats: [correct === ROUNDS && 'parfait', flash && 'flash', bestStreak >= 5 && 'serie'].filter(Boolean),
    });
    ctx.onCleanup(() => cancelAnimationFrame(raf));
    paintBet(); next();
  },
};
