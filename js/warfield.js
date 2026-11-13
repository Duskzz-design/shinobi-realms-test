// War battlefield: a small walkable map at the territory. Walk around, tap an enemy ninja, press Attack.
import * as net from './net.js?v=9d1c820';
import { fillTextPx, measurePx } from './pixemoji.js?v=9d1c820';
import { drawNameTag } from './numfont.js?v=9d1c820';
import { ninjaSprite, VILLAGES, lookOf, drawNinjaFit } from './sprites.js?v=9d1c820';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
function toast(msg, kind = 'err') { const t = h(`<div class="toast ${kind}">${esc(msg)}</div>`); document.body.appendChild(t); setTimeout(() => t.remove(), 3500); }
const left = (iso) => { const s = Math.max(0, (new Date(iso) - Date.now()) / 1000); const hh = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return hh ? `${hh}h ${m}m` : `${m}m`; };

const T = 16, SPEED = 70;
let MW = 30, MH = 18, TALL = false; // a tall field on upright phones: attackers start at the top, defenders at the bottom
const THEME = {
  bandit_road: { g1: '#8cc66a', g2: '#7db85c', path: '#d8b37a', deco: 'stone' },
  watchtower: { g1: '#a8c070', g2: '#98b062', path: '#c9a46a', deco: 'stone' },
  misty_marsh: { g1: '#6a9a7a', g2: '#5c8c6c', path: '#8a9a6a', deco: 'reed' },
  whispering_woods: { g1: '#4f9a4f', g2: '#438c43', path: '#a88a5a', deco: 'tree' },
  ashen_peak: { g1: '#8a8a86', g2: '#7c7c78', path: '#6a625a', deco: 'ash' },
};
function paint(terr, seed = 3) {
  const th = THEME[terr] || THEME.bandit_road, cv = document.createElement('canvas'); cv.width = MW * T; cv.height = MH * T;
  const c = cv.getContext('2d'); let s = seed * 9301 + terr.length * 49297; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { c.fillStyle = (x * 7 + y * 13) % 5 === 0 ? th.g2 : th.g1; c.fillRect(x * T, y * T, T, T); }
  // a road across the middle
  c.fillStyle = th.path;
  if (TALL) for (let y = 0; y < MH * T; y += 2) { const x = MW * T / 2 + Math.sin(y / 40) * 18; c.fillRect(x - 14, y, 28, 2); }
  else for (let x = 0; x < MW * T; x += 2) { const y = MH * T / 2 + Math.sin(x / 40) * 18; c.fillRect(x, y - 14, 2, 28); }
  // camps: attacker banners left, defender right
  for (let i = 0; i < 70; i++) {
    const x = 20 + r() * (MW * T - 40), y = 20 + r() * (MH * T - 40);
    if (th.deco === 'tree') { c.fillStyle = '#2e6b35'; c.fillRect(x - 5, y - 10, 10, 10); c.fillStyle = '#245c30'; c.fillRect(x - 3, y - 14, 6, 4); c.fillStyle = '#6a4024'; c.fillRect(x - 1, y, 2, 4); }
    else if (th.deco === 'reed') { c.fillStyle = '#4a7a4a'; c.fillRect(x, y - 8, 1, 8); c.fillRect(x + 3, y - 6, 1, 6); c.fillStyle = '#3a6a8a'; c.fillRect(x - 4, y + 2, 12, 3); }
    else if (th.deco === 'ash') { c.fillStyle = '#5a5652'; c.fillRect(x - 4, y - 3, 8, 5); c.fillStyle = '#b8b4ae'; c.fillRect(x - 2, y - 3, 3, 1); }
    else { c.fillStyle = '#9a9488'; c.fillRect(x - 3, y - 2, 6, 4); c.fillStyle = '#c8c2b4'; c.fillRect(x - 2, y - 2, 2, 1); }
  }
  c.strokeStyle = '#3a2414'; c.lineWidth = 2; c.strokeRect(1, 1, MW * T - 2, MH * T - 2);
  return cv;
}
function banner(c, x, y, col, sc) {
  c.fillStyle = '#4e2c12'; c.fillRect(x * sc, (y - 30) * sc, 2 * sc, 30 * sc);
  c.fillStyle = col; c.fillRect((x + 2) * sc, (y - 30) * sc, 12 * sc, 9 * sc); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect((x + 4) * sc, (y - 28) * sc, 3 * sc, 2 * sc);
}

