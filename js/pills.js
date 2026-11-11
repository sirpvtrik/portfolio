// Pill-torony: geometria, címke-textúrák, üveg, hover, görgetés
import { PROJECTS, N, START, S, PW, PH, SP, TOWER_Y, VIEW_N } from './config.js';
import { renderer, camera, scene, canvas, onLayer, LAYER_BG, LAYER_GLASS, LAYER_TEXT, U, visH } from './scene.js';
import { glassVS, glassFS, glassBackFS } from './shaders/glass.js';
import { damp } from './util.js';
import { stadium, glassSlab, remapUV, faceZ } from './glassgeo.js';
import { pillImageVS, pillImageFS } from './shaders/pillimage.js';
import { pillRise } from './entrance.js';

/* ---------- 3D pill geometria ---------- */
function buildPillGeo() {
  return glassSlab(stadium, PW, PH, S.depth / 100, 72, S.thick / 100);   // perem mérete = Depth, a test = Vastagság
}
let pillGeo = buildPillGeo();
const labelZ = () => faceZ(S.depth / 100, S.thick / 100) + 0.004;   // a felirat kicsivel az előlap előtt
const LW = PW - 0.56, LH = PH - 0.46;
const labelGeo = remapUV(new THREE.ShapeGeometry(stadium(LW, LH), 48));

/* ---------- Felirat (az üveg előlapján, LAYER_TEXT: a Frost nem mossa el, a perem nem töri meg) ----------
   Patrik Figma-terve (pill 440 × 164): középre zárt Nohemi Medium 40 px cím (−2% betűköz, #f2f2f2), alatta 15 px-re
   Nohemi Regular 20 px kategória nagybetűvel (70%-os fehér). A kettő együtt, a betűk magasságára (cap) középre igazítva.
   A méretek a pill magasságához mérve, így minden pillméretnél ugyanaz az arány. */
const TW = 1240, TH = Math.round(TW * LH / LW);
const PX = TH / LH;                                  // pixel / 3D egység a feliratban
const FIG = PH * PX / 164;                           // 1 Figma-pixel a felirat-textúrában
const FONT = "Nohemi, Archivo, 'Helvetica Neue', Arial, sans-serif";
function drawLabel(c, p) {
  const g = c.getContext('2d');
  g.clearRect(0, 0, TW, TH);
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  const cx = TW / 2, cy = TH / 2;
  let tSize = 40 * FIG;
  g.font = `500 ${tSize}px ${FONT}`;
  if ('letterSpacing' in g) g.letterSpacing = (-0.02 * tSize) + 'px';
  const w = g.measureText(p.name).width, maxW = TW * 0.86;
  if (w > maxW) { tSize *= maxW / w; g.font = `500 ${tSize}px ${FONT}`; if ('letterSpacing' in g) g.letterSpacing = (-0.02 * tSize) + 'px'; }
  const tCap = g.measureText('H').actualBoundingBoxAscent || tSize * 0.7;
  const cSize = 20 * FIG, gap = 15 * FIG;
  const cat = p.cat.toUpperCase();
  g.font = `400 ${cSize}px ${FONT}`;
  const cCap = g.measureText('H').actualBoundingBoxAscent || cSize * 0.7;
  const top = cy - (tCap + gap + cCap) / 2;          // a blokk teteje (a cím nagybetűinek teteje)
  g.fillStyle = 'rgba(242,242,242,0.7)';
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  g.fillText(cat, cx, top + tCap + gap + cCap);
  g.fillStyle = '#f2f2f2';
  g.font = `500 ${tSize}px ${FONT}`;
  if ('letterSpacing' in g) g.letterSpacing = (-0.02 * tSize) + 'px';
  g.fillText(p.name, cx, top + tCap);
}

/* ---------- Projektkép a pill belsejében (hoverre középről kinyílik; az üveg pereme megtöri) ---------- */
const IW = PW - 0.06, IH = PH - 0.06;
const imageGeo = remapUV(new THREE.ShapeGeometry(stadium(IW, IH), 72));
const palettes = [];                                  // projektenként a képből vett 3 árnyalat (a hullámokhoz)
export const paletteOf = i => PROJECTS[i].palette || palettes[i] || (PROJECTS[i].color ? [PROJECTS[i].color, PROJECTS[i].color, PROJECTS[i].color] : null);

