/**
 * Simulation de pont (Verlet + contraintes de distance) — sans DOM, testable dans Node.
 * Repère : x vers la droite, y vers le BAS, en mètres. La route est à y = 0.
 */
export const GRID = 2;
export const COST = { road: 100, wood: 50 }; // par mètre
export const LIMIT = { road: 480, wood: 450 }; // effort max (N)
export const LEVELS = [
  { w: 8, budget: 1800, anchors: [[0, 0], [8, 0], [0, 2], [8, 2]] },
  { w: 10, budget: 2800, anchors: [[0, 0], [10, 0], [0, 2], [10, 2]] },
  { w: 12, budget: 2400, anchors: [[0, 0], [12, 0], [0, 2], [12, 2], [6, 4]] },
  { w: 12, budget: 2900, anchors: [[0, 0], [12, 0], [0, 2], [12, 2]] },
  { w: 14, budget: 3000, anchors: [[0, 0], [14, 0], [0, 2], [14, 2], [6, 4]] },
  { w: 16, budget: 3900, anchors: [[0, 0], [16, 0], [0, 2], [16, 2]] },
  { w: 18, budget: 3900, anchors: [[0, 0], [18, 0], [0, 2], [18, 2], [6, 4], [12, 4]] },
  { w: 20, budget: 5200, anchors: [[0, 0], [20, 0], [0, 4], [20, 4]] },
];
export const beamLen = (b) => Math.hypot(b.b[0] - b.a[0], b.b[1] - b.a[1]);
export const isRoad = (b) => b.a[1] === 0 && b.b[1] === 0;
export const costOf = (beams) => Math.round(beams.reduce((s, b) => s + beamLen(b) * (isRoad(b) ? COST.road : COST.wood), 0));

export function createSim(level, beams, truckMass = 5) {
  const key = (p) => p.join(',');
  const nodes = new Map();
  const node = (p) => { const k = key(p); if (!nodes.has(k)) nodes.set(k, { x: p[0], y: p[1], px: p[0], py: p[1], fixed: level.anchors.some((a) => key(a) === k), m: 0, fx: 0, fy: 0 }); return nodes.get(k); };
  const links = beams.map((b) => { const A = node(b.a), B = node(b.b); const rest = beamLen(b); const road = isRoad(b); const m = rest * (road ? 0.6 : 0.3); A.m += m / 2; B.m += m / 2; return { A, B, rest, road, broken: false, strain: 0, force: 0, limit: road ? LIMIT.road : LIMIT.wood }; });
  const truck = { x: -3, y: 0, v: 0, state: 'drive', mass: truckMass, link: null, k: 0 };
  const sim = { nodes: [...nodes.values()], links, truck, t: 0 };
  sim.step = (dt = 1 / 60) => {
    sim.t += dt;
    const g = 9.8;
    // Le camion pèse sur la poutre de route sous lui
    for (const n of sim.nodes) { n.fx = 0; n.fy = n.m * g; }
    if (truck.state === 'drive') {
      truck.v = Math.min(3, truck.v + dt * 2);
      truck.x += truck.v * dt;
      if (truck.x <= 0) truck.y = 0;
      else if (truck.x >= level.w) { truck.y = 0; if (truck.x > level.w + 2) truck.state = 'win'; }
      else {
        const l = links.find((L) => L.road && !L.broken && Math.min(L.A.x, L.B.x) <= truck.x && Math.max(L.A.x, L.B.x) >= truck.x);
        if (!l) truck.state = 'fall';
        else {
          const k = (truck.x - l.A.x) / ((l.B.x - l.A.x) || 1e-6);
          truck.y = l.A.y + (l.B.y - l.A.y) * k; truck.link = l; truck.k = k;
          l.A.fy += truck.mass * g * (1 - k); l.B.fy += truck.mass * g * k;
          if (truck.y > 1.6 || Math.abs(l.B.y - l.A.y) / (Math.abs(l.B.x - l.A.x) || 1e-6) > 0.8) truck.state = 'fall';
        }
      }
    } else if (truck.state === 'fall') { truck.v += g * dt; truck.y += truck.v * dt * 0.6; truck.x += 1.5 * dt; }
    // Intégration de Verlet
    for (const n of sim.nodes) {
      if (n.fixed) continue;
      const m = Math.max(0.2, n.m); const vx = (n.x - n.px) * 0.995, vy = (n.y - n.py) * 0.995;
      n.px = n.x; n.py = n.y; n.x += vx + (n.fx / m) * dt * dt; n.y += vy + (n.fy / m) * dt * dt;
    }
    for (const L of links) L.acc = 0;
    for (let it = 0; it < 24; it++) for (const L of links) {
      if (L.broken) continue;
      const dx = L.B.x - L.A.x, dy = L.B.y - L.A.y, d = Math.hypot(dx, dy) || 1e-6; const diff = (d - L.rest) / d;
      const wa = L.A.fixed ? 0 : 1 / Math.max(0.2, L.A.m), wb = L.B.fixed ? 0 : 1 / Math.max(0.2, L.B.m), w = wa + wb; if (!w) continue;
      L.A.x += dx * diff * (wa / w); L.A.y += dy * diff * (wa / w); L.B.x -= dx * diff * (wb / w); L.B.y -= dy * diff * (wb / w);
      L.acc += (d - L.rest) / w; // impulsion de correction ≈ effort dans la poutre
    }
    // Effort (N) : positif = traction, négatif = compression. Trop d'effort → la poutre casse
    for (const L of links) {
      if (L.broken) continue;
      const F = L.acc / (dt * dt); L.force = (L.force || 0) * 0.85 + F * 0.15;
      L.strain = Math.abs(L.force) / L.limit;
      if (L.strain > 1) L.broken = true;
    }
    if (truck.state === 'drive' && sim.t > 40) truck.state = 'fall';
    return truck.state;
  };
  return sim;
}
