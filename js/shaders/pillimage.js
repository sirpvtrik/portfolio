// A pill belsejében ülő projektkép (hoverre középről kinyílik). Az 1-es rétegen van, így az üveg pereme megtöri.
// Olvashatóság: a kép sötétítve, középen (a szöveg mögött) erősen elmosva és még sötétebb, a szélek felé élesedik.

export const pillImageVS = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

export const pillImageFS = /* glsl */`
  precision highp float;
  uniform sampler2D uMap;
  uniform float uReveal;     // 0 → 1: a kinyílás állapota
  uniform float uAspect;     // a lap szélesség / magasság aránya
  uniform float uImgAspect;  // a kép aránya
  uniform vec2 uFocus;       // a kép melyik pontja kerüljön középre (0..1)
  uniform vec2 uTexSize;     // a kép mérete pixelben (az elmosás sugarához)
  uniform float uTime;
  uniform float uDim;        // általános fényerő (olvashatóság)
  uniform float uFrostC;     // elmosás középen (mip-szint)
  uniform float uFrostE;     // elmosás a szélen (mip-szint)
  varying vec2 vUv;

  // elmosott minta: 9 pont egy körön, a megadott mip-szinten (sima, nem kockás)
  vec3 blurAt(vec2 uv, float lod) {
    float r = exp2(lod) / uTexSize.x * 1.6;
    vec2 a = vec2(1.0, uImgAspect);
    vec3 s = texture2D(uMap, uv, lod).rgb;
    for (int i = 0; i < 8; i++) {
      float t = float(i) * 0.7854 + 0.39;
      s += texture2D(uMap, uv + vec2(cos(t), sin(t)) * a * r, lod).rgb;
    }
    return s / 9.0;
  }

  void main() {
    // object-fit: cover, a fókuszpont körül
    vec2 vis = uAspect > uImgAspect ? vec2(1.0, uImgAspect / uAspect) : vec2(uAspect / uImgAspect, 1.0);
    vec2 c = clamp(uFocus, vis * 0.5, 1.0 - vis * 0.5);
    vec2 iuv = c + (vUv - 0.5) * vis;

    // távolság a középponttól, a pill alakjához nyújtva (0 közép, ~1 a szél)
    vec2 q = (vUv - 0.5) * 2.0;
    float e = length(q * vec2(1.0, 1.0));
    float ang = atan(q.y, q.x * uAspect);

    // kinyílás: folyékony, enyhén hullámzó szél, középről kifelé (a pill arányában nyúlik)
    float R = uReveal * 1.55;
    float wob = (sin(ang * 3.0 + uTime * 1.3) * 0.5 + sin(ang * 5.0 - uTime * 0.9) * 0.3) * 0.07 * (1.0 - uReveal * 0.6);
    float mask = 1.0 - smoothstep(R - 0.35, R, e + wob);
    if (mask < 0.002) discard;

    // helyfüggő frost: középen erős, a szél felé gyengül
    float lod = mix(uFrostC, uFrostE, smoothstep(0.15, 0.95, e));
    vec3 col = blurAt(iuv, lod);

    // olvashatóság: sötétítés + a szöveg mögött még sötétebb, lágy folt
    float scrim = mix(0.6, 1.0, smoothstep(0.1, 0.8, e));
    col *= uDim * scrim;

    gl_FragColor = vec4(col, mask);
  }`;
