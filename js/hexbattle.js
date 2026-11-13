// Hex tactical battle screen (missions and exams). The battle server decides every roll; this file draws and animates.
import * as net from './net.js?v=9d1c820';
import { paintTerrain, obstacleSprite, LINE_BIOME, VILLAGE_BIOME } from './terrain.js?v=9d1c820';
import { fillTextPx, EMOJI_RE, crispBody, crispTitle } from './pixemoji.js?v=9d1c820';
import { gearIconHTML } from './itemicons.js?v=9d1c820';
import { numbersInHeadingFont } from './numfont.js?v=9d1c820';
import * as G from './engine.js?v=9d1c820';
import { ninjaSprite, beastSprite, lookOf } from './sprites.js?v=9d1c820';
import { enemyLook, beastVariant } from './enemylooks.js?v=9d1c820';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const clone = (x) => JSON.parse(JSON.stringify(x));
const GRADE_COL = { D: '#3a8a4a', C: '#2f7fc4', B: '#9a5ad0', A: '#e8742c', S: '#c43c32', X: '#b8860b', L: '#2a9d8f', Q: '#7a4a2a' };
const RANKS = G.RANKS;
const CTR_ICON = { substitution: '🪵', release: '✨', dispel: '🚫' };
export const STYLE_INFO = {
  ninjutsu: { label: 'Ninjutsu', color: '#e8742c', icon: '🔥' }, genjutsu: { label: 'Genjutsu', color: '#9a5ad0', icon: '🌀' },
  taijutsu: { label: 'Taijutsu', color: '#d84a3a', icon: '👊' }, bukijutsu: { label: 'Bukijutsu', color: '#7a8a9a', icon: '🗡️' },
  bloodline: { label: 'Bloodline', color: '#c43c8a', icon: '🧬' }, none: { label: 'Basic', color: '#8a7a5a', icon: '🧘' },
};
function toast(msg, kind = 'err') { const t = h(`<div class="toast ${kind}">${esc(msg)}</div>`); document.body.appendChild(t); setTimeout(() => t.remove(), 3000); }

// board geometry (canvas pixels)
const W = 320, H = 200, S = 16, HW = Math.sqrt(3) * S, X0 = (W - HW * (G.GW + 0.5)) / 2 + HW / 2, Y0 = 26;
const hx = (c, r) => [X0 + c * HW + (r & 1 ? HW / 2 : 0), Y0 + r * S * 1.5];
function hexPath(ctx, x, y, s = S - 0.5) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); ctx.lineTo(x + s * Math.cos(a), y + s * Math.sin(a)); } ctx.closePath(); }
function hexAt(px, py) { let best = null, bd = 1e9; for (let r = 0; r < G.GH; r++) for (let c = 0; c < G.GW; c++) { const [x, y] = hx(c, r), d = (x - px) ** 2 + (y - py) ** 2; if (d < bd) { bd = d; best = [c, r]; } } return bd < S * S ? best : null; }

export async function runBattle(root, char, missionId, onEnd, start = null) {
  let battle;
  try { battle = await (start ? start() : net.startMission(missionId)); }
  catch (e) { toast(e.message); onEnd(null); return; }
  const S0 = battle.state;
  battleView(root, char, {
    my: 'a', state: S0, exam: S0.exam,
    head: `<span class="grade" style="background:${GRADE_COL[S0.mission.grade]}">${S0.exam ? '★' : S0.mission.grade}</span><b>${esc(S0.mission.name)}</b>${S0.exam ? `<span class="rnd">Round ${S0.exam.round}/${S0.exam.rounds}</span>` : ''}`,
    act: (a) => net.battleAct(battle.id, a),
    intro: S0.lesson || S0.quest ? `<b>${esc(S0.mission.name)}.</b> ${esc(S0.mission.description || '')}` : S0.exam && S0.exam.round === 1 ? `<b>${esc(S0.mission.name)}.</b> Move with blue hexes, use rocks as cover, and strike from range. Good luck!` : null,
    result: (res, finish) => missionResult(root, char, res, S0, battle, onEnd, finish),
    fled: () => onEnd({ status: 'fled' }),
  });
}

