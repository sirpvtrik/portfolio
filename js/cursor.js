// A kurzor (Patrik, Figma: „kurzor”, node 240-275): üreges üveggyűrű, mindig legfelül (saját réteg, LAYER_CUR: nem
// kerül a képek, pillek mögé). A belseje a mögötte lévő kész képet kicsit nagyítva mutatja (a széle felé lencseként tör,
// enyhe színes szegéllyel), a perem felé fehéres, fagyott üveg-átmenettel, hajszálvékony fehér peremmel és halvány
// fényudvarral. Mozgás közben cseppként nyúlik a mozgás irányában, megállva rugósan visszaugrik kerekre. Kattintásra
// (lenyomva) a lyuk összeszűkül és fehérbe megy át, a perem behúzódik; elengedve rugósan visszanyílik.
// A nyom 6 pontja rugóval követi egymást (az első a kurzort, a többi az előzőt): ettől folyékony, nyúlós.
// Érintőképernyőn: húzás / görgetés közben az ujjat követi, elengedve elhalványul (a kis fénypont is).
import { WU } from './waves.js';
import { U, scene, onLayer, LAYER_CUR, curSnap, bufSize } from './scene.js';
import { fullscreenVS } from './shaders/fullscreen.js';
import { damp } from './util.js';

const N = 6;
const pts = Array.from({ length: N }, () => ({ x: -9999, y: -9999, vx: 0, vy: 0 }));
let tx = -9999, ty = -9999, inside = false, seen = false, isTouch = false, touching = false;
let energy = 0, base = 0, lastX = 0, lastY = 0, speed = 0, vx = 0, vy = 0, magnet = false;
// gombra érve a kurzor a gomb formáját veszi fel (js/backglass.js rajzolja): ilyenkor a gyűrű itt eltűnik
export function setCursorMagnet(v) { magnet = v; }
export const cursorHead = () => pts[0];             // a rugós fej (CSS px), innen indul a forma-váltás

/* ---------- a kurzor rajza (legfelső réteg) ---------- */
const curFS = /* glsl */`
  precision highp float;
  uniform sampler2D uTex;
  uniform vec4 uSnap;                              // a kimásolt négyzet: bal alsó sarok és méret (pufferpixel)
  uniform vec2 uCur, uCurV;                        // a fej helye (pixel, alulról) és sebessége
  uniform float uR, uB, uP;                        // sugár, láthatóság, lenyomás (0 → 1)
  vec3 snap(vec2 p) { return texture2D(uTex, clamp((p - uSnap.xy) / uSnap.zw, 0.001, 0.999)).rgb; }
  void main() {
    vec2 px = gl_FragCoord.xy, dc0 = px - uCur;
    // folyékony csepp: a mozgás irányában megnyúlik (a hátsó oldalán jobban), oldalt kicsit vékonyodik
    float sp = length(uCurV), H = uR / 0.02;
    vec2 mv = sp > 1.0 ? uCurV / sp : vec2(0.0, 1.0), pv = vec2(-mv.y, mv.x);
    float st = clamp(sp / (H * 2.2), 0.0, 0.7);
    float al = dot(dc0, mv), pe = dot(dc0, pv);
    al /= 1.0 + st * (al < 0.0 ? 1.5 : 0.45);
    pe *= 1.0 + st * 0.3;
    vec2 dc = mv * al + pv * pe;
    float d = length(dc);
    float R = uR * (1.0 - 0.16 * uP);              // lenyomva a perem behúzódik
    if (d > R * 2.2) discard;
    float lw = max(1.0, uR * 0.055);               // hajszálvékony perem
    float rr = d / R;
    // üveg: a közepe kicsit nagyít, a széle felé lencseként erősebben tör (enyhe színes szegéllyel)
    float m = 0.84 - 0.22 * pow(clamp(rr, 0.0, 1.0), 3.0), k = 0.035 * rr * rr;
    vec3 bg = vec3(snap(uCur + dc0 * (m - k)).r, snap(uCur + dc0 * m).g, snap(uCur + dc0 * (m + k)).b);
    // fehéres, fagyott üveg csak a perem belső szélén, keskeny sávban (Patrik: majdnem csak a belső széléhez érjen)
    float w = pow(smoothstep(0.7, 1.0, rr), 1.5) * 0.5;
    // lenyomva: a tiszta lyuk összeszűkül, a gyűrű fehérbe megy át
    float hole = mix(1.2, 0.12, uP);
    w = mix(w, 0.9, uP * smoothstep(hole * 0.6, hole, rr));
    vec3 cin = mix(bg, vec3(1.0), w);
    float inside = smoothstep(R + 0.6, R - 0.6, d);
    float ring = exp(-pow((d - R) / lw, 2.0));
    float halo = exp(-max(d - R, 0.0) / (R * 0.45)) * step(R, d) * 0.22;
    vec3 c = mix(vec3(1.0), cin, inside);
    float a = max(inside, halo);
    c = mix(c, vec3(1.0), clamp(ring, 0.0, 1.0));
    a = max(a, clamp(ring, 0.0, 1.0));
    gl_FragColor = vec4(c, a * uB);
  }`;
