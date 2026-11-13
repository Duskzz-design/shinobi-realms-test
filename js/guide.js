// First-session guide: a gentle "Next step" card + an arrow over the building to visit.
// Steps are worked out from the character itself, so the guide never gets out of sync.
// Players can minimise it at any time; it disappears for good once they become Genin.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

const STEPS = [
  { id: 'train', icon: '⭐', title: 'Train your ninja', btn: 'trainBtn',
    text: 'Tap the glowing <b>⭐ Train</b> button. Training spends <b>energy</b> to raise your stats and gives lots of <b>XP</b>. Energy refills over time, so come back every 15 minutes or so to train again.',
    done: (c, f) => f.trained },
  { id: 'lesson1', icon: '🥋', title: 'Visit the Academy', spot: 'academy',
    text: 'Walk to the <b>Academy</b> and win <b>Sparring Lesson 1</b>. Lessons teach you how battles work, and you can\'t lose ryo there.',
    done: (c, f) => (c.lessons_done || []).length >= 1 },
  { id: 'mission', icon: '📜', title: 'Take a mission', spot: 'missions',
    text: 'Go to the <b>Mission Hall</b> and win a D-rank mission. Missions pay <b>ryo</b> and XP. Full rewards for your first <b>20 missions each day</b>.',
    done: (c, f) => f.mission || (c.mission_wins || 0) > 0 },
  { id: 'lessons', icon: '🥋', title: 'Finish all 5 lessons', spot: 'academy',
    text: (c) => `You've cleared <b>${Math.min(5, (c.lessons_done || []).length)}/5</b> sparring lessons. New lessons unlock as you level up, so keep training and doing missions.`,
    done: (c, f) => (c.lessons_done || []).length >= 5 },
  { id: 'exam', icon: '🎓', title: 'Become a Genin', spot: 'academy',
    text: (c) => c.level >= 5 ? 'You\'re level 5! Take the <b>Genin Exam</b> at the Academy. Pass it to unlock duels, the Arena and new jutsu.' : `Reach <b>level 5</b> (you're level ${c.level}), then take the <b>Genin Exam</b> at the Academy.`,
    done: (c, f) => c.rank && c.rank !== 'Academy Student' },
];

export function setupGuide(root, char, { goToSpot, openHandbook }) {
  const key = 'sr_guide_' + (char.user_id || char.name);
  let f = {};
  try { f = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch {}
  const save = () => { try { localStorage.setItem(key, JSON.stringify(f)); } catch {} };
  // veterans who were already Genin before the guide existed never see it
  if (!f.seen && char.rank && char.rank !== 'Academy Student') { f.finished = true; save(); }

  const card = h(`<div class="guide" hidden></div>`);
  root.appendChild(card);
  let cur = null, lastHtml = '';

  function current() {
    if (f.finished) return null;
    const i = STEPS.findIndex((s) => !s.done(char, f));
    return i < 0 ? { final: true } : { ...STEPS[i], n: i + 1 };
  }
  function render() {
    cur = current();
    root.querySelectorAll('.guide-glow').forEach((b) => b.classList.remove('guide-glow'));
    if (!cur) { card.hidden = true; return; }
    f.seen = true;
    if (cur.btn && !f.min) root.querySelector('#' + cur.btn)?.classList.add('guide-glow');
    let html;
    if (f.min) html = `<button class="guide-chip" data-open>🧭 Next step${cur.final ? '' : ` ${cur.n}/${STEPS.length}`}</button>`;
    else if (cur.final) html = `<div class="g-head"><span>🎉 Academy complete!</span></div>
      <p>You're a <b>Genin</b> now. Duels, the Arena, bosses and quests are open to you. Need a reminder of how something works? Tap <b>📖</b> for the Ninja Handbook.</p>
      <div class="g-btns"><button class="btn small primary" data-end>Got it</button></div>`;
    else html = `<div class="g-head"><span>🧭 Next step ${cur.n}/${STEPS.length}</span><button class="g-min" data-min aria-label="Hide guide">–</button></div>
      <b class="g-title">${cur.icon} ${esc(cur.title)}</b>
      <p>${typeof cur.text === 'function' ? cur.text(char) : cur.text}</p>
      <div class="g-btns">${cur.spot ? '<button class="btn small primary" data-go>Show me the way</button>' : ''}<button class="btn small ghost" data-help>📖 Handbook</button></div>`;
    card.hidden = false; card.classList.toggle('min', !!f.min);
    if (html !== lastHtml) {
      card.innerHTML = html; lastHtml = html;
      card.querySelector('[data-min]')?.addEventListener('click', () => { f.min = true; save(); render(); });
      card.querySelector('[data-open]')?.addEventListener('click', () => { f.min = false; save(); render(); });
      card.querySelector('[data-go]')?.addEventListener('click', () => goToSpot(cur.spot));
      card.querySelector('[data-help]')?.addEventListener('click', () => openHandbook());
      card.querySelector('[data-end]')?.addEventListener('click', () => { f.finished = true; save(); render(); });
    }
    save();
  }
  render();
  return {
    update: render,
    mark(flag) { if (!f[flag]) { f[flag] = true; save(); } render(); },
    // the building the arrow should point at (null = no arrow)
    target() { return cur && !cur.final && !f.min ? cur.spot || null : null; },
  };
}
