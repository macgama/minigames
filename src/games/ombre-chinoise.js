import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';

// [emoji, nom, famille] : les fausses réponses viennent de la même famille
const ITEMS = [
  ['🐘', 'Éléphant', 'a'], ['🦒', 'Girafe', 'a'], ['🐇', 'Lapin', 'a'], ['🐌', 'Escargot', 'a'], ['🦀', 'Crabe', 'a'], ['🐙', 'Pieuvre', 'a'], ['🦋', 'Papillon', 'a'], ['🐢', 'Tortue', 'a'],
  ['🦔', 'Hérisson', 'a'], ['🐓', 'Coq', 'a'], ['🦩', 'Flamant rose', 'a'], ['🐿️', 'Écureuil', 'a'], ['🦘', 'Kangourou', 'a'], ['🐊', 'Crocodile', 'a'], ['🦭', 'Phoque', 'a'], ['🐫', 'Chameau', 'a'],
  ['🎸', 'Guitare', 'o'], ['☂️', 'Parapluie', 'o'], ['✂️', 'Ciseaux', 'o'], ['🔑', 'Clé', 'o'], ['⏰', 'Réveil', 'o'], ['🎺', 'Trompette', 'o'], ['🪑', 'Chaise', 'o'], ['🔨', 'Marteau', 'o'],
  ['🧲', 'Aimant', 'o'], ['🪁', 'Cerf-volant', 'o'], ['🎩', 'Chapeau', 'o'], ['👓', 'Lunettes', 'o'], ['🔦', 'Lampe de poche', 'o'], ['🧸', 'Ours en peluche', 'o'], ['⚓', 'Ancre', 'o'], ['🪣', 'Seau', 'o'],
  ['🚲', 'Vélo', 'v'], ['🚁', 'Hélicoptère', 'v'], ['⛵', 'Voilier', 'v'], ['🚂', 'Locomotive', 'v'], ['🛴', 'Trottinette', 'v'], ['✈️', 'Avion', 'v'], ['🚀', 'Fusée', 'v'], ['🛵', 'Scooter', 'v'],
  ['🍌', 'Banane', 'f'], ['🍐', 'Poire', 'f'], ['🍄', 'Champignon', 'f'], ['🥕', 'Carotte', 'f'], ['🍇', 'Raisin', 'f'], ['🍍', 'Ananas', 'f'], ['🌶️', 'Piment', 'f'], ['🥨', 'Bretzel', 'f'],
];
const QN = 10, TIME = 8;

