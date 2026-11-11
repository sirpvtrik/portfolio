// Hero (Patrik, Figma: Desktop – 22, node 296-12): a betöltő után a logó középen marad, és lámpaként fényt vet a sötétben
// álló szövegre: bal lent „DARKNESS IS / MY BRIGHTNESS”, jobb fent „MADARÁSZ PATRIK / GRAPHIC DESIGNER”.
// A fény „isteni sugarak” (god rays; Patrik referenciája: madebyigor.com/lab): a fényforrás a logó mögött van, a logó réseiből
// szemcsés fénynyalábok törnek ki a levegőbe, a kurzor felé legyezőben. A betűk tiszta üvegből vannak: a testük sötét, csak
// éles élfények csillannak rajtuk, és a rajtuk átmenő nyalábok elhajlanak (enyhe színszórással). Először a fény magától egyszer
// végigsöpör a nagy szövegen, utána a kurzor felé fordul (érintésnél lassan pásztáz, húzással irányítható). Görgetésre / kattintásra / lefelé nyílra a fény lefordul,
// a szöveg elhalványul, a logó felúszik a fejlécbe, és alulról jönnek a pillek. A fejléc logójára kattintva vissza.
// A szöveget (piros csatorna) és a logót (zöld csatorna) egy vászonra rajzoljuk; a sugarakat a logó-maszkból sugárirányú
// összegzéssel, a betűk peremét a szöveg-maszk gradienséből számolja a shader.
import { scene, onLayer, LAYER_BG, bufSize } from './scene.js';
import { fullscreenVS } from './shaders/fullscreen.js';
import { setAway, markLit, clearLit } from './entrance.js';
import { mode } from './pills.js';
import { damp } from './util.js';
import { LOGO_PATHS } from './config.js';

const I = window.MPIntro || null;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touchUI = matchMedia('(hover: none)').matches;

/* ---------- a szöveg maszkja (vászon) ---------- */
const cv = document.createElement('canvas');
const tex = new THREE.CanvasTexture(cv);
tex.generateMipmaps = true;
tex.minFilter = THREE.LinearMipmapLinearFilter;
tex.magFilter = THREE.LinearFilter;
let layout = null;                               // a sorok helye (CSS-pixel): a fény söpréséhez
let fontOk = false;

