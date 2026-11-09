// Projekt-oldal: henger (Patrik ötlete, Figma: Desktop – 13; S.pjMode = 2).
// A kiválasztott vízszintes pill elforgatás nélkül a teljes képernyőre nyúlik szét: a stadion négy negyedét toljuk szét,
// így a lekerekített sarkok nem torzulnak, ez az üvegtest. Mögötte a tartalom egy vízszintes tengelyű hengeren gördül:
// a henger BELSŐ oldalán (Patrik referenciája): alulról gördül fel, a perem felé közelebb jön és szétnyílik, szemben egyenes,
// fent ugyanígy kiszélesedve gördül ki.
// Görgetésre lépésenként halad (STEP px görgetés egy lépés; megállva a következő lépéshatárra ugrik, project.js):
//  0: a cím középen → 1: alá felgördül a leírás (a cím kicsit feljebb megy) → 2: a cím és a leírás együtt felmegy, jön a
//  borító → 3: a borító felmegy, az 1. kép az 1. helyre → 4: 2. kép a 2. helyre → 5: 3. kép a 3. helyre → onnan helyenként
//  cserélődnek (az 1. hely képe felmegy, alulról a következő jön a helyére; aztán a 2., a 3. hely…) → a végén az utolsók is
//  felmennek, és a képernyő aljára lehullanak a pillek (js/heap.js).
// Galéria-videó ({ src, video }): amikor a kép a helyére ért, egyszer lejátszódik, és az utolsó kockáján áll meg (az maga a
// poszter); ha a kép elment, visszaáll az elejére, és újra feljövet újra lejátszódik.
// Vissza: a tartalom elhalványul, a test visszacsukódik a pill helyére (a toronyban az a pill a helyén marad).
import { PW, PH, S } from './config.js';
import { onLayer, LAYER_BG, LAYER_GLASS, U, camera, renderer } from './scene.js';
import { glassVS, glassFS, glassBackFS } from './shaders/glass.js';
import { stadium, glassSlab, faceZ } from './glassgeo.js';

const FONT = "'Nohemi', Archivo, 'Helvetica Neue', Arial, sans-serif";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = x => x * x * (3 - 2 * x);
// a lépésen belüli mozgás: a lágy indulás / megállás csak részben, így a görgetés elejétől látszik a mozgás (nem „ragad”)
const stepEase = x => 0.4 * x + 0.6 * ease(x);
const lerp = (a, b, t) => a + (b - a) * t;
const srcOf = g => (g && typeof g === 'object') ? g.src : g;

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

