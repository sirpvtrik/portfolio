(() => {
'use strict';

/* ---------- Projektek (placeholder) ---------- */
const PROJECTS = [
  { id: 'P01', name: 'Water',     cat: 'Betűkészlet',    meta: 'Kísérleti display font' },
  { id: 'P02', name: 'MP',        cat: 'Arculat',        meta: 'Saját jel' },
  { id: 'P03', name: 'Chime',     cat: 'App koncepció',  meta: 'Csak hangüzenet' },
  { id: 'P04', name: 'Időkövető', cat: 'Desktop app',    meta: 'Saját eszköz' },
  { id: 'P05', name: 'Backrooms', cat: '3D web',         meta: 'Liminális portfólió' },
  { id: 'P06', name: 'Csarnok',   cat: 'Social kampány', meta: 'Ipari csarnok' },
];
const N = PROJECTS.length;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Glass beállítások (Figma alapértékek) ---------- */
const DEFAULTS = { ang: -45, int: 80, refr: 100, depth: 55, disp: 50, frost: 0, splay: 100, spin: reduced ? 10 : 40, react: 55, wlight: 50, wpush: 40, wspeed: reduced ? 12 : 40, surge: 50, bpmSync: false, wstyle: 0 };
const S = Object.assign({}, DEFAULTS);

/* ---------- Renderer ---------- */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputEncoding = THREE.LinearEncoding;
renderer.toneMapping = THREE.NoToneMapping;
renderer.setClearColor(0x000000, 1);

const LAYER_BG = 1, LAYER_GLASS = 2;   // 1: ami az üveg mögött/belsejében van, 2: maga az üveg
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
const scene = new THREE.Scene();
const onLayer = (obj, l) => { obj.layers.set(l); return obj; };

const bufSize = new THREE.Vector2();
const rt = new THREE.WebGLRenderTarget(4, 4, {
  samples: renderer.capabilities.isWebGL2 ? 4 : 0,
  minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
});

/* ---------- Kis MP logó fent középen ---------- */
const LOGO_PATHS = [
  'M 253.86 0.00 L 58.83 0.00 C 56.47 0.00 53.97 0.83 51.32 2.48 C 48.67 4.13 46.70 6.13 45.40 8.48 L 1.24 84.80 C 0.41 86.33 0.00 87.75 0.00 89.04 C 0.00 91.87 1.65 93.28 4.95 93.28 L 47.34 93.28 C 49.58 93.28 52.03 92.46 54.68 90.81 C 57.33 89.16 59.30 87.16 60.59 84.80 L 99.81 16.96 C 101.23 14.61 103.23 12.61 105.82 10.96 C 108.41 9.31 110.88 8.48 113.24 8.48 C 116.42 8.48 118.01 9.90 118.01 12.72 C 118.01 14.01 117.59 15.42 116.76 16.95 L 77.54 84.79 C 76.72 86.33 76.32 87.74 76.32 89.04 C 76.32 91.87 77.97 93.28 81.27 93.28 L 123.77 93.28 C 126.01 93.28 128.46 92.47 131.12 90.83 C 133.77 89.20 135.75 87.22 137.05 84.88 L 176.16 16.98 C 177.57 14.62 179.57 12.61 182.15 10.96 C 184.74 9.31 187.21 8.48 189.56 8.48 C 192.74 8.48 194.33 9.90 194.33 12.72 C 194.33 14.02 193.91 15.43 193.09 16.96 L 144.86 100.70 C 143.45 103.06 142.74 105.71 142.74 108.65 C 142.74 110.65 143.10 112.30 143.80 113.60 L 167.30 153.35 C 167.89 154.52 168.71 155.11 169.77 155.11 C 171.77 155.11 173.66 153.58 175.42 150.52 L 257.40 8.48 C 258.22 6.95 258.63 5.54 258.63 4.24 C 258.63 1.42 257.04 0.00 253.86 0.00 Z',
  'M 330.16 0.00 L 211.44 0.00 C 209.09 0.00 206.61 0.83 204.02 2.48 C 201.43 4.13 199.43 6.13 198.02 8.48 L 144.84 100.70 C 143.43 103.06 142.72 105.71 142.72 108.65 C 142.72 110.65 143.08 112.30 143.78 113.60 L 167.28 153.35 C 167.87 154.52 168.75 155.11 169.93 155.11 C 171.69 155.11 173.41 153.77 175.08 151.08 L 203.52 101.77 L 252.43 16.96 C 253.84 14.61 255.84 12.61 258.43 10.96 C 261.03 9.31 263.50 8.48 265.86 8.48 C 269.15 8.48 270.80 9.89 270.80 12.71 C 270.80 13.74 270.50 14.85 269.89 16.02 C 269.73 16.33 269.56 16.64 269.36 16.95 L 235.12 76.32 L 234.61 77.19 L 229.49 86.07 C 227.64 89.27 229.95 93.28 233.65 93.28 L 276.28 93.28 C 278.63 93.28 281.11 92.46 283.70 90.81 C 286.29 89.16 288.29 87.16 289.71 84.80 L 333.69 8.48 C 334.64 6.95 335.11 5.54 335.11 4.24 C 335.11 1.42 333.46 0.00 330.16 0.00 Z',
];
// A logó szárai a zenére rövidülnek, a saját 60°-os dőlésük mentén (a korábbi „MP Hangreaktív Logó” logikája)
// 1 = mély, 2 = közép, 3 = teljes hangerő, 4 = magas; csendben a teljes logó látszik
const logoSvg = document.getElementById('logoTop');
logoSvg.setAttribute('viewBox', '-4 -4 343 164');
logoSvg.innerHTML = '<defs><g id="lgMp">' + LOGO_PATHS.map(d => '<path d="' + d + '"/>').join('') + '</g>' +
  '<clipPath id="lgFixed"><rect id="lgCut"/></clipPath><clipPath id="lgBelow"><rect id="lgBel"/></clipPath>' +
  [1, 2, 3, 4].map(i => '<clipPath id="lgC' + i + '"><polygon id="lgS' + i + '"/></clipPath>').join('') + '</defs>' +
  '<use href="#lgMp" clip-path="url(#lgFixed)"/><g clip-path="url(#lgBelow)">' +
  [1, 2, 3, 4].map(i => '<g id="lgB' + i + '"><use href="#lgMp" clip-path="url(#lgC' + i + ')"/></g>').join('') + '</g>';
const updateLogo = (() => {
  const BASE = 93.28, YMIN = 35.8, YCUT = 20, K = 0.578, HMAX = BASE - YMIN;
  const gap = (x0, y0) => y => x0 - K * (y - y0);
  const g1 = gap(108.29, 16.96), g2 = gap(184.6, 16.97), g3 = gap(260.94, 16.95);
  const T = -60, B = 180, L = -60, RR = 420;
  const pts = a => a.map(p => p.map(n => n.toFixed(2)).join(',')).join(' ');
  const $ = id => document.getElementById(id);
  const set = (el, o) => { for (const k in o) el.setAttribute(k, o[k]); };
  set($('lgCut'), { x: L, y: T, width: RR - L, height: YCUT - T });
  set($('lgBel'), { x: L, y: YCUT - 0.6, width: RR - L, height: B - YCUT });
  const s0 = YCUT - 3;
  $('lgS1').setAttribute('points', pts([[L, s0], [g1(s0), s0], [g1(B), B], [L, B]]));
  $('lgS2').setAttribute('points', pts([[g1(s0), s0], [g2(s0), s0], [g2(B), B], [g1(B), B]]));
  $('lgS3').setAttribute('points', pts([[g2(s0), s0], [g3(s0), s0], [g3(B), B], [g2(B), B]]));
  $('lgS4').setAttribute('points', pts([[g3(s0), s0], [RR, s0], [RR, B], [g3(B), B]]));
  const V_LEAD = 113.6 - BASE, H3MAX = HMAX + V_LEAD;     // a V hegye mindig a leghosszabb marad
  const bars = [1, 2, 3, 4].map(i => $('lgB' + i));
  const move = (i, h) => bars[i].setAttribute('transform', 'translate(' + (K * h).toFixed(3) + ' ' + (-h).toFixed(3) + ')');
  const bands = [[30, 160], [160, 2200], [30, 11000], [2200, 11000]];
  const peak = [0.3, 0.3, 0.3, 0.3], lvl = [1, 1, 1, 1], FLOOR = [0.12, 0.08, 0.08, 0.04];
  return (freqArr, sampleRate, fftSize, active, sens) => {
    for (let i = 0; i < 4; i++) {
      let target = 1;
      if (active) {
        const hz = sampleRate / fftSize;
        const a = Math.max(1, Math.floor(bands[i][0] / hz)), b = Math.min(freqArr.length - 1, Math.ceil(bands[i][1] / hz));
        let sum = 0; for (let j = a; j <= b; j++) sum += freqArr[j];
        const v = sum / ((b - a + 1) * 255);
        peak[i] = Math.max(v, peak[i] * 0.996, FLOOR[i]);              // sávonkénti automatikus erősítés
        target = Math.min(1, Math.max(0, Math.pow(v / peak[i], 1.8) * sens - 0.08));
      }
      lvl[i] += (target - lvl[i]) * (target > lvl[i] ? 0.55 : (active ? 0.12 : 0.08));
    }
    const h = [0, 1, 3].map(i => (1 - lvl[i]) * HMAX);
    move(0, h[0]); move(1, h[1]); move(3, h[2]);
    move(2, Math.min((1 - lvl[2]) * H3MAX, Math.min(...h) + V_LEAD));
  };
})();

/* ---------- 3D pill geometria ---------- */
const PW = 3.6, PH = 1.48;
function stadium(w, h) {
  const r = h / 2, x = w / 2 - r, s = new THREE.Shape();
  s.moveTo(-x, -r); s.lineTo(x, -r);
  s.absarc(x, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(-x, r);
  s.absarc(-x, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  return s;
}
// Az oldalfal + perem normáljait kisimítjuk (az előlap marad sík → tiszta közép)
function smoothSides(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  const side = geo.groups[1] || { start: 0, count: p.count };
  const key = i => Math.round(p.getX(i) * 1e4) + '_' + Math.round(p.getY(i) * 1e4) + '_' + Math.round(p.getZ(i) * 1e4);
  const acc = new Map();
  for (let i = side.start; i < side.start + side.count; i++) {
    const k = key(i); let a = acc.get(k);
    if (!a) { a = [0, 0, 0]; acc.set(k, a); }
    a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i);
  }
  for (let i = side.start; i < side.start + side.count; i++) {
    const a = acc.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1;
    n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l);
  }
  n.needsUpdate = true;
  return geo;
}
function buildPillGeo(depth01) {
  const b = 0.05 + depth01 * 0.32;           // perem mérete = Depth
  const geo = new THREE.ExtrudeGeometry(stadium(PW - 2 * b, PH - 2 * b), {
    depth: 0.18, bevelEnabled: true, bevelThickness: b * 0.95, bevelSize: b, bevelSegments: 16, curveSegments: 72,
  });
  geo.center();
  return smoothSides(geo);
}
let pillGeo = buildPillGeo(S.depth / 100);
const LW = PW - 0.56, LH = PH - 0.46;
function remapUV(geo) {
  geo.computeBoundingBox();
  const bb = geo.boundingBox, p = geo.attributes.position, uv = geo.attributes.uv;
  const w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - bb.min.x) / w, (p.getY(i) - bb.min.y) / h);
  uv.needsUpdate = true; return geo;
}
const labelGeo = remapUV(new THREE.ShapeGeometry(stadium(LW, LH), 48));

