import { h } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { playerSetup } from '../core/players.js';

const WORDS = ['Un chat qui fait du ski', 'Une licorne', 'La tour Eiffel', 'Un dinosaure', 'Une pizza', 'Un astronaute', 'Un robot amoureux', 'Un pingouin en vacances', 'Une fusée', 'Un château fort', 'Un escargot pressé', 'Un vampire', 'Une baleine', 'Le Cervin', 'Un fantôme', 'Un hamburger géant', 'Une sirène', 'Un dragon', 'Un bonhomme de neige', 'Ton voisin de gauche',
  'Une vache qui fait du surf', 'Un pirate', 'Un arc-en-ciel', 'Une girafe à la piscine', 'Un extraterrestre', 'Un sapin de Noël', 'Un ninja', 'Une sorcière sur son balai', 'Un camion de pompiers', 'Un chien qui promène son maître', 'Un volcan', 'Une montgolfière', 'Un super-héros fatigué', 'Une raclette', 'Un panda qui fait du yoga', 'Un éléphant dans un ascenseur', 'Une tempête', 'Un chevalier', 'Un mouton qui compte les humains', 'Un roi sur son trône', 'Une moto', 'Un concert de rock', 'Une poule qui pond un œuf en or', 'Un zombie au supermarché', 'Une île déserte', 'Ton prof préféré', 'Une course de tortues', 'Un gâteau d’anniversaire', 'Un magicien', 'Un crocodile chez le dentiste'];
const PAIRS = [['Un chat', 'Un tigre'], ['Une pizza', 'Une tarte'], ['Une fusée', 'Un avion'], ['Un château', 'Une église'], ['Une baleine', 'Un requin'], ['Un dragon', 'Un dinosaure'], ['Le Cervin', 'Un volcan'], ['Une sirène', 'Un poisson'], ['Un vampire', 'Une chauve-souris'], ['Un vélo', 'Une trottinette'], ['Un bonhomme de neige', 'Un igloo'], ['Une guitare', 'Un violon'], ['Un hamburger', 'Un sandwich'], ['Une maison', 'Une tente'], ['Une pomme', 'Une cerise'], ['Un lion', 'Un chien'], ['Un hélicoptère', 'Un drone'], ['Une montre', 'Une boussole'], ['Un parapluie', 'Un champignon'], ['Une plage', 'Un désert']];
const INK = ['#1b1450', '#ff3d5a', '#3a8bff', '#2ecc71', '#ffb547', '#8d5524', '#ffffff'];
const TIME = 15;

