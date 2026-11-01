// Blob lejátszó bal alul: nyitás/csukás idővonala, rugók, SDF liquid glass, hangerő, előző/következő, tekerés
import { reduced } from './config.js';
import { scene, onLayer, LAYER_PL, rt, U, bufSize } from './scene.js';
import { fullscreenVS } from './shaders/fullscreen.js';
import { playerFS } from './shaders/player.js';
import { actx, mode, fileBuf, vol, setVol, togglePlay, switchTo, position, duration, seekTo } from './audio.js';

/* ---------- Blob lejátszó: nyitás, hangerő, előző / következő ---------- */
const pl = document.getElementById('pl'), spk = document.getElementById('spk');
const volEl = document.getElementById('vol'), volFill = document.getElementById('volFill');
const spkWaves = document.getElementById('spkWaves');
let lastVol = 0.8, closeT = null;

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
  uBg: { value: rt.texture }, uRes: U.uRes, uR: { value: plRects }, uBox: { value: new THREE.Vector4() }, uScale: { value: 1 }, uK: { value: 13 },
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
  }
  for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) speed += Math.abs(plVel[i][j]);
  speed /= 28;
  plU.uK.value = 13 + Math.min(16, speed * 0.06);                      // mozgás közben nyúlósabb összeolvadás
  if (plTarget === 1 && plT > 0.95 && speed < 40) pl.classList.add('show');
  const g = { list: plCur.map(q => [q[0], q[1], Math.max(0, q[2]), Math.max(0, q[3])]), a: Math.min(1, Math.max(0, (plCur[6][2] - 64) / 172)) };
  // hangszóró: csukva a kör közepén, nyitva a világos hangerő-sáv közepén
  const fw = Math.max(52, vol * 224);
  spk.style.left = L1(16, 6 + fw / 2 - 16, g.a) + 'px';
  const r = pl.getBoundingClientRect(), sc = bufSize.x / innerWidth;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  g.list.forEach((q, i) => {
    const X = (r.left + q[0]) * sc, W = q[2] * sc, Hh = q[3] * sc;
    const Y = bufSize.y - (r.top + q[1]) * sc - Hh;
    plRects[i].set(X, Y, W, Hh);
    if (W > 0.5 && Hh > 0.5) { x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X + W); y1 = Math.max(y1, Y + Hh); }
  });
  const m = 30 * sc;
  plU.uBox.value.set(x0 - m, y0 - m, x1 + m, y1 + m);
  plU.uScale.value = sc;
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
