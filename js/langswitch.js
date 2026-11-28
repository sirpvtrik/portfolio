// HU / EN váltó jobb alul (Patrik, Figma: Desktop – 20, node 279-391). Úgy működik, mint a lejátszó (js/player.js):
// csukva egy 60 px-es üvegkör az aktív nyelvvel (fehér korong nélkül: Patrik, „addig ne legyen kijelölve, amíg rá nem
// megyünk”); hoverre (érintésnél az első koppintásra) balra leválik egy második 60 px-es kör a másik nyelvvel, a kettő
// homorú nyakkal összeolvad (a Figma „Összeolvasztva” formája: két kerek csepp, nem pill), és az aktív nyelvre fehér
// korong kerül. A sorrend a Figma szerint EN | HU. Váltáskor a fehér korong folyadékként a keskeny nyakon át folyik
// át a másik körbe (Patrik: a nyak kicsi, simán átcsúszni nem tud): a fehér alakzat is SDF (forrás-kör + vándorló
// csepp + cél-kör, lágy unióval), az üveg belsejére vágva, így a nyakban vékony sugárrá szűkül.
// Az üveget a lejátszó shadere rajzolja (playerFS: a két kör); a DOM-elem szélessége a formáé, így a Glass gomb arrébb megy.
import { reduced } from './config.js';
import { scene, onLayer, LAYER_PL, rt, U, bufSize } from './scene.js';
import { fullscreenVS } from './shaders/fullscreen.js';
import { playerFS } from './shaders/player.js';
import { uiIn } from './entrance.js';
import { sst } from './player.js';
import { lang, setLang, onLang, tr } from './lang.js';

const lg = document.getElementById('lg');
const tFront = document.getElementById('lgFront'), tOther = document.getElementById('lgOther');
document.getElementById('lgKnob').remove();                 // a fehér korongot a shader rajzolja (folyadékként)
const btn = { en: lg.querySelector('[data-l="en"]'), hu: lg.querySelector('[data-l="hu"]') };
const D = 60, SEP = 75, RK = 25;                             // kör-átmérő, a két kör középpontjának távolsága nyitva, a fehér korong sugara

let target = 0, closeT = null;
let sep = 0, sv = 0;          // a bal kör távolsága a sarokkörtől (0 = csukva)
let f = lang() === 'en' ? 1 : 0, fv = 0;   // hol a fehér: 0 = a jobb (HU) kör, 1 = a bal (EN) kör
let shownW = -1, knobA = 0;
const labA = { front: 1, other: 0 };

function setOpen(v) {
  clearTimeout(closeT);
  target = v ? 1 : 0;
  lg.classList.toggle('open', v);
}
lg.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') setOpen(true); });
lg.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') { clearTimeout(closeT); closeT = setTimeout(() => setOpen(false), 380); } });
lg.addEventListener('focusin', () => setOpen(true));
lg.addEventListener('focusout', e => { if (!lg.contains(e.relatedTarget)) setOpen(false); });
document.addEventListener('pointerdown', e => { if (target && !lg.contains(e.target)) setOpen(false); });
Object.entries(btn).forEach(([l, b]) => b.addEventListener('click', () => {
  // érintésnél az első koppintás csak kinyit (a fókusz már nyitóparancsot ad, ezért a látható nyitottságot nézzük)
  if (!target || sep < 0.6 * SEP) { setOpen(true); return; }
  setLang(l);
}));

// a felület szövegei, amik a nyelvvel váltanak
const hint = document.querySelector('.hint');
const HINT = { hu: 'Görgess vagy húzd<br>Hangszóró → lejátszó', en: 'Scroll or drag<br>Speaker → player' };
function applyLang() {
  const l = lang();
  Object.entries(btn).forEach(([k, b]) => b.setAttribute('aria-pressed', String(k === l)));
  lg.setAttribute('aria-label', tr({ hu: 'Nyelv', en: 'Language' }));
  if (hint) hint.innerHTML = tr(HINT);
}
applyLang();
onLang(applyLang);

// a két kör üvege: a lejátszó shadere (a bal kör + a sarokkör)
const rects = [0, 1, 2, 3, 4, 5, 6].map(() => new THREE.Vector4());
const cu = {
  uBg: { value: rt.texture }, uRes: U.uRes, uR: { value: rects }, uBox: { value: new THREE.Vector4() }, uScale: { value: 1 }, uK: { value: 12 }, uAlpha: { value: 1 }, uClear: { value: 1 }, uGrad: { value: 0 }, uRimGlow: { value: 0 },   // a saját értékei (lásd player.js)
  uRefr: U.uRefr, uDisp: U.uDisp, uFrost: U.uFrost, uSplay: U.uSplay, uLightAng: U.uLightAng, uLightInt: U.uLightInt,
};
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: cu, transparent: true, depthTest: false, depthWrite: false, vertexShader: fullscreenVS, fragmentShader: playerFS,
}));
quad.frustumCulled = false;
scene.add(onLayer(quad, LAYER_PL));

