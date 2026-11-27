/** Coquille commune d'un jeu : en-tête, intro, compte à rebours, résultats, progression, défis. */
import { h, clear, sleep } from './core/dom.js';
import { sfx, vibrate } from './core/sfx.js';
import { confetti, toast } from './core/fx.js';
import { getBest, submitScore } from './core/store.js';
import { share } from './core/share.js';
import { canParty } from './core/premium.js';
import { makeRng } from './core/rng.js';
import { MEDALS, medalFor, nextMedal, bestMedal, recordGame, profile, saveProfile, noteChallengeSent } from './core/progress.js';
import { GAMES } from './games/index.js';
import { icon } from './icons.js';

const fmtOf = (meta) => meta.fmt || ((s) => String(s));
const medalsOf = (meta, board) => (Array.isArray(meta.medals) ? (board ? null : meta.medals) : meta.medals?.[board || 'default'] || null);

/** Rangée de médailles : allumées jusqu'à `got`, avec les seuils. */
export function medalRow(meta, board, got, compact = false) {
  const th = medalsOf(meta, board); if (!th) return null;
  const f = fmtOf(meta);
  return h('div.medal-row', MEDALS.map((m, i) => h('div.medal', { class: i < got ? 'on' : '', style: { '--mc': m.color }, title: `${m.name} : ${f(th[i], board)}` },
    h('span.mi', m.icon), !compact && h('small', f(th[i], board)))));
}

