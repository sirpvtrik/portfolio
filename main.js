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
const DEFAULTS = { ang: -45, int: 80, refr: 100, depth: 55, disp: 50, frost: 0, splay: 100, spin: reduced ? 10 : 40, curve: 25, pfrost: 18, ptint: 12, topac: 82, holo: 65, react: 55, wlight: 50, wpush: 40, wspeed: reduced ? 12 : 40, surge: 50, bpmSync: false, wstyle: 0 };
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
    if (amt < 1e-4) col = bgAt(suv);                     // sík előlap: egyetlen minta elég (gyorsabb)
    else {
      col.r = bgAt(suv + dR).r;
      col.g = bgAt(suv + dG).g;
      col.b = bgAt(suv + dB).b;
    }

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
function drawMotif(g, i, color = 'rgba(255,255,255,0.45)') {
  g.save();
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 3;
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
  pills.push({ holder, spin, glass, mat: glassMat, canvas: c, tex, baseY, angle: i * 0.5 + 0.35, y: baseY, z: 0, s: 1, hv: 0, push: 0, nom: 1 });
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
const CTL = ['ang', 'int', 'refr', 'depth', 'disp', 'frost', 'splay', 'spin', 'react', 'wlight', 'wpush', 'wspeed', 'surge', 'curve', 'pfrost', 'ptint', 'topac', 'holo'];
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
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!panel.hidden) { panel.hidden = true; panelBtn.setAttribute('aria-expanded', 'false'); panelBtn.focus(); }
  else if (pTarget) closeProject();
});
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
canvas.addEventListener('pointerleave', () => { pointerIn = false; pmx = pmy = -1; });

