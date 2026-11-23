// Ninja Handbook: short help pages for every system. Opened from the 📖 button, the menu or the guide.

const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

export const PAGES = [
  { id: 'start', icon: '🧭', title: 'Getting started', body: `
    <p><b>Walk</b> by tapping the ground. <b>Enter a building</b> by tapping it, and your ninja walks there.</p>
    <p>Your first goals:</p>
    <ol><li>Win the sparring lessons at the <b>Academy</b>.</li><li>Spend your energy on <b>⭐ Train</b>.</li><li>Do missions at the <b>Mission Hall</b>.</li><li>Reach level 5 and pass the <b>Genin Exam</b>.</li></ol>
    <p>The 🧭 <b>Next step</b> card guides you through all of this. Tap <b>–</b> to tuck it away.</p>
    <p class="hb-tip">💡 A daily rhythm that works: train whenever your energy is full, and do your 10 full-reward missions each day.</p>` },
  { id: 'train', icon: '⭐', title: 'Training & energy', body: `
    <p><b>Training is the main way to level up.</b> Each training costs <b>10 energy</b>. It raises a stat or a jutsu, and gives a big chunk of <b>XP</b>.</p>
    <p>Energy refills by itself: <b>+1 every 9 seconds</b>, so it fills from empty in about <b>15 minutes</b>. A gold dot on ⭐ Train means your energy is full. Spend it, or the refill is wasted.</p>
    <ul><li><b>Strength</b>: harder taijutsu and weapon hits, more HP and stamina.</li><li><b>Agility</b>: dodge, critical hits, extra AP and acting first.</li><li><b>Intelligence</b>: stronger ninjutsu and more chakra.</li><li><b>Willpower</b>: stronger genjutsu, more chakra, and your debuffs land more often.</li></ul>
    <p>Each rank has a stat limit: 20 for Academy, then 50, 100 and 200.</p>` },
  { id: 'missions', icon: '📜', title: 'Missions', body: `
    <p>The <b>Mission Hall</b> has D, C, B, A and S-rank missions. Harder missions need a higher level or rank.</p>
    <p>Missions pay <b>ryo</b> (money) and XP. Your first <b>10 missions each day</b> give full rewards. After that they pay 20% XP and ryo, so missions are best as a short daily session.</p>
    <p>The board shows how many full-reward missions you have left today.</p>` },
  { id: 'ranks', icon: '🎓', title: 'Ranks & exams', body: `
    <table class="hb-t"><tr><th>Rank</th><th>Exam at level</th><th>Unlocks</th></tr>
    <tr><td>Academy Student</td><td>Start</td><td>Lessons, missions</td></tr>
    <tr><td>Genin</td><td>5</td><td>Duels, Arena, Library scrolls</td></tr>
    <tr><td>Chunin</td><td>15</td><td>A second element, harder content</td></tr>
    <tr><td>Jonin</td><td>30</td><td>Jonin quests and bosses, up to level 60</td></tr></table>
    <p>Your level stops at your rank's limit until you pass the next exam at the <b>Academy</b>. An exam is several rounds in a row. If you fail, rest 5 minutes and try again.</p>` },
  { id: 'battle', icon: '⚔️', title: 'How battles work', body: `
    <p>Battles are turn-based on a hex grid. Each turn you have <b>action points (AP)</b> to move and attack.</p>
    <ul><li><b>Blue hexes</b> show where you can move. Rocks give cover.</li><li><b>Jutsu</b> cost chakra. Stronger jutsu have a <b>cooldown</b> of a few turns.</li><li>Before each fight you pick a <b>loadout</b>: the jutsu and items to bring.</li><li>Stuns, burns, slows and more wear off after a few turns. Antidotes cure poison and confusion.</li></ul>
    <p><b>Counter scrolls</b> (Library, Genin and above) are always ready and don't take a loadout slot:</p>
    <ul><li>🪵 <b>Substitution</b> escapes a hit.</li><li>✨ <b>Chakra Release</b> breaks a stun.</li><li>🚫 <b>Dispel</b> removes the enemy's buffs.</li></ul>` },
  { id: 'elements', icon: '🔥', title: 'Elements & bloodlines', body: `
    <p>Every ninja is born with one <b>element</b>. Each element deals <b>+25% damage</b> to the next one in the circle:</p>
    <p class="hb-wheel">🔥 Fire → 🌪️ Wind → ⚡ Lightning → 🪨 Earth → 💧 Water → 🔥 Fire</p>
    <p>At <b>Chunin</b> you can train a <b>second element</b>.</p>
    <p><b>Bloodlines</b> are rare. A few ninja awaken one when they pass the Genin exam. A bloodline gives a small passive bonus and its own jutsu, but it never makes a ninja unbeatable.</p>` },
  { id: 'pvp', icon: '🏟️', title: 'Duels & the Arena', body: `
    <p>From <b>Genin</b> on, tap another ninja in the village to <b>challenge them to a duel</b>.</p>
    <p>The <b>Arena</b> has ranked fights for Arena points. The top ninja get a statue in the village.</p>
    <p>Want a break? Choose <b>💤 Go to sleep</b> in the menu, and nobody can challenge you.</p>` },
  { id: 'hospital', icon: '🍜', title: 'Health, Ramen & the Hospital', body: `
    <p><b>Your health carries over</b> from one fight to the next: missions, quests, lessons, exams, duels, the Arena and boss fights all start with the health you have now. The ❤ bar under your name shows it.</p>
    <p>Health <b>refills on its own</b>, fully in <b>15 minutes</b>. Levelling up or passing a rank exam fills it straight away. In a hurry? Eat at the <b>🍜 Ramen Shop</b>: Small (25%), Large (50%) or Deluxe (full). Prices grow with your level.</p>
    <p>If you <b>lose</b> a fight you're also <b>injured for 15 minutes</b>: you can't fight or train until you heal. Wait it out, or pay the <b>Hospital</b> to heal you instantly (this also fills your health).</p>` },
  { id: 'ryo', icon: '💰', title: 'Ryo & trading', body: `
    <p>Earn ryo from missions, quests and bosses. Spend it at:</p>
    <ul><li><b>Tool Shop</b>: weapons, armour and battle items.</li><li><b>Library</b>: counter scrolls.</li><li><b>Ramen Shop</b>: bowls that restore health.</li><li><b>Hospital</b>: instant heals after an injury.</li><li><b>Auction House</b>: buy from other players.</li></ul>
    <p>At the Auction House you set a fixed price. Listings last <b>48 hours</b>, you can have up to <b>10</b> at once, and a <b>10% sales tax</b> is taken when an item sells.</p>` },
  { id: 'world', icon: '🗺️', title: 'Quests, bosses & villages', body: `
    <p>Leave through the <b>Village Gate</b> to open the <b>World Map</b>. Quest lines tell a story over several fights and end with a <b>boss</b>, which can drop rare gear. Jonin quest lines open at levels 30, 40 and 50.</p>
    <p>Everything you do earns points for your <b>village</b>. In the <b>Kage Tower</b> you can see your village's standing, its <b>Kage</b>, its upgrades, and its wars over territory.</p>` },
];

export function openHandbook(root, start = 'start') {
  root.querySelector('.ov.hb-wrap')?.remove();
  const el = h(`<div class="ov board-wrap hb-wrap"><div class="scroll board hb"><h3>📖 Ninja Handbook</h3>
    <div class="hb-grid"><nav class="hb-nav">${PAGES.map((p) => `<button data-p="${p.id}">${p.icon} <span>${p.title}</span></button>`).join('')}</nav><article class="hb-page"></article></div>
    <button class="btn ghost" data-x>Close</button></div></div>`);
  root.appendChild(el);
  const close = () => el.remove();
  el.querySelector('[data-x]').onclick = close;
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
  const page = el.querySelector('.hb-page');
  const show = (id) => {
    const p = PAGES.find((x) => x.id === id) || PAGES[0];
    el.querySelectorAll('[data-p]').forEach((b) => b.classList.toggle('on', b.dataset.p === p.id));
    page.innerHTML = `<h4>${p.icon} ${p.title}</h4>${p.body}`; page.scrollTop = 0;
    el.querySelector(`[data-p="${p.id}"]`).scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  el.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => show(b.dataset.p)));
  show(start);
  return el;
}
