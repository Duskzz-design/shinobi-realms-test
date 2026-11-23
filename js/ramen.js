// Health that lasts between fights (v0.15.0) and the Ramen Shop.
// Health is a share of your maximum (char.hp_frac from the server) that refills fully in 15 minutes.
import * as net from './net.js?v=be33998';
import { poolsOf, gearStats } from './engine.js?v=be33998';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
function toast(msg, kind = 'err') { const t = h(`<div class="toast ${kind}">${esc(msg)}</div>`); document.body.appendChild(t); setTimeout(() => t.remove(), 3000); }
const n = (x) => Number(x || 0).toLocaleString('en-GB');
export const FULL_SECS = 900;

// health share now (0 to 1), counted from when the character was last loaded, so device clocks don't matter
export function hpFrac(char) {
  if (!char) return 1;
  const f = char.hp_frac == null ? 1 : Number(char.hp_frac);
  return Math.min(1, f + (Date.now() - (char._loadedAt || Date.now())) / 1000 / FULL_SECS);
}
// maximum health in battle (gear bonus included), and health now
export function hpMax(char) { try { return Math.round(poolsOf(char).pmax * (1 + gearStats(char).hp)); } catch { return 100; } }
export function hpNow(char) { return Math.max(0, Math.round(hpMax(char) * hpFrac(char))); }
// seconds until full
export function hpFullIn(char) { return Math.ceil((1 - hpFrac(char)) * FULL_SECS); }
export const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// the same menu as the server (used if an older server reply has no menu)
function menu(char) {
  if (Array.isArray(char.ramen)) return char.ramen;
  const base = 20 + 8 * char.level;
  return [{ id: 'small', name: 'Small Ramen', heal: 25, price: Math.max(5, Math.round(base * 0.35)) },
    { id: 'large', name: 'Large Ramen', heal: 50, price: Math.max(8, Math.round(base * 0.6)) },
    { id: 'deluxe', name: 'Deluxe Ramen', heal: 100, price: Math.max(12, base) }];
}
const BOWL = { small: '🍜', large: '🍜', deluxe: '🍥' };
const BLURB = { small: 'A quick bowl between missions.', large: 'Extra noodles and an egg.', deluxe: 'Everything on top. Back to full health.' };

// a health bar: <div class="hpbar"><i style="width:..%"></i><span>87 / 115</span></div>
export function hpBarHTML(char, cls = '') {
  const f = hpFrac(char), pct = Math.round(f * 100);
  return `<div class="hpbar ${cls} ${f < 0.3 ? 'low' : ''}" title="Health refills fully in 15 minutes"><i style="width:${pct}%"></i><span>❤ ${n(hpNow(char))} / ${n(hpMax(char))}</span></div>`;
}

export function openRamen(root, char, onChange) {
  const el = h(`<div class="ov board-wrap"><div class="scroll board shop ramen"><h3>🍜 Ramen Shop</h3><div class="sh-body"></div><button class="btn ghost" data-x>Close</button></div></div>`);
  root.appendChild(el);
  let timer = null, busy = false;
  const close = () => { clearInterval(timer); el.remove(); };
  el.querySelector('[data-x]').onclick = close;
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
  const body = el.querySelector('.sh-body');
  function render() {
    const full = hpFrac(char) >= 0.999, left = hpFullIn(char);
    body.innerHTML = `<p class="sub">Your health carries over from fight to fight and refills on its own, fully in 15 minutes. A hot bowl gets you back out faster.</p>
      ${hpBarHTML(char, 'big')}
      <p class="rm-timer">${full ? '💚 Full health' : `Full again in <b>${mmss(left)}</b>`}</p>
      <div class="sh-ryo">💰 ${n(char.ryo)} ryo</div>
      <div class="rm-list">${menu(char).map((b) => `<div class="rm-bowl">
        <div class="rm-ic">${BOWL[b.id] || '🍜'}</div>
        <div class="rm-txt"><b>${esc(b.name)}</b><small>${b.heal >= 100 ? 'Heals to full' : `Heals ${b.heal}% of your health`} · ${esc(BLURB[b.id] || '')}</small></div>
        <button class="btn small primary" data-eat="${esc(b.id)}" ${busy || full || char.ryo < b.price ? 'disabled' : ''}>${n(b.price)} ryo</button>
      </div>`).join('')}</div>
      ${full ? '<p class="sub">You\'re at full health. Come back after a fight!</p>' : ''}`;
    body.querySelectorAll('[data-eat]').forEach((btn) => btn.onclick = async () => {
      busy = true; render();
      try { const me = await net.buyRamen(btn.dataset.eat); Object.assign(char, me, { _loadedAt: Date.now() }); toast(`${me.ate ? me.ate.name : 'Ramen'}: delicious! Health restored.`, 'ok'); onChange && onChange(); }
      catch (e) { toast(e.message); }
      busy = false; render();
    });
  }
  render();
  timer = setInterval(() => { if (!busy) render(); }, 1000);
  return { close };
}