// a fehér folyadék: forrás-kör, vándorló csepp és cél-kör lágy uniója, az üveg belsejére (5 px-rel beljebb) vágva
const whiteFS = /* glsl */`
  precision highp float;
  uniform vec4 uBox;
  uniform vec2 uCR, uCL, uCA, uCB, uH, uT;         // a két üvegkör, a fehér forrás / cél, a sugár eleje és vége (pufferpixel)
  uniform float uRG, uKG, uRA, uRB, uRT, uKW, uIn, uPx, uA;
  float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
  void main() {
    vec2 p = gl_FragCoord.xy;
    if (p.x < uBox.x || p.y < uBox.y || p.x > uBox.z || p.y > uBox.w) discard;
    float g = smin(length(p - uCR) - uRG, length(p - uCL) - uRG, uKG);     // az üveg formája (mint a playerFS-ben)
    float w = 1e5;
    if (uRA > 0.3) w = length(p - uCA) - uRA;
    if (uRB > 0.3) w = smin(w, length(p - uCB) - uRB, uKW);
    if (uRT > 0.3) {                                                        // a sugár: kapszula a vége (forrás) és az eleje (cél) között
      vec2 ba = uH - uT; float t = clamp(dot(p - uT, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
      w = smin(w, length(p - uT - ba * t) - uRT, uKW);
    }
    // az üveg belsejében marad. A körökben 5 px-rel beljebb; a nyakban az összeolvasztott forma SDF-je nem valódi távolság
    // (a tengelyen csak ~3 egység „mély”, pedig a nyak ~29 px magas), ezért ott kisebb a beljebb vágás: így a nyakban
    // ~12 px-es fehér sugár folyik át (Patrik: a köztes szakaszban különben eltűnt)
    float dc = min(length(p - uCR), length(p - uCL)) - uRG;                // a körökön kívül (a nyakban) pozitív
    float ins = mix(uIn, 0.42 * uIn, smoothstep(-1.6 * uIn, 1.2 * uIn, dc));
    w = -smin(-w, -(g + ins), 0.5 * uIn);                                  // lágy metszés: a falnál nincs csipke
    float fw = max(fwidth(w), 1e-3);                                        // élsimítás a képernyő-deriváltból (a nyakban a w lassan változik)
    float a = 1.0 - smoothstep(-0.7 * fw, 0.7 * fw, w);
    if (a * uA < 0.003) discard;
    vec3 c = vec3(0.863, 0.863, 0.871);                                     // #dcdcde, mint a hangerő-sáv
    float top = clamp((p.y - uCR.y) / (uRG * 2.0) + 0.5, 0.0, 1.0);
    c += 0.05 * top + 0.1 * (1.0 - smoothstep(0.0, 1.6 * fw, -w)) * step(uCR.y + 0.3 * uRG, p.y);   // finom felső él, mint a CSS inset fénynél
    gl_FragColor = vec4(min(c, 1.0), a * uA);
  }`;
const wu = {
  uBox: { value: new THREE.Vector4() }, uCR: { value: new THREE.Vector2() }, uCL: { value: new THREE.Vector2() }, uCA: { value: new THREE.Vector2() }, uCB: { value: new THREE.Vector2() }, uH: { value: new THREE.Vector2() }, uT: { value: new THREE.Vector2() },
  uRG: { value: 30 }, uKG: { value: 1 }, uRA: { value: 0 }, uRB: { value: 0 }, uRT: { value: 0 }, uKW: { value: 8 }, uIn: { value: 5 }, uPx: { value: 1 }, uA: { value: 0 },
};
const white = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: wu, transparent: true, depthTest: false, depthWrite: false, vertexShader: fullscreenVS, fragmentShader: whiteFS,
  extensions: { derivatives: true },
}));
white.frustumCulled = false; white.renderOrder = 5;
scene.add(onLayer(white, LAYER_PL));

// a két kör összeolvadása: közel egymáshoz kis lágyítás (különben a csukott kör felfúvódna), nyitva a Figma homorú nyaka
const kOf = s => Math.max(1, 42 * sst(8, SEP, s));
const mixC = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const LIGHT = [242, 242, 242], DARK = [1, 1, 1];

