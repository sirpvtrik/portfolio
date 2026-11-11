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
const LOGO_BW = 161.42;                          // a logó-doboz szélessége a hero-ban: a betöltő mérete (.intro-logo)
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  // Figma (Desktop – 22, 1440 × 1024): Nohemi Bold; a nagy szöveg 64 px, 2 sor, ~65 px-es sorköz, 26 px-re a bal alsó saroktól
  // (az utolsó sor alapvonala); jobb fent MADARÁSZ PATRIK / DESIGNER, mindkettő 24 px, 26 px-re a sarokból (mint a .ui)
  g.font = `700 100px ${FONT}`;
  const unit = g.measureText('MY BRIGHTNESS').width / 100;
  const pad = 26;
  let F = 64 * Math.min(1.25, H / 1024);
  const holdW = W <= 600 ? 0 : 170;                                // gépen jobb lent a HOLD TO START: a szöveg ne érjen bele
  F = Math.min(F, (W - 2 * pad - holdW) / unit);
  const sF = F / 64, lh = 65 * sF;
  g.font = `700 ${F}px ${FONT}`;
  const cap = g.measureText('H').actualBoundingBoxAscent || F * 0.72;
  const b2 = H - pad, b1 = b2 - lh;
  g.textAlign = 'left';
  g.fillText('DARKNESS IS', pad, b1);
  g.fillText('MY BRIGHTNESS', pad, b2);
  const w1 = g.measureText('DARKNESS IS').width, w2 = g.measureText('MY BRIGHTNESS').width;
  const F1 = Math.max(13, 24 * sF);
  g.textAlign = 'right';
  g.font = `700 ${F1}px ${FONT}`;
  const c1 = g.measureText('M').actualBoundingBoxAscent || F1 * 0.72;
  const t1 = pad + c1, t2 = t1 + F1 * 1.0;
  g.fillText('MADARÁSZ PATRIK', W - pad, t1);
  g.fillText('DESIGNER', W - pad, t2);
  const wT1 = g.measureText('MADARÁSZ PATRIK').width;
  const left = pad;
  // bal fent: PORTFOLIO 2026 (Figma: Nohemi Regular 20 px, 26 px-re a sarokból); a többi szöveggel együtt csak a fényben látszik
  g.textAlign = 'left';
  const F3 = Math.max(12, 20 * sF);
  g.font = `400 ${F3}px ${FONT}`;
  g.fillText('PORTFOLIO 2026', pad, pad + (g.measureText('P').actualBoundingBoxAscent || F3 * 0.72));
  // a logó a zöld csatornában, a hero-beli helyén (a képernyő közepén, a betöltő méretében, viewBox: -4 -4 343 164; intro.js)
  const bw = LOGO_BW, bh = bw * 164 / 343, k = bw / 343;
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
    float wt = 0.0;                                                  // a fehér betű takarása (0 = háttér, 1 = tiszta fehér)
    if (uGlass < 0.5) {
      // sima fehér betűk: a sötétben nem látszanak, ahol a nyaláb éri őket, kifehérednek
      wt = a * (1.0 - exp(-ra * 8.0));                            // a sötétben háttérszínű (Patrik: ne legyen szürke), a fényben tiszta fehér
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
    col = mix(col, vec3(1.0), wt * uA);                             // a fehér betű a telítődés után: nem szürkül
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
  // HOLD TO START (Patrik, Figma: Desktop – 22): nyomva tartva (egér vagy ujj, 2,5 s) a nyaláb visszahúzódik a logóba, és ha
  // végig kitart, a logó felúszik (kilépés); korábban elengedve a fény lágyan visszanő. Koppintás / kattintás / görgetés nem
  // léptet tovább (telefonon könnyű véletlenül hozzáérni). Billentyűzettel: Enter / szóköz / ↓ azonnal.
  const leave = () => { if (state === 'in' && now() - inAt > 0.6) { state = 'out'; outT = 0; } };   // valós időhöz mérve (a kockaidő korlátos)
  window.addEventListener('keydown', e => { if (state === 'in' && /^(ArrowDown|PageDown|Enter| )$/.test(e.key)) { e.preventDefault(); leave(); } });
  window.addEventListener('pointerdown', e => {
    if (state !== 'in' || (e.target.closest && e.target.closest('.panel, .btn'))) return;
    holding = true;
    if (e.pointerType === 'touch') { ptr = { x: e.clientX, y: e.clientY }; ptrT = now(); sweep = false; }   // az ujj felé fordul
  });
  const release = () => { holding = false; };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('blur', release);
  window.addEventListener('contextmenu', e => { if (state === 'in') e.preventDefault(); });   // telefonon a hosszú nyomás ne hozzon menüt
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
let idle = false, idleAng = 0, dtNow = 0, grow = 0;
let holding = false, hold = 0, lastReal = 0;                     // HOLD TO START: nyomva tartás (0 → 1 = 2,5 s)
const HOLD_S = 2.5;
const holdEl = document.getElementById('heroHold');
function target(L) {
  const m = layout.main;
  const rest = { x: (m.x0 + m.x1) / 2, y: m.y };
  if (sweep) {
    const k = Math.min(1, Math.max(0, (t - 0.25) / 2.6)), e = k * k * (3 - 2 * k);
    if (t < 2.85) return { x: m.x0 - 40 + (m.x1 - m.x0 + 80) * e, y: m.y };
    sweep = false;
  }
  // ha nem nyúlunk hozzá (3 mp óta nincs egér- / ujjmozdulat), a fény lassan körbeforog (~20 mp egy kör; Patrik); a kurzor
  // megmozdítására újra azt követi. Mozgáscsökkentésnél nem forog, a nagy szövegen marad.
  if (ptr && now() - ptrT < 3) { idle = false; return ptr; }
  if (reduced) return rest;
  if (!idle) { idle = true; idleAng = ang; }
  idleAng += dtNow * 0.32;
  return { x: L.x + Math.cos(idleAng) * 600, y: L.y + Math.sin(idleAng) * 600 };
}

export function updateHero(dt) {
  if (!I) return;
  if (state === 'wait') {
    if (!I.heroOn || !layout) { mesh.visible = false; return; }
    state = 'in'; t = 0; inAt = now();
  }
  t += dt;
  const L = I.heroLamp ? I.heroLamp() : { x: innerWidth / 2, y: innerHeight / 2, cy: innerHeight / 2, w: LOGO_BW };
  let tgtOn = 0, tgtA = 0;
  if (state === 'in' || state === 'back') {
    tgtOn = 1;                                                   // a betöltő végén rögtön indul a fény (Patrik)
    tgtA = 1;
    dtNow = dt;
    const T = target(L);
    angT = Math.atan2(T.y - L.y, T.x - L.x);
    if (state === 'back' && t > 0.6) { state = 'in'; inAt = now(); }
  } else if (state === 'out') {
    outT += dt;
    angT = Math.PI / 2;                                          // a fény lefelé fordul, a pillek felé
    tgtOn = 0; tgtA = 0;                                         // kattintásra a fény rögtön kialszik (Patrik: a logóval együtt fent maradt)
    if (outT > 0.25 && I.heroOn) { I.heroOut(); awayT = 0; markLit(); hold = 0; }
    if (outT > 1.4) state = 'off';
  } else if (state === 'off') { tgtOn = 0; tgtA = 0; }
  // szög: lágyan követ (a legrövidebb úton)
  let da = angT - ang; da -= Math.round(da / (2 * Math.PI)) * 2 * Math.PI;
  ang += da * (1 - Math.exp(-(state === 'out' ? 5 : sweep ? 9 : 4.5) * dt));
  // felkapcsolás: lassan, ~2,5 s alatt nő ki a fény a logóból (Patrik: „szépen lassan megnő, nem hirtelen”): az erőssége és
  // a hatótávja is fokozatosan nő; a kialvás továbbra is gyors
  if (state === 'in' || state === 'back') { grow = Math.min(1, grow + dt / 2.5); } else if (state === 'off') grow = 0;
  // nyomva tartás: a töltés nő, elengedve kétszer olyan gyorsan visszafut; ha betelt, kilépés
  const rt = now(), rdt = Math.min(0.25, rt - (lastReal || rt)); lastReal = rt;   // valós idő: minden gépen pontosan 2,5 s
  hold = state === 'in' && holding ? Math.min(1, hold + rdt / HOLD_S) : Math.max(0, hold - rdt * 2 / HOLD_S);
  if (state === 'in' && hold >= 1) { state = 'out'; outT = 0; holding = false; }
  if (holdEl) holdEl.style.setProperty('--hold', (state === 'in' ? hold : 0).toFixed(3));
  const pull = hold * hold * (3 - 2 * hold);                  // a nyaláb visszahúzódása a logóba
  const gE = grow * grow * (3 - 2 * grow) * (1 - pull);
  on = damp(on, tgtOn * (state === 'in' || state === 'back' ? gE : 1), tgtOn > on ? 6 : (state === 'out' || state === 'off' ? 14 : 4), dt);
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
  HU.uReach.value = Math.max(innerWidth, innerHeight) * 0.75 * sc * (0.12 + 0.88 * gE);   // a fény messzebbre nyúlik, ahogy nő (és visszahúzódik, ha nyomva tartják)
  HU.uBoxC.value.set(L.x * sc, bufSize.y - L.cy * sc);
  HU.uMaskC.value.set(innerWidth / 2 * sc, bufSize.y - innerHeight / 2 * sc);
  HU.uLogoK.value = LOGO_BW / Math.max(1, L.w);
  HU.uGlass.value = glassText ? 1 : 0;
}