/* ---------- Liquid glass shader (képernyőtérbeli fénytörés valódi 3D normálokkal) ---------- */
const glassVS = /* glsl */`
  varying vec3 vN;
  varying vec3 vV;
  varying float vEdge;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vEdge = clamp((1.0 - abs(normal.z)) * 5.0, 0.0, 1.0);   // 0 a sík előlapon, 1 a peremen
    vV = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`;
const glassFS = /* glsl */`
  precision highp float;
  uniform sampler2D uBg;
  uniform vec2  uRes;
  uniform float uRefr, uDisp, uFrost, uSplay, uLightAng, uLightInt, uHover, uPulse;
  varying vec3 vN;
  varying vec3 vV;
  varying float vEdge;

  vec3 bgAt(vec2 uv) {
    vec3 s = texture2D(uBg, uv).rgb;
    if (uFrost < 0.001) return s;
    float rad = uFrost * 0.014;
    vec2 asp = vec2(uRes.y / uRes.x, 1.0);
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.7854;
      s += texture2D(uBg, uv + vec2(cos(a), sin(a)) * asp * rad).rgb;
      s += texture2D(uBg, uv + vec2(cos(a + 0.39), sin(a + 0.39)) * asp * rad * 0.5).rgb;
    }
    return s / 17.0;
  }

  // stúdió-környezet: nagy softbox a fény irányából + vékony ellenfény-csík → fémes perem
  float envAt(vec3 R, vec3 Ld) {
    vec3 Lo = normalize(vec3(-Ld.xy, 0.25));
    float soft  = smoothstep(0.25, 0.97, dot(R, Ld));
    float strip = smoothstep(0.9, 0.995, dot(R, Lo)) * 0.75;
    float top   = smoothstep(0.86, 1.0, R.y) * 0.3;
    return soft * 1.5 + strip + top;
  }

  vec2 dev(vec3 V, vec3 N, float eta) {
    vec3 rd = refract(-V, N, eta);
    return rd.xy + V.xy;               // eltérés az egyenes nézéstől
  }

  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(-vV);
    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float g = 1.0 - ndv;
    vec2 suv = gl_FragCoord.xy / uRes;
    vec2 asp = vec2(uRes.y / uRes.x, 1.0);

    float spl = mix(pow(g, 1.4) * 2.2, 1.0, uSplay);
    float w = smoothstep(0.0, 1.0, vEdge);              // sík lap → tiszta, perem → törés
    float amt = uRefr * 0.2 * spl * w;
    float k = uDisp * 0.14 * w;
    vec2 dR = dev(V, N, 1.0 / (1.5 - k)) * amt * asp;
    vec2 dG = dev(V, N, 1.0 / 1.5)       * amt * asp;
    vec2 dB = dev(V, N, 1.0 / (1.5 + k)) * amt * asp;
    // diszperzió erősebb a peremen
    dR *= 1.0 - k * g * 1.5;
    dB *= 1.0 + k * g * 1.5;

    vec3 col;
    col.r = bgAt(suv + dR).r;
    col.g = bgAt(suv + dG).g;
    col.b = bgAt(suv + dB).b;

    col *= mix(vec3(1.0), vec3(0.9, 0.93, 0.98), g);     // vastagabb üveg a peremen
    col = mix(col, vec3(0.2), uFrost * 0.22);

    float la = radians(uLightAng);
    vec3 Ld = normalize(vec3(-cos(la), -sin(la), 0.7));
    vec3 R = reflect(-V, N);
    float F = 0.05 + 0.95 * pow(g, 3.0);
    float boost = 1.0 + uPulse * 0.5 + uHover * 0.4;
    col += vec3(envAt(R, Ld)) * F * uLightInt * boost;
    col += smoothstep(0.78, 1.0, dot(R, Ld)) * 0.22 * uLightInt;               // sheen a lapon, ahogy forog
    col += pow(max(dot(N, normalize(Ld + V)), 0.0), 110.0) * 1.8 * uLightInt;  // csillanás
    col += smoothstep(0.86, 0.985, g) * 0.28 * uLightInt * boost;             // vékony világos kontúr

    gl_FragColor = vec4(col, 1.0);
  }`;

