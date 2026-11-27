import { createCanvas, loop, roundRect } from '../core/canvas.js';
import { sfx, vibrate, tone } from '../core/sfx.js';

const LANES = [{ e: '🥁', c: '#ff5c7a', k: 'd' }, { e: '🎸', c: '#ffb547', k: 'f' }, { e: '🎹', c: '#4cc9f0', k: 'j' }, { e: '🔔', c: '#b388ff', k: 'k' }];
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];

export default {
  start(ctx) {
    const mode = ctx.mode || 'solo', duo = mode === 'duo', presto = mode === 'presto', R = ctx.rng;
    const BPM = presto ? 138 : 104, beat = 60 / BPM, TRAVEL = presto ? 1.25 : 1.7, BARS = presto ? 30 : 24;
    const view = createCanvas(ctx.stage, { onResize: () => {} }); ctx.onCleanup(view.destroy);
    const { g } = view;
    // Partition : 4 sections de plus en plus denses
    const notes = [];
    for (let bar = 0; bar < BARS; bar++) {
      const sec = Math.min(3, Math.floor(bar / (BARS / 4))), t0 = 2 + bar * 4 * beat;
      for (let s = 0; s < 16; s++) { // doubles-croches
        const t = t0 + (s * beat) / 4;
        if (s % 8 === 0) notes.push({ t, l: 0 });
        if (sec >= 1 && s % 8 === 4) notes.push({ t, l: 3 });
        if (s % 4 === 2 && R.float(0, 1) < 0.35 + sec * 0.15) notes.push({ t, l: 1, n: R.pick([0, 3, 5, 7]) });
        if (sec >= 2 && s % 2 === 0 && R.float(0, 1) < 0.18 + sec * 0.08) notes.push({ t, l: 2, n: R.pick(SCALE) });
        if (sec >= 3 && s === 14 && R.float(0, 1) < 0.5) notes.push({ t, l: 0 });
      }
    }
    notes.sort((a, b) => a.t - b.t);
    // Pas deux notes du même couloir trop proches
    const clean = []; const lastT = [-9, -9, -9, -9];
    for (const n of notes) if (n.t - lastT[n.l] > beat / 3) { clean.push(n); lastT[n.l] = n.t; }
    const song = clean; const END = song.at(-1).t + 2;
    let start = 0, score = 0, combo = 0, bestCombo = 0, perfRun = 0, bestPerf = 0, hits = 0, perfects = 0, judged = 0, over = false, fb = [];
    const flashes = [0, 0, 0, 0];
    const now = () => (performance.now() - start) / 1000;
    const play = (n) => {
      if (n.l === 0) tone(90, 0.18, { type: 'sine', vol: 0.35, slide: -50 });
      else if (n.l === 1) tone(110 * 2 ** ((n.n || 0) / 12), 0.22, { type: 'triangle', vol: 0.22 });
      else if (n.l === 2) tone(440 * 2 ** ((n.n || 0) / 12), 0.25, { type: 'sine', vol: 0.18 });
      else tone(3200, 0.06, { type: 'square', vol: 0.04 });
    };
    const hit = (l) => {
      if (over || !start) return;
      flashes[l] = 1; const t = now();
      const cand = song.find((n) => n.l === l && !n.done && Math.abs(n.t - t) < 0.2);
      if (!cand) { tone(160, 0.05, { type: 'square', vol: 0.04 }); return; }
      const err = Math.abs(cand.t - t); cand.done = true; judged++; hits++;
      const perfect = err < 0.065; if (perfect) { perfects++; perfRun++; bestPerf = Math.max(bestPerf, perfRun); } else perfRun = 0;
      combo++; bestCombo = Math.max(bestCombo, combo);
      const mult = 1 + Math.min(1, combo / 25);
      score += Math.round((perfect ? 100 : 50) * mult); play(cand); vibrate(perfect ? 8 : 4);
      fb.push({ l, txt: perfect ? 'Parfait' : 'Bien', c: perfect ? '#3ddc97' : '#ffd23f', life: 0.5 });
      if (combo % 25 === 0) { ctx.flash('rgba(255,210,63,.15)'); sfx.ok(); }
      hud();
    };
    const hud = () => ctx.hud({ pts: `${score} pts`, combo: combo >= 5 ? `🔥 ${combo}` : null });
    const laneAt = (x) => { const w = Math.min(view.w, 520), ox = (view.w - w) / 2; return Math.floor(((x - ox) / w) * 4); };
    ctx.on(view.canvas, 'pointerdown', (e) => { e.preventDefault(); const l = laneAt(view.pos(e).x); if (l >= 0 && l < 4) hit(l); });
    ctx.on(window, 'keydown', (e) => { const l = LANES.findIndex((L) => L.k === e.key.toLowerCase()); if (l >= 0 && !e.repeat) hit(l); });

    const step = () => {
      const t = now();
      for (const n of song) if (!n.done && t - n.t > 0.2) { n.done = true; n.miss = true; judged++; combo = 0; perfRun = 0; fb.push({ l: n.l, txt: 'Raté', c: '#ff5c7a', life: 0.5 }); hud(); }
      // Métronome discret
      const b = Math.floor((t - 2) / beat); if (b >= 0 && b !== step.lastB && t < END - 2) { step.lastB = b; if (b % 4 === 0) tone(1500, 0.02, { type: 'sine', vol: 0.03 }); }
      if (t > END && !over) end();
    };
    const draw = (dt) => {
      const W = Math.min(view.w, 520), ox = (view.w - W) / 2, H = view.h, lw = W / 4, hitY = H * 0.84, t = start ? now() : 0;
      g.fillStyle = '#0d0b1f'; g.fillRect(0, 0, view.w, H);
      for (let l = 0; l < 4; l++) {
        const x = ox + l * lw; flashes[l] = Math.max(0, flashes[l] - dt * 5);
        g.fillStyle = l % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'; g.fillRect(x, 0, lw, H);
        if (flashes[l]) { const gr = g.createLinearGradient(0, hitY, 0, hitY - 200); gr.addColorStop(0, LANES[l].c + 'aa'); gr.addColorStop(1, LANES[l].c + '00'); g.globalAlpha = flashes[l]; g.fillStyle = gr; g.fillRect(x, hitY - 200, lw, 200); g.globalAlpha = 1; }
        g.font = '28px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(LANES[l].e, x + lw / 2, hitY + 40);
        if (duo) { g.fillStyle = l < 2 ? 'rgba(76,201,240,.6)' : 'rgba(255,92,122,.6)'; g.fillRect(x + 6, H - 8, lw - 12, 4); }
      }
      // Lignes de mesure
      g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
      for (let b = Math.floor((t - 2) / beat); ; b++) { const bt = 2 + b * beat, y = hitY - ((bt - t) / TRAVEL) * hitY; if (y < 0) break; if (y > H) continue; g.beginPath(); g.moveTo(ox, y); g.lineTo(ox + W, y); g.stroke(); }
      g.fillStyle = '#fff'; g.fillRect(ox, hitY - 2, W, 4);
      for (const n of song) {
        if (n.done && !n.miss) continue; const y = hitY - ((n.t - t) / TRAVEL) * hitY;
        if (y < -30 || y > H + 30) continue;
        g.fillStyle = n.miss ? 'rgba(255,255,255,.15)' : LANES[n.l].c; roundRect(g, ox + n.l * lw + 8, y - 11, lw - 16, 22, 11); g.fill();
        if (!n.miss) { g.fillStyle = 'rgba(255,255,255,.5)'; roundRect(g, ox + n.l * lw + 14, y - 8, lw - 28, 5, 3); g.fill(); }
      }
      for (const f of fb) { f.life -= dt; g.globalAlpha = Math.max(0, f.life * 2); g.fillStyle = f.c; g.font = '800 16px Outfit, sans-serif'; g.fillText(f.txt, ox + f.l * lw + lw / 2, hitY - 30 - (0.5 - f.life) * 60); } g.globalAlpha = 1; fb = fb.filter((f) => f.life > 0);
      if (!start) { g.fillStyle = '#fff'; g.font = '800 20px Outfit, sans-serif'; g.fillText(duo ? '🔵 Gauche : batterie + basse · 🔴 Droite : piano + cymbale' : 'Touche le couloir quand la note passe la ligne', view.w / 2, H * 0.4, view.w - 20); }
    };
    const end = () => {
      over = true; const acc = judged ? Math.round((hits / song.length) * 100) : 0; sfx.win();
      ctx.timeout(() => ctx.end({
        score, display: `${score} pts`, emoji: '🥁', board: mode === 'solo' ? null : mode,
        title: acc >= 95 ? 'Maestro !' : acc >= 80 ? 'Bel ensemble' : acc >= 60 ? 'Quelques fausses notes' : 'Cacophonie joyeuse',
        label: `${acc} % de notes jouées · ${perfects} parfaites · combo ${bestCombo}`,
        feats: [bestPerf >= 30 && 'parfait', acc >= 95 && 'maestro', presto && score >= 9000 && 'presto'].filter(Boolean),
      }), 700);
    };
    let last = performance.now();
    const stop = loop((dt) => { if (start && !over) step(); draw(dt); last = performance.now(); });
    ctx.onCleanup(stop);
    hud();
    ctx.countdown().then(() => { if (ctx.alive) start = performance.now(); });
  },
};