/* ---------- Görgetés: lendület, súrlódás, ráugrás ---------- */
let scrollPos = 0, scrollVel = 0, dragging = false, dragY = 0, dragMoved = 0, lastDragT = 0;
let downX = 0, downY = 0, downT = 0;
const clampV = v => Math.max(-14, Math.min(14, v));
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  if (pTarget) { projWheel(e); return; }
  if (pT > 0) return;
  const k = e.deltaMode === 1 ? 1.6 : (e.deltaMode === 2 ? 20 : 0.045);
  scrollVel = clampV(scrollVel + e.deltaY * k);
}, { passive: false });
canvas.addEventListener('pointerdown', e => {
  downX = e.clientX; downY = e.clientY; downT = performance.now();
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  if (pTarget) { projDragStart(e); return; }
  if (pT > 0) return;
  dragging = true; dragY = e.clientY; dragMoved = 0; lastDragT = performance.now();
  scrollVel = 0;
});
canvas.addEventListener('pointermove', e => {
  if (pTarget) { projPointerMove(e); return; }
  if (!dragging) return;
  const dy = e.clientY - dragY; dragY = e.clientY; dragMoved += Math.abs(dy);
  const dPos = -dy * visH / innerHeight;
  scrollPos += dPos;
  const now = performance.now(), dts = Math.max(8, now - lastDragT) / 1000; lastDragT = now;
  scrollVel = clampV(scrollVel * 0.5 + (dPos / dts) * 0.5);
  if (dragMoved > 6) canvas.style.cursor = 'grabbing';
});
const endDrag = () => {
  projDragEnd();
  if (!dragging) return;
  dragging = false;
  if (performance.now() - lastDragT > 90) scrollVel = 0;   // megállt a húzás a végén → nincs lendület
};
canvas.addEventListener('pointerup', e => {
  const isClick = Math.hypot(e.clientX - downX, e.clientY - downY) < 7 && performance.now() - downT < 600;
  endDrag();
  if (!isClick) return;
  if (pTarget) { projClick(e.clientX, e.clientY); return; }
  if (pT > 0) return;
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);   // kattintás a pillre → projektnézet
  camera.layers.set(0);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(hitTargets, false)[0];
  if (hit) openProject(hit.object.userData.index);
});
canvas.addEventListener('pointercancel', endDrag);
document.addEventListener('keydown', e => {
  if (e.target && (/INPUT|BUTTON/.test(e.target.tagName) || (e.target.closest && e.target.closest('#vol')))) return;
  if (pTarget) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { projStep(1); e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { projStep(-1); e.preventDefault(); }
    return;
  }
  if (pT > 0) return;
  if (e.key === 'ArrowDown') { scrollVel = clampV(scrollVel + 5); e.preventDefault(); }
  if (e.key === 'ArrowUp') { scrollVel = clampV(scrollVel - 5); e.preventDefault(); }
  if (e.key === 'Enter') { openProject(centerPill()); e.preventDefault(); }
});
canvas.addEventListener('pointerdown', e => {
  if (!panel.hidden) { panel.hidden = true; panelBtn.setAttribute('aria-expanded', 'false'); }
  if (e.pointerType !== 'touch' || pTarget) return;
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
  scrollPush = damp(scrollPush, Math.min(1, Math.max(Math.abs(scrollVel) / 7, Math.abs(pxVel) / 2500)), 4, dt);   // görgetésre beljebb úsznak
  WU.uPush.value = (S.wpush / 100) * (0.2 + 0.8 * reach) + scrollPush * 0.3 + syncPulse * 0.02 + pEase * 0.08;   // nyitott panelnél az üveg mögé úsznak
}

/* ---------- Projektnézet: a pill liquid glass panellé nyílik; görgetésre a csempék jelenetről jelenetre átrendeződnek (beesnek, széttolódnak, kicsúsznak), egy fent-lent enyhén hajló hengeren ---------- */
const LAYER_PANEL = 5, LAYER_TILES = 6;
const clamp01 = x => Math.min(1, Math.max(0, x));
const backOut = x => { const c = 0.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const outCubic = x => 1 - Math.pow(1 - x, 3);
let pT = 0, pTarget = 0, sel = -1, pEase = 0, pCentered = false;
let sPos = 0, sTarget = 0, pxVel = 0, pSnapAt = 0, pWheelDir = 0;
let pDrag = false, pDragX = 0, pDragY = 0, pDragT = 0, pFling = 0;
let pL = null, pFrom = null, pCap = -1, pHover = -1, pmx = -1, pmy = -1, pResizeT = 0;
const tiles = [];

// Jelenetek: minden görgetés-lépés egy új bento elrendezés. A csempék be-/kicsúsznak (in/out irány),
// a maradók átméreteződnek és széttolják egymást. r: { jelenet: [x, y, szélesség, magasság] } a panel belsejének arányában.
const TILES = [
  { kind: 'photo', in: 'top',    out: 'left',   r: { 0: [0, 0, 0.26, 1], 1: [0, 0, 0.26, 0.56] } },
  { kind: 'cover', in: 'top',    out: 'left',   r: { 0: [0.26, 0, 0.48, 1], 1: [0.26, 0, 0.48, 1] } },
  { kind: 'img',   in: 'top',    out: 'left',   r: { 0: [0.74, 0, 0.26, 1], 1: [0.74, 0.4, 0.26, 0.6], 2: [0, 0.34, 1, 0.66], 3: [0, 0, 1, 1] } },
  { kind: 'text',  in: 'bottom', out: 'left',   r: { 1: [0, 0.56, 0.26, 0.44] } },
  { kind: 'stat',  in: 'top',    out: 'top',    r: { 1: [0.74, 0, 0.26, 0.4], 2: [0, 0, 1, 0.34] } },
  { kind: 'photo', in: 'right',  out: 'left',   r: { 4: [0, 0, 1, 1], 5: [0, 0.38, 0.6, 0.62] } },
  { kind: 'quote', in: 'top',    out: 'left',   r: { 5: [0, 0, 0.6, 0.38] } },
  { kind: 'img',   in: 'right',  out: 'bottom', r: { 5: [0.6, 0, 0.4, 1], 6: [0, 0, 0.32, 1], 7: [0, 0.46, 0.32, 0.54] } },
  { kind: 'num',   in: 'right',  out: 'bottom', r: { 6: [0.32, 0, 0.34, 1], 7: [0.32, 0.46, 0.34, 0.54] } },
  { kind: 'photo', in: 'right',  out: 'bottom', r: { 6: [0.66, 0, 0.34, 1], 7: [0.66, 0.46, 0.34, 0.54] } },
  { kind: 'wide',  in: 'top',    out: 'bottom', r: { 7: [0, 0, 1, 0.46], 8: [0, 0.52, 1, 0.48] } },
  { kind: 'outro', in: 'top',    out: 'top',    r: { 8: [0, 0, 0.72, 0.52] } },
  { kind: 'photo', in: 'top',    out: 'right',  r: { 8: [0.72, 0, 0.28, 0.52] } },
];
const SCENES = 9;
// szöveges csempéknél a tartalom egy sarokhoz tapad (mint egy átméretezett doboz), a képek kitöltve vágódnak
const ANCHOR = { cover: [0, 1], text: [0, 0], stat: [0, 0], num: [0, 0], quote: [0, 0], outro: [0, 0] };
const DURS = [['4', 'hét'], ['2', 'hónap'], ['3', 'hét'], ['6', 'hét'], ['5', 'hét'], ['2', 'hét']];

// --- az üveg panel: képernyőtérbeli lekerekített téglalap, a hullámok mattan, a perem fénytörve látszik át rajta
const pnU = {
  uBg: { value: rt.texture }, uRes: U.uRes, uRect: { value: new THREE.Vector4() }, uRad: { value: 30 }, uScale: { value: 1 }, uAlpha: { value: 0 },
  uFrost: { value: 0.4 }, uTint: { value: 0.35 },
  uRefr: U.uRefr, uDisp: U.uDisp, uSplay: U.uSplay, uLightAng: U.uLightAng, uLightInt: U.uLightInt,
};
const panelQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: pnU, transparent: true, depthTest: false, depthWrite: false,
  vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: /* glsl */`
    precision highp float;
    uniform sampler2D uBg;
    uniform vec2 uRes;
    uniform vec4 uRect;
    uniform float uRad, uScale, uAlpha, uFrost, uTint, uRefr, uDisp, uSplay, uLightAng, uLightInt;
    float sd(vec2 p) {
      vec2 h = uRect.zw * 0.5;
      vec2 q = abs(p - uRect.xy - h) - h + uRad;
      return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRad;
    }
    float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    // matt üveg: 10 minta spirálban, pixelenként elforgatva → finom szemcse, nincs „szellemkép”
    vec3 frost(vec2 px, float rad) {
      if (rad < 0.5) return texture2D(uBg, px / uRes).rgb;
      float a0 = hash(px) * 6.2832;
      vec3 s = vec3(0.0);
      for (int i = 0; i < 10; i++) {
        float fi = float(i) + 0.5;
        float a = a0 + fi * 2.39996;
        s += texture2D(uBg, (px + vec2(cos(a), sin(a)) * sqrt(fi / 10.0) * rad) / uRes).rgb;
      }
      return s / 10.0;
    }
    void main() {
      vec2 p = gl_FragCoord.xy;
      float d = sd(p);
      if (d > 1.5) discard;
      float alpha = smoothstep(1.0, -1.0, d);
      vec2 e = vec2(1.0, 0.0);
      vec2 n = normalize(vec2(sd(p + e.xy) - sd(p - e.xy), sd(p + e.yx) - sd(p - e.yx)) + 1e-5);
      float dist = max(-d, 0.0);
      float t = clamp(dist / (uScale * 22.0), 0.0, 1.0);
      float bend = pow(1.0 - t, mix(3.0, 1.2, uSplay));
      float rad = uScale * uFrost * 14.0;
      vec3 col;
      if (bend < 0.004) col = frost(p, rad);                      // a lap belseje: egy (matt) minta elég
      else {                                                      // a peremen fénytörés + diszperzió
        vec2 off = -n * bend * uRefr * uScale * 26.0;
        float k = uDisp * 0.3 * bend;
        col.r = frost(p + off * (1.0 - k), rad).r;
        col.g = frost(p + off, rad).g;
        col.b = frost(p + off * (1.0 + k), rad).b;
      }
      col = mix(col, vec3(0.1, 0.1, 0.115), uTint);
      float la = radians(uLightAng);
      vec2 L = vec2(-cos(la), -sin(la));
      float f = dot(n, L);
      float spec = pow(max(f, 0.0), 2.5) + 0.45 * pow(max(-f, 0.0), 2.5);
      float rim = smoothstep(uScale * 1.8, 0.0, dist);
      float inner = smoothstep(uScale * 6.0, uScale * 1.5, dist) * (1.0 - rim);
      col += (rim * (0.12 + 0.9 * spec) + inner * spec * 0.12 + pow(1.0 - t, 3.0) * spec * 0.08) * uLightInt;
      gl_FragColor = vec4(col, alpha * uAlpha);
    }`,
}));
panelQuad.frustumCulled = false; panelQuad.visible = false;
scene.add(onLayer(panelQuad, LAYER_PANEL));

// --- csempék: a csúcsokat a vertex shader hajlítja rá egy függőleges tengelyű hengerre (kamera-térben, px egységben)
const TU = {
  uOrigin: { value: new THREE.Vector2() }, uR: { value: 1000 }, uK: { value: 0.01 }, uD: { value: 10 },
  uClip: { value: new THREE.Vector4() }, uFade: { value: 10 },
};
const tileGeo = new THREE.PlaneGeometry(1, 1, 40, 1);
const tileVS = /* glsl */`
  uniform vec2 uSize, uOrigin;
  uniform float uArc, uY, uR, uK, uD, uLift;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    vUv = uv;
    vec2 lp = position.xy * uSize;
    float th = (uY + lp.y) / uR;                       // függőleges helyzet → szög a vízszintes tengelyű hengeren (fent-lent hajlik)
    vec3 p = vec3(uArc + lp.x + uOrigin.x, uR * sin(th) + uOrigin.y, uR * (cos(th) - 1.0) + uLift);
    vShade = cos(th);
    gl_Position = projectionMatrix * vec4(p * uK - vec3(0.0, 0.0, uD), 1.0);
  }`;