export function mountGame(root, meta) {
  let cleanups = [];
  let destroyed = false;
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const challenge = params.has('v') ? { score: Number(params.get('v')), display: params.get('d') || params.get('v'), name: (params.get('n') || 'Un·e ami·e').slice(0, 16), seed: Number(params.get('s')) || undefined, mode: params.get('m') || undefined, board: params.get('b') || undefined } : null;
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
  document.title = `${meta.title} · Minigames`;

  function stop() { cleanups.forEach((f) => { try { f(); } catch (e) { console.error(e); } }); cleanups = []; hudEl.replaceChildren(); clear(stage); }

  function intro() {
    if (meta.premium === 'pass' && !canParty()) return locked();
    let mode = challenge?.mode || meta.modes?.[0]?.id;
    const seg = meta.modes && !challenge && h('div.seg', { role: 'group', 'aria-label': 'Mode de jeu' }, meta.modes.map((m) => h('button', {
      'aria-pressed': String(m.id === mode), onclick: (e) => { mode = m.id; [...seg.children].forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); sfx.click(); paintModeDesc(); },
    }, m.label)));
    const modeDesc = h('p.faint', { style: { fontSize: '14px', minHeight: '1.2em' } });
    const paintModeDesc = () => { modeDesc.textContent = meta.modes?.find((m) => m.id === mode)?.desc || ''; };
    paintModeDesc();
    const best = getBest(meta.id);
    const card = h('div.card',
      h('div.tile', meta.emoji), h('h2', meta.title), h('p.muted', meta.tagline),
      challenge && h('div.challenge-banner', h('span', '⚔️'), h('div', h('b', `${challenge.name} te défie !`), h('div', `Score à battre : ${challenge.display}`))),
      h('ol.rules', meta.rules.map((r, i) => h('li', h('span', i + 1), h('span', r)))),
      seg, meta.modes && modeDesc,
      medalRow(meta, null, bestMedal(meta.id)),
      meta.online && h('p.note', '🛰️ ', meta.online),
      h('button.btn.btn-primary.btn-lg.btn-block', { onclick: () => { sfx.unlock(); sfx.go(); start(mode); } }, challenge ? 'Relever le défi' : 'Jouer'),
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

  function start(mode, seed) {
    stop();
    const ctx = makeCtx(mode, seed ?? challenge?.seed ?? ((Math.random() * 2 ** 31) | 0));
    meta.load().then((mod) => { if (!destroyed && ctx.alive) mod.default.start(ctx); }).catch((e) => { console.error(e); toast('Impossible de charger le jeu'); });
  }

  function makeCtx(mode, seed) {
    const ctx = {
      meta, mode, stage, alive: true, seed, rng: makeRng(seed), challenge,
      level: profile().lvl,
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
          if (c.textContent !== String(v)) c.textContent = v;
        }
      },
      overlay(...kids) { const o = h('div.overlay', h('div.card', ...kids)); stage.append(o); return o; },
      /** Petit texte qui jaillit (ex. « +50 », « COMBO ×3 ») à une position de la scène. */
      pop(text, x, y, color = '#fff', size = 28) {
        const el = h('div.pop-text', { style: { left: x + 'px', top: y + 'px', color, fontSize: size + 'px' } }, text);
        stage.append(el); setTimeout(() => el.remove(), 900);
      },
      flash(color = 'rgba(255,255,255,.35)') { const el = h('div.flash', { style: { background: color } }); stage.append(el); setTimeout(() => el.remove(), 350); },
      shake(px = 8) { stage.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${-px}px,${px / 2}px)` }, { transform: `translate(${px}px,${-px / 2}px)` }, { transform: 'translate(0,0)' }], { duration: 260 }); },
      async countdown(n = 3) {
        const el = h('div.center-stage', { style: { zIndex: 15, pointerEvents: 'none' } }); stage.append(el);
        for (let i = n; i > 0; i--) { if (!ctx.alive) return; el.replaceChildren(h('div.countdown', i)); sfx.count(); await sleep(650); }
        if (ctx.alive) { el.replaceChildren(h('div.countdown.grad-text', 'GO')); sfx.go(); vibrate(30); }
        await sleep(350); el.remove();
      },
      /**
       * Fin de partie.
       * res : { score, display, title, label, emoji, win, lowerIsBetter, board, feats: [], multi, extra, share, record:false }
       */
      end(res) {
        if (!ctx.alive) return; ctx.alive = false;
        const board = res.board || null;
        const key = board ? `${meta.id}:${board}` : meta.id;
        const lower = res.lowerIsBetter ?? meta.lowerIsBetter;
        const rec = res.score != null && res.record !== false ? submitScore(key, res.score, res.display ?? String(res.score), lower) : null;
        const beat = challenge && res.score != null && (challenge.board || null) === board && (lower ? res.score < challenge.score : res.score > challenge.score);
        const prog = recordGame({ ...meta, medals: medalsOf(meta, board), lowerIsBetter: lower }, { score: res.score, multi: res.multi, feats: res.feats, isRecord: rec?.isRecord, beatChallenge: beat }, GAMES);
        stop();
        results(res, rec, mode, seed, prog, beat, board, key, lower);
      },
      restart: () => start(mode),
    };
    cleanups.push(() => { ctx.alive = false; });
    return ctx;
  }

  function results(res, rec, mode, seed, prog, beat, board, key, lower) {
    const best = getBest(key);
    const celebrate = res.win ?? (rec?.isRecord || prog.newMedal > 0);
    if (celebrate) { confetti(); sfx.win(); vibrate([20, 40, 20]); } else if (res.win === false) sfx.lose();
    const th = medalsOf(meta, board);
    const got = res.score != null ? medalFor({ medals: th, lowerIsBetter: lower }, res.score) : 0;
    const nxt = res.score != null && th ? nextMedal({ medals: th, lowerIsBetter: lower }, res.score) : null;
    const f = fmtOf(meta);
    const xpBar = h('div.bar.xp-bar', h('i', { style: { width: (prog.before.pct * 100) + '%' } }));
    requestAnimationFrame(() => setTimeout(() => { xpBar.firstChild.style.transition = 'width 1s cubic-bezier(.2,.8,.2,1)'; xpBar.firstChild.style.width = (prog.levelUp ? 100 : prog.after.pct * 100) + '%'; }, 200));

    // Défi : lien vers la même partie (même graine) avec le score à battre
    const canChallenge = res.score != null && res.challenge !== false;
    const nameInput = h('input.input', { placeholder: 'Ton pseudo', maxLength: 16, value: profile().name, style: { height: '40px', fontSize: '15px', flex: 1, minWidth: 0 }, 'aria-label': 'Ton pseudo pour les défis' });
    const sendChallenge = () => {
      const name = nameInput.value.trim(); if (name) saveProfile({ name });
      const q = new URLSearchParams({ s: seed, v: res.score, d: res.display ?? res.score, n: name || 'Un·e ami·e' });
      if (mode) q.set('m', mode); if (board) q.set('b', board);
      const url = `https://minigames.manigames.online/#/jeu/${meta.id}?${q}`;
      const r = noteChallengeSent(GAMES); if (r.xp) toast(`Quête accomplie : +${r.xp} XP`);
      share(`${meta.emoji} ${meta.title} : ${res.display}. ${res.shareTail || 'Même partie pour toi. Tu me bats ?'}\n${url}`);
    };

    const card = h('div.card.results',
      h('div.tile', res.emoji || meta.emoji),
      res.title && h('h2', res.title),
      res.display != null && h('div.score-big.grad-text', res.display),
      res.label && h('p.score-label', res.label),
      rec?.isRecord && h('p.new-record', '★ Nouveau record ★'),
      challenge && res.score != null && h('div.challenge-banner', { class: beat ? 'won' : 'lost' }, h('span', beat ? '🏆' : '😤'), h('div', h('b', beat ? `Défi relevé ! Tu bats ${challenge.name}` : `${challenge.name} reste devant`), h('div', `Son score : ${challenge.display}`))),
      th && h('div.medal-block',
        medalRow(meta, board, got),
        nxt ? h('p.next-medal', `Encore ${(meta.fmtGap || f)(Math.abs(nxt.delta), board)} pour ${nxt.medal.icon} ${nxt.medal.name}`) : got === 4 ? h('p.next-medal', 'Platine ! Le sommet est atteint 💎') : null),
      best && res.score != null && h('div.best-line', h('span.chip', `Record : ${best.display}`), h('span.chip', `Parties : ${rec?.plays ?? '-'}`)),
      res.extra,
      h('div.xp-block',
        h('div.xp-head', h('b', `+${prog.xp} XP`), h('span.faint', prog.levelUp ? `Niveau ${prog.levelUp.to} atteint !` : `Niveau ${prog.after.lvl} · ${prog.after.title}`)),
        xpBar,
        h('div.xp-lines', prog.lines.slice(0, 4).map(([t, x]) => h('span', `${t} +${x}`)))),
      prog.levelUp && h('div.levelup.anim-pop', `⬆️ Niveau ${prog.levelUp.to} !`, prog.levelUp.avatars.length ? ` Nouvel avatar : ${prog.levelUp.avatars.join(' ')}` : ''),
      prog.achievements.length > 0 && h('div.ach-list', prog.achievements.map((a) => h('div.ach.anim-pop', h('span', a.icon), h('div', h('b', a.name), h('small', a.desc))))),
      prog.quests.length > 0 && h('p.quest-done', `📜 Quête du jour accomplie ×${prog.quests.length}`),
      canChallenge && h('div.challenge-send', nameInput, h('button.btn', { onclick: sendChallenge, html: '⚔️ Défier un ami' })),
      h('div.btn-row',
        h('button.btn.btn-primary.btn-lg', { onclick: () => start(mode) }, 'Rejouer'),
        challenge && res.score != null && !beat && h('button.btn.btn-lg', { onclick: () => start(mode, challenge.seed) }, 'Retenter le défi')),
      h('a.btn.btn-ghost', { href: '#/' }, 'Autres jeux'));
    if (prog.levelUp) setTimeout(() => { sfx.win(); confetti({ count: 80 }); }, 700);
    stage.append(h('div.overlay', card));
  }

  intro();
  return () => { destroyed = true; stop(); };
}