const U = {
  uBg: { value: rt.texture },
  uRes: { value: new THREE.Vector2(1, 1) },
  uRefr: { value: 1 }, uDisp: { value: 0.5 }, uFrost: { value: 0 },
  uSplay: { value: 1 }, uLightAng: { value: -45 }, uLightInt: { value: 0.8 }, uPulse: { value: 0 },
};

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
  } else {
    for (let x = x0; x <= x1; x += 22) { g.beginPath(); g.moveTo(x, cy - 78); g.lineTo(x, cy + 78); g.stroke(); }
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
const SP = 1.56;
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
    uniforms: Object.assign({}, U, { uHover: { value: 0 } }),
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
  pills.push({ holder, spin, glass, mat: glassMat, canvas: c, tex, baseY, angle: i * 0.5 + 0.35, y: baseY, z: 0, s: 1, hv: 0, push: 0 });
});

if (document.fonts && document.fonts.load) {
  Promise.all([document.fonts.load('800 100px Archivo'), document.fonts.load('500 28px "Geist Mono"')])
    .then(() => pills.forEach((pl, i) => { drawLabel(pl.canvas, PROJECTS[i], i); pl.tex.needsUpdate = true; }))
    .catch(() => {});
}

/* ---------- Hangsáv: fényvonal-hullámok a két szélen, az üveg mögött ---------- */
const BANDS = 64, WAVE_Z = -1.6;
const specData = new Uint8Array(BANDS * 4);
const specTex = new THREE.DataTexture(specData, BANDS, 1, THREE.RGBAFormat);
specTex.magFilter = THREE.LinearFilter; specTex.minFilter = THREE.LinearFilter; specTex.needsUpdate = true;
const levels = new Float32Array(BANDS);
const WU = { uTime: { value: 0 }, uAmp: { value: 0 }, uHalfW: { value: 10 }, uHalfH: { value: 6 }, uPush: { value: 0 }, uSpec: { value: specTex }, uGain: { value: 1 }, uReact: { value: 1.2 }, uBeat: { value: 0 }, uRes: U.uRes, uBands: { value: [0, 0, 0, 0, 0, 0] }, uFlowY: { value: 0 }, uStyle: { value: 0 } };
// Teljes képernyős 2D shader: a két szélen fényszalagok (alap) vagy üvegrudak — a panelen váltható
const waveMat = new THREE.ShaderMaterial({
  uniforms: WU, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  extensions: { derivatives: true },
  vertexShader: /* glsl */`
    void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform float uTime, uAmp, uPush, uReact, uBeat, uGain, uFlowY, uStyle;
    uniform vec2 uRes;
    uniform sampler2D uSpec;

    uniform float uBands[6];
    // a spektrum 6 sávból, harang-görbékkel összemosva → teljesen sima, nincs lépcső a vonalon
    float specAt(float m) {
      float s = 0.0, n = 0.0;
      for (int j = 0; j < 6; j++) {
        float c = float(j) / 5.0 * 0.85;
        float w = exp(-pow((m - c) / 0.14, 2.0));
        s += uBands[j] * w; n += w;
      }
      return s / n;
    }
    // egy fényszalag távolsága a képernyő szélétől (képernyőmagasság egységben)
    // közös, lassú fő hullám + kis eltérés → a szalagok együtt futnak, finoman szétválnak és összeérnek
    float curve(float y, float side, float k, float sp, float beat) {
      float env = pow(sin(3.14159265 * clamp(y, 0.0, 1.0)), 1.2);
      float t = uTime + side * 3.7;
      float amp = 1.0 + beat * 2.0 + sp * 2.4;
      float yy = y + uFlowY;                                            // a minta lefelé csúszik (basszusra rántva)
      float mainW = sin(yy * 3.8 + t * 0.35 + k * 0.55) * 0.05;
      float drift = sin(yy * 2.2 - t * 0.27 + k * 1.7) * 0.011 * (k + 1.0);
      float ripple = sin(yy * 15.0 - t * 1.4 + k * 2.3) * 0.004 * (1.0 + sp * 6.0 + beat * 3.0);   // finom, folyékony fodrozódás
      return env * (0.07 + k * 0.012 + uPush * 0.32 + (mainW + drift) * amp + ripple + sp * 0.05 * (1.0 + k * 0.3));   // a hangsávok helyben kidomborítják
    }
    float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    // uStyle: 0 = fényszalag, 1 = üvegrúd
    vec3 ribbons(vec2 px, float side) {
      float H = uRes.y;
      float y = px.y / H;
      float xe = (side < 0.0 ? px.x : uRes.x - px.x) / H;
      if (xe > 1.3) return vec3(0.0);                                   // messze a széltől nincs mit számolni
      float sp = specAt(0.03 + sqrt((y - 0.5) * (y - 0.5) + 0.004) * 1.7) * uAmp * uReact;
      float beat = uBeat * uReact;
      float env = pow(sin(3.14159265 * clamp(y, 0.0, 1.0)), 1.4);       // a végein sötétbe fut
      vec3 sum = vec3(0.0);
      for (int i = 0; i < 3; i++) {
        float k = float(i);
        const float e = 0.003;
        float f0 = curve(y, side, k, sp, beat);
        float d1 = (curve(y + e, side, k, sp, beat) - curve(y - e, side, k, sp, beat)) / (2.0 * e);
        float d = (xe - f0) / sqrt(1.0 + d1 * d1);                     // közelítő távolság
        if (abs(d) < 0.08) {                                             // a vonal közelében pontos távolság (Newton-lépés)
          float yc = y - ((f0 - xe) * d1) / (1.0 + d1 * d1);
          f0 = curve(yc, side, k, sp, beat);
          d1 = (curve(yc + e, side, k, sp, beat) - curve(yc - e, side, k, sp, beat)) / (2.0 * e);
          d = ((xe - f0) - (y - yc) * d1) / sqrt(1.0 + d1 * d1);
        }
        d *= H;                                                          // pixelben
        float t = uTime * 0.6 + k * 2.1 + side;
        float yy = y + uFlowY;
        float bl = 0.15 + 0.85 * pow(0.5 + 0.5 * sin(yy * 2.4 - t * 0.7 + k * 1.7), 2.0);   // fényfoltok a szalag mentén
        float depth = 1.0 + k * 0.6;                                     // a hátsó szalagok lágyabbak (mélységélesség)
        float dir = (i == 1) ? -1.0 : 1.0;
        float g = max(d * dir, 0.0);
        float ws = H * (0.015 + 0.055 * pow(0.5 + 0.5 * sin(yy * 3.0 + t * 0.5 + k * 2.0), 2.0)) * (1.0 + beat * 0.5 + sp * 0.4);
        float bs = H * 0.035;
        float bloom = exp(-(d * d) / (bs * bs)) * 0.06;                  // széles, halvány ragyogás
        vec3 c;
        if (uStyle < 0.5) {
          // FÉNYSZALAG: lágy gerinc + egyoldalú selymes fátyol
          float lw = max(1.4, H * 0.0015) * (0.75 + 0.5 * bl) * depth * (1.0 + beat * 0.3);
          float core = exp(-(d * d) / (lw * lw)) / sqrt(depth);
          float hs = H * 0.005 * depth;
          float inner = exp(-(d * d) / (hs * hs)) * 0.22;
          float sheet = (exp(-(g * g) / (ws * ws)) * 0.32 + exp(-g / (ws * 0.25)) * 0.16) * smoothstep(-lw * 3.0, lw * 3.0, d * dir);
          c = vec3(core * 0.95 + inner + bloom + sheet);
        } else {
          // ÜVEG: kettős kontúr diszperzióval, fresnel, csillanás, kausztika
          float lw = max(1.2, H * 0.0011) * depth;
          float W = H * (0.007 + 0.009 * bl) * depth * (1.0 + beat * 0.8 + sp * 0.6);
          float u = d / W;
          float inside = 1.0 - smoothstep(0.9, 1.0, abs(u));
          vec3 edge = exp(-pow((vec3(abs(d)) - W * vec3(1.08, 1.0, 0.92)) / lw, vec3(2.0)));
          float body = inside * (0.04 + 0.28 * pow(abs(u), 4.0));
          float spec = exp(-pow((u * side + 0.45) / 0.13, 2.0)) * inside;
          float caus = exp(-pow((u * side - 0.55) / 0.22, 2.0)) * inside * 0.3;
          vec3 glass = (edge * 1.25 + vec3(spec * 1.15 + caus * 1.3 + body * 1.2)) / sqrt(depth);
          float hs = H * 0.006 * depth;
          float inner = exp(-(d * d) / (hs * hs)) * 0.16;
          float sheet = (exp(-(g * g) / (ws * ws)) * 0.36 + exp(-g / (ws * 0.25)) * 0.16) * smoothstep(-W, W * 2.0, d * dir);
          c = glass + vec3(inner + bloom + sheet);
        }
        sum += c * bl * (1.0 - k * 0.2);
      }
      return sum * env * (1.0 - smoothstep(0.7, 1.3, xe));            // fokozatos elhalványulás, nincs éles határ
    }
    void main() {
      vec2 px = gl_FragCoord.xy;
      vec3 l = (ribbons(px, -1.0) + ribbons(px, 1.0)) * uGain * (uStyle < 0.5 ? 0.75 : 1.0);
      vec3 v = 1.0 - exp(-l * 1.1);                                    // lágy fénycsúcsok, nincs kiégés
      v += (hash(px + fract(uTime) * 61.0) - 0.5) / 255.0;              // dithering: nincs sávosodás a sötét átmenetekben
      gl_FragColor = vec4(vec3(0.95, 0.96, 1.0) * max(v, 0.0), 1.0);
    }`,
});
const waveQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), waveMat);
waveQuad.frustumCulled = false; waveQuad.renderOrder = -1;
scene.add(onLayer(waveQuad, LAYER_BG));

