// Projekt-aloldal 3D-ben, a pillekhez hasonlóan: a kártyák vastag üveglapok (ugyanaz a liquid glass shader,
// mint a pilleken), a tartalom (szöveg, kép) a lap belsejében ül, és a perem megtöri.
// Görgetés: dob, mint a pilleknél — középen teljes méret, felfelé/lefelé hátradőlnek, mélyebbre kerülnek, kisebbek lesznek.
// Galéria: valódi 3D henger, a sugara a rács fél szélessége (nem lóg ki a rács szélén). Amikor középre ér, az egész lap
// megáll, és a görgetés a hengert forgatja; ha az utolsó kép is beért, a lap megy tovább.
// Teszt (S.pjMode = 1, Glass panel „Projekt”): a kiválasztott pill elfordul, megnő és lefelé megnyúlik, ez lesz a projekt
// teste (fent a cím, a borító és a szöveg); alatta a galéria képei spirálban futnak körbe a test körül, és görgetésre
// forognak: mindig az a kép van elöl, amelyik a képernyő közepén jár, a többi oldalra, majd a pill mögé kerül (az üveg megtöri).
import { S, reduced, DETAIL_TEST, PROJECTS, PW, PH } from './config.js';
import { scene, renderer, camera, onLayer, LAYER_BG, LAYER_GLASS, LAYER_TEXT, U, visH, setCameraLift } from './scene.js';
import { glassVS, glassFS, glassBackFS } from './shaders/glass.js';
import { roundedRect, stadium, glassSlab, remapUV, bevelOf, faceZ } from './glassgeo.js';
import { onSelect, restorePills, paletteOf, pills } from './pills.js';
import { setWavesCentered, setWaveColor } from './waves.js';
import { damp } from './util.js';
import { setupHeap, resetHeap, updateHeap, heapPointer, preloadHeap } from './heap.js';

const root = document.getElementById('project');
const input = document.getElementById('pjInput');
const srText = document.getElementById('pjText');
const backBtn = document.getElementById('projectBack');

export let isOpen = false;
let closing = false, group = null, cards = [], gal = [], galHolder = null, L = null, builtVisH = 0, builtDepth = '', depthPending = false;
const geoKey = () => S.depth + '/' + S.thick + '/' + S.pjMode;   // Depth, Vastagság, oldal-forma: ha bármelyik változik, újraépül
let D = DETAIL_TEST, cur = -1;                   // a nyitott projekt tartalma (a projekt saját detail-je a DETAIL_TEST fölött) és sorszáma
let pp = null, morphT = 99, pillStart = null;    // a megnyúlt pill (teszt) és a kiinduló helyzete (a toronybeli pill)
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
const introLayout = (w, u) => { measure.font = `300 ${32 * u}px ${FONT}`; return wrap(measure, D.intro, Math.min(504 * u, w - 50 * u)); };
const textLayout = (w, u) => { measure.font = `400 ${24 * u}px ${FONT}`; return wrap(measure, D.text, Math.min(325 * u, w - 60 * u)); };

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
  const n = Math.max(1, (D.gallery.length || 4));
  const travel = Math.max(0, (n - 1) * p - (gw - cw));   // az első kép a bal vonaltól indul, az utolsó a jobb vonalnál áll meg
  const galY = y + ch / 2;
  const sG = Math.max(0, galY - vh / 2);                  // ennél a görgetésnél van a galéria középen
  const spin = travel * 1.6;                             // ennyi görgetés forgatja végig a hengert (lassabb, mint a lap)
  // a lap alján a leesett pillek halma (js/heap.js): a padló a képernyő aljára kerül, a galéria fent még látszik
  const k = visH / vh, pillW = Math.min(PW / k, gw / 3.3), pillH = pillW * PH / PW;
  const floor = galY + ch / 2 + Math.max(pillH * 3.6, vh * 1.25);   // bőven lejjebb: ide még jön tartalom (Patrik)
  const vEnd = floor + (mob ? 10 : 16) - vh;
  if (S.pjMode === 1) return pillLayout({ vw, vh, mob, gw, u, g, cw, ch, n, k, pillW, pillH });
  return { vw, vh, mob, gw, u, g, list, cw, ch, p, n, travel, spin, galY, sG, sMax: Math.max(sG, vEnd) + spin,
    heap: { floor, width: vw, k, vh, vw, pillW } };                  // a halom a képernyő széléig ér
}