const CU = { uTex: { value: curSnap.tex }, uSnap: { value: new THREE.Vector4() }, uCur: { value: new THREE.Vector2(-9999, -9999) },
  uCurV: { value: new THREE.Vector2() }, uR: { value: 10 }, uB: { value: 0 }, uP: { value: 0 } };
const curMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: CU, transparent: true, depthTest: false, depthWrite: false, vertexShader: fullscreenVS, fragmentShader: curFS,
}));
curMesh.frustumCulled = false;
scene.add(onLayer(curMesh, LAYER_CUR));
let pressed = false, pr = 0, prv = 0;
window.addEventListener('pointerdown', () => { pressed = true; }, { passive: true });
window.addEventListener('pointerup', () => { pressed = false; }, { passive: true });
window.addEventListener('pointercancel', () => { pressed = false; }, { passive: true });
window.addEventListener('blur', () => { pressed = false; });

function move(e) {
  isTouch = e.pointerType === 'touch';
  tx = e.clientX; ty = e.clientY;
  if (!seen) { pts.forEach(p => { p.x = tx; p.y = ty; }); lastX = tx; lastY = ty; seen = true; }
  inside = true;
}
window.addEventListener('pointermove', move, { passive: true });
window.addEventListener('pointerdown', e => { move(e); if (e.pointerType === 'touch') touching = true; }, { passive: true });
window.addEventListener('pointerup', e => { if (e.pointerType === 'touch') touching = false; }, { passive: true });
window.addEventListener('pointercancel', () => { touching = false; }, { passive: true });
document.addEventListener('pointerleave', () => { inside = false; });
document.documentElement.addEventListener('mouseleave', () => { inside = false; });

export function updateCursor(dt) {
  if (!seen) return;
  // mozgás sebessége (px/s), simítva → energia: gyorsan felfut, lassan (~1 s alatt) lecseng, ha megáll
  const d = Math.hypot(tx - lastX, ty - lastY);
  lastX = tx; lastY = ty;
  speed = damp(speed, d / Math.max(dt, 1e-3), 10, dt);
  const target = Math.min(1, speed / 1400);
  energy = damp(energy, target, target > energy ? 6 : 1.1, dt);
  // a kurzor kis fénye: egérrel mindig látszik (ha az ablakban van), érintésnél csak húzás közben
  const ready = !window.MPIntro || window.MPIntro.t2 != null;   // a betöltő alatt nincs kurzor
  base = damp(base, ready && !magnet && (isTouch ? touching : inside) ? 1 : 0, magnet ? 30 : 4, dt);
  // rugós nyom: az első pont a kurzort, a többi az előzőt követi, egyre lazábban
  const H = innerHeight, dpr = WU.uRes.value.y / H;
  for (let i = 0; i < N; i++) {
    const p = pts[i], q = i === 0 ? { x: tx, y: ty } : pts[i - 1];
    const k = i === 0 ? 180 : 70 - i * 7, c = i === 0 ? 19 : 10;   // laza, kissé alulcsillapított rugók: a nyom ívben követ, hullámzik
    p.vx += ((q.x - p.x) * k - p.vx * c) * dt;
    p.vy += ((q.y - p.y) * k - p.vy * c) * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    WU.uCur.value[i].set(p.x * dpr, (H - p.y) * dpr);           // a shader pixelben, alulról mér
  }
  // a fej sebessége a gyűrű cseppszerű nyúlásához (pixel/s, a shader koordinátáiban), simítva
  vx = damp(vx, pts[0].vx * dpr, 12, dt); vy = damp(vy, -pts[0].vy * dpr, 12, dt);
  WU.uCurV.value.set(vx, vy);
  WU.uCurE.value = energy;
  U.uCurP.value.copy(WU.uCur.value[0]);              // az üveg pereme is elkapja (glass.js)
  U.uCurL.value = base * 0.35 + energy * 0.8;
  WU.uCurB.value = base;
  // a legfelső rétegen rajzolt kurzor
  prv += (((pressed ? 1 : 0) - pr) * 420 - prv * 26) * dt; pr += prv * dt;       // rugós lenyomás, pici túllendüléssel
  const hx = pts[0].x * dpr, hy = (H - pts[0].y) * dpr, S = curSnap.size;
  CU.uCur.value.set(hx, hy); CU.uCurV.value.set(vx, vy);
  CU.uR.value = H * 0.02 * dpr; CU.uB.value = base; CU.uP.value = Math.max(0, Math.min(1.1, pr));
  const W = bufSize.x, Hb = bufSize.y;
  const x0 = Math.max(0, Math.min(W - S, Math.round(hx - S / 2))), y0 = Math.max(0, Math.min(Hb - S, Math.round(hy - S / 2)));
  curSnap.pos.set(x0, y0); CU.uSnap.value.set(x0, y0, S, S);
  curSnap.on = !!curSnap.tex && base > 0.003 && W >= S && Hb >= S;
  curMesh.visible = curSnap.on;
}
