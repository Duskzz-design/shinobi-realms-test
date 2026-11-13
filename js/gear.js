// Equipment: what your ninja wears. A paper doll with a weapon and four armour slots.
import * as net from './net.js?v=9d1c820';
import { gearIconHTML, emptySlotHTML } from './itemicons.js?v=9d1c820';
import * as G from './engine.js?v=9d1c820';
import { ninjaSprite, lookOf, drawNinjaFit } from './sprites.js?v=9d1c820';
import { SLOT_LABEL, gearLine } from './shop.js?v=9d1c820';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
function toast(msg, kind = 'err') { const t = h(`<div class="toast ${kind}">${esc(msg)}</div>`); document.body.appendChild(t); setTimeout(() => t.remove(), 3000); }

export function openGear(root, char, { onChange, openShop } = {}) {
  const el = h(`<div class="ov board-wrap"><div class="scroll board gear"><h3>${gearIconHTML('genin_head', 22)} Equipment</h3><div class="ge-body"></div><button class="btn ghost" data-x>Close</button></div></div>`);
  root.appendChild(el);
  const close = () => el.remove();
  el.querySelector('[data-x]').onclick = close;
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
  const body = el.querySelector('.ge-body');
  let pick = null, busy = false;
  const ri = () => Math.max(0, G.RANKS.indexOf(char.rank));
  async function equip(slot, id) {
    if (busy) return; busy = true;
    try { Object.assign(char, await net.equipGear(slot, id), { _loadedAt: Date.now() }); onChange && onChange(); pick = null; } catch (e) { toast(e.message); }
    busy = false; render();
  }
  function render() {
    const eq = char.gear || {}, st = G.gearStats(char), owned = char.owned_gear || [];
    const slot = (s) => { const g = G.GEAR[eq[s]];
      return `<button class="ge-slot s-${s} ${pick === s ? 'sel' : ''} ${g ? 'full' : ''}" data-s="${s}"><small>${SLOT_LABEL[s]}</small>${g ? `<span class="ic">${gearIconHTML(eq[s], 36, g.icon)}</span><b>${esc(g.name)}</b>` : `<span class="ic empty">${emptySlotHTML(s)}</span><b>Empty</b>`}</button>`; };
    const choices = pick ? [...new Set(owned)].filter((id) => G.GEAR[id] && G.GEAR[id].slot === pick) : [];
    body.innerHTML = `<div class="ge-doll">${slot('head')}<div class="ge-mid">${slot('weapon')}<canvas width="72" height="90"></canvas>${slot('arms')}</div>${slot('chest')}${slot('legs')}</div>
      <div class="ge-stats"><span>🛡️ Defence <b>+${st.def}</b></span><span>❤️ Health <b>+${Math.round(st.hp * 100)}%</b></span>${st.dodge ? `<span>💨 Dodge <b>+${Math.round(st.dodge * 100)}%</b></span>` : ''}<span>⚔️ Weapon jutsu <b>+${Math.round(st.boost * 100)}%</b></span>${st.slash ? `<span>🗡️ Sword Slash <b>${st.slash}</b></span>` : ''}
        ${st.fullSet ? `<span class="set">✨ Full ${esc(G.GEAR_SETS[st.fullSet].name)}</span>` : ''}${st.poisonImmune ? '<span>🐉 Poison immune</span>' : ''}${st.stunResist ? '<span>⛑️ Stun resist</span>' : ''}${st.lightningResist ? '<span>⚡ Lightning resist</span>' : ''}</div>
      ${pick ? `<h4>${SLOT_LABEL[pick]}: choose</h4><div class="sh-list">${choices.length ? choices.map((id) => { const g = G.GEAR[id], ok = G.canWear(id, ri(), char.anbu_squad), on = eq[pick] === id;
          return `<div class="sh-it ${on ? 'worn' : ''}"><span class="ic">${gearIconHTML(id, 36, g.icon)}</span><span class="nm"><b>${esc(g.name)}${owned.filter((x) => x === id).length > 1 ? ` ×${owned.filter((x) => x === id).length}` : ''}</b><small>${esc(gearLine(g))}</small></span><span class="buy">${on ? `<button class="btn small ghost" data-off="${pick}">Take off</button>` : ok ? `<button class="btn small primary" data-on="${id}">Equip</button>` : `<small>🔒 ${g.tier === 'anbu' ? 'ANBU only' : 'Chunin+'}</small>`}</span></div>`; }).join('')
        : `<p class="sub">You don't own anything for this slot yet.</p>`}</div>` : '<p class="sub">Tap a slot to change what you wear.</p>'}
      <button class="btn primary ge-shop" data-shop>🏪 Visit the Tool Shop</button>`;
    drawNinjaFit(body.querySelector('canvas'), lookOf(char.appearance, char.gear));
    body.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => { pick = pick === b.dataset.s ? null : b.dataset.s; render(); }));
    body.querySelectorAll('[data-on]').forEach((b) => (b.onclick = () => equip(pick, b.dataset.on)));
    body.querySelectorAll('[data-off]').forEach((b) => (b.onclick = () => equip(b.dataset.off, null)));
    body.querySelector('[data-shop]').onclick = () => { close(); openShop && openShop(); };
  }
  render();
  return { close };
}
