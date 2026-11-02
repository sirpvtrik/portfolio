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

// a hullámok fényereje (0 → 1)
export const wavesIn = () => introPost ? easeInOut(introK(introPost.waves, introPost.wavesDur)) : 1;
// az i. pill felúszása (0 = egy képernyőnyivel lejjebb, 1 = a helyén); felülről lefelé, kis késéssel egymás után
export const pillIn = i => introPost ? easeOut4(introK(introPost.pills + i * introPost.pillsStagger, introPost.pillsDur)) : 1;
// a lejátszó-blob átlátszósága (a HTML felülettel együtt jelenik meg)
export const uiIn = () => introPost ? introK(introPost.ui / 1000, introPost.uiDur / 1000) : 1;
