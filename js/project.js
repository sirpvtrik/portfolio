// Projekt-aloldal 3D-ben, a pillekhez hasonlóan: a kártyák vastag üveglapok (ugyanaz a liquid glass shader,
// mint a pilleken), a tartalom (szöveg, kép) a lap belsejében ül, és a perem megtöri.
// Görgetés: dob, mint a pilleknél — középen teljes méret, felfelé/lefelé hátradőlnek, mélyebbre kerülnek, kisebbek lesznek.
// Galéria: valódi 3D henger, a sugara a rács fél szélessége (nem lóg ki a rács szélén). Amikor középre ér, az egész lap
// megáll, és a görgetés a hengert forgatja; ha az utolsó kép is beért, a lap megy tovább.
import { S, reduced, DETAIL_TEST, PROJECTS } from './config.js';
import { scene, renderer, onLayer, LAYER_BG, LAYER_GLASS, LAYER_TEXT, U, visH, setCameraLift } from './scene.js';
import { glassVS, glassFS } from './shaders/glass.js';
import { roundedRect, glassSlab, remapUV, bevelOf, faceZ } from './glassgeo.js';
import { onSelect, restorePills, paletteOf } from './pills.js';
import { setWavesCentered, setWaveColor } from './waves.js';
import { damp } from './util.js';

const root = document.getElementById('project');
const input = document.getElementById('pjInput');
const srText = document.getElementById('pjText');
const backBtn = document.getElementById('projectBack');

export let isOpen = false;
let closing = false, group = null, cards = [], gal = [], galHolder = null, L = null, builtVisH = 0, builtDepth = '', depthPending = false;
const geoKey = () => S.depth + '/' + S.thick;   // Depth + Vastagság: ha bármelyik változik, a kártyák újraépülnek
let s = 0, vel = 0, dragging = false, dragY = 0, dragT = 0, openT = 0, lift = 1.4;

const FONT = "'Nohemi', Archivo, 'Helvetica Neue', Arial, sans-serif";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- Elrendezés (képernyő-pixelben; a 3D-be visH / képernyőmagasság szorzóval kerül) ---------- */
const measure = document.createElement('canvas').getContext('2d');
function wrap(g, text, maxW) {
  const lines = []; let line = '';
  for (const w of text.split(' ')) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}
const introLayout = (w, u) => { measure.font = `300 ${32 * u}px ${FONT}`; return wrap(measure, DETAIL_TEST.intro, Math.min(504 * u, w - 50 * u)); };
const textLayout = (w, u) => { measure.font = `400 ${24 * u}px ${FONT}`; return wrap(measure, DETAIL_TEST.text, Math.min(325 * u, w - 60 * u)); };

function computeLayout() {
  const vw = innerWidth, vh = innerHeight, mob = vw <= 720;
  const gw = mob ? vw - 32 : Math.min(900, vw - 48), u = mob ? gw / 560 : gw / 900, g = 20 * u;
  const list = [];                                   // kind, x/y = bal felső sarok (x a rács bal szélétől, y a lap tetejétől)
  let y = mob ? 110 : 150;
  const add = (kind, x, w, h, order) => list.push({ kind, x, y, w, h, order });
  if (!mob) {
    add('img', 0, 325 * u, 392 * u, 0); add('intro', 325 * u + g, 554 * u, 392 * u, 1); y += 392 * u + g;
    add('text', 0, 554 * u, 392 * u, 3); add('img', 554 * u + g, 326 * u, 392 * u, 2); y += 392 * u + g;
  } else {
    const ih = 40 * u + 16 * u + 20 * u + introLayout(gw, u).length * 40 * u + 48 * u;
    const th = 80 * u + textLayout(gw, u).length * 34 * u;
    add('img', 0, gw, gw * 0.62, 0); y += gw * 0.62 + g;
    add('intro', 0, gw, ih, 1); y += ih + g;
    add('text', 0, gw, th, 3); y += th + g;
    add('img', 0, gw, gw * 0.62, 2); y += gw * 0.62 + g;
  }
  const cw = mob ? gw * 0.62 : 325 * u, ch = cw * 464 / 325, p = cw + g;
  const n = Math.max(1, (DETAIL_TEST.gallery.length || 4));
  const travel = Math.max(0, (n - 1) * p - (gw - cw));   // az első kép a bal vonaltól indul, az utolsó a jobb vonalnál áll meg
  const galY = y + ch / 2;
  const sG = Math.max(0, galY - vh / 2);                  // ennél a görgetésnél van a galéria középen
  const spin = travel * 1.6;                             // ennyi görgetés forgatja végig a hengert (lassabb, mint a lap)
  return { vw, vh, mob, gw, u, g, list, cw, ch, p, n, travel, spin, galY, sG, sMax: sG + spin + vh * 0.5 };
}

