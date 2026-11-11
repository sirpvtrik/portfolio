// A blob lejátszó üvege: SDF smooth-union alakzatok, liquid glass fénytöréssel

export const playerFS = /* glsl */`
  precision highp float;
  uniform sampler2D uBg;
  uniform vec2 uRes;
  uniform vec4 uR[7];
  uniform vec4 uBox;
  uniform float uScale, uRefr, uDisp, uFrost, uSplay, uLightAng, uLightInt, uK, uAlpha;
  uniform float uClear;                            // 1: nincs szürke kitöltés, csak a tiszta üveg (a Vissza gomb alapból)
  uniform float uGrad;                             // a Vissza gomb hoverje: világosabb, fentről lefelé szürkés átmenet
  uniform float uRimGlow;                          // hover / nyitva: a perem belső szélén fehér derengés (Patrik: a GET IN TOUCH-hoz
                                                   // hasonlóan a szélén legyen gradiens, ne szürküljön be teljesen)
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
    // hover / nyitva: halvány külső ragyogás, pontosan mint a GET IN TOUCH gombé (CSS: 0 0 32px 2px, 20% fehér)
    float og = 0.2 * 0.5 * exp(-0.5 * pow(max(d - 2.0 * uScale, 0.0) / (16.0 * uScale), 2.0)) * uRimGlow;
    if (d > 1.5) {
      if (og * uAlpha < 0.002) discard;
      gl_FragColor = vec4(1.0, 1.0, 1.0, og * uAlpha);
      return;
    }
    float alpha = smoothstep(1.0, -1.0, d);
    vec2 e = vec2(1.0, 0.0);
    vec2 n = normalize(vec2(scene(p + e.xy) - scene(p - e.xy), scene(p + e.yx) - scene(p - e.yx)) + 1e-5);
    float dist = max(-d, 0.0);
    // A pont körüli két kis kör (3,5 és 11 px) mintavétele: mekkora részük esik a formán kívül, és merre. Ebből jön a perem
    // közelsége és a fénytörés iránya. Nem a belső SDF-ből: az alakzatok uniójában a belső átfedő élek, és a vékony nyakak
    // (az összekötők) középvonalán a normál hirtelen megfordul, ettől a mögötte lévő kép két irányba csúszott el, és csíkok
    // látszottak (Patrik). A mintavételes irány a középvonalon fokozatosan nullára fut, így ott nincs varrat.
    float o1 = 0.0, o2 = 0.0;
    vec2 v1 = vec2(0.0), v2 = vec2(0.0);
    for (int i = 0; i < 8; i++) {
      float an = float(i) * 0.7854 + 0.39;
      vec2 dv = vec2(cos(an), sin(an));
      // lágy (a mintavétel sugarával arányos) átmenet: folytonos, nem pöttyözött
      float a1 = smoothstep(-uScale * 3.0, uScale * 3.0, scene(p + dv * uScale * 3.5));
      float a2 = smoothstep(-uScale * 9.0, uScale * 9.0, scene(p + dv * uScale * 11.0));
      o1 += a1; o2 += a2; v1 += dv * a1; v2 += dv * a2;
    }
    o1 /= 8.0; o2 /= 8.0;
    vec2 nv = (v1 + v2) / 8.0;                                       // kifelé mutat, a perem közelében a legnagyobb
    float t = clamp(dist / (uScale * 16.0), 0.0, 1.0);
    float bend = pow(1.0 - t, mix(3.0, 1.2, uSplay));
    vec2 off = -nv * 1.6 * mix(1.0, bend, 0.5) * uRefr * uScale * 20.0;   // a perem befelé hajlítja a mögötte lévőt
    float k = uDisp * 0.3 * bend;
    float rad = uScale * (2.0 + uFrost * 8.0);                     // enyhe fagyás, hogy a tartalom olvasható maradjon
    vec3 col;
    col.r = bgAt(p + off * (1.0 - k), rad).r;
    col.g = bgAt(p + off, rad).g;
    col.b = bgAt(p + off * (1.0 + k), rad).b;
    float gy = clamp((p.y - uBox.y) / max(uBox.w - uBox.y, 1.0), 0.0, 1.0);
    vec3 tint = mix(vec3(0.15, 0.15, 0.165), mix(vec3(0.17, 0.17, 0.18), vec3(0.36, 0.36, 0.38), gy), uGrad);
    col = mix(col, tint, (0.5 + 0.12 * uGrad) * (1.0 - uClear));   // sötét üveg, mint a designban
    float la = radians(uLightAng);
    vec2 L = vec2(-cos(la), -sin(la));
    float f = dot(n, L);
    float spec = pow(max(f, 0.0), 2.5) + 0.45 * pow(max(-f, 0.0), 2.5);
    float rim = smoothstep(uScale * 1.8, 0.0, dist);
    float inner = smoothstep(uScale * 5.0, uScale * 1.5, dist) * (1.0 - rim);
    float band = clamp(o1 * 1.4 + o2 * 0.9, 0.0, 1.0);               // a perem közelsége (a mintavételből, csíkmentesen)
    band *= band;
    float fs = dot(normalize(nv + 1e-5), L);                         // a sávhoz a sima (mintavételes) irány
    float specS = pow(max(fs, 0.0), 2.5) + 0.45 * pow(max(-fs, 0.0), 2.5);
    col += (rim * (0.14 + 1.0 * spec) + inner * spec * 0.12 + band * specS * 0.1) * uLightInt;
    if (uRimGlow > 0.001) {
      // belső derengés pontosan a GET IN TOUCH gombé szerint (CSS: inset 0 0 14px −2px, 40% fehér): a peremen ~16%,
      // ~3,5 px-en ~6%, ~11 px-en ~1–2%
      float gl = 0.2 * o1 + 0.12 * o2;
      col += vec3(gl * uRimGlow);
    }
    col = mix(vec3(1.0), col, alpha);                                // az élsimítás sávjában a külső ragyogásba fut
    float aOut = max(alpha, og);
    gl_FragColor = vec4(col, aOut * uAlpha);
  }`;