/* ---------- Teszt: a megnyúlt pill elrendezése (px, y a lap tetejétől, x a képernyő közepétől) ---------- */
const pillIntroLayout = (w, u) => { measure.font = `400 ${22 * u}px ${FONT}`; return wrap(measure, D.intro, w); };
function pillLayout(o) {
  const { vw, vh, mob, gw, u, n, pillW, pillH } = o;
  const Wp = mob ? vw - 24 : gw * 0.97, top = mob ? 110 : 160, r = Wp / 2, pad = 30 * u;
  const cw = mob ? Wp * 0.48 : o.cw, ch = cw * 464 / 325;
  // a pill szélessége a tetejétől y-ra (a lekerekített vég miatt): a tartalom ezen belül marad
  const topFor = hw => r - Math.sqrt(Math.max(0, r * r - Math.min(r, hw + pad) ** 2));
  const title = { y: top + (mob ? 90 : 135) * u, w: Math.min(Wp - 2 * pad, 560 * u), h: 130 * u };
  // henger a test belsejében: minden elem a palástján ül (a pill széléig kint), mélységben lapítva (ZS), különben elöl
  // túl nagyok lennének és a test túl vastag. Rc: a henger sugara; Rlim: eddig mehet ki bármi (a képen, perspektívával).
  const Rlim = r - 14 * u, Rc = Rlim, ZS = 0.32;                      // a henger majdnem a test faláig ér: a képek a szélről fordulnak be
  const imgW = Math.min(mob ? Wp - 64 : Math.min(650 * u, Wp - 160 * u), 2 * Rlim * 0.98), imgH = imgW * 0.667;
  const imgTop = top + Math.max((mob ? 175 : 235) * u, topFor(imgW / 2));
  const tw = Math.min(mob ? imgW : 420 * u, 2 * Rlim * 0.98), lines = pillIntroLayout(tw, u).length;
  const textH = 34 * u + lines * 31 * u + 12 * u, textTop = imgTop + imgH + 50 * u;
  const text = { y: textTop + textH / 2, w: tw, h: textH };          // középen: oldalra tolva szemből is elfordulva állna
  const img = { y: imgTop + imgH / 2, w: imgW, h: imgH };
  const R = Rc, Rz = Rc * ZS;
  const dth = Math.min(1.4, cw * 1.08 / Rc);                          // a szomszéd képek a paláston nem érnek egymásba
  // a galéria EGY síkban (egy magasságon) áll, nem lépcsőzve: gyűrű a henger palástján. Amikor a közepére ér (sG), a lap
  // megáll, és a görgetés (spin) forgatja végig a képeket az elsőtől az utolsóig; utána a lap megy tovább (mint a kártyáknál)
  // a szöveg és a galéria között bő hely: amikor a galéria a képernyő közepére ér (a lap ott megáll), a szöveg már kint van a
  // képernyő tetején, nem lóg a logó alá és nem ér a bal oldali, feljebb ülő képekhez (Patrik: túl közel volt)
  const gap = Math.max(170 * u, vh / 2 - ch / 2 - 40);
  const y0 = textTop + textH + gap + ch / 2;
  const pitch = ch * 0.12 / dth;                                          // a gyűrű enyhe csigavonala: radiánonként ennyit ereszkedik (px)
  // a test nem lehet rövidebb a pill arányánál (a szélességének PW/PH-szorosa): ha a tartalom rövidebb, a test ennél hosszabb
  // lenne, és a halom a test aljába lógna, ezért a „bottom” legalább ennyi (a halom ettől mér)
  const bottom = Math.max(y0 + ch / 2 + 140 * u + pitch * 2.2, top + Wp * PW / PH);
  const floor = bottom + Math.max(pillH * 3.6, vh * 0.9) + pillH * 1.5;   // alatta a leesett pillek halma, a testtől bő távolságra
  const sG = Math.max(0, y0 - vh / 2), steps = (n - 1) * dth, spin = steps * 420;   // 420 px görgetés fordulatonként (rad)
  const rate = dth / (ch * 0.5) * 0.3;                                    // csavarodás a lap magasságával (rad / px): fent lassan, olvashatóan
  return { mode: 'pill', vw, vh, mob, gw, u, g: o.g, cw, ch, n, list: [], sMax: Math.max(sG, floor + (mob ? 36 : 64) - vh) + spin,   // a pillek nem tapadnak a képernyő aljához
    pill: { Wp, top, bottom, len: bottom - top, title, img, text, R, Rz, ZS, Rlim, dth, y0, w1: rate, sG, spin, steps, pitch },
    heap: { floor, width: vw, k: o.k, vh, vw, pillW } };
}
function drawPillTitle(g, w, h, q) {
  const u = L.u, p = PROJECTS[cur] || { name: '', cat: '' };
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  const t = 40 * u * q, c = 20 * u * q, gap = 12 * u * q;
  g.font = `500 ${t}px ${FONT}`; if ('letterSpacing' in g) g.letterSpacing = (-0.02 * t) + 'px';
  const tc = g.measureText('H').actualBoundingBoxAscent || t * 0.7;
  const cc = c * 0.7, y = h * q / 2 - (tc + gap + cc) / 2;
  g.fillStyle = '#f2f2f2'; g.fillText(p.name, w * q / 2, y + tc);
  g.font = `400 ${c}px ${FONT}`; if ('letterSpacing' in g) g.letterSpacing = '0px';
  g.fillStyle = 'rgba(242,242,242,0.7)'; g.fillText(p.cat.toUpperCase(), w * q / 2, y + tc + gap + cc);
}
function drawPillText(g, w, h, q) {
  const u = L.u;
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#919191'; g.font = `400 ${14 * u * q}px ${FONT}`;
  if ('letterSpacing' in g) g.letterSpacing = (0.56 * u * q) + 'px';
  g.fillText(D.label.toUpperCase(), 0, 14 * u * q);
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  g.fillStyle = '#f2f2f2'; g.font = `400 ${22 * u * q}px ${FONT}`;
  pillIntroLayout(w, u).forEach((l, i) => g.fillText(l, 0, (34 + 22 + i * 31) * u * q));
}
// sík a pill-test belsejében (felirat vagy kép, üveglap nélkül): az 1-es rétegen, így a test üvege megtöri
function textPlane(wpx, hpx, k, draw, order, side = THREE.FrontSide) {
  const q = Math.min(2, window.devicePixelRatio || 1) * 1.25;
  const cv = document.createElement('canvas'); cv.width = Math.round(wpx * q); cv.height = Math.round(hpx * q);
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const geo = new THREE.PlaneGeometry(wpx * k, hpx * k, 40, 1), mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side });
  const holder = onLayer(new THREE.Mesh(geo, mat), LAYER_BG);          // a test belsejében: az üveg megtöri
  const c = { holder, geo, mat, tex, a: 0, av: 0, order, text: true, base: geo.attributes.position.array.slice(), bend: 0 };
  c.redraw = () => { const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); draw(g, wpx, hpx, q, 0, c); tex.needsUpdate = true; };
  c.redraw();
  return c;
}

