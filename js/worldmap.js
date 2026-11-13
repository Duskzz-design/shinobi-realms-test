// World map (through the Village Gate): travel to quest locations and boss lairs.
import * as net from './net.js?v=9d1c820';
import { gearIconHTML } from './itemicons.js?v=9d1c820';
import * as G from './engine.js?v=9d1c820';
import { VILLAGES } from './sprites.js?v=9d1c820';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const RANKS = ['Academy Student', 'Genin', 'Chunin', 'Jonin'];
const W = 320, H = 200;
export const LOCATIONS = {
  pine: { name: 'Hidden Pine', x: 72, y: 108, icon: '🌲', kind: 'village', desc: 'A village of tall pines and quiet strength.' },
  tide: { name: 'Hidden Tide', x: 44, y: 168, icon: '🌊', kind: 'village', desc: 'A harbour village wrapped in sea fog.' },
  dune: { name: 'Hidden Ember', x: 268, y: 136, icon: '🔥', kind: 'village', desc: 'A canyon fortress in the red sands.' },
  bandit_road: { name: 'Bandit Road', x: 168, y: 118, icon: '🛤️', kind: 'quest', desc: 'The main trade road. Caravans have been going missing.' },
  watchtower: { name: 'Old Watchtower', x: 206, y: 92, icon: '🗼', kind: 'quest', desc: 'An abandoned tower overlooking the road.' },
  stronghold: { name: 'Bandit Stronghold', x: 252, y: 58, icon: '🏯', kind: 'lair', line: 'iron', desc: 'A walled fort of stolen timber, home of Warlord Gorou.' },
  misty_marsh: { name: 'Misty Marsh', x: 142, y: 164, icon: '🌫️', kind: 'quest', desc: 'Fog, reeds and things that bite.' },
  whispering_woods: { name: 'Whispering Woods', x: 112, y: 70, icon: '🍃', kind: 'quest', desc: 'Old trees that seem to murmur at night.' },
  serpent_cave: { name: 'Serpent Cave', x: 198, y: 172, icon: '🐍', kind: 'lair', line: 'serpent', desc: 'A dripping cave where Venomfang coils in the dark.' },
  ruined_shrine: { name: 'Ruined Shrine', x: 58, y: 40, icon: '⛩️', kind: 'quest', desc: 'A shrine abandoned long ago. Ghost lights flicker here.' },
  ashen_peak: { name: 'Ashen Peak', x: 160, y: 30, icon: '🌋', kind: 'quest', desc: 'A grey mountain where ash falls like snow.' },
  shadow_fortress: { name: 'Shadow Fortress', x: 222, y: 20, icon: '🏰', kind: 'lair', line: 'shrine', desc: 'A black castle in the clouds. The Hollow Shogun waits.' },
  // Jonin regions
  drowned_pier: { name: 'Drowned Pier', x: 96, y: 182, icon: '⚓', kind: 'quest', desc: 'Rotting jetties where fishing boats come back empty.' },
  ice_cove: { name: 'Icebound Cove', x: 30, y: 130, icon: '🧊', kind: 'quest', desc: 'A frozen inlet where strange black boats are moored.' },
  mist_isle: { name: 'Mist Isle', x: 16, y: 92, icon: '🏝️', kind: 'lair', line: 'mist', desc: 'An island lost in endless fog. The Mist Reaper rules here.' },
  glass_dunes: { name: 'Glass Dunes', x: 254, y: 178, icon: '🏜️', kind: 'quest', desc: 'Dunes of sun-melted glass where caravans vanish.' },
  red_canyon: { name: 'Red Canyon', x: 296, y: 100, icon: '🪨', kind: 'quest', desc: 'Towering red cliffs, littered with broken puppets.' },
  scorpion_tomb: { name: 'Scorpion Tomb', x: 302, y: 164, icon: '🦂', kind: 'lair', line: 'sands', desc: 'A buried pyramid. The Scorpion King stirs beneath the sand.' },
  frost_pass: { name: 'Frost Pass', x: 104, y: 18, icon: '❄️', kind: 'quest', desc: 'A knife-thin path across the frozen peaks.' },
  eclipse_gate: { name: 'Eclipse Gate', x: 272, y: 36, icon: '🌘', kind: 'quest', desc: 'A black stone arch that swallows the light.' },
  moon_temple: { name: 'Moon Temple', x: 302, y: 14, icon: '🌕', kind: 'lair', line: 'eclipse', desc: 'A temple on the highest peak. The Eclipse Sage waits for the dark.' },
};
const ROADS = [['pine', 'bandit_road'], ['bandit_road', 'dune'], ['bandit_road', 'watchtower'], ['watchtower', 'stronghold'], ['pine', 'tide'], ['pine', 'whispering_woods'],
  ['whispering_woods', 'ruined_shrine'], ['whispering_woods', 'ashen_peak'], ['ashen_peak', 'shadow_fortress'], ['bandit_road', 'misty_marsh'], ['misty_marsh', 'serpent_cave'],
  ['tide', 'drowned_pier'], ['drowned_pier', 'misty_marsh'], ['tide', 'ice_cove'], ['ice_cove', 'mist_isle'], ['dune', 'glass_dunes'], ['dune', 'red_canyon'], ['glass_dunes', 'scorpion_tomb'],
  ['ruined_shrine', 'frost_pass'], ['frost_pass', 'ashen_peak'], ['shadow_fortress', 'eclipse_gate'], ['eclipse_gate', 'moon_temple']];

