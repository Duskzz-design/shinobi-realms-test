// Mission board, turn-based battle screen, and training (stat points) panel.
import * as net from './net.js?v=9d1c820';
import { injuredLeft, mmss } from './hospital.js?v=9d1c820';
import { VILLAGES } from './sprites.js?v=9d1c820';
import * as G from './engine.js?v=9d1c820';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const STATS = {
  strength: { label: 'Strength', short: 'STR', icon: '💪', color: '#d84a3a', blurb: 'Taijutsu power, Bukijutsu bonus. More health, stamina and defence.' },
  agility: { label: 'Agility', short: 'AGI', icon: '💨', color: '#3a8a4a', blurb: 'Bukijutsu power, Taijutsu bonus. More stamina, dodges and critical hits.' },
  intelligence: { label: 'Intelligence', short: 'INT', icon: '📜', color: '#2f7fc4', blurb: 'Ninjutsu power, Genjutsu bonus. More chakra.' },
  willpower: { label: 'Willpower', short: 'WIL', icon: '🔮', color: '#9a5ad0', blurb: 'Genjutsu power, Ninjutsu bonus. More chakra and health; effects land more often.' },
};
export const STYLES = {
  ninjutsu: { label: 'Ninjutsu', color: '#e8742c', icon: '🔥', main: 'intelligence', sec: 'willpower' },
  genjutsu: { label: 'Genjutsu', color: '#9a5ad0', icon: '🌀', main: 'willpower', sec: 'intelligence' },
  taijutsu: { label: 'Taijutsu', color: '#d84a3a', icon: '👊', main: 'strength', sec: 'agility' },
  bukijutsu: { label: 'Bukijutsu', color: '#7a8a9a', icon: '🗡️', main: 'agility', sec: 'strength' },
};
const RANKS = ['Academy Student', 'Genin', 'Chunin', 'Jonin'];
const TIER = ['Academy', 'Genin', 'Chunin', 'Jonin'];
const GRADE_COL = { D: '#3a8a4a', C: '#2f7fc4', B: '#9a5ad0', A: '#e8742c', S: '#c43c32', X: '#b8860b', L: '#2a9d8f' };
const cost = (m) => [m.stamina ? `💪${m.stamina}` : '', m.chakra ? `💧${m.chakra}` : ''].filter(Boolean).join(' ') || 'Free';

function overlay(root, cls, html) {
  const el = h(`<div class="ov ${cls}">${html}</div>`);
  root.appendChild(el);
  return el;
}

// ---------- mission board ----------
function dailyLine(c) {
  const n = c.missions_today || 0, lim = c.mission_limit || G.MISSION_DAILY_LIMIT;
  return n >= lim ? `<p class="daily over">📋 Full rewards used today (${lim}/${lim}). Missions now pay 10% until tomorrow (London time).</p>`
    : `<p class="daily">📋 Full-reward missions today: <b>${n} / ${lim}</b></p>`;
}
export async function openMissionBoard(root, char, onPick) {
  const el = overlay(root, 'board-wrap', `<div class="scroll board"><h3>Mission Board</h3><p class="sub">Pick a job. Win to earn XP and ryo.</p>${dailyLine(char)}<div class="mlist"><div class="spinner"></div></div><button class="btn ghost" data-x>Close</button></div>`);
  el.querySelector('[data-x]').onclick = () => el.remove();
  el.addEventListener('click', (e) => { if (e.target === el) el.remove(); });
  let cat;
  try { cat = await net.getCatalog(); } catch (e) { el.querySelector('.mlist').innerHTML = `<p>${esc(e.message)}</p>`; return; }
  const ri = RANKS.indexOf(char.rank);
  el.querySelector('.mlist').innerHTML = cat.missions.map((m) => {
    const lockRank = ri < m.min_rank, lockLvl = char.level < m.min_level, locked = lockRank || lockLvl;
    const why = lockRank ? `Needs ${RANKS[m.min_rank]} rank` : lockLvl ? `Needs level ${m.min_level}` : '';
    return `<button class="mcard ${locked ? 'locked' : ''}" data-id="${m.id}" ${locked ? 'disabled' : ''}>
      <span class="grade" style="background:${GRADE_COL[m.grade]}">${m.grade}</span>
      <span class="mtxt"><b>${esc(m.name)}</b><small>${esc(m.description)}</small>
      <em>${locked ? '🔒 ' + why : `Foe: ${esc(m.enemy_name)} (Lv ${m.enemy_level}) · +${Math.round(m.xp * (char.reward_mult || G.rewardMult(char.level))).toLocaleString('en-GB')} XP · +${m.ryo} ryo`}</em></span></button>`;
  }).join('');
  el.querySelectorAll('.mcard:not(.locked)').forEach((b) => (b.onclick = () => { el.remove(); onPick(b.dataset.id); }));
}

