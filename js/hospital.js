// Hospital: ninja who lose a fight are injured for 15 minutes. Rest for free, or pay to be healed now.
import * as net from './net.js?v=9d1c820';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
function toast(msg, kind = 'err') { const t = h(`<div class="toast ${kind}">${esc(msg)}</div>`); document.body.appendChild(t); setTimeout(() => t.remove(), 3000); }
const n = (x) => Number(x || 0).toLocaleString('en-GB');

// seconds of injury left, measured from when the character was last loaded (so device clocks don't matter)
export function injuredLeft(char) {
  if (!char || !char.injured_secs) return 0;
  return Math.max(0, Math.ceil(char.injured_secs - (Date.now() - (char._loadedAt || Date.now())) / 1000));
}
export const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
// the heal price falls as the injury wears off (same formula as the server)
export function healCost(char) {
  const left = injuredLeft(char); if (!left) return 0;
  return Math.max(5, Math.ceil((20 + char.level * 8) * left / 900));
}

export function openHospital(root, char, onChange) {
  const el = h(`<div class="ov board-wrap"><div class="scroll board shop hospital"><h3>🏥 Hospital</h3><div class="sh-body"></div><button class="btn ghost" data-x>Close</button></div></div>`);
  root.appendChild(el);
  let timer = null, busy = false;
  const close = () => { clearInterval(timer); el.remove(); };
  el.querySelector('[data-x]').onclick = close;
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
  const body = el.querySelector('.sh-body');
  function render() {
    const left = injuredLeft(char), cost = healCost(char);
    body.innerHTML = left
      ? `<div class="hp-card hurt"><div class="hp-ic">🤕</div><b>You are injured</b><p>You're resting in the Hospital. You can't train, take missions, quests, exams, boss fights or duels until you heal. Chat and the shops still work.</p>
          <div class="hp-timer">Healed naturally in <b>${mmss(left)}</b></div></div>
          <div class="sh-ryo">💰 ${n(char.ryo)} ryo</div>
          <button class="btn primary hp-heal" data-heal ${busy || char.ryo < cost ? 'disabled' : ''}>Heal now · ${n(cost)} ryo</button>
          <p class="sub">${char.ryo < cost ? 'Not enough ryo: rest instead, the timer keeps running.' : 'The price drops as you recover.'}</p>`
      : `<div class="hp-card"><div class="hp-ic">💚</div><b>You are in good health</b><p>Losing a mission, quest, duel, war fight or boss fight leaves you injured for 15 minutes. Rest it off for free, or come here to be healed straight away for a fee.</p></div>`;
    const b = body.querySelector('[data-heal]');
    if (b) b.onclick = async () => {
      busy = true; render();
      try { const me = await net.hospitalHeal(); Object.assign(char, me, { _loadedAt: Date.now() }); toast(`Healed for ${n(me.healed)} ryo. Back to action!`, 'ok'); onChange && onChange(); }
      catch (e) { toast(e.message); }
      busy = false; render();
    };
  }
  render();
  timer = setInterval(() => { if (!busy) render(); }, 1000);
  return { close };
}
