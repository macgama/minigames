import { h } from '../core/dom.js';
import { createCanvas, loop } from '../core/canvas.js';
import { sfx, vibrate } from '../core/sfx.js';
import { LEVELS, createSim, costOf, isRoad, beamLen, GRID } from './pont-sim.js';

const KEY = 'mg:pont';
const loadStars = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const saveStars = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
const MAX_LEN = 4.5;
const NAMES = ['Le ruisseau', 'La rivière', 'Le rocher', 'Le torrent', 'Les deux rives', 'Le grand fossé', 'Les deux piliers', 'Le canyon'];
const starsFor = (cost, budget) => 1 + (cost <= budget * 0.85) + (cost <= budget * 0.7);

export default {
  start(ctx) {
    const stars = loadStars();
    const total = () => LEVELS.reduce((s, _, i) => s + (stars[i] || 0), 0);
    let gotThree = false;
    const finish = () => {
      const done = LEVELS.filter((_, i) => stars[i] > 0).length;
      ctx.end({
        score: total(), display: `${total()} ⭐`, emoji: '🌉',
        title: done === LEVELS.length ? 'Bâtisseur de génie' : done >= 4 ? 'Ingénieur prometteur' : 'Apprenti charpentier',
        label: `${done}/${LEVELS.length} ponts réussis · ${total()}/${LEVELS.length * 3} étoiles`,
        feats: [gotThree && 'radin', stars[7] > 0 && 'canyon', done === LEVELS.length && 'tout'].filter(Boolean),
      });
    };

    // ——— Choix du niveau ———
    const picker = () => {
      ctx.stage.replaceChildren();
      ctx.hud({ stars: `${total()} ⭐` });
      const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px', width: 'min(92vw,460px)' } },
        LEVELS.map((lv, i) => {
          const open = i === 0 || stars[i - 1] > 0, s = stars[i] || 0;
          return h('button.btn', { disabled: !open, style: { flexDirection: 'column', padding: '14px 8px', minHeight: '86px', opacity: open ? 1 : 0.45 }, onclick: () => build(i) },
            h('b', `${open ? '' : '🔒 '}${i + 1}. ${NAMES[i]}`), h('span.faint', `${lv.w} m · ${lv.budget.toLocaleString('fr-CH')} CHF`), h('span', { style: { fontSize: '18px', letterSpacing: '2px' } }, '★'.repeat(s) + '☆'.repeat(3 - s)));
        }));
      ctx.stage.append(h('div.center-stage', { style: { gap: '14px', overflowY: 'auto' } },
        h('div.big-msg', { style: { fontSize: '26px' } }, 'Choisis un pont'),
        h('p.faint', { style: { maxWidth: '420px', textAlign: 'center', margin: 0 } }, '1 ⭐ si le camion passe · 2 ⭐ à 85 % du budget · 3 ⭐ à 70 %'),
        grid,
        h('button.btn.btn-primary.btn-lg', { onclick: finish }, `Terminer · ${total()} ⭐`)));
    };

    // ——— Construction et test ———
    const build = (li) => {
      ctx.stage.replaceChildren();
      const lv = LEVELS[li];
      let beams = [], hist = [], sel = null, sim = null, mode = 'edit', stopLoop = null, msgT = 0, msg = '';
      const view = createCanvas(ctx.stage, { onResize: () => draw() });
      const top = h('div', { style: { position: 'absolute', top: '8px', left: '8px', right: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', zIndex: 3, pointerEvents: 'none' } });
      const bar = h('div', { style: { position: 'absolute', bottom: '12px', left: '8px', right: '8px', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', zIndex: 3 } });
      ctx.stage.append(top, bar);
      const cleanup = () => { stopLoop?.(); view.destroy(); };
      ctx.onCleanup(cleanup);
      const leave = () => { cleanup(); picker(); };

      const geo = () => {
        const minX = -3, maxX = lv.w + 3, minY = -7, maxY = 6.5;
        const s = Math.min(view.w / (maxX - minX), (view.h - 130) / (maxY - minY));
        return { s, ox: (view.w - (maxX - minX) * s) / 2 - minX * s, oy: 56 + ((view.h - 130) - (maxY - minY) * s) / 2 - minY * s };
      };
      const P = (x, y) => { const { s, ox, oy } = geo(); return [ox + x * s, oy + y * s]; };
      const nodesGrid = [];
      for (let x = 0; x <= lv.w; x += GRID) for (let y = -6; y <= 4; y += GRID) nodesGrid.push([x, y]);
      const isAnchor = (p) => lv.anchors.some((a) => a[0] === p[0] && a[1] === p[1]);
      const used = () => { const s = new Set(); for (const b of beams) { s.add(b.a.join()); s.add(b.b.join()); } return s; };
      const cost = () => costOf(beams);

      const paintUI = () => {
        const c = cost(), over = c > lv.budget;
        top.replaceChildren(
          h('div', { style: { fontWeight: 800 } }, `${li + 1}. ${NAMES[li]}`),
          h('div', { style: { fontWeight: 900, fontSize: '18px', color: over ? 'var(--bad)' : c <= lv.budget * 0.7 ? 'var(--ok)' : c <= lv.budget * 0.85 ? '#ffd23f' : '' } }, `${c.toLocaleString('fr-CH')} / ${lv.budget.toLocaleString('fr-CH')} CHF`));
        if (mode === 'edit') bar.replaceChildren(
          h('button.btn', { onclick: leave }, '← Ponts'),
          h('button.btn', { disabled: !hist.length, onclick: () => { beams = hist.pop(); sel = null; sfx.tick(); refresh(); } }, '↶ Annuler'),
          h('button.btn', { disabled: !beams.length, onclick: () => { hist.push(beams); beams = []; sel = null; refresh(); } }, '🗑️ Tout'),
          h('button.btn.btn-primary', { disabled: over || !beams.some(isRoad), onclick: test }, over ? 'Trop cher !' : '🚚 Tester'));
      };
      const refresh = () => { paintUI(); draw(); };
      const say = (t) => { msg = t; msgT = performance.now(); draw(); };

      function draw() {
        const { g } = view; const { s } = geo();
        const sky = g.createLinearGradient(0, 0, 0, view.h); sky.addColorStop(0, '#1b2f5e'); sky.addColorStop(1, '#0b1630');
        g.fillStyle = sky; g.fillRect(0, 0, view.w, view.h);
        // Eau + falaises + rochers
        const [, wy] = P(0, 5.2); g.fillStyle = '#1d5fa8'; g.fillRect(0, wy, view.w, view.h - wy);
        g.fillStyle = '#6b4a2b';
        const cliff = (x0, x1) => { const [a, ty] = P(x0, 0); const [b] = P(x1, 0); g.fillRect(Math.min(a, b), ty, Math.abs(b - a), view.h - ty); };
        cliff(-40, 0); cliff(lv.w, lv.w + 40);
        g.fillStyle = '#3ddc97'; { const [a, ty] = P(-40, 0), [b] = P(0, 0); g.fillRect(a, ty - 3, b - a, 4); } { const [a, ty] = P(lv.w, 0), [b] = P(lv.w + 40, 0); g.fillRect(a, ty - 3, b - a, 4); }
        for (const a of lv.anchors) if (a[0] > 0 && a[0] < lv.w) { const [x, y] = P(a[0], a[1]); g.fillStyle = '#7a6250'; g.beginPath(); g.moveTo(x - s * 1.2, view.h); g.lineTo(x - s * 0.5, y); g.lineTo(x + s * 0.5, y); g.lineTo(x + s * 1.2, view.h); g.fill(); }
        // Grille
        if (mode === 'edit') {
          const u = used();
          for (const p of nodesGrid) { const [x, y] = P(p[0], p[1]); g.fillStyle = u.has(p.join()) ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.16)'; g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill(); }
          if (sel) { // Portée possible depuis le point choisi
            const [sx, sy] = P(sel[0], sel[1]); g.strokeStyle = 'rgba(255,210,63,.25)'; g.lineWidth = 1; g.beginPath(); g.arc(sx, sy, MAX_LEN * s, 0, 7); g.stroke();
          }
        }
        // Poutres
        const list = sim ? sim.links : beams.map((b) => ({ A: { x: b.a[0], y: b.a[1] }, B: { x: b.b[0], y: b.b[1] }, road: isRoad(b), strain: 0 }));
        for (const L of list) {
          if (L.broken) continue;
          const [ax, ay] = P(L.A.x, L.A.y), [bx, by] = P(L.B.x, L.B.y);
          const k = Math.min(1, L.strain || 0);
          g.strokeStyle = sim ? `hsl(${120 - k * 120},90%,${55 - k * 10}%)` : L.road ? '#555b6e' : '#c8914f';
          g.lineWidth = L.road ? Math.max(5, s * 0.32) : Math.max(3, s * 0.18); g.lineCap = 'round';
          g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
          if (L.road && !sim) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; g.setLineDash([4, 5]); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.setLineDash([]); }
        }
        // Morceaux cassés qui tombent
        if (sim) for (const f of sim.debris || []) { const [ax, ay] = P(f.x1, f.y1), [bx, by] = P(f.x2, f.y2); g.strokeStyle = 'rgba(255,90,90,.7)'; g.lineWidth = 3; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); }
        // Ancrages
        for (const a of lv.anchors) { const [x, y] = P(a[0], a[1]); g.fillStyle = '#ff5c7a'; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, Math.max(5, s * 0.22), 0, 7); g.fill(); g.stroke(); }
        if (sim) for (const n of sim.nodes) if (!n.fixed) { const [x, y] = P(n.x, n.y); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
        if (sel && mode === 'edit') { const [x, y] = P(sel[0], sel[1]); g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 10, 0, 7); g.stroke(); }
        // Camion
        const tr = sim ? sim.truck : { x: -2.2, y: 0, state: 'drive' };
        { const [x, y] = P(tr.x, tr.y); const L = 2.4 * s, H = 1.1 * s; g.save(); g.translate(x, y);
          if (tr.state === 'fall') g.rotate(Math.min(1.2, (tr.v || 0) * 0.08));
          else if (tr.link) g.rotate(Math.atan2(tr.link.B.y - tr.link.A.y, tr.link.B.x - tr.link.A.x));
          g.fillStyle = '#ff9f43'; g.fillRect(-L * 0.6, -H - 4, L * 0.75, H); g.fillStyle = '#4cc9f0'; g.fillRect(L * 0.17, -H * 0.85 - 4, L * 0.3, H * 0.85);
          g.fillStyle = '#111'; for (const wx of [-L * 0.42, L * 0.3]) { g.beginPath(); g.arc(wx, -4, Math.max(4, s * 0.22), 0, 7); g.fill(); }
          g.restore(); }
        if (msg && performance.now() - msgT < 1800) { g.fillStyle = 'rgba(0,0,0,.6)'; g.font = '700 15px Outfit, sans-serif'; const tw = g.measureText(msg).width + 24; g.fillRect(view.w / 2 - tw / 2, 50, tw, 30); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(msg, view.w / 2, 65); }
        if (mode === 'edit' && !beams.length) { g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '600 14px Outfit, sans-serif'; g.textAlign = 'center'; g.fillText('Touche un point rouge, puis un point voisin pour poser une poutre', view.w / 2, P(0, -6.6)[1]); }
      }

      // Toucher : choisir un point, puis un second pour poser la poutre ; toucher une poutre la supprime
      ctx.on(view.canvas, 'pointerdown', (e) => {
        if (mode !== 'edit') return;
        const p = view.pos(e); const { s } = geo();
        let best = null, bd = Infinity;
        for (const n of nodesGrid) { const [x, y] = P(n[0], n[1]); const d = Math.hypot(x - p.x, y - p.y); if (d < bd) { bd = d; best = n; } }
        if (bd > Math.max(18, s * 0.6)) {
          // Pas de point proche : supprimer la poutre touchée
          const i = beams.findIndex((b) => { const [ax, ay] = P(b.a[0], b.a[1]), [bx, by] = P(b.b[0], b.b[1]); const vx = bx - ax, vy = by - ay; const t = Math.max(0, Math.min(1, ((p.x - ax) * vx + (p.y - ay) * vy) / (vx * vx + vy * vy))); return Math.hypot(ax + vx * t - p.x, ay + vy * t - p.y) < 12; });
          if (i >= 0) { hist.push(beams); beams = beams.filter((_, k) => k !== i); sfx.pop(); vibrate(8); }
          sel = null; return refresh();
        }
        if (!sel) { if (isAnchor(best) || used().has(best.join())) { sel = best; sfx.tick(); } else say('Pars d’un point rouge ou d’une poutre déjà posée'); return draw(); }
        if (sel.join() === best.join()) { sel = null; return draw(); }
        const b = { a: sel, b: best };
        if (beamLen(b) > MAX_LEN) { say('Trop long ! Max 4 cases'); sfx.bad(); return; }
        if (beams.some((x) => (x.a.join() === b.a.join() && x.b.join() === b.b.join()) || (x.a.join() === b.b.join() && x.b.join() === b.a.join()))) { sel = best; return draw(); }
        if (isAnchor(sel) && isAnchor(best)) { say('Deux ancrages : inutile'); return; }
        hist.push(beams); beams = [...beams, b]; sel = best; sfx.pop(); vibrate(6);
        refresh();
      });

      const test = () => {
        if (mode !== 'edit') return;
        mode = 'test'; sel = null; sim = createSim(lv, beams); sim.debris = [];
        bar.replaceChildren(h('button.btn', { onclick: () => { stopLoop?.(); stopLoop = null; mode = 'edit'; sim = null; refresh(); } }, '✋ Arrêter'));
        sfx.go(); let acc = 0, ended = false, brokenN = 0;
        stopLoop = loop((dt) => {
          acc += dt;
          while (acc > 1 / 60 && !ended) {
            acc -= 1 / 60; const st = sim.step(1 / 60);
            const nb = sim.links.filter((l) => l.broken);
            if (nb.length > brokenN) { for (const l of nb.slice(brokenN)) sim.debris.push({ x1: l.A.x, y1: l.A.y, x2: l.B.x, y2: l.B.y, v: 0 }); brokenN = nb.length; sfx.bad(); vibrate(25); ctx.shake(5); }
            for (const f of sim.debris) { f.v += 9.8 / 60; f.y1 += f.v / 60; f.y2 += f.v / 60; }
            if (st === 'win') { ended = true; ctx.timeout(() => result(true), 300); }
            if (st === 'fall' && sim.truck.y > 6) { ended = true; result(false); }
          }
          draw();
        });
      };
      const result = (ok) => {
        stopLoop?.(); stopLoop = null;
        const c = cost();
        if (ok) {
          const st = starsFor(c, lv.budget); if (st === 3) gotThree = true;
          const prev = stars[li] || 0; if (st > prev) { stars[li] = st; saveStars(stars); }
          sfx.win(); ctx.flash('rgba(61,220,151,.3)'); vibrate([20, 30, 20]);
          ctx.pop('★'.repeat(st) + '☆'.repeat(3 - st), view.w / 2, view.h * 0.35, '#ffd23f', 44);
          say(st > prev && prev ? 'Nouveau record !' : st === 3 ? 'Pont parfait !' : `Encore ${st === 1 ? '15' : '30'} % moins cher pour l’étoile suivante`);
        } else { ctx.flash('rgba(255,61,90,.3)'); say('Le pont s’est effondré…'); }
        ctx.hud({ stars: `${total()} ⭐` });
        bar.replaceChildren(...[
          h('button.btn', { onclick: leave }, '← Ponts'),
          h('button.btn', { onclick: () => { mode = 'edit'; sim = null; refresh(); } }, ok ? '🔧 Améliorer' : '🔧 Réparer'),
          ok && li < LEVELS.length - 1 ? h('button.btn.btn-primary', { onclick: () => { cleanup(); build(li + 1); } }, 'Pont suivant →') : null,
          ok && li === LEVELS.length - 1 ? h('button.btn.btn-primary', { onclick: finish }, `Terminer · ${total()} ⭐`) : null].filter(Boolean));
      };
      refresh();
    };

    picker();
  },
};