// a render target kirajzolása a képernyőre (így a háttér csak egyszer számolódik)
const LAYER_BLIT = 3;
const blitQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: { uTex: { value: rt.texture }, uRes: U.uRes },
  depthTest: false, depthWrite: false,
  vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: 'uniform sampler2D uTex; uniform vec2 uRes; void main() { gl_FragColor = texture2D(uTex, gl_FragCoord.xy / uRes); }',
}));
blitQuad.frustumCulled = false;
scene.add(onLayer(blitQuad, LAYER_BLIT));

/* ---------- Méretezés ---------- */
let halfW = 10, halfH = 6, visH = 10;
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  renderer.getDrawingBufferSize(bufSize);
  rt.setSize(bufSize.x, bufSize.y);
  U.uRes.value.copy(bufSize);
  camera.aspect = w / h;
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const needH = N * SP + 0.9, needW = PW + 1.2;
  const dist = Math.max(needH / 2 / t, needW / 2 / (t * camera.aspect));
  camera.position.set(0, 1.4, dist);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  const d = dist - WAVE_Z;
  halfH = t * d; halfW = halfH * camera.aspect;
  visH = 2 * dist * t;
  WU.uHalfW.value = halfW; WU.uHalfH.value = halfH;
}
window.addEventListener('resize', resize);
resize();