/* ---------- Tartalom-rajzolók (a kártya pixeleiben, q = textúra-felbontás szorzó) ---------- */
function drawIntro(g, w, h, q) {
  const u = L.u;
  g.fillStyle = '#919191'; g.font = `400 ${16 * u * q}px ${FONT}`;
  if ('letterSpacing' in g) g.letterSpacing = (0.64 * u * q) + 'px';
  g.textBaseline = 'alphabetic';
  g.fillText(DETAIL_TEST.label.toUpperCase(), 25 * u * q, (40 + 13) * u * q);
  if ('letterSpacing' in g) g.letterSpacing = (-0.4 * u * q) + 'px';
  g.fillStyle = '#f2f2f2'; g.font = `300 ${32 * u * q}px ${FONT}`;
  introLayout(w, u).forEach((l, i) => g.fillText(l, 25 * u * q, (40 + 16 + 20 + 28 + i * 40) * u * q));
}
function drawText(g, w, h, q) {
  const u = L.u;
  g.fillStyle = '#f2f2f2'; g.font = `400 ${24 * u * q}px ${FONT}`;
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  textLayout(w, u).forEach((l, i) => g.fillText(l, 30 * u * q, (40 + 22 + i * 34) * u * q));
}
// galéria-kép: a perem (bevel) mögött kezdődik, hogy az üveg széle megtörje
function galleryDrawer(src) {
  return (g, w, h, q, ins, card) => {
    const rr = (x, y, ww, hh, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, ww, hh, r); else g.rect(x, y, ww, hh); };
    const x = ins * q, y = ins * q, ww = (w - 2 * ins) * q, hh = (h - 2 * ins) * q, r = 12 * L.u * q;
    if (!src) {
      const gr = g.createLinearGradient(x, y, x + ww * 0.6, y + hh);
      gr.addColorStop(0, '#6a45b8'); gr.addColorStop(0.55, '#3b2a86'); gr.addColorStop(1, '#c2307e');
      g.fillStyle = gr; rr(x, y, ww, hh, r); g.fill();
      return;
    }
    const im = new Image();
    im.onload = () => {                                            // object-fit: cover
      const sc = Math.max(ww / im.width, hh / im.height), iw = im.width * sc, ih = im.height * sc;
      g.save(); rr(x, y, ww, hh, r); g.clip(); g.globalAlpha = 0.95;
      g.drawImage(im, x + (ww - iw) / 2, y + (hh - ih) / 2, iw, ih); g.restore();
      if (card.tex) card.tex.needsUpdate = true;
    };
    im.src = src;
  };
}

/* ---------- Egy kártya: vastag üveglap + a tartalom ----------
   A kép a lap belsejében ül (az üveg pereme megtöri); a szöveg (onTop) az előlapon, az üveg után rajzolódik:
   így a Frost nem mossa el, és a peremen / oldalról sem látszik tükrözve. */
function makeCard(wpx, hpx, k, depth01, draw, order, onTop) {
  const w = wpx * k, h = hpx * k, b = bevelOf(depth01);
  const geo = glassSlab((a, c) => roundedRect(a, c, Math.max(0.02, 15 * L.u * k - b)), w, h, depth01, 10, S.thick / 100);
  const mat = new THREE.ShaderMaterial({ vertexShader: glassVS, fragmentShader: glassFS, uniforms: Object.assign({}, U, { uHover: { value: 0 }, uTintK: { value: 0 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uHalf: { value: new THREE.Vector2(w / 2, h / 2) }, uRad: { value: 0.05 }, uGlow: { value: 0 } }) });
  const holder = new THREE.Group(), spin = new THREE.Group();
  holder.add(spin);
  spin.add(onLayer(new THREE.Mesh(geo, mat), LAYER_GLASS));
  const card = { holder, spin, geo, mat, a: 0, av: 0, order, wpx, hpx };
  if (draw) {
    const q = Math.min(2, window.devicePixelRatio || 1) * 1.25;
    const cv = document.createElement('canvas'); cv.width = Math.round(wpx * q); cv.height = Math.round(hpx * q);
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    card.tex = tex;
    card.redraw = () => { const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); draw(g, wpx, hpx, q, b / k, card); tex.needsUpdate = true; };
    card.redraw();
    card.pgeo = remapUV(new THREE.ShapeGeometry(roundedRect(w, h, b), 8));
    card.pmat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const plane = onTop ? onLayer(new THREE.Mesh(card.pgeo, card.pmat), LAYER_TEXT) : onLayer(new THREE.Mesh(card.pgeo, card.pmat), LAYER_BG);
    plane.position.z = onTop ? faceZ(depth01, S.thick / 100) + 0.004 : 0.002;
    spin.add(plane);
  }
  return card;
}