// 3 jellemző árnyalat a képből (k-közép a telített képpontokon), világostól sötétig, fényként használható fényerőre hozva
function extractPalette(img) {
  const W = 48, H = Math.max(8, Math.round(48 * img.height / img.width));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'); g.drawImage(img, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H).data, px = [];
  for (let k = 0; k < d.length; k += 4) {
    const r = d[k] / 255, gg = d[k + 1] / 255, b = d[k + 2] / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
    if (mx > 0.1 && (mx - mn) / mx > 0.15) px.push([r, gg, b]);          // a szürkéket és a feketét kihagyjuk
  }
  if (px.length < 20) return null;
  let cs = [0, 0.33, 0.66, 0.99].map(t => px[Math.floor(t * (px.length - 1))].slice());
  for (let it = 0; it < 8; it++) {
    const acc = cs.map(() => [0, 0, 0, 0]);
    for (const q of px) {
      let bi = 0, bd = 1e9;
      cs.forEach((c, ci) => { const dd = (q[0] - c[0]) ** 2 + (q[1] - c[1]) ** 2 + (q[2] - c[2]) ** 2; if (dd < bd) { bd = dd; bi = ci; } });
      const a = acc[bi]; a[0] += q[0]; a[1] += q[1]; a[2] += q[2]; a[3]++;
    }
    cs = acc.map((a, ci) => a[3] ? [a[0] / a[3], a[1] / a[3], a[2] / a[3], a[3]] : cs[ci]);
  }
  const top = cs.filter(c => c[3]).sort((a, b) => b[3] - a[3]).slice(0, 3);
  while (top.length < 3) top.push(top[top.length - 1]);
  const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  top.sort((a, b) => lum(b) - lum(a));
  // fényként: a telítettség visszafogva, a fényerő elöl (0. szalag) a legnagyobb
  return top.map((c, k) => {
    const mx = Math.max(c[0], c[1], c[2]) || 1, mn = Math.min(c[0], c[1], c[2]);
    const sat = Math.min(0.72, (mx - mn) / mx), v = [1.0, 0.86, 0.72][k];
    return [0, 1, 2].map(j => { const n = c[j] / mx; return v * (1 - sat + sat * (n - mn / mx) / Math.max(1e-3, 1 - mn / mx)); });
  });
}

function makeImage(p, i) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: pillImageVS, fragmentShader: pillImageFS,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: {
      uMap: { value: null }, uReveal: { value: 0 }, uAspect: { value: IW / IH }, uImgAspect: { value: 1.5 },
      uFocus: { value: new THREE.Vector2().fromArray(p.focus || [0.5, 0.5]) }, uTexSize: { value: new THREE.Vector2(1600, 1000) },
      uTime: { value: 0 }, uDim: { value: 0.9 }, uFrostC: { value: 6.2 }, uFrostE: { value: 6.2 },   // Figma: 90%, erős, egyenletes elmosás
    },
  });
  new THREE.TextureLoader().load(p.image, tex => {
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    mat.uniforms.uMap.value = tex;
    mat.uniforms.uImgAspect.value = tex.image.width / tex.image.height;
    mat.uniforms.uTexSize.value.set(tex.image.width, tex.image.height);
    try { palettes[i] = extractPalette(tex.image); } catch (_) {}
  });
  const mesh = onLayer(new THREE.Mesh(imageGeo, mat), LAYER_BG);
  mesh.visible = false;                              // csak amíg kinyílik / nyitva van
  return { mesh, mat };
}

/* ---------- Pillek ---------- */
// a belső, hátsó felület anyaga (közös): additív, nem takarja el a mögötte lévő hullámokat, csak fényt ad
const backMat = new THREE.ShaderMaterial({
  vertexShader: glassVS, fragmentShader: glassBackFS, extensions: { derivatives: true }, uniforms: U,
  side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
});
export const stack = new THREE.Group();   // a halom (js/heap.js) is ezt mozgatja, amíg a projekt nyitva van
stack.position.y = TOWER_Y;
scene.add(stack);
export const pills = [];
const hitTargets = [];
const hitGeo = new THREE.PlaneGeometry(PW, PH * 0.98);

