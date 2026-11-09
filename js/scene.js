// Renderer, kamera, render target, rétegek és a render loop
import { VIEW_N, PW, SP } from './config.js';
import { fullscreenVS, blitFS } from './shaders/fullscreen.js';

/* ---------- Renderer ---------- */
export const canvas = document.getElementById('gl');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputEncoding = THREE.LinearEncoding;
renderer.toneMapping = THREE.NoToneMapping;
renderer.setClearColor(0x000000, 1);

/* ---------- Rétegek ----------
   1 = háttér + címkék (render targetbe, ezt töri meg az üveg)
   2 = a pillek üvege, 3 = a render target kirajzolása (blit), 4 = a lejátszó üvege,
   5 = szöveg az üveg előlapján (az üveg után rajzolódik: a Frost nem mossa el, a perem nem töri meg, oldalról nem látszik)
   (a projekt-aloldal kártyái ugyanúgy az 1-es, 2-es és 5-ös rétegen vannak, mint a pillek)
   6 = a kurzor: mindig legfelül (Patrik: ne kerüljön a képek, pillek mögé); a kész kép kis darabját nagyítja (curSnap) */
export const LAYER_BG = 1, LAYER_GLASS = 2, LAYER_BLIT = 3, LAYER_PL = 4, LAYER_TEXT = 5, LAYER_CUR = 6;
// a kurzor üvegének: a kész kép egy négyzetét (a kurzor körül) minden kockában ide másoljuk, a kurzor ebből nagyít
export const curSnap = { size: 384, pos: new THREE.Vector2(), on: false, tex: null };
if (THREE.FramebufferTexture) {
  curSnap.tex = new THREE.FramebufferTexture(curSnap.size, curSnap.size, THREE.RGBAFormat);
  curSnap.tex.minFilter = curSnap.tex.magFilter = THREE.LinearFilter;
}
export const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
export const scene = new THREE.Scene();
export const onLayer = (obj, l) => { obj.layers.set(l); return obj; };

export const bufSize = new THREE.Vector2();
export const rt = new THREE.WebGLRenderTarget(4, 4, {
  samples: renderer.capabilities.isWebGL2 ? 4 : 0,
  minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
});

/* ---------- Közös üveg-uniformok (a pillek és a lejátszó is ezeket használja, a Glass panel állítja) ---------- */
export const U = {
  uBg: { value: rt.texture },
  uRes: { value: new THREE.Vector2(1, 1) },
  uRefr: { value: 1 }, uDisp: { value: 0.5 }, uFrost: { value: 0 },
  uSplay: { value: 1 }, uLightAng: { value: -45 }, uLightInt: { value: 0.8 }, uPulse: { value: 0 },
  uThick: { value: 1 },   // a perem vastagsága a Depth alapértékéhez képest (a fénytörés ezzel arányos)
  uRim: { value: 0.35 },  // a perem tükröződéseinek erőssége (Glass panel „Perem”)
  uGlowOn: { value: 1 },  // a Glass panel „Perem-glow” kapcsolója
  uCurP: { value: new THREE.Vector2(-9999, -9999) }, uCurL: { value: 0 },   // az egérfény (js/cursor.js): a perem elkapja
  uLensW: { value: 0.62 },   // a lencse-sáv szélessége (a pilleken; a projekt-test sajátot kap)
  uReal: { value: 1 },    // élethű üveg (teszt, Glass panel): a pilleken éles stúdió-tükröződések, Fresnel szerint
  uFace: { value: 1 }, uBackK: { value: 1 }, uSpecK: { value: 1 },   // a sík lap tükröződése / a belső hátlap fénye (a henger-test sajátot kap)
};

// a render target kirajzolása a képernyőre (így a háttér csak egyszer számolódik)
const blitQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: { uTex: { value: rt.texture }, uRes: U.uRes },
  depthTest: false, depthWrite: false,
  vertexShader: fullscreenVS,
  fragmentShader: blitFS,
}));
blitQuad.frustumCulled = false;
scene.add(onLayer(blitQuad, LAYER_BLIT));

/* ---------- Méretezés ---------- */
export let visH = 10;   // a látható magasság a pillek síkjában (a húzás ezzel számol)
let camDist = 20, camLift = 1.4;   // a pilleknél kicsit felülről néz; a projekt-aloldalon egyenesen (setCameraLift)
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  renderer.getDrawingBufferSize(bufSize);
  rt.setSize(bufSize.x, bufSize.y);
  U.uRes.value.copy(bufSize);
  camera.aspect = w / h;
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const needH = VIEW_N * SP + 0.9, needW = PW + 1.2;   // 7 pill fér be, mint eddig; a többi görgetéssel jön
  const dist = Math.max(needH / 2 / t, needW / 2 / (t * camera.aspect));
  camDist = dist;
  camera.position.set(0, camLift, dist);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  visH = 2 * dist * t;
}
window.addEventListener('resize', resize);
export function setCameraLift(y) {
  camLift = y;
  camera.position.set(0, y, camDist);
  camera.lookAt(0, 0, 0);
}
resize();

/* ---------- Render loop ---------- */
const clock = new THREE.Clock();
function render() {
  // 1) háttér + címkék → render target (ezt töri meg az üveg)
  camera.layers.set(LAYER_BG);
  renderer.setRenderTarget(rt);
  renderer.render(scene, camera);
  // 2) a kész háttér kirajzolása a képernyőre
  renderer.setRenderTarget(null);
  camera.layers.set(LAYER_BLIT);
  renderer.render(scene, camera);
  // 3) az üveg a tetejére, mélységgel
  camera.layers.set(LAYER_GLASS);
  renderer.autoClear = false;
  renderer.render(scene, camera);
  // 3b) a szöveg az üveg előlapján (mélységteszttel: amit egy elöl lévő pill takar, az nem látszik)
  camera.layers.set(LAYER_TEXT);
  renderer.render(scene, camera);
  // 4) a lejátszó liquid glass blobja
  camera.layers.set(LAYER_PL);
  renderer.render(scene, camera);
  // 5) a kurzor legfelül: előbb a kész kép darabja a kurzor körül (ezt nagyítja az üvege)
  if (curSnap.on && curSnap.tex) {
    renderer.copyFramebufferToTexture(curSnap.pos, curSnap.tex);
    camera.layers.set(LAYER_CUR);
    renderer.render(scene, camera);
  }
  renderer.autoClear = true;
}
// update(dt): minden kockában a rajzolás előtt fut (animáció, zene, lejátszó)
export function startLoop(update) {
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    update(dt);
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