function drawText() {
  const W = innerWidth, H = innerHeight, dpr = Math.min(1.5, devicePixelRatio || 1);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  const g = cv.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#f00';                          // a szöveg a piros csatornában
  g.textBaseline = 'alphabetic';
  const FONT = "'Nohemi', 'Archivo', sans-serif";
  // Figma (1440 × 1024): a nagy szöveg 96 px, 2 sor, 84 px-es sorköz, balra 40 px, alul 64 px; a szélesség mindig elfér
  g.font = `700 100px ${FONT}`;
  const unit = g.measureText('MY BRIGHTNESS').width / 100;
  const sH = Math.min(1.25, H / 1024);
  let F = 96 * sH;
  const left0 = 40 * Math.min(1, W / 1440);
  F = Math.min(F, (W - 2 * Math.max(20, left0)) / unit);
  const sF = F / 96, left = Math.max(20, 40 * sF), bottom = Math.max(28, 64 * sF), lh = 84 * sF;
  g.font = `700 ${F}px ${FONT}`;
  const cap = g.measureText('H').actualBoundingBoxAscent || F * 0.72;
  const b2 = H - bottom - (lh - cap) / 2, b1 = b2 - lh;
  g.textAlign = 'left';
  g.fillText('DARKNESS IS', left, b1);
  g.fillText('MY BRIGHTNESS', left, b2);
  const w1 = g.measureText('DARKNESS IS').width, w2 = g.measureText('MY BRIGHTNESS').width;
  // jobb fent: MADARÁSZ PATRIK (40 px) / GRAPHIC DESIGNER (32 px), jobbra zárva, 26 px-re a sarokból (mint a .ui)
  const F1 = Math.max(15, 40 * sF), F2 = Math.max(12, 32 * sF), pad = 26;
  g.textAlign = 'right';
  g.font = `700 ${F1}px ${FONT}`;
  const c1 = g.measureText('M').actualBoundingBoxAscent || F1 * 0.72;
  const t1 = pad + c1;
  g.fillText('MADARÁSZ PATRIK', W - pad, t1);
  const wT1 = g.measureText('MADARÁSZ PATRIK').width;
  g.font = `700 ${F2}px ${FONT}`;
  const c2 = g.measureText('M').actualBoundingBoxAscent || F2 * 0.72;
  const t2 = t1 + F2 * 0.28 + c2;
  g.fillText('GRAPHIC DESIGNER', W - pad, t2);
  // a logó a zöld csatornában, a hero-beli helyén (a képernyő közepén, 99,5 px-es doboz, viewBox: -4 -4 343 164; intro.js)
  const bw = 99.5, bh = bw * 164 / 343, k = bw / 343;
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.translate(W / 2 - bw / 2 + 4 * k, H / 2 - bh / 2 + 4 * k); g.scale(k, k);
  g.fillStyle = '#0f0';
  LOGO_PATHS.forEach(d => g.fill(new Path2D(d)));
  g.restore();
  layout = {
    main: { x0: left, x1: left + Math.max(w1, w2), y: (b1 + b2) / 2 - cap / 2 },
    top: { x0: W - pad - wT1, x1: W - pad, y: (t1 + t2) / 2 - c1 / 2 },
    s: sF,
  };
  tex.needsUpdate = true;
}

