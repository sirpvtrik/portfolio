// Projekt-oldal: henger (Patrik ötlete, Figma: Desktop – 13; S.pjMode = 2).
// A kiválasztott vízszintes pill elforgatás nélkül a teljes képernyőre nyúlik szét: a stadion négy negyedét toljuk szét,
// így a lekerekített sarkok nem torzulnak, ez az üvegtest. Mögötte a tartalom egy oszlopban, folyamatosan, lágyan gördül
// (Patrik referenciája: errormade.tech): a képernyő közepén sík, a teteje és az alja felé a pálya felénk hajlik, így a
// kilépő / belépő képek a széleken kiszélesednek, „szétnyílnak”, és lent mindig látszik, mi jön. Sorrend: cím → leírás
// (a szavai széthúzva jönnek alulról, és középre érve összeállnak) → borító → további nagy képek (detail.full) → galéria
// (gépen soronként 3, telefonon 1) → a végén a képernyő aljára lehullanak a pillek (js/heap.js).
// Galéria-videó ({ src, video }): amikor a kép a képernyő közepéhez ér, egyszer lejátszódik, és az utolsó kockáján áll
// meg (az maga a poszter); ha messze elment, visszaáll az elejére.
// Vissza: a tartalom elhalványul, a test visszacsukódik a pill helyére (a toronyban az a pill a helyén marad).
import { PW, PH, S } from './config.js';
import { onLayer, LAYER_BG, LAYER_GLASS, U, camera, renderer } from './scene.js';
import { glassVS, glassFS, glassBackFS } from './shaders/glass.js';
import { stadium, glassSlab, faceZ } from './glassgeo.js';

const FONT = "'Nohemi', Archivo, 'Helvetica Neue', Arial, sans-serif";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = x => x * x * (3 - 2 * x);
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