const tileFS = /* glsl */`
  precision highp float;
  uniform sampler2D uMap;
  uniform vec2 uSize, uTex, uAnchor;
  uniform vec4 uClip;
  uniform float uRad, uAlpha, uHover, uFade, uMode;
  varying vec2 vUv;
  varying float vShade;
  float sdRR(vec2 p, vec2 h, float r) { vec2 q = abs(p) - h + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  void main() {
    vec2 f = gl_FragCoord.xy;
    float cx = min(f.x - uClip.x, uClip.z - f.x), cy = min(f.y - uClip.y, uClip.w - f.y);
    float clip = smoothstep(0.0, uFade, cx) * smoothstep(0.0, uFade, cy);   // a panel szélén alácsúszik
    if (clip <= 0.0) discard;
    float d = sdRR((vUv - 0.5) * uSize, uSize * 0.5, uRad);
    float aa = max(fwidth(d), 1e-3);
    float a = clamp(0.5 - d / aa, 0.0, 1.0);
    if (a <= 0.0) discard;
    vec2 uv;
    if (uMode < 0.5) {                                   // kép: kitöltve, középre vágva (object-fit: cover)
      float s = max(uSize.x / uTex.x, uSize.y / uTex.y);
      uv = 0.5 + (vUv - 0.5) * uSize / (uTex * s);
    } else {                                             // szöveg: 1:1 méretben, a sarokhoz tapadva
      vec2 lp = vec2(vUv.x, 1.0 - vUv.y) * uSize + (uTex - uSize) * uAnchor;
      uv = vec2(lp.x / uTex.x, 1.0 - lp.y / uTex.y);
    }
    vec3 col = texture2D(uMap, clamp(uv, 0.001, 0.999)).rgb;
    col *= mix(0.4, 1.0, smoothstep(0.45, 1.0, vShade));          // a henger oldalán sötétebb
    float rim = 1.0 - smoothstep(0.0, aa * 1.6, -d);
    col += rim * (0.16 + uHover * 0.3);
    gl_FragColor = vec4(col, a * clip * uAlpha);
  }`;