/* ---------- shader: isteni sugarak a logóból, üveg betűk ---------- */
const HU = {
  uTex: { value: tex }, uRes: { value: new THREE.Vector2(1, 1) }, uLamp: { value: new THREE.Vector2() }, uLogo: { value: new THREE.Vector2() },
  uOn: { value: 0 }, uA: { value: 0 }, uLift: { value: 0 }, uS: { value: 1 }, uReach: { value: 600 },
  uGlass: { value: 0 }, uBoxC: { value: new THREE.Vector2() }, uMaskC: { value: new THREE.Vector2() }, uLogoK: { value: 1 },
};
const heroFS = /* glsl */`
  precision highp float;
  uniform sampler2D uTex;
  uniform vec2 uRes, uLamp, uLogo;
  uniform float uOn, uA, uLift, uS, uReach;
  uniform float uGlass;          // 1 = üveg betűk, 0 = sima fehér betűk (Glass panel „Hero: üveg betűk”)
  uniform vec2 uBoxC, uMaskC;    // a logó-doboz mostani közepe és a maszkon rajzolt helye (a logó a betöltő után még kicsinyedik)
  uniform float uLogoK;          // a maszkon rajzolt logó / a mostani logó mérete
  float T(vec2 p, float b) { return texture2D(uTex, p / uRes, b).r; }       // a szöveg (p: puffer-pixel, alulról)
  float G(vec2 p, float b) { return texture2D(uTex, p / uRes, b).g; }       // a logó
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  // isteni sugarak: a pontból a fényforrás (a logó mögött) felé lépkedve összegyűjtjük, mennyi logón megy át a sugár;
  // a logó betűi közti réseken átjutó fény nyalábokká áll össze. j: pontonkénti véletlen eltolás (szemcse, nincs sávosodás)
  float rays(vec2 p, float j, float n) {
    vec2 d = uLamp - p;
    float s = 0.0;
    for (int i = 0; i < 40; i++) {
      if (float(i) >= n) break;
      vec2 sp = p + d * ((float(i) + j) / n);
      s += G(uMaskC + (sp - uBoxC) * uLogoK, 0.5);                  // a maszk a logó mostani helyére és méretére igazítva
    }
    float L = length(p - uLogo);
    return s / n * 6.5 / (1.0 + pow(L / uReach, 1.6)) * uOn;
  }
  void main() {
    vec2 p = gl_FragCoord.xy;
    vec2 q = p - vec2(0.0, uLift);                                   // a szöveg (kilépéskor felfelé úszik)
    float j = hash(p);
    float ra = rays(p, j, 40.0);
    vec3 tint = vec3(0.93, 0.95, 1.0);
    // a levegőben: a nyalábok, finom szemcsével (mint a referencián)
    vec3 air = ra * tint * (0.7 + 0.3 * hash(p * 1.37 + 3.1));
    // üveg betűk
    float a = T(q, 0.0);
    vec3 txt = vec3(0.0);
    if (uGlass < 0.5) {
      // sima fehér betűk: a sötétben alig látszanak, ahol a nyaláb éri őket, kivilágosodnak
      txt = vec3(a * (0.08 + 1.9 * ra));
      air *= 1.0 - a;
    } else if (a > 0.003 || T(q, 2.0) > 0.003) {
      float e = 1.5 * uS;
      vec2 g = vec2(T(q + vec2(e, 0.0), 0.8) - T(q - vec2(e, 0.0), 0.8), T(q + vec2(0.0, e), 0.8) - T(q - vec2(0.0, e), 0.8));
      float gl = length(g);
      vec2 n = gl > 1e-4 ? g / gl : vec2(0.0);                      // befelé, a betű közepe felé
      float rim = clamp(gl * 1.6, 0.0, 1.0) * smoothstep(0.1, 0.55, a);   // keskeny él a betű peremén, belül
      vec2 toL = normalize(uLamp - p);
      float face = max(0.0, dot(-n, toL)), back = max(0.0, dot(n, toL));
      // a test sötét, tiszta üveg: a rajta átmenő nyalábok elhajlanak (a mélyebb részen jobban), színenként kicsit másképp
      float depth = 1.0 - T(q, 3.0);
      vec2 o = n * (6.0 + 14.0 * depth) * uS;
      vec3 refr = vec3(rays(p + o, j, 20.0), rays(p + o * 1.18, j, 20.0), rays(p + o * 1.36, j, 20.0));
      txt += a * refr * 1.3;
      // élfények: a fény felé néző él erősen csillan, a túloldali gyengébben (belső visszaverődés); sötétben is halványan látszik
      txt += rim * (ra * (5.0 * pow(face, 2.0) + 14.0 * pow(face, 10.0) + 1.6 * back) + 0.05);   // + éles csillanás
      // a betű a mögötte lévő levegő-nyalábot eltakarja (helyette a megtört fény látszik)
      air *= 1.0 - a;
    }
    vec3 col = air + txt * uA;
    col = 1.0 - exp(-col * 1.15);                                   // lágy telítődés
    gl_FragColor = vec4(col, 1.0);
  }`;
const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: HU, vertexShader: fullscreenVS, fragmentShader: heroFS,
  transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
}));
mesh.frustumCulled = false; mesh.renderOrder = 50; mesh.visible = false;
scene.add(onLayer(mesh, LAYER_BG));

/* ---------- állapot ---------- */
let state = 'wait';           // wait → in (a betöltő után) → out (kilépés) → off → back (visszatérés) → in …
let t = 0, on = 0, alpha = 0, lift = 0, away = 0, awayT = 0;
let ang = -Math.PI / 2, angT = -Math.PI / 2;     // a fénykúp iránya (a lámpából; képernyő-koordinátában, y lefelé)
let glassText = false;                            // üveg vagy sima fehér betűk (Patrik: „nézzük meg sima fehér texttel”)
try { glassText = localStorage.getItem('mpHeroGlass') === '1'; } catch (_) {}
let ptr = null, ptrT = -1e9, sweep = !reduced, outT = 0, inAt = 0;
const now = () => performance.now() / 1000;

