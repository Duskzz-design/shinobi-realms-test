// Auction House: fixed-price listings between players. Boss gear and shop consumables only.
// 48-hour listings (unsold goods come back), 10% sales tax taken from the seller and removed from the game.
import * as net from './net.js?v=9d1c820';
import { gearIconHTML } from './itemicons.js?v=9d1c820';
import * as G from './engine.js?v=9d1c820';
import { gearLine } from './shop.js?v=9d1c820';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
function toast(msg, kind = 'err') { const t = h(`<div class="toast ${kind}">${esc(msg)}</div>`); document.body.appendChild(t); setTimeout(() => t.remove(), 3500); }
const n = (x) => Number(x || 0).toLocaleString('en-GB');
const TAX = 0.10;
const netLine = (price) => { const tax = Math.ceil(price * TAX); return `If it sells you get <b>${n(price - tax)} ryo</b> (10% sales tax: ${n(tax)}).`; };
const info = (l) => (l.kind === 'gear' ? G.GEAR[l.item_id] : G.ITEMS[l.item_id]) || { name: l.item_id, icon: '❔' };
const ico = (kind, id, it) => gearIconHTML(id, 36, it.icon);
function left(ts) {
  const ms = new Date(ts).getTime() - Date.now(); if (ms <= 0) return 'ending';
  const hrs = Math.floor(ms / 3600e3), m = Math.floor((ms % 3600e3) / 60e3);
  return hrs ? `${hrs}h ${m}m left` : `${m}m left`;
}

