import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { rng } from '../core/rng.js';
import { playerSetup } from '../core/players.js';

const WORDS = ['Un chat qui fait du ski', 'Une licorne', 'La tour Eiffel', 'Un dinosaure', 'Une pizza', 'Un astronaute', 'Un robot amoureux', 'Un pingouin en vacances', 'Une fusée', 'Un château fort', 'Un escargot pressé', 'Un vampire', 'Une baleine', 'Le Cervin', 'Un fantôme', 'Un hamburger géant', 'Une sirène', 'Un dragon', 'Un bonhomme de neige', 'Ton voisin de gauche'];
const INK = ['#1b1450', '#ff3d5a', '#3a8bff', '#2ecc71', '#ffb547', '#ffffff'];
const TIME = 15;

export default {
  async start(ctx) {
    const players = await playerSetup(ctx.stage, { min: 2, max: 8, title: 'Qui dessine ?', cta: 'Tirer le mot secret' });
    if (!ctx.alive) return;
    const word = rng.pick(WORDS);
    const scene = h('div.center-stage'); ctx.stage.append(scene);
    const drawings = [];
    for (const p of players) {
      await new Promise((res) => scene.replaceChildren(h('div.card', h('div.tile', { style: { background: p.color } }, p.emoji), h('h2', `À ${p.name} de dessiner`), h('p.muted', 'Les autres ferment les yeux 🙈'), h('button.btn.btn-primary.btn-lg.btn-block', { onclick: res }, 'Je suis prêt·e'))));
      if (!ctx.alive) return;
      drawings.push({ p, img: await draw(p) });
      if (!ctx.alive) return;
    }
    // Galerie anonyme
    const gallery = rng.shuffle(drawings);
    const vote = (title) => new Promise((res) => scene.replaceChildren(h('div', { style: { width: '100%', maxWidth: '900px', display: 'grid', gap: '14px', textAlign: 'center' } },
      h('div.big-msg', { style: { fontSize: 'clamp(22px,5vw,34px)' } }, title), h('p.muted', `Le mot était : « ${word} ». Mettez-vous d’accord et touchez un dessin.`),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(42vw,200px),1fr))', gap: '12px' } },
        gallery.map((d, i) => h('button', { onclick: () => { sfx.pop(); res(d); }, style: { padding: 0, border: '2px solid var(--border-strong)', borderRadius: '18px', overflow: 'hidden', background: '#fff', position: 'relative' } },
          h('img', { src: d.img, alt: `Dessin ${i + 1}`, style: { width: '100%', aspectRatio: '1', objectFit: 'cover' } }),
          h('span.chip', { style: { position: 'absolute', left: '8px', top: '8px', background: 'rgba(0,0,0,.55)', color: '#fff' } }, `#${i + 1}`)))))));
    const best = await vote('🏆 Le chef-d’œuvre ?'); if (!ctx.alive) return;
    const worst = await vote('💩 La catastrophe ?'); if (!ctx.alive) return;
    const mini = (d, tag) => h('div', { style: { display: 'grid', gap: '6px', justifyItems: 'center' } }, h('img', { src: d.img, alt: '', style: { width: '120px', aspectRatio: '1', borderRadius: '14px', background: '#fff' } }), h('b', `${tag} ${d.p.emoji} ${d.p.name}`));
    ctx.end({ emoji: '🎨', title: `${best.p.name}, artiste de la soirée !`, display: '🏆', label: `« ${word} »`, win: true,
      extra: h('div', { style: { display: 'flex', gap: '18px', justifyContent: 'center', flexWrap: 'wrap' } }, mini(best, '🏆'), mini(worst, '💩')) });

    function draw(p) {
      return new Promise((resolve) => {
        const size = 600;
        const cv = h('canvas', { width: size, height: size, style: { width: 'min(92vw,58vh,520px)', aspectRatio: '1', background: '#fff', borderRadius: '22px', touchAction: 'none', boxShadow: '0 20px 60px rgba(0,0,0,.45)' } });
        const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); g.lineCap = g.lineJoin = 'round';
        let ink = INK[0], width = 8, last = null, left = TIME;
        const timer = h('b.mono', { style: { fontSize: '28px' } }, `${left}`);
        const tools = h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' } });
        const paintTools = () => tools.replaceChildren(...INK.map((c) => h('button', { 'aria-label': c === '#ffffff' ? 'Gomme' : 'Couleur', onclick: () => { ink = c; width = c === '#ffffff' ? 30 : 8; paintTools(); }, style: { width: '40px', height: '40px', borderRadius: '50%', border: ink === c ? '3px solid #fff' : '3px solid transparent', background: c === '#ffffff' ? 'conic-gradient(#eee 0 25%,#ccc 0 50%,#eee 0 75%,#ccc 0)' : c, boxShadow: '0 0 0 1px rgba(255,255,255,.2)' } })));
        paintTools();
        const pt = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * size / r.width, (e.clientY - r.top) * size / r.height]; };
        cv.onpointerdown = (e) => { cv.setPointerCapture(e.pointerId); last = pt(e); g.fillStyle = ink; g.beginPath(); g.arc(last[0], last[1], width / 2, 0, 7); g.fill(); };
        cv.onpointermove = (e) => { if (!last) return; for (const ce of e.getCoalescedEvents?.() || [e]) { const q = pt(ce); g.strokeStyle = ink; g.lineWidth = width; g.beginPath(); g.moveTo(...last); g.lineTo(...q); g.stroke(); last = q; } };
        cv.onpointerup = () => (last = null);
        scene.replaceChildren(h('div', { style: { display: 'grid', gap: '12px', justifyItems: 'center' } },
          h('div', { style: { display: 'flex', gap: '14px', alignItems: 'center' } }, h('span', { style: { fontSize: '28px' } }, p.emoji), h('div', h('div.faint', { style: { fontSize: '12px', fontWeight: 700, letterSpacing: '.1em' } }, 'DESSINE'), h('b', { style: { fontSize: '20px' } }, word)), timer),
          cv, tools));
        sfx.go();
        const id = setInterval(() => {
          if (!ctx.alive) return clearInterval(id);
          left--; timer.textContent = left; if (left <= 3) { sfx.tick(); timer.style.color = 'var(--bad)'; }
          if (left <= 0) { clearInterval(id); sfx.bad(); vibrate(60); resolve(cv.toDataURL('image/jpeg', 0.7)); }
        }, 1000);
        ctx.onCleanup(() => clearInterval(id));
      });
    }
  },
};
