// The live village: movement, camera, other players, chat, interactions.
import * as net from './net.js';
import { fillTextPx, measurePx, crispBody } from './pixemoji.js';
import { drawNameTag } from './numfont.js';
import { openProfile } from './profile.js';
import { gearIconHTML } from './itemicons.js';
import { buildWorld, blocked, T, MW, MH, BUILDINGS, STATUES } from './world.js';
import { openArena, statueSprite } from './arenaui.js';
import { openWorldMap } from './worldmap.js';
import { openLair } from './raidui.js';
import { openKageTower } from './kageui.js';
import { openWarField } from './warfield.js';
import { openLoadout } from './loadout.js';
import { openShop } from './shop.js';
import { openLibrary } from './library.js';
import { openMarket } from './market.js';
import { openHospital, injuredLeft, mmss } from './hospital.js';
import { openGear } from './gear.js';
import { ninjaSprite, emblem, VILLAGES, lookOf, drawNinjaFit } from './sprites.js';
import { openMissionBoard, openTraining, runBattle, openExamHall } from './battle.js';
import { setupDuels } from './duelui.js';
import { setupGuide } from './guide.js';
import { openHandbook } from './handbook.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const SPEED = 78; // px per second
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

export async function enterWorld(app, char, hooks) {
  const world = buildWorld(char.village);
  const me = {
    id: char.user_id || 'me', name: char.name, village: char.village, rank: char.rank, level: char.level, look: lookOf(char.appearance, char.gear),
    x: world.spawn.x, y: world.spawn.y, dir: 0, moving: false, anim: 0,
  };
  if (char.pos_x && char.pos_y && !blocked(world, char.pos_x, char.pos_y)) { me.x = char.pos_x; me.y = char.pos_y; }
  else for (let i = 0; i < 20; i++) { // new arrivals spread out around the spawn point so two ninja never stand on the exact same spot
    const x = world.spawn.x + (Math.random() - 0.5) * 64, y = world.spawn.y + (Math.random() - 0.5) * 32;
    if (!blocked(world, x, y)) { me.x = x; me.y = y; break; }
  }
  const others = new Map(); // id -> {meta, x,y, tx,ty, dir, moving, anim, last}
  const bubbles = new Map(); // id -> {text, until}
  const v = VILLAGES[char.village];
  char._loadedAt = char._loadedAt || Date.now();
  setInterval(() => { try { refreshPlate(); } catch {} }, 10000);

  // ---------- DOM ----------
  const root = h(`
  <div class="world">
    <canvas id="view"></canvas>
    <div class="hud-top">
      <div class="plate">
        <canvas class="face" width="36" height="36"></canvas>
        <div><b>${esc(char.name)}</b><small id="plateSub">Lv ${char.level} · ${esc(char.rank)}</small></div>
      </div>
      <div class="hud-right">
        <div class="online" title="Ninja in this village right now">👥 <span id="count">1</span><span class="ow"> here</span></div>
        <button class="injured" id="injured" hidden title="Injured: tap to visit the Hospital">🤕 <span></span></button>
        <button class="btn small primary train-btn" id="trainBtn">⭐ Train<i id="ptsBadge" hidden></i></button>
        <button class="btn small ghost hb-btn" id="hbBtn" title="Ninja Handbook" aria-label="Ninja Handbook">📖</button>
        <button class="btn small ghost" id="menuBtn" aria-label="Menu">☰<span class="ml"> Menu</span></button>
      </div>
    </div>
    <div class="vname"><span class="em"></span>${esc(v.name)} Village</div>
    <div class="sleep-bar" id="sleepBar" hidden>💤 <span>You are asleep: nobody can challenge or attack you. You can chat and look around, but not fight or train.</span><button class="btn small primary" id="wakeBtn">☀️ Wake up</button></div>
    <button class="prompt" id="prompt" hidden></button>
    <div class="chat" id="chat">
      <div class="chat-tabs"><button data-ch="village" class="on">Village</button><button data-ch="world">World</button><button class="chat-close" id="chatClose" aria-label="Close chat">✕</button></div>
      <div class="chat-log" id="log"></div>
      <form class="chat-form" id="chatForm"><input id="chatIn" maxlength="120" placeholder="${isTouch ? 'Say something…' : 'Press Enter to chat'}" autocomplete="off"><button class="btn small primary" type="submit">Send</button></form>
    </div>
    <button class="chat-toggle btn icon" id="chatToggle" aria-label="Open chat">💬<i id="unread" hidden></i></button>
    <div class="menu scroll" id="menu" hidden>
      <button class="btn ghost" id="mProfile">My Ninja & training</button>
      <button class="btn ghost" id="mGear">${gearIconHTML('genin_head', 18)} Equipment</button>
      <button class="btn ghost" id="mPlayer">🥷 My profile</button>
      <button class="btn ghost" id="mHelp">📖 Ninja Handbook</button>
      <a class="btn ghost" id="mDiscord" href="https://discord.gg/t2K3uCGrJv" target="_blank" rel="noopener">💬 Join our Discord</a>
      <button class="btn ghost" id="mSleep">💤 Go to sleep</button>
      <button class="btn ghost" id="mUnmute" hidden>🔊 Unmute everyone</button>
      <button class="btn ghost" id="mOut">Sign out</button>
      <button class="btn ghost danger-text" id="mDelete">Delete my account</button>
      <button class="btn ghost" id="mClose">Close</button>
    </div>
    <div class="modal-wrap" id="modal" hidden><div class="scroll modal"></div></div>
  </div>`);
  app.innerHTML = ''; app.appendChild(root);
  document.body.classList.add('in-world');
  root.querySelector('.vname .em').appendChild(emblem(char.village, 18));
  setTimeout(() => refreshPlate(), 0);
  const face = root.querySelector('.face').getContext('2d');
  face.imageSmoothingEnabled = false;
  const fs = ninjaSprite(me.look, 0, 0);
  const drawFace = () => { face.clearRect(0, 0, 36, 36); face.drawImage(ninjaSprite(me.look, 0, 0), 4, 0, 16, 16, 0, 1, 36, 36); };
  drawFace();

  const view = root.querySelector('#view');
  const ctx = view.getContext('2d');
  let scale = 3, vw = 0, vh = 0;
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    vw = innerWidth; vh = innerHeight;
    view.width = Math.round(vw * dpr); view.height = Math.round(vh * dpr);
    view.style.width = vw + 'px'; view.style.height = vh + 'px';
    scale = Math.max(2, Math.floor(Math.min(vw, vh) / (T * 12))) * dpr;
  }
  resize(); addEventListener('resize', resize);

  // ---------- input: click / tap to move ----------
  const typing = () => document.activeElement && document.activeElement.tagName === 'INPUT';
  const onKey = (e) => {
    if (typing()) { if (e.key === 'Escape') document.activeElement.blur(); return; }
    if (root.querySelector('.ov')) { if (e.key === 'Escape') { const o = root.querySelector('.ov:not(.battle)'); o && o.remove(); } return; }
    if (e.type !== 'keydown') return;
    if (e.key === 'Enter') { e.preventDefault(); openChat(); chatIn.focus(); }
    if (e.key === 'Escape') { closeModal(); menu.hidden = true; }
  };
  addEventListener('keydown', onKey);
  let path = [], dest = null, pendingSpot = null;
  const walkable = (tx, ty) => tx >= 0 && ty >= 0 && tx < MW && ty < MH && !world.solid[ty * MW + tx];
  function findPath(sx, sy, gx, gy) {
    const S = sy * MW + sx, G = gy * MW + gx;
    if (S === G) return [];
    const g = new Map([[S, 0]]), from = new Map(), open = [[0, S]], seen = new Set();
    const hfn = (i) => { const x = i % MW, y = (i / MW) | 0, dx = Math.abs(x - gx), dy = Math.abs(y - gy); return Math.max(dx, dy) + 0.41 * Math.min(dx, dy); };
    while (open.length) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
      const [, cur] = open.splice(bi, 1)[0];
      if (cur === G) break;
      if (seen.has(cur)) continue; seen.add(cur);
      const cx = cur % MW, cy = (cur / MW) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (!walkable(nx, ny)) continue;
        if (dx && dy && (!walkable(cx + dx, cy) || !walkable(cx, cy + dy))) continue;
        const n = ny * MW + nx, cost = g.get(cur) + (dx && dy ? 1.41 : 1);
        if (cost < (g.has(n) ? g.get(n) : Infinity)) { g.set(n, cost); from.set(n, cur); open.push([cost + hfn(n), n]); }
      }
      if (seen.size > 3000) break;
    }
    if (!from.has(G)) return null;
    const out = []; let c = G;
    while (c !== S) { out.push({ x: (c % MW) * T + 8, y: ((c / MW) | 0) * T + 12 }); c = from.get(c); }
    return out.reverse();
  }
  function nearestWalkable(tx, ty) {
    for (let r = 0; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++)
      if ((Math.abs(dx) === r || Math.abs(dy) === r) && walkable(tx + dx, ty + dy)) return [tx + dx, ty + dy];
    return null;
  }
  // path from (fx,fy) to (wx,wy) in world pixels, or null
  function planPath(fx, fy, wx, wy) {
    const st = [Math.floor(fx / T), Math.floor((fy - 2) / T)];
    const start = walkable(st[0], st[1]) ? st : nearestWalkable(st[0], st[1]);
    let gt = [Math.floor(wx / T), Math.floor(wy / T)];
    if (!walkable(gt[0], gt[1])) { gt = nearestWalkable(gt[0], gt[1]); if (!gt) return null; wx = gt[0] * T + 8; wy = gt[1] * T + 12; }
    if (!start) return null;
    const p = findPath(start[0], start[1], gt[0], gt[1]);
    if (!p) return null;
    p.push({ x: wx, y: wy });
    return { path: p, x: wx, y: wy };
  }
  function goTo(wx, wy, spot = null) {
    const r = planPath(me.x, me.y, wx, wy); if (!r) return;
    path = r.path; dest = { x: r.x, y: r.y, t: 0 }; pendingSpot = spot;
    announceMove(); // one message per click: where I am and where I'm going
  }
  function spotAt(wx, wy) {
    for (const b of BUILDINGS) {
      if (!b.name) continue;
      const roof = b.big ? 3 : 2;
      if (wx >= b.x * T && wx < (b.x + b.w) * T && wy >= (b.y - roof) * T && wy < (b.y + b.h) * T + 6) return world.spots.find((s) => s.id === b.id);
    }
    for (const s of world.spots) if (Math.hypot(s.x - wx, s.y - wy) < 18) return s;
    const gate = world.spots.find((s) => s.id === 'gate');
    if (gate && Math.abs(wx - gate.x) < 48 && wy > gate.y - 30) return gate;
    return null;
  }

  // tap on another player -> card
  view.addEventListener('click', (e) => {
    const wx = camX + e.clientX * (view.width / vw) / scale, wy = camY + e.clientY * (view.height / vh) / scale;
    for (const o of others.values()) {
      if (Math.abs(wx - o.x) < 10 && wy < o.y + 2 && wy > o.y - 31) { playerCard(o.meta); return; }
    }
    if (root.querySelector('.ov') || !modal.hidden) return;
    for (const st of STATUES) { const bx = st.x * T + 8, by = (st.y + 1) * T; if (Math.abs(wx - bx) < 12 && wy < by + 2 && wy > by - 42) { statueCard(st); return; } }
    const sp = spotAt(wx, wy);
    if (sp) { if (Math.hypot(sp.x - me.x, sp.y - me.y) < 22) { interact(sp); return; } goTo(sp.x, sp.y, sp); }
    else goTo(wx, wy);
  });

  // ---------- chat ----------
  const log = root.querySelector('#log'), chatIn = root.querySelector('#chatIn'), chatBox = root.querySelector('#chat');
  const unread = root.querySelector('#unread');
  let chatTab = 'village', lastSent = 0;
  const msgs = [], seenMsg = new Set();
  const muteKey = 'sr_muted_' + char.user_id;
  let muted = new Set(); try { muted = new Set(JSON.parse(localStorage.getItem(muteKey) || '[]')); } catch {}
  const saveMuted = () => { try { localStorage.setItem(muteKey, JSON.stringify([...muted])); } catch {} };
  root.querySelectorAll('.chat-tabs [data-ch]').forEach((b) => (b.onclick = () => {
    chatTab = b.dataset.ch; root.querySelectorAll('.chat-tabs [data-ch]').forEach((x) => x.classList.toggle('on', x === b)); renderLog();
  }));
  function openChat() { chatBox.classList.add('open'); unread.hidden = true; }
  root.querySelector('#chatToggle').onclick = () => { chatBox.classList.contains('open') ? chatBox.classList.remove('open') : openChat(); };
  root.querySelector('#chatClose').onclick = () => chatBox.classList.remove('open');
  function addMsg(m) {
    msgs.push(m); if (msgs.length > 120) msgs.shift();
    if (m.ch === chatTab || m.sys) renderLog();
    if (!chatBox.classList.contains('open') && isTouch && !m.sys) unread.hidden = false;
  }
  function renderLog() {
    log.innerHTML = msgs.filter((m) => m.ch === chatTab || m.sys).slice(-60).map((m) => m.sys
      ? `<p class="sys">${esc(m.text)}</p>`
      : `<p><b class="who" data-mid="${m.mid || ''}" style="color:${(VILLAGES[m.village] || v).dark}">${esc(m.name)}</b> ${esc(m.text)}</p>`).join('');
    log.scrollTop = log.scrollHeight;
  }
  // tap a name in chat: mute that player (only for you) or report the message to the moderators
  log.addEventListener('click', (e) => {
    const b = e.target.closest('.who'); if (!b) return;
    const m = msgs.find((x) => String(x.mid) === b.dataset.mid); if (!m || m.id === me.id) return;
    showModal(`<h3>${esc(m.name)}</h3><p class="q">"${esc(m.text)}"</p>
      <div class="col"><button class="btn" data-prof>🥷 View profile</button><button class="btn" data-mute>🔇 Mute ${esc(m.name)} (only you stop seeing them)</button>
      <button class="btn danger" data-report>🚩 Report this message</button></div>`, (el) => {
      el.querySelector('[data-prof]').onclick = () => { closeModal(); openProfile(root, { userId: m.id }); };
      el.querySelector('[data-mute]').onclick = () => {
        muted.add(m.id); saveMuted();
        for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].id === m.id && !msgs[i].sys) msgs.splice(i, 1);
        renderLog(); closeModal(); addMsg({ sys: true, text: `You muted ${m.name}. Unmute them from the ☰ Menu.` });
      };
      el.querySelector('[data-report]').onclick = async () => {
        try { const r = await net.reportChat(m.mid); closeModal(); addMsg({ sys: true, text: r && r.muted ? `Thanks. ${m.name} has been muted for an hour while we look into it.` : 'Thanks. The report has been sent to the moderators.' }); }
        catch (err) { closeModal(); addMsg({ sys: true, text: err.message }); }
      };
    });
  });
  // a message from the server: the name and village are stamped by the server, so they can't be faked
  function onChat(ev, p) {
    if (ev !== 'msg' || !p || seenMsg.has(p.id)) return;
    seenMsg.add(p.id);
    if (muted.has(p.uid)) return;
    addMsg({ mid: p.id, id: p.uid, name: String(p.name), village: p.village, text: String(p.text), ch: p.ch === 'world' ? 'world' : 'village' });
    if (p.ch === 'village' && p.uid !== me.id) bubbles.set(p.uid, { text: String(p.text), until: performance.now() + 5000 });
  }
  async function announce(text, ch) { try { onChat('msg', await net.say(text, ch)); } catch {} }
  root.querySelector('#chatForm').onsubmit = (e) => {
    e.preventDefault();
    const text = chatIn.value.replace(/\s+/g, ' ').trim().slice(0, 120);
    if (!text) { chatIn.blur(); return; }
    if (Date.now() - lastSent < 1200) return;
    lastSent = Date.now();
    const ch = chatTab;
    chatIn.value = '';
    if (!isTouch) chatIn.blur();
    net.say(text, ch).then((m) => { onChat('msg', m); if (ch === 'village') bubbles.set(me.id, { text: m.text, until: performance.now() + 5000 }); })
      .catch((err) => { chatIn.value = text; addMsg({ sys: true, text: err.message }); });
  };
  addMsg({ sys: true, text: `Welcome to ${v.name}. ${isTouch ? 'Tap' : 'Click'} the ground to walk, and ${isTouch ? 'tap' : 'click'} a building to go inside.` + (isTouch ? '' : ' Press Enter to chat.') + ' Stuck? Open 📖 the Ninja Handbook' + (isTouch ? ' from the ☰ Menu.' : '.') });

  // ---------- menu / modal ----------
  const menu = root.querySelector('#menu'), modal = root.querySelector('#modal');
  root.querySelector('#menuBtn').onclick = () => (menu.hidden = !menu.hidden);
  root.querySelector('#mClose').onclick = () => (menu.hidden = true);
  root.querySelector('#mOut').onclick = async () => { await leave(); net.signOut(); };
  root.querySelector('#mPlayer').onclick = () => { menu.hidden = true; openProfile(root); };
  const plateEl = root.querySelector('.plate'); plateEl.style.cursor = 'pointer'; plateEl.title = 'My profile';
  plateEl.addEventListener('click', () => openProfile(root));
  const unmuteBtn = root.querySelector('#mUnmute');
  root.querySelector('#menuBtn').addEventListener('click', () => { unmuteBtn.hidden = !muted.size; unmuteBtn.textContent = `🔊 Unmute ${muted.size} player${muted.size === 1 ? '' : 's'}`; });
  unmuteBtn.onclick = () => { muted.clear(); saveMuted(); menu.hidden = true; addMsg({ sys: true, text: 'Everyone is unmuted. New messages from them will show again.' }); };
  root.querySelector('#mDelete').onclick = () => {
    menu.hidden = true;
    showModal(`<h3>Delete my account</h3>
      <p>This permanently deletes <b>${esc(char.name)}</b>, everything they own, your chat messages and your login. It cannot be undone, and we cannot bring it back.</p>
      <label class="lbl">Type your ninja's name to confirm<input id="delName" autocomplete="off" maxlength="16" placeholder="${esc(char.name)}"></label>
      <button class="btn danger" id="delGo" disabled>Delete everything</button>`, (el) => {
      const inp = el.querySelector('#delName'), go = el.querySelector('#delGo');
      const okBtn = el.querySelector('[data-close]'); okBtn.textContent = 'Keep my account'; okBtn.className = 'btn ghost';
      inp.oninput = () => (go.disabled = inp.value.trim().toLowerCase() !== char.name.toLowerCase());
      go.onclick = async () => {
        go.disabled = true; go.textContent = 'Deleting…';
        try { await net.deleteAccount(); await leave(); el.innerHTML = '<h3>Account deleted</h3><p>Your ninja and your data are gone. Thank you for playing Shinobi Realms.</p>'; setTimeout(() => location.reload(), 2500); }
        catch (err) { go.disabled = false; go.textContent = 'Delete everything'; go.insertAdjacentHTML('afterend', `<p class="err">${esc(err.message)}</p>`); }
      };
    });
  };
  root.querySelector('#mProfile').onclick = () => { menu.hidden = true; train(); };
  async function toggleSleep(on) {
    try { Object.assign(char, await net.setSleep(on), { _loadedAt: Date.now() }); } catch (e) { showModal(`<h3>💤 Sleep</h3><p>${esc(e.message)}</p>`); return; }
    menu.hidden = true; refreshSleep(); room?.track(meta());
    bubbles.set(me.id, { text: on ? 'Zzz… 💤' : 'Good morning! ☀️', until: performance.now() + 4000 });
  }
  function refreshSleep() {
    const z = !!char.asleep_since;
    root.querySelector('#sleepBar').hidden = !z;
    root.querySelector('#mSleep').textContent = z ? '☀️ Wake up' : '💤 Go to sleep';
    root.classList.toggle('asleep', z);
  }
  root.querySelector('#mSleep').onclick = () => toggleSleep(!char.asleep_since);
  const shop = (tab) => openShop(root, char, () => refreshPlate(), tab);
  const gear = () => openGear(root, char, { onChange: () => refreshPlate(), openShop: () => shop('weapons') });
  root.querySelector('#mGear').onclick = () => { menu.hidden = true; gear(); };
  root.querySelector('#wakeBtn').onclick = () => toggleSleep(false);
  setTimeout(refreshSleep, 0);
  root.querySelector('#trainBtn').onclick = () => train();
  const handbook = (pg) => { menu.hidden = true; openHandbook(root, pg); };
  root.querySelector('#hbBtn').onclick = () => handbook();
  root.querySelector('#mHelp').onclick = () => handbook();
  const guide = setupGuide(root, char, { openHandbook: () => handbook(), goToSpot: (id) => { const sp = world.spots.find((s) => s.id === id); if (!sp) return; if (Math.hypot(sp.x - me.x, sp.y - me.y) < 22) interact(sp); else goTo(sp.x, sp.y, sp); } });
  function train(tab = 'stats') { openTraining(root, () => char, (c) => { Object.assign(char, c); guide.mark('trained'); refreshPlate(); }, tab); }
  function refreshPlate() {
    root.querySelector('#plateSub').textContent = `Lv ${char.level} · ${char.rank}`;
    root.querySelector('#ptsBadge').hidden = !(char.energy + Math.floor((Date.now() - (char._loadedAt || Date.now())) / 1000 / (char.energy_regen_sec || 9)) >= (char.energy_max || 100));
    me.level = char.level; me.rank = char.rank;
    const nl = lookOf(char.appearance, char.gear); if (JSON.stringify(nl) !== JSON.stringify(me.look)) { me.look = nl; drawFace(); room?.track(meta()); }
    guide?.update();
  }
  if (net.isOffline()) window.__game = { startBattle: (m) => startBattle(m), board: () => openMissionBoard(root, char, startBattle), char, exam: () => startExam(), hall: () => openExamHall(root, char, startExam, startLesson), map: (f) => worldMap(f), shop: (t) => shop(t), library: () => openLibrary(root, char, () => refreshPlate()), market: () => openMarket(root, char, () => refreshPlate()), hospital: () => openHospital(root, char, () => refreshPlate()), gear: () => gear(), tower: (t) => kageTower(t), war: (id) => warAt(id), lesson: (id) => startLesson(id), guide: () => guide, handbook: (p) => handbook(p), click: (x, y) => { const sp = spotAt(x, y); sp ? goTo(sp.x, sp.y, sp) : goTo(x, y); }, me };
  function startExam() { startBattle(null, () => net.startExam()); }
  function startLesson(id) { startBattle(null, () => net.startLesson(id)); }
  let warReturn = null; // reopen the war camp after a war duel
  function warCamp(war, name) {
    path = []; dest = null; warReturn = { war, name };
    if (char.asleep_since) { showModal('<h3>💤 You are asleep</h3><p>Wake up (☀️ in the menu) to join the war.</p>'); return; }
    openWarField(root, char, war, name, { challenge: (p, warId) => duels.challenge(p, 'war', warId), onClose: () => { warReturn = null; worldMap(war.territory); } });
  }
  async function warAt(territoryId) {
    try { const v = await net.villageInfo(); const t = v.territories.find((x) => x.id === territoryId); if (t && t.war) warCamp(t.war, t.name); else worldMap(territoryId); } catch { worldMap(territoryId); }
  }
  function kageTower(tab) {
    path = []; dest = null;
    openKageTower(root, char, { challengeKage: (k) => duels.challenge({ id: k.id, name: k.name }, 'kage'), openWar: warAt }, tab);
  }
  function worldMap(focus) {
    path = []; dest = null;
    openWorldMap(root, char, {
      focus, onWar: (war, name) => warCamp(war, name),
      onQuest: (line) => startBattle(null, () => net.startQuest(line), (r) => { if (!r || !r.train) worldMap(); }),
      onLair: (line) => openLair(root, char, line, async (r) => {
        try { Object.assign(char, await net.loadCharacter(), { _loadedAt: Date.now() }); refreshPlate(); } catch {}
        if (r && r.status === 'won') announce(`helped defeat ${line.boss_name}! ☠️`, 'world');
        worldMap();
      }),
      onHome: () => {},
    });
  }
  const duels = setupDuels(root, char, {
    canStart: () => !root.querySelector('.ov.battle'),
    stopWalking: () => { path = []; dest = null; closeModal(); root.querySelectorAll('.ov').forEach((o) => o.remove()); },
    onEnd: async (r, d) => {
      try { Object.assign(char, await net.loadCharacter(), { _loadedAt: Date.now() }); } catch {}
      refreshPlate(); loadChampions();
      if (d && d.kind === 'war' && warReturn) setTimeout(() => warCamp(warReturn.war, warReturn.name), 300);
      if (r && r.status === 'won' && d && d.kind === 'kage' && d.a === char.user_id) announce('is the new Kage! 👑', 'village');
      if (r && r.status === 'won') { const foe = d.a === char.user_id ? d.b_name : d.a_name; announce(`won a duel against ${foe}! ⚔️`, 'village'); }
    },
  });
  if (net.isOffline()) window.__duels = duels;
  net.claimArenaReward().then(async (r) => {
    if (!r) return;
    try { Object.assign(char, await net.loadCharacter(), { _loadedAt: Date.now() }); refreshPlate(); } catch {}
    showModal(`<div class="dp-ico">🏆</div><h3>Arena reward!</h3><p>You finished <b>#${r.place}</b> on yesterday's ${esc(r.rank)} board.</p><p class="big">+${r.ryo} ryo</p><p>Your energy refills <b>${r.mult}× faster</b> all day today.</p>`);
  });
  function startBattle(mid, starter = null, after = null) {
    path = []; dest = null;
    if (char.asleep_since) { showModal('<h3>💤 You are asleep</h3><p>Wake up (☀️ in the menu) to fight.</p>'); return; }
    openLoadout(root, char, { title: 'Prepare for battle', sub: 'Choose the jutsu and items to bring. The fight starts when you are ready, or in 60 seconds.', onReady: () => fight() });
    const fight = () => runBattle(root, char, mid, async (r) => {
      try { Object.assign(char, await net.loadCharacter(), { _loadedAt: Date.now() }); } catch {}
      refreshPlate(); room?.track(meta());
      if (r && r.result && r.result.promoted) {
        announce(`passed the exam and is now a ${r.result.promoted}! 🎉`, 'world'); bubbles.set(me.id, { text: `I'm a ${r.result.promoted} now!`, until: performance.now() + 5000 });
      }
      if (r && r.status === 'won' && r.result && r.result.leveled) announce(`reached level ${char.level}! 🎉`, 'village');
      if (r && r.train) train(r.result && r.result.promoted ? 'jutsu' : 'stats');
      if (mid && r && r.status === 'won') guide.mark('mission');
      if (after) after(r);
    }, starter);
  }
  function showModal(html, onReady) {
    modal.querySelector('.modal').innerHTML = html + `<button class="btn primary" data-close>OK</button>`;
    modal.hidden = false; modal.querySelectorAll('[data-close]').forEach((b) => (b.onclick = closeModal));
    onReady && onReady(modal.querySelector('.modal'));
  }
  function closeModal() { modal.hidden = true; }
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  let champions = {};
  const loadChampions = () => net.arenaChampions().then((c) => (champions = c || {})).catch(() => {});
  loadChampions(); const champTimer = setInterval(loadChampions, 120000);
  function statueCard(st) {
    const ch = champions[st.rank], vv = ch ? VILLAGES[ch.village] || v : v;
    showModal(ch ? `<div class="pcard"><canvas width="66" height="120"></canvas><div><p class="soon">🏆 ${st.rank} Champion</p><h3>${esc(ch.name)}</h3><p style="color:${vv.dark}"><b>${vv.name}</b></p><p>Level ${ch.level} · <b>${ch.points}</b> Arena points</p></div></div><p class="sub">The ${st.rank} with the most Arena points of all time. Win duels to take their place on this pedestal.</p>`
      : `<h3>🏆 ${st.rank} Champion</h3><p>This pedestal is empty. The first ${st.rank} to win Arena points gets their statue here!</p>`, (el) => {
      const c = el.querySelector('canvas'); if (!c) return; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; const img = statueSprite(ch.look); x.drawImage(img, 0, 0, img.width * 3, img.height * 3);
    });
  }
  function playerCard(m) {
    const vv = VILLAGES[m.village] || v;
    showModal(`<div class="pcard"><canvas width="64" height="80"></canvas><div><h3>${esc(m.name)}</h3>${m.title ? `<p class="ttl">🏆 ${esc(m.title)}</p>` : ''}<p style="color:${vv.dark}"><b>${vv.name}</b></p><p>${esc(m.rank || 'Academy Student')} · Level ${m.level || 1}</p>${m.asleep ? '<p>💤 <b>Asleep</b></p>' : ''}</div></div>${m.asleep ? '<p class="soon">This ninja is asleep and can\'t be challenged.</p>' : char.asleep_since ? '<p class="soon">You are asleep. Wake up to duel.</p>' : char.rank === 'Academy Student' ? '<p class="soon">Academy students can\'t duel. Practise in the sparring lessons at the Academy, then graduate.</p>' : (m.rank || 'Academy Student') === 'Academy Student' ? '<p class="soon">Academy students can\'t be challenged.</p>' : '<button class="btn primary" data-duel>⚔️ Challenge to a duel</button>'}<button class="btn ghost" data-prof>🥷 View profile</button>`, (el) => {
      el.querySelector('[data-prof]').onclick = () => { closeModal(); openProfile(root, { userId: m.id }); };
      const c = el.querySelector('canvas').getContext('2d'); c.imageSmoothingEnabled = false;
      drawNinjaFit(el.querySelector('canvas'), m.look || {});
      const db = el.querySelector('[data-duel]'); if (db) db.onclick = () => { closeModal(); duels.challenge(m); };
    });
  }
  const SPOT_TEXT = {
    shop: ['Tool Shop', 'Kunai, shuriken and scrolls are on their way. The shopkeeper is still unpacking crates.'],
  };
  function interact(target) {
    if (root.querySelector('.ov')) return;
    const s = target || nearSpot(); if (!s) return;
    path = []; dest = null; pendingSpot = null;
    if (s.id === 'missions') { openMissionBoard(root, char, startBattle); return; }
    if (s.id === 'academy') { openExamHall(root, char, startExam, startLesson); return; }
    if (s.id === 'arena') { openArena(root, char); return; }
    if (s.id === 'gate') { worldMap(); return; }
    if (s.id === 'kage') { kageTower(); return; }
    if (s.id === 'shop') { shop(); return; }
    if (s.id === 'hospital') { openHospital(root, char, () => refreshPlate()); return; }
    if (s.id === 'market') { openMarket(root, char, () => refreshPlate()); return; }
    if (s.id === 'library') { openLibrary(root, char, () => refreshPlate()); return; }
    const [title, text] = SPOT_TEXT[s.id] || [s.name, ''];
    showModal(`<h3>${title}</h3><p>${text}</p>`);
  }
  function nearSpot() { for (const s of world.spots) if (Math.hypot(s.x - me.x, s.y - me.y) < 22) return s; return null; }
  const promptEl = root.querySelector('#prompt');

  // ---------- network ----------
  let room = null, chatRooms = [], lastTrack = 0, lastSave = performance.now(), savedAt = { x: 0, y: 0 };
  const BUILD = '2026-11-14a';
  let newerSeen = false;
  const meta = () => ({ v: BUILD, id: me.id, asleep: !!char.asleep_since, title: char.title || null, name: me.name, village: me.village, rank: me.rank, level: me.level, look: me.look, x: Math.round(me.x), y: Math.round(me.y), dir: me.dir });
  // Movement is sent as "I'm here, heading there" once per click; everyone replays the walk locally.
  function announceMove() { if (room) room.send('mv', { id: me.id, x: Math.round(me.x), y: Math.round(me.y), tx: dest ? Math.round(dest.x) : Math.round(me.x), ty: dest ? Math.round(dest.y) : Math.round(me.y), dir: me.dir }); }
  let helloTimer = null; // when someone new arrives, tell them where we are (once, batched)
  const sayHello = () => { clearTimeout(helloTimer); helloTimer = setTimeout(announceMove, 600 + Math.random() * 1400); };
  const onEvent = (ev, p) => {
    if (!p || p.id === me.id) return;
    if (ev === 'mv') {
      const o = others.get(p.id); if (!o) return;
      o.last = performance.now(); o.dir = p.dir ?? o.dir;
      if (p.tx != null) { // destination move: correct position if we drifted, then walk the same path
        if (Math.hypot(o.x - p.x, o.y - p.y) > 24) { o.x = p.x; o.y = p.y; }
        const r = planPath(o.x, o.y, p.tx, p.ty); o.path = r ? r.path : null; o.tx = p.tx; o.ty = p.ty;
      } else { o.path = null; o.tx = p.x; o.ty = p.y; o.moving = !!p.m; } // older clients and practice bots
    }
  };
  const countEl = root.querySelector('#count');
  const onPresence = (list) => {
    const seen = new Set();
    for (const raw of list) {
      if (!raw || raw.id === me.id || typeof raw.id !== 'string') continue;
      // other players' data comes from their browsers: keep it to sane sizes before we use it
      const m = { ...raw, name: String(raw.name || '?').replace(/[^A-Za-z0-9_ ]/g, '').slice(0, 16) || '?', title: raw.title ? String(raw.title).slice(0, 32) : null, x: +raw.x || 0, y: +raw.y || 0 };
      seen.add(m.id);
      if (!newerSeen && m.v && m.v > BUILD) { newerSeen = true; addMsg({ sys: true, text: 'A newer version of the game is out. Refresh the page to update.' }); }
      if (!others.has(m.id)) { sayHello(); others.set(m.id, { meta: m, x: m.x, y: m.y, tx: m.x, ty: m.y, dir: m.dir || 0, moving: false, anim: 0, last: performance.now() }); addMsg({ sys: true, text: `${m.name} arrived.`, ch: 'village' }); }
      else others.get(m.id).meta = m;
    }
    for (const id of [...others.keys()]) if (!seen.has(id)) { addMsg({ sys: true, text: `${others.get(id).meta.name} left.` }); others.delete(id); }
    countEl.textContent = others.size + 1;
  };
  // connection health: shown on the "here" counter, with a note in chat when it drops or comes back
  const countBtn = countEl.closest('button') || countEl.parentElement;
  // injury badge: counts down, tap to open the Hospital
  const injBtn = root.querySelector('#injured');
  injBtn.onclick = () => openHospital(root, char, () => refreshPlate());
  const injTick = setInterval(() => { const left = injuredLeft(char); injBtn.hidden = !left; if (left) injBtn.querySelector('span').textContent = mmss(left); }, 1000);
  let wasLive = null;
  const onStatus = (st, why) => {
    const live = st === 'live';
    countBtn && countBtn.classList.toggle('net-bad', !live);
    if (countBtn) countBtn.title = live ? 'Connected: players in your village can see you' : 'Reconnecting to your village…';
    if (st === 'paused') { wasLive = null; others.clear(); countEl.textContent = 1; return; }
    if (wasLive === true && !live) addMsg({ sys: true, text: 'Connection to the village lost. Reconnecting…' });
    if (wasLive === false && live) addMsg({ sys: true, text: 'Reconnected. You can see other players again.' });
    wasLive = live;
    if (live) { room && room.track(meta()); lastTrack = performance.now(); sayHello(); }
  };
  try {
    room = await net.joinRoom('village:' + char.village, { me: meta(), onEvent, onPresence, onStatus, events: ['mv'], pauseWhenHidden: 60000 });
    if (!room.ready()) addMsg({ sys: true, text: 'Still connecting to your village… other players will appear when connected.' });
    chatRooms = await Promise.all([
      net.joinRoom('chat:village:' + char.village, { onEvent: onChat, events: ['msg'], pauseWhenHidden: 60000 }),
      net.joinRoom('chat:world', { onEvent: onChat, events: ['msg'], pauseWhenHidden: 60000 })]);
  } catch (e) { addMsg({ sys: true, text: 'Could not connect to other players. You can still explore.' }); console.error(e); }

  // ---------- loop ----------
  let camX = 0, camY = 0, last = performance.now(), alive = true, t = 0;
  function step(now) {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    // movement: follow the clicked path
    const frozen = !!root.querySelector('.ov') || !modal.hidden;
    me.moving = false;
    if (!frozen && path.length) {
      const wp = path[0], dx = wp.x - me.x, dy = wp.y - me.y, d = Math.hypot(dx, dy), stepLen = SPEED * dt;
      if (d <= stepLen) { me.x = wp.x; me.y = wp.y; path.shift(); }
      else { me.x += (dx / d) * stepLen; me.y += (dy / d) * stepLen; }
      if (d > 0.5) me.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
      me.moving = true; me.anim += dt;
      if (!path.length) { dest = null; if (pendingSpot) { const sp = pendingSpot; pendingSpot = null; interact(sp); } }
    } else me.anim = 0;
    // save where we are (only after moving) so we reappear here next time
    if (now - lastSave > 15000 && (Math.abs(me.x - savedAt.x) > 4 || Math.abs(me.y - savedAt.y) > 4)) { lastSave = now; savedAt = { x: me.x, y: me.y }; net.savePosition(me.x, me.y).catch(() => {}); }
    // others interpolate
    for (const o of others.values()) {
      if (o.path && o.path.length) {
        const wp = o.path[0], dx = wp.x - o.x, dy = wp.y - o.y, d = Math.hypot(dx, dy), sl = SPEED * dt;
        if (d <= sl) { o.x = wp.x; o.y = wp.y; o.path.shift(); } else { o.x += (dx / d) * sl; o.y += (dy / d) * sl; }
        if (d > 0.5) o.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
        o.moving = o.path.length > 0; o.anim = o.moving ? o.anim + dt : 0; continue;
      }
      const dx = o.tx - o.x, dy = o.ty - o.y, d = Math.hypot(dx, dy);
      if (d > 120) { o.x = o.tx; o.y = o.ty; }
      else if (d > 0.5) { const s = Math.min(d, Math.max(SPEED * 1.15 * dt, d * 0.2)); o.x += (dx / d) * s; o.y += (dy / d) * s; o.anim += dt; }
      else if (!o.moving) o.anim = 0;
    }
    // prompt
    const s = nearSpot();
    if (s && !path.length) { promptEl.hidden = false; const tx = 'Enter ' + s.name; if (promptEl.textContent !== tx) promptEl.textContent = tx; promptEl.onclick = () => interact(s); } else promptEl.hidden = true;
    draw();
    requestAnimationFrame(step);
  }

  function draw() {
    const W = view.width, H = view.height, sc = scale;
    const viewW = W / sc, viewH = H / sc;
    camX = Math.round(Math.max(0, Math.min(MW * T - viewW, me.x - viewW / 2)));
    camY = Math.round(Math.max(0, Math.min(MH * T - viewH, me.y - 12 - viewH / 2)));
    if (viewW > MW * T) camX = Math.round((MW * T - viewW) / 2);
    if (viewH > MH * T) camY = Math.round((MH * T - viewH) / 2);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = world.th.edge === 'sea' ? world.th.water : '#2a3a1e';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(world.groundCanvas, camX, camY, viewW, viewH, 0, 0, viewW * sc, viewH * sc);
    // water shimmer
    ctx.fillStyle = world.th.waterL;
    for (let ty = Math.max(0, (camY / T) | 0); ty < Math.min(MH, (camY + viewH) / T + 1); ty++)
      for (let tx = Math.max(0, (camX / T) | 0); tx < Math.min(MW, (camX + viewW) / T + 1); tx++)
        if (world.ground[ty * MW + tx] === 3) { const o = ((t * 4 + tx * 3 + ty * 5) | 0) % 12; ctx.fillRect((tx * T + o - camX) * sc, (ty * T + 6 + (tx % 3) * 3 - camY) * sc, 3 * sc, sc); }
    // sortable drawables
    const list = [];
    for (const p of world.props) {
      if (!p.img) continue;
      const x = p.x + p.img.ox, y = p.y + p.img.oy;
      if (x > camX + viewW || y > camY + viewH || x + p.img.img.width < camX || y + p.img.img.height < camY) continue;
      list.push({ y: p.y, draw: () => ctx.drawImage(p.img.img, Math.round((x - camX) * sc), Math.round((y - camY) * sc), p.img.img.width * sc, p.img.img.height * sc) });
    }
    for (const st of STATUES) {
      const ch = champions[st.rank], img = statueSprite(ch ? ch.look : null), bx = st.x * T + 8, by = (st.y + 1) * T - 1;
      list.push({ y: by, draw: () => ctx.drawImage(img, Math.round((bx - img.width / 2 - camX) * sc), Math.round((by - img.height - camY) * sc), img.width * sc, img.height * sc),
        label: { x: bx, y: by - img.height - 2, name: st.rank, statue: true } });
    }
    const drawNinja = (n, look, isMe) => {
      const frame = n.moving || (n.anim > 0) ? [1, 0, 2, 0][Math.floor(n.anim * 8) % 4] : 0;
      const spr = ninjaSprite(look || {}, n.dir || 0, frame);
      const x = n.x - spr.width / 2, y = n.y - spr.height + 1;
      list.push({ y: n.y, draw: () => {
        ctx.fillStyle = 'rgba(30,20,10,.28)'; ctx.fillRect(Math.round((n.x - 6 - camX) * sc), Math.round((n.y - 1 - camY) * sc), 12 * sc, 2 * sc);
        ctx.drawImage(spr, Math.round((x - camX) * sc), Math.round((y - camY) * sc), spr.width * sc, spr.height * sc);
      }, label: { x: n.x, y: n.y - 32, name: ((isMe ? !!char.asleep_since : n.meta?.asleep) ? '💤 ' : '') + (n.name || n.meta?.name), lv: isMe ? char.level : +n.meta?.level || 0, me: isMe, id: n.id || n.meta?.id } });
    };
    for (const o of others.values()) drawNinja(o, o.meta.look, false);
    drawNinja(me, me.look, true);
    if (dest) {
      dest.t += 1; const pulse = 3 + ((dest.t >> 3) % 3), dx2 = Math.round((dest.x - camX) * sc), dy2 = Math.round((dest.y - camY) * sc);
      list.push({ y: -1e9, draw: () => {
        ctx.fillStyle = 'rgba(255,244,220,.85)';
        ctx.fillRect(dx2 - pulse * sc, dy2 - sc, sc, sc * 2); ctx.fillRect(dx2 + (pulse - 1) * sc, dy2 - sc, sc, sc * 2);
        ctx.fillRect(dx2 - sc, dy2 - (pulse - 1) * sc, sc * 2, sc); ctx.fillRect(dx2 - sc, dy2 + (pulse - 2) * sc, sc * 2, sc);
        ctx.fillStyle = '#c43c32'; ctx.fillRect(dx2 - sc, dy2 - sc, sc * 2, sc * 2);
      } });
    }
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.draw();
    drawGuideArrow(sc, viewW, viewH);
    // labels + bubbles (screen space, crisp text)
    const dprNow = view.width / Math.max(1, vw);
    const fsz = crispBody(Math.min(18, Math.max(14, (sc / dprNow) * 4.5)) * dprNow); // name labels and speech bubbles: ~14–18 screen px, snapped sharp
    ctx.font = `${fsz}px 'Pixelify Sans', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const now = performance.now();
    for (const d of list) {
      if (!d.label) continue;
      const L = d.label, sx = Math.round((L.x - camX) * sc), sy = Math.round((L.y - camY) * sc);
      drawNameTag(ctx, sx, sy, L.name, L.statue ? 0 : L.lv, fsz, { color: L.me || L.statue ? '#ffe07a' : '#fff4dc' });
      ctx.font = `${fsz}px 'Pixelify Sans', sans-serif`; ctx.textAlign = 'center';
      const b = bubbles.get(L.id);
      if (b && b.until > now) drawBubble(sx, sy - fsz - 6, b.text, fsz);
    }
  }
  function drawGuideArrow(sc, viewW, viewH) {
    const id = guide?.target(); if (!id) return;
    const sp = world.spots.find((x) => x.id === id); if (!sp) return;
    const bob = Math.round(Math.sin(t * 5) * 3);
    const ax = sp.x, ay = sp.y - 22 + bob; // just above the door
    const pad = 22, on = ax > camX + pad && ax < camX + viewW - pad && ay > camY + pad && ay < camY + viewH - pad;
    const px = (x, y) => [Math.round((x - camX) * sc), Math.round((y - camY) * sc)];
    ctx.save();
    if (on) { // bouncing arrow pointing down at the door
      const [x, y] = px(ax, ay), u = sc;
      ctx.fillStyle = '#24160e'; ctx.beginPath(); ctx.moveTo(x - 8 * u, y - 10 * u); ctx.lineTo(x + 8 * u, y - 10 * u); ctx.lineTo(x, y + 1 * u); ctx.closePath(); ctx.fill();
      ctx.fillRect(x - 4 * u, y - 18 * u, 8 * u, 9 * u);
      ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.moveTo(x - 6 * u, y - 9 * u); ctx.lineTo(x + 6 * u, y - 9 * u); ctx.lineTo(x, y - 1 * u); ctx.closePath(); ctx.fill();
      ctx.fillRect(x - 2 * u, y - 16 * u, 4 * u, 7 * u);
    } else { // off screen: an arrow at the screen edge pointing towards it
      const cx = camX + viewW / 2, cy = camY + viewH / 2, ang = Math.atan2(ay - cy, ax - cx);
      const m = 26, ex = Math.max(camX + m, Math.min(camX + viewW - m, cx + Math.cos(ang) * viewW)), ey = Math.max(camY + m, Math.min(camY + viewH - m, cy + Math.sin(ang) * viewH));
      const [x, y] = px(ex, ey), u = sc;
      ctx.translate(x, y); ctx.rotate(ang);
      ctx.fillStyle = '#24160e'; ctx.beginPath(); ctx.moveTo(11 * u + bob * u * 0.5, 0); ctx.lineTo(-5 * u, -9 * u); ctx.lineTo(-5 * u, 9 * u); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.moveTo(8 * u + bob * u * 0.5, 0); ctx.lineTo(-3 * u, -6 * u); ctx.lineTo(-3 * u, 6 * u); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function drawBubble(x, y, text, fsz) {
    const maxW = Math.min(240 * (view.width / vw), view.width * 0.6);
    const words = text.split(' '); const lines = []; let line = '';
    for (const w of words) { const tst = line ? line + ' ' + w : w; if (measurePx(ctx, tst) > maxW && line) { lines.push(line); line = w; } else line = tst; }
    if (line) lines.push(line);
    const lh = fsz + 2, bw = Math.max(...lines.map((l) => measurePx(ctx, l))) + 14, bh = lines.length * lh + 8;
    const bx = x - bw / 2, by = y - bh - 6;
    ctx.fillStyle = '#24160e'; ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillRect(x - 3, by + bh, 6, 4); ctx.fillStyle = '#24160e'; ctx.fillRect(x - 5, by + bh, 2, 4); ctx.fillRect(x + 3, by + bh, 2, 4); ctx.fillRect(x - 3, by + bh + 4, 6, 2);
    ctx.fillStyle = '#3a2414';
    lines.forEach((l, i) => fillTextPx(ctx, l, x, by + 4 + (i + 1) * lh - 1));
  }

  async function leave() {
    alive = false;
    removeEventListener('keydown', onKey); removeEventListener('resize', resize);
    document.body.classList.remove('in-world');
    try { await net.savePosition(me.x, me.y); } catch {}
    room?.leave(); chatRooms.forEach((r) => r.leave()); duels.stop(); clearInterval(champTimer); clearInterval(injTick);
  }
  // the page may be frozen and later restored (phones, back button): pause instead of leaving for good; joinRoom rejoins on return
  addEventListener('pagehide', (e) => { if (e.persisted) room?.pause?.(); else room?.leave(); });
  requestAnimationFrame(step);
  return { leave };
}