// ---------- academy: rank exams ----------
export async function openExamHall(root, char, onStart, onLesson = null, startTab = null) {
  const el = overlay(root, 'board-wrap', `<div class="scroll board"><h3>Academy</h3><div class="ttabs"><button data-tab="lessons">🥋 Sparring lessons</button><button data-tab="exam">📜 Rank exam</button></div><div class="mlist"><div class="spinner"></div></div><button class="btn ghost" data-x>Close</button></div>`);
  el.querySelector('[data-x]').onclick = () => el.remove();
  el.addEventListener('click', (e) => { if (e.target === el) el.remove(); });
  const done = char.lessons_done || [];
  let tab = startTab || (char.rank === 'Academy Student' && done.length < 5 ? 'lessons' : 'exam');
  const box = el.querySelector('.mlist');
  const show = async () => {
    el.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    box.innerHTML = '<div class="spinner"></div>';
    if (tab === 'lessons') {
      let ls; try { ls = await net.getLessons(); } catch (e) { box.innerHTML = `<p>${esc(e.message)}</p>`; return; }
      box.innerHTML = `<p class="sub" style="text-align:center">Sensei Hiro: "Spar with your classmates. They fight exactly like Arena ninja, so this is your practice before you can duel as a Genin."</p>` +
        ls.map((l, i) => { const lock = char.level < l.min_level, ok = done.includes(l.id);
          return `<button class="mcard ${lock ? 'locked' : ''}" data-l="${l.id}" ${lock ? 'disabled' : ''}><span class="grade" style="background:${ok ? GRADE_COL.D : GRADE_COL.L}">${ok ? '✓' : i + 1}</span>
          <span class="mtxt"><b>${esc(l.name)}</b><small>${esc(l.description)}</small><em>${lock ? `🔒 Needs level ${l.min_level}` : `Partner: ${esc(l.enemy_name)} (Lv ${l.enemy_level}) · ${ok ? 'Cleared · practice anytime' : `First clear: +${l.xp} XP · +${l.ryo} ryo`}`}</em></span></button>`; }).join('') +
        `<p class="sub" style="text-align:center">No ryo is lost in the Academy. Clear all five, pass the Genin exam, then test yourself in the Arena.</p>`;
      box.querySelectorAll('[data-l]:not(:disabled)').forEach((b) => (b.onclick = () => { el.remove(); onLesson && onLesson(b.dataset.l); }));
      return;
    }
    let info;
    try { info = await net.examInfo(); } catch (e) { box.innerHTML = `<p>${esc(e.message)}</p>`; return; }
    if (!info.next_rank) { box.innerHTML = `<p class="sub" style="text-align:center">You are a Jonin, the highest rank. Sensei Hiro bows to you.</p>`; return; }
    const ready = info.ready, wait = info.wait_seconds;
    box.innerHTML = `
      <p class="sub" style="text-align:center">Sensei Hiro: "Pass the <b>${esc(info.next_rank)} Exam</b> to raise your level and stat limits and unlock ${esc(info.next_rank)} jutsu."</p>
      <div class="exreq ${ready ? 'ok' : ''}">${ready ? '✅' : '🔒'} Reach level <b>${info.needed_level}</b> <span>(you are level ${info.level})</span></div>
      ${info.rounds.map((r, i) => `<div class="mcard"><span class="grade" style="background:${GRADE_COL.X}">${i + 1}</span><span class="mtxt"><b>${esc(r.name)}</b><small>${esc(r.description)}</small><em>Opponent: ${esc(r.enemy)} (Lv ${r.enemy_level})</em></span></div>`).join('')}
      <p class="sub" style="text-align:center">Rounds are back to back. Between rounds you recover 30% of your HP, stamina and chakra. If you fail, rest 5 minutes and try again.</p>
      <button class="btn primary big" data-go ${ready && !wait ? '' : 'disabled'}>${!ready ? `Reach level ${info.needed_level} first` : wait ? `Resting… ${Math.ceil(wait / 60)} min` : `Begin the ${esc(info.next_rank)} Exam`}</button>`;
    box.querySelector('[data-go]').onclick = () => { el.remove(); onStart(); };
  };
  el.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; show(); }));
  show();
}