// war: {id, territory, attacker, defender, ...}; hooks: { challenge(target, warId), onClose() }
export function openWarField(root, char, war, terrName, hooks = {}) {
  const A = VILLAGES[war.attacker], D = war.defender ? VILLAGES[war.defender] : null;
  const mySide = char.village === war.attacker ? 'attacker' : char.village === war.defender ? 'defender' : null;
  TALL = innerHeight > innerWidth * 1.1; [MW, MH] = TALL ? [18, 28] : [30, 18];
  const el = h(`<div class="ov wfield"><div class="wf-top"><b>⚔️ ${esc(terrName)}</b><span class="wf-score"></span><button class="btn small ghost" data-x>Leave</button></div>
    <div class="wf-stage"><canvas></canvas></div>
    <div class="wf-hint"></div><div class="wf-card" hidden></div></div>`);
  root.appendChild(el);
  const cv = el.querySelector('canvas'), ctx = cv.getContext('2d'), stage = el.querySelector('.wf-stage'), hint = el.querySelector('.wf-hint'), card = el.querySelector('.wf-card');
  const ground = paint(war.territory);
  // spawn point for a side: left/right on a wide field, top/bottom on a tall one
  const spawn = (side) => { const a = side !== 'defender', jit = (Math.random() * 6 - 3) * T; return TALL ? [MW / 2 * T + jit, (a ? 3 : MH - 2) * T] : [(a ? 3 : MW - 3) * T, MH / 2 * T + jit]; };
  const [sx0, sy0] = spawn(mySide);
  const me = { id: char.user_id, x: sx0, y: sy0, dir: TALL ? (mySide === 'defender' ? 3 : 0) : (mySide === 'defender' ? 1 : 2), moving: false, anim: 0, tx: null, ty: null };
  const others = new Map(); let st = null, alive = true, room = null, sc = 3, last = performance.now(), lastSend = 0;
  const meta = () => ({ id: me.id, name: char.name, village: char.village, rank: char.rank, level: char.level, look: lookOf(char.appearance, char.gear), side: mySide, asleep: !!char.asleep_since, x: Math.round(me.x), y: Math.round(me.y), dir: me.dir });

  // silent: removed by something else (a duel starting), so don't send the player back to the map
  function close(silent) {
    if (!alive) return; alive = false; clearInterval(hold); clearInterval(poll); removeEventListener('resize', resize);
    room && room.leave(); if (!silent) net.warLeave(war.id); el.remove(); if (!silent) hooks.onClose && hooks.onClose();
  }
  el.querySelector('[data-x]').onclick = () => close(false);
  function resize() {
    const r = stage.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    sc = Math.max(0.5, Math.min((r.width - 12) / (MW * T), (r.height - 12) / (MH * T))) * dpr;
    cv.width = Math.round(MW * T * sc); cv.height = Math.round(MH * T * sc);
    cv.style.width = cv.width / dpr + 'px'; cv.style.height = cv.height / dpr + 'px';
  }
  addEventListener('resize', resize); setTimeout(resize, 0);

  function scoreBar() {
    if (!st) return;
    const w = st.war, over = w.status !== 'active' || new Date(w.ends_at) <= new Date();
    el.querySelector('.wf-score').innerHTML = `<i style="background:${A.color}">${esc(A.short)} ${w.att_score}</i><em>${over ? 'Final' : left(w.ends_at)}</em><i style="background:${D ? D.color : '#8a7a6a'}">${D ? esc(D.short) : 'Unclaimed'} ${w.def_score}</i>`;
    const foes = [...others.values()].filter((o) => o.meta.side && o.meta.side !== mySide);
    hint.innerHTML = over ? `This war is over.${w.winner ? ` ${esc(VILLAGES[w.winner].name)} holds ${esc(terrName)}.` : ''}`
      : !mySide ? 'Your village is not in this war. You can watch only.'
      : foes.length ? 'Click the <b>⚔️</b> above an enemy to ambush them: you strike first, powered up. Each win scores <b>+10</b> for your side.'
      : mySide === 'attacker' ? `No defenders here. While you hold the field, ${esc(A.short)} gains <b>+5 every 10 minutes</b>.`
      : 'No attackers here right now. Tap the ground to walk around.';
  }
  async function refresh(holdNow) {
    if (!alive) return;
    try { st = await (holdNow ? net.warHold(war.id) : net.warStatus(war.id)); } catch (e) { toast(e.message); }
    if (net.isOffline() && st) for (const p of st.present) if (p.id !== me.id && !others.has(p.id)) {
      const [bx, by] = spawn(p.side), x = bx + (TALL ? (Math.random() * 10 - 5) * T : (p.side === 'attacker' ? 1 : -1) * Math.random() * 6 * T), y = by + (TALL ? (p.side === 'attacker' ? 1 : -1) * Math.random() * 7 * T : (Math.random() * 8 - 4) * T);
      others.set(p.id, { meta: p, x, y, tx: x, ty: y, dir: p.side === 'attacker' ? 2 : 1, moving: false, anim: 0 });
    }
    scoreBar();
  }
  const canHold = () => mySide && char.rank !== 'Academy Student' && !char.asleep_since;
  refresh(canHold());
  const hold = setInterval(() => canHold() && refresh(true), 60000);
  const poll = setInterval(() => refresh(false), 15000);
  net.joinRoom('war:' + war.id, {
    me: meta(), events: ['mv'],
    onEvent: (ev, p) => { const o = others.get(p.id); if (o) { o.tx = p.x; o.ty = p.y; o.dir = p.dir; } },
    onPresence: (list) => {
      const seen = new Set();
      for (const m of list) { if (m.id === me.id) continue; seen.add(m.id); const o = others.get(m.id); if (o) o.meta = m; else others.set(m.id, { meta: m, x: m.x, y: m.y, tx: m.x, ty: m.y, dir: m.dir || 0, moving: false, anim: 0 }); }
      if (!net.isOffline()) for (const id of [...others.keys()]) if (!seen.has(id)) others.delete(id);
      scoreBar();
    },
  }).then((r) => { room = r; if (!alive) r.leave(); });

  // click / tap: an enemy opens the attack card, anywhere else walks there
  cv.addEventListener('pointerdown', (e) => {
    const r = cv.getBoundingClientRect(), k = cv.width / r.width / sc, wx = (e.clientX - r.left) * k, wy = (e.clientY - r.top) * k;
    const px = wx * sc, py = wy * sc, pad = 6 * (cv.width / r.width);
    const hit = swords.find((b) => px >= b.x - pad && px <= b.x + b.w + pad && py >= b.y - pad && py <= b.y + b.h + pad);
    if (hit) return attack(hit.m);
    for (const o of others.values()) if (Math.abs(wx - o.x) < 11 && wy < o.y + 3 && wy > o.y - 31) return showCard(o.meta);
    card.hidden = true;
    me.tx = Math.max(8, Math.min(MW * T - 8, wx)); me.ty = Math.max(14, Math.min(MH * T - 4, wy));
  });
  let swords = [], attacking = false;
  const canAttack = (m) => mySide && m.side && m.side !== mySide && !m.asleep && !char.asleep_since && st && st.war.status === 'active' && new Date(st.war.ends_at) > new Date();
  function attack(m) {
    if (attacking) return; attacking = true; setTimeout(() => (attacking = false), 2500);
    card.hidden = true;
    hooks.challenge ? hooks.challenge({ id: m.id, name: m.name }, war.id) : toast('Duels are not available here.');
  }
  function showCard(m) {
    const vv = VILLAGES[m.village] || {}, enemy = mySide && m.side && m.side !== mySide;
    const over = !st || st.war.status !== 'active' || new Date(st.war.ends_at) <= new Date();
    let act = '';
    if (!enemy) act = `<p class="sub">${m.side === mySide ? 'An ally. Fight side by side!' : ''}</p>`;
    else if (m.asleep) act = '<p class="sub">💤 Asleep: can\'t be attacked.</p>';
    else if (char.asleep_since) act = '<p class="sub">You are asleep. Wake up to fight.</p>';
    else if (over) act = '<p class="sub">The war is over.</p>';
    else act = '<p class="sub">Click the <b>⚔️</b> above their head to attack.</p>';
    card.innerHTML = `<canvas width="36" height="52"></canvas><div><b>${esc(m.name)}</b><small style="color:${vv.dark}">${esc(vv.short || '')} · ${esc(m.rank)} · Lv ${m.level}</small>${act}</div><button class="wf-cx" data-cx>✕</button>`;
    card.hidden = false;
    const c = card.querySelector('canvas').getContext('2d'); c.imageSmoothingEnabled = false; drawNinjaFit(card.querySelector('canvas'), m.look || {});
    card.querySelector('[data-cx]').onclick = () => (card.hidden = true);
    const a = card.querySelector('[data-atk]');
    if (a) a.onclick = () => { card.hidden = true; hooks.challenge ? hooks.challenge({ id: m.id, name: m.name }, war.id) : toast('Duels are not available here.'); };
  }

  function step(now) {
    if (!alive || !el.isConnected) { if (alive) close(true); return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    me.moving = false;
    if (me.tx != null) {
      const dx = me.tx - me.x, dy = me.ty - me.y, d = Math.hypot(dx, dy);
      if (d < 1) me.tx = null; else { const s = Math.min(d, SPEED * dt); me.x += (dx / d) * s; me.y += (dy / d) * s; me.moving = true; me.anim += dt; me.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0); }
    }
    if (room && now - lastSend > (me.moving ? 120 : 1500)) { room.send('mv', { id: me.id, x: Math.round(me.x), y: Math.round(me.y), dir: me.dir }); if (!me.moving) room.track(meta()); lastSend = now; }
    for (const o of others.values()) {
      const dx = o.tx - o.x, dy = o.ty - o.y, d = Math.hypot(dx, dy);
      o.moving = d > 1; if (o.moving) { const s = Math.min(d, SPEED * 1.2 * dt); o.x += (dx / d) * s; o.y += (dy / d) * s; o.anim += dt; }
    }
    draw(); requestAnimationFrame(step);
  }
  function draw() {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(ground, 0, 0, cv.width, cv.height);
    if (TALL) { banner(ctx, MW * T / 2 - 50, 40, A.color, sc); banner(ctx, MW * T / 2 + 40, 40, A.color, sc); if (D) { banner(ctx, MW * T / 2 - 50, MH * T - 8, D.color, sc); banner(ctx, MW * T / 2 + 40, MH * T - 8, D.color, sc); } }
    else { banner(ctx, 14, MH * T / 2 - 20, A.color, sc); banner(ctx, 14, MH * T / 2 + 40, A.color, sc);
      if (D) { banner(ctx, MW * T - 28, MH * T / 2 - 20, D.color, sc); banner(ctx, MW * T - 28, MH * T / 2 + 40, D.color, sc); } }
    const list = [...others.values()].map((o) => ({ n: o, m: o.meta, me: false })).concat([{ n: me, m: meta(), me: true }]).sort((a, b) => a.n.y - b.n.y);
    const fsz = Math.max(10, Math.round(sc * 3.2)); swords = [];
    for (const { n, m, me: isMe } of list) {
      const frame = n.moving ? [1, 0, 2, 0][Math.floor(n.anim * 8) % 4] : 0, spr = ninjaSprite(m.look || {}, n.dir || 0, frame);
      ctx.fillStyle = 'rgba(30,20,10,.3)'; ctx.fillRect((n.x - 6) * sc, (n.y - 1) * sc, 12 * sc, 2 * sc);
      if (m.asleep) ctx.globalAlpha = 0.6;
      ctx.drawImage(spr, Math.round((n.x - spr.width / 2) * sc), Math.round((n.y - spr.height + 1) * sc), spr.width * sc, spr.height * sc);
      ctx.globalAlpha = 1;
      const enemy = mySide && m.side && m.side !== mySide;
      ctx.font = `${fsz}px 'Pixelify Sans', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      const label = (m.asleep ? '💤 ' : '') + m.name, sx = n.x * sc, sy = (n.y - 32) * sc;
      drawNameTag(ctx, sx, sy, label, +m.level || 0, fsz, { plate: enemy ? 'rgba(160,30,24,.85)' : isMe ? 'rgba(36,22,14,.8)' : 'rgba(36,22,14,.6)', color: isMe ? '#ffe07a' : '#fff4dc' });
      ctx.font = `${fsz}px 'Pixelify Sans', sans-serif`; ctx.textAlign = 'center';
      if (!isMe && canAttack(m)) { // the clickable crossed swords above an enemy's head
        const bs = Math.round(fsz * 1.9), bx = Math.round(sx - bs / 2), by = Math.round(sy - fsz - 6 - bs), pulse = 1 + 0.08 * Math.sin(performance.now() / 160);
        ctx.save(); ctx.translate(bx + bs / 2, by + bs / 2); ctx.scale(pulse, pulse);
        ctx.fillStyle = '#24160e'; ctx.fillRect(-bs / 2 - 2, -bs / 2 - 2, bs + 4, bs + 4); ctx.fillStyle = '#c43c32'; ctx.fillRect(-bs / 2, -bs / 2, bs, bs);
        ctx.fillStyle = '#f2c14a'; ctx.fillRect(-bs / 2, bs / 2 - 3, bs, 3);
        ctx.font = `${Math.round(bs * 0.7)}px sans-serif`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; fillTextPx(ctx, '⚔️', 0, 1); ctx.restore();
        swords.push({ x: bx, y: by, w: bs, h: bs, m });
      }
    }
    if (me.tx != null) { ctx.fillStyle = '#c43c32'; ctx.fillRect((me.tx - 1) * sc, (me.ty - 1) * sc, 2 * sc, 2 * sc); }
  }
  requestAnimationFrame(step);
  if (net.isOffline()) window.__wf = { others, me, cv, get sc() { return sc; } };
  return { close };
}