export default {
  async start(ctx) {
    const R = ctx.rng, mode = ctx.mode || 'classic';
    const imp = mode === 'imposteur', ROUNDS = mode === 'tournoi' ? 3 : 1;
    const players = await playerSetup(ctx.stage, { min: imp ? 3 : 2, max: 8, title: 'Qui dessine ?', cta: imp ? 'Distribuer les mots' : 'Tirer le mot secret' });
    if (!ctx.alive) return;
    players.forEach((p) => (p.pts = 0));
    const scene = h('div.center-stage'); ctx.stage.append(scene);
    const words = R.shuffle(WORDS);
    const allDrawings = [];
    let lastBest = null, lastWorst = null;

    for (let round = 0; round < ROUNDS; round++) {
      const pair = R.pick(PAIRS); const swap = R.chance(0.5);
      const word = imp ? pair[swap ? 1 : 0] : words[round];
      const fake = imp ? pair[swap ? 0 : 1] : null;
      const impostor = imp ? R.pick(players) : null;
      const drawings = [];
      for (const p of players) {
        await new Promise((res) => scene.replaceChildren(h('div.card', { style: { textAlign: 'center' } }, ROUNDS > 1 ? h('p.faint', `Manche ${round + 1}/${ROUNDS}`) : null, h('div.tile', { style: { background: p.color, margin: '0 auto' } }, p.emoji), h('h2', `À ${p.name} de dessiner`), h('p.muted', 'Les autres ferment les yeux 🙈'), h('button.btn.btn-primary.btn-lg.btn-block', { onclick: res }, 'Je suis prêt·e'))));
        if (!ctx.alive) return;
        const myWord = p === impostor ? fake : word;
        drawings.push({ p, word: myWord, img: await draw(p, myWord) });
        if (!ctx.alive) return;
      }
      allDrawings.push(...drawings.map((d) => ({ ...d, round })));
      const gallery = R.shuffle(drawings);
      const vote = (title, sub) => new Promise((res) => scene.replaceChildren(h('div', { style: { width: '100%', maxWidth: '900px', display: 'grid', gap: '14px', textAlign: 'center' } },
        h('div.big-msg', { style: { fontSize: 'clamp(22px,5vw,34px)' } }, title), h('p.muted', sub),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(42vw,200px),1fr))', gap: '12px' } },
          gallery.map((d, i) => h('button', { onclick: () => { sfx.pop(); res(d); }, style: { padding: 0, border: '2px solid var(--border-strong)', borderRadius: '18px', overflow: 'hidden', background: '#fff', position: 'relative' } },
            h('img', { src: d.img, alt: `Dessin ${i + 1}`, style: { width: '100%', aspectRatio: '1', objectFit: 'cover' } }),
            h('span.chip', { style: { position: 'absolute', left: '8px', top: '8px', background: 'rgba(0,0,0,.55)', color: '#fff' } }, `#${i + 1}`)))))));
      if (imp) {
        const sus = await vote('🕵️ Qui avait un autre mot ?', 'Un des dessins ne colle pas tout à fait… Débattez, puis touchez le dessin suspect.'); if (!ctx.alive) return;
        const caught = sus.p === impostor;
        if (caught) players.forEach((p) => p !== impostor && (p.pts += 1)); else impostor.pts += 3;
        caught ? sfx.win() : sfx.lose(); ctx.flash(caught ? 'rgba(61,220,151,.3)' : 'rgba(255,61,90,.3)');
        return ctx.end({
          emoji: caught ? '🕵️' : '🎭', display: impostor.emoji, multi: true, win: true,
          title: caught ? `Démasqué·e : ${impostor.name} !` : `${impostor.name} vous a bien eus !`,
          label: `Le mot : « ${word} » · ${impostor.name} avait « ${fake} »`,
          extra: reveal(drawings, impostor),
        });
      }
      const best = await vote('🏆 Le chef-d’œuvre ?', `Le mot était : « ${word} ». Mettez-vous d’accord et touchez un dessin.`); if (!ctx.alive) return;
      const worst = await vote('💩 La catastrophe ?', 'Le plus… surprenant.'); if (!ctx.alive) return;
      best.p.pts += 2; worst.p.pts += 1; // la catastrophe vaut aussi un point : on rit, on gagne
      lastBest = best; lastWorst = worst; sfx.win();
      if (round < ROUNDS - 1) {
        await new Promise((res) => scene.replaceChildren(h('div.card', { style: { textAlign: 'center' } }, h('h2', `Après la manche ${round + 1}`), scoreTable(), h('p.faint', '🏆 +2 · 💩 +1'), h('button.btn.btn-primary.btn-lg.btn-block', { onclick: res }, 'Manche suivante'))));
        if (!ctx.alive) return;
      }
    }
    const ranking = [...players].sort((a, b) => b.pts - a.pts);
    const mini = (d, tag) => h('div', { style: { display: 'grid', gap: '6px', justifyItems: 'center' } }, h('img', { src: d.img, alt: '', style: { width: '120px', aspectRatio: '1', borderRadius: '14px', background: '#fff' } }), h('b', `${tag} ${d.p.emoji} ${d.p.name}`));
    ctx.end({
      emoji: '🎨', display: ROUNDS > 1 ? ranking[0].emoji : '🏆', win: true, multi: true,
      title: ROUNDS > 1 ? `${ranking[0].name} remporte le tournoi !` : `${lastBest.p.name}, artiste de la soirée !`,
      label: ROUNDS > 1 ? `${ranking[0].pts} points en 3 manches` : `« ${lastBest.word} »`,
      extra: h('div', { style: { display: 'grid', gap: '14px', width: '100%' } }, ROUNDS > 1 ? scoreTable() : h('div', { style: { display: 'flex', gap: '18px', justifyContent: 'center', flexWrap: 'wrap' } }, mini(lastBest, '🏆'), mini(lastWorst, '💩')), reveal(allDrawings)),
    });

    function scoreTable() {
      return h('div', { style: { display: 'grid', gap: '6px', width: '100%' } }, [...players].sort((a, b) => b.pts - a.pts).map((p, i) => h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '12px', background: i === 0 ? 'rgba(255,210,63,.14)' : 'rgba(255,255,255,.05)' } }, h('span', `${p.emoji} ${p.name}`), h('b', `${p.pts} pt${p.pts > 1 ? 's' : ''}`))));
    }
    // La révélation : qui a dessiné quoi
    function reveal(list, impostor) {
      return h('div', { style: { display: 'grid', gap: '8px', width: '100%' } }, h('p.faint', { style: { textAlign: 'center' } }, 'Qui a dessiné quoi :'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(90px,1fr))', gap: '8px' } }, list.map((d) => h('div', { style: { display: 'grid', gap: '4px', justifyItems: 'center', fontSize: '12px' } },
          h('img', { src: d.img, alt: '', style: { width: '100%', aspectRatio: '1', borderRadius: '10px', background: '#fff', outline: d.p === impostor ? '3px solid #ff3d5a' : 'none' } }), h('span', `${d.p.emoji} ${d.p.name}`)))));
    }

    function draw(p, word) {
      return new Promise((resolve) => {
        const size = 600;
        const cv = h('canvas', { width: size, height: size, style: { width: 'min(92vw,56vh,520px)', aspectRatio: '1', background: '#fff', borderRadius: '22px', touchAction: 'none', boxShadow: '0 20px 60px rgba(0,0,0,.45)' } });
        const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); g.lineCap = g.lineJoin = 'round';
        let ink = INK[0], thick = false, last = null, left = TIME; const undo = [];
        const width = () => (ink === '#ffffff' ? 34 : thick ? 18 : 7);
        const timer = h('b.mono', { style: { fontSize: '28px' } }, `${left}`);
        const tools = h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' } });
        const paintTools = () => tools.replaceChildren(...INK.map((c) => h('button', { 'aria-label': c === '#ffffff' ? 'Gomme' : 'Couleur', onclick: () => { ink = c; paintTools(); }, style: { width: '38px', height: '38px', borderRadius: '50%', border: ink === c ? '3px solid #fff' : '3px solid transparent', background: c === '#ffffff' ? 'conic-gradient(#eee 0 25%,#ccc 0 50%,#eee 0 75%,#ccc 0)' : c, boxShadow: '0 0 0 1px rgba(255,255,255,.2)' } })),
          h('button.btn.btn-sm', { onclick: () => { thick = !thick; paintTools(); } }, thick ? '● Épais' : '• Fin'),
          h('button.btn.btn-sm', { 'aria-label': 'Annuler', disabled: !undo.length, onclick: () => { const im = undo.pop(); if (im) g.putImageData(im, 0, 0); paintTools(); } }, '↶'));
        paintTools();
        const pt = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * size / r.width, (e.clientY - r.top) * size / r.height]; };
        cv.onpointerdown = (e) => { cv.setPointerCapture(e.pointerId); undo.push(g.getImageData(0, 0, size, size)); if (undo.length > 15) undo.shift(); if (undo.length === 1) paintTools(); last = pt(e); g.fillStyle = ink; g.beginPath(); g.arc(last[0], last[1], width() / 2, 0, 7); g.fill(); };
        cv.onpointermove = (e) => { if (!last) return; for (const ce of e.getCoalescedEvents?.() || [e]) { const q = pt(ce); g.strokeStyle = ink; g.lineWidth = width(); g.beginPath(); g.moveTo(...last); g.lineTo(...q); g.stroke(); last = q; } };
        cv.onpointerup = () => { last = null; paintTools(); };
        scene.replaceChildren(h('div', { style: { display: 'grid', gap: '10px', justifyItems: 'center' } },
          h('div', { style: { display: 'flex', gap: '14px', alignItems: 'center' } }, h('span', { style: { fontSize: '28px' } }, p.emoji), h('div', h('div.faint', { style: { fontSize: '12px', fontWeight: 700, letterSpacing: '.1em' } }, 'DESSINE'), h('b', { style: { fontSize: '20px' } }, word)), timer),
          cv, tools));
        sfx.go();
        const id = setInterval(() => {
          if (!ctx.alive) return clearInterval(id);
          left--; timer.textContent = left; if (left <= 3) { sfx.tick(); timer.style.color = 'var(--bad)'; }
          if (left <= 0) { clearInterval(id); sfx.bad(); vibrate(60); resolve(cv.toDataURL('image/jpeg', 0.6)); }
        }, 1000);
        ctx.onCleanup(() => clearInterval(id));
      });
    }
  },
};