PROJECTS.forEach((p, i) => {
  const c = document.createElement('canvas'); c.width = TW; c.height = TH;
  drawLabel(c, p);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const labelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.FrontSide });
  const glassMat = new THREE.ShaderMaterial({
    vertexShader: glassVS, fragmentShader: glassFS, extensions: { derivatives: true },
    uniforms: Object.assign({}, U, { uHover: { value: 0 }, uTintK: { value: 0 },
      uTint: { value: new THREE.Vector3().fromArray(p.color || [1, 1, 1]) },
      uHalf: { value: new THREE.Vector2(PW / 2, PH / 2) }, uRad: { value: PH / 2 }, uGlow: { value: 1 }, uLens: { value: 1 } }),   // Figma: belső fehér ragyogás
  });

  const holder = new THREE.Group(), spin = new THREE.Group();
  holder.add(spin);
  const glass = onLayer(new THREE.Mesh(pillGeo, glassMat), LAYER_GLASS);
  spin.add(glass);
  // a pill belső, hátsó felülete a háttérbe, csak fényként: az elülső lap ezt megtörve mutatja → átlátszik (glassBackFS)
  const back = onLayer(new THREE.Mesh(pillGeo, backMat), LAYER_BG);
  back.renderOrder = 1;
  spin.add(back);
  // a felirat mindkét előlapon, kicsivel az üveg előtt (LAYER_TEXT); a mélységteszt miatt a takart rész nem látszik
  const fz = labelZ();
  const lf = onLayer(new THREE.Mesh(labelGeo, labelMat), LAYER_TEXT); lf.position.z = fz; spin.add(lf);
  const lb = onLayer(new THREE.Mesh(labelGeo, labelMat), LAYER_TEXT); lb.position.z = -fz; lb.rotation.y = Math.PI; spin.add(lb);
  const img = p.image ? makeImage(p, i) : null;
  if (img) spin.add(img.mesh);

  const hit = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial());
  hit.visible = false; hit.userData.index = i;
  holder.add(hit); hitTargets.push(hit);

  const baseY = (START - i) * SP;                 // a START pill van középen (config.js)
  holder.position.y = baseY;
  stack.add(holder);
  pills.push({ holder, spin, glass, back, mat: glassMat, canvas: c, tex, lf, lb, img, rv: 0, baseY, angle: i * 0.5 + 0.35, y: baseY, z: 0, s: 1, hv: 0, push: 0,
    dy: 0, dvy: 0, dz: 0, drz: 0, dvrz: 0, ds: 1, delay: 0 });   // d*: leesés / visszaesés (dz: hátra, a projekt-kártyák mögé)
});

if (document.fonts && document.fonts.load) {
  // a tényleges szöveggel töltjük be (az ékezetes latin-ext rész is, pl. Ő, Ű, Ú), különben tartalék betűvel rajzolódhat
  const names = PROJECTS.map(p => p.name).join(' '), cats = PROJECTS.map(p => p.cat.toUpperCase()).join(' ');
  Promise.all([document.fonts.load('500 100px Nohemi', names), document.fonts.load('400 40px Nohemi', cats)])
    .then(() => pills.forEach((pl, i) => { drawLabel(pl.canvas, PROJECTS[i]); pl.tex.needsUpdate = true; }))
    .catch(() => {});
}

/* ---------- Depth csúszka: a pill-geometria újraépítése (legfeljebb kockánként egyszer) ---------- */
const geoKey = () => S.depth + '/' + S.thick;
let builtKey = geoKey(), geoPending = false;
function rebuildGeo() {
  geoPending = false;
  if (builtKey === geoKey()) return;
  builtKey = geoKey();
  const old = pillGeo;
  pillGeo = buildPillGeo();
  const fz = labelZ();                               // a felirat az új előlapra kerül
  pills.forEach(pl => { pl.glass.geometry = pillGeo; pl.back.geometry = pillGeo; pl.lf.position.z = fz; pl.lb.position.z = -fz; });
  old.dispose();
}
export function requestGeoRebuild() {
  if (!geoPending && builtKey !== geoKey()) { geoPending = true; requestAnimationFrame(rebuildGeo); }
}

