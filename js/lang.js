// Nyelv (HU / EN) a projekt-szövegekhez. A szöveg lehet sima string (mindkét nyelven ugyanaz) vagy { hu, en }.
// Alapból a böngésző nyelve szerint indul (magyar böngészőben magyarul), a választást a localStorage `mpLang` kulcsán
// megjegyzi. A projekt-oldal a váltásra újraépül (js/project.js, onLang).
const KEY = 'mpLang';
let cur = (() => {
  try { const s = localStorage.getItem(KEY); if (s === 'hu' || s === 'en') return s; } catch (_) {}
  return /^hu\b/i.test(navigator.language || '') ? 'hu' : 'en';
})();
const subs = [];
document.documentElement.lang = cur;

export const lang = () => cur;
// fordítás: { hu, en } → az aktuális nyelv (ha hiányzik, a másik); string → változatlan
export const tr = x => (x == null || typeof x === 'string') ? x : (x[cur] ?? x.en ?? x.hu ?? '');
export const isBilingual = x => !!x && typeof x === 'object' && ('hu' in x || 'en' in x);
export function setLang(l) {
  if (l === cur || (l !== 'hu' && l !== 'en')) return;
  cur = l;
  try { localStorage.setItem(KEY, l); } catch (_) {}
  document.documentElement.lang = l;
  subs.forEach(f => f(l));
}
export const onLang = f => { subs.push(f); };