// cfg: { my:'a'|'b', state:{engine}, head, act(action)->res, listen(cb)?, deadline()?, result(res, finish), fled(), duel? }
// res: { status:'active'|'won'|'lost'|'fled', state:{engine}, events, result, seq? }
export function battleView(root, char, cfg) {
  let S0 = cfg.state, eng = S0.engine;
  const MY = cfg.my, team = () => eng.units[MY].team;
  // what each ninja wears: my own gear, and other players' weapons when the battle server shares them
  const looks = {}, lookFor = (id, u) => looks[id] || (looks[id] = u.npc ? enemyLook(u.name, u.look) : id === MY ? lookOf(u.look, char.gear) : u.gear && u.gear.weapon ? { ...(u.look || {}), eq: { weapon: u.gear.weapon } } : u.look || {});
  const me = () => eng.units[MY];
  const foes = () => Object.values(eng.units).filter((u) => u.team !== team() && u.hp > 0);
  const foe = () => foes()[0] || Object.values(eng.units).find((u) => u.team !== team());
  const allies = () => Object.values(eng.units).filter((u) => u.team === team() && u.id !== MY);
  const turnName = (id) => (id === MY ? 'Your turn' : `${eng.units[id].name}'s turn`);
  const el = h(`<div class="ov battle hexb">
    <div class="b-top">${cfg.head}<span class="tmr" hidden></span><span class="turn"></span></div>
    <div class="hx-arena"><canvas width="${W}" height="${H}"></canvas><div class="hx-banner" hidden></div></div>
    <div class="hx-cards"><div class="hx-card p"></div><div class="hx-card e"></div></div>${cfg.raid ? '<div class="hx-allies"></div>' : ''}
    <div class="hx-info"></div>
    <details class="hx-logbox"><summary>Battle log <span class="hx-last"></span></summary><ol class="hx-log"></ol></details>
    <div class="b-tabs"></div>
    <div class="hx-moves"></div>
    <div class="hx-bar"><button class="btn small ghost" data-u="guard">🛡️ Guard <small>1 AP</small></button><button class="btn small ghost" data-u="focus">🧘 Focus <small>2 AP</small></button><span class="hx-ctr"></span><span class="hx-items"></span>
      <button class="btn small primary" data-end>End turn ▶</button><button class="btn small ghost" data-flee>🏃</button></div>
  </div>`);
  root.appendChild(el);
  const cv = el.querySelector('canvas'), ctx = cv.getContext('2d'), sizing = { k: 1, disp: 1 }, info = el.querySelector('.hx-info'), banner = el.querySelector('.hx-banner');
  let sel = null, hover = null, busy = false, alive = true, tab = null, t = 0;
  const fx = { floats: [], proj: null, flash: null, anim: {} };
  const mine = () => me().moves.filter((id) => id !== 'focus' && id !== 'guard' && !G.MOVES[id]?.counter);
  const styles = () => [...new Set(mine().map((id) => G.MOVES[id].style))].sort((a, b) => Object.keys(STYLE_INFO).indexOf(a) - Object.keys(STYLE_INFO).indexOf(b));
  tab = styles()[0] || 'taijutsu';

  // ---------- panels ----------
  const elChip = (e) => e ? `<span class="elc" style="--c:${G.ELEMENT_INFO[e].color}">${G.ELEMENT_INFO[e].icon} ${G.ELEMENT_INFO[e].label}</span>` : '';
  const stIcons = (u) => u.effects.map((x) => `<span class="sti ${G.STATUS[x.k].good ? 'good' : 'bad'}" title="${G.STATUS[x.k].label} (${x.turns})">${G.STATUS[x.k].icon}<small>${x.turns}</small></span>`).join('');
  const stChips = (u) => u.effects.filter((x) => x.turns > 0 && G.STATUS[x.k]).map((x) => `<span class="stc ${G.STATUS[x.k].good ? 'good' : 'bad'}" title="${G.STATUS[x.k].label}: ${x.turns} turn${x.turns > 1 ? 's' : ''} left">${G.STATUS[x.k].icon} ${G.STATUS[x.k].label} <b>${x.turns}</b></span>`).join('');
  const pct = (m) => (m > 1 ? `+${Math.round((m - 1) * 100)}%` : `−${Math.round((1 - m) * 100)}%`);
  // element matchup between my main element and the foe's, both ways
  function matchup(p, e) {
    const pe = p.elements[0], ee = e.elements[0]; if (!pe && !ee) return '';
    const EI = G.ELEMENT_INFO, out = G.elementMult(pe, ee), inn = G.elementMult(ee, pe);
    const chip = (m, txt) => `<span class="mu ${m > 1 ? 'good' : m < 1 ? 'bad' : ''}">${txt}</span>`;
    return `<div class="mus">${pe && ee ? chip(out, `Your ${EI[pe].icon} vs ${EI[ee].icon}: ${out === 1 ? 'even' : (out > 1 ? 'strong ' : 'weak ') + pct(out)}`) : ''}${ee && pe ? chip(inn > 1 ? 0.5 : inn < 1 ? 2 : 1, `Their ${EI[ee].icon} vs you: ${inn === 1 ? 'even' : (inn > 1 ? 'strong ' : 'weak ') + pct(inn)}`) : ''}</div>`;
  }
  // expected result of using technique/item m on target t
  function preview(m, t) {
    const p = me(); if (!m || !t || !m.power) return '';
    const d = G.damage(eng, p, t, { ...m, id: m.id || m.key }, false).dmg, lo = Math.max(1, Math.round(d * 0.88)), hi = Math.round(d * 1.12);
    const acc = Math.max(0, Math.min(1, (m.acc ?? 0.95) + (p.bloodline === 'frost' ? 0.04 : 0) + (G.hasStatus(p, 'focus_up') ? 0.1 : 0) - (G.hasStatus(p, 'confuse') ? 0.4 : 0) - G.dodgeOf(t)));
    const crit = Math.min(1, (m.crit || 0) + (p.stats.agility || 0) * 0.002 + (G.hasStatus(p, 'focus_up') ? 0.15 : 0));
    const em = m.element ? G.elementMult(m.element, t.elements[0]) : 1;
    const inR = G.canHitFrom(eng, m, [p.c, p.r], [t.c, t.r]);
    return `<div class="pv ${inR ? '' : 'far'}"><span>vs <b>${esc(t.name)}</b></span><span class="pvd">${lo}–${hi} dmg</span><span>${Math.round(acc * 100)}% hit</span><span>${Math.round(crit * 100)}% crit</span>${em !== 1 ? `<span class="${em > 1 ? 'good' : 'bad'}">${em > 1 ? 'Strong' : 'Weak'} ${pct(em)}</span>` : ''}${lo >= t.hp ? '<span class="ko">Can finish them!</span>' : ''}${inR ? '' : '<span class="bad">not in reach yet</span>'}</div>`;
  }
  const logEl = el.querySelector('.hx-log'), lastEl = el.querySelector('.hx-last');
  function log(html, cls = '') { const li = document.createElement('li'); li.className = cls; li.innerHTML = html; logEl.prepend(li); while (logEl.children.length > 40) logEl.lastChild.remove(); lastEl.innerHTML = '· ' + html; }
  setTimeout(() => log('The fight begins!', 'turn'), 0);
  const whoN = (id) => (id === MY ? 'You' : `<b>${esc(eng.units[id].name)}</b>`);
  const sideOf = (id) => (eng.units[id] && eng.units[id].team === team() ? 'me' : 'foe');
  function cards() {
    const p = me(), e = foe(), max = G.apMax(p) + 2, myTurn = eng.side === MY;
    el.querySelector('.hx-card.p').innerHTML = `<div class="nm"><b>${esc(p.name)}</b><small>Lv ${p.level}</small>${p.elements.map(elChip).join('')}${p.bloodline ? `<span class="elc" style="--c:#c43c8a">${G.BLOODLINES[p.bloodline].icon}</span>` : ''}</div>
      <div class="gbar hp ${p.hp / p.hpmax < 0.3 ? 'low' : ''}"><i style="width:${100 * p.hp / p.hpmax}%"></i><span>❤️ ${p.hp}/${p.hpmax}</span></div>
      <div class="gbar sta"><i style="width:${100 * p.st / p.stmax}%"></i><span>💪 ${p.st}/${p.stmax}</span></div>
      <div class="gbar ch"><i style="width:${100 * p.ch / p.chmax}%"></i><span>💧 ${p.ch}/${p.chmax}</span></div>
      <div class="aprow">${myTurn ? Array.from({ length: Math.max(max, p.ap) }, (_, i) => `<i class="${i < p.ap ? 'on' : ''}"></i>`).join('') + `<b>${p.ap} AP</b>` : `<b class="wait">${p.hp <= 0 ? 'Down' : cfg.duel || cfg.raid ? esc(eng.units[eng.side].name) + "'s turn…" : 'Enemy turn…'}</b>`}</div>
      <div class="sts">${stChips(p)}</div>`;
    el.querySelector('.hx-card.e').innerHTML = `<div class="nm"><b>${esc(e.name)}</b><small>Lv ${e.level}</small>${e.elements.map(elChip).join('')}${e.bloodline ? `<span class="elc" style="--c:#c43c8a">${G.BLOODLINES[e.bloodline].icon}</span>` : ''}</div>
      <div class="gbar hp ${e.hp / e.hpmax < 0.3 ? 'low' : ''}"><i style="width:${100 * e.hp / e.hpmax}%"></i><span>${e.hp}/${e.hpmax}</span></div>
      ${cfg.duel ? `<div class="gbar ch"><i style="width:${100 * e.ch / e.chmax}%"></i><span>💧 ${e.ch}/${e.chmax}</span></div>` : ''}
      ${e.boss && e.enraged ? '<small class="enr">😡 Enraged: hits harder</small>' : ''}
      ${matchup(p, e)}<div class="sts">${stChips(e) || '<small class="none">No effects</small>'}</div>`;
    el.querySelector('.turn').textContent = `Turn ${eng.turn}`;
    const al = el.querySelector('.hx-allies');
    if (al) al.innerHTML = allies().map((u) => `<div class="ally ${u.hp <= 0 ? 'down' : ''} ${eng.side === u.id ? 'now' : ''}"><b>${esc(u.name)}</b><small class="alv">Lv ${u.level}</small>${u.elements.map(elChip).join('')}
      <div class="gbar hp ${u.hp / u.hpmax < 0.3 ? 'low' : ''}"><i style="width:${100 * u.hp / u.hpmax}%"></i><span>${u.hp <= 0 ? 'Down' : `❤️ ${u.hp}/${u.hpmax}`}</span></div>${eng.side === u.id ? '<small>Acting…</small>' : ''}</div>`).join('');
  }
  // the selected action: a technique, or a thrown item written as 'it:<id>'
  const defOf = (id) => { if (!id) return null; if (id.startsWith('it:')) { const it = G.ITEMS[id.slice(3)]; return it && { ...it, style: 'bukijutsu', target: it.aoe ? 'hex' : 'enemy', aoe: it.aoe || 0 }; } return G.MOVES[id]; };
  function moveBtn(id) {
    const m = G.MOVES[id], p = me(), learned = p.moves.includes(id), jl = p.jl[id] || 1;
    const cdl = G.cdLeft(p, id), afford = learned && !cdl && p.ap >= m.ap && p.st >= m.stamina && p.ch >= m.chakra;
    const rng = m.target === 'self' ? 'Self' : m.range[1] === 0 ? `Around you` : m.range[0] === m.range[1] ? `Range ${m.range[1]}` : `Range ${m.range[0]}-${m.range[1]}`;
    const c = STYLE_INFO[m.style].color;
    return `<button class="mv hx ${learned ? '' : 'locked'} ${sel === id ? 'sel' : ''}" data-m="${id}" style="--c:${m.element ? G.ELEMENT_INFO[m.element].color : c}" ${learned && afford && !busy && eng.side === MY ? '' : 'disabled'}>
      <b>${learned ? '' : '🔒 '}${esc(m.name)}${learned ? ` <span class="jl">Lv ${jl}</span>` : ''}${cdl ? ` <span class="cdb">⏳ ${cdl}</span>` : ''}</b>
      <small>${learned ? `<em class="ap">${m.ap} AP</em> ${rng}${m.aoe ? ' · Area' : ''} · ${[m.stamina ? '💪' + m.stamina : '', m.chakra ? '💧' + m.chakra : ''].join(' ').trim() || 'Free'}${G.cooldownOf(id) ? ` · ⏳${G.cooldownOf(id)}` : ''}` : `${RANKS[m.tier]} rank`}</small></button>`;
  }
  function panel() {
    const st = styles();
    el.querySelector('.b-tabs').innerHTML = st.map((k) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}" style="--c:${STYLE_INFO[k].color}">${STYLE_INFO[k].icon} <span>${STYLE_INFO[k].label}</span></button>`).join('');
    const p = me();
    const locked = [];
    el.querySelector('.hx-moves').innerHTML = mine().filter((id) => G.MOVES[id].style === tab).concat(locked).map(moveBtn).join('');
    el.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; panel(); }));
    el.querySelectorAll('.hx-moves [data-m]').forEach((b) => (b.onclick = () => pick(b.dataset.m)));
    const myTurn = eng.side === MY && !busy;
    const ctr = el.querySelector('.hx-ctr');
    if (ctr) {
      ctr.innerHTML = G.COUNTERS.filter((id) => p.moves.includes(id)).map((id) => { const m = G.MOVES[id], cdl = G.cdLeft(p, id);
        return `<button class="btn small ghost ctr" data-u="${id}" title="${esc(m.name)}: ${esc(m.desc)}">${CTR_ICON[id]} ${esc(m.name)} <small>${cdl ? `⏳ ${cdl}` : `${m.ap} AP · 💧${m.chakra}`}</small></button>`; }).join('');
      ctr.querySelectorAll('[data-u]').forEach((b) => (b.onclick = () => pick(b.dataset.u)));
    }
    el.querySelectorAll('.hx-bar [data-u]').forEach((b) => { const id = b.dataset.u, m = G.MOVES[id]; b.disabled = !myTurn || p.ap < m.ap || G.cdLeft(p, id) > 0 || p.ch < (m.chakra || 0); b.classList.toggle('sel', sel === id); });
    el.querySelector('[data-end]').disabled = !myTurn; el.querySelector('[data-flee]').disabled = busy && !cfg.duel;
    const its = el.querySelector('.hx-items');
    if (its) {
      its.innerHTML = Object.entries(p.items || {}).filter(([, n]) => n > 0).map(([id, n]) => { const it = G.ITEMS[id]; return it ? `<button class="btn small ghost hx-it" data-i="${id}" title="${esc(it.name)}: ${esc(it.desc)}" ${!myTurn || p.ap < it.ap ? 'disabled' : ''}>${gearIconHTML(id, 22, it.icon)}<b>×${n}</b> <small>${it.ap} AP</small></button>` : ''; }).join('');
      its.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => {
        if (busy || eng.side !== MY) return; const it = G.ITEMS[b.dataset.i];
        if (it.power) { sel = sel === 'it:' + b.dataset.i ? null : 'it:' + b.dataset.i; panel(); return say(sel ? `<b>${gearIconHTML(b.dataset.i, 18, it.icon)} ${esc(it.name)}</b><br><small>${esc(it.desc)}</small>${preview(defOf('it:' + b.dataset.i), aimAt())}<b>Tap ${it.aoe ? 'a hex in the orange area' : 'the enemy'}</b> to throw.` : ''); }
        sel = null; send({ t: 'item', item: b.dataset.i });
      }));
      its.querySelectorAll('[data-i]').forEach((b) => b.classList.toggle('sel', sel === 'it:' + b.dataset.i));
    }
    cards();
  }
  function say(html) { info.innerHTML = html; }
  function idleInfo() {
    if (me().hp <= 0) return say('You are down. Cheer on your team!');
    if (eng.side !== MY) return say(cfg.duel || cfg.raid ? `<b>${esc(eng.units[eng.side].name)}</b> is acting… Watch their moves.` : 'Enemy turn…');
    const p = me();
    if (G.hasStatus(p, 'root')) return say(`🌿 You are <b>rooted</b> and cannot move this turn. Use a technique or end your turn.`);
    say(`<b>Tap a blue hex</b> to move (1 AP each), or <b>pick a technique</b> below. You have <b>${p.ap} AP</b>.`);
  }
  let pvTarget = null;
  const aimAt = () => pvTarget && pvTarget.hp > 0 ? pvTarget : foes().sort((a, b) => G.dist([me().c, me().r], [a.c, a.r]) - G.dist([me().c, me().r], [b.c, b.r]))[0] || foe();
  function moveInfo(id) {
    const m = G.MOVES[id], p = me(), e = aimAt();
    const mult = m.element ? G.elementMult(m.element, e.elements[0]) : 1;
    const mtxt = mult > 1 ? `<span class="good">Strong vs ${G.ELEMENT_INFO[e.elements[0]].label} ×${mult}</span>` : mult < 1 ? `<span class="bad">Weak vs ${G.ELEMENT_INFO[e.elements[0]].label} ×${mult}</span>` : '';
    const effs = m.effects.map((x) => `${G.STATUS[x.k].icon} ${G.STATUS[x.k].label}${x.chance < 1 ? ` ${Math.round(x.chance * 100)}%` : ''}`).join(', ');
    let how = '';
    if (m.target === 'self' || m.range[1] === 0) how = `<b>Tap it again</b> (or tap yourself) to use.`;
    else {
      const ok = m.target === 'enemy' ? G.canHitFrom(eng, m, [p.c, p.r], [e.c, e.r]) : true;
      how = m.target === 'enemy' ? (ok ? `<b>Tap the enemy</b> to strike.` : G.inRange(m, [p.c, p.r], [e.c, e.r]) ? `<span class="bad">A rock blocks your line.</span> Move to get a clear shot.` : `<span class="bad">Out of range.</span> Move into the orange area first.`) : `<b>Tap a hex</b> in the orange area to aim.`;
    }
    say(`<b>${esc(m.name)}</b> ${m.power ? `· Power ${m.power}` : ''} ${mtxt}<br><small>${esc(m.desc)}${effs ? ' · ' + effs : ''}</small>${m.target !== 'self' ? preview({ ...m, id }, e) : ''}${how}`);
  }
  function pick(id) {
    if (busy || eng.side !== MY) return;
    const m = G.MOVES[id];
    if (sel === id && (m.target === 'self' || m.range[1] === 0)) return send({ t: 'use', move: id, at: null });
    sel = sel === id ? null : id; panel(); sel ? moveInfo(id) : idleInfo();
  }
  el.querySelectorAll('.hx-bar [data-u]').forEach((b) => (b.onclick = () => pick(b.dataset.u)));
  el.querySelector('[data-end]').onclick = () => { sel = null; send({ t: 'end' }); };
  el.querySelector('[data-flee]').onclick = () => { if (confirmFlee()) send({ t: 'flee' }); };
  let fleeArmed = 0;
  function confirmFlee() { if (Date.now() - fleeArmed < 3000) return true; fleeArmed = Date.now(); say(`<b>${cfg.duel ? 'Forfeit?' : 'Retreat?'}</b> Tap 🏃 again to give up this fight.${cfg.exam ? ' You will fail the exam.' : cfg.duel ? ' Your opponent wins.' : ''}`); return false; }

  // ---------- board input ----------
  const toCanvas = (ev) => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) * W / r.width, (ev.clientY - r.top) * H / r.height]; };
  cv.addEventListener('pointermove', (ev) => {
    hover = hexAt(...toCanvas(ev));
    if (!sel || !hover || busy || eng.side !== MY) return;
    const f = foes().find((u) => u.c === hover[0] && u.r === hover[1]);
    if (f && f !== pvTarget) { pvTarget = f; if (sel.startsWith('it:')) { const it = G.ITEMS[sel.slice(3)]; say(`<b>${gearIconHTML(sel.slice(3), 18, it.icon)} ${esc(it.name)}</b><br><small>${esc(it.desc)}</small>${preview(defOf(sel), f)}<b>Tap ${it.aoe ? 'a hex in the orange area' : 'the enemy'}</b> to throw.`); } else if (G.MOVES[sel]) moveInfo(sel); }
  });
  cv.addEventListener('pointerleave', () => { hover = null; });
  cv.addEventListener('click', (ev) => {
    const hex = hexAt(...toCanvas(ev)); if (!hex || busy || eng.side !== MY) return;
    const p = me(), fAt = foes().find((f) => hex[0] === f.c && hex[1] === f.r), onFoe = !!fAt, onMe = hex[0] === p.c && hex[1] === p.r;
    if (sel && sel.startsWith('it:')) {
      const m = defOf(sel), item = sel.slice(3);
      if ((m.target === 'enemy' && onFoe) || m.target === 'hex') { if (G.canHitFrom(eng, m, [p.c, p.r], hex)) { sel = null; return send({ t: 'item', item, at: hex }); } return say('<span class="bad">Out of range or blocked.</span> Move closer first.'); }
    }
    if (sel && !sel.startsWith('it:')) {
      const m = G.MOVES[sel];
      if (m.target === 'self' || m.range[1] === 0) { if (onMe || (m.range[1] === 0 && G.dist(hex, [p.c, p.r]) <= m.aoe)) return send({ t: 'use', move: sel, at: null }); }
      else if (m.target === 'enemy' && onFoe) { if (G.canHitFrom(eng, m, [p.c, p.r], hex)) return send({ t: 'use', move: sel, at: hex }); return moveInfo(sel); }
      else if (m.target === 'hex' && G.canHitFrom(eng, m, [p.c, p.r], hex)) return send({ t: 'use', move: sel, at: hex });
    }
    if (onFoe) { const e2 = fAt; say(`<b>${esc(e2.name)}</b> ${e2.elements[0] ? `· ${G.ELEMENT_INFO[e2.elements[0]].label} user: weak to ${G.ELEMENT_INFO[G.ELEMENTS[(G.ELEMENTS.indexOf(e2.elements[0]) + 4) % 5]].label}` : '· no element'}<br><small>${e2.boss ? 'A boss: area attacks hit everyone standing close together. Spread out, and shrug off: half your stuns and roots will fail.' : cfg.duel ? `Lv ${e2.level} · ${e2.moves.length - 2} techniques. Read their element and stay out of their best range.` : e2.ai === 'ranged' ? 'Fights from range: close the gap or break line of sight.' : 'Fights up close: keep your distance and strike from range.'}</small>`); return; }
    const reach = G.reachable(eng, p, p.ap), k = G.key(hex[0], hex[1]);
    if (reach.has(k) && reach.get(k).cost > 0) return send({ t: 'move', to: hex });
  });

  // ---------- server round trip ----------
  let chain = Promise.resolve(), lastSeq = cfg.seq || 0, over = false;
  async function send(action) {
    if (busy && !(cfg.duel && action.t === 'flee')) return; busy = true; panel();
    let res;
    try { res = await cfg.act(action); }
    catch (e) { busy = false; panel(); say(`<span class="bad">${esc(e.message)}</span>`); return; }
    sel = null;
    await apply(res);
  }
  // play a result (ours or, in duels, the opponent's) exactly once and in order
  function apply(res) {
    chain = chain.then(async () => {
      if (!alive || over) return;
      if (res.seq != null) { if (res.seq <= lastSeq) { busy = false; panel(); if (res.seq === lastSeq && (res.status === 'won' || res.status === 'lost')) { over = true; await wait(500); showResult(res); } return; } if (res.seq > lastSeq + 1) res.events = []; lastSeq = res.seq; }
      if (res.status === 'fled') { finish(); cfg.fled(); return; }
      busy = true; panel();
      await play(res.events || []);
      S0 = res.state; eng = S0.engine;
      busy = false; panel();
      if (res.status === 'won' || res.status === 'lost') { over = true; await wait(500); showResult(res); return; }
      idleInfo();
      if (eng.side === MY && me().ap <= 0 && !G.hasStatus(me(), 'stun')) { say('Out of AP. Ending your turn…'); await wait(500); send({ t: 'end' }); }
    });
    return chain;
  }
  if (cfg.listen) cfg.listen(apply);

  // ---------- event animation ----------
  const unit = (who) => eng.units[who];
  // floating numbers and words over a unit: several at once stack upwards instead of piling on top of each other
  const float = (who, text, color, dy = 0, big = false) => {
    const u = unit(who); const [x, y] = hx(u.c, u.r), life = big ? 60 : 50;
    const slot = fx.floats.filter((f) => f.who === who && f.life > f.max - 30).length;
    fx.floats.push({ who, x, y: y - 26, text, color, life, max: life, big, slot });
  };
  function showBanner(text, cls) { banner.textContent = text; banner.className = 'hx-banner ' + cls; banner.hidden = false; setTimeout(() => (banner.hidden = true), 900); }
  // animations run on screen refreshes, which stop in a hidden tab: never let them hold up the fight
  const pause = (ms) => wait(document.hidden ? 0 : ms);
  async function play(events) {
    eng = clone(eng);
    for (const ev of events) {
      if (!alive) return;
      const name = ev.who ? unit(ev.who).name : '';
      if (ev.t === 'move') {
        say(ev.who === MY ? 'You move.' : `${esc(name)} moves.`); log(`${whoN(ev.who)} moved ${ev.path.length} hex${ev.path.length > 1 ? 'es' : ''}.`, sideOf(ev.who));
        for (const [c, r] of ev.path) { unit(ev.who).c = c; unit(ev.who).r = r; fx.anim[ev.who] = t; await pause(110); }
      } else if (ev.t === 'use') {
        const u = unit(ev.who), m = u.npc ? G.ENEMY_MOVES[ev.move] : defOf(ev.move), tgt = ev.at ? { c: ev.at[0], r: ev.at[1] } : u;
        if (ev.item && u.items && u.items[ev.item] > 0) u.items[ev.item]--;
        say(`${ev.who === MY ? 'You use' : esc(name) + ' uses'} <b>${esc(ev.name)}</b>!`);
        const lg = [];
        const col = ev.element ? G.ELEMENT_INFO[ev.element].color : STYLE_INFO[ev.style || 'taijutsu']?.color || '#c9ccd4';
        if (m.target === 'self') { fx.flash = { at: [u.c, u.r], r: 0, col, life: 18 }; await pause(380); }
        else {
          const to = ev.at || [u.c, u.r];
          if (m.range[1] <= 1 && !m.aoe) { fx.anim[ev.who] = t; fx.lunge = { who: ev.who, to: [tgt.c, tgt.r], start: t }; await pause(260); fx.lunge = null; }
          else if (m.range[1] > 0) await shoot([u.c, u.r], to, col, ev.style === 'bukijutsu' ? 'blade' : ev.style === 'genjutsu' ? 'swirl' : 'orb', !!ev.aoe);
          if (ev.aoe) { fx.flash = { at: to, r: ev.aoe, col, life: 22 }; await pause(200); }
        }
        if (ev.focus) { float(ev.who, `+${ev.focus} 💪💧`, '#7cc4ec'); lg.push(`+${ev.focus} stamina and chakra`); }
        if (ev.heal) { u.hp = Math.min(u.hpmax, u.hp + ev.heal); float(ev.who, `+${ev.heal}`, '#7ce08a', 0, true); lg.push(`healed ${ev.heal}`); }
        if (ev.self) lg.push(ev.self.map((k) => `${G.STATUS[k].icon} ${G.STATUS[k].label}`).join(', '));
        if (ev.cured) { float(ev.who, ev.cured.length ? '✨ Cleansed' : '✨ Nothing to clear', '#9fe0a0', 14); u.effects = (u.effects || []).filter((x) => !ev.cured.includes(x.k)); }
        if (ev.self) ev.self.forEach((k, i) => setTimeout(() => float(ev.who, G.STATUS[k].icon + ' ' + G.STATUS[k].label, '#ffe07a', 12 + i * 10), i * 150));
        for (const hit of ev.hits || []) {
          if (hit.sub) { lg.push(`${whoN(hit.who)} escaped with 🪵 Substitution`); const v = unit(hit.who); float(hit.who, '🪵 Substitution!', '#ffe07a'); if (hit.to) { v.c = hit.to[0]; v.r = hit.to[1]; } say(`<b>${esc(v.name)}</b> swapped with a log and vanished!`); continue; }
          if (hit.dispelled) { float(hit.who, hit.dispelled.length ? '🚫 Dispelled!' : '🚫 Nothing to dispel', '#e0a0ff'); const v = unit(hit.who); v.effects = (v.effects || []).filter((x) => !hit.dispelled.includes(x.k)); continue; }
          if (!hit.hit) { float(hit.who, hit.dodge ? 'DODGE' : 'MISS', hit.dodge ? '#9fe0a0' : '#c9ccd4'); lg.push(hit.dodge ? `${whoN(hit.who)} dodged` : `missed ${hit.who === MY ? 'you' : whoN(hit.who)}`); continue; }
          const v = unit(hit.who); v.hp = Math.max(0, v.hp - hit.dmg); fx.hurt = { who: hit.who, start: t };
          float(hit.who, hit.crit ? `CRIT -${hit.dmg}` : `-${hit.dmg}`, hit.crit ? '#ffe07a' : hit.who === MY ? '#ff8f7a' : '#fff4dc', 0, true);
          if (hit.mult > 1) float(hit.who, 'Super effective!', '#ffb04a', 14); else if (hit.mult < 1) float(hit.who, 'Resisted', '#9ab0c0', 14);
          lg.push(`${hit.who === MY ? 'hit you' : 'hit ' + whoN(hit.who)} for <b class="dmg">${hit.dmg}</b>${hit.crit ? ' <b class="crit">CRIT</b>' : ''}${hit.mult > 1 ? ' · super effective' : hit.mult < 1 ? ' · resisted' : ''}${(hit.effects || []).length ? ' · ' + hit.effects.map((k) => `${G.STATUS[k].icon} ${G.STATUS[k].label}`).join(', ') : ''}${hit.drain ? ` · drained ${hit.drain}` : ''}`);
          if (hit.drain) { u.hp = Math.min(u.hpmax, u.hp + hit.drain); float(ev.who, `🩸 +${hit.drain}`, '#7ce08a', 20); }
          if (hit.enrage) { float(hit.who, '😡 ENRAGED!', '#ff5a3a', 40); say(`<b>${esc(unit(hit.who).name)}</b> is enraged and hits harder!`); }
          (hit.effects || []).forEach((k, i) => setTimeout(() => float(hit.who, G.STATUS[k].icon + ' ' + G.STATUS[k].label, '#e0a0ff', 26 + i * 10), 200 + i * 160));
        }
        log(`${whoN(ev.who)} used <b>${esc(ev.name)}</b>${lg.length ? ': ' + lg.join('; ') : '.'}`, sideOf(ev.who));
        cards(); await pause(ev.hits?.length ? 620 : 300);
      } else if (ev.t === 'item') {
        const u = unit(ev.who), it = G.ITEMS[ev.item] || { icon: '🎒' };
        say(`${ev.who === MY ? 'You use' : esc(name) + ' uses'} <b>${gearIconHTML(ev.item, 18, it.icon)} ${esc(ev.name)}</b>!`);
        if (u.items && u.items[ev.item] > 0) u.items[ev.item]--;
        fx.flash = { at: [u.c, u.r], r: ev.item === 'smoke' ? 1 : 0, col: ev.item === 'smoke' ? '#c9ccd4' : '#7ce08a', life: 18 };
        if (ev.heal) { u.hp = Math.min(u.hpmax, u.hp + ev.heal); float(ev.who, `+${ev.heal}`, '#7ce08a', 0, true); }
        if (ev.focus) float(ev.who, `+${ev.focus} 💪💧`, '#7cc4ec');
        if (ev.cured && ev.cured.length) float(ev.who, '✨ Cured', '#9fe0a0', 14);
        log(`${whoN(ev.who)} used ${gearIconHTML(ev.item, 16, it.icon)} <b>${esc(ev.name)}</b>${ev.heal ? `: healed ${ev.heal}` : ev.focus ? `: +${ev.focus} stamina and chakra` : ev.cured && ev.cured.length ? ': cured' : ''}.`, sideOf(ev.who));
        for (const hit of ev.hits || []) (hit.effects || []).forEach((k) => float(hit.who, G.STATUS[k].icon + ' ' + G.STATUS[k].label, '#e0a0ff', 20));
        cards(); panel(); await pause(450);
      } else if (ev.t === 'dot') {
        const u = unit(ev.who); u.hp = Math.max(0, u.hp - ev.dmg); float(ev.who, `${G.STATUS[ev.k].icon} ${ev.dmg}`, '#ff9a63'); log(`${G.STATUS[ev.k].icon} ${G.STATUS[ev.k].label} dealt <b class="dmg">${ev.dmg}</b> to ${ev.who === MY ? 'you' : whoN(ev.who)}.`, sideOf(ev.who) === 'me' ? 'foe' : 'me'); cards(); await pause(420);
      } else if (ev.t === 'heal') { const u = unit(ev.who); u.hp = Math.min(u.hpmax, u.hp + ev.amount); float(ev.who, `💚 +${ev.amount}`, '#7ce08a'); log(`${whoN(ev.who)} regenerated ${ev.amount}.`, sideOf(ev.who)); cards(); await pause(380);
      } else if (ev.t === 'stunned') { float(ev.who, '💫 Stunned!', '#ffe07a'); log(`💫 ${whoN(ev.who)} ${ev.who === MY ? 'are' : 'is'} stunned and lose${ev.who === MY ? '' : 's'} the turn.`, sideOf(ev.who) === 'me' ? 'foe' : 'me'); await pause(450);
      } else if (ev.t === 'turn') { eng.side = ev.who; log(`${ev.who === MY ? 'Your turn' : esc(eng.units[ev.who].name) + "'s turn"}`, 'turn'); showBanner(ev.who === MY ? 'Your turn' : cfg.duel || cfg.raid ? turnName(ev.who) : 'Enemy turn', ev.who === MY ? 'a' : 'b'); cards(); await pause(ev.who !== MY ? 500 : 250);
      } else if (ev.t === 'down') { unit(ev.who).hp = 0; float(ev.who, '💀 Down!', '#ff8f7a'); say(ev.who === MY ? '<span class="bad">You are down!</span>' : `${esc(unit(ev.who).name)} is down!`); cards(); await pause(500);
      } else if (ev.t === 'timeout') { float(ev.who, '⏱ Too slow!', '#ff8f7a'); say(ev.who === MY ? `<span class="bad">Time ran out: your turn was skipped (${ev.n}/3).</span>` : `${esc(name)} ran out of time (${ev.n}/3).`); await pause(600);
      } else if (ev.t === 'end') { if (!eng.raid) fx.dead = ev.winner === 'a' ? 'b' : 'a'; await pause(600); }
    }
  }
  function shoot(from, to, col, kind, big) {
    return new Promise((res) => {
      let fin = false; const done = () => { if (!fin) { fin = true; if (fx.proj && fx.proj.done === done) fx.proj = null; res(); } };
      const [x0, y0] = hx(...from), [x1, y1] = hx(...to); fx.proj = { x0, y0: y0 - 10, x1, y1: y1 - 10, k: 0, col, kind, big, done };
      setTimeout(done, document.hidden ? 0 : 700);
    });
  }

  // ---------- drawing ----------
  const theme = { pine: ['#5aa64c', '#4f9a44', '#3f8a46'], dune: ['#e8c88a', '#dcb978', '#c99a5e'], tide: ['#7cc87a', '#6cbc6c', '#5aa858'] }[char.village] || ['#5aa64c', '#4f9a44', '#3f8a46'];
  // battlefield: biome by place (dojo for Academy, arena for duels, quest line, or the home village)
  const biome = cfg.biome || (S0.lesson || S0.exam ? 'dojo' : S0.quest && LINE_BIOME[S0.quest.line] ? LINE_BIOME[S0.quest.line] : VILLAGE_BIOME[char.village] || 'grass');
  const centres = []; for (let r = 0; r < G.GH; r++) for (let c = 0; c < G.GW; c++) { const [x, y] = hx(c, r); centres.push({ c, r, x, y }); }
  const seed = [...String(S0.mission?.id || S0.id || 'x')].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7);
  const ground = paintTerrain(biome, centres, S, HW, W, H, seed);
  function rock(x, y, c, r) { const img = obstacleSprite(biome, (c * 7 + r * 3) % 2); ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y + 7 - img.height)); }
  // The arena is drawn on a 320x200 art grid, but the canvas itself matches the real screen pixels:
  // sprites stay pixel-art (nearest-neighbour), while numbers and names are drawn sharp at full resolution.
  function fitCanvas() {
    const r = cv.getBoundingClientRect(); if (!r.width) return;
    const dpr = window.devicePixelRatio || 1, w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    sizing.k = w / W; sizing.disp = r.width / W;
  }
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(fitCanvas) : null; ro?.observe(cv);
  // text size in arena units that lands at a readable size on screen (px = wanted CSS pixels)
  const tsz = (px, lo, hi) => Math.max(lo, Math.min(hi, px / sizing.disp));
  function outlined(text, x, y, fill, size, family = "'Press Start 2P', monospace") {
    // snap to a size where every font pixel lands on whole screen pixels, and to whole-pixel positions
    const dev = size * sizing.k, snapped = family.includes('Press') ? crispTitle(dev) : crispBody(dev);
    size = snapped / sizing.k; x = Math.round(x * sizing.k) / sizing.k; y = Math.round(y * sizing.k) / sizing.k;
    ctx.font = `${size}px ${family}`; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(1.5, size / 4); ctx.strokeStyle = '#1a0f08';
    ctx.strokeText(text.replace(EMOJI_RE, '   '), x, y); ctx.fillStyle = fill; fillTextPx(ctx, text, x, y);
  }
  function draw() {
    if (!alive) return; t++;
    if (!cv.width || cv.width === W) fitCanvas();
    ctx.setTransform(sizing.k, 0, 0, sizing.k, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(ground, 0, 0);
    const p = me(), e = foe(), myTurn = eng.side === MY && !busy && p.hp > 0;
    const reach = myTurn && !sel ? G.reachable(eng, p, p.ap) : null;
    const m = defOf(sel);
    let aoe = null;
    if (m && myTurn) {
      if (m.range[1] === 0) aoe = { at: [p.c, p.r], r: m.aoe };
      else if (m.target === 'hex' && hover && G.canHitFrom(eng, m, [p.c, p.r], hover)) aoe = { at: hover, r: m.aoe };
    }
    let path = null;
    if (reach && hover && reach.has(G.key(...hover))) path = G.pathTo(reach, ...hover);
    for (let r = 0; r < G.GH; r++) for (let c = 0; c < G.GW; c++) {
      const [x, y] = hx(c, r), k = G.key(c, r);
      hexPath(ctx, x, y, S - 1.5);
      if (reach && reach.has(k) && reach.get(k).cost > 0) { ctx.fillStyle = 'rgba(70,170,255,.42)'; ctx.fill(); ctx.strokeStyle = 'rgba(200,236,255,.85)'; ctx.lineWidth = 1; ctx.stroke(); }
      if (m && myTurn && m.target !== 'self' && m.range[1] > 0 && G.canHitFrom(eng, m, [p.c, p.r], [c, r])) { ctx.fillStyle = 'rgba(255,140,30,.5)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,220,150,.8)'; ctx.lineWidth = 1; ctx.stroke(); }
      if (aoe && G.dist(aoe.at, [c, r]) <= aoe.r) { ctx.fillStyle = 'rgba(230,50,40,.35)'; ctx.fill(); }
      if (fx.flash && G.dist(fx.flash.at, [c, r]) <= fx.flash.r) { ctx.globalAlpha = fx.flash.life / 22; ctx.fillStyle = fx.flash.col; ctx.fill(); ctx.globalAlpha = 1; }
      if (hover && hover[0] === c && hover[1] === r && myTurn) { ctx.strokeStyle = '#fff4dc'; ctx.lineWidth = 2; hexPath(ctx, x, y, S - 2); ctx.stroke(); }
    }
    if (fx.flash && --fx.flash.life <= 0) fx.flash = null;
    if (path) { ctx.fillStyle = '#fff4dc'; for (const [c, r] of path) { const [x, y] = hx(c, r); ctx.fillRect(x - 2, y - 2, 4, 4); } }
    // things sorted by row so lower rows draw on top
    const things = eng.rocks.map((k) => { const [c, r] = k.split(',').map(Number); return { r, c, rock: true }; });
    for (const id of Object.keys(eng.units)) { const u = unit(id); if (u.hp > 0 || fx.dead === id) things.push({ r: u.r, c: u.c, u, id }); }
    things.sort((a, b) => a.r - b.r);
    for (const th of things) {
      let [x, y] = hx(th.c, th.r);
      if (th.rock) { rock(x, y, th.c, th.r); continue; }
      const u = th.u, foeU = Object.values(eng.units).filter((x) => x.team !== u.team && x.hp > 0).sort((p, q) => G.dist([u.c, u.r], [p.c, p.r]) - G.dist([u.c, u.r], [q.c, q.r]))[0] || u;
      if (fx.dead === th.id && t % 8 < 4) continue;
      if (fx.lunge && fx.lunge.who === th.id) { const [tx, ty] = hx(...fx.lunge.to), k = Math.sin(Math.min(1, (t - fx.lunge.start) / 14) * Math.PI) * 0.45; x += (tx - x) * k; y += (ty - y) * k; }
      const hurt = fx.hurt && fx.hurt.who === th.id && t - fx.hurt.start < 16;
      const dir = foeU.c < u.c || (foeU.c === u.c && th.id === 'b') ? 1 : 2;
      const moving = fx.anim[th.id] && t - fx.anim[th.id] < 8;
      ctx.fillStyle = 'rgba(20,20,10,.3)'; ctx.fillRect(x - 7, y + 5, 14, 3);
      if (th.id === eng.side && !busy) { ctx.strokeStyle = u.team === team() ? '#ffe07a' : '#ff8f7a'; ctx.lineWidth = 1; hexPath(ctx, x, y, S - 3); ctx.stroke(); }
      let spr;
      if (u.kind === 'ninja') spr = ninjaSprite(lookFor(th.id, u), dir, moving ? 1 + ((t >> 3) & 1) : fx.lunge && fx.lunge.who === th.id ? 3 : 0);
      else spr = beastSprite(u.kind, u.look?.tint, (t >> 4) % 2, beastVariant(u.name));
      ctx.save(); if (hurt && t % 4 < 2) ctx.globalAlpha = 0.35;
      const giant = u.boss && spr.width > 40, k = u.boss && !giant ? 2 : 1, sw = spr.width * k, sh = spr.height * k;
      if (u.boss) { // boss aura: a pulsing ring in its element colour, and a heavy shadow
        const ac = u.elements[0] ? G.ELEMENT_INFO[u.elements[0]].color : '#c43c32', pulse = 0.5 + 0.5 * Math.sin(t / 8);
        ctx.save(); ctx.globalAlpha = 0.25 + 0.2 * pulse; ctx.fillStyle = ac; ctx.beginPath(); ctx.ellipse(x, y + 5, 16 + pulse * 2, 6 + pulse, 0, 0, 7); ctx.fill();
        ctx.globalAlpha = 0.5; ctx.fillStyle = '#140c08'; ctx.beginPath(); ctx.ellipse(x, y + 6, 12, 4, 0, 0, 7); ctx.fill(); ctx.restore();
        if (t % 6 === 0) fx.embers = (fx.embers || []).concat([{ x: x - 14 + Math.random() * 28, y: y + 4, life: 30, col: ac }]).slice(-24);
      }
      if (u.kind !== 'ninja' && dir === 2) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(spr, -sw / 2, y + 7 - sh, sw, sh); }
      else ctx.drawImage(spr, Math.round(x - sw / 2), Math.round(y + 7 - sh), sw, sh);
      ctx.restore();
      // mini hp bar
      const bw = u.boss ? 34 : 22, by = y + 7 - sh - 5; ctx.fillStyle = '#24160e'; ctx.fillRect(x - bw / 2 - 1, by, bw + 2, 4);
      ctx.fillStyle = th.id === MY ? '#5ccf5c' : u.team === team() ? '#9fd88a' : '#e8542c'; ctx.fillRect(x - bw / 2, by + 1, Math.max(0, bw * u.hp / u.hpmax), 2);
      const nameUp = eng.raid && u.team === team() && th.id !== MY;
      const nsz = tsz(13, 6, 10);
      if (nameUp) { ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; outlined(u.name.slice(0, 10), x, by - 2, '#fff4dc', nsz, "'Pixelify Sans', sans-serif"); }
      const sts = (u.effects || []).filter((e2) => e2.turns > 0 && G.STATUS[e2.k]).slice(0, 4).map((e2) => G.STATUS[e2.k].icon).join('');
      if (sts) { ctx.font = `${tsz(15, 7, 10)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; fillTextPx(ctx, sts, x, by - 1 - (nameUp ? nsz + 1 : 0)); ctx.textBaseline = 'alphabetic'; }
      if (G.hasStatus(u, 'stun')) { ctx.fillStyle = '#ffe07a'; for (let i = 0; i < 3; i++) { const a = t / 8 + i * 2.1; ctx.fillRect(x + Math.cos(a) * 7 - 1, y - spr.height - 3 + Math.sin(a) * 2, 2, 2); } }
    }
    // projectile
    if (fx.proj) {
      const pr = fx.proj; pr.k += pr.kind === 'blade' ? 0.09 : 0.06; const k = Math.min(1, pr.k);
      const x = pr.x0 + (pr.x1 - pr.x0) * k, y = pr.y0 + (pr.y1 - pr.y0) * k - Math.sin(k * Math.PI) * (pr.kind === 'blade' ? 8 : 4);
      ctx.fillStyle = pr.col;
      if (pr.kind === 'blade') { ctx.save(); ctx.translate(x, y); ctx.rotate(t / 2); ctx.fillRect(-4, -1, 8, 2); ctx.fillRect(-1, -4, 2, 8); ctx.restore(); }
      else if (pr.kind === 'swirl') { ctx.strokeStyle = pr.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 5, t / 3, t / 3 + 4); ctx.stroke(); }
      else { const s = pr.big ? 6 : 4; ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x - 1, y - 2, 2, 2); }
      if (pr.k >= 1) { fx.proj = null; pr.done(); }
    }
    ctx.textAlign = 'center';
    if (fx.embers) { fx.embers = fx.embers.filter((e) => e.life-- > 0); for (const e of fx.embers) { ctx.globalAlpha = e.life / 30; ctx.fillStyle = e.col; ctx.fillRect(Math.round(e.x + Math.sin(e.life / 4) * 2), Math.round(e.y - (30 - e.life) * 1.2), 1, 2); } ctx.globalAlpha = 1; }
    fx.floats = fx.floats.filter((f) => f.life-- > 0);
    const fsz = tsz(16, 7, 12);
    for (const f of fx.floats) {
      const max = f.max, size = fsz * (f.big ? 1.25 : 1), pop = f.life > max - 6 ? 1 + (f.life - (max - 6)) * 0.06 : 1; // a quick pop when it appears
      const y = f.y - (max - f.life) * 0.4 - f.slot * fsz * 1.35;
      ctx.font = `${size}px 'Press Start 2P', monospace`;
      const half = ctx.measureText(f.text).width / 2 + 3, x = Math.max(half, Math.min(W - half, f.x)); // keep it on screen
      ctx.globalAlpha = f.life < 10 ? f.life / 10 : 1;
      outlined(f.text, x, Math.max(size + 2, y), f.color, size * pop);
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
  panel(); idleInfo(); showBanner(eng.side === MY ? 'Your turn' : `${eng.units[eng.side].name} goes first`, eng.side === MY ? 'a' : 'b');
  if (cfg.intro) say(cfg.intro);
  window.__hex = { get eng() { return eng; }, send, pick, hx, cv, my: MY };
  // turn timer (duels)
  const tmr = el.querySelector('.tmr');
  if (cfg.deadline) {
    tmr.hidden = false;
    const tick = setInterval(() => {
      if (!alive) return clearInterval(tick);
      const left = Math.max(0, Math.ceil((cfg.deadline() - Date.now()) / 1000));
      tmr.textContent = `⏱ ${left}s`; tmr.classList.toggle('low', left <= 10 && eng.side === MY); tmr.classList.toggle('them', eng.side !== MY);
      if (left <= 0 && !over && cfg.onTimeout) cfg.onTimeout();
    }, 500);
  }

  const stopNums = numbersInHeadingFont(el); // every number on this screen in the clear heading font
  function finish() { alive = false; ro?.disconnect(); stopNums(); el.remove(); }
  function showResult(res) { cfg.result(res, finish, el); }
}

function missionResult(root, char, res, S0, battle, onEnd, finish) {
  const el = root.querySelector('.hexb');
  {
    const won = res.status === 'won', r = res.result || {}, exam = S0.exam;
    let body;
    const ups = Object.entries(r.jutsu_up || {}).map(([id, lv]) => `<p class="lvl">📜 ${esc(G.MOVES[id]?.name || id)} reached level ${lv}!</p>`).join('');
    const blood = r.bloodline_test ? (r.bloodline ? `<div class="blood"><div class="bico">${G.BLOODLINES[r.bloodline].icon}</div><h4>Bloodline awakened: ${esc(G.BLOODLINES[r.bloodline].label)}!</h4><p>${esc(G.BLOODLINES[r.bloodline].desc)} Only 1 in 100 ninja are born with this. You gain its passive (${esc(G.BLOODLINES[r.bloodline].passive)}) and one secret technique per rank, from now to Jonin.</p></div>`
      : `<div class="blood none"><h4>🧬 Bloodline test</h4><p>The Academy tested your blood: no bloodline awakened. Only 1 in 100 carry one. Most legends were made by training and clever tactics.</p></div>`) : '';
    if (r.lesson) body = `<h3 class="${won ? 'win' : 'lose'}">${won ? 'Lesson complete!' : 'Sparring lost'}</h3>
      ${won ? (r.first ? `<p class="big">+${r.xp} XP &nbsp; +${r.ryo} ryo</p><p>First time clear! Replay any lesson as often as you like for practice.</p>${r.leveled ? `<p class="lvl">⬆ Level up! You are now level ${r.level}.</p>` : ''}` : '<p>Well sparred! Rewards are only given the first time, but every spar trains your jutsu.</p>')
        : '<p>No penalty in the Academy. Read the lesson tip, change your plan and try again.</p>'}${ups}
      <div class="row"><button class="btn ghost" data-t>Train</button><button class="btn primary" data-back>Back to village</button></div>`;
    else if (exam && won && r.next) body = `<h3 class="win">Round ${r.exam_round} cleared!</h3>${ups}<p>Catch your breath: you recover 30% of your HP, stamina and chakra before the next round.</p>
      <div class="row"><button class="btn primary" data-next>Next round ▶</button></div>`;
    else if (exam && won && r.promoted) body = `<div class="promo">★</div><h3 class="win">You are now a ${esc(r.promoted)}!</h3>${blood}
      <p class="lvl">New level cap, higher stat caps, and ${esc(r.promoted)} jutsu unlocked.<br>+${r.ryo} ryo and your energy is full.</p>${ups}
      <div class="row"><button class="btn primary" data-t>Train new jutsu</button><button class="btn ghost" data-back>Back to village</button></div>`;
    else if (exam) body = `<h3 class="lose">Exam failed…</h3><p>The proctors send you home to recover. You can try again after a 5-minute rest.</p>${ups}
      <p class="sub">Tip: use elements your opponent is weak to, and debuff them before big attacks.</p><div class="row"><button class="btn ghost" data-t>Train</button><button class="btn primary" data-back>Back to village</button></div>`;
    else body = `<h3 class="${won ? 'win' : 'lose'}">${won ? 'Mission complete!' : 'Defeated…'}</h3>
      ${won ? `<p class="big">+${r.xp} XP &nbsp; +${r.ryo} ryo</p>
        ${r.daily_limit ? (r.reduced ? `<p class="daily over">📋 Daily full rewards used (${r.daily_limit}). This mission paid 10%. Full rewards return tomorrow.</p>` : r.daily >= r.daily_limit - 10 ? `<p class="daily">📋 Full-reward missions today: ${r.daily} / ${r.daily_limit}</p>` : '') : ''}
        ${r.leveled ? `<p class="lvl">⬆ Level up! You are now level ${r.level}.<br>Your HP, stamina and chakra grew, and your energy is full!</p>` : ''}
        ${r.capped ? `<p class="cap">You've reached the highest level for your rank. Take the rank exam at the Academy to keep growing.</p>` : ''}
        ${r.quest ? (r.quest.done ? `<p class="lvl">🗺️ Quest line complete! The boss lair is now open to you.</p>` : `<p class="lvl">🗺️ Quest progress saved${r.quest.count ? ` (${r.quest.count} done)` : ': next step unlocked'}.</p>`) : ''}`
        : `<p>You were carried back to the village to recover.${r.ryo_lost ? ` You dropped ${r.ryo_lost} ryo.` : ''}</p><p class="daily over">🤕 You are injured for 15 minutes. Rest, or visit the 🏥 Hospital to heal now for a fee.</p><p class="sub">Tip: keep out of melee foes' reach, hide behind rocks from ranged foes, and Focus when low on chakra.</p>`}${ups}
      <div class="row"><button class="btn ${won && r.leveled ? 'primary' : 'ghost'}" data-t>Train</button><button class="btn ${won && r.leveled ? 'ghost' : 'primary'}" data-back>Back to village</button></div>`;
    const box = h(`<div class="b-result"><div class="scroll">${body}</div></div>`);
    el.appendChild(box);
    const done = (extra = {}) => { finish(); onEnd({ status: res.status, result: r, ...extra }); };
    const back = box.querySelector('[data-back]'); if (back) back.onclick = () => done();
    const tr = box.querySelector('[data-t]'); if (tr) tr.onclick = () => done({ train: true });
    const nx = box.querySelector('[data-next]');
    if (nx) nx.onclick = () => { nx.disabled = true; finish(); runBattle(root, char, null, onEnd, () => net.examContinue(battle.id)); };
  }
}

// ---------- live duel ----------
// duel row -> battle-style result for the viewer
export function duelRes(d, myId) {
  const over = d.status === 'over' || d.status === 'expired';
  return { seq: d.seq, state: d.state, events: (d.state && d.state.events) || [], status: over ? (d.winner === myId ? 'won' : 'lost') : 'active', result: { points: d.points, reason: d.reason, expired: d.status === 'expired' } };
}
export function runDuel(root, char, duel, onEnd) {
  const myId = char.user_id, my = duel.a === myId ? 'a' : 'b', foeName = my === 'a' ? duel.b_name : duel.a_name;
  let deadline = new Date(duel.deadline).getTime(), lastClaim = 0, unsub = null, seqNow = duel.seq;
  const track = (d) => { if (d.deadline) deadline = new Date(d.deadline).getTime(); seqNow = Math.max(seqNow, d.seq); return duelRes(d, myId); };
  battleView(root, char, {
    my, duel: true, state: duel.state, seq: duel.seq, biome: duel.kind === 'war' ? VILLAGE_BIOME[char.village] : 'arena',
    head: `<span class="grade" style="background:#c43c32">⚔</span><b>Duel vs ${esc(foeName)}</b>`,
    intro: `<b>Live duel!</b> You have 60 seconds per turn. Three missed turns and you lose.`,
    act: async (a) => track(await net.duelAct(duel.id, a)),
    listen: (apply) => { unsub = net.watchDuel(duel.id, (d) => apply(track(d))); },
    deadline: () => deadline,
    onTimeout: () => { if (Date.now() - lastClaim < 4000 || Date.now() < deadline + 1500) return; lastClaim = Date.now(); net.duelTimeout(duel.id, seqNow).then((d) => d && d.seq > 0 && null).catch(() => {}); },
    fled: () => { unsub && unsub(); onEnd({ status: 'fled' }); },
    result: (res, finish, el) => {
      unsub && unsub();
      const won = res.status === 'won', r = res.result || {}, p = r.points || {};
      const why = r.reason === 'timeout' ? (won ? `${esc(foeName)} ran out of time too often.` : 'You ran out of time three times.') : r.reason === 'forfeit' ? (won ? `${esc(foeName)} forfeited.` : 'You forfeited.') : '';
      const pts = p.capped ? `<p class="sub">No Arena points: you two have already duelled 3 times today.</p>` : won ? `<p class="big">+${p.gain || 0} Arena points</p>` : `<p class="sub">${p.loss ? `−${p.loss} Arena points` : 'No points lost.'}</p>`;
      const box = h(`<div class="b-result"><div class="scroll"><h3 class="${won ? 'win' : 'lose'}">${won ? 'Victory!' : 'Defeated…'}</h3><p>${won ? `You beat ${esc(foeName)} in a live duel.` : `${esc(foeName)} won this duel.`} ${why}</p>${pts}
        <div class="row"><button class="btn primary" data-back>Back to village</button></div></div></div>`);
      el.appendChild(box);
      box.querySelector('[data-back]').onclick = () => { finish(); onEnd({ status: res.status, result: r }); };
    },
  });
}

// ---------- team boss fight ----------
export function raidRes(r, myId) {
  const over = ['over', 'closed'].includes(r.status);
  return { seq: r.seq, state: r.state, events: (r.state && r.state.events) || [], status: over ? (r.winner === 'A' ? 'won' : 'lost') : 'active', result: { rewards: r.rewards && r.rewards[myId], closed: r.status === 'closed' } };
}
export function runRaid(root, char, raid, bossName, onEnd, lineId = null) {
  const myId = char.user_id, units = raid.state.engine.units, my = Object.keys(units).find((k) => units[k].uid === myId);
  let deadline = new Date(raid.deadline).getTime(), lastClaim = 0, unsub = null, seqNow = raid.seq;
  const track = (r) => { if (r.deadline) deadline = new Date(r.deadline).getTime(); seqNow = Math.max(seqNow, r.seq); return raidRes(r, myId); };
  battleView(root, char, {
    my, raid: true, state: raid.state, seq: raid.seq, biome: LINE_BIOME[lineId || raid.line || raid.boss] || undefined,
    head: `<span class="grade" style="background:#8a2a2a">☠</span><b>${esc(bossName)}</b>`,
    intro: `<b>Boss fight!</b> Players act in turn (60 seconds each), then the boss. Spread out: its sweeps and barrages hit everyone close together.`,
    act: async (a) => track(await net.raidAct(raid.id, a)),
    listen: (apply) => { unsub = net.watchRaid(raid.id, (r) => apply(track(r))); },
    deadline: () => deadline,
    onTimeout: () => { if (Date.now() - lastClaim < 4000 || Date.now() < deadline + 1500) return; lastClaim = Date.now(); net.raidTimeout(raid.id, seqNow).catch(() => {}); },
    fled: () => { unsub && unsub(); onEnd({ status: 'fled' }); },
    result: (res, finish, el) => {
      unsub && unsub();
      const won = res.status === 'won', r = (res.result || {}).rewards || {};
      const rw = !won ? '<p>The team was defeated. Train, regroup and try again. Defeat costs nothing.</p>'
        : r.capped ? '<p class="sub">You have already claimed this boss\'s rewards 3 times today. Thanks for helping your team!</p>'
        : `<p class="big">+${r.xp || 0} XP &nbsp; +${r.ryo || 0} ryo</p>${r.scroll ? `<div class="blood"><div class="bico">📜</div><h4>Rare drop: ${esc(G.MOVES[r.scroll]?.name || r.scroll)} scroll!</h4><p>You learned a boss-only technique. Find it in your Bukijutsu tab.</p></div>` : ''}${r.gear && G.GEAR[r.gear] ? `<div class="blood"><div class="bico">${gearIconHTML(r.gear, 54, G.GEAR[r.gear].icon)}</div><h4>Rare drop: ${esc(G.GEAR[r.gear].name)}!</h4><p>${esc(G.GEAR[r.gear].note || '')}. Equip it from the menu: Equipment.</p></div>` : ''}
           ${r.title ? `<div class="blood"><div class="bico">🏆</div><h4>New title: "${esc(r.title)}"</h4><p>It now shows under your name.</p></div>` : ''}${r.leveled ? `<p class="lvl">⬆ Level up! You are now level ${r.level}.</p>` : ''}
           <p class="sub">Rewarded wins left today for this boss: ${r.claims_left ?? 0}</p>`;
      const box = h(`<div class="b-result"><div class="scroll"><h3 class="${won ? 'win' : 'lose'}">${won ? `${esc(bossName)} is defeated!` : 'Your team fell…'}</h3>${rw}
        <div class="row"><button class="btn primary" data-back>Back</button></div></div></div>`);
      el.appendChild(box);
      box.querySelector('[data-back]').onclick = () => { finish(); onEnd({ status: res.status, result: r }); };
    },
  });
}
