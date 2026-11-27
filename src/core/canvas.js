/** Canvas plein écran dans la scène, net sur écrans Retina, redimensionnable. */
export function createCanvas(stage, { onResize } = {}) {
  const canvas = document.createElement('canvas');
  stage.prepend(canvas);
  const g = canvas.getContext('2d');
  const view = { canvas, g, w: 0, h: 0, dpr: 1 };
  let ready = false; // onResize n'est appelé qu'après le retour (évite les accès avant initialisation)
  const fit = () => {
    const r = stage.getBoundingClientRect();
    view.dpr = Math.min(2.5, window.devicePixelRatio || 1);
    view.w = Math.max(1, r.width); view.h = Math.max(1, r.height);
    canvas.width = Math.round(view.w * view.dpr); canvas.height = Math.round(view.h * view.dpr);
    g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    if (ready) onResize?.(view);
  };
  fit(); ready = true;
  const ro = new ResizeObserver(fit); ro.observe(stage);
  view.destroy = () => { ro.disconnect(); canvas.remove(); };
  /** Coordonnées d'un événement pointeur dans le repère du canvas. */
  view.pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  return view;
}
/** Boucle d'animation avec dt (s), stoppable. */
export function loop(fn) {
  let id, last = performance.now(), on = true;
  const step = (t) => { if (!on) return; const dt = Math.min(0.05, (t - last) / 1000); last = t; fn(dt, t); id = requestAnimationFrame(step); };
  id = requestAnimationFrame(step);
  return () => { on = false; cancelAnimationFrame(id); };
}
export function roundRect(g, x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
