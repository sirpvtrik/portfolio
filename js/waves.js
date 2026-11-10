// Hullámok a két szélen: teljes képernyős 2D shader, az üveg mögött (a render targetbe kerül, így a pillek megtörik)
// Három stílus, a Glass panelen váltható: 0 = Fényszalag, 1 = Üveg, 2 = Folyékony (teszt, most az alap). A zenei reakciót az
// audio.js számolja. Oldalanként egy négyszögre rajzolunk, ami csak a hullám hatósugaráig ér be (uReachN).
import { S } from './config.js';
import { scene, onLayer, LAYER_BG, U } from './scene.js';
import { damp } from './util.js';
import { wavesRise } from './entrance.js';
import { fullscreenVS } from './shaders/fullscreen.js';
import { waveVS, waveFS } from './shaders/waves.js';

export const WU = { uTime: { value: 0 }, uAmp: { value: 0 }, uPush: { value: 0 }, uGain: { value: 1 }, uReact: { value: 1.2 }, uBeat: { value: 0 }, uRes: U.uRes, uBands: { value: [0, 0, 0, 0, 0, 0] }, uFlowY: { value: 0 }, uStyle: { value: 0 }, uShift: { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 }, uReachN: { value: 2 },
  uPalA: { value: [0, 1, 2].map(() => new THREE.Vector3(0.95, 0.96, 1.0)) }, uPalB: { value: [0, 1, 2].map(() => new THREE.Vector3(0.95, 0.96, 1.0)) }, uColFront: { value: 1.2 }, uRise: { value: 0 }, uFlash: { value: 0 },
  // egérfény (js/cursor.js állítja): a nyom pontjai pixelben, a mozgás energiája és a kurzor kis fénye
  uCur: { value: [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector2(-9999, -9999)) }, uCurE: { value: 0 }, uCurB: { value: 0 }, uCurV: { value: new THREE.Vector2() } };
const waveMat = new THREE.ShaderMaterial({
  uniforms: WU, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  extensions: { derivatives: true }, side: THREE.DoubleSide,
  vertexShader: waveVS,
  fragmentShader: waveFS,
});
// két négyszög (bal, jobb): position = (u, y, oldal)
const waveGeo = new THREE.BufferGeometry();
waveGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, -1, 1, -1, -1, 1, 1, -1, 0, 1, -1, 0, -1, 1, 1, -1, 1, 1, 1, 1, 0, 1, 1], 3));
waveGeo.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
const waveQuad = new THREE.Mesh(waveGeo, waveMat);
waveQuad.frustumCulled = false; waveQuad.renderOrder = -1;
scene.add(onLayer(waveQuad, LAYER_BG));

/* ---------- Középre eltolás ----------
   A Középre csúszka értéke × shiftK; nyitott projekt-aloldalnál shiftK → 0, így a szalagok finoman kiúsznak a szélekre */
let shiftK = 1, shiftTarget = 1;
export function setWavesCentered(on) { shiftTarget = on ? 1 : 0; }
export function updateWaves(dt) {
  updateWaveColor(dt);
  shiftK = damp(shiftK, shiftTarget, 2.2, dt);
  WU.uRise.value = wavesRise();   // belépés: a szalagok alulról úsznak fel (a pillekkel együtt)
  WU.uShift.value = S.wshift / 100 * 1.4 * shiftK;   // ~70 → a szalagok épp a pillek széléig érnek (a shader a képarányhoz igazítja)
  // a négyszögek szélessége: a Folyékony stílus legfeljebb 0,40 egységnyire ér be (plusz a Középre eltolás); a régi
  // stílusok messzebbre érnek, azoknál a teljes képernyő
  const W = U.uRes.value.x, H = U.uRes.value.y, sh = WU.uShift.value * Math.max(0, 0.5 * W / H - 0.25);
  WU.uReachN.value = S.wstyle === 2 ? Math.min(2, (0.41 + sh) * Math.min(H, W * 1.6) / W * 2) : 2;
}

/* ---------- Hullám-szín: a projekt palettájára vált (fentről lefelé végigfutó átmenettel), visszalépéskor vissza fehérre ----------
   pal: 3 árnyalat [[r,g,b] ×3] (szalagonként egy: elöl a legvilágosabb), egyetlen [r,g,b] szín, vagy null = fehér */
const WHITE = [0.95, 0.96, 1.0];
const FLASH = 1;   // a kattintáskori felvillanás erőssége (0 = nincs)
let colTarget = JSON.stringify([WHITE, WHITE, WHITE]), frontV = 1.2;
export function setWaveColor(pal) {
  const p = !pal ? [WHITE, WHITE, WHITE] : Array.isArray(pal[0]) ? pal : [pal, pal, pal];
  const key = JSON.stringify(p);
  if (key === colTarget) return;
  colTarget = key;
  // a most látszó színből indul (ha épp átmenet közben van, a front alatti rész az A-szín)
  if (frontV > 0.6) WU.uPalA.value.forEach((v, k) => v.copy(WU.uPalB.value[k]));   // (ha egy átmenet még az elején jár, a régi alapszín marad)
  WU.uPalB.value.forEach((v, k) => v.fromArray(p[k]));
  WU.uFlash.value = pal ? FLASH : 0;                           // kattintásra (projekt-színre váltáskor) felvillan, visszalépéskor nem
  frontV = 0;
}
export function updateWaveColor(dt) {
  if (frontV >= 1.2) return;
  frontV = Math.min(1.2, frontV + dt * 0.95);                  // ~1,3 mp alatt fut végig fentről lefelé
  WU.uColFront.value = frontV;
}
