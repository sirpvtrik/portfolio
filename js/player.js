// Blob lejátszó bal alul: nyitás/csukás idővonala, rugók, SDF liquid glass, hangerő, előző/következő, tekerés
import { reduced } from './config.js';
import { scene, onLayer, LAYER_PL, rt, U, bufSize } from './scene.js';
import { fullscreenVS } from './shaders/fullscreen.js';
import { playerFS } from './shaders/player.js';
import { uiIn } from './entrance.js';
import { actx, mode, fileBuf, vol, playing, setVol, togglePlay, switchTo, position, duration, seekTo } from './audio.js';

/* ---------- Blob lejátszó: nyitás, hangerő, előző / következő ---------- */
const pl = document.getElementById('pl'), spk = document.getElementById('spk');
const volEl = document.getElementById('vol'), volFill = document.getElementById('volFill');
const spkWaves = document.getElementById('spkWaves');
let lastVol = 0.8, closeT = null, nudgeT = -1, nudged = false;   // nudge: az első nyitáskor a hangerő-sáv finoman megmoccan (húzható)

/* Idővonal: 0 = csukott kör, 1 = nyitott lejátszó.
   Nyitás: jobbra nyúlik → középen felnő egy csepp → kétfelé válik → felül kinő egy csepp → szétnyílik.
   Csukás pontosan visszafelé: a teteje összehúzódik és lesüllyed, aztán a közepe összeolvad és leereszkedik, végül az alja lesz újra kör.
   A kirajzolt formák rugóval követik ezt (túllendülés, utórezgés) → folyékony hatás. */
let plT = 0, plTarget = 0;
const ease = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const phase = (t, a, b) => ease(Math.min(1, Math.max(0, (t - a) / (b - a))));
const L1 = (a, b, t) => a + (b - a) * t;
const LR = (A, B, t) => A.map((v, i) => L1(v, B[i], t));
function plGeom(t) {
  const a = phase(t, 0.0, 0.28), b1 = phase(t, 0.22, 0.48), b2 = phase(t, 0.42, 0.66),
        c1 = phase(t, 0.6, 0.82), c2 = phase(t, 0.76, 1.0);
  const bot = [0, 152, L1(64, 236, a), 64];
  const sx = bot[2] / 2;                                                // a cseppek mindig a pill aktuális közepébe húzódnak
  const seed = [sx, 184, 0, 0], mid = [86, 76, 64, 64];
  const cc = LR(seed, mid, b1);                                         // középen felnő egy csepp
  const l = LR(LR(seed, mid, b1), [0, 76, 64, 64], b2);                 // majd kétfelé válik
  const r = LR(LR(seed, mid, b1), [172, 76, 64, 64], b2);
  const hb = [L1(cc[0] + cc[2] / 2, 32, b2), 96, L1(0, 172, b2), 24 * b1];
  const vTop = L1(L1(184, 92, b1), 32, c1);
  const vb = [L1(sx, 118, b1) - 14 * Math.min(1, b1 * 3), vTop, 28 * Math.min(1, b1 * 3), 184 - vTop];
  const top = LR(LR([cc[0] + cc[2] / 2, cc[1] + cc[3] / 2, 0, 0], [86, 0, 64, 64], c1), [0, 0, 236, 64], c2);   // felül csepp, majd szétnyílik
  return [top, vb, hb, l, cc, r, bot];
}
const plCur = plGeom(0).map(q => q.slice()), plVel = plCur.map(() => [0, 0, 0, 0]);
// a csukott kör (az alsó sor alapja): a rugó csukáskor se húzza ennél kisebbre, különben a túllendüléstől egy pillanatra
// a hangszóró-kör alá húzódott vissza az üveg (Patrik); nyitáskor a túllendülés megmarad
const BASE = plGeom(0)[6].slice();
const FIN = plGeom(1);
export const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// mennyire ért a helyére egy rugós forma (1 = a helyén, 0 = még messze): a négy adata közül a legnagyobb eltérés
export const fitOf = (c, f, s = 1) => 1 - sst(3 * s, 16 * s, Math.max(Math.abs(c[0] - f[0]), Math.abs(c[1] - f[1]), Math.abs(c[2] - f[2]), Math.abs(c[3] - f[3])));
// egy tartalom-elem átlátszósága lágyan követi a célt; láthatatlanul nem kattintható és nem fókuszálható
// closing: csukáskor az elem már akkor gyorsan eltűnik, amikor a formája épp elindul (Patrik: az ikonok halványan még
// látszottak, amikor a kör már elhúzódott alóluk)
export function showPart(p, target, dt, closing = false) {
  if (closing) target = sst(0.92, 1, target);
  p.v += (target - p.v) * (1 - Math.exp(-(closing && target < p.v ? 45 : 16) * dt));
  if (target === 0 && p.v < 0.01) p.v = 0;
  p.el.style.opacity = p.v.toFixed(3);
  p.el.style.visibility = p.v > 0.02 ? 'visible' : 'hidden';
}
const part = el => { el.style.opacity = 0; el.style.visibility = 'hidden'; return { el, v: 0 }; };
const partTop = part(pl.querySelector('.c-top'));
const partBtn = ['prev', 'play', 'next'].map(id => part(document.getElementById(id)));
let onAmt = 0;
export function keepBase(c, v, m) {
  if (c[0] > m[0]) { c[0] = m[0]; v[0] = Math.min(0, v[0]); }
  if (c[1] > m[1]) { c[1] = m[1]; v[1] = Math.min(0, v[1]); }
  if (c[0] + c[2] < m[0] + m[2]) { c[2] = m[0] + m[2] - c[0]; v[2] = Math.max(0, v[2]); }
  if (c[1] + c[3] < m[1] + m[3]) { c[3] = m[1] + m[3] - c[1]; v[3] = Math.max(0, v[3]); }
}
function setOpen(v) {
  clearTimeout(closeT);
  plTarget = v ? 1 : 0;
  pl.classList.toggle('open', v);
  if (!v) pl.classList.remove('show');                               // csukáskor a tartalom azonnal eltűnik
  spk.setAttribute('aria-label', v ? (vol > 0 ? 'Némítás' : 'Hang vissza') : 'Lejátszó megnyitása');
}
function applyVol() {
  volFill.style.width = (vol * 100) + '%';
  volEl.setAttribute('aria-valuenow', String(Math.round(vol * 100)));
  spkWaves.setAttribute('d', vol > 0 ? 'M10.5 5.5a3.5 3.5 0 0 1 0 5M12.3 3.8a6 6 0 0 1 0 8.4' : 'M10.5 6l3.5 4M14 6l-3.5 4');
}
pl.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') setOpen(true); });
pl.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') { clearTimeout(closeT); closeT = setTimeout(() => setOpen(false), 380); } });
pl.addEventListener('focusin', () => setOpen(true));
pl.addEventListener('focusout', e => { if (!pl.contains(e.relatedTarget)) setOpen(false); });
document.addEventListener('pointerdown', e => { if (pl.classList.contains('open') && !pl.contains(e.target)) setOpen(false); });
spk.addEventListener('click', () => {
  if (!pl.classList.contains('open')) { setOpen(true); return; }        // érintésnél az első koppintás kinyit
  if (vol > 0) { lastVol = vol; setVol(0); } else { setVol(lastVol || 0.8); }
  applyVol(); setOpen(true);
});
let volDrag = false;
const volFromX = x => { const r = volEl.getBoundingClientRect(); setVol(Math.min(1, Math.max(0, (x - r.left) / r.width))); applyVol(); };
volEl.addEventListener('pointerdown', e => { volDrag = true; try { volEl.setPointerCapture(e.pointerId); } catch (_) {} volFromX(e.clientX); });
volEl.addEventListener('pointermove', e => { if (volDrag) volFromX(e.clientX); });
volEl.addEventListener('pointerup', () => { volDrag = false; });
volEl.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { setVol(Math.min(1, vol + 0.05)); applyVol(); e.preventDefault(); }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { setVol(Math.max(0, vol - 0.05)); applyVol(); e.preventDefault(); }
});
document.getElementById('play').addEventListener('click', togglePlay);
document.getElementById('prev').addEventListener('click', () => {
  if (!actx) return;
  if (position() > 2 || !fileBuf) seekTo(0); else switchTo(mode === 'file' ? 'synth' : 'file');
});
document.getElementById('next').addEventListener('click', () => {
  if (!actx) return;
  if (fileBuf) switchTo(mode === 'file' ? 'synth' : 'file'); else seekTo(0);
});
applyVol();

