// A pillek liquid glass shadere: képernyőtérbeli fénytörés valódi 3D normálokkal

export const glassVS = /* glsl */`
  varying vec3 vN;
  varying vec3 vV;
  varying float vEdge;
  varying vec2 vLocal;
  void main() {
    vLocal = position.xy;                                    // a lap saját síkjában (a belső ragyogáshoz)
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vEdge = clamp((1.0 - abs(normal.z)) * 5.0, 0.0, 1.0);   // 0 a sík előlapon, 1 a peremen
    vV = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`;

export const glassFS = /* glsl */`
  precision highp float;
  uniform sampler2D uBg;
  uniform vec2  uRes;
  uniform float uRefr, uDisp, uFrost, uSplay, uLightAng, uLightInt, uHover, uPulse, uThick, uTintK;
  uniform vec3 uTint;
  uniform vec2 uHalf;     // a lap fél szélessége / magassága (a körvonal)
  uniform float uRad;     // a sarok sugara (pillnél a fél magasság)
  uniform float uGlow;    // belső fehér ragyogás a szélen (Figma: inset 0 0 35.9px -6px rgba(255,255,255,.45)); lapanként
  uniform float uGlowOn;  // a Glass panel „Perem-glow” kapcsolója (közös)
  uniform float uLit;     // belépéskor 0,3 → 1: a pillek a fénycsóvától válnak láthatóvá
  uniform float uBeamI;   // a fénycsóva ereje (lélegzik, zenére halkul); 0: nincs
  uniform float uBeamA;   // a csóva csúcsa a képernyő magasságához (alulról felnő, kattintásra visszahúzódik)
  uniform float uRim;     // a perem tükröződéseinek erőssége (Glass panel „Perem” csúszka; a sík lapot nem érinti)
  varying vec3 vN;
  varying vec3 vV;
  varying float vEdge;
  varying vec2 vLocal;

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
    float amt = uRefr * 0.2 * spl * w * uThick;      // vékonyabb perem → kisebb törés (Depth)
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

    // fénycsóva az üvegen át (Patrik Figma-terve, Desktop – 9): a háttérben futó vékony fényvonalat az üveg vízszintesen
    // széthúzza egy lágy, világító sávvá, mintha matt üvegen át látszana. A sávban a hátteret a vonal két oldaláról vesszük
    // (így az éles vonal eltűnik), és ugyanannak a fénynek az elmosott, kiszámolt változatát tesszük a helyére.
    // A peremen részben megmarad az eredeti, megtört vonal a színes töréssel.
    if (uBeamI > 0.001) {
      vec2 fp = gl_FragCoord.xy + dG * uRes;                       // a megtört nézési pont pixelben
      float bxh = abs(fp.x - uRes.x * 0.5) / uRes.y;               // távolság a vonaltól, képernyőmagasságban
      if (bxh < 0.1) {
        float yb = fp.y / uRes.y;
        float sb = clamp(1.0 - yb / max(uBeamA, 1e-3), 0.0, 1.0);    // 1 lent, 0 a csúcsnál (mint a hullám-shaderben)
        float tip = smoothstep(0.0, 0.14, sb);
        float d = 0.0038 + 0.041 * sb * sb + 0.012;                  // ugyanaz a lecsengés, de az üveg kiszélesíti (matt)
        vec2 off = vec2(0.12 * uRes.y / uRes.x, 0.0);
        vec3 base = 0.5 * (texture2D(uBg, suv + dG + off).rgb + texture2D(uBg, suv + dG - off).rgb);
        float band = 0.51 * 0.9 * exp(-bxh / d) * tip * uBeamI;
        float m = (1.0 - smoothstep(0.07, 0.1, bxh)) * (1.0 - w * 0.55);
        col = mix(col, base + vec3(band), m);
      }
    }

    col *= mix(vec3(1.0), vec3(0.9, 0.93, 0.98), g);     // vastagabb üveg a peremen
    col = mix(col, vec3(0.2), uFrost * 0.22);
    // projekt-szín hoverre (mint egy színes üveg billentyű): az üvegen át látott fény színeződik, a vastag részek
    // (perem, oldalfal) izzanak; a fehér tükröződések és csillanások ezután kerülnek rá, így fehérek maradnak
    if (uTintK > 0.001) {
      float thick = max(w, smoothstep(0.35, 0.95, g));
      vec3 tcol = col * uTint * 1.6 + uTint * (0.04 + 0.45 * pow(thick, 1.3));
      col = mix(col, tcol, uTintK);
    }

    float la = radians(uLightAng);
    vec3 Ld = normalize(vec3(-cos(la), -sin(la), 0.7));
    vec3 R = reflect(-V, N);
    float F = 0.05 + 0.95 * pow(g, 3.0);
    float boost = 1.0 + uPulse * 0.5 + uHover * 0.4;
    float rimK = mix(1.0, uRim, w) * uLit;                                     // a peremen a Perem csúszka szerint
    col += vec3(envAt(R, Ld)) * F * uLightInt * boost * rimK;
    col += smoothstep(0.78, 1.0, dot(R, Ld)) * 0.22 * uLightInt * uLit;        // sheen a lapon, ahogy forog
    col += pow(max(dot(N, normalize(Ld + V)), 0.0), 110.0) * 1.8 * uLightInt * rimK;  // csillanás
    col += smoothstep(0.86, 0.985, g) * 0.28 * uLightInt * boost * uRim * uLit;  // vékony világos kontúr

    // belső ragyogás, pontosan a Figma belső árnyéka szerint (inset 0 0 35.9px −6px, 45% fehér, a pill 164 px magas):
    // a körvonal legszélén ~17% fehér, ~10 px-en a felére, ~30 px-re eltűnik. A normális eloszlás farka logisztikus közelítéssel.
    if (uGlow * uGlowOn > 0.001) {
      vec2 q = abs(vLocal) - (uHalf - uRad);
      float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRad;   // < 0 a körvonalon belül
      float xpx = max(-sd, 0.0) / (2.0 * uHalf.y) * 164.0;             // távolság a széltől, Figma-pixelben
      float gl = 0.45 / (1.0 + exp(1.702 * (xpx + 6.0) / 17.95));
      col += vec3(gl * uGlow * uGlowOn * (0.4 + 0.6 * ndv) * uLit);
      // hajszálvékony fényes él (Figma glass): a sziluett mentén (ahol a felület elfordul a nézőtől), a fény felőli oldalon
      // a legerősebb, a túloldalon halványabb; az oldalfalra szemből nem kerül
      vec2 n2 = normalize(N.xy + vec2(1e-5));
      vec2 L2 = normalize(vec2(-cos(radians(uLightAng)), -sin(radians(uLightAng))));
      float lf = 0.25 + 0.75 * max(dot(n2, L2), 0.0) + 0.3 * max(-dot(n2, L2), 0.0);
      float hair = smoothstep(0.9, 0.99, g);
      col += vec3(0.5 * hair * lf * uGlow * uGlowOn * uLit);          // az oldalfalon (súrolva) gyengébb
    }

    gl_FragColor = vec4(col, 1.0);
  }`;
