// Kage Tower: village wars leaderboard, the Kage seat, village upgrades and the war room.
import * as net from './net.js?v=9d1c820';
import { ninjaSprite, VILLAGES, emblem, drawNinjaFit } from './sprites.js?v=9d1c820';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
function toast(msg, kind = 'err') { const t = h(`<div class="toast ${kind}">${esc(msg)}</div>`); document.body.appendChild(t); setTimeout(() => t.remove(), 3500); }
const left = (iso) => { const s = Math.max(0, (new Date(iso) - Date.now()) / 1000); const d = Math.floor(s / 86400), hh = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return d ? `${d}d ${hh}h` : hh ? `${hh}h ${m}m` : `${m}m`; };
const n = (x) => Number(x || 0).toLocaleString('en-GB');

export const UPGRADES = [
  { id: 'training', icon: '🥋', name: 'Training Grounds', what: 'stat training progress' },
  { id: 'missions', icon: '📜', name: 'Mission Hall', what: 'ryo from missions and quests' },
  { id: 'library', icon: '📚', name: 'Library', what: 'jutsu XP' },
  { id: 'springs', icon: '♨️', name: 'Hot Springs', what: 'energy refill speed' },
];
const COST = [300, 600, 1000, 1500, 2500];
export const WAR_COST = 500;
const TERR_ICON = { bandit_road: '🛤️', watchtower: '🗼', misty_marsh: '🌫️', whispering_woods: '🍃', ashen_peak: '🌋' };