/* ---------- Egér / érintés ---------- */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let pointerIn = false, mx = 0, my = 0, hovered = -1;
const touchUI = matchMedia('(hover: none)').matches;   // érintőképernyőn nincs hover: a középen álló pill mutatja a képét
canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') return;
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  mx = ndc.x; my = ndc.y; pointerIn = true;
});
canvas.addEventListener('pointerleave', () => { pointerIn = false; });

/* ---------- Görgetés: lendület, súrlódás, ráugrás ---------- */
let scrollPos = 0, dragging = false, dragY = 0, dragMoved = 0, lastDragT = 0;
export let scrollVel = 0;   // a hullámok is olvassák (görgetésre beljebb úsznak)
const clampV = v => Math.max(-14, Math.min(14, v));
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  if (mode !== 'tower') return;
  const k = e.deltaMode === 1 ? 1.6 : (e.deltaMode === 2 ? 20 : 0.045);
  scrollVel = clampV(scrollVel + e.deltaY * k);
}, { passive: false });
canvas.addEventListener('pointerdown', e => {
  if (mode !== 'tower') return;
  dragging = true; dragY = e.clientY; dragMoved = 0; lastDragT = performance.now();
  scrollVel = 0;
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
});
canvas.addEventListener('pointermove', e => {
  if (!dragging) return;
  const dy = e.clientY - dragY; dragY = e.clientY; dragMoved += Math.abs(dy);
  const dPos = -dy * visH / innerHeight;
  scrollPos += dPos;
  const now = performance.now(), dts = Math.max(8, now - lastDragT) / 1000; lastDragT = now;
  scrollVel = clampV(scrollVel * 0.5 + (dPos / dts) * 0.5);
});
const endDrag = () => {
  if (!dragging) return;
  dragging = false;
  if (performance.now() - lastDragT > 90) scrollVel = 0;   // megállt a húzás a végén → nincs lendület
};
canvas.addEventListener('pointerup', e => {
  const wasDrag = dragMoved > 6;
  endDrag();
  if (wasDrag || mode !== 'tower') return;
  // kattintás (nem húzás): ha pillre esett, kiválasztjuk
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  camera.layers.set(0);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(hitTargets, false)[0];
  if (hit) selectPill(hit.object.userData.index);
});
canvas.addEventListener('pointercancel', endDrag);
document.addEventListener('keydown', e => {
  if (e.target && (/INPUT|BUTTON/.test(e.target.tagName) || (e.target.closest && e.target.closest('#vol')))) return;
  if (mode !== 'tower') return;
  if (e.key === 'ArrowDown') { scrollVel = clampV(scrollVel + 5); e.preventDefault(); }
  if (e.key === 'ArrowUp') { scrollVel = clampV(scrollVel - 5); e.preventDefault(); }
});
// érintésnél nincs hover: a koppintás dönti el, hogy pillre esett-e
canvas.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch') return;
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  camera.layers.set(0);
  ray.setFromCamera(ndc, camera);
  pointerIn = !!ray.intersectObjects(hitTargets, false)[0];
});

/* ---------- Kiválasztás: a többi pill leesik, a kiválasztott összehúzódik; vissza: felülről beesnek ----------
   mode: 'tower' (alap) → 'leaving' (esnek) → 'away' (nem látszanak, nem rajzoljuk) → 'returning' (beesnek) → 'tower' */
