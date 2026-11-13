// Boss lair: find or form a team of up to 3, then fight together.
import * as net from './net.js?v=9d1c820';
import * as G from './engine.js?v=9d1c820';
import { runRaid } from './hexbattle.js?v=9d1c820';
import { openLoadout } from './loadout.js?v=9d1c820';
import { LOCATIONS } from './worldmap.js?v=9d1c820';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
function toast(msg, kind = 'err') { const t = h(`<div class="toast ${kind}">${esc(msg)}</div>`); document.body.appendChild(t); setTimeout(() => t.remove(), 3500); }
const REWARD = { riches: '💰 Huge XP and ryo', scroll: '📜 20% chance of the rare Serpent Fang jutsu scroll', title: '🏆 Titles and trophies' };

export function openLair(root, char, line, onEnd) {
  const loc = LOCATIONS[line.lair], myId = char.user_id;
  const el = h(`<div class="ov board-wrap"><div class="scroll board lair"><h3>${loc.icon} ${esc(loc.name)}</h3>
    <div class="wm-boss"><b>Boss: ${esc(line.boss_name)}</b><small>Reward: ${REWARD[line.reward]}</small><small>Up to 3 rewarded wins per day. Smaller teams face a weaker boss.</small></div>
    <div class="lair-body"><div class="spinner"></div></div><button class="btn ghost" data-x>Leave the lair</button></div></div>`);
  root.appendChild(el);
  const body = el.querySelector('.lair-body');
  let mine = null, list = [], unsub = null, alive = true, busy = false;
  const close = async () => {
    alive = false; unsub && unsub(); clearInterval(poll);
    if (mine && mine.status === 'lobby') { try { await net.raidLeave(mine.id); } catch {} }
    el.remove(); onEnd && onEnd(null);
  };
  el.querySelector('[data-x]').onclick = close;
  function watch(r) {
    mine = r; unsub && unsub();
    unsub = net.watchRaid(r.id, (u) => { mine = u; if (u.status === 'active') begin(u); else if (u.status === 'prep') prep(u); else if (!u.members.some((m) => m.id === myId) || u.status === 'closed') { mine = null; unsub && unsub(); refresh(); } else render(); });
  }
  let lo = null, prepped = false;
  function prep(r) {
    mine = r; if (prepped) return; prepped = true;
    el.style.display = 'none';
    lo = openLoadout(root, char, {
      title: `Boss fight: ${line.boss_name}`, sub: 'Your team is gathering. The fight begins when everyone is ready, or in 60 seconds.',
      deadline: new Date(r.deadline).getTime(),
      status: () => `${mine.members.filter((m) => (mine.ready || {})[m.id]).length}/${mine.members.length} ready`,
      onReady: async () => {
        lo = null;
        for (let i = 0; i < 40 && alive; i++) {
          try { const x = await net.raidReady(r.id); if (x && x.status === 'active') return begin(x); if (x && !['prep', 'active'].includes(x.status)) return; } catch {}
          await new Promise((z) => setTimeout(z, 3000));
        }
      },
    });
  }
  function begin(r) {
    if (lo) { lo.close(); lo = null; }
    if (!alive) return; alive = false; unsub && unsub(); clearInterval(poll); el.remove();
    runRaid(root, char, r, line.boss_name, (res) => onEnd && onEnd(res), line.id);
  }
  async function refresh() {
    try { list = await net.raidLobbies(line.id); } catch (e) { body.innerHTML = `<p>${esc(e.message)}</p>`; return; }
    const m = list.find((r) => r.members.some((x) => x.id === myId) && ['lobby', 'active'].includes(r.status));
    if (m && m.status === 'active') return begin(m);
    if (m && m.status === 'prep') { watch(m); return prep(m); }
    if (m && (!mine || mine.id !== m.id)) watch(m);
    if (!m && mine) mine = null;
    render();
  }
  const memberRow = (m, r) => `<div class="lm"><b>${esc(m.name)}</b>${m.id === r.leader ? ' <span class="ldr">👑 Leader</span>' : ''}<small>${esc(m.rank)} · Lv ${m.level}${m.element ? ` · ${G.ELEMENT_INFO[m.element].icon} ${G.ELEMENT_INFO[m.element].label}` : ''}</small></div>`;
  function render() {
    if (!alive) return;
    if (mine) {
      const lead = mine.leader === myId, n = mine.members.length;
      body.innerHTML = `<h4>Your team (${n}/3)</h4><div class="lmembers">${mine.members.map((m) => memberRow(m, mine)).join('')}${Array.from({ length: 3 - n }, () => '<div class="lm empty">Waiting for a ninja to join…</div>').join('')}</div>
        <p class="sub">${lead ? (n < 3 ? `You can start now with ${n}, or wait for more. Players who finished this quest line can join from the lair.` : 'Full team! Start when ready.') : 'Waiting for the leader to start…'}</p>
        <div class="row">${lead ? `<button class="btn primary" data-start ${busy ? 'disabled' : ''}>⚔️ Start the fight (${n} player${n > 1 ? 's' : ''})</button>` : ''}<button class="btn ghost" data-leave>Leave team</button></div>`;
      const st = body.querySelector('[data-start]');
      if (st) st.onclick = async () => { busy = true; render(); try { const x = await net.raidStart(mine.id); x.status === 'prep' ? prep(x) : begin(x); } catch (e) { toast(e.message); busy = false; render(); } };
      body.querySelector('[data-leave]').onclick = async () => { try { await net.raidLeave(mine.id); } catch {} unsub && unsub(); mine = null; refresh(); };
      return;
    }
    const open = list.filter((r) => r.status === 'lobby');
    body.innerHTML = `<h4>Teams gathering here</h4>${open.length ? open.map((r) => `<div class="lteam"><div><b>${esc(r.members.find((m) => m.id === r.leader)?.name || 'Team')}'s team</b><small>${r.members.map((m) => esc(m.name)).join(', ')} · ${r.members.length}/3</small></div>
        <button class="btn small primary" data-join="${r.id}" ${r.members.length >= 3 ? 'disabled' : ''}>${r.members.length >= 3 ? 'Full' : 'Join'}</button></div>`).join('') : '<p class="sub">No teams yet. Start one and others can join you.</p>'}
      <div class="row"><button class="btn primary" data-create>➕ Start a new team</button></div>`;
    body.querySelectorAll('[data-join]').forEach((b) => (b.onclick = async () => { try { watch(await net.raidJoin(b.dataset.join)); render(); } catch (e) { toast(e.message); refresh(); } }));
    body.querySelector('[data-create]').onclick = async () => { try { watch(await net.raidCreate(line.id)); render(); } catch (e) { toast(e.message); } };
  }
  const poll = setInterval(() => { if (alive && !mine) refresh(); }, 5000);
  refresh();
  return { close };
}
