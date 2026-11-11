// A Vissza gomb üvege (Patrik: olyan legyen, mint a többi gomb): ugyanaz az SDF liquid glass shader rajzolja, mint a
// lejátszót és a névjegy-blobot (playerFS), egyetlen pill alakzattal a gomb helyén, a profil-kör magasságában.
// Hoverre a kurzor rugósan a gomb formáját veszi fel: a kis gyűrűből a gomb köré
// simuló vékony fénykörvonal lesz, ami kicsit a kurzor felé húzódik; elhagyva visszaugrik kurzorrá (Patrik).
import { scene, onLayer, LAYER_PL, rt, U, bufSize } from './scene.js';
import { setCursorMagnet, setCursorDim, cursorHead } from './cursor.js';
import { fullscreenVS } from './shaders/fullscreen.js';
import { playerFS } from './shaders/player.js';

// több gomb is kaphat ilyen üveget (Vissza, GET IN TOUCH): a kurzor akkor rejtett, ha bármelyiken áll
let magnets = 0;
function magnetOn(d) { magnets = Math.max(0, magnets + d); setCursorMagnet(magnets > 0); }


/* ---------- a kurzor egy elem formájában ----------
   Hoverre a kurzor rugósan az elem formáját veszi fel (a sarok a rövidebb oldal fele: kör vagy pill): a kis gyűrűből az
   elem köré simuló vékony fénykörvonal lesz, ami kicsit a kurzor felé húzódik; elhagyva visszaugrik kurzorrá.
   A visszaadott függvény: (dt, cél-téglalap a képernyőn | null, átlátszóság, azonnal = false); opts.k: a vonal ereje,
   opts.pad: távolság az elemtől (px). */
let mx = -9999, my = -9999;
window.addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
const ringFS = /* glsl */`
  precision highp float;
  uniform vec4 uRect;                              // a forma (pixel, alulról), sarok = a rövidebb oldal fele
  uniform float uScale, uA, uHalo;
  float sdRB(vec2 p, vec4 r) {
    vec2 h = r.zw * 0.5, c = r.xy + h;
    float rad = min(h.x, h.y);
    vec2 q = abs(p - c) - h + rad;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rad;
  }
  void main() {
    vec2 p = gl_FragCoord.xy;
    float d = sdRB(p, uRect), lw = max(1.1, uScale * 1.1);
    float ring = exp(-pow(d / lw, 2.0));                                        // hajszálvékony, mint a kurzor gyűrűje
    float halo = exp(-max(d, 0.0) / (uScale * 9.0)) * step(0.0, d) * uHalo;     // kívül halvány fényudvar
    float la = clamp(ring * 0.9 + halo, 0.0, 1.0);
    if (la * uA < 0.002) discard;
    gl_FragColor = vec4(vec3(0.93, 0.96, 1.0), la * uA);
  }`;
export function cursorRing(opts = {}) {
  const K = opts.k ?? 1, PAD = opts.pad ?? 4;
  const ru = { uRect: { value: new THREE.Vector4() }, uScale: { value: 1 }, uA: { value: 0 }, uHalo: { value: opts.halo ?? 0.14 } };
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: ru, transparent: true, depthTest: false, depthWrite: false, vertexShader: fullscreenVS, fragmentShader: ringFS,
  }));
  ring.frustumCulled = false; ring.renderOrder = 10; ring.visible = false;
  scene.add(onLayer(ring, LAYER_PL));
  let m = 0, mv = 0, magnet = false, last = null;    // m: 0 = kurzor (kis gyűrű), 1 = az elem formája
  return function (dt, r, a = 1, now = false) {
    if (now) { if (magnet) { magnet = false; magnetOn(-1); } ring.visible = false; m = mv = 0; last = null; return; }
    const want = r ? 1 : 0;
    if (r) last = r;
    if (want && !magnet) { magnet = true; magnetOn(1); }
    mv += ((want - m) * 230 - mv * 21) * dt; m += mv * dt;
    if (!want && magnet && m < 0.06) { magnet = false; magnetOn(-1); }
    const vis = (magnet || m > 0.02) && last;
    ring.visible = !!vis;
    if (!vis) return;
    const sc = bufSize.x / innerWidth, q = last;
    const hd = cursorHead(), rc = 0.02 * innerHeight, cx = q.left + q.width / 2, cy = q.top + q.height / 2;
    const px = want ? mx : hd.x, py = want ? my : hd.y;            // kicsiben a kurzornál
    const pull = 0.06;                                              // a körvonal az elem köré simul, kicsit a kurzor felé húzódik
    const bx = q.left - PAD + (mx - cx) * pull, by = q.top - PAD + (my - cy) * pull, bw = q.width + 2 * PAD, bh = q.height + 2 * PAD;
    const k = Math.max(0, m), L = (u, v) => u + (v - u) * k;
    const x0 = L(px - rc, bx), y0 = L(py - rc, by), w = Math.max(2, L(2 * rc, bw)), h = Math.max(2, L(2 * rc, bh));
    ru.uRect.value.set(x0 * sc, bufSize.y - (y0 + h) * sc, w * sc, h * sc);
    ru.uScale.value = sc;
    ru.uA.value = a * K * (magnet ? 1 : Math.min(1, m / 0.06));
  };
}