// a lejátszó üvegét rajzoló teljes képernyős réteg
const plRects = [0, 1, 2, 3, 4, 5, 6].map(() => new THREE.Vector4());
const plU = {
  uBg: { value: rt.texture }, uRes: U.uRes, uR: { value: plRects }, uBox: { value: new THREE.Vector4() }, uScale: { value: 1 }, uK: { value: 13 }, uAlpha: { value: 1 }, uClear: { value: 1 }, uGrad: { value: 0 }, uRimGlow: { value: 0 },   // a saját értékei (a közös shaderben különben a gombokéi szivárognának át)
  uRefr: U.uRefr, uDisp: U.uDisp, uFrost: U.uFrost, uSplay: U.uSplay, uLightAng: U.uLightAng, uLightInt: U.uLightInt,
};
const plQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: plU, transparent: true, depthTest: false, depthWrite: false,
  vertexShader: fullscreenVS,
  fragmentShader: playerFS,
}));
plQuad.frustumCulled = false;
scene.add(onLayer(plQuad, LAYER_PL));

export function plUpdate(dt) {
  const dir = Math.sign(plTarget - plT);
  if (dir !== 0) plT = Math.min(1, Math.max(0, plT + dir * dt / (reduced ? 0.15 : 1.05)));
  const tg = plGeom(plT);
  // rugós követés: kicsit túllendül és visszarezeg, mint egy csepp
  let speed = 0;
  const K = reduced ? 900 : 240, D = reduced ? 60 : 17;
  const steps = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / steps;
  for (let n = 0; n < steps; n++) {
    for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) {
      const v = plVel[i][j] + ((tg[i][j] - plCur[i][j]) * K - plVel[i][j] * D) * h;
      plVel[i][j] = v; plCur[i][j] += v * h;
      if (j > 1) {                                                      // méret: nem megy 0 alá, és a maradék pötty eltűnik
        if (plCur[i][j] < 0) { plCur[i][j] = 0; plVel[i][j] = Math.max(0, plVel[i][j]); }
        if (tg[i][j] === 0 && plCur[i][j] < 4) { plCur[i][j] = 0; plVel[i][j] = 0; }
      }
    }
    keepBase(plCur[6], plVel[6], BASE);
  }
  for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) speed += Math.abs(plVel[i][j]);
  speed /= 28;
  plU.uK.value = 13 + Math.min(16, speed * 0.06);                      // mozgás közben nyúlósabb összeolvadás
  if (plTarget === 1 && plT > 0.95 && speed < 40) pl.classList.add('show');
  const g = { list: plCur.map(q => [q[0], q[1], Math.max(0, q[2]), Math.max(0, q[3])]), a: Math.min(1, Math.max(0, (plCur[6][2] - 64) / 172)) };
  // A tartalom fokozatosan, részenként jelenik meg (Patrik: „ne kelljen megvárni, mire a teteje is kinyílik”): minden elem
  // akkor látszik, amikor a saját üveg-formája már a helyén van (a rugós alak aktuális helyzetéből), csukáskor ugyanígy tűnik el.
  showPart(partTop, sst(0.82, 0.98, plCur[0][2] / 236), dt, plTarget === 0);           // felső sor: amikor a felső pill kiszélesedett
  for (let i = 0; i < 3; i++) showPart(partBtn[i], fitOf(plCur[3 + i], FIN[3 + i]), dt, plTarget === 0);   // előző / lejátszás / következő: a saját körük
  // hangerő-sáv: folyamatosan nő az alsó pillel (a csukott fehér körből), nem a végén vált át
  if (!nudged && !reduced && plTarget === 1 && g.a > 0.97) { nudged = true; nudgeT = 0; }
  let nd = 0;                                            // húzhatóság: az első nyitáskor a sáv vége kétszer finoman megmoccan
  if (nudgeT >= 0) { nudgeT += dt; nd = Math.sin(nudgeT * 9) * Math.exp(-nudgeT * 3.2) * Math.min(1, nudgeT * 6); if (nudgeT > 1.6) nudgeT = -1; }
  const fwOpen = Math.max(52, Math.min(224, vol * 224 - 18 * nd));
  const fw = L1(52, fwOpen, g.a);
  volFill.style.width = fw + 'px';
  volFill.classList.toggle('grip', fw > 100);           // a fogantyú csak akkor, ha elfér a hangszóró mellett
  // csukva csak akkor fehér a kör, ha szól a zene (Patrik); nyitva mindig látszik a sáv
  onAmt += ((playing && vol > 0 ? 1 : 0) - onAmt) * (1 - Math.exp(-8 * dt));
  const fo = Math.max(onAmt, sst(0, 0.3, g.a));
  volFill.style.opacity = fo.toFixed(3);
  spk.classList.toggle('dark', fo > 0.5);                // fehér körön sötét az ikon
  spk.style.left = (6 + fw / 2 - 16) + 'px';             // a hangszóró mindig a fehér sáv / kör közepén
  const r = pl.getBoundingClientRect(), sc = bufSize.x / innerWidth;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  g.list.forEach((q, i) => {
    const X = (r.left + q[0]) * sc, W = q[2] * sc, Hh = q[3] * sc;
    const Y = bufSize.y - (r.top + q[1]) * sc - Hh;
    plRects[i].set(X, Y, W, Hh);
    if (W > 0.5 && Hh > 0.5) { x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X + W); y1 = Math.max(y1, Y + Hh); }
  });
  const m = 64 * sc;                                                 // a külső ragyogás is beleférjen
  plU.uBox.value.set(x0 - m, y0 - m, x1 + m, y1 + m);
  plU.uScale.value = sc;
  plU.uAlpha.value = uiIn();   // belépéskor a felülettel együtt jelenik meg
  // nyitva: a peremen derengés, és csak enyhe sötétítés (az olvashatóságért), nem szürkül be (Patrik)
  plU.uRimGlow.value = plT; plU.uClear.value = 1 - 0.32 * plT;
}

/* ---------- Tekerés ---------- */
const seekEl = document.getElementById('seek');
const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const trackSub = document.getElementById('trackSub');
let scrubbing = false;
export function updateTime() {
  const d = duration(), p = scrubbing ? seekEl.value / 1000 * d : position();
  if (!scrubbing) seekEl.value = Math.round(p / d * 1000);
  trackSub.textContent = fmt(p) + ' / ' + fmt(d);
}
seekEl.addEventListener('pointerdown', () => { scrubbing = true; });
seekEl.addEventListener('input', () => { seekTo(seekEl.value / 1000 * duration()); updateTime(); });
seekEl.addEventListener('change', () => { scrubbing = false; });
window.addEventListener('pointerup', () => { scrubbing = false; });
