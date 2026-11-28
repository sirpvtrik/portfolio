// HU / EN váltó jobb alul (Patrik, Figma: Desktop – 20, node 279-391). Úgy működik, mint a lejátszó (js/player.js):
// csukva egy 60 px-es üvegkör, benne 50 px-es fehér korongon az aktív nyelv; hoverre (érintésnél koppintásra) rugósan
// balra nyúlik egy pillé, és előjön a másik nyelv. A sorrend a Figma szerint EN | HU; a fehér korong az aktív nyelven
// ül, nyitáskor a nyúló pillel együtt csúszik a helyére, váltáskor rugósan átúszik a másikra. Az üveget a lejátszó
// shadere rajzolja (playerFS); a DOM-elem szélessége a pillé, így a mellette lévő Glass gomb is arrébb megy.
import { reduced } from './config.js';
import { scene, onLayer, LAYER_PL, rt, U, bufSize } from './scene.js';
import { fullscreenVS } from './shaders/fullscreen.js';
import { playerFS } from './shaders/player.js';
import { uiIn } from './entrance.js';
import { sst } from './player.js';
import { lang, setLang, onLang, tr } from './lang.js';

const lg = document.getElementById('lg'), knob = document.getElementById('lgKnob'), knobT = document.getElementById('lgKnobT');
const btn = { en: lg.querySelector('[data-l="en"]'), hu: lg.querySelector('[data-l="hu"]') };
const D0 = 60, D1 = 135, SLOT = { hu: 0, en: D1 - D0 };     // a két hely a jobb széltől mérve (a HU a sarokban)
btn.hu.style.right = '5px'; btn.en.style.right = (5 + SLOT.en) + 'px';

let target = 0, closeT = null;
let w = D0, wv = 0, kx = 0, kv = 0, shownW = -1;
const labA = { en: 0, hu: 0 };

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
  if (!target || w < D0 + 0.6 * (D1 - D0)) { setOpen(true); return; }
  setLang(l);
}));

// a felület szövegei, amik a nyelvvel váltanak
const hint = document.querySelector('.hint');
const HINT = { hu: 'Görgess vagy húzd<br>Hangszóró → lejátszó', en: 'Scroll or drag<br>Speaker → player' };
function applyLang() {
  const l = lang();
  knobT.textContent = l.toUpperCase();
  Object.entries(btn).forEach(([k, b]) => {
    b.setAttribute('aria-pressed', String(k === l));
    b.setAttribute('aria-label', k === 'hu' ? 'Magyar' : 'English');
  });
  lg.setAttribute('aria-label', tr({ hu: 'Nyelv', en: 'Language' }));
  if (hint) hint.innerHTML = tr(HINT);
}
applyLang();
onLang(applyLang);

// az üveg: a lejátszó shadere két alakzattal (a nyúló pill + a csukott kör a sarokban, hogy csukáskor se húzódjon alá)
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

export function lgUpdate(dt) {
  // rugók (mint a lejátszónál: kicsit túllendül és visszarezeg, mint egy csepp)
  const K = reduced ? 900 : 240, Dm = reduced ? 60 : 17, KK = reduced ? 900 : 300, DK = reduced ? 60 : 22;
  const steps = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / steps;
  const tw = target ? D1 : D0;
  for (let n = 0; n < steps; n++) {
    wv += ((tw - w) * K - wv * Dm) * h; w += wv * h;
    if (w < D0) { w = D0; wv = Math.max(0, wv); }                       // csukáskor se húzódjon a sarokkör alá
    const open = Math.min(1, (w - D0) / (D1 - D0));
    const tk = SLOT[lang()] * open;                                      // a korong a nyúló pillel együtt csúszik a helyére
    kv += ((tk - kx) * KK - kv * DK) * h; kx += kv * h;
  }
  kx = Math.max(0, Math.min(w - D0, kx));                                // a korong mindig a pillben marad
  const open = Math.max(0, Math.min(1, (w - D0) / (D1 - D0)));
  if (Math.abs(w - shownW) > 0.05) { lg.style.width = w.toFixed(2) + 'px'; shownW = w; }
  knob.style.transform = `translateX(${(w - D0 - kx + 5).toFixed(2)}px)`;
  // a nem aktív nyelv felirata: amikor a pill kinyúlt, és a korong nincs rajta
  Object.entries(btn).forEach(([l, b]) => {
    const want = sst(0.55, 0.95, open) * sst(18, 48, Math.abs(kx - SLOT[l]));
    labA[l] += (want - labA[l]) * (1 - Math.exp(-(want < labA[l] ? 30 : 14) * dt));
    b.style.color = `rgba(242,242,242,${labA[l].toFixed(3)})`;
    b.style.pointerEvents = l === 'hu' || open > 0.6 ? 'auto' : 'none';   // a csukott pillen kívüli gomb nem kattintható
  });

  const r = lg.getBoundingClientRect(), sc = bufSize.x / innerWidth;
  const H = D0 * sc, Y = bufSize.y - r.bottom * sc, R = r.right * sc;
  rects[0].set(R - w * sc, Y, w * sc, H);
  rects[1].set(R - D0 * sc, Y, D0 * sc, H);
  const m = 64 * sc;                                                     // a külső ragyogás is beleférjen
  cu.uBox.value.set(R - w * sc - m, Y - m, R + m, Y + H + m);
  cu.uScale.value = sc;
  cu.uK.value = 12 + Math.min(14, Math.abs(wv) * 0.03);
  const vis = lg.getClientRects().length > 0 && getComputedStyle(lg).visibility !== 'hidden';
  cu.uAlpha.value = vis ? uiIn() : 0;                                    // belépéskor a felülettel együtt jelenik meg
  quad.visible = cu.uAlpha.value > 0.003;
  cu.uRimGlow.value = open; cu.uClear.value = 1 - 0.32 * open;          // nyitva: derengő perem, enyhe sötétítés (mint a lejátszón)
}
