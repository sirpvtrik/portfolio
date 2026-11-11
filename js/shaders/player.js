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
    float gy = clamp((p.y - uBox.y) / max(uBox.w - uBox.y, 1.0), 0.0, 1.0);
    vec3 tint = mix(vec3(0.15, 0.15, 0.165), mix(vec3(0.17, 0.17, 0.18), vec3(0.36, 0.36, 0.38), gy), uGrad);
    col = mix(col, tint, (0.5 + 0.12 * uGrad) * (1.0 - uClear));   // sötét üveg, mint a designban
    float la = radians(uLightAng);
    vec2 L = vec2(-cos(la), -sin(la));
    float f = dot(n, L);
    float spec = pow(max(f, 0.0), 2.5) + 0.45 * pow(max(-f, 0.0), 2.5);
    float rim = smoothstep(uScale * 1.8, 0.0, dist);
    float inner = smoothstep(uScale * 5.0, uScale * 1.5, dist) * (1.0 - rim);
    float band = pow(1.0 - t, 3.0);
    col += (rim * (0.14 + 1.0 * spec) + inner * spec * 0.12 + band * spec * 0.1) * uLightInt;
    if (uRimGlow > 0.001) {
      // fent kicsit erősebb (mint a GET IN TOUCH gombon), befelé lágyan elfogy
      float gl = exp(-dist / (uScale * 9.0)) * 0.36 + exp(-dist / (uScale * 2.2)) * 0.22;
      col += vec3(gl * uRimGlow * (0.75 + 0.25 * n.y));
    }
    gl_FragColor = vec4(col, alpha * uAlpha);
  }`;