/* ---------- Elrendezés és menetrend (px; u: a henger palástján felfelé mért távolság a szemközti vonaltól) ---------- */
export function drumLayout(o) {
  const { vw, vh, k, name, cat, intro, cover, gallery } = o;
  const mob = vw <= 720, f = mob ? 1 : Math.min(vw / 1440, vh / 1024);           // a Figma-keret (1440 × 1024) arányában
  // cím (Figma: Nohemi Medium 40 / −2%, alatta 15 px-re Regular 20, 70%-os fehér) és leírás (Regular 16 / 24, középre)
  const t = { size: mob ? 30 : Math.max(26, 40 * f), csize: mob ? 16 : Math.max(14, 20 * f), gap: mob ? 12 : Math.max(10, 15 * f) };
  const tW = mob ? vw - 40 : Math.min(vw - 80, 760 * f), tH = t.size * 1.3 + t.gap + t.csize * 1.6;
  const ds = mob ? 15 : Math.max(14, 16 * f), dl = ds * 1.5, dW = mob ? vw - 110 : Math.max(320, 572 * f);   // telefonon beljebb: a szélén az üveg lencséje tör
  measure.font = `400 ${ds}px ${FONT}`;
  const lines = wrap(measure, intro || '', dW);
  const dH = Math.max(1, lines.length) * dl + ds * 0.6;
  const tRest = mob ? 44 : 29 * f, dCen = -((mob ? 70 : 64 * f) + dH / 2);      // Figma: a cím 29 px-szel a közép fölött, a leírás 64 px-szel alatta
  // borító (Figma: 1131 × 712, 20 px sarok)
  let cvW = mob ? vw - 72 : Math.min(1131 * f, vw - 120), cvH = cvW * 712 / 1131;
  if (cvH > vh * 0.7) { cvH = vh * 0.7; cvW = cvH * 1131 / 712; }
  // galéria: 3 hely egymás mellett (Figma: 443 × 627, 20 px köz), telefonon 2
  const cols = mob ? 2 : 3, gx = mob ? 12 : 20 * f;
  let cw = mob ? (vw - 72 - gx) / 2 : 443 * f, ch = cw * 627 / 443;
  if (ch > vh * 0.66) { ch = vh * 0.66; cw = ch * 443 / 627; }
  const radius = (mob ? 14 : 20 * f);
  const R = vh * 0.55, STEP = Math.max(340, vh * 0.48);                         // egy lépés ennyi görgetés (rövidebb: finomabb)
  // A henger BELSŐ oldala látszik (Patrik referenciája): a tartalom a képernyő tetejéhez / aljához közeledve felénk jön,
  // kiszélesedik és szétnyílik. OUT(h): ennyi úton (u) ér ki az elem teljesen a képernyőről (az alsó széle a tetején túl),
  // a kamera perspektívájával számolva, így a lépés elejétől látszik a mozgás (nincs holtjáték a képen kívül)
  const camZ = (vh / 2) / Math.tan(THREE.MathUtils.degToRad(16));                // a kamera távolsága px-ben (fov 32°)
  const yScr = u => { const p = u / R; return R * Math.sin(p) * camZ / Math.max(1, camZ - R * (1 - Math.cos(p))); };
  const OUT = h => { let u = 0; while (u < R * Math.PI / 2 + h && yScr(u - h / 2) < vh / 2 + 12) u += 4; return u; };
  const items = [];
  const pairD = OUT(0) - (dCen - dH / 2) + 10;                                    // a cím és a leírás együtt megy fel, amíg a leírás is kiér
  items.push({ kind: 'title', w: tW, h: tH, x: 0, name, cat, t, keys: [[0, 0], [STEP, tRest], [2 * STEP, tRest + pairD]] });
  items.push({ kind: 'desc', w: dW + 24, h: dH, x: 0, lines, ds, dl, keys: [[0, -OUT(dH)], [STEP, dCen], [2 * STEP, dCen + pairD]] });
  if (cover) items.push({ kind: 'img', w: cvW, h: cvH, x: 0, src: cover, radius, keys: [[STEP, -OUT(cvH)], [2 * STEP, 0], [3 * STEP, OUT(cvH)]] });
  const n = gallery.length;
  gallery.forEach((g, j) => {
    const e = j + 2, x = j + 2 + cols, col = j % cols;                             // e: ebben a lépésben jön fel, x: ebben megy el
    items.push({ kind: 'img', w: cw, h: ch, x: (col - (cols - 1) / 2) * (cw + gx), src: srcOf(g), video: g && g.video, radius,
      arrive: (e + 1) * STEP, leave: x * STEP,
      keys: [[e * STEP, -OUT(ch)], [(e + 1) * STEP, 0], [x * STEP, 0], [(x + 1) * STEP, OUT(ch)]] });
  });
  const last = n ? n + cols + 2 : 3;
  const sMax = last * STEP + STEP * 0.5;                                            // a végén kis hely a lehulló pilleknek
  const rests = []; for (let i = 0; i <= last; i++) rests.push(i * STEP);
  rests.push(sMax);
  const pillW = Math.min(PW / k, (mob ? vw : 900) / 3.3);
  return { vw, vh, k, mob, f, R, STEP, items, rests, sMax,
    heap: { floor: sMax + vh - (mob ? 36 : 64), width: vw, k, vh, vw, pillW } };
}

