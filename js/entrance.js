// Belépés a betöltő után: a hullámok, a pillek és a lejátszó-blob időzítése
// Az időpontot és a beállításokat a gyökérben lévő intro.js adja (window.MPIntro: t2 = a betöltő vége, post = időzítések).
// Ha a 3D később töltődik be, mint ahogy a betöltő véget ér, a saját első képkockájától indul, így semmi nem ugrik be félúton.
const INTRO = window.MPIntro || null;
let base = null;

// 0 → 1 a megadott szakaszban (másodpercben a betöltő végétől); intro nélkül mindig 1
export function introK(start, dur) {
  if (!INTRO) return 1;
  if (INTRO.t2 == null) return 0;
  if (base == null) base = Math.max(INTRO.t2, performance.now());
  return Math.min(1, Math.max(0, ((performance.now() - base) / 1000 - start) / dur));
}
export const introPost = INTRO ? INTRO.post : null;
export const easeOut4 = x => 1 - Math.pow(1 - x, 4);
export const easeInOut = x => x * x * (3 - 2 * x);

// Felúszás: a hullámok és a pillek azonos kezdősebességgel indulnak (easeOut4 kezdősebessége 4 × táv / idő),
// így együtt mozognak; a hosszabb utat bejáró pill tovább fut.
const P = introPost;
const pillsDur = P ? P.wavesDur * P.pillsDist / P.wavesDist : 0;

// a hero-ba visszalépve (js/hero.js) a hullámok és a pillek lesüllyednek, a felület elhalványul: away 0 → 1
let away = 0;
export const setAway = v => { away = v; };
export const getAway = () => away;
// hero után a pillek felvilágítva lépnek be (nem úsznak fel): a hero.js jelzi a kilépést (markLit), ehhez mér a pills.js
let litBase = null;
export const litStyle = () => !!(INTRO && INTRO.heroUsed);
export const markLit = () => { litBase = performance.now(); };
export const clearLit = () => { litBase = null; };
export const litT = () => litBase == null ? -1 : (performance.now() - litBase) / 1000;
// a hullámok fényereje (0 → 1)
export const wavesIn = () => (P ? easeInOut(introK(P.rise, P.wavesFade)) : 1) * (1 - away);
// a hullámok még hátralévő emelkedése (képernyőmagasságban; 0 = a helyén)
export const wavesRise = () => P ? P.wavesDist * Math.max(1 - easeOut4(introK(P.rise, P.wavesDur)), away) : 0;
// az i. pill még hátralévő emelkedése (képernyőmagasságban)
export const pillRise = i => litStyle() ? 0 : P ? P.pillsDist * Math.max(1 - easeOut4(introK(P.rise + i * P.pillsStagger, pillsDur)), away) : 0;
// a lejátszó-blob átlátszósága (a HTML felülettel együtt jelenik meg)
export const uiIn = () => (P ? introK(P.ui / 1000, P.uiDur / 1000) : 1) * (1 - away);