function build() {
  dispose();
  L = computeLayout(); builtVisH = visH; builtDepth = geoKey();
  const k = visH / L.vh, depth01 = S.depth / 100, d = DETAIL_TEST;
  group = new THREE.Group(); scene.add(group);
  cards = L.list.map(c => {
    const draw = c.kind === 'intro' ? drawIntro : c.kind === 'text' ? drawText : null;
    const card = makeCard(c.w, c.h, k, depth01, draw, c.order, !!draw);   // a szöveges kártyák tartalma az üveg elé kerül
    group.add(card.holder); return card;
  });
  galHolder = new THREE.Group(); group.add(galHolder);
  const pics = d.gallery.length ? d.gallery : [null, null, null, null];
  gal = pics.map((src, i) => { const c = makeCard(L.cw, L.ch, k, depth01, galleryDrawer(src), 4 + Math.min(i, 3)); galHolder.add(c.holder); return c; });
  srText.textContent = d.label + '. ' + d.intro + ' ' + d.text;
  // a betűket a tényleges szöveggel töltjük be (az ékezetes latin-ext rész is), utána újrarajzolunk
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load(`300 32px ${FONT}`, d.intro), document.fonts.load(`400 24px ${FONT}`, d.text), document.fonts.load(`400 16px ${FONT}`, d.label)])
      .then(() => { if (group) cards.forEach(c => c.redraw && c.redraw()); }).catch(() => {});
  }
}
function dispose() {
  if (!group) return;
  scene.remove(group);
  [...cards, ...gal].forEach(c => { c.geo.dispose(); c.mat.dispose(); if (c.tex) { c.tex.dispose(); c.pgeo.dispose(); c.pmat.dispose(); } });
  group = null; cards = []; gal = [];
}

/* ---------- Nyitás / zárás ---------- */
function open(i) {
  setWaveColor(paletteOf(i));                                    // a projekt képének árnyalataira (vagy a saját színére) vált, fentről lefelé
  isOpen = true; closing = false; s = 0; vel = 0; openT = 0;
  build();
  root.hidden = false;
  document.body.classList.add('project-open');
  setWavesCentered(false);                                        // a hullámok kiúsznak a szélekre
  setTimeout(() => backBtn.focus({ preventScroll: true }), 400);
}
function close() {
  if (!isOpen || closing) return;
  closing = true;
  setTimeout(() => {
    isOpen = false; closing = false;
    dispose();
    root.hidden = true;
    document.body.classList.remove('project-open');
    setWavesCentered(true);
    setWaveColor(null);
    restorePills();
  }, reduced ? 0 : 450);
}
onSelect(open);
// Depth csúszka: a kártyák (a galériáé is) újraépülnek az új peremmel, a megjelenés és a görgetés megmarad
export function requestCardRebuild() {
  if (!group || depthPending || builtDepth === geoKey()) return;
  depthPending = true;
  requestAnimationFrame(() => {
    depthPending = false;
    if (!group || closing || builtDepth === geoKey()) return;
    const a = cards.concat(gal).map(c => c.a);
    build();
    cards.concat(gal).forEach((c, i) => { c.a = a[i] ?? 1; c.av = 0; });
  });
}
backBtn.addEventListener('click', close);

/* ---------- Görgetés: lendület + súrlódás, mint a pilleknél ---------- */
input.addEventListener('wheel', e => {
  e.preventDefault();
  const k = e.deltaMode === 1 ? 32 : (e.deltaMode === 2 ? innerHeight : 1);
  vel = clamp(vel + e.deltaY * k * 5, -7000, 7000);
}, { passive: false });
input.addEventListener('pointerdown', e => {
  dragging = true; dragY = e.clientY; dragT = performance.now(); vel = 0;
  try { input.setPointerCapture(e.pointerId); } catch (_) {}
});
input.addEventListener('pointermove', e => {
  if (!dragging) return;
  const dy = e.clientY - dragY; dragY = e.clientY;
  const now = performance.now(), dts = Math.max(8, now - dragT) / 1000; dragT = now;
  s -= dy; vel = clamp(vel * 0.5 + (-dy / dts) * 0.5, -7000, 7000);
});
const endDrag = () => { if (dragging && performance.now() - dragT > 90) vel = 0; dragging = false; };
input.addEventListener('pointerup', endDrag);
input.addEventListener('pointercancel', endDrag);
document.addEventListener('keydown', e => {
  if (!isOpen) return;
  if (e.key === 'Escape') { close(); return; }
  if (e.target && /INPUT|BUTTON/.test(e.target.tagName) && e.target !== backBtn) return;
  const step = { ArrowDown: 700, PageDown: 1600, ' ': 1600, ArrowUp: -700, PageUp: -1600 }[e.key];
  if (step) { vel = clamp(vel + step, -7000, 7000); e.preventDefault(); }
});

