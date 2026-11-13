// Arena: daily and monthly leaderboards per rank, and the energy bonus they unlock.
import * as net from './net.js?v=9d1c820';
import { ninjaSprite, VILLAGES, drawNinjaFit } from './sprites.js?v=9d1c820';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const RANKS = ['Genin', 'Chunin', 'Jonin'];
export const BONUS = [[1, 1, '×1.5', 300], [2, 3, '×1.25', 200], [4, 10, '×1.1', 100]];
export const bonusFor = (place) => (place == null ? null : (BONUS.find(([a, b]) => place >= a && place <= b) || [])[2] || null);
const medal = (p) => (p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : p);
const left = (iso) => { const s = Math.max(0, (new Date(iso) - Date.now()) / 1000); const d = Math.floor(s / 86400), hh = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return d ? `${d}d ${hh}h` : hh ? `${hh}h ${m}m` : `${m}m`; };

export function openArena(root, char) {
  const el = h(`<div class="ov board-wrap"><div class="scroll board arena"><h3>🏟️ Arena</h3><div class="ar-body"></div><button class="btn ghost" data-x>Close</button></div></div>`);
  root.appendChild(el);
  const close = () => el.remove();
  el.querySelector('[data-x]').onclick = close;
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
  let period = 'day', rank = RANKS.includes(char.rank) ? char.rank : 'Genin', data = null, loading = false;
  const body = el.querySelector('.ar-body');

  function bonusBox() {
    const b = char.arena_bonus;
    const mine = b ? `<div class="ar-mybonus">⚡ <b>Your energy refills ${b.mult}× faster</b> today: you placed #${b.place} yesterday!</div>` : '';
    const acad = char.rank === 'Academy Student' ? `<div class="ar-mybonus acad">🎓 <b>Academy students can't enter the Arena.</b> Practise in the sparring lessons at the Academy, then pass the Genin exam to compete.</div>` : '';
    return `${acad}${mine}<div class="ar-bonus"><b>Daily rewards:</b> finish in your rank's <b>top 10</b> today to win ryo and faster energy all day tomorrow.
      <div class="ar-tiers">${BONUS.map(([a, b2, m, ryo]) => `<span>${a === b2 ? `#${a}` : `#${a}–${b2}`} <b>${m} ⚡ · ${ryo} 💰</b></span>`).join('')}</div>
      <small>Ryo shown for Genin; Chunin win double, Jonin four times as much. Ranked by Arena points won in duels today (losses count against you). Resets at midnight, UK time.</small></div>`;
  }
  async function load() {
    loading = true; render();
    try { data = await net.arenaBoard(period, rank); } catch (e) { data = { error: e.message }; }
    loading = false; render();
  }
  function rowHtml(r) {
    const v = VILLAGES[r.village] || {}, bz = period !== 'month' && r.place <= 10;
    return `<div class="ar-row ${r.me ? "me" : ""} ${bz ? "bz" : ""} ${r.place <= 3 ? "top" : ""}"><span class="pl">${medal(r.place)}</span><canvas width="24" height="30" data-look='${esc(JSON.stringify(r.look || {}))}'></canvas>
      <span class="nm"><b>${esc(r.name)}</b><small style="color:${v.dark || '#555'}">${esc(v.name || '')} · Lv ${r.level}</small></span>
      <span class="arp">${r.points}</span>${bz ? `<span class="bt">${period === 'yesterday' ? '⚡' : ''}${bonusFor(r.place)}</span>` : ''}</div>`;
  }
  function render() {
    const tabs = [['day', 'Today'], ['month', 'This month'], ['yesterday', "Yesterday's top 10"]];
    let list;
    if (loading || !data) list = '<div class="spinner"></div>';
    else if (data.error) list = `<p class="sub">${esc(data.error)}</p>`;
    else if (!data.rows.length) list = `<p class="sub ar-empty">No ${rank} has won an Arena duel ${period === 'day' ? 'today' : period === 'month' ? 'this month' : 'yesterday'} yet.${period === 'day' ? ' Be the first!' : ''}</p>`;
    else list = data.rows.map((r, i) => (period === 'day' && i === 10 ? '<div class="ar-cut">Bonus line: top 10 get faster energy tomorrow</div>' : '') + rowHtml(r)).join('');
    const me = data && data.me ? `<p class="ar-me">You: <b>#${data.me.place}</b> with <b>${data.me.points}</b> points${period === 'day' && bonusFor(data.me.place) ? ` · on track for ${bonusFor(data.me.place)} energy tomorrow!` : ''}</p>` : '';
    const ends = data && data.ends_at && period !== 'yesterday' ? `<p class="sub">${period === 'day' ? 'Day' : 'Month'} ends in <b>${left(data.ends_at)}</b></p>` : period === 'yesterday' ? '<p class="sub">These ninja have faster energy today.</p>' : '';
    body.innerHTML = `${bonusBox()}
      <div class="ttabs">${tabs.map(([k, l]) => `<button data-p="${k}" class="${k === period ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="ar-ranks">${RANKS.map((r) => `<button data-r="${r}" class="${r === rank ? 'on' : ''}">${r}</button>`).join('')}</div>
      ${ends}${me}<div class="ar-list">${list}</div>
      <p class="sub ar-how">⚔️ To duel, tap another Genin or higher in the village and choose <b>Challenge</b>.</p>`;
    body.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { period = b.dataset.p; load(); }));
    body.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => { rank = b.dataset.r; load(); }));
    body.querySelectorAll('canvas[data-look]').forEach((cv) => { const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; try { drawNinjaFit(cv, JSON.parse(cv.dataset.look)); } catch {} });
  }
  load();
}

// stone statue of a champion (or an empty pedestal)
const cache = new Map();
export function statueSprite(look) {
  const k = JSON.stringify(look || null);
  if (cache.has(k)) return cache.get(k);
  const W = 26, H = 44, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  // pedestal
  c.fillStyle = '#5a5248'; c.fillRect(2, 32, 22, 12); c.fillStyle = '#8a8276'; c.fillRect(3, 32, 20, 9); c.fillStyle = '#a8a092'; c.fillRect(3, 32, 20, 2);
  c.fillStyle = '#d8b84a'; c.fillRect(9, 36, 8, 3);
  if (look) {
    const n = ninjaSprite(look, 0, 0), t = document.createElement('canvas'); t.width = n.width; t.height = n.height;
    const tc = t.getContext('2d'); tc.drawImage(n, 0, 0);
    const img = tc.getImageData(0, 0, t.width, t.height), d = img.data;
    for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; const l = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255; const v = l < 0.2 ? 0.35 : 0.55 + l * 0.45; d[i] = 150 * v + 40; d[i + 1] = 144 * v + 38; d[i + 2] = 132 * v + 34; }
    tc.putImageData(img, 0, 0); c.drawImage(t, Math.round((W - t.width) / 2), 32 - t.height + 1);
  } else { c.fillStyle = '#6a6258'; c.font = 'bold 12px monospace'; c.textAlign = 'center'; c.fillText('?', W / 2, 28); }
  cache.set(k, cv); return cv;
}