if (I) {
  document.fonts && document.fonts.load("700 64px 'Nohemi'").then(() => { fontOk = true; drawText(); }, () => { fontOk = true; drawText(); });
  setTimeout(() => { if (!fontOk) drawText(); }, 2500);
  let rz = 0;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(drawText, 120); });
  window.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' && !e.buttons) return;
    ptr = { x: e.clientX, y: e.clientY }; ptrT = now();
    if (state === 'in' && t > 0.6) sweep = false;                 // ha a látogató megmozdítja, rögtön az övé a fény
  }, { passive: true });
  // kilépés: görgetés lefelé, lefelé nyíl / PageDown / szóköz / Enter, kattintás, felfelé húzás (érintés)
  let ty = null;
  const leave = () => { if (state === 'in' && now() - inAt > 0.6) { state = 'out'; outT = 0; } };   // valós időhöz mérve (a kockaidő korlátos)
  window.addEventListener('wheel', e => { if (state === 'in' && e.deltaY > 2) leave(); }, { passive: true });
  window.addEventListener('keydown', e => { if (state === 'in' && /^(ArrowDown|PageDown|Enter| )$/.test(e.key)) { e.preventDefault(); leave(); } });
  window.addEventListener('pointerdown', e => { ty = e.pointerType === 'touch' ? e.clientY : null; });
  window.addEventListener('pointerup', e => {
    if (state !== 'in') return;
    if (e.pointerType === 'touch') { if (ty != null && ty - e.clientY > 40) leave(); else if (ty != null && Math.abs(ty - e.clientY) < 8) leave(); }
    else if (!e.target.closest || !e.target.closest('.panel, .btn')) leave();
  });
  // vissza: a fejléc logójára kattintva (csak a toronyból, nyitott projektnél nem)
  const logoTop = document.getElementById('logoTop');
  logoTop.addEventListener('click', () => {
    if (!(state === 'off' || (state === 'out' && !I.heroOn)) || mode !== 'tower' || !I.hero) return;
    I.heroBack(); state = 'back'; t = 0; sweep = false; awayT = 1; clearLit();   // a hullámok egészben süllyednek le (front = 2)
  });
  // a Glass panel kapcsolója (localStorage: a következő betöltéskor is így marad)
  const chkG = document.getElementById('c-heroglass');
  if (chkG) {
    chkG.checked = glassText;
    chkG.addEventListener('change', () => { glassText = chkG.checked; try { localStorage.setItem('mpHeroGlass', glassText ? '1' : '0'); } catch (_) {} });
  }
  const chk = document.getElementById('c-hero');
  if (chk) {
    chk.checked = I.hero;
    chk.addEventListener('change', () => {
      I.hero = chk.checked;
      try { localStorage.setItem('mpHero', chk.checked ? '1' : '0'); } catch (_) {}
      if (!chk.checked && state === 'in') { state = 'out'; outT = 0; }
    });
  }
}

// a fény célpontja (CSS-pixel): söprés a nagy szövegen, utána a kurzor, nyugalomban a nagy szöveg közepe
function target(L) {
  const m = layout.main;
  const rest = { x: (m.x0 + m.x1) / 2, y: m.y };
  if (sweep) {
    const k = Math.min(1, Math.max(0, (t - 0.25) / 2.6)), e = k * k * (3 - 2 * k);
    if (t < 2.85) return { x: m.x0 - 40 + (m.x1 - m.x0 + 80) * e, y: m.y };
    sweep = false;
  }
  if (touchUI && (!ptr || now() - ptrT > 2.5)) {                 // érintés: lassan pásztáz a két szöveg között
    const s = Math.sin(t * 0.35);
    return s > -0.55 ? { x: rest.x + (m.x1 - m.x0) * 0.45 * Math.sin(t * 0.7), y: m.y } : { x: (layout.top.x0 + layout.top.x1) / 2, y: layout.top.y };
  }
  if (ptr && now() - ptrT < 8) return ptr;                       // a kurzor felé; 8 mp mozdulatlanság után vissza középre
  return rest;
}