export let mode = 'tower';
let selected = -1, modeT = 0, onSelectFn = null;
export function onSelect(fn) { onSelectFn = fn; }
export const selectedIndex = () => selected;
function selectPill(i) {
  mode = 'leaving'; selected = i; modeT = 0;
  scrollVel = 0; dragging = false; pointerIn = false;
  pills.forEach((pl, j) => {
    pl.dvy = j === i ? 0 : 1.6 + Math.random() * 1.2;          // kis felugrás, aztán zuhanás
    pl.dvrz = j === i ? 0 : (Math.random() - 0.5) * 3;
    pl.delay = j === i ? 0 : Math.abs(j - i) * 0.05 + Math.random() * 0.05;   // a szomszédok esnek először
  });
  if (onSelectFn) onSelectFn(i);
}
// keep: ennek a pillnek a helyére csukódott vissza a projekt-oldal (henger), ezért az a helyén marad, csak a többi esik be
export function restorePills(keep = -1) {
  mode = 'returning'; modeT = 0; stack.visible = true;
  stack.position.set(0, TOWER_Y, 0); stack.scale.setScalar(1);       // a halom (js/heap.js) után vissza a torony helyére
  pills.forEach((pl, j) => {
    const stay = j === keep;
    pl.dy = stay ? 0 : visH * 0.75 + j * 0.5; pl.dvy = 0;      // a képen kívülről, fentről esnek vissza
    pl.drz = stay ? 0 : (Math.random() - 0.5) * 0.8; pl.dvrz = 0;
    pl.ds = 1; pl.dz = 0; pl.delay = stay ? 0 : j * 0.06;
    pl.holder.visible = true;
    pl.lf.rotation.z = 0; pl.lf.material.opacity = 1; if (pl.img) pl.img.mesh.rotation.z = 0;   // a halomban megfordított felirat vissza
  });
}
function updateDrop(dt) {
  modeT += dt;
  let busy = false;
  pills.forEach((pl, j) => {
    if (modeT < pl.delay) { busy = true; return; }
    if (mode === 'leaving') {
      if (j === selected) {                                       // a kiválasztott finoman felúszik és eltűnik
        pl.dy = damp(pl.dy, 0.6, 3, dt); pl.ds = damp(pl.ds, 0, 4.5, dt);
        if (pl.ds > 0.01) busy = true;
      } else {
        pl.dvy -= 26 * dt; pl.dy += pl.dvy * dt; pl.drz += pl.dvrz * dt;
        pl.dz = damp(pl.dz, -7, 3.5, dt);                         // hátrafelé is esnek → a megjelenő kártyák mögött tűnnek el
        if (pl.dy > -(visH + 3)) busy = true;
      }
    } else {                                                      // returning: rugó → kis túllendülés, folyékony leérkezés
      const k = 70, d = 11;
      pl.dvy += (-pl.dy * k - pl.dvy * d) * dt; pl.dy += pl.dvy * dt;
      pl.dvrz += (-pl.drz * k - pl.dvrz * d) * dt; pl.drz += pl.dvrz * dt;
      if (Math.abs(pl.dy) + Math.abs(pl.dvy) > 0.004) busy = true;
    }
  });
  if (!busy) {
    if (mode === 'leaving') { mode = 'away'; stack.visible = false; }
    else { mode = 'tower'; pills.forEach(pl => { pl.dy = pl.dvy = pl.dz = pl.drz = pl.dvrz = 0; pl.ds = 1; }); }
  }
}

const capMeta = document.getElementById('capMeta'), capName = document.getElementById('capName');
function setCaption(i) {
  if (i < 0) { capMeta.textContent = 'Válassz egy pillt'; capName.innerHTML = '&nbsp;'; }
  else { const p = PROJECTS[i]; capMeta.textContent = p.id + ' · ' + p.cat; capName.textContent = p.name; }
}

