// A Vissza gomb üvege (Patrik: olyan legyen, mint a többi gomb): ugyanaz az SDF liquid glass shader rajzolja, mint a
// lejátszót és a névjegy-blobot (playerFS), egyetlen pill alakzattal a gomb helyén, a profil-kör magasságában.
// Hoverre a kurzor rugósan a gomb formáját veszi fel: a kis gyűrűből a gomb köré
// simuló vékony fénykörvonal lesz, ami kicsit a kurzor felé húzódik; elhagyva visszaugrik kurzorrá (Patrik).
import { scene, onLayer, LAYER_PL, rt, U, bufSize } from './scene.js';
import { setCursorMagnet, cursorHead } from './cursor.js';
import { fullscreenVS } from './shaders/fullscreen.js';
import { playerFS } from './shaders/player.js';

// több gomb is kaphat ilyen üveget (Vissza, GET IN TOUCH): a kurzor akkor rejtett, ha bármelyiken áll
let magnets = 0;
function magnetOn(d) { magnets = Math.max(0, magnets + d); setCursorMagnet(magnets > 0); }

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
  let a = 0, hov = 0, over = false, mx = 0, my = 0;
  btn.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') over = true; });
  btn.addEventListener('pointerleave', () => { over = false; });
  window.addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
  // billentyűs fókusz csak Tab után szürkít (a projekt nyitásakor a gomb magától is fókuszt kap: az ne látsszon)
  let tabbed = false;
  window.addEventListener('keydown', e => { if (e.key === 'Tab') tabbed = true; });
  window.addEventListener('pointerdown', () => { tabbed = false; }, { passive: true });

  /* ---------- a kurzor a gomb formájában ---------- */
  const ringFS = /* glsl */`
    precision highp float;
    uniform vec4 uRect;                              // a forma (pixel, alulról), sarok = a rövidebb oldal fele
    uniform float uScale, uA, uDisk;
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
      float halo = exp(-max(d, 0.0) / (uScale * 9.0)) * step(0.0, d) * 0.14;     // kívül halvány fényudvar
      float disk = smoothstep(lw, -lw, d) * uDisk * 0.85;                         // kicsiben a sötét belső korong
      float la = clamp(ring * 0.9 + halo, 0.0, 1.0);
      float al = max(la, disk);
      if (al * uA < 0.002) discard;
      gl_FragColor = vec4(vec3(0.93, 0.96, 1.0) * (la / max(al, 1e-3)), al * uA);
    }`;
  const ru = { uRect: { value: new THREE.Vector4() }, uScale: { value: 1 }, uA: { value: 0 }, uDisk: { value: 1 } };
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: ru, transparent: true, depthTest: false, depthWrite: false, vertexShader: fullscreenVS, fragmentShader: ringFS,
  }));
  ring.frustumCulled = false; ring.renderOrder = 10; ring.visible = false;
  scene.add(onLayer(ring, LAYER_PL));
  let m = 0, mv = 0, magnet = false;                   // m: 0 = kurzor (kis gyűrű), 1 = a gomb formája

  return function update(dt) {
    const shown = btn.getClientRects().length > 0;                          // a projekt-réteg rejtve: nincs gomb
    const op = shown ? parseFloat(getComputedStyle(btn).opacity) || 0 : 0;
    a += (op - a) * Math.min(1, dt * 12);
    quad.visible = a > 0.003;
    if (!quad.visible) { if (magnet) { magnet = false; magnetOn(-1); } ring.visible = false; m = mv = 0; return; }
    hov += ((over || (tabbed && document.activeElement === btn) ? 1 : 0) - hov) * Math.min(1, dt * 8);
    // hoverre a peremen derengés (mint a GET IN TOUCH-on), a közepe tiszta marad; nem szürkül be (Patrik)
  cu.uRimGlow.value = hov; cu.uClear.value = 1 - 0.12 * hov;
      if (opts.onFrame) opts.onFrame(cu, hov, dt);
    const r = btn.getBoundingClientRect(), sc = bufSize.x / innerWidth;
    const X = r.left * sc, W = r.width * sc, H = r.height * sc, Y = bufSize.y - r.top * sc - H;
    rects[0].set(X, Y, W, H);
    const mg = 30 * sc;
    cu.uBox.value.set(X - mg, Y - mg, X + W + mg, Y + H + mg);
    cu.uScale.value = sc;
    cu.uAlpha.value = a;
    // kurzor → gomb forma: rugóval (kis túllendüléssel), elhagyva vissza kis gyűrűvé, és a valódi kurzor újra megjelenik
    const want = over && a > 0.5 ? 1 : 0;
    if (want && !magnet) { magnet = true; magnetOn(1); }
    mv += ((want - m) * 230 - mv * 21) * dt; m += mv * dt;
    if (!want && magnet && m < 0.06) { magnet = false; magnetOn(-1); }
    const vis = magnet || m > 0.02;
    ring.visible = vis;
    if (vis) {
      const hd = cursorHead(), rc = 0.02 * innerHeight, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const px = want ? mx : hd.x, py = want ? my : hd.y;            // kicsiben a kurzornál
      const pad = 4, pull = 0.06;                                     // a körvonal a gomb köré simul, kicsit a kurzor felé húzódik
      const bx = r.left - pad + (mx - cx) * pull, by = r.top - pad + (my - cy) * pull, bw = r.width + 2 * pad, bh = r.height + 2 * pad;
      const k = Math.max(0, m), L = (u, v) => u + (v - u) * k;
      const x0 = L(px - rc, bx), y0 = L(py - rc, by), w = Math.max(2, L(2 * rc, bw)), h = Math.max(2, L(2 * rc, bh));
      ru.uRect.value.set(x0 * sc, bufSize.y - (y0 + h) * sc, w * sc, h * sc);
      ru.uScale.value = sc;
      ru.uDisk.value = 0;                                             // a kurzor már üreges üveg: nincs sötét korong
      ru.uA.value = a * (magnet ? 1 : Math.min(1, m / 0.06));
    }
  };
}

export const backUpdate = glassButton(document.getElementById('projectBack'));
export const touchUpdate = glassButton(document.getElementById('pjTouch'));
