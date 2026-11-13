// Tool Shop: consumable items, weapons and armour (Basic for everyone, Advanced from Chunin), plus the ANBU counter.
import * as net from './net.js?v=9d1c820';
import { itemIconHTML } from './itemicons.js?v=9d1c820';
import { gearIconHTML } from './itemicons.js?v=9d1c820';
import * as G from './engine.js?v=9d1c820';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
function toast(msg, kind = 'err') { const t = h(`<div class="toast ${kind}">${esc(msg)}</div>`); document.body.appendChild(t); setTimeout(() => t.remove(), 3000); }
const n = (x) => Number(x || 0).toLocaleString('en-GB');
const RANKS = G.RANKS;
export const SLOT_LABEL = { weapon: 'Weapon', head: 'Head', chest: 'Chest', arms: 'Arms', legs: 'Legs' };
export function gearLine(g) {
  if (g.slot === 'weapon') return `+${Math.round(g.boost * 100)}% weapon jutsu · Sword Slash ${g.slash}${g.note ? ' · ' + g.note : ''}`;
  return `+${g.def} defence${g.set ? ` · part of the ${G.GEAR_SETS[g.set].name}` : ''}${g.note ? ' · ' + g.note : ''}`;
}

export function openShop(root, char, onChange, startTab = 'items') {
  const el = h(`<div class="ov board-wrap"><div class="scroll board shop"><h3>🏪 Tool Shop</h3><div class="sh-body"></div><button class="btn ghost" data-x>Close</button></div></div>`);
  root.appendChild(el);
  const close = () => el.remove();
  el.querySelector('[data-x]').onclick = close;
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
  const body = el.querySelector('.sh-body');
  let busy = false, tab = startTab;
  const ri = () => Math.max(0, RANKS.indexOf(char.rank)), anbu = () => !!char.anbu_squad;
  const owns = (id) => (char.owned_gear || []).includes(id), worn = (id) => Object.values(char.gear || {}).includes(id);

  async function run(fn, ok) {
    busy = true; render();
    try { const me = await fn(); Object.assign(char, me, { _loadedAt: Date.now() }); ok && toast(ok, 'ok'); onChange && onChange(); } catch (e) { toast(e.message); }
    busy = false; render();
  }
  function itemsTab() {
    const owned = char.items || {};
    return `<p class="sub">Pack up to <b>${G.ITEM_SLOTS}</b> kinds before each fight. Carry up to ${G.ITEM_STACK} of each.</p>
      <div class="sh-list">${Object.entries(G.ITEMS).map(([id, it]) => { const have = owned[id] || 0, full = have >= G.ITEM_STACK, lock = (it.rank || 0) > ri();
        return `<div class="sh-it ${lock ? 'lock' : ''}"><span class="ic">${itemIconHTML(id, 36, it.icon)}</span><span class="nm"><b>${esc(it.name)}${it.rank ? ' <em class="tag adv">Advanced</em>' : it.power ? ' <em class="tag">Basic</em>' : ''}</b><small>${esc(it.desc)} · ${it.ap} AP</small><small>You have <b>${have}</b>/${G.ITEM_STACK}</small></span>
          <span class="buy">${lock ? `<small>🔒 ${RANKS[it.rank]} and above</small>` : `<button class="btn small primary" data-b="${id}" data-q="1" ${full || char.ryo < it.price || busy ? 'disabled' : ''}>Buy ${it.price} 💰</button>
          <button class="btn small ghost" data-b="${id}" data-q="5" ${G.ITEM_STACK - have < 5 || char.ryo < it.price * 5 || busy ? 'disabled' : ''}>×5 · ${it.price * 5}</button>`}</span></div>`; }).join('')}</div>`;
  }
  function gearRow(id) {
    const g = G.GEAR[id], have = owns(id), on = worn(id), lock = g.tier === 'adv' ? ri() < 2 : g.tier === 'anbu' ? !anbu() : false;
    let act;
    if (have) act = on ? `<button class="btn small ghost" data-uneq="${g.slot}">Take off</button>` : G.canWear(id, ri(), anbu()) ? `<button class="btn small primary" data-eq="${id}">Equip</button>` : '<small>🔒 Can\'t wear yet</small>';
    else if (lock) act = `<small>🔒 ${g.tier === 'anbu' ? 'ANBU only' : 'Chunin and above'}</small>`;
    else act = `<button class="btn small primary" data-g="${id}" ${char.ryo < g.price || busy ? 'disabled' : ''}>Buy ${n(g.price)} 💰</button>`;
    const tag = g.tier === 'adv' ? '<em class="tag adv">Advanced</em>' : g.tier === 'anbu' ? '<em class="tag anbu">ANBU</em>' : '<em class="tag">Basic</em>';
    return `<div class="sh-it ${lock && !have ? 'lock' : ''} ${on ? 'worn' : ''}"><span class="ic">${gearIconHTML(id, 36, g.icon)}</span><span class="nm"><b>${esc(g.name)} ${tag}${on ? ' <em class="tag on">Equipped</em>' : have ? ' <em class="tag own">Owned</em>' : ''}</b><small>${SLOT_LABEL[g.slot]} · ${esc(gearLine(g))}</small></span><span class="buy">${act}</span></div>`;
  }
  const sold = (pred) => Object.keys(G.GEAR).filter((id) => G.GEAR[id].tier !== 'boss' && pred(G.GEAR[id]));
  function weaponsTab() {
    return `<p class="sub">A sword makes every weapon technique hit harder and adds <b>Sword Slash</b> (2 AP, range 1) to your fights. Bought once, kept forever.</p>
      <div class="sh-list">${sold((g) => g.slot === 'weapon' && g.tier !== 'anbu').map(gearRow).join('')}</div>`;
  }
  function armourTab() {
    const set = (k) => sold((g) => g.set === k).map(gearRow).join('');
    return `<p class="sub">Four pieces: head, chest, arms and legs. Each adds defence; wear all four of a set for bonus health.</p>
      <h4>Genin Uniform <small>· Basic · full set +5% health</small></h4><div class="sh-list">${set('genin')}</div>
      <h4>Flak Uniform <small>· Advanced (Chunin+) · full set +8% health</small></h4><div class="sh-list">${set('flak')}</div>`;
  }
  function anbuTab() {
    if (!anbu()) return `<div class="sh-anbu-lock"><div class="ic">🎭</div><h4>ANBU counter</h4><p>Only members of an ANBU squad may buy here. Ask your Kage about the ANBU in the Kage Tower.</p></div>`;
    return `<p class="sub">Equipment for the village's elite. It comes off automatically if you leave the ANBU.</p>
      <h4>ANBU Uniform <small>· full set +10% health, +5% dodge</small></h4><div class="sh-list">${sold((g) => g.tier === 'anbu').map(gearRow).join('')}</div>`;
  }
  function render() {
    const tabs = [['items', `${itemIconHTML('pill_heal', 18)} Items`], ['weapons', `${gearIconHTML('katana', 18)} Weapons`], ['armour', `${gearIconHTML('flak_chest', 18)} Armour`], ['anbu', '🎭 ANBU']];
    body.innerHTML = `<div class="sh-ryo">💰 <b>${n(char.ryo)}</b> ryo</div>
      <div class="ttabs">${tabs.map(([k, l]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div>
      ${tab === 'items' ? itemsTab() : tab === 'weapons' ? weaponsTab() : tab === 'armour' ? armourTab() : anbuTab()}`;
    body.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { tab = b.dataset.t; render(); }));
    body.querySelectorAll('[data-b]').forEach((b) => (b.onclick = () => run(() => net.buyItem(b.dataset.b, +b.dataset.q), `Bought ${G.ITEMS[b.dataset.b].name}${+b.dataset.q > 1 ? ' ×' + b.dataset.q : ''}!`)));
    body.querySelectorAll('[data-g]').forEach((b) => (b.onclick = () => { const g = G.GEAR[b.dataset.g]; run(async () => { await net.buyGear(b.dataset.g); return net.equipGear(g.slot, b.dataset.g); }, `Bought and equipped ${g.name}!`); }));
    body.querySelectorAll('[data-eq]').forEach((b) => (b.onclick = () => run(() => net.equipGear(G.GEAR[b.dataset.eq].slot, b.dataset.eq), 'Equipped!')));
    body.querySelectorAll('[data-uneq]').forEach((b) => (b.onclick = () => run(() => net.equipGear(b.dataset.uneq, null), 'Taken off.')));
  }
  render();
  return { close };
}