function wrapText(g, text, x, y, maxW, lh) {
  let line = '';
  for (const w of text.split(' ')) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); y += lh; line = w; } else line = t;
  }
  if (line) g.fillText(line, x, y);
  return y;
}
function motifAt(g, i, cx, cy, size, color) {
  g.save(); g.translate(cx, cy); g.scale(size / 300, size / 300); g.translate(-925, -TH / 2);
  drawMotif(g, ((i % 6) + 6) % 6, color); g.restore();
}
// helyőrző tartalom — a saját képek/szövegek ide kerülnek majd.
// W×H: a vászon (a csempe legnagyobb mérete), ref: a legkisebb méret, ehhez igazodik a betűméret
function paintTile(g, kind, W, H, ref, p, i, k) {
  const m = Math.min(ref.w, ref.h), pad = Math.max(14, Math.min(26, m * 0.08));
  const mono = s => `500 ${Math.round(s)}px "Geist Mono", ui-monospace, monospace`;
  const disp = (w, s) => `${w} ${Math.round(s)}px Archivo, "Helvetica Neue", Arial, sans-serif`;
  const ms = Math.max(10, Math.min(13, m * 0.04));
  g.textBaseline = 'alphabetic';
  if (kind === 'cover') {                                  // a bal alsó sarokhoz tapad
    const gr = g.createRadialGradient(W * 0.75, H * 0.4, 0, W * 0.75, H * 0.4, Math.max(W, H) * 0.8);
    gr.addColorStop(0, '#26262b'); gr.addColorStop(1, '#0b0b0c');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    motifAt(g, i, ref.w * 0.66, H - ref.h * 0.58, Math.min(ref.w * 0.5, ref.h * 0.6), 'rgba(255,255,255,0.4)');
    let fs = Math.min(ref.h * 0.17, 120); g.font = disp(800, fs);
    const nw = g.measureText(p.name.toUpperCase()).width;
    if (nw > ref.w - 2 * pad) { fs *= (ref.w - 2 * pad) / nw; g.font = disp(800, fs); }
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.font = mono(ms);
    g.fillText((p.id + '  ·  ' + p.cat).toUpperCase(), pad, H - pad - ms * 2.4 - fs * 1.02);
    g.fillStyle = '#fff'; g.font = disp(800, fs); g.fillText(p.name.toUpperCase(), pad - fs * 0.04, H - pad - ms * 2.2);
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.font = mono(ms); g.fillText(p.meta.toUpperCase(), pad, H - pad);
  } else if (kind === 'text' || kind === 'quote' || kind === 'outro') {
    const light = kind === 'text';
    g.fillStyle = light ? '#ececee' : (kind === 'quote' ? '#18181b' : '#0f0f11'); g.fillRect(0, 0, W, H);
    const label = { text: 'A PROJEKTRŐL', quote: 'MEGJEGYZÉS', outro: 'KÖVETKEZŐ LÉPÉS' }[kind];
    const body = {
      text: 'Ide jön a projekt rövid leírása: mi volt a feladat, hogyan jutottam el a megoldásig, és mi lett a vége.',
      quote: '„Egy mondat, ami összefoglalja a projekt hangulatát.”',
      outro: 'Köszönöm, hogy végignézted. Ha tetszett, vagy közös munkán gondolkodsz, írj bátran.',
    }[kind];
    g.fillStyle = light ? '#6b6b70' : '#85858c'; g.font = mono(ms); g.fillText(label, pad, pad + ms);
    const fs = kind === 'text' ? Math.max(14, Math.min(ref.w * 0.08, ref.h * 0.085, 34)) : Math.max(16, Math.min(ref.w * 0.065, ref.h * 0.13, 44));
    g.fillStyle = light ? '#111113' : '#ececee'; g.font = disp(500, fs);
    wrapText(g, body, pad, pad + ms * 2 + fs * 1.3, ref.w - 2 * pad, fs * 1.18);
  } else if (kind === 'stat' || kind === 'num') {
    g.fillStyle = kind === 'stat' ? '#0d99ff' : '#ececee'; g.fillRect(0, 0, W, H);
    const [num, unit] = kind === 'stat' ? DURS[i % DURS.length] : [String(8 + i * 3), 'kép'];
    const dark = kind === 'num';
    g.fillStyle = dark ? '#6b6b70' : 'rgba(255,255,255,0.75)'; g.font = mono(ms);
    g.fillText(kind === 'stat' ? 'IDŐTARTAM' : 'A PROJEKTBEN', pad, pad + ms);
    const fs = Math.min(ref.h * 0.5, ref.w * 0.42, 160), us = Math.max(13, fs * 0.28);
    g.fillStyle = dark ? '#111113' : '#fff'; g.font = disp(800, fs);
    const y = pad + ms * 1.6 + fs * 0.82;
    g.fillText(num, pad - fs * 0.05, y);
    const nw = g.measureText(num).width;
    g.font = disp(500, us); g.fillText(unit, pad + nw + us * 0.3, y);
  } else if (kind === 'wide') {                             // hullám-motívum, a háttér visszhangja
    g.fillStyle = '#08080a'; g.fillRect(0, 0, W, H);
    g.lineWidth = 1.2;
    for (let n = 0; n < 26; n++) {
      g.strokeStyle = `rgba(255,255,255,${0.08 + 0.3 * Math.pow(Math.sin(n / 25 * Math.PI), 2)})`;
      g.beginPath();
      for (let x = 0; x <= W; x += 6) {
        const u = x / W, y = H * (0.5 + 0.3 * Math.sin(u * 5 + n * 0.12 + i) * Math.sin(u * Math.PI) + (n - 13) * 0.008);
        x ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
  } else {                                                  // kép helyőrző: világos „stúdió” vagy sötét
    const light = kind === 'photo';
    const gr = g.createRadialGradient(W * 0.5, H * 0.38, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    if (light) { gr.addColorStop(0, '#e6e6e9'); gr.addColorStop(1, '#b4b4ba'); } else { gr.addColorStop(0, '#2c2c31'); gr.addColorStop(1, '#101012'); }
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    motifAt(g, i + k, W / 2, H / 2, Math.min(ref.w, ref.h) * 0.6, light ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.42)');
  }
}

function projLayout() {
  const W = innerWidth, mob = W <= 720;
  const top = document.querySelector('.ui .row').getBoundingClientRect().bottom + 14;
  // mobilon a felirat elrejtve (a név a borítón van), a panel a hangszóró-gombig ér
  const bottom = mob ? document.getElementById('pl').getBoundingClientRect().bottom - 64 - 14 : document.querySelector('.caption').getBoundingClientRect().top - 14;
  const mx = Math.round(Math.max(14, Math.min(W * 0.045, 56)));
  const pad = mob ? 10 : 14;
  const w = W - 2 * mx, innerW = w - 2 * pad;
  const avail = Math.max(220, bottom - top);
  const innerH = Math.round(Math.max(150, Math.min(avail - 2 * pad, innerW * 2)));
  const h = innerH + 2 * pad;
  const gap = Math.round(Math.min(14, Math.max(8, innerH * 0.02)));
  const tr = Math.round(Math.min(20, Math.max(10, innerH * 0.03)));
  const flip = innerW < innerH * 0.85;   // álló képernyőn a rács elfordul: az oszlopokból sorok lesznek
  return { x: mx, y: Math.round(top + (avail - h) / 2), w, h, pad, innerW, innerH, r: tr + pad, tr, gap, flip };
}
const FLIP_DIR = { top: 'left', left: 'top', bottom: 'right', right: 'bottom' };
const dirOf = d => pL.flip ? FLIP_DIR[d] : d;
// arány → px (a hézagot úgy vonjuk le, hogy a panel szélén a csempe pontosan a széléig érjen)
function fracRect(f) {
  if (pL.flip) f = [f[1], f[0], f[3], f[2]];
  const L = pL, gx = L.innerW + L.gap, gy = L.innerH + L.gap;
  return { x: f[0] * gx, y: f[1] * gy, w: f[2] * gx - L.gap, h: f[3] * gy - L.gap };
}
function offRect(r, dir) {
  const L = pL, o = L.gap * 3;
  if (dir === 'top') return { x: r.x, y: -r.h - o, w: r.w, h: r.h };
  if (dir === 'bottom') return { x: r.x, y: L.innerH + o, w: r.w, h: r.h };
  if (dir === 'left') return { x: -r.w - o, y: r.y, w: r.w, h: r.h };
  return { x: L.innerW + o, y: r.y, w: r.w, h: r.h };
}
const lerpRect = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t });
const inOut = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
// egy csempe helye a görgetés adott pontján; a csúszás oszloponként késleltetve indul → egymás után érkeznek, együtt tolódnak
function tileRect(t, s) {
  const k = Math.max(0, Math.min(SCENES - 2, Math.floor(s))), f = s - k;
  const a = t.r[k], b = t.r[k + 1];
  if (!a && !b) return null;
  const ra = a ? fracRect(a) : offRect(fracRect(b), dirOf(t.in));
  const rb = b ? fracRect(b) : offRect(fracRect(a), dirOf(t.out));
  const cxN = ((a || b)[0] + (a || b)[2] / 2 + (b || a)[0] + (b || a)[2] / 2) / 2;
  const lt = inOut(clamp01((f - cxN * 0.3) / 0.7));
  return lerpRect(ra, rb, lt);
}

function drum() {
  const R = pL.innerH / (0.08 + 1.6 * S.curve / 100);
  return { R };
}
// ráugrás egész jelenetre; ha volt irány (görgő, lendület), abba az irányba lép — így egy görgő-kattanás is továbbvisz
function snapTo(v, dir) {
  const r = dir > 0 ? Math.ceil(v - 0.001) : dir < 0 ? Math.floor(v + 0.001) : Math.round(v);
  return Math.max(0, Math.min(SCENES - 1, r));
}

function clearTiles() {
  tiles.forEach(t => { scene.remove(t.mesh); t.mat.dispose(); t.tex.dispose(); });
  tiles.length = 0;
}
function buildTiles() {
  clearTiles();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  TILES.forEach((d, k) => {
    // a csempe legnagyobb és legkisebb mérete a jeleneteken át → ekkora vászon, ehhez a betűméret
    let mw = 0, mh = 0, nw = 1e9, nh = 1e9;
    Object.values(d.r).forEach(f => { const r = fracRect(f); mw = Math.max(mw, r.w); mh = Math.max(mh, r.h); nw = Math.min(nw, r.w); nh = Math.min(nh, r.h); });
    const anchor = ANCHOR[d.kind];
    const sc = Math.min(dpr, 1600 / Math.max(mw, mh));
    const c = document.createElement('canvas');
    c.width = Math.max(2, Math.round(mw * sc)); c.height = Math.max(2, Math.round(mh * sc));
    const g = c.getContext('2d'); g.scale(sc, sc);
    paintTile(g, d.kind, mw, mh, { w: nw, h: nh }, PROJECTS[sel], sel, k);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const mat = new THREE.ShaderMaterial({
      uniforms: Object.assign({}, TU, {
        uMap: { value: tex }, uSize: { value: new THREE.Vector2(1, 1) }, uTex: { value: new THREE.Vector2(mw, mh) },
        uMode: { value: anchor ? 1 : 0 }, uAnchor: { value: new THREE.Vector2(...(anchor || [0, 0])) },
        uArc: { value: 0 }, uY: { value: 0 }, uRad: { value: pL.tr }, uAlpha: { value: 0 }, uHover: { value: 0 }, uLift: { value: 0 },
      }),
      vertexShader: tileVS, fragmentShader: tileFS,
      transparent: true, depthTest: false, depthWrite: false, extensions: { derivatives: true },
    });
    const mesh = onLayer(new THREE.Mesh(tileGeo, mat), LAYER_TILES);
    mesh.frustumCulled = false; mesh.visible = false;
    scene.add(mesh);
    tiles.push(Object.assign({}, d, { mesh, mat, tex, hv: 0, rect: null }));
  });
}

const pv = new THREE.Vector3();
function pillRect(i) {
  const pl = pills[i];
  pl.holder.getWorldPosition(pv);
  const dist = pv.distanceTo(camera.position);
  pv.project(camera);
  const cx = (pv.x * 0.5 + 0.5) * innerWidth, cy = (-pv.y * 0.5 + 0.5) * innerHeight;
  const ppw = innerHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist);
  const w = PW * pl.nom * ppw, h = PH * pl.nom * ppw;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}
