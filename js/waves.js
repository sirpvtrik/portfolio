// Hullámok a két szélen: teljes képernyős 2D shader, az üveg mögött (a render targetbe kerül, így a pillek megtörik)
// Két stílus, a Glass panelen váltható: 0 = Fényszalag (alap), 1 = Üveg. A zenei reakciót az audio.js számolja.
import { S } from './config.js';
import { scene, onLayer, LAYER_BG, U } from './scene.js';
import { damp } from './util.js';
import { wavesRise, beamIn } from './entrance.js';
import { fullscreenVS } from './shaders/fullscreen.js';
import { waveFS } from './shaders/waves.js';

export const WU = { uTime: { value: 0 }, uAmp: { value: 0 }, uPush: { value: 0 }, uGain: { value: 1 }, uReact: { value: 1.2 }, uBeat: { value: 0 }, uRes: U.uRes, uBands: { value: [0, 0, 0, 0, 0, 0] }, uFlowY: { value: 0 }, uStyle: { value: 0 }, uShift: { value: 0 },
  uPalA: { value: [0, 1, 2].map(() => new THREE.Vector3(0.95, 0.96, 1.0)) }, uPalB: { value: [0, 1, 2].map(() => new THREE.Vector3(0.95, 0.96, 1.0)) }, uColFront: { value: 1.2 }, uRise: { value: 0 }, uFlash: { value: 0 }, uBeam: { value: 0 }, uBeamS: { value: 1 }, uBeamH: { value: 0 }, uLoud: { value: 1 } };
const waveMat = new THREE.ShaderMaterial({
  uniforms: WU, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  extensions: { derivatives: true },
  vertexShader: fullscreenVS,
  fragmentShader: waveFS,
});
const waveQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), waveMat);
waveQuad.frustumCulled = false; waveQuad.renderOrder = -1;
scene.add(onLayer(waveQuad, LAYER_BG));

/* ---------- Középre eltolás ----------
   A Középre csúszka értéke × shiftK; nyitott projekt-aloldalnál shiftK → 0, így a szalagok finoman kiúsznak a szélekre */
let shiftK = 1, shiftTarget = 1;
export function setWavesCentered(on) { shiftTarget = on ? 1 : 0; }
/* ---------- Fénycsóva: alulról felnő, miután a pillek megérkeztek, és fényt ad nekik ----------
   Lassan lélegzik (BREATH s: fényerő és magasság kicsit nő, majd visszahúzódik). Zenére: ha halkul, gyengébb a fénye
   (uLoud, az audio.js simítja lassan, így nem villog). A projekt-aloldalon kihalványul. */
const BREATH = 6.5, BEAM_TOP = 0.8;   // BEAM_TOP: a csúcs magassága a képernyő magasságához (Figma: ~80%)
const BEAM_RETRACT = 0.9;             // kattintásra ennyi idő alatt húzódik vissza fentről lefelé (s), visszalépéskor ugyanígy nő fel
let breathT = 0, beamP = 1;           // beamP: 1 = kint van, 0 = visszahúzódott (projekt-aloldal)
export function updateWaves(dt) {
  updateWaveColor(dt);
  shiftK = damp(shiftK, shiftTarget, 2.2, dt);
  breathT += dt;
  const b = 0.5 - 0.5 * Math.cos(breathT / BREATH * Math.PI * 2);   // 0 → 1 → 0, sima
  // projekt nyitásakor a csúcs fentről lefelé visszahúzódik, visszalépéskor alulról újra felnő (simított, egyenletes ütemben)
  beamP = Math.max(0, Math.min(1, beamP + (shiftTarget > 0.5 ? 1 : -1) * dt / BEAM_RETRACT));
  const ret = beamP * beamP * (3 - 2 * beamP);
  const grow = beamIn() * ret;                                       // belépés: 0 → 1
  WU.uBeam.value = (S.beam / 100) * (0.78 + 0.22 * b) * WU.uLoud.value * Math.min(1, grow * 1.6);
  WU.uBeamH.value = BEAM_TOP * (1 - Math.pow(1 - grow, 3));         // alulról felnő, kattintásra fentről lefelé visszahúzódik
  WU.uBeamS.value = 0.96 + 0.06 * b;
  U.uLit.value = 0.3 + 0.7 * beamIn();                               // a pillek a fénytől válnak láthatóvá (belépéskor)
  U.uBeamI.value = WU.uBeamH.value > 0.001 ? WU.uBeam.value : 0;   // az üvegben elmosott sáv (glass.js)
  U.uBeamA.value = WU.uBeamH.value * WU.uBeamS.value;
  WU.uRise.value = wavesRise();   // belépés: a szalagok alulról úsznak fel (a pillekkel együtt)
  WU.uShift.value = S.wshift / 100 * 1.4 * shiftK;   // ~70 → a szalagok épp a pillek széléig érnek (a shader a képarányhoz igazítja)
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