// ---------- training ----------
export async function openTraining(root, getChar, setChar, startTab = 'stats') {
  const el = overlay(root, 'board-wrap', `<div class="scroll board train"></div>`);
  let tab = startTab, cat = null, busy = false, alive = true;
  const close = () => { alive = false; el.remove(); };
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
  try { cat = await net.getCatalog(); } catch {}
  const energyNow = () => { const c = getChar(); return Math.min(c.energy_max || 100, c.energy + Math.floor((Date.now() - (c._loadedAt || Date.now())) / 1000 / (c.energy_regen_sec || 9))); };
  function render() {
    const c = getChar(), need = c.xp_need || G.xpNeed(c.level), v = VILLAGES[c.village], e = energyNow();
    const prog = c.train_prog || {};
    const statRows = Object.entries(STATS).map(([k, s]) => {
      const atCap = c[k] >= c.stat_cap, p = prog[k] || 0, per = (c.point_cost || {})[k] || 40;
      return `<div class="tst"><div class="tic" style="background:${s.color}">${s.icon}</div>
        <div class="tinfo"><b>${s.label} <span>${c[k]}</span><em>/ ${c.stat_cap}</em></b><small>${s.blurb}</small>
        <div class="mini" title="Progress to next point"><i style="width:${atCap ? 100 : Math.min(100, 100 * p / per)}%;background:${s.color}"></i></div>
        <small class="nx">${atCap ? 'At your rank cap' : `Next point: ${p} / ${per} energy`}</small></div>
        <div class="tbtns"><button class="btn small primary" data-s="${k}" data-n="1" ${atCap || e < 10 || busy ? 'disabled' : ''}>${atCap ? 'Capped' : 'Train<br><small>⚡10</small>'}</button>
        ${atCap ? '' : `<button class="btn small ghost" data-s="${k}" data-n="99" ${e < 10 || busy ? 'disabled' : ''}>Max<br><small>⚡${Math.floor(e / 10) * 10}</small></button>`}</div></div>`;
    }).join('');
    const els = [c.element, c.element2].filter(Boolean), known = G.knownMoves({ rankIndex: c.rank_index, elements: els, bloodline: c.bloodline });
    const EI = G.ELEMENT_INFO, chip = (k) => `<span class="elc" style="--c:${EI[k].color}">${EI[k].icon} ${EI[k].label}</span>`;
    const beats = (k) => EI[G.ELEMENTS[(G.ELEMENTS.indexOf(k) + 1) % 5]].label, weakTo = (k) => EI[G.ELEMENTS[(G.ELEMENTS.indexOf(k) + 4) % 5]].label;
    const tgt = c.element2_target, prog2 = c.element2_prog || 0;
    const elemBox = `<div class="elbox"><b>Chakra nature</b> ${els.map(chip).join(' ')}
      <small>${els.map((k) => `${EI[k].label} beats ${beats(k)}, weak to ${weakTo(k)}.`).join(' ')} Fire › Wind › Lightning › Earth › Water › Fire.</small>
      ${c.bloodline ? `<small class="bl">${G.BLOODLINES[c.bloodline].icon} <b>${G.BLOODLINES[c.bloodline].label}</b>: ${G.BLOODLINES[c.bloodline].desc} <b>Passive:</b> ${G.BLOODLINES[c.bloodline].passive}</small>` : ''}
      ${c.element2 ? '' : c.rank_index < 2 ? `<small class="nx">🔒 Learn a second element at Chunin rank.</small>` : `<div class="el2"><small>Train a second element (1000 energy):</small>
        <div class="el2b">${G.ELEMENTS.filter((k) => k !== c.element).map((k) => `<button class="btn small ${tgt === k ? 'primary' : 'ghost'}" data-el="${k}" ${e < 10 || busy ? 'disabled' : ''}>${EI[k].icon} ${EI[k].label}${tgt === k ? `<br><small>${prog2}/1000</small>` : ''}</button>`).join('')}</div>
        <small class="nx">Each tap spends ⚡10. Switching element restarts progress.</small></div>`}</div>`;
    const groups = [...Object.entries(STYLES), ...(c.bloodline ? [['bloodline', { label: 'Bloodline', color: '#c43c8a', icon: '🧬', main: G.BLOODLINES[c.bloodline].main, sec: G.BLOODLINES[c.bloodline].sec }]] : [])];
    const jutsuRows = elemBox + groups.map(([sk, st]) => `<h4 style="color:${st.color}">${st.icon} ${st.label} <small>uses ${STATS[st.main].short} + ${STATS[st.sec].short}</small></h4>` +
      Object.entries(G.MOVES).filter(([id, m]) => m.style === sk && (sk !== 'ninjutsu' || els.includes(m.element)) && (sk !== 'bloodline' || m.bloodline === c.bloodline)).map(([id, m]) => {
        const locked = !known.includes(id), j = (c.jutsu || {})[id] || { level: 1, xp: 0, next: 50 }, maxed = j.level >= 10;
        const rng = m.target === 'self' ? 'Self' : m.range[1] === 0 ? 'Around you' : `Range ${m.range[0]}-${m.range[1]}`;
        const effs = m.effects.map((x) => G.STATUS[x.k].icon).join('');
        return `<div class="tst jt ${locked ? 'locked' : ''}"><div class="tinfo"><b>${locked ? '🔒 ' : ''}${m.element ? EI[m.element].icon + ' ' : ''}${esc(m.name)} ${locked ? '' : `<span>Lv ${j.level}</span>`}</b>
          <small>${TIER[m.tier]} · ${m.ap} AP · ${rng}${m.aoe ? ' · Area' : ''}${m.power ? ' · Power ' + m.power : ''} · ${cost(m)} ${effs}</small><small>${esc(m.desc)}</small>
          ${locked ? `<small class="nx">Unlocks at ${RANKS[m.tier]} rank</small>` : `<div class="mini"><i style="width:${maxed ? 100 : 100 * j.xp / j.next}%;background:${st.color}"></i></div>
          <small class="nx">${maxed ? 'Mastered' : `${j.xp} / ${j.next} XP to level ${j.level + 1}`}</small>`}</div>
          ${locked ? '' : `<div class="tbtns"><button class="btn small primary" data-j="${id}" data-n="1" ${maxed || e < 10 || busy ? 'disabled' : ''}>${maxed ? 'Mastered' : 'Train<br><small>⚡10</small>'}</button>
          ${maxed ? '' : `<button class="btn small ghost" data-j="${id}" data-n="99" ${e < 10 || busy ? 'disabled' : ''}>Max<br><small>⚡${Math.floor(e / 10) * 10}</small></button>`}</div>`}</div>`;
      }).join('')).join('');
    el.querySelector('.board').innerHTML = `
      <h3>${esc(c.name)}</h3>
      <p class="sub" style="color:${v.dark}"><b>${v.name}</b> · ${esc(c.rank)} · Level ${c.level}</p>
      <div class="xp"><div style="width:${Math.min(100, (c.xp / need) * 100)}%"></div></div>
      <p class="sub">${c.xp} / ${need} XP · 💰 ${c.ryo} ryo · 🏆 ${c.arena_points || 0} Arena</p>
      <div class="pools"><span>❤️ <b>${c.hp_max}</b> HP</span><span>💪 <b>${c.stamina_max}</b> Stamina</span><span>💧 <b>${c.chakra_max}</b> Chakra</span></div>
      <div class="energy"><b>⚡ Energy ${e} / ${c.energy_max}</b><div class="ebar"><i style="width:${e}%"></i></div>
        <small class="txp">⭐ Each training gives <b>+${(c.training_xp || G.trainingXp(c.level)).toLocaleString('en-GB')} XP</b> (10 energy). Training is the main way to level up.</small>
        <small>${e >= c.energy_max ? 'Full! Spend it on training.' : `+1 every ${c.energy_regen_sec}s · full in ${fmt(Math.ceil((c.energy_max - e) * c.energy_regen_sec))}`}</small>
        ${c.arena_bonus ? `<small class="ebonus">🏆 Arena bonus: refilling ${c.arena_bonus.mult}× faster today (#${c.arena_bonus.place} yesterday)</small>` : ''}</div>
      <div class="ttabs"><button data-tab="stats" class="${tab === 'stats' ? 'on' : ''}">General stats</button><button data-tab="jutsu" class="${tab === 'jutsu' ? 'on' : ''}">Jutsu</button></div>
      <div class="tstyles">${tab === 'stats' ? statRows : jutsuRows}</div>
      <button class="btn ghost" data-x>Close</button>`;
    el.querySelector('[data-x]').onclick = close;
    el.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; render(); }));
    const hurt = injuredLeft(getChar());
    if (hurt) {
      const box = el.querySelector('.energy');
      if (box && !el.querySelector('.hurt-note')) box.insertAdjacentHTML('afterend', `<p class="daily over hurt-note">🤕 You are in the Hospital recovering (${mmss(hurt)} left). You can't train until you heal. Rest, or pay to heal at the Hospital.</p>`);
      el.querySelectorAll('[data-s], [data-j], [data-el]').forEach((b) => (b.disabled = true));
    }
    el.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => doTrain(() => net.trainStat(b.dataset.s, +b.dataset.n), (r) => r.gained ? `${STATS[b.dataset.s].label} +${r.gained}!` : 'Training progress saved.')));
    el.querySelectorAll('[data-el]').forEach((b) => (b.onclick = () => doTrain(() => net.trainElement(b.dataset.el, 1), (r) => r.element_learned ? `You now command ${G.ELEMENT_INFO[b.dataset.el].label} too!` : `${G.ELEMENT_INFO[b.dataset.el].label} training: ${r.element2_prog}/1000`)));
    el.querySelectorAll('[data-j]').forEach((b) => (b.onclick = () => doTrain(() => net.trainJutsu(b.dataset.j, +b.dataset.n), (r) => r.trained && r.trained.up ? `Jutsu level up! Now level ${r.trained.level}.` : 'Jutsu experience gained.')));
  }
  async function doTrain(fn, msg) {
    if (busy) return; busy = true; render();
    try {
      const r = await fn(); r._loadedAt = Date.now(); setChar(r);
      const x = r.xp_gain && r.xp_gain.xp ? ` +${r.xp_gain.xp.toLocaleString('en-GB')} XP${r.xp_gain.leveled ? ` · ⬆ Level ${r.xp_gain.level}! Energy refilled.` : r.xp_gain.capped ? ' (level cap: take your rank exam)' : ''}` : '';
      toast(msg(r) + x, 'ok');
    } catch (e) { toast(e.message); }
    busy = false; render();
  }
  render();
  const tick = setInterval(() => { if (!alive || !el.isConnected) return clearInterval(tick); if (!busy) render(); }, 3000);
}
const fmt = (s) => s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
function toast(msg, kind = 'err') { const t = h(`<div class="toast ${kind}">${esc(msg)}</div>`); document.body.appendChild(t); setTimeout(() => t.remove(), 3000); }
function alertMsg(el, msg) { toast(msg); }

export { runBattle } from './hexbattle.js?v=9d1c820';