function centerPill() {
  let best = 0, bd = 1e9;
  const LOOP = N * SP, YMAX = LOOP / 2;
  pills.forEach((pl, i) => { const y = Math.abs(((pl.baseY + scrollPos + YMAX) % LOOP + LOOP) % LOOP - YMAX); if (y < bd) { bd = y; best = i; } });
  return best;
}

const backBtn = document.getElementById('back'), whoEl = document.getElementById('who'), hintEl = document.getElementById('hint');
const HINT_STACK = hintEl.innerHTML;
function openProject(i) {
  if (pTarget || i < 0) return;
  sel = i; pCentered = false; pCap = -1; pHover = -1;
  pFrom = pillRect(i);
  pL = projLayout();
  sPos = sTarget = 0; pxVel = 0; pSnapAt = 0; pWheelDir = 0;
  buildTiles();
  pTarget = 1;
  holoPlay('open');                                                 // „én forgatom”: nyitáskor a forgató mozdulat
  hovered = -1; pointerIn = false;
  document.body.classList.add('proj');
  whoEl.hidden = true; backBtn.hidden = false;
  hintEl.innerHTML = 'Görgess vagy húzd<br>Esc → vissza';
  canvas.setAttribute('aria-label', PROJECTS[i].name + ' projekt: görgetésre átrendeződő csempék');
  canvas.style.cursor = 'default';
}
function closeProject() {
  if (!pTarget) return;
  pTarget = 0; pDrag = false;
  holoPlay('swipeR');
  document.body.classList.remove('proj');
  whoEl.hidden = false; backBtn.hidden = true;
  hintEl.innerHTML = HINT_STACK;
  canvas.setAttribute('aria-label', 'Forgó 3D liquid glass pillek a projektekkel');
  canvas.style.cursor = 'default';
}
backBtn.addEventListener('click', closeProject);

function projWheel(e) {
  const k = e.deltaMode === 1 ? 32 : (e.deltaMode === 2 ? innerHeight : 1);
  const d = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * k;
  sTarget = Math.max(-0.15, Math.min(SCENES - 0.85, sTarget + d / (pL.innerH * 0.9)));
  if (Math.abs(d) > 0.5) pWheelDir = Math.sign(d);
  pSnapAt = performance.now() + 170;
}
function projDragStart(e) {
  pDrag = true; pDragX = e.clientX; pDragY = e.clientY; pDragT = performance.now(); pFling = 0; pSnapAt = 0;
}
function projPointerMove(e) {
  if (e.pointerType !== 'touch') { pmx = e.clientX; pmy = e.clientY; }
  if (!pDrag) return;
  const dx = e.clientX - pDragX, dy = e.clientY - pDragY; pDragX = e.clientX; pDragY = e.clientY;
  const d = -(Math.abs(dx) > Math.abs(dy) ? dx : dy) / (pL.innerH * 0.9);   // felfelé vagy balra húzva előre
  const out = sTarget < 0 || sTarget > SCENES - 1;
  sTarget += d * (out ? 0.35 : 1);                                         // a végeken gumiszerűen ellenáll
  const now = performance.now(), dts = Math.max(8, now - pDragT) / 1000; pDragT = now;
  pFling = pFling * 0.5 + (d / dts) * 0.5;
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) canvas.style.cursor = 'grabbing';
}
function projDragEnd() {
  if (!pDrag) return;
  pDrag = false;
  if (performance.now() - pDragT > 90) pFling = 0;
  sTarget = snapTo(sTarget, Math.abs(pFling) > 0.4 ? Math.sign(pFling) : 0);
  canvas.style.cursor = 'default';
}
function projStep(dir) {
  sTarget = Math.max(0, Math.min(SCENES - 1, Math.round(sTarget) + dir)); pSnapAt = 0;
}
// képernyőpont → melyik csempe (a henger-leképezés megfordítása)
function hitTile(cx, cy) {
  if (!tiles.length || cx < pL.x || cx > pL.x + pL.w || cy < pL.y || cy > pL.y + pL.h) return -1;
  const { R } = drum(), Dpx = TU.uD.value / TU.uK.value, o = TU.uOrigin.value;
  const sx = cx - innerWidth / 2, sy = innerHeight / 2 - cy;
  let lo = -Math.PI / 2, hi = Math.PI / 2;
  const scr = th => (R * Math.sin(th) + o.y) * Dpx / (Dpx - R * (Math.cos(th) - 1));
  for (let n = 0; n < 24; n++) { const mid = (lo + hi) / 2; if (scr(mid) < sy) lo = mid; else hi = mid; }
  const th = (lo + hi) / 2, f = Dpx / (Dpx - R * (Math.cos(th) - 1));
  const a = R * th, X = sx / f - o.x;
  for (let j = 0; j < tiles.length; j++) {
    const t = tiles[j];
    if (t.mesh.visible && Math.abs(X - t.arc) < t.rect.w / 2 && Math.abs(a - t.cy) < t.rect.h / 2) return j;
  }
  return -1;
}
function projClick(cx, cy) {
  if (cx < pL.x || cx > pL.x + pL.w || cy < pL.y || cy > pL.y + pL.h) { closeProject(); return; }   // a panelen kívül → vissza
  if (hitTile(cx, cy) >= 0) projStep(Math.round(sTarget) >= SCENES - 1 ? -(SCENES - 1) : 1);        // csempére kattintva tovább (a végén elölről)
}
window.addEventListener('resize', () => {
  if (!pL) return;
  clearTimeout(pResizeT);
  pResizeT = setTimeout(() => { if (pTarget) { pL = projLayout(); buildTiles(); } }, 150);
});

