/** Coquille commune d'un jeu : en-tête, intro, compte à rebours, résultats, nettoyage. */
import { h, clear, sleep } from './core/dom.js';
import { sfx, vibrate } from './core/sfx.js';
import { confetti, toast } from './core/fx.js';
import { getBest, submitScore } from './core/store.js';
import { share } from './core/share.js';
import { canParty } from './core/premium.js';
import { icon } from './icons.js';

export function mountGame(root, meta) {
  let cleanups = [];
  let destroyed = false;
  const hudEl = h('div.hud');
  const muteBtn = h('button.btn.btn-icon.btn-ghost', { 'aria-label': 'Couper le son', onclick: () => { sfx.setMuted(!sfx.muted); paintMute(); } });
  const paintMute = () => { muteBtn.innerHTML = icon(sfx.muted ? 'mute' : 'sound'); muteBtn.setAttribute('aria-label', sfx.muted ? 'Activer le son' : 'Couper le son'); };
  paintMute();
  const stage = h('main.stage');
  const shell = h('div.game-shell', { style: { '--c1': meta.c1, '--c2': meta.c2, '--c1-a': meta.c1 + '40', '--c2-a': meta.c2 + '30' } },
    h('header.game-header',
      h('a.btn.btn-icon.btn-ghost', { href: '#/', 'aria-label': 'Retour à l’accueil', html: icon('back') }),
      h('div.title', h('span.emoji', meta.emoji), h('h1', meta.title)),
      hudEl, muteBtn,
      h('button.btn.btn-icon.btn-ghost', { 'aria-label': 'Règles', html: icon('help'), onclick: () => { stop(); intro(); } })),
    stage);
  clear(root).append(shell);
  document.title = `${meta.title} · Manigames`;

  function stop() { cleanups.forEach((f) => { try { f(); } catch (e) { console.error(e); } }); cleanups = []; hudEl.replaceChildren(); clear(stage); }

  function intro() {
    if (meta.premium === 'pass' && !canParty()) return locked();
    let mode = meta.modes?.[0]?.id;
    const seg = meta.modes && h('div.seg', { role: 'group', 'aria-label': 'Mode de jeu' }, meta.modes.map((m) => h('button', {
      'aria-pressed': String(m.id === mode), onclick: (e) => { mode = m.id; [...seg.children].forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); sfx.click(); },
    }, m.label)));
    const best = getBest(meta.id);
    const card = h('div.card',
      h('div.tile', meta.emoji), h('h2', meta.title), h('p.muted', meta.tagline),
      h('ol.rules', meta.rules.map((r, i) => h('li', h('span', i + 1), h('span', r)))),
      seg,
      meta.online && h('p.note', '🛰️ ', meta.online),
      h('button.btn.btn-primary.btn-lg.btn-block', { onclick: () => { sfx.unlock(); sfx.go(); start(mode); } }, 'Jouer'),
      best && h('p.faint', `Ton record : ${best.display}`));
    stage.append(h('div.overlay', card));
  }

  function locked() {
    stage.append(h('div.overlay', h('div.card',
      h('div.tile', '🔒'), h('h2', 'Pass Soirée requis'),
      h('p.muted', 'Le Mode Fête transforme les téléphones de tes invités en manettes. Il se débloque avec le Pass Soirée (paiement unique, 24 h) ou l’abonnement Premium.'),
      h('a.btn.btn-primary.btn-lg.btn-block', { href: '#/premium' }, 'Voir les offres'),
      h('a.btn.btn-block', { href: '#/' }, 'Retour aux jeux'))));
  }

  function start(mode) {
    stop();
    const ctx = makeCtx(mode);
    meta.load().then((mod) => { if (!destroyed && ctx.alive) mod.default.start(ctx); }).catch((e) => { console.error(e); toast('Impossible de charger le jeu'); });
  }

  function makeCtx(mode) {
    const ctx = {
      meta, mode, stage, alive: true,
      onCleanup: (f) => cleanups.push(f),
      timeout(fn, ms) { const id = setTimeout(() => ctx.alive && fn(), ms); cleanups.push(() => clearTimeout(id)); return id; },
      interval(fn, ms) { const id = setInterval(() => ctx.alive && fn(), ms); cleanups.push(() => clearInterval(id)); return id; },
      on(target, type, fn, opts) { target.addEventListener(type, fn, opts); cleanups.push(() => target.removeEventListener(type, fn, opts)); },
      wait: (ms) => new Promise((r) => ctx.timeout(r, ms)),
      hud(items) {
        for (const [k, v] of Object.entries(items)) {
          let c = hudEl.querySelector(`[data-k="${k}"]`);
          if (v == null) { c?.remove(); continue; }
          if (!c) { c = h('span.chip', { 'data-k': k }); hudEl.append(c); }
          c.textContent = v;
        }
      },
      overlay(...kids) { const o = h('div.overlay', h('div.card', ...kids)); stage.append(o); return o; },
      async countdown(n = 3) {
        const el = h('div.center-stage', { style: { zIndex: 15, pointerEvents: 'none' } }); stage.append(el);
        for (let i = n; i > 0; i--) { if (!ctx.alive) return; el.replaceChildren(h('div.countdown', i)); sfx.count(); await sleep(650); }
        if (ctx.alive) { el.replaceChildren(h('div.countdown.grad-text', 'GO')); sfx.go(); vibrate(30); }
        await sleep(350); el.remove();
      },
      /** Fin de partie. score numérique (optionnel) + display + label ; extra : nœud DOM ; share : texte. */
      end(res) {
        if (!ctx.alive) return; ctx.alive = false;
        const rec = res.score != null && res.record !== false ? submitScore(meta.id, res.score, res.display ?? String(res.score), res.lowerIsBetter) : null;
        stop();
        results(res, rec, mode);
      },
      restart: () => start(mode),
    };
    cleanups.push(() => { ctx.alive = false; });
    return ctx;
  }

  function results(res, rec, mode) {
    const best = getBest(meta.id);
    const celebrate = res.win ?? (rec?.isRecord);
    if (celebrate) { confetti(); sfx.win(); vibrate([20, 40, 20]); } else if (res.win === false) sfx.lose();
    const card = h('div.card',
      h('div.tile', res.emoji || meta.emoji),
      res.title && h('h2', res.title),
      res.display != null && h('div.score-big.grad-text', res.display),
      res.label && h('p.score-label', res.label),
      rec?.isRecord && h('p.new-record', '★ Nouveau record ★'),
      best && res.score != null && h('div.best-line', h('span.chip', `Record : ${best.display}`), h('span.chip', `Parties : ${rec?.plays ?? '-'}`)),
      res.extra,
      h('div.btn-row',
        h('button.btn.btn-primary.btn-lg', { onclick: () => start(mode) }, 'Rejouer'),
        res.share && h('button.btn.btn-lg', { onclick: () => share(res.share, 'jeu/' + meta.id), html: icon('share') + ' Partager' })),
      h('a.btn.btn-ghost', { href: '#/' }, 'Autres jeux'));
    stage.append(h('div.overlay', card));
  }

  intro();
  return () => { destroyed = true; stop(); };
}