/* ---------- Panel ---------- */
const panel = document.getElementById('panel'), panelBtn = document.getElementById('panelBtn');
const CTL = ['ang', 'int', 'refr', 'depth', 'disp', 'frost', 'splay', 'spin', 'react', 'wlight', 'wpush', 'wspeed', 'surge'];
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
function applySettings() {
  U.uLightAng.value = S.ang;
  U.uLightInt.value = S.int / 100;
  U.uRefr.value = S.refr / 100;
  U.uDisp.value = S.disp / 100;
  U.uFrost.value = S.frost / 100;
  U.uSplay.value = S.splay / 100;
  if (!geoPending && builtDepth !== S.depth) { geoPending = true; requestAnimationFrame(rebuildGeo); }
  document.getElementById('c-bpm').checked = S.bpmSync;
  WU.uStyle.value = S.wstyle;
  [0, 1].forEach(v => document.getElementById('ws-' + v).setAttribute('aria-pressed', String(S.wstyle === v)));
  CTL.forEach(k => {
    const el = document.getElementById('c-' + k);
    el.value = S[k];
    el.nextElementSibling.textContent = k === 'ang' ? S[k] + '°' : (k === 'int' ? S[k] + '%' : S[k]);
  });
}
CTL.forEach(k => document.getElementById('c-' + k).addEventListener('input', e => { S[k] = +e.target.value; applySettings(); }));
document.getElementById('c-bpm').addEventListener('change', e => { S.bpmSync = e.target.checked; });
[0, 1].forEach(v => document.getElementById('ws-' + v).addEventListener('click', () => { S.wstyle = v; applySettings(); }));
document.getElementById('reset').addEventListener('click', () => { Object.assign(S, DEFAULTS); applySettings(); });
panelBtn.addEventListener('click', () => {
  const open = panel.hidden;
  panel.hidden = !open; panelBtn.setAttribute('aria-expanded', String(open));
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { panel.hidden = true; panelBtn.setAttribute('aria-expanded', 'false'); panelBtn.focus(); } });
applySettings();

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
let scrollPos = 0, scrollVel = 0, dragging = false, dragY = 0, dragMoved = 0, lastDragT = 0;
const clampV = v => Math.max(-14, Math.min(14, v));
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const k = e.deltaMode === 1 ? 1.6 : (e.deltaMode === 2 ? 20 : 0.045);
  scrollVel = clampV(scrollVel + e.deltaY * k);
}, { passive: false });
canvas.addEventListener('pointerdown', e => {
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
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
document.addEventListener('keydown', e => {
  if (e.target && (/INPUT|BUTTON/.test(e.target.tagName) || (e.target.closest && e.target.closest('#vol')))) return;
  if (e.key === 'ArrowDown') { scrollVel = clampV(scrollVel + 5); e.preventDefault(); }
  if (e.key === 'ArrowUp') { scrollVel = clampV(scrollVel - 5); e.preventDefault(); }
});
canvas.addEventListener('pointerdown', e => {
  if (!panel.hidden) { panel.hidden = true; panelBtn.setAttribute('aria-expanded', 'false'); }
  if (e.pointerType !== 'touch') return;
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  camera.layers.set(0);
  ray.setFromCamera(ndc, camera);
  pointerIn = !!ray.intersectObjects(hitTargets, false)[0];
});

const capMeta = document.getElementById('capMeta'), capName = document.getElementById('capName');
function setCaption(i) {
  if (i < 0) { capMeta.textContent = 'Válassz egy pillt'; capName.innerHTML = '&nbsp;'; }
  else { const p = PROJECTS[i]; capMeta.textContent = p.id + ' · ' + p.cat; capName.textContent = p.name; }
}

/* ---------- Audio ---------- */
let actx = null, master, analyser, freq, rev, dly, noiseBuf;
let playing = false, mode = 'synth', fileSrc = null, nextT = 0, step = 0;
let synthOrigin = 0, fileBuf = null, fileStartAt = 0, scrubbing = false;
let trackBpm = 92, beatOffset = 0;   // a saját számnál betöltéskor becsülve
const BPM = 92, STEP = 60 / BPM / 4;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const CHORDS = [
  { bass: 45, pad: [57, 60, 64, 67, 71] },
  { bass: 41, pad: [53, 57, 60, 64, 67] },
  { bass: 48, pad: [52, 55, 59, 64, 67] },
  { bass: 43, pad: [55, 59, 62, 64, 69] },
];
function impulse(sec, decay) {
  const len = actx.sampleRate * sec, b = actx.createBuffer(2, len, actx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  return b;
}
function initAudio() {
  actx = new (window.AudioContext || window.webkitAudioContext)();
  const comp = actx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
  master = actx.createGain(); master.gain.value = 0.85 * vol;
  analyser = actx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.55;
  analyser.minDecibels = -88; analyser.maxDecibels = -22;
  freq = new Uint8Array(analyser.frequencyBinCount);
  master.connect(comp); comp.connect(analyser); analyser.connect(actx.destination);
  rev = actx.createConvolver(); rev.buffer = impulse(3.2, 2.4);
  const rg = actx.createGain(); rg.gain.value = 0.32; rev.connect(rg); rg.connect(master);
  dly = actx.createDelay(1.5); dly.delayTime.value = STEP * 3;
  const fb = actx.createGain(); fb.gain.value = 0.38;
  const dlp = actx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2400;
  const dg = actx.createGain(); dg.gain.value = 0.3;
  dly.connect(dlp); dlp.connect(fb); fb.connect(dly); dlp.connect(dg); dg.connect(master);
  noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
  const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  setInterval(scheduler, 25);
  document.getElementById('seek').disabled = false;
}
function pad(notes, t, dur) {
  const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.6;
  lp.frequency.setValueAtTime(450, t); lp.frequency.linearRampToValueAtTime(1500, t + dur * 0.5); lp.frequency.linearRampToValueAtTime(550, t + dur);
  const g = actx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.13, t + 1.4);
  g.gain.setValueAtTime(0.13, t + dur - 0.3); g.gain.linearRampToValueAtTime(0, t + dur + 1.6);
  lp.connect(g); g.connect(master); g.connect(rev);
  notes.forEach(n => [-8, 8].forEach(d => {
    const o = actx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = d;
    const og = actx.createGain(); og.gain.value = 0.1; o.connect(og); og.connect(lp);
    o.start(t); o.stop(t + dur + 1.8);
  }));
}
function kick(t, v) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.13);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.95 * v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.48);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.5);
}
function noiseHit(t, type, f, q, vol, dec, wet) {
  const s = actx.createBufferSource(); s.buffer = noiseBuf;
  const fl = actx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  s.connect(fl); fl.connect(g); g.connect(master); if (wet) g.connect(rev);
  s.start(t); s.stop(t + dec + 0.05);
}
function bass(n, t, dur) {
  const o = actx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(n);
  const s = actx.createOscillator(); s.type = 'sine'; s.frequency.value = mtof(n - 12);
  const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
  const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.12, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(lp); s.connect(lp); lp.connect(g); g.connect(master);
  o.start(t); s.start(t); o.stop(t + dur + 0.05); s.stop(t + dur + 0.05);
}
function pluck(n, t, v) {
  const o = actx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(n);
  const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
  o.connect(g); g.connect(master); g.connect(dly); g.connect(rev); o.start(t); o.stop(t + 0.45);
}
function schedStep(s, t) {
  const si = s % 16, bar = Math.floor(s / 16), ch = CHORDS[Math.floor(s / 32) % 4];
  if (s % 32 === 0) pad(ch.pad, t, STEP * 32);
  if (si === 0 || si === 8 || (si === 14 && bar % 2 === 1)) kick(t, si === 14 ? 0.6 : 1);
  if (si === 4 || si === 12) noiseHit(t, 'bandpass', 1700, 0.8, 0.28, 0.2, true);
  if (si % 4 === 2) noiseHit(t, 'highpass', 7500, 0.7, 0.11, 0.06, false);
  else if (si % 2 === 1 && Math.random() < 0.5) noiseHit(t, 'highpass', 9000, 0.7, 0.04, 0.03, false);
  if (si === 0) bass(ch.bass, t, STEP * 6);
  if (si === 7) bass(ch.bass + 12, t, STEP * 1.5);
  if (si === 10) bass(ch.bass, t, STEP * 4);
  if (Math.random() < 0.42) pluck(ch.pad[Math.floor(Math.random() * ch.pad.length)] + 12, t, 0.6 + Math.random() * 0.4);
}
function scheduler() {
  if (mode !== 'synth' || !actx || actx.state !== 'running') return;
  if (nextT < actx.currentTime) { nextT = actx.currentTime + 0.05; synthOrigin = nextT - step * STEP; }
  while (nextT < actx.currentTime + 0.12) { schedStep(step, nextT); nextT += STEP; step = (step + 1) % 128; }
}
const playBtn = document.getElementById('play'), ico = document.getElementById('ico');
const trackName = document.getElementById('trackName'), trackSub = document.getElementById('trackSub');
const ICON_PLAY = 'M4 2.5v11l9.5-5.5z', ICON_PAUSE = 'M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z';
function setPlaying(v) {
  playing = v;
  ico.firstElementChild.setAttribute('d', v ? ICON_PAUSE : ICON_PLAY);
  playBtn.setAttribute('aria-label', v ? 'Szünet' : 'Lejátszás');
}
playBtn.addEventListener('click', async () => {
  if (!actx) initAudio();
  if (playing) { await actx.suspend(); setPlaying(false); }
  else { await actx.resume(); setPlaying(true); scheduler(); }
});
document.getElementById('file').addEventListener('change', async e => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  if (!actx) initAudio();
  const title = f.name.replace(/\.[^.]+$/, '');
  fileTitle = title;
  trackName.textContent = 'Betöltés…';
  try {
    const buf = await actx.decodeAudioData(await f.arrayBuffer());
    mode = 'file'; fileBuf = buf;
    const est = detectBpm(buf); trackBpm = est.bpm; beatOffset = est.offset;
    document.getElementById('bpmOut').textContent = '~' + trackBpm + ' BPM';
    seekTo(0);
    trackName.textContent = title; trackArtist.textContent = 'Saját fájl';
    await actx.resume(); setPlaying(true);
  } catch (err) {
    trackName.textContent = 'Nem lejátszható fájl';
  }
  e.target.value = '';
});

