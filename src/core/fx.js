/** Effets visuels partagés : toast, confettis. */
import { h } from './dom.js';
let toastWrap;
export function toast(msg, ms = 2200) {
  if (!toastWrap) { toastWrap = h('div.toast-wrap', { role: 'status', 'aria-live': 'polite' }); document.body.append(toastWrap); }
  const t = h('div.toast', msg); toastWrap.replaceChildren(t);
  setTimeout(() => t.remove(), ms);
}
export function confetti({ count = 140, colors = ['#7c5cff', '#ff4fa3', '#ffb547', '#4cc9f0', '#3ddc97'] } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = h('canvas.confetti'); document.body.append(c);
  const dpr = Math.min(2, devicePixelRatio || 1); const W = innerWidth, H = innerHeight;
  c.width = W * dpr; c.height = H * dpr; const g = c.getContext('2d'); g.scale(dpr, dpr);
  const ps = Array.from({ length: count }, () => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 16 - 4,
    s: 5 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: colors[(Math.random() * colors.length) | 0],
  }));
  let f = 0;
  (function step() {
    g.clearRect(0, 0, W, H);
    for (const p of ps) { p.vy += 0.45; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); }
    if (++f < 150) requestAnimationFrame(step); else c.remove();
  })();
}