/* ---------- Tartalom-rajzolók (a kártya pixeleiben, q = textúra-felbontás szorzó) ---------- */
function drawIntro(g, w, h, q) {
  const u = L.u;
  g.fillStyle = '#919191'; g.font = `400 ${16 * u * q}px ${FONT}`;
  if ('letterSpacing' in g) g.letterSpacing = (0.64 * u * q) + 'px';
  g.textBaseline = 'alphabetic';
  g.fillText(D.label.toUpperCase(), 25 * u * q, (40 + 13) * u * q);
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
  const mat = new THREE.ShaderMaterial({ vertexShader: glassVS, fragmentShader: glassFS, uniforms: Object.assign({}, U, { uHover: { value: 0 }, uTintK: { value: 0 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uHalf: { value: new THREE.Vector2(w / 2, h / 2) }, uRad: { value: 0.05 }, uGlow: { value: 0 }, uLens: { value: 0 } }) });
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
  setupHeap(L.heap);
  const k = visH / L.vh, depth01 = S.depth / 100, d = D;
  group = new THREE.Group(); scene.add(group);
  if (L.pill) { buildPill(k, depth01); loadFonts(d); return; }
  cards = L.list.map(c => {
    const draw = c.kind === 'intro' ? drawIntro : c.kind === 'text' ? drawText : null;
    const card = makeCard(c.w, c.h, k, depth01, draw, c.order, !!draw);   // a szöveges kártyák tartalma az üveg elé kerül
    group.add(card.holder); return card;
  });
  galHolder = new THREE.Group(); group.add(galHolder);
  const pics = d.gallery.length ? d.gallery : [null, null, null, null];
  gal = pics.map((src, i) => { const c = makeCard(L.cw, L.ch, k, depth01, galleryDrawer(src), 4 + Math.min(i, 3)); galHolder.add(c.holder); return c; });
  loadFonts(d);
}
function loadFonts(d) {
  srText.textContent = (PROJECTS[cur] ? PROJECTS[cur].name + '. ' : '') + d.label + '. ' + d.intro + ' ' + d.text;
  // a betűket a tényleges szöveggel töltjük be (az ékezetes latin-ext rész is), utána újrarajzolunk
  if (document.fonts && document.fonts.load) {
    const name = PROJECTS[cur] ? PROJECTS[cur].name : '';
    Promise.all([document.fonts.load(`300 32px ${FONT}`, d.intro), document.fonts.load(`400 24px ${FONT}`, d.text + ' ' + d.intro),
      document.fonts.load(`400 16px ${FONT}`, d.label.toUpperCase()), document.fonts.load(`500 40px ${FONT}`, name)])
      .then(() => { if (group) cards.forEach(c => c.redraw && c.redraw()); }).catch(() => {});
  }
}

/* ---------- Teszt: a megnyúlt pill (a toronybeli pillből nő ki) ----------
   A pill-geometria vízszintes stadion a végső szélességgel és a pill arányával (így a lencse és a perem a megszokott);
   a nyújtás a két fél csúcsait tolja szét (a lekerekített végek nem torzulnak), a test 90°-kal elforgatva áll. */
function buildPill(k, depth01) {
  const P = L.pill, Ww = P.Wp * k, L0 = Ww * PW / PH, th = S.thick / 100;
  // vastag üvegtömb: a spirál (Rz) belefér, a perem lekerekített
  const half = P.Rz * k + 0.3, bz = Math.min(0.6, half * 0.4), bev = Math.min(0.5, Ww * 0.05);
  const geo = glassSlab(stadium, L0, Ww, depth01, 96, th, { depth: Math.max(0.05, 2 * (half - bz)), bevel: bev, bevelZ: bz });
  const mat = new THREE.ShaderMaterial({ vertexShader: glassVS, fragmentShader: glassFS, uniforms: Object.assign({}, U, {
    uHover: { value: 0 }, uTintK: { value: 0 }, uTint: { value: new THREE.Vector3(1, 1, 1) },
    uHalf: { value: new THREE.Vector2(L0 / 2, Ww / 2) }, uRad: { value: Ww / 2 }, uGlow: { value: 1 }, uLens: { value: 0.8 },
    uLensW: { value: Math.min(0.62, 110 / P.Wp * 2) } }) });   // a lencse csak a szélén (~110 px), a tartalom tiszta marad
  const bmat = new THREE.ShaderMaterial({ vertexShader: glassVS, fragmentShader: glassBackFS, uniforms: U,
    side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const holder = new THREE.Group(), body = new THREE.Group();
  holder.add(body); group.add(holder);
  const glass = onLayer(new THREE.Mesh(geo, mat), LAYER_GLASS), back = onLayer(new THREE.Mesh(geo, bmat), LAYER_BG);
  glass.frustumCulled = back.frustumCulled = false; back.renderOrder = 1;
  body.add(glass, back);
  const fz = P.Rz * k;                                   // a tartalom síkja a test belsejében, elöl
  pp = { holder, body, geo, mat, bmat, base: geo.attributes.position.array.slice(), L0, Ww, d: 0,
    dFinal: Math.max(0, (P.len * k - L0) / 2), fz, a: 1 };
  // tartalom üveg nélkül, a test belsejében: cím, borító, szöveg
  const title = textPlane(P.title.w, P.title.h, k, drawPillTitle, 6, THREE.DoubleSide);
  const text = textPlane(P.text.w, P.text.h, k, drawPillText, 8, THREE.DoubleSide);
  title.still = text.still = true;                       // „Szöveg áll” teszt: ezek nem forognak
  const cover = (PROJECTS[cur] && PROJECTS[cur].image) || D.gallery[0] || null;
  const img = textPlane(P.img.w, P.img.h, k, galleryDrawer(cover), 7, THREE.DoubleSide);
  img.place = P.img; title.place = P.title; text.place = P.text;
  cards = [title, img, text];
  const cyl = new THREE.Group(); cyl.scale.set(1, 1, P.ZS); group.add(cyl); pp.cyl = cyl;   // a henger mélységben lapítva
  cards.forEach(c => cyl.add(c.holder));
  const pics = D.gallery.length ? D.gallery : [null, null, null, null];
  // a galéria képei kétoldalasak: a test túloldalán is látszanak (az üvegen át, halványabban)
  gal = pics.map((src, i) => { const c = textPlane(L.cw, L.ch, k, galleryDrawer(src), 9 + Math.min(i, 3), THREE.DoubleSide); cyl.add(c.holder); return c; });
}
function setStretch(d) {
  if (Math.abs(d - pp.d) < 1e-5) return;
  pp.d = d;
  const a = pp.geo.attributes.position.array, b = pp.base;
  for (let i = 0; i < a.length; i += 3) a[i] = b[i] + (b[i] > 0 ? d : -d);
  pp.geo.attributes.position.needsUpdate = true;
  pp.mat.uniforms.uHalf.value.set(pp.L0 / 2 + d, pp.Ww / 2);
}
const ease = x => x * x * (3 - 2 * x), lerp = (a, b, t) => a + (b - a) * t;
// a pill-oldal görgetési fázisai: lap görög → (a galéria középen) a lap áll, a gyűrű forog (g: 0..1) → a lap görög tovább
function pillScroll() {
  const P = L.pill;
  if (s < P.sG) return { v: s, g: 0 };
  if (s < P.sG + P.spin) return { v: P.sG, g: (s - P.sG) / P.spin };
  return { v: s - P.spin, g: 1 };
}
// a meghajlított sík legszélső pontja (px) a henger tengelyétől oldalra, ha a paláston th szögben áll (sn, cs)
// (cz: a kamera távolsága px-ben, zs: a henger mélységi lapítása; az elöl lévő pont a perspektíva miatt kijjebb látszik)
function edgeX(b, sn, cs, hw, Rc, cz, zs) {
  const r = Rc / b, t = hw / r, lx = r * Math.sin(t), lz = r * (Math.cos(t) - 1);
  let m = 0;
  for (const sx of [lx, -lx]) {
    const X = Rc * sn + sx * cs + lz * sn, Z = (Rc * cs - sx * sn + lz * cs) * zs;
    m = Math.max(m, Math.abs(X) * cz / (cz - Z));
  }
  return m;
}
// a sík a henger felületére hajlik (a tengely felé), b = 0 egyenes, 1 = a teljes R sugarú ív
function bendPlane(c, R, b) {
  if (Math.abs(b - c.bend) < 0.004) return;
  c.bend = b;
  const p = c.geo.attributes.position.array, q = c.base, r = R / Math.max(b, 1e-3);
  for (let i = 0; i < p.length; i += 3) {
    const t = q[i] / r;
    p[i] = r * Math.sin(t); p[i + 2] = r * (Math.cos(t) - 1);
  }
  c.geo.attributes.position.needsUpdate = true;
}
function updatePillPage(dt, ps) {
  const P = L.pill, k = visH / L.vh, v = ps.v;
  const toW = py => -(py - v - L.vh / 2) * k;
  // kinövés: a pill kicsiben felállítva elfordul (0–0,55 s), aztán kiszélesedik és lefelé megnyúlik, a teteje a helyére úszik
  // (0,3–1,3 s). A látható szélesség / hossz → méretarány + nyújtás (a hossz sosem rövidebb a pill arányánál).
  morphT += dt;
  const m1 = ease(clamp(morphT / 0.55, 0, 1)), m2 = ease(clamp((morphT - 0.3) / 1.0, 0, 1));
  const st = pillStart || { x: 0, y: toW(P.top + P.len / 2), z: 0, sc: pp.Ww / PH };
  const Lf = pp.L0 + 2 * pp.dFinal;
  const wv = lerp(PH * st.sc, pp.Ww, m2), lv = Math.max(lerp(PW * st.sc, Lf, m2 * m2), wv * PW / PH);
  const sc = wv / pp.Ww, d = Math.max(0, (lv / sc - pp.L0) / 2);
  setStretch(d);
  pp.a = closing ? damp(pp.a, 0, 9, dt) : 1;
  const top = lerp(st.y + PW * st.sc / 2, toW(P.top), m2);
  pp.holder.position.set(lerp(st.x, 0, m1), top - lv / 2, lerp(st.z, 0, m1));
  pp.holder.scale.setScalar(Math.max(0.0001, sc * pp.a));
  pp.body.rotation.z = m1 * Math.PI / 2;
  // Az egész tartalom egy hengeren fordul körbe (Patrik: „mintha az egész menne körbe”): mindig a képernyő közepén járó
  // elem van szemben, a többi oldalra, majd hátra kerül (ott halványabban, az üvegen át látszik). A szög a lap magasságából
  // jön: fent (cím, borító, szöveg) lassabban fordul, hogy olvasható maradjon, a galériánál gyorsabban (képenként dth).
  // a lap tetején a cím és a borító (az első kép) szemben áll, és csak akkor kezd fordulni, amikor a borító közepe
  // a képernyő közepére ért (A ettől a magasságtól számol; a szöveg utána már a hengerrel fordul)
  const yFront = Math.max(L.vh / 2, P.img.y);
  const A = y => (Math.max(y, yFront) - P.y0) * P.w1;                  // ugyanaz a csavarodás felfelé mindenkinek
  const phi = A(v + L.vh / 2), camZ = camera.position.z;
  const place = (c, y, hw, rise, extra = 0, droop = 0) => {
    appear(c, dt);
    const th = A(y) - phi + extra, sn = Math.sin(th), cs = Math.cos(th);
    const fade = 1 - THREE.MathUtils.smoothstep(Math.abs(th), 0.7 * Math.PI, 0.97 * Math.PI);   // a hátsó oldalon kifutva eltűnik (a gyűrű nem ér körbe)
    // a henger palástján (Rc): szemből majdnem egyenes (olvasható), oldalra fordulva ráhajlik a hengerre, legalább annyira,
    // hogy a széle ne lógjon ki a pillből (b = 1: pontosan a paláston)
    let b = 0.08 + 0.92 * THREE.MathUtils.smoothstep(Math.abs(th), 0.12, 1.3);
    while (b < 1 && edgeX(b, sn, cs, hw, P.R, camZ / k, P.ZS) > P.Rlim) b = Math.min(1, b + 0.04);
    bendPlane(c, P.R * k, b);
    const zz = cs * P.R * k, pz = (camZ - zz * P.ZS) / camZ;
    // a gyűrű enyhe csigavonala (Patrik rajza): a szemben álló kép a magasságán marad, a jobbra elforduló képek lejjebb, a balra
    // elfordulók feljebb ülnek (a szög arányában; a kép szélén a vetület miatt meredekebbnek látszik)
    c.holder.position.set(sn * P.R * k, toW(y + droop * th) * pz - rise, zz);
    c.holder.rotation.set(0, th, 0);
    const a = Math.max(0, c.a);
    c.mat.opacity = Math.min(1, a) * fade;
    c.mat.color.setScalar(0.4 + 0.6 * (cs + 1) / 2);                        // hátul halványabb
    c.holder.visible = a * fade > 0.002;
    return a;
  };
  cards.forEach(c => {
    const pl = c.place, a0 = Math.max(0, c.a);
    if (c.still && S.pjTextStill) {                      // teszt: a szöveg nem forog, egyenesen ül a test közepén, a képek körülötte forognak
      appear(c, dt);
      const a = Math.max(0, c.a);
      bendPlane(c, P.R * k, 0);
      c.holder.position.set(0, toW(pl.y) - (1 - Math.min(1, a)) * 30 * k, 0);
      c.holder.rotation.set(0, 0, 0);
      c.holder.scale.setScalar(Math.max(0.0001, 0.96 + 0.04 * Math.min(1, a)));
      c.mat.opacity = Math.min(1, a); c.mat.color.setScalar(1);
      c.holder.visible = a > 0.002;
      return;
    }
    const a = place(c, pl.y, pl.w / 2, (1 - Math.min(1, a0)) * 30 * k);
    c.holder.scale.setScalar(Math.max(0.0001, 0.96 + 0.04 * Math.min(1, a)));
  });
  gal.forEach((c, i) => {                                // egy síkban: mind y0 magasságán, a szög szerint a gyűrűn
    const a = place(c, P.y0, L.cw / 2, 0, i * P.dth - ps.g * P.steps, P.pitch);
    c.holder.scale.setScalar(Math.max(0.0001, a));
  });
}
function dispose() {
  if (!group) return;
  scene.remove(group);
  [...cards, ...gal].forEach(c => { c.geo.dispose(); c.mat.dispose(); if (c.tex) c.tex.dispose(); if (c.pgeo) { c.pgeo.dispose(); c.pmat.dispose(); } });
  if (pp) { pp.geo.dispose(); pp.mat.dispose(); pp.bmat.dispose(); pp = null; }
  group = null; cards = []; gal = [];
}

/* ---------- Nyitás / zárás ---------- */
function open(i) {
  setWaveColor(paletteOf(i));                                    // a projekt képének árnyalataira (vagy a saját színére) vált, fentről lefelé
  isOpen = true; closing = false; s = 0; vel = 0; openT = 0;
  cur = i; D = PROJECTS[i].detail ? Object.assign({}, DETAIL_TEST, PROJECTS[i].detail) : DETAIL_TEST;
  // teszt-forma: a kiválasztott pill helyéről nő ki a projekt teste (a toronybeli pill eltűnik, a restorePills visszahozza)
  pillStart = null; morphT = reduced ? 99 : 0;
  if (S.pjMode === 1 && pills[i]) {
    const h = pills[i].holder, w = new THREE.Vector3();
    h.updateWorldMatrix(true, false); h.getWorldPosition(w);
    pillStart = { x: w.x, y: w.y, z: w.z, sc: h.scale.x };
    h.visible = false;
  }
  preloadHeap(); resetHeap();                                     // új projekt: a pillek újra, máshogy hullanak le
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
    dispose(); resetHeap();
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
    morphT = 99;
    if (S.pjMode === 1 && cur >= 0 && pills[cur]) pills[cur].holder.visible = false;   // kártyákról pillre váltva se maradjon ott
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
  try { input.setPointerCapture(e.pointerId); } catch (_) {}
  if (heapPointer('down', e)) { vel = 0; return; }            // pillre esett: azt húzzuk, nem a lapot
  dragging = true; dragY = e.clientY; dragT = performance.now(); vel = 0;
});
input.addEventListener('pointermove', e => {
  if (heapPointer('move', e) || !dragging) return;
  const dy = e.clientY - dragY; dragY = e.clientY;
  const now = performance.now(), dts = Math.max(8, now - dragT) / 1000; dragT = now;
  s -= dy; vel = clamp(vel * 0.5 + (-dy / dts) * 0.5, -7000, 7000);
});
const endDrag = () => { if (dragging && performance.now() - dragT > 90) vel = 0; dragging = false; };
input.addEventListener('pointerup', e => { heapPointer('up', e); endDrag(); });
input.addEventListener('pointercancel', e => { heapPointer('up', e); endDrag(); });
input.addEventListener('pointerleave', e => heapPointer('leave', e));
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
    morphT = 99; build(); cards.concat(gal).forEach(c => { c.a = 1; c.av = 0; });
  }
  openT += dt;
  // fizika
  if (!dragging) { s += vel * dt; vel *= Math.exp(-dt * 3.2); }
  if (s < 0) { s = 0; vel = Math.max(0, vel); }
  if (s > L.sMax) { s = L.sMax; vel = Math.min(0, vel); }
  if (L.pill) { const ps = pillScroll(); updateHeap(dt, ps.v, isOpen && !closing); updatePillPage(dt, ps); return; }
  updateHeap(dt, s < L.sG ? s : (s < L.sG + L.spin ? L.sG : s - L.spin), isOpen && !closing);
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
