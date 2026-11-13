// Library: counter scrolls (Substitution, Chakra Release, Dispel). Genin and above. Always ready in battle, no loadout slot.
import * as net from './net.js?v=9d1c820';
import * as G from './engine.js?v=9d1c820';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
function toast(msg, kind = 'err') { const t = h(`<div class="toast ${kind}">${esc(msg)}</div>`); document.body.appendChild(t); setTimeout(() => t.remove(), 3000); }
const n = (x) => Number(x || 0).toLocaleString('en-GB');
const ICON = { substitution: '🪵', release: '✨', dispel: '🚫' };

export function openLibrary(root, char, onChange) {
  const el = h(`<div class="ov board-wrap"><div class="scroll board shop"><h3>📚 Library</h3><div class="sh-body"></div><button class="btn ghost" data-x>Close</button></div></div>`);
  root.appendChild(el);
  const close = () => el.remove();
  el.querySelector('[data-x]').onclick = close;
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
  const body = el.querySelector('.sh-body');
  let busy = false;
  const owns = (id) => (char.scrolls || []).includes(id);
  const genin = () => G.RANKS.indexOf(char.rank) >= 1;
  function render() {
    body.innerHTML = `<div class="sh-ryo">💰 ${n(char.ryo)} ryo</div>
      <p class="lib-note">📜 <b>Counter scrolls</b> are always ready in every fight. They <b>don't use a loadout slot</b>, but each has a cooldown. ${genin() ? '' : '<br>🔒 The librarian only sells to Genin and above.'}</p>
      <div class="sh-list">${G.COUNTERS.map((id) => { const m = G.MOVES[id], have = owns(id);
        return `<div class="sh-it ${have ? 'worn' : !genin() ? 'lock' : ''}"><span class="ic">${ICON[id]}</span><span class="nm"><b>${esc(m.name)}</b><small>${esc(m.desc)}</small>
          <small>${m.ap} AP · 💧${m.chakra} chakra · ${m.target === 'self' ? 'Self' : `Range ${m.range[0]}-${m.range[1]}`} · ⏳ ${G.cooldownOf(id)}-turn cooldown</small></span>
          <span class="buy">${have ? '<b>✅ Learned</b>' : `<button class="btn small primary" data-b="${id}" ${busy || !genin() || char.ryo < m.price ? 'disabled' : ''}>Buy · ${n(m.price)} ryo</button>`}</span></div>`; }).join('')}</div>`;
    body.querySelectorAll('[data-b]').forEach((b) => (b.onclick = async () => {
      busy = true; render();
      try { const me = await net.buyScroll(b.dataset.b); Object.assign(char, me, { _loadedAt: Date.now() }); toast(`You learned ${G.MOVES[b.dataset.b].name}!`, 'ok'); onChange && onChange(); } catch (e) { toast(e.message); }
      busy = false; render();
    }));
  }
  render();
  return { close };
}