/* ---------- Tempó-becslés a saját számhoz (mély-energia ütésekből, autokorrelációval) ---------- */
function detectBpm(buf) {
  const sr = buf.sampleRate, hop = 512, maxS = Math.min(buf.length, sr * 90);
  const chs = Math.min(2, buf.numberOfChannels), data = [];
  for (let c = 0; c < chs; c++) data.push(buf.getChannelData(c));
  const n = Math.floor(maxS / hop), env = new Float32Array(n);
  const a = Math.exp(-2 * Math.PI * 150 / sr); let lp = 0;           // aluláteresztő: a lábdob/basszus számít
  for (let i = 0; i < n; i++) {
    let e = 0;
    for (let j = i * hop, je = j + hop; j < je; j++) {
      let x = 0; for (let c = 0; c < chs; c++) x += data[c][j];
      lp = a * lp + (1 - a) * x; e += lp * lp;
    }
    env[i] = Math.sqrt(e / hop);
  }
  const on = new Float32Array(n);
  for (let i = 1; i < n; i++) on[i] = Math.max(0, env[i] - env[i - 1]);
  const fps = sr / hop;
  const minLag = Math.floor(fps * 60 / 180), maxLag = Math.ceil(fps * 60 / 70);
  const score = new Float32Array(maxLag + 2);
  let best = 0, bestLag = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sc = 0; for (let i = lag; i < n; i++) sc += on[i] * on[i - lag];
    sc *= Math.exp(-0.5 * Math.pow(Math.log2((60 * fps / lag) / 120) / 0.6, 2));   // enyhe előny 120 körül
    score[lag] = sc;
    if (sc > best) { best = sc; bestLag = lag; }
  }
  if (!bestLag) return { bpm: 120, offset: 0 };
  const y0 = score[bestLag - 1] || 0, y1 = score[bestLag], y2 = score[bestLag + 1] || 0, den = y0 - 2 * y1 + y2;
  const bpm = Math.round(60 * fps / (bestLag + (den !== 0 ? 0.5 * (y0 - y2) / den : 0)));
  const P = 60 * fps / bpm; let bestOff = 0, bestSum = -1;                // fázis: hova esnek az ütések
  for (let o = 0; o < Math.ceil(P); o++) {
    let sum = 0; for (let t = o; t < n; t += P) sum += on[Math.round(t)] || 0;
    if (sum > bestSum) { bestSum = sum; bestOff = o; }
  }
  return { bpm, offset: bestOff / fps };
}

