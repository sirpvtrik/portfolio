// A projekt-aloldal kártyáinak üvege WebGL-ben (a DOM-kártyák csak a tartalmat adják, az üveget ez rajzolja alájuk).
// Minden kockában kiolvassa a kártyák sarkainak valódi képernyő-helyzetét (láthatatlan sarokjelölőkkel), így az üveg
// pontosan követi a megjelenési animációt és a domború dőlést; a négyszöget homográfiával adja át a shadernek.
import { scene, onLayer, LAYER_CARDS, rt, U, bufSize } from './scene.js';
import { fullscreenVS } from './shaders/fullscreen.js';
import { cardsFS } from './shaders/cards.js';

const MAX = 8;
const H = Array.from({ length: MAX + 1 }, () => new THREE.Matrix3());
const SZ = Array.from({ length: MAX }, () => new THREE.Vector4());
const BB = Array.from({ length: MAX }, () => new THREE.Vector4());
const FX = Array.from({ length: MAX }, () => new THREE.Vector4());
const CU = {
  uBg: { value: rt.texture }, uRes: U.uRes, uH: { value: H }, uSz: { value: SZ }, uBB: { value: BB }, uFx: { value: FX },
  uMask: { value: new THREE.Vector2(1, 1) }, uScale: { value: 1 },
  uRefr: U.uRefr, uDisp: U.uDisp, uFrost: U.uFrost, uSplay: U.uSplay, uLightAng: U.uLightAng, uLightInt: U.uLightInt,
};
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: CU, transparent: true, depthTest: false, depthWrite: false,
  vertexShader: fullscreenVS, fragmentShader: cardsFS,
}));
quad.frustumCulled = false; quad.visible = false;
scene.add(onLayer(quad, LAYER_CARDS));

/* ---------- Sarokjelölők: 0×0-s elemek a kártya négy sarkában; a bounding rectjük a vetített sarok ---------- */
function corners(el) {
  if (!el._cm) {
    el._cm = ['tl', 'tr', 'br', 'bl'].map(k => { const m = document.createElement('i'); m.className = 'cm ' + k; m.setAttribute('aria-hidden', 'true'); el.append(m); return m; });
    el._r = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
  }
  return el._cm.map(m => { const r = m.getBoundingClientRect(); return [r.left, r.top]; });
}

/* ---------- Egységnégyzet → négyszög homográfia (Heckbert), majd invertálva: képernyő → kártya-UV ---------- */
function setHomography(M, P) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = P;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let g = 0, h = 0;
  if (Math.abs(dx3) > 1e-6 || Math.abs(dy3) > 1e-6) {
    const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
    g = (dx3 * dy2 - dx2 * dy3) / den; h = (dx1 * dy3 - dx3 * dy1) / den;
  }
  M.set(x1 - x0 + g * x1, x3 - x0 + h * x3, x0,
        y1 - y0 + g * y1, y3 - y0 + h * y3, y0,
        g, h, 1).invert();
}

let cards = [], gallery = [], clipEl = null;
// cards: a fix kártyák; gallery: a galéria kártyái (csak a vágókereten belül látszanak); clip: a galéria kerete
export function setGlassCards(fixed, galleryCards, clip) { cards = fixed; gallery = galleryCards; clipEl = clip; }

export function updateCardGlass(active) {
  quad.visible = !!active;
  if (!active) return;
  const sc = bufSize.x / innerWidth, Hb = bufSize.y;
  const toGL = ([x, y]) => [x * sc, Hb - y * sc];
  CU.uScale.value = sc;
  CU.uMask.value.set(120 * sc, 40 * sc);                         // ugyanaz az elhalványulás, mint a DOM-görgetőn
  let clipBox = null;
  if (clipEl) {
    const cp = corners(clipEl).map(toGL);
    setHomography(H[MAX], cp);
    clipBox = [Math.min(...cp.map(q => q[0])), Math.min(...cp.map(q => q[1])), Math.max(...cp.map(q => q[0])), Math.max(...cp.map(q => q[1]))];
  }
  const list = cards.map(el => [el, 0]);
  for (const el of gallery) {                                     // a galériából csak a keretbe belógók (legfeljebb a maradék hely)
    if (list.length >= MAX) break;
    const r = el.getBoundingClientRect();
    if (!clipBox || (r.right * sc > clipBox[0] && r.left * sc < clipBox[2])) list.push([el, 1]);
  }
  for (let i = 0; i < MAX; i++) {
    const it = list[i];
    const op = it ? parseFloat(getComputedStyle(it[0]).opacity) : 0;
    if (!it || !(op > 0.004)) { SZ[i].w = 0; continue; }
    const el = it[0], P = corners(el).map(toGL);
    setHomography(H[i], P);
    SZ[i].set(el.offsetWidth * sc, el.offsetHeight * sc, el._r * sc, op);
    BB[i].set(Math.min(...P.map(q => q[0])) - 2, Math.min(...P.map(q => q[1])) - 2, Math.max(...P.map(q => q[0])) + 2, Math.max(...P.map(q => q[1])) + 2);
    FX[i].x = it[1];
  }
}
