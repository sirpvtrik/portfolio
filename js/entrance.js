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
// hero után a hullámok lentről felfelé tűnnek elő egy fényes élű fronttal (képernyőmagasság-arány, 0 = lent); a pillek akkor
// világítanak fel, amikor a front eléri a magasságukat (pills.js), így együtt haladnak. 2 = minden látszik.
export const WAVE_FRONT_DUR = 4.2;   // Patrik: lassabban jöhetnek a hullámok és a pillek fénye
// hero után a pillek (mint eddig) alulról úsznak fel, a hullámok frontjával együtt, közben oldalról kapják meg a fényt
function litRise() {
  if (litBase == null) return 0;
  const k = Math.min(1, Math.max(0, (litT() - 0.1) / (WAVE_FRONT_DUR * 0.95)));
  return 0.75 * (1 - easeInOut(k));
}
export function waveFront() {
  if (!litStyle()) return 2;
  if (litBase == null) return INTRO && INTRO.t2 ? 2 : -0.2;
  const k = Math.min(1, Math.max(0, (litT() - 0.2) / WAVE_FRONT_DUR));
  return k >= 1 ? 2 : -0.15 + 1.7 * easeInOut(k);   // túlfut a képernyő tetején, így a felső pillek is végig lágyan érnek be
}
// a hullámok fényereje (0 → 1)
export const wavesIn = () => litStyle() ? (INTRO.t2 ? 1 : 0) * (1 - away) : (P ? easeInOut(introK(P.rise, P.wavesFade)) : 1) * (1 - away);
// a hullámok még hátralévő emelkedése (képernyőmagasságban; 0 = a helyén)
export const wavesRise = () => litStyle() ? (P ? P.wavesDist * away : 0) : P ? P.wavesDist * Math.max(1 - easeOut4(introK(P.rise, P.wavesDur)), away) : 0;
// az i. pill még hátralévő emelkedése (képernyőmagasságban)
export const pillRise = i => litStyle() ? litRise() : P ? P.pillsDist * Math.max(1 - easeOut4(introK(P.rise + i * P.pillsStagger, pillsDur)), away) : 0;
// a lejátszó-blob átlátszósága (a HTML felülettel együtt jelenik meg)
export const uiIn = () => (P ? introK(P.ui / 1000, P.uiDur / 1000) : 1) * (1 - away);