/* ---------- Kockánkénti frissítés ---------- */
// dob, mint a pilleknél: középen teljes méret; felfelé/lefelé hátradől, mélyebbre kerül, kisebb lesz
// (a vízszintes helyzet is a méret arányában húzódik a közép felé → egy sor kártyái egyben kisebbednek, a közük nem nyílik ki)
function drum(obj, xpx, ypx, k, tilt) {
  const R = L.vh * 0.62, r = Math.min(1.35, Math.abs(ypx) / R), depth = r * r, sc = 1 - depth * 0.3;
  obj.position.set(xpx * k * sc, -ypx * k, -depth * 1.8);
  obj.rotation.x = (ypx / R) * 0.45 - tilt;
  return sc;
}
// megjelenés: sorban, rugóval (kis túllendülés), lentről úszik be
function appear(c, dt) {
  const target = closing ? 0 : (openT > 0.38 + c.order * 0.14 ? 1 : 0);
  if (reduced) { c.a = target; return; }
  c.av += ((target - c.a) * (closing ? 160 : 90) - c.av * (closing ? 22 : 12.5)) * dt;
  c.a += c.av * dt;
}
export function updateProject(dt) {
  const liftT = isOpen && !closing ? 0 : 1.4;                       // a kamera egyenesen néz a kártyákra
  if (Math.abs(lift - liftT) > 1e-4) { lift = damp(lift, liftT, 4, dt); setCameraLift(lift); }
  if (!group) return;
  if (visH !== builtVisH || innerWidth !== L.vw || innerHeight !== L.vh) {   // átméretezés: újraépítés, megjelenés nélkül
    build(); cards.concat(gal).forEach(c => { c.a = 1; c.av = 0; });
  }
  openT += dt;
  // fizika
  if (!dragging) { s += vel * dt; vel *= Math.exp(-dt * 3.2); }
  if (s < 0) { s = 0; vel = Math.max(0, vel); }
  if (s > L.sMax) { s = L.sMax; vel = Math.min(0, vel); }
  // fázisok: lap görög → (galéria középen) a lap áll, a henger forog → a lap görög tovább
  const v = s < L.sG ? s : (s < L.sG + L.spin ? L.sG : s - L.spin);
  const off = L.spin > 0 ? clamp((s - L.sG) / L.spin, 0, 1) * L.travel : 0;
  const k = visH / L.vh, tilt = clamp(vel * 0.00006, -0.3, 0.3);
  const gridX = (L.vw - L.gw) / 2 - L.vw / 2;                      // a rács bal széle a képernyő közepéhez képest
  cards.forEach((c, i) => {
    const it = L.list[i];
    appear(c, dt);
    const sc = drum(c.holder, gridX + it.x + it.w / 2, it.y + it.h / 2 - v - L.vh / 2, k, tilt);
    const a = Math.max(0, c.a);
    c.holder.scale.setScalar(Math.max(0.0001, sc * a));
    c.holder.position.y -= (1 - Math.min(1, a)) * 60 * k;
    if (c.pmat) c.pmat.opacity = Math.min(1, a);
  });
  // galéria: a kártyák egyenes sávon haladnak; ahol a rács szélét érnék, ott a vonalnál hátrafordulnak, mint egy
  // zsanér: a külső élük a vonalon marad, a belső élük csúszik tovább, így a fordulás pontosan a görgetéssel arányos
  // (nincs ugrás), és semmi nem lóg túl a vonalon. Élére fordulva eltűnik, a következő kártya veszi át a helyét.
  const gsc = drum(galHolder, gridX + L.gw / 2, L.galY - v - L.vh / 2, k, tilt);
  galHolder.scale.setScalar(gsc);
  const E = L.gw / 2, cH = L.cw / 2;
  gal.forEach((c, i) => {
    appear(c, dt);
    const u = -E + cH + i * L.p - off;                                // a kártya közepe a sávon (a rács közepétől)
    const sg = u > 0 ? 1 : -1, inner = Math.abs(u) - cH;              // a belső él távolsága a középtől
    let X = u, Z = 0, th = 0;
    if (inner + 2 * cH > E) {                                          // a külső él túlérne a vonalon → hátrafordul
      const w = clamp(E - inner, 0, 2 * cH);                           // a vetített szélesség (belső él → vonal)
      th = Math.acos(w / (2 * cH));
      const sn = Math.sin(th);
      X = sg * (inner + w / 2); Z = -cH * sn;
    }
    c.spin.visible = inner < E - 0.5;
    c.spin.position.set(X * k, 0, Z * k);
    c.spin.rotation.y = sg * th;
    const a = Math.max(0, c.a);
    c.holder.scale.setScalar(Math.max(0.0001, a));
    c.holder.position.y = -(1 - Math.min(1, a)) * 60 * k;
    if (c.pmat) c.pmat.opacity = Math.min(1, a);
  });
}