export function openMarket(root, char, onChange) {
  const el = h(`<div class="ov board-wrap"><div class="scroll board shop market"><h3>⚖️ Auction House</h3><div class="sh-body"><p class="sub">Loading the market…</p></div><button class="btn ghost" data-x>Close</button></div></div>`);
  root.appendChild(el);
  const close = () => el.remove();
  el.querySelector('[data-x]').onclick = close;
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
  const body = el.querySelector('.sh-body');
  let tab = 'browse', filter = 'all', data = { listings: [], mine: [], bought: [] }, busy = false, sell = null;
  const genin = () => G.RANKS.indexOf(char.rank) >= 1;

  async function load() {
    try { data = await net.marketBrowse(); } catch (e) { toast(e.message); }
    render();
  }
  async function run(fn, ok) {
    busy = true; render();
    try { const me = await fn(); Object.assign(char, me, { _loadedAt: Date.now() }); ok && toast(ok, 'ok'); onChange && onChange(); data = await net.marketBrowse(); } catch (e) { toast(e.message); }
    busy = false; render();
  }

  function browseTab() {
    const list = data.listings.filter((l) => filter === 'all' || l.kind === filter);
    const owns = (id) => (char.owned_gear || []).includes(id);
    return `<div class="mk-filter">${[['all', 'All'], ['gear', '⚔️ Boss gear'], ['item', '💊 Items']].map(([k, t]) => `<button class="chip ${k === filter ? 'on' : ''}" data-f="${k}">${t}</button>`).join('')}</div>
      ${list.length ? `<div class="sh-list">${list.map((l) => { const it = info(l), have = (char.items || {})[l.item_id] || 0;
        const why = char.ryo < l.price ? 'Not enough ryo' : l.kind === 'item' && have + l.qty > G.ITEM_STACK ? `Carry limit (${have}/${G.ITEM_STACK})` : l.kind === 'item' && (it.rank || 0) > G.RANKS.indexOf(char.rank) ? 'Chunin and above' : '';
        return `<div class="sh-it"><span class="ic">${ico(l.kind, l.item_id, it)}</span><span class="nm"><b>${esc(it.name)}${l.qty > 1 ? ` ×${l.qty}` : ''}${l.kind === 'gear' ? ' <em class="tag boss">Boss drop</em>' : ''}</b>
          <small>${l.kind === 'gear' ? esc(gearLine(it)) : esc(it.desc || '')}</small><small class="mk-meta">Seller: ${esc(l.seller_name)} · ${left(l.expires_at)}</small></span>
          <span class="buy"><button class="btn small primary" data-buy="${l.id}" ${busy || !genin() || why ? 'disabled' : ''}>Buy ${n(l.price)} 💰</button>${why ? `<small>${why}</small>` : ''}</span></div>`; }).join('')}</div>`
      : `<p class="mk-empty">Nothing for sale${filter === 'all' ? '' : ' in this section'} right now. Check back later, or list something of your own!</p>`}`;
  }

  function sellTab() {
    const worn = Object.values(char.gear || {});
    const ownedAll = char.owned_gear || [], cnt = (id) => ownedAll.filter((x) => x === id).length;
    const gear = [...new Set(ownedAll)].filter((id) => G.GEAR[id] && G.GEAR[id].tier === 'boss');
    const items = Object.entries(char.items || {}).filter(([id, q]) => G.ITEMS[id] && q > 0);
    const active = data.mine.filter((l) => l.status === 'active').length;
    if (sell) {
      const it = sell.kind === 'gear' ? G.GEAR[sell.id] : G.ITEMS[sell.id], max = sell.kind === 'gear' ? 1 : Math.min(10, (char.items || {})[sell.id] || 0);
      return `<div class="mk-sell"><div class="sh-it"><span class="ic">${ico(sell.kind, sell.id, it)}</span><span class="nm"><b>${esc(it.name)}</b><small>${sell.kind === 'gear' ? esc(gearLine(it)) : esc(it.desc)}</small></span></div>
        ${sell.kind === 'item' ? `<label>How many <input type="number" min="1" max="${max}" value="${sell.qty}" data-in="qty"> <small>of ${max}</small></label>` : ''}
        <label>Price for ${sell.kind === 'item' && sell.qty > 1 ? `all ${sell.qty}` : 'it'} <input type="number" min="1" max="10000000" value="${sell.price}" data-in="price"> 💰</label>
        ${sell.kind === 'item' ? `<small>Tool Shop price: ${n(it.price * sell.qty)} ryo</small>` : ''}
        <p class="mk-get"><span class="mk-net">${netLine(sell.price)}</span><br><small>Listings last 48 hours. Unsold goods come back to you.</small></p>
        <div class="row"><button class="btn primary" data-list ${busy ? 'disabled' : ''}>List for sale</button><button class="btn ghost" data-back>Back</button></div></div>`;
    }
    return `<p class="sub">Sell rare boss gear or spare items to other ninja. ${active}/10 listings in use.</p>
      ${!genin() ? '<p class="mk-empty">🔒 The Auction House is for Genin and above.</p>' : ''}
      <h4>Boss gear</h4>${gear.length ? `<div class="sh-list">${gear.map((id) => { const g = G.GEAR[id], on = worn.includes(id) && cnt(id) < 2;
        return `<div class="sh-it"><span class="ic">${gearIconHTML(id, 36, g.icon)}</span><span class="nm"><b>${esc(g.name)}${cnt(id) > 1 ? ` ×${cnt(id)}` : ''}</b><small>${esc(gearLine(g))}</small></span>
          <span class="buy">${on ? '<small>Equipped: take it off first</small>' : `<button class="btn small" data-sell="gear:${id}" ${busy || !genin() || active >= 10 ? 'disabled' : ''}>Sell…</button>`}</span></div>`; }).join('')}</div>` : '<p class="mk-empty">No boss drops yet. Beat bosses for a chance at rare gear.</p>'}
      <h4>Items</h4>${items.length ? `<div class="sh-list">${items.map(([id, q]) => { const it = G.ITEMS[id];
        return `<div class="sh-it"><span class="ic">${gearIconHTML(id, 36, it.icon)}</span><span class="nm"><b>${esc(it.name)} ×${q}</b><small>${esc(it.desc)}</small></span>
          <span class="buy"><button class="btn small" data-sell="item:${id}" ${busy || !genin() || active >= 10 ? 'disabled' : ''}>Sell…</button></span></div>`; }).join('')}</div>` : '<p class="mk-empty">No items to sell.</p>'}`;
  }

  function mineTab() {
    const row = (l, extra) => { const it = info(l); return `<div class="sh-it ${l.status !== 'active' ? 'lock' : ''}"><span class="ic">${ico(l.kind, l.item_id, it)}</span><span class="nm"><b>${esc(it.name)}${l.qty > 1 ? ` ×${l.qty}` : ''} · ${n(l.price)} 💰</b><small>${extra}</small></span>${l.status === 'active' && l.seller === char.user_id ? `<span class="buy"><button class="btn small ghost" data-cancel="${l.id}" ${busy ? 'disabled' : ''}>Cancel</button></span>` : ''}</div>`; };
    const mine = data.mine.map((l) => row(l, l.status === 'active' ? `On sale · ${left(l.expires_at)}` : l.status === 'sold' ? `✅ Sold to ${esc(l.buyer_name)} · you got ${n(l.price - (l.tax || 0))} ryo` : l.status === 'expired' ? '⌛ Expired · returned to you' : 'Cancelled · returned to you'));
    const bought = data.bought.map((l) => row(l, `🛍️ Bought from ${esc(l.seller_name)}`));
    return `<h4>My listings</h4>${mine.length ? `<div class="sh-list">${mine.join('')}</div>` : '<p class="mk-empty">You have nothing listed.</p>'}
      ${bought.length ? `<h4>Recent purchases</h4><div class="sh-list">${bought.join('')}</div>` : ''}`;
  }

  function render() {
    body.innerHTML = `<div class="sh-ryo">💰 ${n(char.ryo)} ryo</div>
      <div class="ttabs">${[['browse', 'Buy'], ['sell', 'Sell'], ['mine', 'My listings']].map(([k, l]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div>
      ${tab === 'browse' ? browseTab() : tab === 'sell' ? sellTab() : mineTab()}`;
    body.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { tab = b.dataset.t; sell = null; render(); }));
    body.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => { filter = b.dataset.f; render(); }));
    body.querySelectorAll('[data-buy]').forEach((b) => (b.onclick = () => { const l = data.listings.find((x) => x.id === b.dataset.buy); run(() => net.marketBuy(b.dataset.buy), `Bought ${info(l).name}${l.qty > 1 ? ' ×' + l.qty : ''}!`); }));
    body.querySelectorAll('[data-cancel]').forEach((b) => (b.onclick = () => run(() => net.marketCancel(b.dataset.cancel), 'Listing cancelled. Your goods are back.')));
    body.querySelectorAll('[data-sell]').forEach((b) => (b.onclick = () => {
      const [kind, id] = b.dataset.sell.split(':'), base = kind === 'item' ? G.ITEMS[id].price : 1000;
      sell = { kind, id, qty: 1, price: base }; render();
    }));
    const q = body.querySelector('[data-in=qty]'), p = body.querySelector('[data-in=price]');
    if (q) q.onchange = () => { sell.qty = Math.max(1, Math.min(+q.max, Math.floor(+q.value || 1))); render(); };
    if (p) p.oninput = () => { sell.price = Math.max(1, Math.min(10000000, Math.floor(+p.value || 1))); const g = body.querySelector('.mk-net'); if (g) g.innerHTML = netLine(sell.price); };
    const back = body.querySelector('[data-back]'); if (back) back.onclick = () => { sell = null; render(); };
    const go = body.querySelector('[data-list]');
    if (go) go.onclick = () => { const s = sell; sell = null; tab = 'mine'; run(() => net.marketList(s.kind, s.id, s.qty, s.price), 'Listed! It will sell to the first ninja who buys it.'); };
  }
  load();
  return { close };
}