export function updateHero(dt) {
  if (!I) return;
  if (state === 'wait') {
    if (!I.heroOn || !layout) { mesh.visible = false; return; }
    state = 'in'; t = 0; inAt = now();
  }
  t += dt;
  const L = I.heroLamp ? I.heroLamp() : { x: innerWidth / 2, y: innerHeight / 2, cy: innerHeight / 2, w: 99.5 };
  let tgtOn = 0, tgtA = 0;
  if (state === 'in' || state === 'back') {
    tgtOn = 1;                                                   // a betöltő végén rögtön indul a fény (Patrik), a logó kicsinyedése közben
    tgtA = 1;
    const T = target(L);
    angT = Math.atan2(T.y - L.y, T.x - L.x);
    if (state === 'back' && t > 0.6) { state = 'in'; inAt = now(); }
  } else if (state === 'out') {
    outT += dt;
    angT = Math.PI / 2;                                          // a fény lefelé fordul, a pillek felé
    tgtOn = 0; tgtA = 0;                                         // kattintásra a fény rögtön kialszik (Patrik: a logóval együtt fent maradt)
    if (outT > 0.25 && I.heroOn) { I.heroOut(); awayT = 0; markLit(); }
    if (outT > 1.4) state = 'off';
  } else if (state === 'off') { tgtOn = 0; tgtA = 0; }
  // szög: lágyan követ (a legrövidebb úton)
  let da = angT - ang; da -= Math.round(da / (2 * Math.PI)) * 2 * Math.PI;
  ang += da * (1 - Math.exp(-(state === 'out' ? 5 : sweep ? 9 : 4.5) * dt));
  on = damp(on, tgtOn, tgtOn > on ? 2.2 : (state === 'out' || state === 'off' ? 14 : 4), dt);
  if (state === 'out' && outT > 0.3) on = 0;                    // mire a logó elindul a fejlécbe, a fény már nem ég
  alpha = damp(alpha, tgtA, tgtA > alpha ? 3 : 3.5, dt);
  lift = damp(lift, state === 'out' || state === 'off' ? 70 : 0, 3, dt);
  away = damp(away, awayT, awayT > away ? 2.4 : 3, dt);
  setAway(Math.min(1, away));
  // a logó „felkapcsol”: halvány fényudvar körülötte, amíg ég a lámpa
  const box = document.getElementById('introLogo');
  if (box) box.style.filter = on > 0.02 ? `drop-shadow(0 0 ${(14 * on).toFixed(1)}px rgba(255,255,255,${(0.55 * on).toFixed(3)}))` : '';
  const vis = alpha > 0.002 || on > 0.002;
  mesh.visible = vis;
  if (!vis) return;
  const sc = bufSize.x / innerWidth;
  HU.uRes.value.set(bufSize.x, bufSize.y);
  // a fényforrás a logó mögött, a kurzorral átellenes oldalon: így a nyalábok a logóból a kurzor felé legyeznek
  const off = 0.75 * L.w;
  HU.uLogo.value.set(L.x * sc, bufSize.y - L.y * sc);
  HU.uLamp.value.set((L.x - Math.cos(ang) * off) * sc, bufSize.y - (L.y - Math.sin(ang) * off) * sc);
  HU.uOn.value = on; HU.uA.value = alpha; HU.uLift.value = lift * sc; HU.uS.value = sc * (layout ? layout.s : 1);
  HU.uReach.value = Math.max(innerWidth, innerHeight) * 0.75 * sc;
  HU.uBoxC.value.set(L.x * sc, bufSize.y - L.cy * sc);
  HU.uMaskC.value.set(innerWidth / 2 * sc, bufSize.y - innerHeight / 2 * sc);
  HU.uLogoK.value = 99.5 / Math.max(1, L.w);
  HU.uGlass.value = glassText ? 1 : 0;
}
