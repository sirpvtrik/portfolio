// Névjegy-blob jobb felül (Patrik, Figma: Frame 9, node 258-89): ugyanaz a logika, mint a lejátszóé (js/player.js), csak
// tükrözve. Csukva a fotó egy üvegkörben; hoverre (érintésnél koppintásra) rugósan, folyékonyan nyílik: balra nyúlik a
// névpill → középen lefelé felnő egy csepp → kétfelé válik → alul három kör (Behance, Instagram, e-mail), összeolvadva a
// pillel. Csukás pontosan visszafelé. Az alakot ugyanaz az SDF smooth-union liquid glass shader rajzolja, mint a lejátszót.
// A linkek a config.js CONTACT-jából jönnek; ami üres, az nem kattintható (Patriktól kell még: Behance, Instagram, e-mail).
import { reduced, CONTACT } from './config.js';
import { scene, onLayer, LAYER_PL, rt, U, bufSize } from './scene.js';
import { fullscreenVS } from './shaders/fullscreen.js';
import { playerFS } from './shaders/player.js';
import { uiIn } from './entrance.js';

const ct = document.getElementById('ct'), box = document.getElementById('ctIn'), av = document.getElementById('ctAv');
const SC = 0.9, W = 236, H = 140;                    // a lejátszó egységeiben (236 széles, sorok 64 magasak), 0,9-szeresen
let t = 0, target = 0, closeT = null;

// linkek
[['ctBe', CONTACT.behance], ['ctIg', CONTACT.instagram], ['ctMl', CONTACT.email ? 'mailto:' + CONTACT.email : '']].forEach(([id, href]) => {
  const a = document.getElementById(id);
  if (href) { a.href = href; if (!href.startsWith('mailto:')) { a.target = '_blank'; a.rel = 'noopener'; } }
  else { a.setAttribute('aria-disabled', 'true'); a.addEventListener('click', e => e.preventDefault()); }
});

/* Idővonal: 0 = csukott kör (a fotó), 1 = nyitott névjegy. A lejátszó alsó két sora tükrözve (a felső sora itt nincs). */
const ease = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const phase = (x, a, b) => ease(Math.min(1, Math.max(0, (x - a) / (b - a))));
const L1 = (a, b, x) => a + (b - a) * x;
const LR = (A, B, x) => A.map((v, i) => L1(v, B[i], x));
function geom(x) {
  const a = phase(x, 0.0, 0.4), b1 = phase(x, 0.32, 0.7), b2 = phase(x, 0.6, 1.0);
  const bot = [0, 76, L1(64, 236, a), 64];                               // a névpill (a lejátszó hangerő-sávjának helye)
  const sx = bot[2] / 2;                                                 // a cseppek mindig a pill aktuális közepéből indulnak
  const seed = [sx, 108, 0, 0], mid = [86, 0, 64, 64];
  const cc = LR(seed, mid, b1);                                          // középen felnő egy csepp
  const l = LR(cc, [0, 0, 64, 64], b2), r = LR(cc, [172, 0, 64, 64], b2);   // majd kétfelé válik: három kör
  const hb = [L1(cc[0] + cc[2] / 2, 32, b2), 20, L1(0, 172, b2), 24 * b1];
  const vTop = L1(108, 16, b1);
  const vb = [L1(sx, 118, b1) - 14 * Math.min(1, b1 * 3), vTop, 28 * Math.min(1, b1 * 3), 108 - vTop];
  // tükrözés: a kör jobbra fent marad, a pill balra nő, a cseppek lefelé
  return [vb, hb, l, cc, r, bot, [0, 0, 0, 0]].map(q => [(W - q[0] - q[2]) * SC, (H - q[1] - q[3]) * SC, q[2] * SC, q[3] * SC]);
}
const cur = geom(0).map(q => q.slice()), vel = cur.map(() => [0, 0, 0, 0]);

