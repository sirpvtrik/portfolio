// Pill-torony: geometria, címke-textúrák, üveg, hover, görgetés
import { PROJECTS, N, S, PW, PH, SP } from './config.js';
import { renderer, camera, scene, canvas, onLayer, LAYER_BG, LAYER_GLASS, U, visH } from './scene.js';
import { glassVS, glassFS } from './shaders/glass.js';
import { damp } from './util.js';
import { stadium, glassSlab, remapUV } from './glassgeo.js';

/* ---------- 3D pill geometria ---------- */
function buildPillGeo(depth01) {
  return glassSlab(stadium, PW, PH, depth01, 72);   // perem mérete = Depth
}
let pillGeo = buildPillGeo(S.depth / 100);
const LW = PW - 0.56, LH = PH - 0.46;
const labelGeo = remapUV(new THREE.ShapeGeometry(stadium(LW, LH), 48));

/* ---------- Címke textúrák (a pill belsejében ülnek) ---------- */
const TW = 1240, TH = Math.round(TW * LH / LW);
function drawMotif(g, i) {
  g.save();
  g.strokeStyle = 'rgba(255,255,255,0.45)'; g.fillStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 3;
  const x0 = 790, x1 = 1060, cy = TH / 2;
  if (i === 0) {
    for (let k = 0; k < 5; k++) { g.beginPath();
      for (let x = x0; x <= x1; x += 4) { const y = cy - 70 + k * 35 + Math.sin((x - x0) / 34 + k * 0.9) * 14; x === x0 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.stroke(); }
  } else if (i === 1) {
    for (let k = 0; k < 4; k++) { const x = x0 + 20 + k * 58; g.beginPath();
      g.moveTo(x + 40, cy - 66); g.lineTo(x + 76, cy - 66); g.lineTo(x + 36, cy + 66); g.lineTo(x, cy + 66); g.closePath(); g.fill(); }
  } else if (i === 2) {
    for (let k = 1; k <= 5; k++) { g.beginPath(); g.arc(x0 + 30, cy, k * 25, -0.9, 0.9); g.stroke(); }
  } else if (i === 3) {
    const cx = (x0 + x1) / 2 + 10;
    for (let k = 0; k < 60; k++) { const a = k / 60 * Math.PI * 2, r0 = k % 5 ? 70 : 54;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * 82, cy + Math.sin(a) * 82); g.stroke(); }
  } else if (i === 4) {
    const vx = (x0 + x1) / 2, vy = cy;
    for (let k = -4; k <= 4; k++) { g.beginPath(); g.moveTo(vx, vy); g.lineTo(vx + k * 60, cy + 110); g.stroke();
      g.beginPath(); g.moveTo(vx, vy); g.lineTo(vx + k * 60, cy - 110); g.stroke(); }
    for (let k = 1; k <= 4; k++) { const d = k * k * 6.5; g.strokeRect(vx - d * 2.4, vy - d, d * 4.8, d * 2); }
  } else if (i === 5) {
    for (let x = x0; x <= x1; x += 22) { g.beginPath(); g.moveTo(x, cy - 78); g.lineTo(x, cy + 78); g.stroke(); }
  } else {                                           // oldalra fújt, elvékonyodó szélvonalak
    for (let k = 0; k < 6; k++) {
      const y0 = cy - 75 + k * 30, len = 150 + (k % 3) * 45;
      for (let s = 0; s < 3; s++) { g.lineWidth = 4 - s * 1.2; g.globalAlpha = 1 - s * 0.3; g.beginPath();
        for (let t = 0; t <= 1.0001; t += 0.05) { const x = x0 + (s * len / 3) + t * len / 3, y = y0 + Math.sin(t * 3.14 + k + s * 1.1) * 7 - t * 6;
          t === 0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
      g.globalAlpha = 1;
    }
  }
  g.restore();
}
function drawLabel(c, p, i) {
  const g = c.getContext('2d');
  g.clearRect(0, 0, TW, TH);
  drawMotif(g, i);
  const cy = TH / 2;
  g.fillStyle = 'rgba(255,255,255,0.72)';
  g.font = '500 28px "Geist Mono", ui-monospace, monospace';
  g.fillText(p.id, 215, cy - 92);
  g.fillText((p.cat + '  ·  ' + p.meta).toUpperCase(), 215, cy + 118);
  g.fillStyle = '#ffffff';
  let size = 140;
  g.font = `800 ${size}px Archivo, "Helvetica Neue", Arial, sans-serif`;
  const w = g.measureText(p.name.toUpperCase()).width, maxW = 540;
  if (w > maxW) { size = Math.floor(size * maxW / w); g.font = `800 ${size}px Archivo, "Helvetica Neue", Arial, sans-serif`; }
  g.fillText(p.name.toUpperCase(), 210, cy + 52);
}

/* ---------- Pillek ---------- */
const stack = new THREE.Group();
scene.add(stack);
const pills = [], hitTargets = [];
const hitGeo = new THREE.PlaneGeometry(PW, PH * 0.98);

PROJECTS.forEach((p, i) => {
  const c = document.createElement('canvas'); c.width = TW; c.height = TH;
  drawLabel(c, p, i);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const labelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.FrontSide });
  const glassMat = new THREE.ShaderMaterial({
    vertexShader: glassVS, fragmentShader: glassFS,
    uniforms: Object.assign({}, U, { uHover: { value: 0 }, uTintK: { value: 0 }, uGlow: { value: 0 },
      uTint: { value: new THREE.Vector3().fromArray(p.color || [1, 1, 1]) } }),
  });

  const holder = new THREE.Group(), spin = new THREE.Group();
  holder.add(spin);
  const glass = onLayer(new THREE.Mesh(pillGeo, glassMat), LAYER_GLASS);
  spin.add(glass);
  const lf = onLayer(new THREE.Mesh(labelGeo, labelMat), LAYER_BG); lf.position.z = 0.002; spin.add(lf);
  const lb = onLayer(new THREE.Mesh(labelGeo, labelMat), LAYER_BG); lb.position.z = -0.002; lb.rotation.y = Math.PI; spin.add(lb);

  const hit = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial());
  hit.visible = false; hit.userData.index = i;
  holder.add(hit); hitTargets.push(hit);

  const baseY = ((N - 1) / 2 - i) * SP;
  holder.position.y = baseY;
  stack.add(holder);
  pills.push({ holder, spin, glass, mat: glassMat, canvas: c, tex, baseY, angle: i * 0.5 + 0.35, y: baseY, z: 0, s: 1, hv: 0, push: 0,
    dy: 0, dvy: 0, dz: 0, drz: 0, dvrz: 0, ds: 1, delay: 0 });   // d*: leesés / visszaesés (dz: hátra, a projekt-kártyák mögé)
});