/* ---------- Rajzolók ---------- */
function rrPath(g, x, y, w, h, r) {
  g.beginPath();
  if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h);
}
// belső fehér ragyogás (Figma: inset 0 0 blur spread): a kép körvonalán kívüli keret árnyéka esik befelé
function insetGlow(g, x, y, w, h, r, blur, spread, color) {
  g.save();
  rrPath(g, x, y, w, h, r); g.clip();
  g.shadowColor = color; g.shadowBlur = blur;
  const m = blur * 3, sp = -spread;
  g.beginPath();
  g.rect(x - m, y - m, w + 2 * m, h + 2 * m);
  if (g.roundRect) g.roundRect(x - sp, y - sp, w + 2 * sp, h + 2 * sp, r + sp); else g.rect(x - sp, y - sp, w + 2 * sp, h + 2 * sp);
  g.fillStyle = '#000'; g.fill('evenodd');
  g.restore();
}
function drawTitle(g, it, q) {
  const W = it.w * q, H = it.h * q, t = it.t;
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  const ts = t.size * q, cs = t.csize * q, gap = t.gap * q;
  g.font = `500 ${ts}px ${FONT}`; if ('letterSpacing' in g) g.letterSpacing = (-0.02 * ts) + 'px';
  const tc = g.measureText('H').actualBoundingBoxAscent || ts * 0.7, cc = cs * 0.7;
  const y = H / 2 - (tc + gap + cc) / 2;
  g.fillStyle = '#f2f2f2'; g.fillText(it.name, W / 2, y + tc);
  g.font = `400 ${cs}px ${FONT}`; if ('letterSpacing' in g) g.letterSpacing = '0px';
  g.fillStyle = 'rgba(242,242,242,0.7)'; g.fillText((it.cat || '').toUpperCase(), W / 2, y + tc + gap + cc);
}
function drawDesc(g, it, q) {
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = `400 ${it.ds * q}px ${FONT}`; if ('letterSpacing' in g) g.letterSpacing = '0px';
  g.fillStyle = '#f2f2f2';
  it.lines.forEach((l, i) => g.fillText(l, it.w * q / 2, (i * it.dl + it.ds * 1.05) * q));
}
// kép a Figma szerint: 20 px sarok, 95%, belső ragyogás (inset 0 0 35.9px −6px, 45% fehér)
function imageDrawer(it, onLoad) {
  return (g, q) => {
    const W = it.w * q, H = it.h * q, r = it.radius * q;
    const im = new Image();
    im.onload = () => {
      const sc = Math.max(W / im.width, H / im.height), iw = im.width * sc, ih = im.height * sc;
      g.save(); rrPath(g, 0, 0, W, H, r); g.clip(); g.globalAlpha = 0.95;
      g.drawImage(im, (W - iw) / 2, (H - ih) / 2, iw, ih); g.restore();
      insetGlow(g, 0, 0, W, H, r, 35.9 * (it.radius / 20) * q, -6 * (it.radius / 20) * q, 'rgba(255,255,255,0.45)');
      onLoad();
    };
    im.src = it.src;
  };
}

/* ---------- Állapot ---------- */
let group = null, DL = null, kk = 1, st = null, body = null, items = [];
let morphT = 99, closeT = -1, ca = 0;

export const drumRests = () => (DL ? DL.rests : [0]);
export function drumStart() { morphT = 0; closeT = -1; ca = 0; }       // nyitás: a pill kinyúlik
export function drumSkipIntro() { morphT = 99; }                         // újraépítéskor (átméretezés, csúszka) nincs újra kinyúlás
export function drumClose() { closeT = 0; }                              // Vissza: összecsukódás

