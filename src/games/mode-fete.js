/**
 * Mode Fête : un écran hôte + des téléphones manettes.
 * Prototype : transport BroadcastChannel (onglets du même appareil) + joueurs locaux.
 * Version complète : remplacer `transport()` par un relais WebSocket/WebRTC (voir docs/ARCHITECTURE.md).
 */
import qrcode from 'qrcode-generator';
import { h, clear } from '../core/dom.js';
import { sfx, vibrate } from '../core/sfx.js';
import { rng } from '../core/rng.js';
import { PCOLORS, PEMOJI } from '../core/players.js';
import { confetti } from '../core/fx.js';
import { icon } from '../icons.js';

const GOAL = 60;
const transport = (room) => {
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('mg-party-' + room) : null;
  const subs = new Set();
  if (bc) bc.onmessage = (e) => subs.forEach((f) => f(e.data));
  return { send: (m) => bc?.postMessage(m), on: (f) => subs.add(f), close: () => bc?.close() };
};

// Le salon survit aux revanches : les manettes restent connectées.
let session = null;
export default {
  start(ctx) {
    session ||= { room: Array.from({ length: 4 }, () => rng.pick('ABCDEFGHJKLMNPQRSTUVWXYZ'.split(''))).join(''), players: new Map() };
    const room = session.room;
    const net = transport(room); ctx.onCleanup(net.close);
    const url = `${location.origin}/#/manette?room=${room}`;
    const players = session.players; // id -> {name,color,emoji,pos,local}
    let phase = 'lobby';
    const scene = h('div.center-stage', { style: { gap: '18px', overflowY: 'auto', justifyContent: 'flex-start', paddingTop: '20px' } }); ctx.stage.append(scene);

    const addPlayer = (id, name, local = false) => {
      if (players.has(id) || players.size >= 8) return;
      const i = players.size;
      players.set(id, { id, name: (name || `Joueur ${i + 1}`).slice(0, 14), color: PCOLORS[i], emoji: PEMOJI[i], pos: 0, local });
      net.send({ type: 'welcome', id, color: PCOLORS[i], emoji: PEMOJI[i], room });
      sfx.pop(); lobby();
    };
    const tap = (id) => {
      const p = players.get(id); if (!p || phase !== 'race') return;
      p.pos = Math.min(GOAL, p.pos + 1); paintRace();
      if (p.pos >= GOAL) finish(p);
    };
    net.on((m) => { if (m.type === 'join') addPlayer(m.id, m.name); if (m.type === 'leave') { players.delete(m.id); lobby(); } if (m.type === 'tap') tap(m.id); if (m.type === 'hello' && phase !== 'lobby') net.send({ type: 'state', phase }); });

    function lobby() {
      if (phase !== 'lobby') return;
      const qr = qrcode(0, 'M'); qr.addData(url); qr.make();
      const list = [...players.values()];
      scene.replaceChildren(
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))', gap: '18px', width: '100%', maxWidth: '900px', alignItems: 'start' } },
          h('div.panel', { style: { padding: '22px', display: 'grid', gap: '14px', justifyItems: 'center', textAlign: 'center' } },
            h('div.faint', { style: { fontWeight: 700, letterSpacing: '.12em', fontSize: '12px' } }, 'SCANNE POUR REJOINDRE'),
            h('div', { style: { background: '#fff', padding: '12px', borderRadius: '18px', width: 'min(64vw,240px)' }, html: qr.createSvgTag({ scalable: true, margin: 0 }) }),
            h('div', 'Code du salon'), h('div.mono', { style: { fontSize: '42px', fontWeight: 800, letterSpacing: '.2em' } }, room),
            h('button.btn.btn-sm', { onclick: () => window.open(url, '_blank'), html: icon('share', 16) + ' Ouvrir une manette (nouvel onglet)' })),
          h('div.panel', { style: { padding: '22px', display: 'grid', gap: '14px' } },
            h('h2', { style: { fontSize: '24px' } }, `Joueurs (${list.length}/8)`),
            list.length ? h('div.players-list', list.map((p) => h('div.player-row.anim-pop', h('span', { style: { fontSize: '26px' } }, p.emoji), h('b', { style: { color: p.color, flex: 1 } }, p.name), h('span.chip', p.local ? 'sur cet écran' : '📱 manette'))))
              : h('p.muted', 'En attente des manettes… Scanne le QR code avec un téléphone, ou ajoute des joueurs sur cet écran pour tester.'),
            h('button.btn', { onclick: () => addPlayer('local-' + players.size, null, true), disabled: players.size >= 8 }, '+ Joueur sur cet écran'),
            h('button.btn.btn-primary.btn-lg', { disabled: players.size < 1, onclick: race }, '🚀 Lancer la course'),
            h('p.note', '🛰️ Prototype : les manettes se connectent depuis d’autres onglets de ce navigateur. Entre téléphones différents, il faudra le relais en ligne (WebSocket/WebRTC).'))));
    }

    let raceEl;
    async function race() {
      phase = 'race-wait'; net.send({ type: 'state', phase: 'countdown' });
      players.forEach((p) => (p.pos = 0));
      raceEl = h('div', { style: { width: '100%', maxWidth: '1000px', display: 'grid', gap: '10px' } });
      scene.replaceChildren(h('div.big-msg', `Tapez ! Premier à ${GOAL}`), raceEl);
      paintRace();
      await ctx.countdown(); if (!ctx.alive) return;
      phase = 'race'; net.send({ type: 'state', phase: 'race' });
    }
    function paintRace() {
      if (!raceEl) return;
      raceEl.replaceChildren(...[...players.values()].map((p, i) => h('div', { style: { display: 'grid', gridTemplateColumns: '110px 1fr', gap: '10px', alignItems: 'center' } },
        h('b', { style: { color: p.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, `${p.emoji} ${p.name}`),
        h('div', { style: { position: 'relative', height: '54px', borderRadius: '16px', background: 'rgba(255,255,255,.06)', overflow: 'hidden' } },
          h('div', { style: { position: 'absolute', inset: '0 auto 0 0', width: `${(p.pos / GOAL) * 100}%`, background: `linear-gradient(90deg,transparent,${p.color}66)`, transition: 'width .08s' } }),
          h('span', { style: { position: 'absolute', top: '50%', left: `calc(${(p.pos / GOAL) * 100}% - ${(p.pos / GOAL) * 40}px)`, transform: 'translateY(-50%) rotate(45deg)', fontSize: '34px', transition: 'left .08s' } }, '🚀'),
          h('span', { style: { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '24px' } }, '🏁')),
        p.local && h('button.btn', { style: { gridColumn: '1 / -1', minHeight: '56px', borderColor: p.color, color: p.color }, onpointerdown: (e) => { e.preventDefault(); tap(p.id); sfx.tick(); } }, `${p.emoji} Taper (${p.name})`))));
    }
    function finish(winner) {
      phase = 'over'; net.send({ type: 'result', winner: winner.id, name: winner.name });
      confetti();
      ctx.end({ emoji: winner.emoji, title: `${winner.name} gagne la course !`, display: '🏆', label: `${players.size} joueur${players.size > 1 ? 's' : ''} · aucune appli installée`, win: true });
    }
    lobby();
  },
};