/* ---------- Blob lejátszó: nyitás, hangerő, előző / következő ---------- */
const pl = document.getElementById('pl'), spk = document.getElementById('spk');
const volEl = document.getElementById('vol'), volFill = document.getElementById('volFill');
const trackArtist = document.getElementById('trackArtist'), spkWaves = document.getElementById('spkWaves');
let vol = 0.8, lastVol = 0.8, fileTitle = '', closeT = null;

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
const touchUI = matchMedia('(hover: none)').matches;
function setOpen(v) {
  clearTimeout(closeT);
  plTarget = v ? 1 : 0;
  pl.classList.toggle('open', v);
  if (!v) pl.classList.remove('show');                               // csukáskor a tartalom azonnal eltűnik
  spk.setAttribute('aria-label', v ? (vol > 0 ? 'Némítás' : 'Hang vissza') : 'Lejátszó megnyitása');
}
function placeSpk() {}   // a hangszóró helyét a plUpdate számolja kockánként
function applyVol() {
  if (master) master.gain.value = 0.85 * vol;
  volFill.style.width = (vol * 100) + '%';
  volEl.setAttribute('aria-valuenow', String(Math.round(vol * 100)));
  spkWaves.setAttribute('d', vol > 0 ? 'M10.5 5.5a3.5 3.5 0 0 1 0 5M12.3 3.8a6 6 0 0 1 0 8.4' : 'M10.5 6l3.5 4M14 6l-3.5 4');
  placeSpk();
}
pl.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') setOpen(true); });
pl.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') { clearTimeout(closeT); closeT = setTimeout(() => setOpen(false), 380); } });
pl.addEventListener('focusin', () => setOpen(true));
pl.addEventListener('focusout', e => { if (!pl.contains(e.relatedTarget)) setOpen(false); });
document.addEventListener('pointerdown', e => { if (pl.classList.contains('open') && !pl.contains(e.target)) setOpen(false); });
spk.addEventListener('click', () => {
  if (!pl.classList.contains('open')) { setOpen(true); return; }        // érintésnél az első koppintás kinyit
  if (vol > 0) { lastVol = vol; vol = 0; } else { vol = lastVol || 0.8; }
  applyVol(); setOpen(true);
});
let volDrag = false;
const volFromX = x => { const r = volEl.getBoundingClientRect(); vol = Math.min(1, Math.max(0, (x - r.left) / r.width)); applyVol(); };
volEl.addEventListener('pointerdown', e => { volDrag = true; try { volEl.setPointerCapture(e.pointerId); } catch (_) {} volFromX(e.clientX); });
volEl.addEventListener('pointermove', e => { if (volDrag) volFromX(e.clientX); });
volEl.addEventListener('pointerup', () => { volDrag = false; });
volEl.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { vol = Math.min(1, vol + 0.05); applyVol(); e.preventDefault(); }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { vol = Math.max(0, vol - 0.05); applyVol(); e.preventDefault(); }
});
function switchTo(m) {
  if (!actx) initAudio();
  if (m === 'file' && fileBuf) {
    mode = 'file'; seekTo(0);
    trackName.textContent = fileTitle; trackArtist.textContent = 'Saját fájl';
  } else {
    if (fileSrc) { try { fileSrc.stop(); } catch (_) {} fileSrc = null; }
    mode = 'synth'; step = 0; nextT = actx.currentTime + 0.05; synthOrigin = nextT;
    trackName.textContent = 'Demó loop'; trackArtist.textContent = 'Demó';
  }
}
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
const LAYER_PL = 4;
const plRects = [0, 1, 2, 3, 4, 5, 6].map(() => new THREE.Vector4());
const plU = {
  uBg: { value: rt.texture }, uRes: U.uRes, uR: { value: plRects }, uBox: { value: new THREE.Vector4() }, uScale: { value: 1 }, uK: { value: 13 },
  uRefr: U.uRefr, uDisp: U.uDisp, uFrost: U.uFrost, uSplay: U.uSplay, uLightAng: U.uLightAng, uLightInt: U.uLightInt,
};
const plQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: plU, transparent: true, depthTest: false, depthWrite: false,
  vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: /* glsl */`
    precision highp float;
    uniform sampler2D uBg;
    uniform vec2 uRes;
    uniform vec4 uR[7];
    uniform vec4 uBox;
    uniform float uScale, uRefr, uDisp, uFrost, uSplay, uLightAng, uLightInt, uK;
    float sdRB(vec2 p, vec4 r) {                     // pill alakú lekerekített téglalap
      vec2 h = r.zw * 0.5, c = r.xy + h;
      float rad = min(h.x, h.y);
      vec2 q = abs(p - c) - h + rad;
      return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rad;
    }
    float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
    float scene(vec2 p) {                            // az alakzatok folyékony uniója (blob)
      float d = 1e5;
      for (int i = 0; i < 7; i++) {
        vec4 r = uR[i];
        if (r.z < 0.5 || r.w < 0.5) continue;
        d = smin(d, sdRB(p, r), uScale * uK);
      }
      return d;
    }
    vec3 bgAt(vec2 px, float rad) {
      vec2 uv = px / uRes;
      vec3 s = texture2D(uBg, uv).rgb;
      for (int i = 0; i < 8; i++) {
        float a = float(i) * 0.7854;
        s += texture2D(uBg, uv + vec2(cos(a), sin(a)) * rad / uRes).rgb;
      }
      return s / 9.0;
    }
    void main() {
      vec2 p = gl_FragCoord.xy;
      if (p.x < uBox.x || p.y < uBox.y || p.x > uBox.z || p.y > uBox.w) discard;
      float d = scene(p);
      if (d > 1.5) discard;
      float alpha = smoothstep(1.0, -1.0, d);
      vec2 e = vec2(1.0, 0.0);
      vec2 n = normalize(vec2(scene(p + e.xy) - scene(p - e.xy), scene(p + e.yx) - scene(p - e.yx)) + 1e-5);
      float dist = max(-d, 0.0);
      float t = clamp(dist / (uScale * 16.0), 0.0, 1.0);
      float bend = pow(1.0 - t, mix(3.0, 1.2, uSplay));
      vec2 off = -n * bend * uRefr * uScale * 20.0;                  // a perem befelé hajlítja a mögötte lévőt
      float k = uDisp * 0.3 * bend;
      float rad = uScale * (2.0 + uFrost * 8.0);                     // enyhe fagyás, hogy a tartalom olvasható maradjon
      vec3 col;
      col.r = bgAt(p + off * (1.0 - k), rad).r;
      col.g = bgAt(p + off, rad).g;
      col.b = bgAt(p + off * (1.0 + k), rad).b;
      col = mix(col, vec3(0.15, 0.15, 0.165), 0.5);                  // sötét üveg, mint a designban
      float la = radians(uLightAng);
      vec2 L = vec2(-cos(la), -sin(la));
      float f = dot(n, L);
      float spec = pow(max(f, 0.0), 2.5) + 0.45 * pow(max(-f, 0.0), 2.5);
      float rim = smoothstep(uScale * 1.8, 0.0, dist);
      float inner = smoothstep(uScale * 5.0, uScale * 1.5, dist) * (1.0 - rim);
      float band = pow(1.0 - t, 3.0);
      col += (rim * (0.14 + 1.0 * spec) + inner * spec * 0.12 + band * spec * 0.1) * uLightInt;
      gl_FragColor = vec4(col, alpha);
    }`,
}));
plQuad.frustumCulled = false;
scene.add(onLayer(plQuad, LAYER_PL));

