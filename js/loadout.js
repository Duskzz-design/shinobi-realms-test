// Pre-fight loadout: 60 seconds to pick which jutsu and items to bring. "Ready" skips the wait.
import * as net from './net.js?v=9d1c820';
import { itemIconHTML } from './itemicons.js?v=9d1c820';
import * as G from './engine.js?v=9d1c820';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
function toast(msg, kind = 'err') { const t = h(`<div class="toast ${kind}">${esc(msg)}</div>`); document.body.appendChild(t); setTimeout(() => t.remove(), 3500); }
const STYLE_ICON = { taijutsu: '👊', bukijutsu: '🗡️', ninjutsu: '🌀', genjutsu: '👁️', bloodline: '🩸' };

// opts: { title, sub, deadline (ms timestamp), status() -> extra html (e.g. "opponent is ready"), onReady() }
export function openLoadout(root, char, opts) {
  const { known, pick } = G.loadoutMoves(char), slots = char.jutsu_slots || 6;
  let jutsu = [...pick];
  let items = Object.keys(G.loadoutItems(char));
  const owned = char.items || {};
  if (!items.length) items = Object.keys(G.ITEMS).filter((id) => owned[id] > 0).slice(0, G.ITEM_SLOTS);
  const el = h(`<div class="ov board-wrap loadout-wrap"><div class="scroll board loadout"><h3>🎒 ${esc(opts.title || 'Prepare for battle')}</h3><div class="lo-body"></div></div></div>`);
  root.appendChild(el);
  const body = el.querySelector('.lo-body');
  let done = false, saving = false;
  const deadline = opts.deadline || Date.now() + 60000;

  async function finish() {
    if (done) return; done = true; clearInterval(tick);
    const btn = body.querySelector('[data-go]'); if (btn) { btn.disabled = true; btn.textContent = 'Ready ✓'; }
    try { const me = await net.setLoadout(jutsu, items); if (me) Object.assign(char, me, { _loadedAt: Date.now() }); } catch (e) { toast(e.message); }
    el.remove(); opts.onReady && opts.onReady();
  }
  function render() {
    const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    const jl = char.jutsu || {};
    body.innerHTML = `${opts.sub ? `<p class="sub">${opts.sub}</p>` : ''}
      <div class="lo-timer"><i style="width:${(left / 60) * 100}%"></i><span>⏱ ${left}s</span></div>
      <h4>Jutsu <b>${jutsu.length}/${slots}</b> <small>· Always with you: Focus, Guard${(char.gear || {}).weapon ? ', Sword Slash' : ''}${G.COUNTERS.filter((id) => (char.scrolls || []).includes(id)).map((id) => ', ' + G.MOVES[id].name).join('')}</small></h4>
      <div class="lo-grid">${known.map((id) => { const m = G.MOVES[id], on = jutsu.includes(id), col = m.element ? G.ELEMENT_INFO[m.element].color : '#7a4a2a';
        return `<button class="lo-j ${on ? 'on' : ''}" data-j="${id}" style="--c:${col}"><b>${STYLE_ICON[m.style] || ''} ${esc(m.name)}</b><small>${m.ap} AP · ${m.target === 'self' ? 'Self' : m.range[1] === 0 ? 'Around you' : 'Range ' + m.range[1]}${m.aoe ? ' · Area' : ''}${G.cooldownOf(id) ? ' · ⏳' + G.cooldownOf(id) : ''} · Lv ${(jl[id] && jl[id].level) || 1}</small></button>`; }).join('') || '<p class="sub">You know no jutsu yet.</p>'}
        ${slots < 8 ? '<div class="lo-lock">🔒 <b>+2 jutsu slots</b><small>Premium upgrade, coming soon</small></div>' : ''}</div>
      <h4>Items <b>${items.length}/${G.ITEM_SLOTS}</b> <small>· buy more at the Tool Shop</small></h4>
      <div class="lo-grid">${Object.entries(G.ITEMS).map(([id, it]) => { const n = owned[id] || 0, on = items.includes(id);
        return `<button class="lo-j it ${on ? 'on' : ''}" data-it="${id}" ${n ? '' : 'disabled'}><b>${itemIconHTML(id, 20, it.icon)} ${esc(it.name)} <em>×${n}</em></b><small>${it.ap} AP · ${esc(it.desc)}</small></button>`; }).join('')}</div>
      ${opts.status ? `<p class="lo-status">${opts.status()}</p>` : ''}
      <button class="btn primary lo-go" data-go ${saving ? 'disabled' : ''}>⚔️ Ready, fight now!</button>`;
    body.querySelectorAll('[data-j]').forEach((b) => (b.onclick = () => {
      const id = b.dataset.j;
      if (jutsu.includes(id)) jutsu = jutsu.filter((x) => x !== id);
      else if (jutsu.length >= slots) return toast(`You can bring ${slots} jutsu. Remove one first.`);
      else jutsu.push(id);
      render();
    }));
    body.querySelectorAll('[data-it]').forEach((b) => (b.onclick = () => {
      const id = b.dataset.it;
      if (items.includes(id)) items = items.filter((x) => x !== id);
      else if (items.length >= G.ITEM_SLOTS) return toast(`You can pack ${G.ITEM_SLOTS} kinds of item.`);
      else items.push(id);
      render();
    }));
    body.querySelector('[data-go]').onclick = finish;
  }
  const tick = setInterval(() => {
    if (!el.isConnected) { clearInterval(tick); return; }
    if (Date.now() >= deadline) return finish();
    const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)), t = body.querySelector('.lo-timer');
    if (t) { t.querySelector('i').style.width = (left / 60) * 100 + '%'; t.querySelector('span').textContent = `⏱ ${left}s`; }
    const s = body.querySelector('.lo-status'); if (s && opts.status) s.innerHTML = opts.status();
  }, 500);
  render();
  return { close: () => { done = true; clearInterval(tick); el.remove(); }, finish };
}