/* ---------- Elrendezés (px; y: lefelé, a tartalom tetejétől; yc: az elem közepe, s = yc-nél áll a képernyő közepén) ---------- */
export function drumLayout(o) {
  const { vw, vh, k, name, cat, intro, cover, gallery } = o, full = o.full || [];
  const mob = vw <= 720, f = mob ? 1 : Math.min(vw / 1440, vh / 1024);           // a Figma-keret (1440 × 1024) arányában
  // cím (Figma: Nohemi Medium 40 / −2%, alatta 15 px-re Regular 20, 70%-os fehér) és leírás (Regular 16 / 24, középre)
  const t = { size: mob ? 30 : Math.max(26, 40 * f), csize: mob ? 16 : Math.max(14, 20 * f), gap: mob ? 12 : Math.max(10, 15 * f) };
  const tW = mob ? vw - 40 : Math.min(vw - 80, 760 * f), tH = t.size * 1.3 + t.gap + t.csize * 1.6;
  const ds = mob ? 15 : Math.max(14, 16 * f), dl = ds * 1.5, dW = mob ? vw - 110 : Math.max(320, 572 * f);   // telefonon beljebb: a szélén az üveg lencséje tör
  measure.font = `400 ${ds}px ${FONT}`;
  const lines = wrap(measure, intro || '', dW);
  const dH = Math.max(1, lines.length) * dl + ds * 0.6;
  // borító (Figma: 1131 × 712, 20 px sarok)
  let cvW = mob ? vw - 72 : Math.min(1131 * f, vw - 120), cvH = cvW * 712 / 1131;
  if (cvH > vh * 0.7) { cvH = vh * 0.7; cvW = cvH * 1131 / 712; }
  // galéria: gépen soronként 3 kép (Figma: 443 × 627, 20 px köz), telefonon egy, nagyobb
  const cols = mob ? 1 : 3, gx = mob ? 0 : 20 * f;
  let cw = mob ? vw - 72 : 443 * f, ch = cw * 627 / 443;
  if (ch > vh * (mob ? 0.62 : 0.66)) { ch = vh * (mob ? 0.62 : 0.66); cw = ch * 443 / 627; }
  const radius = (mob ? 14 : 20 * f);
  const G = Math.max(64, vh * 0.12), Gr = mob ? Math.max(28, vh * 0.04) : Math.max(24, 36 * f);   // szakaszok és galéria-sorok köze
  // a pálya: középen sík (±A), a széleken r sugarú ívben felénk hajlik (a kilépő képek kiszélesednek, szétnyílnak)
  const A = vh * 0.26, Rc = vh * 0.36;
  const items = [];
  items.push({ kind: 'title', w: tW, h: tH, x: 0, name, cat, t, yc: 0 });
  // a leírás kezdetben a képernyő alján (széthúzva), felfelé jövet áll össze
  const sW = mob ? vw - 84 : Math.max(dW + 24, vw - 160);                      // a szélén ne érjen bele az üveg lencséjébe
  const dY = vh * 0.36;
  items.push({ kind: 'desc', w: sW, dW, h: dH, x: 0, lines, ds, dl, spread: true, yc: dY });
  let y = dY + dH / 2 + G;                                                         // a következő elem teteje
  const add = (it, h) => { it.yc = y + h / 2; items.push(it); y += h; };
  if (cover) { add({ kind: 'img', w: cvW, h: cvH, x: 0, src: cover, radius }, cvH); y += G; }
  full.forEach(src => { add({ kind: 'img', w: cvW, h: cvH, x: 0, src: srcOf(src), radius }, cvH); y += G; });
  let gal = null;
  if (o.cols2 && !mob && gallery.length) {
    // teszt (Patrik, Figma: Desktop – 17): a képek ugyanúgy gördülnek, mint eddig, soronként kettő (balra és jobbra); középen,
    // a két kép között egy-egy kis hengeren forognak a fajtanevek: a bal kép neve fentről lefelé, a jobbé lentről felfelé
    // fordul át, ahogy a sor a közepén áthalad
    let iw = 440 * f, ih = 628 * f;
    if (ih > vh * 0.66) { ih = vh * 0.66; iw = ih * 440 / 628; }
    const X = Math.min(458 * f, vw / 2 - 30 - iw / 2), d = ih + Gr;
    gal = { X, iw, ih, d, nx: 166 * f, nr: (ih / 2 - 15 * f) / Math.sin(Math.PI / 3) };
    const rowsN = Math.ceil(gallery.length / 2);
    gallery.forEach((g, j) => {
      const r = Math.floor(j / 2), side = j % 2 ? 1 : -1, yc = y + r * d + ih / 2;
      items.push({ kind: 'img', w: iw, h: ih, x: side * X, src: srcOf(g), video: g && g.video, radius: 10 * f, yc });
      const num = (srcOf(g).match(/(\d+)\.\w+$/) || [])[1];
      const name = (g && g.name) || (num ? 'Poszter ' + num : '');              // a hiányzó fajtanevek helyén egyelőre a poszter száma
      if (name) {
        const size = Math.max(14, 20 * f);
        measure.font = `400 ${size}px ${FONT}`;
        const text = name.toUpperCase(), w = measure.measureText(text).width + 8;
        items.push({ kind: 'label', text, size, w, h: 30 * f, x: side * gal.nx, drum: side, yc });
      }
    });
    y += rowsN * d - Gr;
  }
  const rows = gal ? 0 : Math.ceil(gallery.length / cols);
  if (!gal) gallery.forEach((g, j) => {
    const r = Math.floor(j / cols), col = j % cols, inRow = Math.min(cols, gallery.length - r * cols);
    items.push({ kind: 'img', w: cw, h: ch, x: (col - (inRow - 1) / 2) * (cw + gx), src: srcOf(g), video: g && g.video, radius,
      yc: y + r * (ch + Gr) + ch / 2 });
  });
  if (rows) y += rows * ch + (rows - 1) * Gr;
  const lastBottom = y;
  // a végén a pillek halma: a padló a tartalom alatt, a lap végén a képernyő aljára kerül
  const floor = lastBottom + vh / 2 + vh * 0.42;
  const sMax = Math.max(0, floor - vh + (mob ? 36 : 64));
  const pillW = Math.min(PW / k, (mob ? vw : 900) / 3.3);
  return { vw, vh, k, mob, f, A, Rc, items, sMax, gal, heap: { floor, width: vw, k, vh, vw, pillW } };
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
function drawLabel(g, it, q) {
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `400 ${it.size * q}px ${FONT}`; if ('letterSpacing' in g) g.letterSpacing = '0px';
  g.fillStyle = '#f2f2f2'; g.fillText(it.text, it.w * q / 2, it.h * q / 2 + it.size * q * 0.06);
}
// p = 0: minden sor szavai a teljes szélességben, sorkizártan széthúzva; p = 1: középre zárt bekezdés (dW széles).
// Az alsó sorok kicsit később állnak össze, így a bekezdés alulról felfelé „zárul”.
function drawDesc(g, it, q, p = 1) {
  const W = it.w * q, n = it.lines.length;
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.font = `400 ${it.ds * q}px ${FONT}`; if ('letterSpacing' in g) g.letterSpacing = '0px';
  const sp = g.measureText(' ').width, pad = 2 * q;
  it.lines.forEach((l, i) => {
    const ws = l.split(' '), wd = ws.map(w => g.measureText(w).width);
    const sum = wd.reduce((a, b) => a + b, 0), tot = sum + sp * (ws.length - 1);
    const pl = ease(clamp(p * 1.35 - 0.35 * (n > 1 ? i / (n - 1) : 0), 0, 1));
    const gap = ws.length > 1 ? (W - 2 * pad - sum) / (ws.length - 1) : 0;
    g.fillStyle = `rgba(242,242,242,${0.75 + 0.25 * pl})`;
    let xa = (W - tot) / 2, xs = ws.length > 1 ? pad : xa;
    const y = (i * it.dl + it.ds * 1.05) * q;
    ws.forEach((w, j) => {
      g.fillText(w, lerp(xs, xa, pl), y);
      xa += wd[j] + sp; xs += wd[j] + gap;
    });
  });
}
// kép a Figma szerint: 20 px sarok, 95%, belső ragyogás (inset 0 0 35.9px −6px, 45% fehér)
function imageDrawer(it, onLoad) {
  return (g, q) => {
    const W = it.w * q, H = it.h * q, r = it.radius * q;
    const im = new Image();
    im.onload = () => {
      const sc = Math.max(W / im.width, H / im.height), iw = im.width * sc, ih = im.height * sc;
      g.save(); rrPath(g, 0, 0, W, H, r); g.clip(); g.globalAlpha = 0.95;
      g.drawImage(im, (W - iw) / 2, (H - ih) / 2, iw, ih);
      g.restore();
      insetGlow(g, 0, 0, W, H, r, 35.9 * (it.radius / 20) * q, -6 * (it.radius / 20) * q, 'rgba(255,255,255,0.45)');
      onLoad();
    };
    im.src = it.src;
  };
}

/* ---------- Vágás a test körvonalára ---------- */
// A tartalom csak az üvegtesten belül látszik (Patrik: a test és a képernyő széle közti résben, a sarkokon kívül ne
// látsszon, mert elárulja, hogy nem a hengerből jön): a test aktuális körvonala (lekerekített téglalap, a pufferben
// pixelben) minden tartalom-anyag végén levágja a képpontot, 1 px-es lágy széllel.
const clipU = { uClip: { value: new THREE.Vector4(0, 0, 1e5, 1e5) }, uClipR: { value: 0 } };
function clipped(mat) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uClip = clipU.uClip; sh.uniforms.uClipR = clipU.uClipR;
    sh.fragmentShader = 'uniform vec4 uClip;\nuniform float uClipR;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
      vec2 cq = abs(gl_FragCoord.xy - uClip.xy) - uClip.zw + uClipR;
      float csd = length(max(cq, 0.0)) + min(max(cq.x, cq.y), 0.0) - uClipR;
      gl_FragColor.a *= clamp(0.5 - csd, 0.0, 1.0);`);
  };
  mat.customProgramCacheKey = () => 'drumClip';
  return mat;
}

/* ---------- Állapot ---------- */
let group = null, DL = null, kk = 1, st = null, body = null, items = [];
let morphT = 99, closeT = -1, ca = 0;

export function drumStart() { morphT = 0; closeT = -1; ca = 0; }       // nyitás: a pill kinyúlik
export function drumSkipIntro() { morphT = 99; }                         // újraépítéskor (átméretezés, csúszka) nincs újra kinyúlás
export function drumClose() { closeT = 0; }                              // Vissza: összecsukódás

function texFromCanvas(cv) {
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}
function makeItem(it, k) {
  const q = Math.min(2, window.devicePixelRatio || 1) * (it.kind === 'title' ? 1.5 : 1);   // a széles leírás kisebb felbontással (kockánként újrarajzolódik)
  const geo = new THREE.PlaneGeometry(it.w * k, it.h * k, 1, Math.max(24, Math.min(96, Math.round(it.h / 10))));
  const o = { it, geo, base: geo.attributes.position.array.slice(), holder: new THREE.Group(), lastU: NaN, mats: [], texs: [], played: false };
  group.add(o.holder);
  const add = (mat, z, order) => {
    clipped(mat);
    const m = onLayer(new THREE.Mesh(geo, mat), LAYER_BG); m.position.z = z; m.renderOrder = order; m.frustumCulled = false;
    o.holder.add(m); o.mats.push(mat);
  };
  if (it.video) {
    // videó: a kerekített sarkokat alfa-maszk adja, a belső ragyogás egy átlátszó réteg fölötte
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.loop = false;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.src = it.video;
    // a DOM-ban (láthatatlanul) tartjuk: a leválasztott videót némely böngésző nem játssza le, vagy nem ad új kockát
    v.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none;z-index:-1';
    v.setAttribute('aria-hidden', 'true');
    document.body.appendChild(v);
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
      o.p = it.spread ? 0 : 1;
      const draw = it.kind === 'title' ? drawTitle : (it.kind === 'label' ? drawLabel : drawDesc);
      o.redraw = () => { g.clearRect(0, 0, cv.width, cv.height); draw(g, it, q, o.p); tex.needsUpdate = true; };
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
  // a végső méret: a teljes képernyő (10 px-en belül), az előlap perspektívájával visszaszorozva. A sarok íve 50 px
  // (Figma 261-133): ehhez a test kicsinyítve (sc1) nyúlik szét, így a sarokgombok (26 px-re a széltől) koncentrikusan
  // ülnek az íven
  const fz = faceZ(depth01, th), cz = camera.position.z, pf = (cz - fz) / cz, inset = 10, Rpx = 50;
  const sc1 = Rpx * k * pf / (PH / 2);
  body = { holder, geo, mat, bmat, base: geo.attributes.position.array.slice(), dx: -1, dy: -1, sc: 1, sc1, pf,
    dxF: Math.max(0, (DL.vw / 2 - inset) * k * pf / sc1 - PW / 2), dyF: Math.max(0, (DL.vh / 2 - inset) * k * pf / sc1 - PH / 2) };
  items = DL.items.map(it => makeItem(it, k));
  if (document.fonts && document.fonts.load) {
    const tt = DL.items.find(i => i.kind === 'title'), dd = DL.items.find(i => i.kind === 'desc');
    Promise.all([document.fonts.load(`500 40px ${FONT}`, tt ? tt.name : ''), document.fonts.load(`400 20px ${FONT}`, ((tt && tt.cat) || '').toUpperCase()),
      document.fonts.load(`400 16px ${FONT}`, dd ? dd.lines.join(' ') : '')])
      .then(() => items.forEach(o => o.redraw && o.redraw())).catch(() => {});
  }
}

// a stadion négy negyedét toljuk szét (x ≥ 0 jobbra, y ≥ 0 felfelé): a lekerekített végek nem torzulnak, a sík lap nő
function setStretch(dx, dy, sc) {
  if (Math.abs(dx - body.dx) < 1e-5 && Math.abs(dy - body.dy) < 1e-5 && Math.abs(sc - body.sc) < 1e-5) return;
  body.dx = dx; body.dy = dy; body.sc = sc;
  const p = body.geo.attributes.position.array, q = body.base;
  for (let i = 0; i < p.length; i += 3) {
    p[i] = q[i] + (q[i] >= 0 ? dx : -dx);
    p[i + 1] = q[i + 1] + (q[i + 1] >= 0 ? dy : -dy);
  }
  body.geo.attributes.position.needsUpdate = true;
  const hy = PH / 2 + dy, u = body.mat.uniforms;
  u.uHalf.value.set(PW / 2 + dx, hy);
  u.uLensW.value = Math.min(0.62, 70 * kk / (hy * sc));   // a lencse a nagy testen csak a szélén (~70 px) tör
  const grow = clamp(dy / Math.max(body.dyF, 1e-3), 0, 1);
  u.uLens.value = lerp(1, 0.8, grow);
  // ahogy kinő a teljes képernyőre, a lap tükröződései és a hátlap fénye elhalványul (különben az egész kép fénylik);
  // a szélén a csíkfény és a vékony fényes él megmarad
  u.uFace.value = lerp(1, 0.06, grow);
}
// a pálya (px, u: a képernyő közepétől felfelé mért távolság a pálya mentén): középen sík, a széleken Rc sugarú ívben
// felénk hajlik (z); a negyedív után nem megy tovább (ott már a képen kívül van)
function pathAt(u, out) {
  const A = DL.A, Rc = DL.Rc, au = Math.abs(u), sg = u < 0 ? -1 : 1;
  if (au <= A) { out[0] = u; out[1] = 0; return out; }
  const t = Math.min((au - A) / Rc, Math.PI / 2);
  out[0] = sg * (A + Rc * Math.sin(t)); out[1] = Rc * (1 - Math.cos(t));
  return out;
}
const P = [0, 0];
// az elem csúcsait a pályára tesszük (u: az elem közepe a pályán)
function placeOnPath(o, u, k) {
  if (Math.abs(u - o.lastU) < 0.05) return;
  o.lastU = u;
  const p = o.geo.attributes.position.array, q = o.base;
  for (let i = 0; i < p.length; i += 3) {
    pathAt(u + q[i + 1] / k, P);
    p[i + 1] = P[0] * k; p[i + 2] = P[1] * k;
  }
  o.geo.attributes.position.needsUpdate = true;
}

/* ---------- Kockánként ---------- */
export function updateDrum(dt, s, closing) {
  if (!body) return;
  const k = kk;
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
  const sxy = lerp(s0.sc, body.sc1, mp);                // síkban a végső méretre (50 px-es sarok), mélységben marad
  setStretch(body.dxF * mx, body.dyF * my, sxy);
  // „Pill fénye” (Glass panel, S.pjLight): kikapcsolva a kinőtt testen nincs fény, csak a fénytörés (Patrik tesztje);
  // a toronybeli pill méretében még a megszokott, ahogy nő, elhalványul
  const grow = clamp(body.dy / Math.max(body.dyF, 1e-3), 0, 1);
  body.mat.uniforms.uSpecK.value = S.pjLight ? 1 : 1 - grow;
  body.bmat.uniforms.uBackK.value = lerp(1, S.pjLight ? 0.2 : 0, grow);
  body.holder.position.set(lerp(s0.x, 0, mp), lerp(s0.y, 0, mp), lerp(s0.z, 0, mp));
  body.holder.scale.set(sxy, sxy, lerp(s0.sc, 1, mp));
  // a test körvonala a képernyőn (az előlap síkjában): ehhez vágjuk a tartalmat
  {
    const px = 1 / (k * body.pf), dpr = renderer.getPixelRatio();
    const hw = (PW / 2 + body.dx) * sxy * px, hh = (PH / 2 + body.dy) * sxy * px;
    clipU.uClip.value.set((DL.vw / 2 + body.holder.position.x * px) * dpr, (DL.vh / 2 + body.holder.position.y * px) * dpr, hw * dpr, hh * dpr);
    clipU.uClipR.value = Math.min(hw, hh, (PH / 2) * sxy * px) * dpr;
  }
  // a tartalom a pályán: középen sík, a széleken felénk hajlik
  const lim = DL.A + DL.Rc * Math.PI / 2, vh = DL.vh;
  const GL = DL.gal;
  items.forEach(o => {
    const it = o.it;
    const u = s - it.yc;
    if (it.drum) {                                   // név a középső kis hengeren (a pálya helyett a képernyő közepén áll)
      // a sor közepén áthaladva: bal név +60° → −60° (fentről le), jobb név −60° → +60° (lentről fel)
      const th = it.drum * (-Math.PI / 3 + (u / GL.d) * (2 * Math.PI / 3));
      const vis = Math.abs(th) < Math.PI / 2 - 0.02 && ca > 0.002;
      o.holder.visible = vis;
      if (vis) {
        const r = GL.nr;
        // a dőlés és a mélység a valódi henger ~60%-a: a Figma-állásban (fent / lent, ±60°) is jól olvasható maradjon
        o.holder.position.set(it.x * k, r * Math.sin(th) * k, (r * Math.cos(th) - r) * 0.6 * k);
        o.holder.rotation.set(-th * 0.6, 0, 0);
        const a = ca * (1 - THREE.MathUtils.smoothstep(Math.abs(th), 1.2, 1.55));
        o.mats.forEach(m => { m.opacity = a; });
      }
      return;
    }
    if (it.spread) {                                 // a leírás szavai felfelé jövet, a közép alatt állnak össze
      const p = u >= -vh * 0.06 ? 1 : 1 - THREE.MathUtils.smoothstep(-u, vh * 0.06, vh * 0.4);
      if (Math.abs(p - o.p) > 0.002 || (p !== o.p && (p === 0 || p === 1))) { o.p = p; o.redraw(); }
    }
    const vis = Math.abs(u) - it.h / 2 < lim && ca > 0.002;
    o.holder.visible = vis;
    if (vis) {
      placeOnPath(o, u, k);
      o.holder.position.set(it.x * k, 0, 0);
      o.mats.forEach(m => { m.opacity = ca; });
    }
    if (o.video) {                                   // a közepéhez ért → egyszer lejátszódik; ha messze elment, vissza az elejére
      const v = o.video, here = Math.abs(u) < vh * 0.22;
      const now = performance.now();
      if (here && !o.played && !closing && now > (o.retryAt || 0)) {
        o.played = true; try { v.currentTime = 0; } catch (_) {}
        const pr = v.play();
        if (pr && pr.catch) pr.catch(() => { o.played = false; o.retryAt = performance.now() + 400; });   // nem indult: kicsit később újra
      }
      if (o.played && Math.abs(u) > vh * 1.1) { o.played = false; v.pause(); try { v.currentTime = 0; } catch (_) {} }
      if (!v.paused) o.texs[0].needsUpdate = true;
    }
  });
}

export function disposeDrum() {
  items.forEach(o => {
    if (o.video) { o.video.pause(); o.video.removeAttribute('src'); o.video.load(); o.video.remove(); }
    o.geo.dispose(); o.mats.forEach(m => m.dispose()); o.texs.forEach(t => t.dispose());
  });
  if (body) { body.geo.dispose(); body.mat.dispose(); body.bmat.dispose(); }
  items = []; body = null; DL = null; group = null;
}
