import { h } from '../core/dom.js';
import { createCanvas, loop, roundRect } from '../core/canvas.js';
import { sfx, vibrate } from '../core/sfx.js';
import { makeRng, todayKey } from '../core/rng.js';
import { playerSetup } from '../core/players.js';
import { scoreTable } from './kit.js';

const CW = 300, CH = 500, BR = 6, HR = 10, MAXV = 950;
// Trous : départ, trou, blocs [x,y,w,h], sable/eau [x,y,w,h], plots [x,y,r], moulin {x,y,len,spd}
const COURSE = [
  { name: 'Tout droit', start: [150, 440], hole: [150, 90] },
  { name: 'Le mur', start: [150, 440], hole: [150, 90], boxes: [[70, 230, 160, 22]] },
  { name: 'Le bunker', start: [80, 440], hole: [210, 100], sand: [[150, 130, 120, 90]], boxes: [[0, 300, 150, 16]] },
  { name: 'Le pont', start: [150, 450], hole: [150, 80], water: [[10, 230, 115, 70], [175, 230, 115, 70]] },
  { name: 'Le flipper', start: [150, 450], hole: [150, 80], bumpers: [[100, 260, 20], [200, 260, 20], [150, 180, 18]] },
  { name: 'Le moulin', start: [150, 450], hole: [150, 90], mill: { x: 150, y: 220, len: 70, spd: 1.6 }, boxes: [[10, 210, 60, 20], [230, 210, 60, 20]] },
  { name: 'La bande', start: [60, 450], hole: [70, 80], boxes: [[10, 230, 190, 20], [190, 120, 20, 130]] },
  { name: 'Le couloir', start: [150, 460], hole: [150, 60], boxes: [[10, 140, 100, 220], [190, 140, 100, 220]], sand: [[110, 250, 80, 40]], bumpers: [[150, 120, 12]] },
  { name: 'La finale', start: [240, 460], hole: [70, 80], water: [[10, 280, 160, 60]], sand: [[40, 120, 70, 40]], mill: { x: 200, y: 180, len: 60, spd: -2.1 } },
];
const inRect = (x, y, r) => x > r[0] && x < r[0] + r[2] && y > r[1] && y < r[1] + r[3];

function dailyCourse(R) {
  return Array.from({ length: 9 }, (_, i) => {
    const hole = [R.float(50, 250), R.float(60, 130)], start = [R.float(60, 240), 450];
    const c = { name: `Trou du jour ${i + 1}`, start, hole, boxes: [], sand: [], water: [], bumpers: [] };
    const n = 1 + Math.min(3, Math.floor(i / 2));
    for (let k = 0; k < n; k++) {
      const t = R.pick(['box', 'sand', 'water', 'bump', 'mill']), y = R.float(170, 360);
      if (t === 'box') c.boxes.push([R.float(10, 170), y, R.float(60, 120), 18]);
      if (t === 'sand') c.sand.push([R.float(20, 200), y, R.float(50, 90), R.float(30, 60)]);
      if (t === 'water') c.water.push([R.float(10, 180), y, R.float(60, 110), 40]);
      if (t === 'bump') c.bumpers.push([R.float(50, 250), y, R.float(12, 22)]);
      if (t === 'mill' && !c.mill) c.mill = { x: R.float(90, 210), y: R.float(180, 320), len: 55, spd: R.pick([-1, 1]) * R.float(1.2, 2.2) };
    }
    return c;
  });
}