/** Écran manette (ouvert via le QR code). */
export function controller(root, params) {
  const room = (params.get('room') || '').toUpperCase();
  const id = 'c-' + Math.random().toString(36).slice(2, 8);
  const net = transport(room);
  let me = null;
  document.title = 'Manette · Manigames';
  const wrap = h('div', { style: { position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '20px', textAlign: 'center' } });
  clear(root).append(wrap);
  const join = () => {
    const input = h('input.input', { placeholder: 'Ton prénom', maxLength: 14, style: { textAlign: 'center', fontSize: '20px' } });
    wrap.replaceChildren(h('div.logo', h('span.logo-mark', { html: icon('logo') }), 'Manigames'), h('h2', `Salon ${room || '????'}`), input,
      h('button.btn.btn-primary.btn-lg.btn-block', { style: { maxWidth: '340px' }, onclick: () => { net.send({ type: 'join', id, name: input.value.trim() }); wrap.replaceChildren(h('p.muted', 'Connexion à l’écran…')); } }, 'Rejoindre'));
  };
  const pad = (msg) => {
    const b = h('button', { style: { width: 'min(80vw,60vh)', aspectRatio: '1', borderRadius: '50%', border: 0, background: `radial-gradient(circle at 35% 30%, #fff8, ${me.color})`, boxShadow: `0 20px 60px ${me.color}88`, fontSize: '90px', touchAction: 'manipulation' },
      onpointerdown: (e) => { e.preventDefault(); net.send({ type: 'tap', id }); vibrate(8); b.animate([{ transform: 'scale(.94)' }, { transform: 'scale(1)' }], { duration: 120 }); } }, me.emoji);
    wrap.replaceChildren(h('div.big-msg', msg), b, h('p.muted', 'Tape aussi vite que possible !'));
  };
  net.on((m) => {
    if (m.type === 'welcome' && m.id === id) { me = m; wrap.replaceChildren(h('div', { style: { fontSize: '90px' } }, m.emoji), h('div.big-msg', 'C’est bon !'), h('p.muted', 'Regarde le grand écran, la course va commencer.')); vibrate(30); }
    if (!me) return;
    if (m.type === 'state' && m.phase === 'race') pad('GO !');
    if (m.type === 'state' && m.phase === 'countdown') wrap.replaceChildren(h('div.countdown', '3…'));
    if (m.type === 'result') wrap.replaceChildren(h('div', { style: { fontSize: '90px' } }, m.winner === id ? '🏆' : '😅'), h('div.big-msg', m.winner === id ? 'Tu as gagné !' : `${m.name} a gagné`), h('p.muted', 'Une revanche se lance depuis le grand écran.'));
  });
  net.send({ type: 'hello', id });
  join();
  return () => net.close();
}
