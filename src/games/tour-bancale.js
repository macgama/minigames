import Matter from 'matter-js';
import { createCanvas, loop, roundRect } from '../core/canvas.js';
import { sfx, vibrate } from '../core/sfx.js';
import { rng } from '../core/rng.js';
import { PCOLORS, PEMOJI } from '../core/players.js';

const { Engine, Bodies, Composite, Body } = Matter;
const WW = 400; // largeur du monde
export default {
  start(ctx) {
    const n = Number(ctx.mode || 1);
    const players = Array.from({ length: n }, (_, i) => ({ name: n === 1 ? 'Toi' : `Joueur ${i + 1}`, color: PCOLORS[i], emoji: PEMOJI[i] }));
    const view = createCanvas(ctx.stage); ctx.onCleanup(view.destroy);
    const { g } = view;
    const engine = Engine.create({ gravity: { y: 1.1 } });
    const GROUND_Y = 0;
    const base = Bodies.rectangle(WW / 2, GROUND_Y + 20, 190, 40, { isStatic: true, friction: 1 });
    Composite.add(engine.world, base);
    const blocks = [];
    let turn = 0, placed = 0, state = 'aim', cur = null, settleT = 0, camY = -200, t = 0, top = GROUND_Y, over = false;
    const newBlock = () => {
      const w = rng.pick([50, 60, 70, 80, 100, 120]), hgt = rng.pick([24, 30, 36, 44]);
      cur = { w, h: hgt, x: WW / 2, phase: rng.float(0, 6), color: players[turn % n].color };
      ctx.hud({ turn: n > 1 ? `${players[turn % n].emoji} ${players[turn % n].name}` : null, h: `${placed} bloc${placed > 1 ? 's' : ''}` });
    };
    const dropY = () => top - 170;
    const drop = () => {
      if (state !== 'aim' || over) return;
      const b = Bodies.rectangle(cur.x, dropY(), cur.w, cur.h, { friction: 0.9, frictionStatic: 1.2, restitution: 0.02, density: 0.002, chamfer: { radius: 4 } });
      b.color = cur.color; b.owner = turn % n; blocks.push(b); Composite.add(engine.world, b);
      state = 'falling'; settleT = 0; sfx.tap(); vibrate(10);
    };
    ctx.on(view.canvas, 'pointerdown', drop);
    ctx.on(window, 'keydown', (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); drop(); } });

    const stop = loop((dt) => {
      t += dt;
      Engine.update(engine, Math.min(dt, 1 / 30) * 1000);
      if (state === 'aim') { const amp = 70 + Math.min(90, placed * 8); const sp = 1.3 + placed * 0.08; cur.x = WW / 2 + Math.sin(t * sp + cur.phase) * amp; }
      // Effondrement : un bloc tombe sous le socle
      const fallen = blocks.find((b) => b.position.y > GROUND_Y + 60);
      if (fallen && !over) { over = true; sfx.boom(); vibrate([80, 40, 160]); ctx.timeout(() => { stop(); finish(); }, 1400); }
      if (state === 'falling' && !over) {
        const last = blocks[blocks.length - 1];
        const moving = blocks.some((b) => b.speed > 0.25 || Math.abs(b.angularVelocity) > 0.02);
        settleT = moving ? settleT : settleT + dt;
        if (settleT > 0.45 || (last && last.position.y > dropY() + 40 && !moving)) {
          placed++; sfx.ok();
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
        g.save(); g.translate(b.position.x, b.position.y); g.rotate(b.angle);
        const w = b.bounds.max.x - b.bounds.min.x; const v = b.vertices; const bw = Math.hypot(v[1].x - v[0].x, v[1].y - v[0].y), bh = Math.hypot(v[2].x - v[1].x, v[2].y - v[1].y);
        g.fillStyle = b.color; g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 10; roundRect(g, -bw / 2, -bh / 2, bw, bh, 6); g.fill(); g.shadowBlur = 0;
        g.fillStyle = 'rgba(255,255,255,.25)'; roundRect(g, -bw / 2 + 4, -bh / 2 + 3, bw - 8, 5, 3); g.fill();
        g.restore(); void w;
      }
      // bloc à lâcher + guide
      if (state === 'aim' && cur && !over) {
        const y = dropY();
        g.strokeStyle = 'rgba(255,255,255,.18)'; g.setLineDash([6, 8]); g.beginPath(); g.moveTo(cur.x, y); g.lineTo(cur.x, top); g.stroke(); g.setLineDash([]);
        g.strokeStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(cur.x, y - 120); g.lineTo(cur.x, y - cur.h / 2); g.stroke();
        g.fillStyle = cur.color; g.shadowColor = cur.color; g.shadowBlur = 20; roundRect(g, cur.x - cur.w / 2, y - cur.h / 2, cur.w, cur.h, 6); g.fill(); g.shadowBlur = 0;
      }
      g.restore();
      if (state === 'aim' && !over) { g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '600 15px Outfit Variable, sans-serif'; g.textAlign = 'center'; g.fillText(n > 1 ? `${players[turn % n].name} : touche pour lâcher` : 'Touche pour lâcher le bloc', view.w / 2, view.h - 24); }
    }
    function finish() {
      if (n === 1) return ctx.end({ score: placed, display: `${placed} bloc${placed > 1 ? 's' : ''}`, emoji: '🧱', title: placed >= 15 ? 'Architecte de génie' : placed >= 8 ? 'Belle tour !' : 'Patatras !', label: `Hauteur max : ${(-top / 100).toFixed(1).replace('.', ',')} m`, win: placed >= 10, share: `🧱 Tour Bancale : ${placed} blocs empilés avant l’effondrement. À ton tour !` });
      const loser = players[(state === 'aim' ? turn - 1 + n : turn) % n];
      ctx.end({ emoji: '💥', display: loser.emoji, title: `${loser.name} a fait tomber la tour !`, label: `${placed} blocs posés avant la chute`, win: true, extra: null });
    }
    newBlock();
  },
};