// painted once
let mapCanvas = null;
function paint() {
  if (mapCanvas) return mapCanvas;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  let seed = 7; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
    const n = Math.sin(x / 9 + y / 13) + Math.sin(x / 17 - y / 7);
    const sea = x < 16 + 8 * Math.sin(y / 15) || y > 190 - 5 * Math.sin(x / 21) || (x < 70 && y > 182 - (70 - x) * 0.25);
    const mountain = y < 46 + 7 * Math.sin(x / 19) + 4 * Math.sin(x / 7);
    const desert = x > 228 + 10 * Math.sin(y / 17);
    const marsh = ((x - 150) / 48) ** 2 + ((y - 162) / 20) ** 2 < 1;
    const forest = ((x - 105) / 58) ** 2 + ((y - 78) / 28) ** 2 < 1 || ((x - 70) / 30) ** 2 + ((y - 112) / 18) ** 2 < 1;
    let col;
    if (sea) col = n > 0.8 ? '#5aa8d8' : '#4a98cc';
    else if (mountain) col = y < 22 + 6 * Math.sin(x / 11) ? '#e8e4dc' : n > 0 ? '#8a8276' : '#7a7266';
    else if (desert) col = n > 0.5 ? '#e8b878' : '#dca868';
    else if (marsh) col = n > 1 ? '#5a8a8a' : '#4a7a5a';
    else if (forest) col = n > 0.3 ? '#2f7a3e' : '#3a8a46';
    else col = n > 0.6 ? '#7cc45a' : '#6cb44e';
    c.fillStyle = col; c.fillRect(x, y, 2, 2);
  }
  // beach line and details
  for (let i = 0; i < 500; i++) {
    const x = (r() * W) | 0, y = (r() * H) | 0, px = c.getImageData(x, y, 1, 1).data, hex = (px[0] << 16) | (px[1] << 8) | px[2];
    if (hex === 0x2f7a3e || hex === 0x3a8a46) { c.fillStyle = '#1f5a2e'; c.fillRect(x, y - 2, 3, 3); c.fillStyle = '#4a2e1a'; c.fillRect(x + 1, y + 1, 1, 2); }
    else if (hex === 0x7a7266 || hex === 0x8a8276) { c.fillStyle = '#5a5248'; c.fillRect(x, y, 4, 1); c.fillRect(x + 1, y - 1, 2, 1); }
    else if (hex === 0x4a7a5a) { c.fillStyle = '#6aa8a8'; c.fillRect(x, y, 3, 1); }
    else if (hex === 0xdca868 || hex === 0xe8b878) { c.fillStyle = '#c88a50'; c.fillRect(x, y, 2, 1); }
  }
  // roads
  c.fillStyle = '#c9a46a';
  for (const [a, b] of ROADS) {
    const A = LOCATIONS[a], B = LOCATIONS[b], n = Math.hypot(B.x - A.x, B.y - A.y) / 2;
    for (let i = 0; i < n; i++) { if (i % 3 === 2) continue; const t = i / n; const x = A.x + (B.x - A.x) * t + Math.sin(t * 6) * 3, y = A.y + (B.y - A.y) * t; c.fillRect(Math.round(x), Math.round(y), 2, 2); }
  }
  // frame
  c.strokeStyle = '#4a2e1a'; c.lineWidth = 2; c.strokeRect(1, 1, W - 2, H - 2);
  mapCanvas = cv; return cv;
}

// status of each quest line for this character
function lineState(char, line, steps) {
  const p = (char.quests || {})[line.id] || {}, st = steps.filter((s) => s.line === line.id).sort((a, b) => a.step - b.step);
  const cur = st.find((s) => s.step === (p.step || 1));
  return { done: !!p.done, step: p.step || 1, count: p.count || 0, cur, steps: st, locked: RANKS.indexOf(char.rank) < line.min_rank || char.level < (line.min_level || 0) };
}