/* ---------- Animáció (kockánként) ---------- */
const TAU = Math.PI * 2;
let parX = 0, parY = 0;
export function updatePills(dt) {
  let h = -1;
  if (mode === 'away') return;                 // nincs mit mozgatni / rajzolni
  if (mode !== 'tower') updateDrop(dt);
  if (pointerIn && mode === 'tower') {
    camera.layers.set(0);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(hitTargets, false)[0];
    if (hit) h = hit.object.userData.index;
  }
  if ((dragging && dragMoved > 6) || Math.abs(scrollVel) > 2.5) h = -1;   // görgetés közben nincs kiemelés
  if (mode === 'leaving') h = selected;          // a kiválasztott szemben marad, amíg a többi leesik
  if (mode === 'returning') h = -1;
  if (h !== hovered) { hovered = h; setCaption(h); }   // a kurzor a színpadon rejtett: helyette az egérfény látszik (js/cursor.js)

  // görgetés fizika
  if (!dragging) {
    scrollPos += scrollVel * dt;
    scrollVel *= Math.exp(-dt * 3.2);
    if (Math.abs(scrollVel) < 0.8) {                         // finoman ráugrik a legközelebbi pillre
      const snap = Math.round(scrollPos / SP) * SP;
      scrollVel += (snap - scrollPos) * 22 * dt;
      scrollVel *= Math.exp(-dt * 5);
    }
  }
  const LOOP = N * SP, YMAX = LOOP / 2;
  const YV = Math.min(YMAX, VIEW_N * SP / 2);   // a dob látható fele: ennél távolabb a pillek összezsugorodnak és eltűnnek (mint 7 pillnél)
  const wrapY = y => ((y + YMAX) % LOOP + LOOP) % LOOP - YMAX;
  const speed = Math.min(Math.abs(scrollVel), 12);
  const spinSpeed = (S.spin / 100) * 0.75 + speed * 0.4;
  const any = hovered >= 0;
  const yh = any ? wrapY(pills[hovered].baseY + scrollPos) : 0;
  let centerIdx = -1;                               // érintőképernyőn: a középen nyugvó pill
  if (touchUI && mode === 'tower' && !dragging && Math.abs(scrollVel) < 0.6) {
    let best = 1e9;
    pills.forEach((pl, i) => { const a = Math.abs(wrapY(pl.baseY + scrollPos)); if (a < best) { best = a; centerIdx = i; } });
    if (best > SP * 0.3) centerIdx = -1;
  }
  pills.forEach((pl, i) => {
    const isH = i === hovered;
    if (isH) {
      pl.angle = damp(pl.angle, Math.round(pl.angle / Math.PI) * Math.PI, 7, dt);
    } else {
      pl.angle += spinSpeed * dt * (any ? 0.35 : 1);
      if (pl.angle > TAU * 1000) pl.angle -= TAU * 1000;
    }
    const yw = wrapY(pl.baseY + scrollPos);
    const dy = yw - yh;
    const target = any && !isH ? Math.sign(dy) * (0.36 + 0.14 / Math.max(1, Math.abs(dy) / SP)) : 0;
    pl.push = damp(pl.push, target, 6, dt);
    pl.z = damp(pl.z, isH ? 0.8 : 0, 6, dt);
    pl.s = damp(pl.s, isH ? 1.07 : (any ? 0.96 : 1), 6, dt);
    pl.hv = damp(pl.hv, isH ? 1 : 0, 6, dt);
    pl.mat.uniforms.uHover.value = pl.hv;
    if (pl.img) {                                   // projektkép: hoverre középről kinyílik, elengedve visszahúzódik
      const on = i === hovered || (touchUI && i === centerIdx);
      pl.rv = damp(pl.rv, on ? 1 : 0, on ? 2.4 : 3.2, dt);
      if (pl.rv < 0.002 && !on) pl.rv = 0;
      const u = pl.img.mat.uniforms;
      u.uReveal.value = pl.rv; u.uTime.value += dt;
      pl.img.mesh.visible = pl.rv > 0.002;
    }
    // dob-hatás: a szélek felé kisebb, hátrébb és megdől; a hurok varrata láthatatlan
    const r = Math.min(1, Math.abs(yw) / YV);
    const depth = r * r;
    const fade = 1 - THREE.MathUtils.smoothstep(r, 0.8, 1.0);
    const rise = pillRise(i) * visH;                 // belépés: alulról úszik fel a hullámokkal együtt (js/entrance.js)
    pl.holder.position.set(0, yw + pl.push + pl.dy - rise, pl.z - depth * 1.8 + pl.dz);
    pl.holder.scale.setScalar(Math.max(0.0001, pl.s * (1 - depth * 0.35) * fade * pl.ds));
    pl.holder.rotation.x = -(Math.max(-1, Math.min(1, yw / YV))) * 0.5 - scrollVel * 0.025;
    pl.holder.rotation.z = pl.drz;
    pl.spin.rotation.y = pl.angle;
  });

  parX = damp(parX, pointerIn ? mx : 0, 2, dt);
  parY = damp(parY, pointerIn ? my : 0, 2, dt);
  stack.rotation.x = 0.08 - parY * 0.06;
  stack.rotation.y = parX * 0.14;
}
