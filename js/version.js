// Shinobi Realms version and changelog (CEO, 19 Nov 2026).
// Numbering: 0.MINOR.PATCH while in alpha (1.0.0 at public launch).
//   MINOR goes up for a feature or balance change, PATCH for a small fix or tweak.
// Every live release has its own number; tools/deploy.py tags it in GitHub (v0.13.0, ...).
// notice: true shows a one-time "What's new" note to players (bigger updates only).

export const VERSION = '0.15.0';

export const CHANGES = [
  { v: '0.15.0', date: '23 Nov 2026', notice: true, title: 'Lasting health and the Ramen Shop', items: [
    '<b>Your health now carries over</b> from fight to fight. Watch the ❤ bar under your name.',
    'Health <b>refills on its own</b>, fully in 15 minutes. Levelling up fills it too.',
    'New <b>🍜 Ramen Shop</b> in every village: Small, Large and Deluxe bowls heal 25%, 50% or all of your health.',
  ] },
  { v: '0.14.0', date: '19 Nov 2026', notice: true, title: 'Fair play', items: [
    'New <b>🚩 Report player</b> button on every ninja\'s profile, for cheating, bots, second accounts or bad behaviour. Reports are private.',
    'Clear <b>fair-play rules</b> in the Terms: one account per person, no bots, report bugs instead of using them.',
    '<b>New, easier-to-read fonts</b> for all text and buttons.',
  ] },
  { v: '0.13.0', date: '19 Nov 2026', notice: true, title: 'Faster ranks', items: [
    'Genin, Chunin and Jonin now take about <b>half as long</b>.',
    'Training gives <b>twice the XP</b> from Genin up.',
    'Missions pay much more XP and more ryo. The first <b>10 missions each day</b> pay in full, then 20%.',
    'Quest fights and raid bosses pay <b>50% more</b> XP and ryo.',
    'Easier first Academy lessons, and the guide now starts with training.',
    'Better battle screen on tablets held sideways and on wide PC screens.',
  ] },
];

// a > b ? Old builds used date labels (e.g. "2026-11-19g"): they count as older than any version number.
const parts = (s) => (/^\d+\.\d+\.\d+$/.test(String(s)) ? String(s).split('.').map(Number) : null);
export function isNewer(a, b) {
  const x = parts(a), y = parts(b);
  if (!x) return false; if (!y) return true;
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
}
