// Hullámok a két szélen: teljes képernyős 2D shader, az üveg mögött (a render targetbe kerül, így a pillek megtörik)
// Két stílus, a Glass panelen váltható: 0 = Fényszalag (alap), 1 = Üveg. A zenei reakciót az audio.js számolja.
import { scene, onLayer, LAYER_BG, U } from './scene.js';
import { fullscreenVS } from './shaders/fullscreen.js';
import { waveFS } from './shaders/waves.js';

export const BANDS = 64;
export const specData = new Uint8Array(BANDS * 4);
export const specTex = new THREE.DataTexture(specData, BANDS, 1, THREE.RGBAFormat);
specTex.magFilter = THREE.LinearFilter; specTex.minFilter = THREE.LinearFilter; specTex.needsUpdate = true;
export const WU = { uTime: { value: 0 }, uAmp: { value: 0 }, uHalfW: { value: 10 }, uHalfH: { value: 6 }, uPush: { value: 0 }, uSpec: { value: specTex }, uGain: { value: 1 }, uReact: { value: 1.2 }, uBeat: { value: 0 }, uRes: U.uRes, uBands: { value: [0, 0, 0, 0, 0, 0] }, uFlowY: { value: 0 }, uStyle: { value: 0 } };
const waveMat = new THREE.ShaderMaterial({
  uniforms: WU, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  extensions: { derivatives: true },
  vertexShader: fullscreenVS,
  fragmentShader: waveFS,
});
const waveQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), waveMat);
waveQuad.frustumCulled = false; waveQuad.renderOrder = -1;
scene.add(onLayer(waveQuad, LAYER_BG));