function plUpdate(dt) {
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
function duration() { return mode === 'file' && fileBuf ? fileBuf.duration : 128 * STEP; }
function position() {
  if (!actx) return 0;
  const d = duration();
  const p = mode === 'file' ? actx.currentTime - fileStartAt : actx.currentTime - synthOrigin;
  return ((p % d) + d) % d;
}
function seekTo(pos) {
  if (!actx) return;
  if (mode === 'file' && fileBuf) {
    if (fileSrc) { try { fileSrc.stop(); } catch (_) {} }
    fileSrc = actx.createBufferSource(); fileSrc.buffer = fileBuf; fileSrc.loop = true;
    fileSrc.connect(master); fileSrc.start(0, pos);
    fileStartAt = actx.currentTime - pos;
  } else {
    step = Math.floor(pos / STEP) % 128;
    nextT = actx.currentTime + 0.03;
    synthOrigin = nextT - step * STEP;
  }
}
function updateTime() {
  const d = duration(), p = scrubbing ? seekEl.value / 1000 * d : position();
  if (!scrubbing) seekEl.value = Math.round(p / d * 1000);
  trackSub.textContent = fmt(p) + ' / ' + fmt(d);
}
seekEl.addEventListener('pointerdown', () => { scrubbing = true; });
seekEl.addEventListener('input', () => { seekTo(seekEl.value / 1000 * duration()); updateTime(); });
seekEl.addEventListener('change', () => { scrubbing = false; });
window.addEventListener('pointerup', () => { scrubbing = false; });

/* ---------- Animáció ---------- */
const clock = new THREE.Clock();
const TAU = Math.PI * 2;
let musicAmt = 0, parX = 0, parY = 0, pulse = 0, elapsed = 0, reach = 0, scrollPush = 0;
let prevL = 0, prevM = 0, prevH = 0, surge = 0, surgeS = 0, flowVel = 0, flowY = 0, bassSlow = 0;   // hangszerenkénti gyorsulás
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

function updateAudio(dt) {
  let hasData = false;
  if (analyser && playing) { analyser.getByteFrequencyData(freq); hasData = true; }
  updateLogo(freq, actx ? actx.sampleRate : 48000, 2048, hasData, 0.8 + (S.react / 50) * 0.5);
  musicAmt = damp(musicAmt, playing ? 1 : 0, playing ? 2.5 : 1.2, dt);
  const binHz = actx ? actx.sampleRate / 2 / freq.length : 1;
  let low = 0, mid = 0, high = 0;
  for (let r = 0; r < BANDS; r++) {
    let target = 0;
    if (hasData) {
      const k0 = r / BANDS, k1 = (r + 1) / BANDS;
      const b0 = Math.max(1, Math.floor(40 * Math.pow(300, k0) / binHz));
      const b1 = Math.max(b0 + 1, Math.ceil(40 * Math.pow(300, k1) / binHz));
      let sum = 0; for (let b = b0; b < b1 && b < freq.length; b++) sum += freq[b];
      target = Math.pow(Math.min(1, (sum / (b1 - b0) / 255) * (1 + k0 * 0.7)), 1.5);
    }
    levels[r] += (target - levels[r]) * (target > levels[r] ? 0.35 : 0.06);
    specData[r * 4] = Math.round(levels[r] * 255);
    if (r < 10) low += levels[r] / 10;
    else if (r < 36) mid += levels[r] / 26;
    else high += levels[r] / 28;
  }
  specTex.needsUpdate = true;
  for (let j = 0; j < 6; j++) {
    const r0 = Math.floor(j * BANDS / 6), r1 = Math.floor((j + 1) * BANDS / 6);
    let a = 0; for (let r = r0; r < r1; r++) a += levels[r];
    WU.uBands.value[j] = a / (r1 - r0);
  }
  pulse = damp(pulse, low * musicAmt, 9, dt);                  // simított, nem villog minden ütésre
  U.uPulse.value = pulse;
  const R = S.react / 50;                                   // 0..2
  // Lendület: új ütés a mélyben / közepen / magasban → rövid gyorsulás, ami simán lecseng
  const fr = Math.min(3, 0.016 / Math.max(dt, 0.001));
  const onL = Math.max(0, low - prevL) * fr, onM = Math.max(0, mid - prevM) * fr, onH = Math.max(0, high - prevH) * fr;
  prevL = low; prevM = mid; prevH = high;
  surge = Math.min(2.5, surge * Math.exp(-dt * 2.2) + (onL * 6 + onM * 2 + onH * 1) * (S.surge / 50) * R * musicAmt);
  surgeS = damp(surgeS, surge, 10, dt);
  // „pak – húz”: basszus-ütésre a hullám lefelé rántódik, kicsúszik, majd lassan folyik tovább
  // saját basszus-detektor 30–150 Hz: az ütést a basszus pillanatnyi átlagához mérjük,
  // így folyamatos, vastag basszus mellett is minden kiugró lábdob ránt egyet
  let bassV = 0;
  if (hasData) {
    const hz = actx.sampleRate / analyser.fftSize;
    const a = Math.max(1, Math.floor(30 / hz)), b = Math.ceil(150 / hz);
    let sum = 0; for (let j = a; j <= b; j++) sum += freq[j];
    bassV = sum / ((b - a + 1) * 255);
  }
  bassSlow = damp(bassSlow, bassV, 3, dt);
  const kS = (S.surge / 50) * (0.5 + R * 0.5) * musicAmt;
  const tr = Math.max(0, bassV - bassSlow - 0.015);           // mennyivel üt ki az átlagból
  flowVel += tr * 70 * kS * Math.min(dt, 0.05) + onM * 0.1 * kS;
  flowVel *= Math.exp(-dt * 5);
  // folyamatos áramlás: minél több a basszus, annál gyorsabban folyik lefelé
  flowY += (flowVel + (0.015 + bassSlow * 0.14 * (S.surge / 50)) * musicAmt) * dt * (reduced ? 0.3 : 1);
  WU.uFlowY.value = flowY;
  // BPM-szinkron: a tempóval arányos áramlás + lökés minden ütemre
  let syncPulse = 0, bpmFactor = 1;
  if (S.bpmSync && actx && playing) {
    const ph = (((position() - (mode === 'file' ? beatOffset : 0)) * trackBpm / 60) % 1 + 1) % 1;
    syncPulse = (0.5 + 0.5 * Math.cos(ph * Math.PI * 2)) * 0.6 * musicAmt;   // puha hullám az ütemen, nem rángatás
    bpmFactor = 1 + (trackBpm / 92 - 1) * musicAmt;
  }
  elapsed += dt * (reduced ? 0.3 : 1) * (S.wspeed / 40) * bpmFactor * (1 + musicAmt * pulse * 0.4 * R + scrollPush * 1.2 + syncPulse * 0.35 + surgeS);
  WU.uTime.value = elapsed;
  WU.uAmp.value = musicAmt;
  WU.uReact.value = R;
  WU.uBeat.value = Math.max(pulse, syncPulse * 0.3) * 0.7;
  WU.uGain.value = (S.wlight / 50) * (1.0 + musicAmt * (0.2 + pulse * 0.4 * R));
  reach = damp(reach, Math.min(1.2, musicAmt * (0.2 + pulse * 0.9 * R)), 4, dt);   // zenére beljebb úsznak
  scrollPush = damp(scrollPush, Math.min(1, Math.abs(scrollVel) / 7), 4, dt);   // görgetésre beljebb úsznak
  WU.uPush.value = (S.wpush / 100) * (0.2 + 0.8 * reach) + scrollPush * 0.3 + syncPulse * 0.02;
}

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  let h = -1;
  if (pointerIn) {
    camera.layers.set(0);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(hitTargets, false)[0];
    if (hit) h = hit.object.userData.index;
  }
  if ((dragging && dragMoved > 6) || Math.abs(scrollVel) > 2.5) h = -1;   // görgetés közben nincs kiemelés
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
    // dob-hatás: a szélek felé kisebb, hátrébb és megdől; a hurok varrata láthatatlan
    const r = Math.min(1, Math.abs(yw) / YMAX);
    const depth = r * r;
    const fade = 1 - THREE.MathUtils.smoothstep(r, 0.8, 1.0);
    pl.holder.position.set(0, yw + pl.push, pl.z - depth * 1.8);
    pl.holder.scale.setScalar(Math.max(0.0001, pl.s * (1 - depth * 0.35) * fade));
    pl.holder.rotation.x = -(yw / YMAX) * 0.5 - scrollVel * 0.025;
    pl.spin.rotation.y = pl.angle;
  });

  parX = damp(parX, pointerIn ? mx : 0, 2, dt);
  parY = damp(parY, pointerIn ? my : 0, 2, dt);
  stack.rotation.x = 0.08 - parY * 0.06;
  stack.rotation.y = parX * 0.14;

  updateAudio(dt);
  if (actx) updateTime();
  plUpdate(dt);

  // 1) háttér + címkék → render target (ezt töri meg az üveg)
  camera.layers.set(LAYER_BG);
  renderer.setRenderTarget(rt);
  renderer.render(scene, camera);
  // 2) a kész háttér kirajzolása a képernyőre
  renderer.setRenderTarget(null);
  camera.layers.set(LAYER_BLIT);
  renderer.render(scene, camera);
  // 3) az üveg a tetejére, mélységgel
  camera.layers.set(LAYER_GLASS);
  renderer.autoClear = false;
  renderer.render(scene, camera);
  // 4) a lejátszó liquid glass blobja
  camera.layers.set(LAYER_PL);
  renderer.render(scene, camera);
  renderer.autoClear = true;

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