if (document.fonts && document.fonts.load) {
  // a tényleges szöveggel töltjük be (az ékezetes latin-ext rész is, pl. Ő, Ű, Ú), különben tartalék betűvel rajzolódhat
  const names = PROJECTS.map(p => p.name.toUpperCase()).join(' '), metas = PROJECTS.map(p => (p.id + ' ' + p.cat + ' ' + p.meta).toUpperCase()).join(' ');
  Promise.all([document.fonts.load('800 100px Archivo', names), document.fonts.load('500 28px "Geist Mono"', metas)])
    .then(() => pills.forEach((pl, i) => { drawLabel(pl.canvas, PROJECTS[i], i); pl.tex.needsUpdate = true; }))
    .catch(() => {});
}

/* ---------- Depth csúszka: a pill-geometria újraépítése (legfeljebb kockánként egyszer) ---------- */
let builtDepth = S.depth, geoPending = false;
function rebuildGeo() {
  geoPending = false;
  if (builtDepth === S.depth) return;
  builtDepth = S.depth;
  const old = pillGeo;
  pillGeo = buildPillGeo(S.depth / 100);
  pills.forEach(pl => { pl.glass.geometry = pillGeo; });
  old.dispose();
}
export function requestGeoRebuild() {
  if (!geoPending && builtDepth !== S.depth) { geoPending = true; requestAnimationFrame(rebuildGeo); }
}

/* ---------- Egér / érintés ---------- */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let pointerIn = false, mx = 0, my = 0, hovered = -1;
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
  if (dragMoved > 6) canvas.style.cursor = 'grabbing';
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
export function restorePills() {
  mode = 'returning'; modeT = 0; stack.visible = true;
  pills.forEach((pl, j) => {
    pl.dy = visH * 0.75 + j * 0.5; pl.dvy = 0;                 // a képen kívülről, fentről esnek vissza
    pl.drz = (Math.random() - 0.5) * 0.8; pl.dvrz = 0;
    pl.ds = 1; pl.dz = 0; pl.delay = j * 0.06;
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
  if (h !== hovered) { hovered = h; setCaption(h); canvas.style.cursor = h >= 0 ? 'pointer' : 'default'; }

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
  const wrapY = y => ((y + YMAX) % LOOP + LOOP) % LOOP - YMAX;
  const speed = Math.min(Math.abs(scrollVel), 12);
  const spinSpeed = (S.spin / 100) * 0.75 + speed * 0.4;
  const any = hovered >= 0;
  const yh = any ? wrapY(pills[hovered].baseY + scrollPos) : 0;
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
    if (PROJECTS[i].color) pl.mat.uniforms.uTintK.value = pl.hv;   // saját színű projekt: hoverre kicsit beszíneződik
    // dob-hatás: a szélek felé kisebb, hátrébb és megdől; a hurok varrata láthatatlan
    const r = Math.min(1, Math.abs(yw) / YMAX);
    const depth = r * r;
    const fade = 1 - THREE.MathUtils.smoothstep(r, 0.8, 1.0);
    pl.holder.position.set(0, yw + pl.push + pl.dy, pl.z - depth * 1.8 + pl.dz);
    pl.holder.scale.setScalar(Math.max(0.0001, pl.s * (1 - depth * 0.35) * fade * pl.ds));
    pl.holder.rotation.x = -(yw / YMAX) * 0.5 - scrollVel * 0.025;
    pl.holder.rotation.z = pl.drz;
    pl.spin.rotation.y = pl.angle;
  });

  parX = damp(parX, pointerIn ? mx : 0, 2, dt);
  parY = damp(parY, pointerIn ? my : 0, 2, dt);
  stack.rotation.x = 0.08 - parY * 0.06;
  stack.rotation.y = parX * 0.14;
}