function projUpdate(dt) {
  const dir = Math.sign(pTarget - pT);
  if (dir) pT = clamp01(pT + dir * dt / (reduced ? 0.2 : (dir > 0 ? 1.1 : 0.8)));
  pEase = pT * pT * (3 - 2 * pT);
  if (pT === 0) {
    if (sel >= 0 && !pTarget) { clearTiles(); sel = -1; pL = null; setCaption(hovered); }
    panelQuad.visible = false;
    stack.visible = true;
    return;
  }
  stack.visible = pT < 1;                                          // nyitva a pillek nem renderelődnek
  if (pT === 1 && !pCentered) {                                    // közben a kiválasztott pill középre áll (ide tér vissza)
    const LOOP = N * SP; let t = -pills[sel].baseY;
    t += Math.round((scrollPos - t) / LOOP) * LOOP;
    scrollPos = t; scrollVel = 0; pCentered = true;
  }
  const L = pL, sc = bufSize.x / innerWidth, H = innerHeight;

  // panel: a pill alakjából folyékonyan nyílik ki — előbb szélességben, aztán magasságban
  const from = pTarget ? pFrom : pillRect(sel);
  const ew = backOut(clamp01(pT * 1.4)), eh = backOut(clamp01(pT * 1.4 - 0.25));
  const fcx = from.x + from.w / 2, fcy = from.y + from.h / 2, tcx = L.x + L.w / 2, tcy = L.y + L.h / 2;
  const w = Math.max(1, from.w + (L.w - from.w) * ew), h = Math.max(1, from.h + (L.h - from.h) * eh);
  const cx = fcx + (tcx - fcx) * ew, cy = fcy + (tcy - fcy) * eh;
  const rad = Math.min(w / 2, h / 2, from.h / 2 + (L.r - from.h / 2) * clamp01(eh));
  pnU.uRect.value.set((cx - w / 2) * sc, (H - cy - h / 2) * sc, w * sc, h * sc);
  pnU.uRad.value = rad * sc; pnU.uScale.value = sc;
  pnU.uAlpha.value = THREE.MathUtils.smoothstep(pT, 0, 0.06);
  pnU.uFrost.value = S.pfrost / 100; pnU.uTint.value = S.ptint / 100;
  panelQuad.visible = true;

  // görgetés jelenetről jelenetre
  if (!pDrag) {
    if (pSnapAt && performance.now() > pSnapAt) { sTarget = snapTo(sTarget, pWheelDir); pSnapAt = 0; pWheelDir = 0; }
    if (!pSnapAt) sTarget = Math.max(0, Math.min(SCENES - 1, sTarget));
  }
  const prev = sPos;
  sPos = damp(sPos, sTarget, pDrag ? 18 : (reduced ? 20 : 4.2), dt);
  pxVel = (sPos - prev) / Math.max(dt, 1e-3) * L.innerH;

  TU.uR.value = drum().R;
  const tf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  TU.uD.value = camera.position.length(); TU.uK.value = 2 * tf * TU.uD.value / H;
  TU.uOrigin.value.set(tcx - innerWidth / 2, H / 2 - tcy);
  const cl = L.pad * 0.35;
  TU.uClip.value.set((L.x + cl) * sc, (H - L.y - L.h + cl) * sc, (L.x + L.w - cl) * sc, (H - L.y - cl) * sc);
  TU.uFade.value = Math.max(1, (L.pad - cl) * sc);

  // nyitáskor a csempék felülről esnek be balról jobbra, csukáskor ugyanígy kirepülnek felfelé
  const tIn = clamp01((pT - 0.42) / 0.58);
  pHover = pTarget && !pDrag && pmx >= 0 ? hitTile(pmx, pmy) : -1;
  tiles.forEach((t, j) => {
    let r = tileRect(t, Math.max(0, Math.min(SCENES - 1, sPos)));
    if (r && sPos < 0) r = lerpRect(r, offRect(r, 'top'), Math.min(1, -sPos * 2));       // gumi a végeken
    if (r && sPos > SCENES - 1) r = { x: r.x - (sPos - SCENES + 1) * L.innerW * 0.25, y: r.y, w: r.w, h: r.h };
    const inPanel = r && r.y < L.innerH && r.y + r.h > 0 && r.x < L.innerW && r.x + r.w > 0;
    if (r && tIn < 1 && inPanel) {                                          // csak ami épp a panelen van, az esik be / repül ki
      const lt = inOut(clamp01((tIn - clamp01((r.x + r.w / 2) / L.innerW) * 0.35) / 0.65));
      r = lerpRect(offRect(r, 'top'), r, lt);
    }
    const vis = !!r && r.y < L.innerH + L.pad && r.y + r.h > -L.pad && r.x < L.innerW + L.pad && r.x + r.w > -L.pad;
    t.mesh.visible = vis;
    if (!vis) return;
    t.rect = r;
    t.arc = r.x + r.w / 2 - L.innerW / 2;
    t.cy = L.innerH / 2 - (r.y + r.h / 2);
    t.hv = damp(t.hv, j === pHover ? 1 : 0, 10, dt);
    const u = t.mat.uniforms;
    u.uSize.value.set(Math.max(1, r.w), Math.max(1, r.h));
    u.uArc.value = t.arc; u.uY.value = t.cy; u.uAlpha.value = S.topac / 100;   // a csempéken is átsejlik a hologram
    u.uHover.value = t.hv; u.uLift.value = t.hv * 12;
  });
  if (pTarget) {
    const cap = Math.round(Math.max(0, Math.min(SCENES - 1, sPos)));
    if (cap !== pCap) {
      pCap = cap;
      const p = PROJECTS[sel];
      capMeta.textContent = p.id + ' · ' + p.cat + ' — ' + String(cap + 1).padStart(2, '0') + ' / ' + String(SCENES).padStart(2, '0');
      capName.textContent = p.name;
    }
    if (!pDrag) canvas.style.cursor = pHover >= 0 ? 'pointer' : (pmx >= L.x && pmx <= L.x + L.w && pmy >= L.y && pmy <= L.y + L.h ? 'grab' : 'zoom-out');
  }
}

/* ---------- Hologram: én, pontfelhőként az üvegek mögött; kattintásra „én forgatom” a tartalmat ---------- */
// assets/holo.mp4: három szürke sáv egymás mellett — fény | maszk | ál-mélység (tools/holo.py készíti a felvételből)
const HSEG = { idle: [0, 12.933], open: [12.933, 18.933], step: [18.933, 22.533], swipeR: [22.533, 24.533], swipeL: [24.533, 26.433] };
const HOLO_Z = -4.2;
const holoLite = innerWidth <= 720 || touchUI;                     // telefonon kevesebb pont, kevesebb vonal
const HGW = holoLite ? 96 : 150, HGH = Math.round(HGW * 16 / 9);
let hCur = 'idle', hScene = -1, hGlitch = 0, hFill = 0, hReady = false, hWant = true, hSeek = false;

