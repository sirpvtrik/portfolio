// Hullámok a két szélen: teljes képernyős 2D shader, az üveg mögött (a render targetbe kerül, így a pillek megtörik)
// Két stílus, a Glass panelen váltható: 0 = Fényszalag (alap), 1 = Üveg. A zenei reakciót az audio.js számolja.
import { S } from './config.js';
import { scene, onLayer, LAYER_BG, U } from './scene.js';
import { damp } from './util.js';
import { fullscreenVS } from './shaders/fullscreen.js';
import { waveFS } from './shaders/waves.js';

export const WU = { uTime: { value: 0 }, uAmp: { value: 0 }, uPush: { value: 0 }, uGain: { value: 1 }, uReact: { value: 1.2 }, uBeat: { value: 0 }, uRes: U.uRes, uBands: { value: [0, 0, 0, 0, 0, 0] }, uFlowY: { value: 0 }, uStyle: { value: 0 }, uShift: { value: 0 } };
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
export function updateWaves(dt) {
  shiftK = damp(shiftK, shiftTarget, 2.2, dt);
  WU.uShift.value = S.wshift / 100 * 1.4 * shiftK;   // ~70 → a szalagok épp a pillek széléig érnek (a shader a képarányhoz igazítja)
}