export default {
  start(ctx) {
    const mode = ctx.mode || 'classic', hard = mode === 'difficile';
    const R = mode === 'jour' ? makeRng('ombre-' + todayKey()) : ctx.rng;
    const qs = R.shuffle(ITEMS).slice(0, QN);
    const SZ = 220;
    const cv = h('canvas', { width: SZ * 2, height: SZ * 2, style: { width: `min(62vw,${SZ}px)`, aspectRatio: '1', borderRadius: '24px', background: 'radial-gradient(circle at 50% 40%, #fff4d6, #ffb547)', boxShadow: '0 16px 40px rgba(0,0,0,.35)' } });
    const g = cv.getContext('2d');
    const src = document.createElement('canvas'); src.width = src.height = 256; const sg = src.getContext('2d');
    const low = document.createElement('canvas'); const lg = low.getContext('2d');
    const head = h('div.faint', { style: { fontSize: '12px', fontWeight: 700, letterSpacing: '.1em' } });
    const answers = h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: 'min(92vw,440px)' } });
    const msg = h('div', { style: { minHeight: '26px', fontWeight: 800, fontSize: '18px' } });
    ctx.stage.append(h('div.center-stage', { style: { gap: '12px' } }, head, cv, msg, answers));
    let i = 0, score = 0, lives = 3, good = 0, fast = 0, cur = null, t0 = 0, spin = 0, done = false;
    const hud = () => ctx.hud({ pts: `${score} pts`, lives: '❤️'.repeat(lives) + '🖤'.repeat(3 - lives) });

    const prep = (emo) => {
      sg.clearRect(0, 0, 256, 256); sg.globalCompositeOperation = 'source-over';
      sg.font = '200px sans-serif'; sg.textAlign = 'center'; sg.textBaseline = 'middle'; sg.fillText(emo, 128, 140);
      sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#1b1035'; sg.fillRect(0, 0, 256, 256); sg.globalCompositeOperation = 'source-over';
    };
    const draw = () => {
      if (!cur) return;
      const k = Math.min(1, (performance.now() - t0) / 1000 / TIME);
      // Pixelisation qui s'affine avec le temps
      const res = Math.round(cur.revealed ? 256 : 10 + Math.pow(k, 1.6) * 110);
      low.width = low.height = res; lg.imageSmoothingEnabled = true; lg.clearRect(0, 0, res, res); lg.drawImage(src, 0, 0, res, res);
      g.clearRect(0, 0, SZ * 2, SZ * 2); g.save(); g.translate(SZ, SZ);
      g.rotate(cur.revealed ? 0 : spin); if (cur.flip && !cur.revealed) g.scale(-1, 1);
      const zoom = cur.revealed ? 1.5 : cur.zoom; g.scale(zoom, zoom);
      if (cur.revealed) { g.font = '200px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(cur.e, 0, 12); }
      else { g.imageSmoothingEnabled = false; g.drawImage(low, -128 + cur.ox, -128 + cur.oy, 256, 256); }
      g.restore();
    };
    const ask = () => {
      if (i >= QN || lives <= 0) return finish();
      const [e, name, fam] = qs[i];
      const others = R.shuffle(ITEMS.filter((x) => x[2] === fam && x[1] !== name)).slice(0, 3).map((x) => x[1]);
      cur = { e, name, opts: R.shuffle([name, ...others]), zoom: hard ? R.float(1.6, 2.1) : 1.4, flip: hard && R.float(0, 1) < 0.5, ox: hard ? R.float(-30, 30) : 0, oy: hard ? R.float(-30, 30) : 0, revealed: false, locked: false };
      prep(e); spin = R.float(0, 6.28); t0 = performance.now(); msg.textContent = '';
      head.textContent = `OMBRE ${i + 1}/${QN}`;
      cur.btns = cur.opts.map((o) => h('button.btn', { style: { minHeight: '54px', fontWeight: 800, fontSize: '17px' }, onclick: () => pick(o) }, o));
      answers.replaceChildren(...cur.btns); hud();
    };
    const pick = (o) => {
      if (!cur || cur.locked) return; cur.locked = true;
      const sec = (performance.now() - t0) / 1000, ok = o === cur.name;
      cur.btns.forEach((b) => { b.style.pointerEvents = 'none'; if (b.textContent === cur.name) b.style.background = 'var(--ok)'; else if (b.textContent === o) b.style.background = 'var(--bad)'; else b.style.opacity = 0.45; });
      cur.revealed = true; draw();
      if (ok) { good++; if (sec < 2) fast++; const p = Math.round(50 + 100 * Math.max(0, 1 - sec / TIME)) * (hard ? 1 : 1); score += p; msg.textContent = sec < 2 ? `⚡ +${p}` : `+${p}`; msg.style.color = 'var(--ok)'; sfx.ok(); vibrate(10); }
      else { lives--; msg.textContent = o ? `C’était : ${cur.name}` : `⏰ C’était : ${cur.name}`; msg.style.color = 'var(--bad)'; sfx.bad(); ctx.shake(5); vibrate([30, 30, 30]); }
      hud(); i++; ctx.timeout(ask, ok ? 1100 : 1800);
    };
    ctx.interval(() => {
      if (!cur || done) return;
      if (!cur.locked) { spin += hard ? 0.06 : 0.02; if ((performance.now() - t0) / 1000 > TIME) pick(null); }
      draw();
    }, 33);
    const finish = () => {
      done = true; cur = null;
      ctx.end({
        score, display: `${score} pts`, emoji: '👤', board: mode === 'classic' ? null : mode,
        title: good === QN ? 'Œil de lynx' : score >= 1000 ? 'Maître des ombres' : score >= 600 ? 'Bon œil' : 'Il fait sombre ici…',
        label: `${good}/${QN} ombres · ${fast} en moins de 2 s`,
        feats: [good === QN && 'parfait', fast >= 5 && 'eclair', hard && score >= 800 && 'difficile'].filter(Boolean),
      });
    };
    ctx.countdown().then(() => ctx.alive && ask());
  },
};