const hVid = document.createElement('video');
Object.assign(hVid, { muted: true, playsInline: true, preload: 'auto', loop: false });
// egyben töltjük be (3 MB): így a mozdulatok közti ugrás mindig azonnali, bármilyen szerverről
fetch('assets/holo.mp4').then(r => r.ok ? r.blob() : Promise.reject(r.status))
  .then(b => { hVid.src = URL.createObjectURL(b); })
  .catch(() => { hVid.src = 'assets/holo.mp4'; });
hVid.setAttribute('playsinline', ''); hVid.setAttribute('muted', ''); hVid.setAttribute('aria-hidden', 'true');
hVid.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none';
document.body.appendChild(hVid);
const hTex = new THREE.VideoTexture(hVid);
hTex.minFilter = THREE.LinearFilter; hTex.magFilter = THREE.LinearFilter; hTex.generateMipmaps = false;
hVid.addEventListener('loadeddata', () => { hReady = true; });
hVid.addEventListener('seeked', () => { hSeek = false; });   // az ugrás nem azonnali: addig nem ellenőrzünk
const hTryPlay = () => { if (hWant && S.holo > 0) hVid.play().catch(() => {}); };
hVid.addEventListener('canplay', hTryPlay);
// ha a böngésző nem engedi magától elindítani (pl. iPhone energiatakarékos mód), az első érintésre indul
document.addEventListener('pointerdown', hTryPlay, { once: true });
document.addEventListener('visibilitychange', () => { if (document.hidden) hVid.pause(); else hTryPlay(); });

const HU = {
  uTex: { value: hTex }, uTime: { value: 0 }, uGain: { value: 0 }, uBeat: { value: 0 }, uFill: { value: 0 }, uGlitch: { value: 0 },
  uSize: { value: new THREE.Vector2(1, 1) }, uDepth: { value: 1 }, uPt: { value: 2 }, uTexel: { value: new THREE.Vector2(1 / 1080, 1 / 640) },
};
const HOLO_COMMON = /* glsl */`
  uniform sampler2D uTex;
  uniform float uTime, uGain, uBeat, uFill, uGlitch, uDepth, uPt;
  uniform vec2 uSize, uTexel;
  float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float L(vec2 uv) { return texture2D(uTex, vec2(uv.x / 3.0, uv.y)).r; }
  float M(vec2 uv) { return texture2D(uTex, vec2((uv.x + 1.0) / 3.0, uv.y)).r; }
  float D(vec2 uv) { return texture2D(uTex, vec2((uv.x + 2.0) / 3.0, uv.y)).r; }
  // a pont helye: a videó-sík, a mélység szerint kidomborítva; vágásnál glitch-csúszás
  vec3 holoPos(vec2 uv, float seed) {
    float g = uGlitch * step(0.82, hash(vec2(floor(uv.y * 40.0), floor(uTime * 24.0))));
    uv.x += (hash(vec2(floor(uv.y * 40.0), uTime)) - 0.5) * 0.12 * g;
    float d = D(uv);
    vec3 p = vec3((uv.x - 0.5) * uSize.x, (uv.y - 0.5) * uSize.y, (d - 0.35) * uDepth);
    p += (vec3(hash(uv + seed), hash(uv.yx + seed), hash(uv * 1.7)) - 0.5) * uBeat * 0.06 * uSize.x;   // ütésre kicsit szétszóródik
    return p;
  }`;