export function lgUpdate(dt) {
  // rugók: a bal kör csepp-szerűen kicsit túllendül; a fehér folyadék lassabban, lágyan folyik át
  const K = reduced ? 900 : 240, Dm = reduced ? 60 : 17, KF = reduced ? 900 : 90, DF = reduced ? 60 : 15;
  const steps = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / steps;
  const ts = target ? SEP : 0, tf = lang() === 'en' ? 1 : 0;
  for (let n = 0; n < steps; n++) {
    sv += ((ts - sep) * K - sv * Dm) * h; sep += sv * h;
    if (sep < 0) { sep = 0; sv = Math.max(0, sv); }                     // csukáskor se húzódjon a sarokkör alá
    fv += ((tf - f) * KF - fv * DF) * h; f += fv * h;
  }
  const fc = Math.min(1, Math.max(0, f));
  const open = Math.min(1, sep / SEP);
  const w = D + sep;
  if (Math.abs(w - shownW) > 0.05) { lg.style.width = w.toFixed(2) + 'px'; shownW = w; }
  const at = off => `translateX(${(w - D + 5 - off).toFixed(2)}px)`;   // off: a jobb széltől mért eltolás (0 = sarokkör)

  // a fehér korong csak nyitva látszik (hoverre), csukva nincs kijelölés
  const kt = sst(0.35, 0.9, open);
  knobA += (kt - knobA) * (1 - Math.exp(-14 * dt));
  // a fehér mennyisége a két körben (a forrás kiürül, a cél megtelik; közben a csepp a nyakon át vándorol)
  const wR = 1 - sst(0.12, 0.7, fc), wL = sst(0.3, 0.88, fc);

  // feliratok: mindegyik a saját körében; az aktív csukva is látszik, a másik csak nyitva
  const enOff = sep, l = lang();
  [['hu', 0, wR], ['en', enOff, wL]].forEach(([k, off, wk]) => {
    const el = k === l ? tFront : tOther, key = k === l ? 'front' : 'other';
    el.textContent = k.toUpperCase();
    el.style.transform = at(off);
    const want = k === l ? 1 : sst(0.45, 0.9, open);
    labA[key] += (want - labA[key]) * (1 - Math.exp(-(want < labA[key] ? 30 : 14) * dt));
    const dk = Math.min(1, wk * knobA * 1.15);                         // a fehéren sötét a betű
    el.style.color = `rgba(${mixC(LIGHT, DARK, dk).join(',')},${labA[key].toFixed(3)})`;
    btn[k].style.transform = at(off);
    btn[k].style.pointerEvents = k === 'hu' || open > 0.6 ? 'auto' : 'none';   // csukva csak a sarokkör kattintható (az nyit)
  });

  const r = lg.getBoundingClientRect(), sc = bufSize.x / innerWidth;
  const H = D * sc, Y = bufSize.y - r.bottom * sc, R = r.right * sc;
  rects[0].set(R - (D + sep) * sc, Y, sep > 0.5 ? D * sc : 0, H);
  rects[1].set(R - D * sc, Y, D * sc, H);
  const m = 64 * sc;                                                     // a külső ragyogás is beleférjen
  cu.uBox.value.set(R - w * sc - m, Y - m, R + m, Y + H + m);
  cu.uScale.value = sc;
  cu.uK.value = kOf(sep);
  const vis = lg.getClientRects().length > 0 && getComputedStyle(lg).visibility !== 'hidden';
  const alpha = vis ? uiIn() : 0;                                        // belépéskor a felülettel együtt jelenik meg
  cu.uAlpha.value = alpha;
  quad.visible = alpha > 0.003;
  cu.uRimGlow.value = open; cu.uClear.value = 1 - 0.32 * open;          // nyitva: derengő perem, enyhe sötétítés (mint a lejátszón)

  // a fehér folyadék
  const cy = Y + H / 2;
  wu.uCR.value.set(R - 30 * sc, cy);
  wu.uCL.value.set(R - (30 + sep) * sc, cy);
  // a forrás a nyak felé húzódva ürül ki, a cél a nyak felől telik meg (a korong a nyak felőli belső falnál marad),
  // közben egy sugár köti össze őket, aminek az eleje a cél felé fut, a vége a forrásból húzódik utána: végig egy csepp
  const rA = RK * wR, rB = RK * wL;
  wu.uCA.value.set(R - (30 + (RK - rA)) * sc, cy);
  wu.uCB.value.set(R - (30 + sep - (RK - rB)) * sc, cy);
  wu.uH.value.set(R - (30 + sep * sst(0.04, 0.6, fc)) * sc, cy);
  wu.uT.value.set(R - (30 + sep * sst(0.4, 0.96, fc)) * sc, cy);
  wu.uRG.value = 30 * sc; wu.uKG.value = kOf(sep) * sc;
  wu.uRA.value = rA * sc; wu.uRB.value = rB * sc;
  wu.uRT.value = 13 * sc;                                                // nyugalomban a korongba olvad
  wu.uKW.value = 9 * sc; wu.uIn.value = 5 * sc; wu.uPx.value = sc;
  wu.uBox.value.set(R - w * sc - 2, Y - 2, R + 2, Y + H + 2);
  wu.uA.value = alpha * knobA;
  white.visible = wu.uA.value > 0.003;
}
