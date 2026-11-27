import Matter from 'matter-js';
import { createCanvas, loop, roundRect } from '../core/canvas.js';
import { sfx, vibrate } from '../core/sfx.js';
import { PCOLORS, PEMOJI } from '../core/players.js';

const { Engine, Bodies, Composite, Body } = Matter;
const WW = 400; // largeur du monde
export default {
  start(ctx) {
    const n = Number(ctx.mode || 1); const rng = ctx.rng;
    const players = Array.from({ length: n }, (_, i) => ({ name: n === 1 ? 'Toi' : `Joueur ${i + 1}`, color: PCOLORS[i], emoji: PEMOJI[i] }));
    const view = createCanvas(ctx.stage); ctx.onCleanup(view.destroy);
    const { g } = view;
    const engine = Engine.create({ gravity: { y: 1.1 } });
    const GROUND_Y = 0;
    const base = Bodies.rectangle(WW / 2, GROUND_Y + 20, 190, 40, { isStatic: true, friction: 1 });
    Composite.add(engine.world, base);
    const blocks = [];
    let turn = 0, placed = 0, state = 'aim', cur = null, settleT = 0, camY = -200, t = 0, top = GROUND_Y, over = false;
    let points = 0, combo = 0, bestCombo = 0, perfects = 0, pending = null, wind = 0, windT = 0, nextGust = 6, golds = 0, msg = null;
    const KINDS = { normal: { fr: 0.9, d: 0.002 }, glace: { fr: 0.04, d: 0.002, color: '#a5e8ff', tag: '🧊 Glace' }, lourd: { fr: 1, d: 0.006, color: '#6b7193', tag: '🪨 Lourd' }, or: { fr: 0.9, d: 0.002, color: '#ffd23f', tag: '⭐ Doré +30' } };
    const SHAPES = ['rect', 'rect', 'rect', 'barre', 'hex', 'tri', 'cube'];
    const say = (text, color = '#fff') => (msg = { text, color, t: 1.4 });
    const topBlock = () => blocks.reduce((a, b) => (!a || b.bounds.min.y < a.bounds.min.y ? b : a), null);
    const newBlock = () => {
      const shape = placed < 3 ? 'rect' : rng.pick(SHAPES);
      const w = shape === 'barre' ? rng.pick([130, 150]) : shape === 'cube' ? 44 : shape === 'hex' || shape === 'tri' ? rng.pick([28, 34]) : rng.pick([50, 60, 70, 80, 100, 120]);
      const hgt = shape === 'barre' ? 18 : shape === 'cube' ? 44 : rng.pick([24, 30, 36, 44]);
      const kind = placed < 5 ? 'normal' : rng.pick(['normal', 'normal', 'normal', 'normal', 'glace', 'lourd', 'or']);
      cur = { w, h: hgt, shape, kind, x: WW / 2, phase: rng.float(0, 6), color: KINDS[kind].color || players[turn % n].color };
      if (KINDS[kind].tag) say(KINDS[kind].tag, KINDS[kind].color);
      ctx.hud({ turn: n > 1 ? `${players[turn % n].emoji} ${players[turn % n].name}` : null, h: `${placed} bloc${placed > 1 ? 's' : ''}`, pts: n === 1 ? `${points} pts` : null, combo: combo > 1 ? `🔥 ×${combo}` : null });
    };
    const dropY = () => top - 170;
    const drop = () => {
      if (state !== 'aim' || over) return;
      const K = KINDS[cur.kind]; const opt = { friction: K.fr, frictionStatic: K.fr * 1.3, restitution: 0.02, density: K.d };
      const b = cur.shape === 'hex' ? Bodies.polygon(cur.x, dropY(), 6, cur.w, opt) : cur.shape === 'tri' ? Bodies.polygon(cur.x, dropY(), 3, cur.w * 1.2, opt) : Bodies.rectangle(cur.x, dropY(), cur.w, cur.h, { ...opt, chamfer: { radius: 4 } });
      const tb = topBlock(); const refX = tb ? tb.position.x : WW / 2;
      pending = { perfect: Math.abs(cur.x - refX) < 7, kind: cur.kind };
      b.color = cur.color; b.owner = turn % n; b.kind = cur.kind; blocks.push(b); Composite.add(engine.world, b);
      state = 'falling'; settleT = 0; sfx.tap(); vibrate(10);
    };
    ctx.on(view.canvas, 'pointerdown', drop);
    ctx.on(window, 'keydown', (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); drop(); } });

    const stop = loop((dt) => {
      t += dt;
      Engine.update(engine, Math.min(dt, 1 / 30) * 1000);
      if (msg) { msg.t -= dt; if (msg.t <= 0) msg = null; }
      // Rafales de vent à partir de 8 blocs : elles poussent le bloc qui tombe.
      if (placed >= 8 && !over) { nextGust -= dt; if (nextGust <= 0) { wind = rng.pick([-1, 1]) * rng.float(0.6, 1 + placed * 0.03); windT = 2.2; nextGust = rng.float(5, 9); say(`💨 Vent ${wind > 0 ? '→' : '←'}`, '#4cc9f0'); } }
      if (windT > 0) { windT -= dt; if (windT <= 0) wind = 0; }
      if (wind && state === 'falling') { const fb = blocks[blocks.length - 1]; if (fb && !fb.isStatic) Body.applyForce(fb, fb.position, { x: wind * fb.mass * 0.00012, y: 0 }); }
      if (state === 'aim') { const amp = 70 + Math.min(90, placed * 8); const sp = 1.3 + placed * 0.08; cur.x = WW / 2 + Math.sin(t * sp + cur.phase) * amp; }
      // Effondrement : un bloc tombe sous le socle
      const fallen = blocks.find((b) => b.position.y > GROUND_Y + 60);
      if (fallen && !over) { over = true; sfx.boom(); vibrate([80, 40, 160]); ctx.shake(10); ctx.timeout(() => { stop(); finish(); }, 1400); }
      if (state === 'falling' && !over) {
        const last = blocks[blocks.length - 1];
        const moving = blocks.some((b) => b.speed > 0.25 || Math.abs(b.angularVelocity) > 0.02);
        settleT = moving ? settleT : settleT + dt;
        if (settleT > 0.45 || (last && last.position.y > dropY() + 40 && !moving)) {
          placed++; sfx.ok();
          let gain = 10;
          if (pending?.perfect) {
            combo++; perfects++; bestCombo = Math.max(bestCombo, combo); gain += 15 * combo; sfx.combo?.(combo);
            say(combo > 1 ? `PARFAIT ×${combo} !` : 'PARFAIT !', '#3ddc97'); ctx.flash('rgba(61,220,151,.18)');
            // 3 parfaits d'affilée : le bas de la tour est cimenté.
            if (combo % 3 === 0) { blocks.slice(0, -2).forEach((b) => !b.isStatic && Body.setStatic(b, true)); ctx.timeout(() => say('🧱 Ciment ! La base est fixée', '#ffd23f'), 700); vibrate([20, 30, 20]); }
          } else combo = 0;
          if (pending?.kind === 'or') { gain += 30; golds++; }
          points += gain; pending = null;
          top = Math.min(GROUND_Y, ...blocks.map((b) => b.bounds.min.y));
          turn++; state = 'aim'; newBlock();
        }
      }
      // Caméra
      const want = Math.min(-200, top - 120);
      camY += (want - camY) * Math.min(1, dt * 3);
      draw();
    });
    ctx.onCleanup(() => { stop(); Engine.clear(engine); });

    function draw() {
      const s = Math.min(view.w / WW, view.h / 640);
      const ox = (view.w - WW * s) / 2, oy = view.h * 0.62;
      g.clearRect(0, 0, view.w, view.h);
      g.save(); g.translate(ox, oy); g.scale(s, s); g.translate(0, -camY - 200);
      // repères de hauteur
      g.font = '600 12px Outfit Variable, sans-serif'; g.fillStyle = 'rgba(255,255,255,.25)'; g.strokeStyle = 'rgba(255,255,255,.06)';
      for (let y = GROUND_Y; y > camY - 900; y -= 100) { g.beginPath(); g.moveTo(-400, y); g.lineTo(WW + 400, y); g.stroke(); if (y < GROUND_Y) g.fillText(`${(-y / 100).toFixed(0)} m`, 6, y - 4); }
      // socle
      g.fillStyle = '#2a2f5a'; roundRect(g, base.bounds.min.x, base.bounds.min.y, 190, 600, 10); g.fill();
      g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(base.bounds.min.x, base.bounds.min.y, 190, 4);
      // blocs
      for (const b of blocks) {
        const v = b.vertices;
        g.fillStyle = b.color; g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 10;
        g.beginPath(); v.forEach((p, k) => (k ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); g.fill(); g.shadowBlur = 0;
        g.strokeStyle = b.isStatic ? 'rgba(255,210,63,.55)' : 'rgba(255,255,255,.22)'; g.lineWidth = 2; g.stroke();
        if (b.kind === 'or') { g.fillStyle = '#fff'; g.font = '16px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⭐', b.position.x, b.position.y); }
      }
      // bloc à lâcher + guide
      if (state === 'aim' && cur && !over) {
        const y = dropY();
        g.strokeStyle = 'rgba(255,255,255,.18)'; g.setLineDash([6, 8]); g.beginPath(); g.moveTo(cur.x, y); g.lineTo(cur.x, top); g.stroke(); g.setLineDash([]);
        g.strokeStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(cur.x, y - 120); g.lineTo(cur.x, y - cur.h / 2); g.stroke();
        g.fillStyle = cur.color; g.shadowColor = cur.color; g.shadowBlur = 20;
        if (cur.shape === 'hex' || cur.shape === 'tri') { const k = cur.shape === 'hex' ? 6 : 3, r = cur.shape === 'hex' ? cur.w : cur.w * 1.2; g.beginPath(); for (let i = 0; i < k; i++) { const a = (i / k) * Math.PI * 2 + (k === 3 ? Math.PI / 6 : 0); i ? g.lineTo(cur.x + Math.cos(a) * r, y + Math.sin(a) * r) : g.moveTo(cur.x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); g.fill(); }
        else { roundRect(g, cur.x - cur.w / 2, y - cur.h / 2, cur.w, cur.h, 6); g.fill(); }
        g.shadowBlur = 0;
        // Repère « parfait » : le centre du bloc du dessus
        const tb = topBlock(); const rx = tb ? tb.position.x : WW / 2; g.fillStyle = Math.abs(cur.x - rx) < 7 ? '#3ddc97' : 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(rx, top - 6, 4, 0, 7); g.fill();
      }
      g.restore();
      if (msg) { g.globalAlpha = Math.min(1, msg.t * 2); g.fillStyle = msg.color; g.font = '800 26px Outfit Variable, sans-serif'; g.textAlign = 'center'; g.fillText(msg.text, view.w / 2, view.h * 0.2 - (1.4 - msg.t) * 20); g.globalAlpha = 1; }
      if (wind) { g.fillStyle = 'rgba(76,201,240,.8)'; g.font = '700 18px Outfit Variable, sans-serif'; g.textAlign = 'center'; g.fillText(wind > 0 ? '💨 → → →' : '← ← ← 💨', view.w / 2, view.h * 0.2 + 34); }
      if (state === 'aim' && !over) { g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '600 15px Outfit Variable, sans-serif'; g.textAlign = 'center'; g.fillText(n > 1 ? `${players[turn % n].name} : touche pour lâcher` : 'Touche pour lâcher le bloc', view.w / 2, view.h - 24); }
    }
    function finish() {
      const hm = (-top / 100).toFixed(1).replace('.', ',');
      if (n === 1) return ctx.end({
        score: points, display: `${points} pts`, emoji: '🧱', title: placed >= 20 ? 'Gratte-ciel !' : placed >= 12 ? 'Architecte de génie' : placed >= 6 ? 'Belle tour !' : 'Patatras !',
        label: `${placed} blocs · ${hm} m · ${perfects} parfait${perfects > 1 ? 's' : ''}${golds ? ` · ${golds} ⭐` : ''}`, win: placed >= 12,
        feats: [placed >= 20 && 'gratteciel', bestCombo >= 5 && 'orfevre', -top >= 500 && 'nuages'].filter(Boolean),
      });
      const loser = players[(state === 'aim' ? turn - 1 + n : turn) % n];
      ctx.end({ emoji: '💥', display: loser.emoji, title: `${loser.name} a fait tomber la tour !`, label: `${placed} blocs posés avant la chute · ${hm} m`, win: true, multi: true });
    }
    newBlock();
  },
};