function texFromCanvas(cv) {
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}
function makeItem(it, k) {
  const q = Math.min(2, window.devicePixelRatio || 1) * (it.kind === 'img' ? 1 : 1.5);
  const geo = new THREE.PlaneGeometry(it.w * k, it.h * k, 1, 48);
  const o = { it, geo, base: geo.attributes.position.array.slice(), holder: new THREE.Group(), bend: -1, mats: [], texs: [], played: false };
  group.add(o.holder);
  const add = (mat, z, order) => {
    const m = onLayer(new THREE.Mesh(geo, mat), LAYER_BG); m.position.z = z; m.renderOrder = order; m.frustumCulled = false;
    o.holder.add(m); o.mats.push(mat);
  };
  if (it.video) {
    // videó: a kerekített sarkokat alfa-maszk adja, a belső ragyogás egy átlátszó réteg fölötte
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.loop = false;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.src = it.video;
    const vt = new THREE.VideoTexture(v);
    vt.minFilter = THREE.LinearFilter; vt.magFilter = THREE.LinearFilter;
    const refresh = () => { vt.needsUpdate = true; };
    v.addEventListener('loadeddata', refresh); v.addEventListener('seeked', refresh);
    v.load();
    const mc = document.createElement('canvas'); mc.width = Math.round(it.w); mc.height = Math.round(it.h);
    const mg = mc.getContext('2d'); mg.fillStyle = '#000'; mg.fillRect(0, 0, mc.width, mc.height);
    mg.fillStyle = '#fff'; rrPath(mg, 0, 0, mc.width, mc.height, it.radius); mg.fill();
    const mt = texFromCanvas(mc);
    const gc = document.createElement('canvas'); gc.width = Math.round(it.w * q); gc.height = Math.round(it.h * q);
    insetGlow(gc.getContext('2d'), 0, 0, gc.width, gc.height, it.radius * q, 35.9 * (it.radius / 20) * q, -6 * (it.radius / 20) * q, 'rgba(255,255,255,0.45)');
    const gt = texFromCanvas(gc);
    add(new THREE.MeshBasicMaterial({ map: vt, alphaMap: mt, transparent: true, depthWrite: false, color: new THREE.Color(0.95, 0.95, 0.95) }), 0, 1);
    add(new THREE.MeshBasicMaterial({ map: gt, transparent: true, depthWrite: false }), 0.003, 2);
    o.video = v; o.texs.push(vt, mt, gt);
  } else {
    const cv = document.createElement('canvas'); cv.width = Math.round(it.w * q); cv.height = Math.round(it.h * q);
    const tex = texFromCanvas(cv);
    const g = cv.getContext('2d');
    if (it.kind === 'img') imageDrawer(it, () => { tex.needsUpdate = true; })(g, q);
    else {
      o.redraw = () => { g.clearRect(0, 0, cv.width, cv.height); (it.kind === 'title' ? drawTitle : drawDesc)(g, it, q); tex.needsUpdate = true; };
      o.redraw();
    }
    add(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }), 0, 1);
    o.texs.push(tex);
  }
  return o;
}