function setOpen(v) {
  clearTimeout(closeT);
  target = v ? 1 : 0;
  ct.classList.toggle('open', v);
  if (!v) ct.classList.remove('show');                                  // csukáskor a tartalom azonnal eltűnik
  av.setAttribute('aria-expanded', String(v));
}
export function openContact() { setOpen(true); av.focus({ preventScroll: true }); }   // a GET IN TOUCH gomb nyitja, amíg nincs e-mail-cím
ct.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') setOpen(true); });
ct.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') { clearTimeout(closeT); closeT = setTimeout(() => setOpen(false), 380); } });
ct.addEventListener('focusin', () => setOpen(true));
ct.addEventListener('focusout', e => { if (!ct.contains(e.relatedTarget)) setOpen(false); });
document.addEventListener('pointerdown', e => { if (ct.classList.contains('open') && !ct.contains(e.target)) setOpen(false); });
av.addEventListener('click', () => setOpen(!ct.classList.contains('open') || target === 0));   // érintésnél a koppintás nyit

// az üvegét rajzoló teljes képernyős réteg (a lejátszó shadere, saját alakzatokkal)
const rects = [0, 1, 2, 3, 4, 5, 6].map(() => new THREE.Vector4());
const cu = {
  uBg: { value: rt.texture }, uRes: U.uRes, uR: { value: rects }, uBox: { value: new THREE.Vector4() }, uScale: { value: 1 }, uK: { value: 13 }, uAlpha: { value: 1 }, uClear: { value: 1 }, uGrad: { value: 0 }, uRimGlow: { value: 0 },   // a saját értékei (lásd player.js)
  uRefr: U.uRefr, uDisp: U.uDisp, uFrost: U.uFrost, uSplay: U.uSplay, uLightAng: U.uLightAng, uLightInt: U.uLightInt,
};
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: cu, transparent: true, depthTest: false, depthWrite: false, vertexShader: fullscreenVS, fragmentShader: playerFS,
}));
quad.frustumCulled = false;
scene.add(onLayer(quad, LAYER_PL));

export function ctUpdate(dt) {
  const dir = Math.sign(target - t);
  if (dir !== 0) t = Math.min(1, Math.max(0, t + dir * dt / (reduced ? 0.15 : 0.85)));
  const tg = geom(t);
  // rugós követés, mint a lejátszónál: kicsit túllendül és visszarezeg, mint egy csepp
  let speed = 0;
  const K = reduced ? 900 : 240, D = reduced ? 60 : 17;
  const steps = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / steps;
  for (let n = 0; n < steps; n++) {
    for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) {
      const v = vel[i][j] + ((tg[i][j] - cur[i][j]) * K - vel[i][j] * D) * h;
      vel[i][j] = v; cur[i][j] += v * h;
      if (j > 1) {
        if (cur[i][j] < 0) { cur[i][j] = 0; vel[i][j] = Math.max(0, vel[i][j]); }
        if (tg[i][j] === 0 && cur[i][j] < 4) { cur[i][j] = 0; vel[i][j] = 0; }
      }
    }
  }
  for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) speed += Math.abs(vel[i][j]);
  speed /= 28;
  cu.uK.value = 12 + Math.min(14, speed * 0.06);
  if (target === 1 && t > 0.95 && speed < 40) ct.classList.add('show');
  const r = box.getBoundingClientRect(), sc = bufSize.x / innerWidth;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  cur.forEach((q, i) => {
    const X = (r.left + q[0]) * sc, Wd = Math.max(0, q[2]) * sc, Hh = Math.max(0, q[3]) * sc;
    const Y = bufSize.y - (r.top + q[1]) * sc - Hh;
    rects[i].set(X, Y, Wd, Hh);
    if (Wd > 0.5 && Hh > 0.5) { x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X + Wd); y1 = Math.max(y1, Y + Hh); }
  });
  const m = 64 * sc;                                                 // a külső ragyogás is beleférjen
  cu.uBox.value.set(x0 - m, y0 - m, x1 + m, y1 + m);
  cu.uScale.value = sc;
  cu.uAlpha.value = uiIn();                                              // belépéskor a felülettel együtt jelenik meg
  cu.uRimGlow.value = t; cu.uClear.value = 1 - 0.32 * t;               // nyitva: derengő perem, enyhe sötétítés (mint a lejátszón)
}