// pontok
const hGeoP = new THREE.BufferGeometry();
{
  const n = HGW * HGH, pos = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  for (let y = 0; y < HGH; y++) for (let x = 0; x < HGW; x++) {
    const i = y * HGW + x;
    uv[i * 2] = (x + 0.5 + (Math.random() - 0.5) * 0.6) / HGW; uv[i * 2 + 1] = (y + 0.5 + (Math.random() - 0.5) * 0.6) / HGH;
  }
  hGeoP.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  hGeoP.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
const holoPoints = new THREE.Points(hGeoP, new THREE.ShaderMaterial({
  uniforms: HU, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: HOLO_COMMON + /* glsl */`
    varying float vA;
    void main() {
      float m = M(uv);
      if (m < 0.3) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vA = 0.0; return; }
      float l = L(uv);
      vec2 e = uTexel * 3.0 * vec2(3.0, 1.0);
      // perem és redők: a maszk és a fény meredeksége → ezek világítanak, a többi halvány
      float edge = abs(M(uv + vec2(e.x, 0.0)) - M(uv - vec2(e.x, 0.0))) + abs(M(uv + vec2(0.0, e.y)) - M(uv - vec2(0.0, e.y)));
      float crease = abs(L(uv + vec2(e.x, 0.0)) - L(uv - vec2(e.x, 0.0))) + abs(L(uv + vec2(0.0, e.y)) - L(uv - vec2(0.0, e.y)));
      vec4 mv = modelViewMatrix * vec4(holoPos(uv, 0.0), 1.0);
      gl_Position = projectionMatrix * mv;
      float tw = 0.75 + 0.25 * sin(uTime * 3.0 + hash(uv) * 40.0);   // finom vibrálás
      float foot = smoothstep(0.0, 0.14, uv.y);                       // alul (ahol a kép levágja a testet) elhalványul
      vA = (0.08 + pow(l, 1.8) * 0.42 + min(edge, 0.6) * 0.55 + pow(crease, 1.5) * 1.1 + uFill * (0.35 + l)) * tw * smoothstep(0.3, 0.7, m) * foot;
      gl_PointSize = uPt * (0.55 + l * 0.6 + min(edge, 0.6) * 0.8 + uFill * 0.8 + uBeat * 0.4);
    }`,
  fragmentShader: /* glsl */`
    uniform float uGain;
    varying float vA;
    void main() {
      vec2 c = gl_PointCoord - 0.5;
      float a = smoothstep(0.5, 0.1, length(c));
      gl_FragColor = vec4(vec3(0.86, 0.91, 1.0) * vA * a * uGain, 1.0);
    }`,
}));
// vonalak: rövid „háló” a közeli pontok között, néhány hosszú szállal
const hGeoL = new THREE.BufferGeometry();
{
  const NL = holoLite ? 2200 : 5200, uv = new Float32Array(NL * 4), oth = new Float32Array(NL * 4), seed = new Float32Array(NL * 2), pos = new Float32Array(NL * 6);
  for (let k = 0; k < NL; k++) {
    const u = 0.15 + Math.random() * 0.7, v = Math.random() * 0.95, long = Math.random() < 0.12;
    const r = long ? 0.08 + Math.random() * 0.25 : 0.01 + Math.random() * 0.035, a = Math.random() * Math.PI * 2;
    uv[k * 4] = u; uv[k * 4 + 1] = v; uv[k * 4 + 2] = u + Math.cos(a) * r * 0.56; uv[k * 4 + 3] = v + Math.sin(a) * r;
    seed[k * 2] = seed[k * 2 + 1] = Math.random();
    oth[k * 4] = uv[k * 4 + 2]; oth[k * 4 + 1] = uv[k * 4 + 3]; oth[k * 4 + 2] = uv[k * 4]; oth[k * 4 + 3] = uv[k * 4 + 1];   // a szál másik vége
  }
  hGeoL.setAttribute('aOther', new THREE.BufferAttribute(oth, 2));
  hGeoL.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  hGeoL.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  hGeoL.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
}
const holoLines = new THREE.LineSegments(hGeoL, new THREE.ShaderMaterial({
  uniforms: HU, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: HOLO_COMMON + /* glsl */`
    attribute float aSeed;
    attribute vec2 aOther;
    varying float vA;
    void main() {
      float m = M(uv);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(holoPos(uv, 0.0), 1.0);
      float fl = smoothstep(0.55, 1.0, sin(uTime * (0.6 + aSeed) + aSeed * 50.0) * 0.5 + 0.5);   // a szálak lassan fel-le villannak
      vA = step(0.4, m) * step(0.4, M(aOther)) * (0.03 + 0.16 * fl + uBeat * 0.15 + uFill * 0.12) * (0.35 + L(uv)) * smoothstep(0.0, 0.14, uv.y);
    }`,
  fragmentShader: /* glsl */`
    uniform float uGain;
    varying float vA;
    void main() { gl_FragColor = vec4(vec3(0.8, 0.86, 1.0) * vA * uGain, 1.0); }`,
}));
// „telítődés”: ütésre az egész alak tömör, izzó fehérre telik
const holoFill = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 60, 106), new THREE.ShaderMaterial({
  uniforms: HU, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: HOLO_COMMON + /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(holoPos(uv, 1.0), 1.0); }`,
  fragmentShader: HOLO_COMMON + /* glsl */`
    varying vec2 vUv;
    void main() {
      float m = smoothstep(0.35, 0.8, M(vUv)), l = L(vUv);
      gl_FragColor = vec4(vec3(0.82, 0.88, 1.0) * m * (0.35 + 0.65 * l) * uFill * uGain * 0.9 * smoothstep(0.0, 0.14, vUv.y), 1.0);
    }`,
}));
const holo = new THREE.Group();
[holoFill, holoLines, holoPoints].forEach((o, k) => { o.frustumCulled = false; o.renderOrder = k; holo.add(onLayer(o, LAYER_BG)); });
holo.position.z = HOLO_Z;
holo.visible = false;
scene.add(holo);

function holoResize() {
  const d = camera.position.distanceTo(new THREE.Vector3(0, 0, HOLO_Z));
  const visHh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * d;
  const h = visHh * 0.98, w = h * 9 / 16;
  HU.uSize.value.set(w, h); HU.uDepth.value = w * 0.55;
  HU.uPt.value = Math.max(1.5, bufSize.y * 0.98 / HGH * 0.95);
  holo.position.y = -visHh * 0.04;
}
window.addEventListener('resize', holoResize);
holoResize();

// egy mozdulat lejátszása a videóból; a végén visszaáll a nyugalmi loopra
function holoPlay(name) {
  if (!HSEG[name] || !hReady) return;
  hCur = name; hGlitch = 1; hSeek = true;
  try { hVid.currentTime = HSEG[name][0] + 0.02; } catch (_) { hSeek = false; }
  hTryPlay();
}
function holoUpdate(dt) {
  const on = S.holo > 0 && hReady;
  holo.visible = on;
  if (!on) { if (!hVid.paused && S.holo === 0) hVid.pause(); return; }
  if (hVid.paused) hTryPlay();
  const seg = HSEG[hCur];
  if (!hSeek && (hVid.currentTime >= seg[1] - 0.05 || hVid.currentTime < seg[0] - 0.3)) {
    if (hCur === 'idle') { hSeek = true; try { hVid.currentTime = HSEG.idle[0]; } catch (_) { hSeek = false; } } else holoPlay('idle');
  }
  // lapozás a projektnézetben → legyintés abba az irányba
  if (pTarget) {
    const sc = Math.round(sTarget);
    if (sc !== hScene) { if (hScene >= 0 && hCur === 'idle') holoPlay(sc > hScene ? 'swipeL' : 'swipeR'); hScene = sc; }
  } else hScene = -1;
  hGlitch = Math.max(0, hGlitch - dt * 3);
  hFill = damp(hFill, Math.min(1, surgeS * 0.55) * musicAmt, 10, dt);
  HU.uTime.value += dt;
  HU.uGain.value = (S.holo / 100) * (1 - pEase * 0.25);
  HU.uBeat.value = pulse * musicAmt;
  HU.uFill.value = hFill;
  HU.uGlitch.value = hGlitch;
  holo.rotation.y = parX * 0.45 + Math.sin(HU.uTime.value * 0.23) * 0.06;   // az egér felé fordul → látszik a mélység
  holo.rotation.x = -parY * 0.12;
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
  if (pTarget || pT > 0) h = -1;                                           // projektnézetben a pillek pihennek
  if (h !== hovered) { hovered = h; if (!pTarget && pT === 0) { setCaption(h); canvas.style.cursor = h >= 0 ? 'pointer' : 'default'; } }

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
  const focus = (pTarget || pT > 0) ? sel : hovered;
  const any = focus >= 0;
  const yh = any ? wrapY(pills[focus].baseY + scrollPos) : 0;
  pills.forEach((pl, i) => {
    const isH = i === focus;
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
    // projektnézet: a kiválasztott pill „belefolyik” a panelbe, a többi hátrébb húzódik és eltűnik
    const pk = pT > 0 ? 1 - THREE.MathUtils.smoothstep(pT, isH ? 0.02 : 0, isH ? 0.22 : 0.5) : 1;
    pl.nom = pl.s * (1 - depth * 0.35) * fade;
    pl.holder.position.set(0, yw + pl.push, pl.z - depth * 1.8 - (isH ? 0 : (1 - pk) * 1.4));
    pl.holder.scale.setScalar(Math.max(0.0001, pl.nom * pk));
    pl.holder.rotation.x = -(yw / YMAX) * 0.5 - scrollVel * 0.025;
    pl.spin.rotation.y = pl.angle;
  });

  parX = damp(parX, pointerIn ? mx : 0, 2, dt);
  parY = damp(parY, pointerIn ? my : 0, 2, dt);
  stack.rotation.x = 0.08 - parY * 0.06;
  stack.rotation.y = parX * 0.14;

  projUpdate(dt);
  updateAudio(dt);
  holoUpdate(dt);
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
  renderer.autoClear = false;
  if (stack.visible) { camera.layers.set(LAYER_GLASS); renderer.render(scene, camera); }
  // 3b) projektnézet: matt üveg panel, rajta a hengeren csúszó csempék
  if (panelQuad.visible) {
    camera.layers.set(LAYER_PANEL); renderer.render(scene, camera);
    if (tiles.length) { camera.layers.set(LAYER_TILES); renderer.render(scene, camera); }
  }
  // 4) a lejátszó liquid glass blobja
  camera.layers.set(LAYER_PL);
  renderer.render(scene, camera);
  renderer.autoClear = true;

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