export async function openWorldMap(root, char, { onQuest, onLair, onHome, onWar, focus }) {
  const el = h(`<div class="ov wmap"><div class="wm-top"><b>🗺️ The Land of Five Winds</b><button class="btn small ghost" data-log>📜 Quests</button><button class="btn small primary" data-home>🏠 Home</button></div>
    <div class="wm-stage"><canvas width="${W}" height="${H}"></canvas><div class="wm-pins"></div></div><div class="wm-panel"></div></div>`);
  root.appendChild(el);
  el.querySelector('canvas').getContext('2d').drawImage(paint(), 0, 0);
  const panel = el.querySelector('.wm-panel'), pins = el.querySelector('.wm-pins');
  const close = () => el.remove();
  el.querySelector('[data-home]').onclick = () => { close(); onHome && onHome(); };
  let data, vinfo = null;
  try { [data, vinfo] = await Promise.all([net.getQuestData(), net.villageInfo().catch(() => null)]); } catch (e) { panel.innerHTML = `<p>${esc(e.message)}</p>`; return { close }; }
  const terr = Object.fromEntries(((vinfo && vinfo.territories) || []).map((t) => [t.id, t]));
  const states = Object.fromEntries(data.lines.map((l) => [l.id, lineState(char, l, data.steps)]));
  const activeAt = (loc) => data.lines.filter((l) => { const s = states[l.id]; return !s.locked && !s.done && s.cur && s.cur.location === loc; });

  for (const [id, L] of Object.entries(LOCATIONS)) {
    const home = id === char.village, act = activeAt(id).length > 0, lairOpen = L.kind === 'lair' && states[L.line] && states[L.line].done;
    const t = terr[id], hv = t && t.holder ? VILLAGES[t.holder] : null;
    const b = h(`<button class="wm-pin k-${L.kind} ${home ? 'home' : ''} ${act ? 'active' : ''} ${lairOpen ? 'open' : ''} ${t && t.war ? 'war' : ''}" style="left:${(L.x / W) * 100}%;top:${(L.y / H) * 100}%" data-loc="${id}">
      <span class="ic">${L.icon}${t ? `<i class="flag" style="background:${hv ? hv.color : '#cfc3ad'}" title="${hv ? esc(hv.short) : 'Unclaimed'}"></i>` : ''}</span><span class="lb">${t && t.war ? '⚔️ ' : ''}${esc(L.name)}</span></button>`);
    b.onclick = () => showLoc(id);
    pins.appendChild(b);
  }
  el.querySelector('[data-log]').onclick = showLog;

  function stepLine(l) {
    const s = states[l.id];
    if (s.locked) return `<div class="wm-q locked"><b>🔒 ${esc(l.name)}</b><small>${lockMsg(l)}</small></div>`;
    if (s.done) return `<div class="wm-q done"><b>✅ ${esc(l.name)}</b><small>Complete. ${esc(LOCATIONS[l.lair].name)} is open to you.</small></div>`;
    const c = s.cur, at = LOCATIONS[c.location];
    return `<div class="wm-q"><b>${esc(l.name)}</b><small>Step ${s.step}/${s.steps.length}: <b>${esc(c.title)}</b>${c.need > 1 ? ` (${s.count}/${c.need})` : ''} at ${esc(at.name)}</small>
      <button class="btn small ghost" data-go="${c.location}">Go there</button></div>`;
  }
  function lockMsg(l) { return RANKS.indexOf(char.rank) < l.min_rank ? `For ${RANKS[l.min_rank]}s and above.` : `Unlocks at level ${l.min_level} (you are ${char.level}).`; }
  function showLog() {
    panel.innerHTML = `<h3>📜 Quest lines</h3>${data.lines.map(stepLine).join('')}`;
    panel.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => showLoc(b.dataset.go)));
  }
  function showLoc(id) {
    const L = LOCATIONS[id];
    pins.querySelectorAll('.wm-pin').forEach((p) => p.classList.toggle('sel', p.dataset.loc === id));
    let body = '';
    if (L.kind === 'village') {
      body = id === char.village ? `<button class="btn primary" data-home2>🏠 Return to ${esc(L.name)}</button>`
        : `<p class="sub">${esc(VILLAGES[id]?.name || L.name)} is an allied village. Visiting other villages comes later.</p>`;
    } else if (L.kind === 'lair') {
      const line = data.lines.find((l) => l.id === L.line), s = states[L.line];
      const drops = (G.BOSS_DROPS[line.id] || []).filter((id) => G.GEAR[id]).map((id) => ({ ...G.GEAR[id], id }));
      const reward = { riches: '💰 Huge XP and ryo', scroll: '📜 Chance of a rare boss-only jutsu scroll', title: '🏆 Titles and trophies', gear: '💰 Big XP and ryo, plus a title for your first kill' }[line.reward];
      body = `<div class="wm-boss"><b>Boss: ${esc(line.boss_name)}</b><small>Reward: ${reward}</small>${drops.length ? `<small class="wm-drops">Rare drops: ${drops.map((g) => `<span title="${esc(g.note || '')}">${gearIconHTML(g.id, 18, g.icon)} ${esc(g.name)}</span>`).join(' ')}</small>` : ''}</div>` +
        (s.locked ? `<p class="sub">🔒 ${lockMsg(line)}</p>`
          : !s.done ? `<p class="sub">🔒 Finish the quest line <b>${esc(line.name)}</b> to find the way in.</p>`
          : `<button class="btn primary" data-lair="${id}">⚔️ Enter the lair (team up to 3)</button>`);
    } else {
      const here = activeAt(id);
      body = here.length ? here.map((l) => { const s = states[l.id], c = s.cur;
        return `<div class="wm-step"><small>${esc(l.name)} · Step ${s.step}/${s.steps.length}</small><b>${c.kind === 'hunt' ? '🎯' : '⚔️'} ${esc(c.title)}</b><p>${esc(c.story)}</p>
          ${c.need > 1 ? `<div class="mini"><i style="width:${(100 * s.count) / c.need}%"></i></div><small>${s.count} / ${c.need} done</small>` : ''}
          <button class="btn primary" data-q="${l.id}">${c.kind === 'hunt' ? 'Hunt' : 'Fight'}</button></div>`; }).join('')
        : terr[id] ? '' : `<p class="sub">Nothing to do here right now.${['Academy Student', 'Genin'].includes(char.rank) ? ' Quests out here are for Chunin and above.' : ' Check your quest log.'}</p>`;
    }
    const t = terr[id];
    if (t) {
      const hv = t.holder ? VILLAGES[t.holder] : null, w = t.war, mineSide = w && (w.attacker === char.village || w.defender === char.village);
      const hrs = (iso) => { const x = Math.max(0, (new Date(iso) - Date.now()) / 36e5); return x >= 24 ? `${Math.floor(x / 24)}d ${Math.floor(x % 24)}h` : `${Math.floor(x)}h ${Math.floor((x % 1) * 60)}m`; };
      const truce = t.cooldown_until && new Date(t.cooldown_until) > new Date();
      body = `<div class="wm-terr" style="--vc:${hv ? hv.color : '#b5a88f'}"><b>🚩 Territory: ${hv ? `held by ${esc(hv.name)}` : 'unclaimed'}</b>
        <small>Pays its village 50 treasury a day.${truce && !w ? ` Truce for ${hrs(t.cooldown_until)}.` : ''}</small>
        ${w ? `<span class="wm-war">⚔️ <b>${esc(VILLAGES[w.attacker].short)}</b> is attacking: <b>${w.att_score}</b> – <b>${w.def_score}</b> · ${hrs(w.ends_at)} left</span>
          ${mineSide && char.rank !== 'Academy Student' ? `<button class="btn primary" data-war>${w.attacker === char.village ? '⚔️ Join the attack' : '🛡️ Defend it'}</button>` : mineSide ? '<small>Academy students stay safe at home during wars.</small>' : '<small>Your village is not in this war.</small>'}` : ''}</div>` + body;
    }
    panel.innerHTML = `<h3>${L.icon} ${esc(L.name)}</h3><p class="sub">${esc(L.desc)}</p>${body}`;
    const wb = panel.querySelector('[data-war]'); if (wb) wb.onclick = () => { close(); onWar && onWar(terr[id].war, L.name); };
    const hb = panel.querySelector('[data-home2]'); if (hb) hb.onclick = () => { close(); onHome && onHome(); };
    panel.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => { close(); onQuest(b.dataset.q); }));
    panel.querySelectorAll('[data-lair]').forEach((b) => (b.onclick = () => { close(); onLair && onLair(data.lines.find((l) => l.id === L.line)); }));
  }
  const firstActive = data.lines.map((l) => states[l.id]).find((s) => !s.locked && !s.done);
  if (focus && LOCATIONS[focus]) showLoc(focus); else firstActive ? showLoc(firstActive.cur.location) : showLog();
  return { close };
}
