// A Vissza gomb üvege (Patrik: olyan legyen, mint a többi gomb): ugyanaz az SDF liquid glass shader rajzolja, mint a
// lejátszót és a névjegy-blobot (playerFS), egyetlen pill alakzattal a gomb helyén. Hoverre rugósan kicsit kidomborodik.
import { scene, onLayer, LAYER_PL, rt, U, bufSize } from './scene.js';
import { fullscreenVS } from './shaders/fullscreen.js';
import { playerFS } from './shaders/player.js';

const btn = document.getElementById('projectBack');
const rects = [0, 1, 2, 3, 4, 5, 6].map(() => new THREE.Vector4());
const cu = {
  uBg: { value: rt.texture }, uRes: U.uRes, uR: { value: rects }, uBox: { value: new THREE.Vector4() }, uScale: { value: 1 }, uK: { value: 12 }, uAlpha: { value: 0 },
  uRefr: U.uRefr, uDisp: U.uDisp, uFrost: U.uFrost, uSplay: U.uSplay, uLightAng: U.uLightAng, uLightInt: U.uLightInt,
};
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: cu, transparent: true, depthTest: false, depthWrite: false, vertexShader: fullscreenVS, fragmentShader: playerFS,
}));
quad.frustumCulled = false;
scene.add(onLayer(quad, LAYER_PL));

let hov = false, g = 0, gv = 0, a = 0;
btn.addEventListener('pointerenter', () => { hov = true; });
btn.addEventListener('pointerleave', () => { hov = false; });

export function backUpdate(dt) {
  const shown = btn.getClientRects().length > 0;                          // a projekt-réteg rejtve: nincs gomb
  const op = shown ? parseFloat(getComputedStyle(btn).opacity) || 0 : 0;
  a += (op - a) * Math.min(1, dt * 12);
  quad.visible = a > 0.003;
  if (!quad.visible) return;
  gv += (((hov ? 1 : 0) - g) * 260 - gv * 16) * dt; g += gv * dt;          // rugós kidomborodás, kis túllendüléssel
  const r = btn.getBoundingClientRect(), sc = bufSize.x / innerWidth, e = 3 * g;
  const X = (r.left - e) * sc, W = (r.width + 2 * e) * sc, H = (r.height + 2 * e) * sc, Y = bufSize.y - (r.top - e) * sc - H;
  rects[0].set(X, Y, W, H);
  const m = 30 * sc;
  cu.uBox.value.set(X - m, Y - m, X + W + m, Y + H + m);
  cu.uScale.value = sc;
  cu.uAlpha.value = a;
}