// hooks: { challengeKage(kage), openWar(territoryId) }
export function openKageTower(root, char, hooks = {}, startTab = 'wars') {
  const el = h(`<div class="ov board-wrap"><div class="scroll board kage"><h3>🏯 Kage Tower</h3><div class="kg-body"></div><button class="btn ghost" data-x>Close</button></div></div>`);
  root.appendChild(el);
  const close = () => el.remove();
  el.querySelector('[data-x]').onclick = close;
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
  const body = el.querySelector('.kg-body');
  let tab = startTab, data = null, busy = false;

  async function load() {
    try { data = await net.villageInfo(); } catch (e) { data = { error: e.message }; }
    render();
  }
  async function act(fn, ok) {
    if (busy) return; busy = true;
    try { data = await fn(); ok && toast(ok, 'ok'); } catch (e) { toast(e.message); }
    busy = false; render();
  }
  const mine = () => data.villages.find((v) => v.id === data.mine);
  const isKage = () => { const k = mine().kage; return k && k.id === data.me.id; };

  function boardTab() {
    const vs = [...data.villages].sort((a, b) => b.month - a.month);
    const medal = ['🥇', '🥈', '🥉'];
    return `<p class="sub">Every mission, exam, boss and duel earns points for your village. <b>PvP wins earn the most</b>, and war duels most of all.</p>
      <div class="kg-board">${vs.map((v, i) => { const vv = VILLAGES[v.id]; return `<div class="kg-v ${v.id === data.mine ? 'me' : ''}" style="--vc:${vv.color};--vd:${vv.dark}">
        <span class="pl">${medal[i]}</span><span class="em" data-em="${v.id}"></span>
        <span class="nm"><b>${esc(vv.name)}</b><small>${v.kage ? `Kage: ${esc(v.kage.name)}` : 'No Kage'} · ${v.ninjas} ninja</small></span>
        <span class="vp"><b>${n(v.month)}</b><small>this month</small></span>
        <span class="tr">${v.territories.map((t) => TERR_ICON[t] || '🚩').join('') || '–'}<small>${v.territories.length} held</small></span></div>`; }).join('')}</div>
      <p class="kg-mine">You've earned <b>${n(data.my_month)}</b> points for ${esc(VILLAGES[data.mine].short)} this month.</p>
      <div class="kg-pts"><b>How to earn village points</b>
        <span>Mission <b>1–8</b></span><span>Lesson <b>1</b></span><span>Quest fight <b>3</b></span><span>Rank exam <b>10</b></span><span>Boss win <b>10</b></span>
        <span>Duel win <b>5</b></span><span>vs other village <b>10</b></span><span class="hot">War duel win <b>25</b></span></div>
      <h4>All-time</h4><div class="kg-all">${data.villages.map((v) => `<span><i data-em="${v.id}"></i>${esc(VILLAGES[v.id].short)} <b>${n(v.score)}</b></span>`).join('')}</div>`;
  }

  function villageTab() {
    const v = mine(), k = v.kage, vv = VILLAGES[v.id], me = data.me;
    let seat;
    if (!k) seat = `<p>The Kage's seat is <b>empty</b>.</p>${me.rank === 'Jonin' ? '<button class="btn primary" data-claim>👑 Take the seat</button>' : '<p class="sub">Any Jonin can claim it.</p>'}`;
    else if (k.id === me.id) seat = `<p class="kg-you">👑 <b>You are the ${esc(vv.short)} Kage.</b> Spend the treasury on upgrades and lead the village to war.</p><p class="sub">Any other Jonin of your village may challenge you once a day while you're awake and online. Declining or ignoring a challenge gives up the seat. Sleeping protects you, but 7 days asleep in a row gives up the seat.</p>`;
    else {
      const wait = v.challenge_at && new Date(v.challenge_at) > new Date();
      let btn = '';
      if (me.rank !== 'Jonin') btn = '<p class="sub">Only a Jonin can challenge the Kage.</p>';
      else if (k.away) btn = `<p class="sub">${esc(k.name)} has been ${k.asleep ? 'asleep' : 'away'} for 7 days, so the seat is open.</p><button class="btn primary" data-claim>👑 Take the seat</button>`;
      else if (k.asleep) btn = '<p class="sub">💤 The Kage is asleep and can\'t be challenged. A Kage asleep for 7 days in a row loses the seat.</p>';
      else if (wait) btn = `<p class="sub">The seat was challenged recently. Next challenge in <b>${left(v.challenge_at)}</b>.</p>`;
      else if (!k.online) btn = '<p class="sub">The Kage can only be challenged while they are in the village.</p><button class="btn primary" disabled>⚔️ Challenge (offline)</button>';
      else btn = '<button class="btn primary" data-challenge>⚔️ Challenge for the seat</button><p class="sub">A live duel. Win and the seat is yours.</p>';
      seat = `<div class="kg-kage"><canvas width="48" height="60" data-look='${esc(JSON.stringify(k.look || {}))}'></canvas><div><p class="soon">👑 ${esc(vv.short)} Kage</p><h4>${esc(k.name)}</h4><p>Level ${k.level} · ${k.asleep ? '<span class="off">💤 asleep</span>' : k.online ? '<span class="on">● in the village</span>' : '<span class="off">○ away</span>'}</p></div></div>${btn}`;
    }
    const kage = isKage();
    const ups = UPGRADES.map((u) => {
      const lv = v.upgrades[u.id] || 0, cost = COST[lv];
      return `<div class="kg-up"><span class="ic">${u.icon}</span><span class="nm"><b>${u.name}</b><small>+${lv * 5}% ${u.what}</small></span>
        <span class="lv">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('')}</span>
        ${lv >= 5 ? '<span class="max">MAX</span>' : kage ? `<button class="btn small primary" data-up="${u.id}" ${v.treasury < cost ? 'disabled' : ''}>${n(cost)} 💰</button>` : `<span class="cost">next ${n(cost)}</span>`}</div>`;
    }).join('');
    return `<div class="kg-seat">${seat}</div>
      <div class="kg-tre"><span>🏦 Village treasury</span><b>${n(v.treasury)}</b></div>
      <p class="sub">The treasury fills with every village point earned, plus <b>50 a day</b> for each territory held. Only the Kage can spend it.</p>
      <h4>Village upgrades</h4><div class="kg-ups">${ups}</div>
      <p class="sub">Each level gives <b>+5%</b> to every ninja in ${esc(vv.short)}, up to +25%.</p>
      <h4>Top ${esc(vv.short)} ninja this month</h4>
      <div class="kg-top">${data.top.length ? data.top.map((t, i) => `<div><span>${i + 1}</span><b>${esc(t.name)}</b><em>${n(t.points)}</em></div>`).join('') : '<p class="sub">No points yet this month.</p>'}</div>`;
  }

  function warTab() {
    const v = mine(), kage = isKage();
    const attacking = data.territories.find((t) => t.war && t.war.attacker === data.mine);
    const rows = data.territories.map((t) => {
      const hv = t.holder ? VILLAGES[t.holder] : null, w = t.war, cd = t.cooldown_until && new Date(t.cooldown_until) > new Date();
      let status, btn = '';
      if (w) {
        const myside = w.attacker === data.mine ? 'attacker' : w.defender === data.mine ? 'defender' : null;
        status = `<span class="war">⚔️ ${esc(VILLAGES[w.attacker].short)} attacking · <b>${w.att_score}</b> – <b>${w.def_score}</b> · ${left(w.ends_at)} left</span>`;
        btn = myside && data.me.rank !== 'Academy Student' ? `<button class="btn small primary" data-go="${t.id}">${myside === 'attacker' ? 'Attack!' : 'Defend!'}</button>` : '';
      } else if (cd) status = `<span class="cd">🕊️ Truce for ${left(t.cooldown_until)}</span>`;
      else status = '<span class="open">Open to attack</span>';
      if (!w && kage && t.holder !== data.mine) {
        const why = cd ? 'truce' : attacking ? 'busy' : v.treasury < WAR_COST ? 'poor' : '';
        const lbl = { truce: '🕊️ In truce', busy: 'Already at war', poor: `Need ${WAR_COST} 💰` }[why] || `Declare war · ${WAR_COST} 💰`;
        btn = `<button class="btn small ${why ? 'ghost' : 'primary'}" data-war="${t.id}" ${why ? 'disabled' : ''}>${lbl}</button>`;
      }
      return `<div class="kg-t"><span class="ic">${TERR_ICON[t.id] || '🚩'}</span><span class="nm"><b>${esc(t.name)}</b><small>${hv ? `Held by <b style="color:${hv.dark}">${esc(hv.short)}</b>` : 'Unclaimed'}</small>${status}</span>${btn}</div>`;
    }).join('');
    const recent = data.recent_wars.length ? `<h4>Recent wars</h4><div class="kg-recent">${data.recent_wars.map((w) => `<div>${TERR_ICON[w.territory] || '🚩'} ${esc(VILLAGES[w.attacker].short)} → ${esc((data.territories.find((t) => t.id === w.territory) || {}).name || w.territory)}: <b>${w.att_score}–${w.def_score}</b>, ${w.winner === w.attacker ? `<b>${esc(VILLAGES[w.attacker].short)} captured it</b>` : w.winner ? `${esc(VILLAGES[w.winner].short)} held on` : 'no winner'}</div>`).join('')}</div>` : '';
    return `<p class="sub">Each territory pays its village <b>50 treasury a day</b>. Only the Kage can declare war, and it costs <b>${WAR_COST}</b> from the treasury.</p>
      <div class="kg-rules"><b>How wars work</b>
        <span>⏱️ A war lasts 24 hours.</span>
        <span>⚔️ Go to the territory on the world map and duel the other side: each win is <b>+10 war points</b>.</span>
        <span>🏳️ Attackers there while no defenders are online get <b>+5 every 10 minutes</b>.</span>
        <span>🏆 Most war points after 24 hours wins. Taking an unclaimed territory needs 20.</span>
        <span>🕊️ Then a 2-week truce for that territory.</span></div>
      ${kage ? '' : `<p class="sub">${v.kage ? `Only ${esc(v.kage.name)}, your Kage, can declare war.` : 'Your village has no Kage to declare war.'}</p>`}
      <div class="kg-terr">${rows}</div>${recent}`;
  }

  function render() {
    if (!data) { body.innerHTML = '<div class="spinner"></div>'; return; }
    if (data.error) { body.innerHTML = `<p class="sub">${esc(data.error)}</p>`; return; }
    const tabs = [['wars', '🏆 Wars'], ['village', `👑 ${VILLAGES[data.mine].short}`], ['room', '⚔️ War Room'], ['anbu', '🎭 ANBU']];
    body.innerHTML = `<div class="ttabs">${tabs.map(([k, l]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div>
      ${tab === 'wars' ? boardTab() : tab === 'village' ? villageTab() : tab === 'room' ? warTab() : anbuTab()}`;
    body.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { tab = b.dataset.t; if (tab === 'anbu' && !anbu) loadAnbu(); render(); }));
    if (tab === 'anbu') wireAnbu();
    body.querySelectorAll('[data-em]').forEach((s) => s.appendChild(emblem(s.dataset.em, 16)));
    body.querySelectorAll('canvas[data-look]').forEach((cv) => { const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; try { drawNinjaFit(cv, JSON.parse(cv.dataset.look)); } catch {} });
    const q = (s) => body.querySelector(s);
    q('[data-claim]') && (q('[data-claim]').onclick = () => act(() => net.kageClaim(), 'You are now the Kage! 👑'));
    q('[data-challenge]') && (q('[data-challenge]').onclick = () => { close(); hooks.challengeKage && hooks.challengeKage(mine().kage); });
    body.querySelectorAll('[data-up]').forEach((b) => (b.onclick = () => { const u = UPGRADES.find((x) => x.id === b.dataset.up); act(() => net.villageUpgrade(u.id), `${u.name} upgraded!`); }));
    body.querySelectorAll('[data-war]').forEach((b) => (b.onclick = () => {
      const t = data.territories.find((x) => x.id === b.dataset.war);
      confirmBox(`Declare war on <b>${esc(t.name)}</b>?`, `This spends <b>${WAR_COST}</b> from the treasury. ${t.holder ? `${esc(VILLAGES[t.holder].name)} will defend it.` : 'Nobody holds it yet: you need at least 20 war points to claim it.'} The war lasts 24 hours.`, 'Declare war ⚔️',
        () => act(() => net.warDeclare(t.id), `War declared on ${t.name}! Rally your village.`));
    }));
    body.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => { close(); hooks.openWar && hooks.openWar(b.dataset.go); }));
  }
  // ---------- ANBU squads ----------
  let anbu = null, newSquad = false;
  async function loadAnbu() { try { anbu = await net.anbuInfo(); } catch (e) { anbu = { error: e.message }; } render(); }
  async function anbuAct(fn, ok) { if (busy) return; busy = true; try { anbu = await fn(); ok && toast(ok, 'ok'); } catch (e) { toast(e.message); } busy = false; newSquad = false; render(); }
  function anbuTab() {
    if (!anbu) return '<div class="spinner"></div>';
    if (anbu.error) return `<p class="sub">${esc(anbu.error)}</p>`;
    const elig = ['Chunin', 'Jonin'].includes(anbu.rank);
    const intro = `<div class="kg-rules"><b>🎭 The ANBU</b><span>Elite squads of the village. The Kage creates up to 3 squads and names a leader (Chunin or Jonin).</span>
      <span>Chunin and Jonin apply; the squad leader accepts or declines. Up to 6 per squad.</span><span>Members can buy and wear the ANBU blade and uniform at the Tool Shop. Leave the ANBU and that gear comes off.</span></div>`;
    const squads = anbu.squads.map((sq) => {
      const lead = sq.leader === anbu.me, mine = anbu.my_squad === sq.id, canManage = lead || anbu.is_kage;
      const members = sq.members.map((m) => `<div class="an-m"><canvas width="24" height="30" data-look='${esc(JSON.stringify(m.look || {}))}'></canvas><span><b>${esc(m.name)}${m.id === sq.leader ? ' <em class="tag anbu">Leader</em>' : ''}</b><small>${esc(m.rank)} · Lv ${m.level}</small></span>
        ${canManage && m.id !== sq.leader ? `<button class="btn small ghost" data-kick="${m.id}">Remove</button>` : ''}${m.id === anbu.me && m.id !== sq.leader ? '<button class="btn small ghost" data-leave>Leave</button>' : ''}</div>`).join('');
      const apps = canManage && sq.applications.length ? `<h4>Applications</h4>${sq.applications.map((a) => `<div class="an-m"><span><b>${esc(a.name)}</b><small>${esc(a.rank)} · Lv ${a.level}</small></span>
        <button class="btn small primary" data-acc="${sq.id}|${a.id}">Accept</button><button class="btn small ghost" data-dec="${sq.id}|${a.id}">Decline</button></div>`).join('')}` : '';
      let join = '';
      if (!anbu.my_squad && elig) join = sq.applied ? '<p class="sub">⏳ You applied. Waiting for the leader.</p>' : sq.members.length >= 6 ? '<p class="sub">Squad full.</p>' : `<button class="btn small primary" data-apply="${sq.id}">Apply to join</button>`;
      return `<div class="an-sq ${mine ? 'mine' : ''}"><div class="an-hd"><b>🎭 ${esc(sq.name)}</b><small>${sq.members.length}/6</small>${anbu.is_kage ? `<button class="btn small ghost" data-disband="${sq.id}">Disband</button>` : ''}</div>${members}${apps}${join}</div>`;
    }).join('') || '<p class="sub">No ANBU squads yet.</p>';
    const create = anbu.is_kage && anbu.squads.length < 3 ? (newSquad
      ? `<div class="an-new"><h4>New squad</h4><input id="anName" maxlength="24" placeholder="Squad name, e.g. Night Owls"><select id="anLead">${anbu.candidates.map((c) => `<option value="${c.id}">${esc(c.name)} (${esc(c.rank)} · Lv ${c.level})</option>`).join('')}</select>
          <div class="row"><button class="btn ghost" data-cancel>Cancel</button><button class="btn primary" data-create ${anbu.candidates.length ? '' : 'disabled'}>Create squad</button></div></div>`
      : '<button class="btn primary" data-new>➕ Create an ANBU squad</button>') : '';
    return `${intro}${!elig && !anbu.my_squad ? '<p class="sub">Only Chunin and Jonin can join the ANBU.</p>' : ''}<div class="an-list">${squads}</div>${create}`;
  }
  function wireAnbu() {
    const q = (x) => body.querySelector(x);
    body.querySelectorAll('canvas[data-look]').forEach((cv) => { const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; try { drawNinjaFit(cv, JSON.parse(cv.dataset.look)); } catch {} });
    body.querySelectorAll('[data-apply]').forEach((b) => (b.onclick = () => anbuAct(() => net.anbuApply(b.dataset.apply), 'Application sent!')));
    body.querySelectorAll('[data-acc]').forEach((b) => (b.onclick = () => { const [sq, u] = b.dataset.acc.split('|'); anbuAct(() => net.anbuDecide(sq, u, true), 'Welcome to the squad!'); }));
    body.querySelectorAll('[data-dec]').forEach((b) => (b.onclick = () => { const [sq, u] = b.dataset.dec.split('|'); anbuAct(() => net.anbuDecide(sq, u, false)); }));
    body.querySelectorAll('[data-kick]').forEach((b) => (b.onclick = () => anbuAct(() => net.anbuLeave(b.dataset.kick), 'Removed from the squad.')));
    body.querySelectorAll('[data-leave]').forEach((b) => (b.onclick = () => confirmBox('Leave the ANBU?', 'Your ANBU gear will come off and can\'t be worn again until you rejoin a squad.', 'Leave', () => anbuAct(() => net.anbuLeave(), 'You left the ANBU.'))));
    body.querySelectorAll('[data-disband]').forEach((b) => (b.onclick = () => confirmBox('Disband this squad?', 'All members leave the ANBU and their ANBU gear comes off.', 'Disband', () => anbuAct(() => net.anbuDisband(b.dataset.disband), 'Squad disbanded.'))));
    q('[data-new]') && (q('[data-new]').onclick = () => { newSquad = true; render(); });
    q('[data-cancel]') && (q('[data-cancel]').onclick = () => { newSquad = false; render(); });
    q('[data-create]') && (q('[data-create]').onclick = () => anbuAct(() => net.anbuCreate(q('#anName').value, q('#anLead').value), 'ANBU squad created!'));
  }
  function confirmBox(title, text, yes, onYes) {
    const c = h(`<div class="ov board-wrap"><div class="scroll board"><h3>${title}</h3><p>${text}</p><div class="row"><button class="btn ghost" data-n>Not yet</button><button class="btn primary" data-y>${yes}</button></div></div></div>`);
    root.appendChild(c);
    c.querySelector('[data-n]').onclick = () => c.remove();
    c.querySelector('[data-y]').onclick = () => { c.remove(); onYes(); };
  }
  render(); load(); if (startTab === 'anbu') loadAnbu();
  return { close };
}