export function buildDrum(grp, layout, k, opts) {
  disposeDrum();
  group = grp; DL = layout; kk = k; st = opts.pillStart || null;
  // az üvegtest: a toronybeli pill geometriája, amit a négy negyedénél fogva húzunk szét (setStretch)
  const depth01 = S.depth / 100, th = S.thick / 100;
  const geo = glassSlab(stadium, PW, PH, depth01, 72, th);
  const mat = new THREE.ShaderMaterial({ vertexShader: glassVS, fragmentShader: glassFS, uniforms: Object.assign({}, U, {
    uHover: { value: 0 }, uTintK: { value: 0 }, uTint: { value: new THREE.Vector3(1, 1, 1) },
    uHalf: { value: new THREE.Vector2(PW / 2, PH / 2) }, uRad: { value: PH / 2 }, uGlow: { value: 1 }, uLens: { value: 1 },
    uLensW: { value: 0.62 }, uFace: { value: 1 }, uSpecK: { value: 1 } }) });
  const bmat = new THREE.ShaderMaterial({ vertexShader: glassVS, fragmentShader: glassBackFS, uniforms: Object.assign({}, U, { uBackK: { value: 1 } }),
    side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const holder = new THREE.Group(); group.add(holder);
  const glass = onLayer(new THREE.Mesh(geo, mat), LAYER_GLASS), back = onLayer(new THREE.Mesh(geo, bmat), LAYER_BG);
  glass.frustumCulled = back.frustumCulled = false; back.renderOrder = 3;
  holder.add(glass, back);
  // a végső méret: a teljes képernyő (10 px-en belül), az előlap perspektívájával visszaszorozva
  const fz = faceZ(depth01, th), cz = camera.position.z, pf = (cz - fz) / cz, inset = 10;
  body = { holder, geo, mat, bmat, base: geo.attributes.position.array.slice(), dx: -1, dy: -1,
    dxF: Math.max(0, (DL.vw / 2 - inset) * k * pf - PW / 2), dyF: Math.max(0, (DL.vh / 2 - inset) * k * pf - PH / 2) };
  items = DL.items.map(it => makeItem(it, k));
  if (document.fonts && document.fonts.load) {
    const tt = DL.items.find(i => i.kind === 'title'), dd = DL.items.find(i => i.kind === 'desc');
    Promise.all([document.fonts.load(`500 40px ${FONT}`, tt ? tt.name : ''), document.fonts.load(`400 20px ${FONT}`, ((tt && tt.cat) || '').toUpperCase()),
      document.fonts.load(`400 16px ${FONT}`, dd ? dd.lines.join(' ') : '')])
      .then(() => items.forEach(o => o.redraw && o.redraw())).catch(() => {});
  }
}

// a stadion négy negyedét toljuk szét (x ≥ 0 jobbra, y ≥ 0 felfelé): a lekerekített végek nem torzulnak, a sík lap nő
function setStretch(dx, dy) {
  if (Math.abs(dx - body.dx) < 1e-5 && Math.abs(dy - body.dy) < 1e-5) return;
  body.dx = dx; body.dy = dy;
  const p = body.geo.attributes.position.array, q = body.base;
  for (let i = 0; i < p.length; i += 3) {
    p[i] = q[i] + (q[i] >= 0 ? dx : -dx);
    p[i + 1] = q[i + 1] + (q[i + 1] >= 0 ? dy : -dy);
  }
  body.geo.attributes.position.needsUpdate = true;
  const hy = PH / 2 + dy, u = body.mat.uniforms;
  u.uHalf.value.set(PW / 2 + dx, hy);
  u.uLensW.value = Math.min(0.62, 70 * kk / hy);      // a lencse a nagy testen csak a szélén (~70 px) tör
  const grow = clamp(dy / Math.max(body.dyF, 1e-3), 0, 1);
  u.uLens.value = lerp(1, 0.8, grow);
  // ahogy kinő a teljes képernyőre, a lap tükröződései és a hátlap fénye elhalványul (különben az egész kép fénylik);
  // a szélén a csíkfény és a vékony fényes él megmarad
  u.uFace.value = lerp(1, 0.06, grow);
}
// a sík a henger felületére hajlik (vízszintes tengely): b = 0 egyenes, 1 = a henger sugarán
function bendY(o, Rw, b) {
  if (Math.abs(b - o.bend) < 0.004) return;
  o.bend = b;
  const p = o.geo.attributes.position.array, q = o.base, r = Rw / Math.max(b, 1e-3);
  for (let i = 0; i < p.length; i += 3) {
    const t = q[i + 1] / r;
    p[i + 1] = r * Math.sin(t); p[i + 2] = r * (1 - Math.cos(t));      // belső oldal: a szélei felénk hajlanak
  }
  o.geo.attributes.position.needsUpdate = true;
}
// a menetrend: kulcspontok (görgetés, u) között lépésenként lágyan
function uAt(keys, s) {
  if (s <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [s0, u0] = keys[i], [s1, u1] = keys[i + 1];
    if (s <= s1) return s1 > s0 ? u0 + (u1 - u0) * stepEase((s - s0) / (s1 - s0)) : u1;
  }
  return keys[keys.length - 1][1];
}

/* ---------- Kockánként ---------- */
export function updateDrum(dt, s, closing) {
  if (!body) return;
  const k = kk, R = DL.R;
  // kinyúlás / összecsukódás: vízszintesen kicsit előbb nyúlik, mint függőlegesen; közben a pill helyéről középre úszik
  let mx, my, mp;
  if (closing) {
    if (closeT < 0) closeT = 0;
    closeT += dt;
    mx = my = mp = 1 - ease(clamp((closeT - 0.08) / 0.62, 0, 1));
    ca = Math.max(0, ca - dt / 0.18);
  } else {
    morphT += dt;
    mx = ease(clamp(morphT / 0.75, 0, 1)); my = ease(clamp((morphT - 0.15) / 0.75, 0, 1)); mp = ease(clamp(morphT / 0.9, 0, 1));
    ca = clamp((morphT - 0.7) / 0.4, 0, 1);
  }
  const s0 = st || { x: 0, y: 0, z: 0, sc: 1 };
  setStretch(body.dxF * mx, body.dyF * my);
  // „Pill fénye” (Glass panel, S.pjLight): kikapcsolva a kinőtt testen nincs fény, csak a fénytörés (Patrik tesztje);
  // a toronybeli pill méretében még a megszokott, ahogy nő, elhalványul
  const grow = clamp(body.dy / Math.max(body.dyF, 1e-3), 0, 1);
  body.mat.uniforms.uSpecK.value = S.pjLight ? 1 : 1 - grow;
  body.bmat.uniforms.uBackK.value = lerp(1, S.pjLight ? 0.2 : 0, grow);
  body.holder.position.set(lerp(s0.x, 0, mp), lerp(s0.y, 0, mp), lerp(s0.z, 0, mp));
  body.holder.scale.setScalar(lerp(s0.sc, 1, mp));
  // a tartalom a henger palástján
  items.forEach(o => {
    const it = o.it, u = uAt(it.keys, s), phi = u / R;
    const vis = Math.abs(phi) < Math.PI / 2 && ca > 0.002;
    o.holder.visible = vis;
    if (vis) {
      bendY(o, R * k, 0.12 + 0.88 * THREE.MathUtils.smoothstep(Math.abs(phi), 0.1, 1.2));
      // a henger belső felületén: fent / lent felénk jön (nagyobb, szétnyílik), és a henger tengelye felé néz
      o.holder.position.set(it.x * k, Math.sin(phi) * R * k, (1 - Math.cos(phi)) * R * k);
      o.holder.rotation.set(phi, 0, 0);
      o.mats.forEach(m => { m.opacity = ca; });
    }
    if (o.video) {                                   // a helyére ért → egyszer lejátszódik; ha elment, vissza az elejére
      const v = o.video, here = s >= it.arrive - 0.15 * DL.STEP && s <= it.leave + 0.5 * DL.STEP;
      if (here && !o.played && !closing) { o.played = true; try { v.currentTime = 0; } catch (_) {} const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
      if (o.played && (s < it.arrive - 0.6 * DL.STEP || s > it.leave + DL.STEP)) { o.played = false; v.pause(); try { v.currentTime = 0; } catch (_) {} }
      if (!v.paused) o.texs[0].needsUpdate = true;
    }
  });
}

export function disposeDrum() {
  items.forEach(o => {
    if (o.video) { o.video.pause(); o.video.removeAttribute('src'); o.video.load(); }
    o.geo.dispose(); o.mats.forEach(m => m.dispose()); o.texs.forEach(t => t.dispose());
  });
  if (body) { body.geo.dispose(); body.mat.dispose(); body.bmat.dispose(); }
  items = []; body = null; DL = null; group = null;
}
