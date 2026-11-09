// A Vissza gomb üvege (Patrik: olyan legyen, mint a többi gomb): ugyanaz az SDF liquid glass shader rajzolja, mint a
// lejátszót és a névjegy-blobot (playerFS), egyetlen pill alakzattal a gomb helyén, a profil-kör magasságában.
import { scene, onLayer, LAYER_PL, rt, U, bufSize } from './scene.js';
import { fullscreenVS } from './shaders/fullscreen.js';
import { playerFS } from './shaders/player.js';

const btn = document.getElementById('projectBack');
const rects = [0, 1, 2, 3, 4, 5, 6].map(() => new THREE.Vector4());
const cu = {
  uBg: { value: rt.texture }, uRes: U.uRes, uR: { value: rects }, uBox: { value: new THREE.Vector4() }, uScale: { value: 1 }, uK: { value: 12 }, uAlpha: { value: 0 }, uClear: { value: 1 },
  uRefr: U.uRefr, uDisp: U.uDisp, uFrost: U.uFrost, uSplay: U.uSplay, uLightAng: U.uLightAng, uLightInt: U.uLightInt,
};
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: cu, transparent: true, depthTest: false, depthWrite: false, vertexShader: fullscreenVS, fragmentShader: playerFS,
}));
quad.frustumCulled = false;
scene.add(onLayer(quad, LAYER_PL));

// alapból nincs szürke kitöltése (Patrik: ne hívja fel magára a figyelmet, hogy ne lépjenek vissza egyből), csak a tiszta
// üveg; hoverre / billentyűs fókuszra lágyan előjön a többi gomb szürke üvege
let a = 0, hov = 0, over = false;
btn.addEventListener('pointerenter', () => { over = true; });
btn.addEventListener('pointerleave', () => { over = false; });

export function backUpdate(dt) {
  const shown = btn.getClientRects().length > 0;                          // a projekt-réteg rejtve: nincs gomb
  const op = shown ? parseFloat(getComputedStyle(btn).opacity) || 0 : 0;
  a += (op - a) * Math.min(1, dt * 12);
  quad.visible = a > 0.003;
  if (!quad.visible) return;
  hov += ((over || btn.matches(':focus-visible') ? 1 : 0) - hov) * Math.min(1, dt * 10);
  cu.uClear.value = 1 - hov;
  const r = btn.getBoundingClientRect(), sc = bufSize.x / innerWidth;
  const X = r.left * sc, W = r.width * sc, H = r.height * sc, Y = bufSize.y - r.top * sc - H;
  rects[0].set(X, Y, W, H);
  const m = 30 * sc;
  cu.uBox.value.set(X - m, Y - m, X + W + m, Y + H + m);
  cu.uScale.value = sc;
  cu.uAlpha.value = a;
}