export default {
  async start(ctx) {
    const mode = ctx.mode || 'parcours', duo = mode === 'duo';
    let players = [{ name: 'Toi', emoji: '🙂', color: '#fff' }];
    if (duo) { players = await playerSetup(ctx.stage, { min: 2, max: 4, title: 'Qui joue ?', cta: 'Au départ ⛳' }); if (!ctx.alive) return; }
    players.forEach((p) => (p.pts = 0));
    const holes = mode === 'jour' ? dailyCourse(makeRng('golf-' + todayKey())) : COURSE;
    const view = createCanvas(ctx.stage, { onResize: () => {} }); ctx.onCleanup(view.destroy);
    const { g } = view;
    const label = h('div', { style: { position: 'absolute', top: '8px', left: 0, right: 0, textAlign: 'center', zIndex: 3, pointerEvents: 'none', fontWeight: 800 } });
    const next = h('button.btn.btn-primary.btn-lg', { style: { position: 'absolute', bottom: '14px', left: '50%', transform: 'translateX(-50%)', zIndex: 3, display: 'none' } });
    ctx.stage.append(label, next);
    let hi = 0, pi = 0, ball = null, phase = 'aim', drag = null, t = 0, aces = 0, millAce = false, splash = 0, trail = [];
    const H = () => holes[hi];
    const geo = () => { const s = Math.min(view.w / CW, (view.h - 50) / CH); return { s, ox: (view.w - CW * s) / 2, oy: 40 + (view.h - 50 - CH * s) / 2 }; };
    const toW = (p) => { const { s, ox, oy } = geo(); return { x: (p.x - ox) / s, y: (p.y - oy) / s }; };
    const blades = () => { const m = H().mill; if (!m) return []; const a = t * m.spd; return [0, Math.PI / 2].map((o) => { const c = Math.cos(a + o) * m.len, sn = Math.sin(a + o) * m.len; return [m.x - c, m.y - sn, m.x + c, m.y + sn]; }); };

    const setup = () => {
      const c = H(); ball = { x: c.start[0], y: c.start[1], vx: 0, vy: 0 }; phase = 'aim'; next.style.display = 'none'; trail = [];
      const p = players[pi];
      label.replaceChildren(h('div.faint', { style: { fontSize: '12px', letterSpacing: '.1em' } }, `TROU ${hi + 1}/9 · ${c.name.toUpperCase()}`), duo ? h('div', { style: { color: p.color } }, `${p.emoji} ${p.name}, à toi`) : h('div', 'Tire en arrière pour viser'));
      ctx.hud({ pts: duo ? null : `${players[0].pts} pts`, hole: `⛳ ${hi + 1}/9` });
    };
    ctx.on(view.canvas, 'pointerdown', (e) => { if (phase !== 'aim') return; drag = { a: toW(view.pos(e)), b: toW(view.pos(e)) }; view.canvas.setPointerCapture?.(e.pointerId); });
    ctx.on(view.canvas, 'pointermove', (e) => { if (drag) drag.b = toW(view.pos(e)); });
    ctx.on(view.canvas, 'pointerup', () => {
      if (!drag || phase !== 'aim') return; const dx = drag.a.x - drag.b.x, dy = drag.a.y - drag.b.y; drag = null;
      const len = Math.hypot(dx, dy); if (len < 8) return;
      const pw = Math.min(1, len / 160) * MAXV; ball.vx = (dx / len) * pw; ball.vy = (dy / len) * pw; phase = 'roll'; sfx.pop(); vibrate(12);
    });

    const collide = (nx, ny, d, bounce = 0.75, boost = 0) => {
      const vn = ball.vx * nx + ball.vy * ny; ball.x += nx * d; ball.y += ny * d;
      if (vn < 0) { ball.vx -= (1 + bounce) * vn * nx; ball.vy -= (1 + bounce) * vn * ny; if (boost) { ball.vx += nx * boost; ball.vy += ny * boost; } if (-vn > 60) { sfx.tick(); vibrate(4); } }
    };
    const physics = (dt) => {
      const c = H();
      const sand = (c.sand || []).some((r) => inRect(ball.x, ball.y, r));
      const sp = Math.hypot(ball.vx, ball.vy);
      const dec = Math.min(sp, (sand ? 900 : 70) * dt + sp * (sand ? 2.5 : 0.75) * dt);
      if (sp > 0) { ball.vx -= (ball.vx / sp) * dec; ball.vy -= (ball.vy / sp) * dec; }
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x < 10 + BR) collide(1, 0, 10 + BR - ball.x); if (ball.x > CW - 10 - BR) collide(-1, 0, ball.x - (CW - 10 - BR));
      if (ball.y < 10 + BR) collide(0, 1, 10 + BR - ball.y); if (ball.y > CH - 10 - BR) collide(0, -1, ball.y - (CH - 10 - BR));
      for (const b of c.boxes || []) {
        const qx = Math.max(b[0], Math.min(ball.x, b[0] + b[2])), qy = Math.max(b[1], Math.min(ball.y, b[1] + b[3]));
        const dx = ball.x - qx, dy = ball.y - qy, d = Math.hypot(dx, dy);
        if (d < BR && d > 1e-6) collide(dx / d, dy / d, BR - d);
        else if (d <= 1e-6) collide(0, ball.vy > 0 ? -1 : 1, BR);
      }
      for (const [x, y, r] of c.bumpers || []) { const dx = ball.x - x, dy = ball.y - y, d = Math.hypot(dx, dy); if (d < r + BR) { collide(dx / d, dy / d, r + BR - d, 0.9, 120); ctx.flash('rgba(255,210,63,.08)'); } }
      for (const [x1, y1, x2, y2] of blades()) {
        const vx = x2 - x1, vy = y2 - y1, k = Math.max(0, Math.min(1, ((ball.x - x1) * vx + (ball.y - y1) * vy) / (vx * vx + vy * vy)));
        const qx = x1 + vx * k, qy = y1 + vy * k, dx = ball.x - qx, dy = ball.y - qy, d = Math.hypot(dx, dy);
        if (d < BR + 3 && d > 1e-6) { const m = c.mill; const tv = m.spd * Math.hypot(qx - m.x, qy - m.y); collide(dx / d, dy / d, BR + 3 - d, 0.6, Math.abs(tv) * 0.8); }
      }
      // Eau : plouf
      if ((c.water || []).some((r) => inRect(ball.x, ball.y, r))) { splash = 1; ball.vx = ball.vy = 0; sfx.bad(); vibrate([30, 30, 60]); return finishShot('eau'); }
      // Trou
      const hx = c.hole[0] - ball.x, hy = c.hole[1] - ball.y, hd = Math.hypot(hx, hy), s2 = Math.hypot(ball.vx, ball.vy);
      if (hd < HR) { if (s2 < 420) { ball.x = c.hole[0]; ball.y = c.hole[1]; ball.vx = ball.vy = 0; return finishShot('trou'); } ball.vx += (hx / hd) * 900 * dt; ball.vy += (hy / hd) * 900 * dt; }
      if (s2 < 5) { ball.vx = ball.vy = 0; finishShot('stop'); }
    };
    const finishShot = (why) => {
      if (phase !== 'roll') return; phase = 'done';
      const c = H(), p = players[pi];
      const d = Math.hypot(c.hole[0] - ball.x, c.hole[1] - ball.y);
      const pts = why === 'trou' ? 100 : why === 'eau' ? 0 : Math.max(0, Math.round(70 - d * 0.35));
      p.pts += pts;
      if (why === 'trou') { aces++; if (c.mill) millAce = true; sfx.win(); ctx.flash('rgba(61,220,151,.35)'); vibrate([20, 40, 20, 40, 60]); ctx.pop('⛳ TROU EN UN !', view.w / 2, view.h * 0.4, '#3ddc97', 34); }
      else if (why === 'eau') ctx.pop('💦 Plouf ! +0', view.w / 2, view.h * 0.4, '#4cc9f0', 28);
      else { (pts >= 50 ? sfx.ok : sfx.tick)(); ctx.pop(`+${pts}`, view.w / 2, view.h * 0.4, pts >= 50 ? '#ffd23f' : '#fff', 30); }
      const lastP = pi === players.length - 1, lastH = hi === holes.length - 1;
      next.textContent = !lastP ? `À ${players[pi + 1].emoji} ${players[pi + 1].name}` : lastH ? 'Résultats' : 'Trou suivant';
      ctx.timeout(() => (next.style.display = ''), 600);
      ctx.hud({ pts: duo ? null : `${players[0].pts} pts` });
    };
    next.onclick = () => {
      if (pi < players.length - 1) pi++; else { pi = 0; hi++; }
      if (hi >= holes.length) return finish();
      setup();
    };
    const finish = () => {
      if (duo) { const top = [...players].sort((a, b) => b.pts - a.pts)[0]; return ctx.end({ multi: true, win: true, emoji: '⛳', display: top.emoji, title: `${top.name} remporte le parcours !`, label: `9 trous · ${aces} trou${aces > 1 ? 's' : ''} en un au total`, extra: scoreTable(players) }); }
      const s = players[0].pts;
      ctx.end({ score: s, display: `${s} pts`, emoji: '⛳', board: mode === 'jour' ? 'jour' : null, title: s >= 700 ? 'Pro du green' : s >= 450 ? 'Joli swing' : 'Le gazon est glissant', label: `9 trous · ${aces} trou${aces > 1 ? 's' : ''} en un`, feats: [aces >= 1 && 'trou', aces >= 3 && 'trois', millAce && 'moulin'].filter(Boolean) });
    };

    const draw = () => {
      const { s, ox, oy } = geo(); const c = H();
      g.fillStyle = '#0f3d2a'; g.fillRect(0, 0, view.w, view.h);
      g.save(); g.translate(ox, oy); g.scale(s, s);
      g.fillStyle = '#6b4a2b'; roundRect(g, 0, 0, CW, CH, 14); g.fill();
      const grass = g.createLinearGradient(0, 0, 0, CH); grass.addColorStop(0, '#2fbf71'); grass.addColorStop(1, '#23a35d');
      g.fillStyle = grass; roundRect(g, 10, 10, CW - 20, CH - 20, 8); g.fill();
      g.fillStyle = 'rgba(255,255,255,.04)'; for (let y = 10; y < CH - 10; y += 40) g.fillRect(10, y, CW - 20, 20);
      for (const r of c.sand || []) { g.fillStyle = '#e8d28a'; roundRect(g, r[0], r[1], r[2], r[3], 14); g.fill(); }
      for (const r of c.water || []) { g.fillStyle = '#2b7de9'; roundRect(g, r[0], r[1], r[2], r[3], 10); g.fill(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5; for (let k = 0; k < 3; k++) { g.beginPath(); const yy = r[1] + r[3] * (0.3 + k * 0.2); for (let x = r[0] + 8; x < r[0] + r[2] - 8; x += 4) g.lineTo(x, yy + Math.sin(x * 0.2 + t * 3) * 2); g.stroke(); } }
      for (const b of c.boxes || []) { g.fillStyle = '#8a5a34'; g.fillRect(b[0], b[1], b[2], b[3]); g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(b[0], b[1], b[2], 3); }
      for (const [x, y, r] of c.bumpers || []) { g.fillStyle = '#ff5c7a'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.stroke(); }
      // Trou + drapeau
      g.fillStyle = '#0b1a12'; g.beginPath(); g.arc(c.hole[0], c.hole[1], HR, 0, 7); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(c.hole[0], c.hole[1]); g.lineTo(c.hole[0], c.hole[1] - 36); g.stroke();
      g.fillStyle = '#ff3d5a'; g.beginPath(); g.moveTo(c.hole[0], c.hole[1] - 36); g.lineTo(c.hole[0] + 18 + Math.sin(t * 4) * 2, c.hole[1] - 30); g.lineTo(c.hole[0], c.hole[1] - 24); g.fill();
      if (c.mill) { g.fillStyle = '#c05a3a'; g.beginPath(); g.arc(c.mill.x, c.mill.y, 9, 0, 7); g.fill(); g.strokeStyle = '#f5f5f5'; g.lineWidth = 6; g.lineCap = 'round'; for (const [x1, y1, x2, y2] of blades()) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); } }
      // Trace, balle, visée
      g.fillStyle = 'rgba(255,255,255,.25)'; for (const q of trail) { g.beginPath(); g.arc(q[0], q[1], 2, 0, 7); g.fill(); }
      if (splash > 0) { g.strokeStyle = `rgba(255,255,255,${splash})`; g.lineWidth = 2; g.beginPath(); g.arc(ball.x, ball.y, 30 * (1 - splash) + 6, 0, 7); g.stroke(); }
      else if (!(phase === 'done' && ball.x === c.hole[0] && ball.y === c.hole[1])) { g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(ball.x + 2, ball.y + 3, BR, 0, 7); g.fill(); g.fillStyle = players[pi].color || '#fff'; g.beginPath(); g.arc(ball.x, ball.y, BR, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke(); }
      if (drag && phase === 'aim') {
        const dx = drag.a.x - drag.b.x, dy = drag.a.y - drag.b.y, len = Math.hypot(dx, dy), k = Math.min(1, len / 160);
        if (len > 4) {
          g.fillStyle = `hsl(${120 - k * 120},90%,60%)`;
          for (let i = 1; i <= 8; i++) { const f = (i / 8) * (40 + k * 130); g.globalAlpha = 1 - i / 10; g.beginPath(); g.arc(ball.x + (dx / len) * f, ball.y + (dy / len) * f, 3.5, 0, 7); g.fill(); }
          g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(ball.x - 22, ball.y + 14, 44, 6); g.fillStyle = `hsl(${120 - k * 120},90%,60%)`; g.fillRect(ball.x - 22, ball.y + 14, 44 * k, 6);
        }
      }
      g.restore();
    };
    setup();
    const stop = loop((dt) => {
      t += dt; splash = Math.max(0, splash - dt * 1.5);
      if (phase === 'roll') { for (let i = 0; i < 6 && phase === 'roll'; i++) physics(dt / 6); if (Math.floor(t * 30) % 2 === 0) { trail.push([ball.x, ball.y]); if (trail.length > 40) trail.shift(); } }
      draw();
    });
    ctx.onCleanup(stop);
  },
};