// btn: a DOM-gomb (a helyét, méretét és az átlátszóságát kockánként innen olvassuk); opts.onFrame(uniformok, hover, dt)
export function glassButton(btn, opts = {}) {
  const rects = [0, 1, 2, 3, 4, 5, 6].map(() => new THREE.Vector4());
  const cu = {
    uBg: { value: rt.texture }, uRes: U.uRes, uR: { value: rects }, uBox: { value: new THREE.Vector4() }, uScale: { value: 1 }, uK: { value: 12 }, uAlpha: { value: 0 }, uClear: { value: 1 }, uGrad: { value: 0 }, uRimGlow: { value: 0 },
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
  btn.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') over = true; });
  btn.addEventListener('pointerleave', () => { over = false; });
  // billentyűs fókusz csak Tab után szürkít (a projekt nyitásakor a gomb magától is fókuszt kap: az ne látsszon)
  let tabbed = false;
  window.addEventListener('keydown', e => { if (e.key === 'Tab') tabbed = true; });
  window.addEventListener('pointerdown', () => { tabbed = false; }, { passive: true });

  const ringTo = cursorRing();

  return function update(dt) {
    const shown = btn.getClientRects().length > 0;                          // a projekt-réteg rejtve: nincs gomb
    const op = shown ? parseFloat(getComputedStyle(btn).opacity) || 0 : 0;
    a += (op - a) * Math.min(1, dt * 12);
    quad.visible = a > 0.003;
    if (!quad.visible) { ringTo(dt, null, 0, true); return; }
    hov += ((over || (tabbed && document.activeElement === btn) ? 1 : 0) - hov) * Math.min(1, dt * 8);
    // hoverre a peremen derengés (mint a GET IN TOUCH-on), a közepe tiszta marad; nem szürkül be (Patrik)
    cu.uRimGlow.value = hov; cu.uClear.value = 1 - 0.12 * hov;
    if (opts.onFrame) opts.onFrame(cu, hov, dt);
    const r = btn.getBoundingClientRect(), sc = bufSize.x / innerWidth;
    const X = r.left * sc, W = r.width * sc, H = r.height * sc, Y = bufSize.y - r.top * sc - H;
    rects[0].set(X, Y, W, H);
    const mg = 64 * sc;                                             // a külső ragyogás is beleférjen
    cu.uBox.value.set(X - mg, Y - mg, X + W + mg, Y + H + mg);
    cu.uScale.value = sc;
    cu.uAlpha.value = a;
    // kurzor → gomb forma (rugós, elhagyva vissza kurzorrá)
    ringTo(dt, over && a > 0.5 ? r : null, a);
  };
}

export const backUpdate = glassButton(document.getElementById('projectBack'));
export const touchUpdate = glassButton(document.getElementById('pjTouch'));

/* ---------- a lejátszó és a névjegy kis gombjai: a kurzor ezek formáját is felveszi (Patrik), visszafogottabban ----------
   (a vonal halványabb és közelebb simul, hogy lássuk, hol vagyunk, de ne legyen zavaró) */
// Patrik: itt csak halványan látszódjon, hol vagyunk: vékony, halvány körvonal fényudvar nélkül
const iconRing = cursorRing({ k: 0.3, pad: 2, halo: 0 });
let iconOver = null;
document.querySelectorAll('.ct-ic, .cb, .spk, .ct-av').forEach(el => {
  el.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') iconOver = el; });
  el.addEventListener('pointerleave', () => { if (iconOver === el) iconOver = null; });
});
export function iconsUpdate(dt) {
  let r = null;
  if (iconOver) {
    const cs = getComputedStyle(iconOver);
    if (cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.5 && iconOver.getClientRects().length) r = iconOver.getBoundingClientRect();
    else iconOver = null;
  }
  iconRing(dt, r, 1);
  setCursorDim(document.querySelector('.pl:hover, .ct:hover') ? 0.4 : 1);   // a lejátszó / névjegy fölött a kurzor is halványabb
}
