// A projekt-aloldal kártyáinak üvege: lekerekített téglalapok tetszőleges négyszögre vetítve (homográfia),
// a pillekével azonos jellegű liquid glass: a perem befelé töri a mögötte lévőt, diszperzió, fénytől függő peremfény.
// Kártyánként: uH = képernyő-pixel → kártya-UV (inverz homográfia), uSz = (szélesség, magasság, sarok-sugár, átlátszóság).
// uH[8] = a galéria vágókerete (a galéria kártyái csak azon belül látszanak, uFx.x = 1).

export const cardsFS = /* glsl */`
  precision highp float;
  uniform sampler2D uBg;
  uniform vec2 uRes;
  uniform mat3 uH[9];
  uniform vec4 uSz[8];
  uniform vec4 uBB[8];
  uniform vec4 uFx[8];
  uniform vec2 uMask;
  uniform float uScale, uRefr, uDisp, uFrost, uSplay, uLightAng, uLightInt;

  vec2 toUV(mat3 h, vec2 p) { vec3 q = h * vec3(p, 1.0); return q.xy / q.z; }
  float sdRR(vec2 lp, vec2 sz, float r) {                 // lekerekített téglalap a kártya saját pixeleiben
    vec2 q = abs(lp - sz * 0.5) - sz * 0.5 + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  float sdQ(mat3 h, vec4 s, vec2 p) { return sdRR(toUV(h, p) * s.xy, s.xy, s.z); }
  vec3 bgAt(vec2 px, float rad) {
    vec2 uv = px / uRes;
    vec3 s = texture2D(uBg, uv).rgb;
    for (int i = 0; i < 6; i++) {
      float a = float(i) * 1.0472;
      s += texture2D(uBg, uv + vec2(cos(a), sin(a)) * rad / uRes).rgb;
    }
    return s / 7.0;
  }

  void main() {
    vec2 p = gl_FragCoord.xy;
    float d = 1e5;
    mat3 H = mat3(1.0);
    vec4 s = vec4(0.0);
    for (int i = 0; i < 8; i++) {
      vec4 b = uBB[i];
      if (uSz[i].w < 0.004 || p.x < b.x || p.y < b.y || p.x > b.z || p.y > b.w) continue;
      if (uFx[i].x > 0.5) {                               // galéria: csak a vágókereten belül
        vec2 cu = toUV(uH[8], p);
        if (cu.x < 0.0 || cu.x > 1.0 || cu.y < 0.0 || cu.y > 1.0) continue;
      }
      float di = sdQ(uH[i], uSz[i], p);                     // (GLSL ES 1.0: uniform tömböt csak ciklusváltozó indexelhet)
      if (di < d) { d = di; H = uH[i]; s = uSz[i]; }
    }
    if (d > 1.5) discard;
    vec2 e = vec2(1.0, 0.0);
    vec2 n = normalize(vec2(sdQ(H, s, p + e.xy) - sdQ(H, s, p - e.xy), sdQ(H, s, p + e.yx) - sdQ(H, s, p - e.yx)) + 1e-5);
    float op = s.w;
    float alpha = smoothstep(1.0, -1.0, d) * op;
    float dist = max(-d, 0.0);
    // maszk: a fejléc alatt és a lap alján elhalványul (mint a DOM-tartalom)
    float yTop = uRes.y - p.y;
    alpha *= smoothstep(0.0, uMask.x, yTop) * smoothstep(0.0, uMask.y, p.y);

    float t = clamp(dist / (uScale * 22.0), 0.0, 1.0);
    float bend = pow(1.0 - t, mix(3.2, 1.3, uSplay));
    vec2 off = -n * bend * uRefr * uScale * 34.0;           // a perem befelé hajlítja a mögötte lévőt
    float k = uDisp * 0.35 * bend;
    float rad = uScale * (1.0 + uFrost * 9.0);
    vec3 col;
    col.r = bgAt(p + off * (1.0 - k), rad).r;
    col.g = bgAt(p + off, rad).g;
    col.b = bgAt(p + off * (1.0 + k), rad).b;
    col *= 0.78;                                           // enyhén sötétített üvegtest (olvasható szöveg)
    col = mix(col, vec3(0.16), uFrost * 0.25);

    float la = radians(uLightAng);
    vec2 L = vec2(-cos(la), -sin(la));
    float f = dot(n, L);
    float spec = pow(max(f, 0.0), 2.5) + 0.45 * pow(max(-f, 0.0), 2.5);
    // perem csatornánként kicsit eltérő vastagsággal → szivárványos szegély, mint a pilleken (Dispersion)
    // (iránytól függ: a fény felőli oldalon pirosas, a túloldalon kékes szél → összességében semleges, nem színes keret)
    float kd = uDisp * 0.7 * f;
    vec3 rim = vec3(smoothstep(uScale * 2.0 * max(0.3, 1.0 + kd), 0.0, dist),
                    smoothstep(uScale * 2.0, 0.0, dist),
                    smoothstep(uScale * 2.0 * max(0.3, 1.0 - kd), 0.0, dist));
    float inner = smoothstep(uScale * 7.0, uScale * 1.5, dist) * (1.0 - rim.g);
    float band = pow(1.0 - t, 3.0);
    float glow = exp(-dist / (uScale * 16.0)) * 0.10;      // a terv belső fehér fénye a peremen
    col += (rim * (0.16 + 1.4 * spec) + vec3(inner * spec * 0.2 + band * spec * 0.16 + glow)) * uLightInt;
    gl_FragColor = vec4(col, alpha);
  }`;
