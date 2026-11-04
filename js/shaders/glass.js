// A pillek liquid glass shadere: képernyőtérbeli fénytörés valódi 3D normálokkal

export const glassVS = /* glsl */`
  varying vec3 vN;
  varying vec3 vV;
  varying float vEdge;
  varying vec2 vLocal;
  varying vec3 vTx, vTy;
  void main() {
    vLocal = position.xy;                                    // a lap saját síkjában (a belső ragyogáshoz, a lencséhez)
    vTx = normalize(normalMatrix * vec3(1.0, 0.0, 0.0));     // a lap x / y iránya nézőtérben (a lencse-normálhoz)
    vTy = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));
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
  uniform float uRim;
  uniform float uLens;    // lencse a lap szélén (liquid glass): 1 = pill, 0 = kártya
  uniform float uLensW;   // a lencse-sáv szélessége a fél magassághoz képest (pill: 0,62; a nagy projekt-testen keskenyebb)
  uniform vec2 uCurP;     // az egérfény helye (pixel, alulról) és ereje: a perem közelében elkapja a fényt
  uniform float uCurL;     // a perem tükröződéseinek erőssége (Glass panel „Perem” csúszka; a sík lapot nem érinti)
  varying vec3 vN;
  varying vec3 vV;
  varying float vEdge;
  varying vec2 vLocal;
  varying vec3 vTx, vTy;

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
    // lencse (Apple liquid glass): a sík lap a széle felé fokozatosan ívelten tör, középen tiszta marad;
    // így a mögötte átúszó fény (pl. az egérfény) hajlik és torzul, nem tűnik tömörnek a pill
    float lens = 0.0;
    vec3 Nr = N;
    if (uLens > 0.001) {
      vec2 lq = abs(vLocal) - (uHalf - uRad);
      float lsd = length(max(lq, 0.0)) + min(max(lq.x, lq.y), 0.0) - uRad;   // < 0 a körvonalon belül
      float lb = 1.0 - clamp(-lsd / (uHalf.y * uLensW), 0.0, 1.0);
      lens = lb * lb * lb * (1.0 - w) * uLens;
      vec2 cq = vec2(clamp(vLocal.x, -(uHalf.x - uRad), uHalf.x - uRad), 0.0);
      vec2 n2 = normalize(vLocal - cq + vec2(1e-5));
      Nr = normalize(N + (vTx * n2.x + vTy * n2.y) * lens * 1.6);
    }
    float wr = max(w, lens);
    float amt = uRefr * 0.2 * spl * (w * uThick + lens * 0.9);   // perem: Depth szerint; lencse: a lap szélén
    float k = uDisp * 0.14 * wr;
    vec2 dR = dev(V, Nr, 1.0 / (1.5 - k)) * amt * asp;
    vec2 dG = dev(V, Nr, 1.0 / 1.5)       * amt * asp;
    vec2 dB = dev(V, Nr, 1.0 / (1.5 + k)) * amt * asp;
    // diszperzió erősebb a peremen
    dR *= 1.0 - k * g * 1.5;
    dB *= 1.0 + k * g * 1.5;

    vec3 col;
    col.r = bgAt(suv + dR).r;
    col.g = bgAt(suv + dG).g;
    col.b = bgAt(suv + dB).b;

    col *= mix(vec3(1.0), vec3(0.9, 0.93, 0.98), g);     // vastagabb üveg a peremen
    // a perem és a lencse elkapja a közeli egérfényt: az üveg széle felragyog a fény felőli oldalon
    if (uCurL > 0.001) {
      vec2 dp = gl_FragCoord.xy - uCurP;
      float rr = uRes.y * 0.1;
      float near = exp(-dot(dp, dp) / (rr * rr));
      col += vec3(near * (w * 0.9 + lens * 0.3) * uCurL * 0.45);
    }
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
    // tükröződéshez a lap enyhén domború (mint a liquid glass): így a fény nem önti el egyszerre, egyenletesen az egész
    // sík lapot (ettől tűnt tömör szürke műanyagnak), hanem csíkként / foltként jelenik meg, és forgás közben végigsiklik
    // rajta; a többi része átlátszó marad. A fénytörés a sík (lencsés) normállal megy, a közép tiszta marad.
    // a domborúság a lap méretéhez arányos (a pillen, 0,708 fél magasságnál pontosan a régi): a nagy projekt-testen így
    // nem sűrűsödik kemény, kis fényfoltba, hanem széles, lágy átmenet marad
    vec2 dl = vLocal * (0.708 / max(uHalf.y, 0.001));
    vec3 Nc = normalize(Nr + (vTx * dl.x + vTy * dl.y) * 0.16 * uLens * (1.0 - w));
    vec3 R = reflect(-V, Nc);
    float F = 0.05 + 0.95 * pow(g, 3.0);
    float boost = 1.0 + uPulse * 0.5 + uHover * 0.4;
    float rimK = mix(1.0, uRim, w);                                     // a peremen a Perem csúszka szerint
    if (uLens > 0.001) {
      // STÚDIÓ-ÜVEG (Patrik referenciája: üvegkorongok fekete háttéren) – a pilleken:
      //  1) nagy, lágy softbox a fény felől: a domború lapon fokozatos fényfolt (egyik oldalon fehér, a másik felé
      //     sötétbe fut), forgás közben végigsiklik; a lap többi része sötét és átlátszó marad
      //  2) vékony, fehér csíkfény a túloldalról a peremen és a lap szélén (a szivárványos változat Patriknak nem tetszett)
      //  3) tiszta, vékony szél
      float li = 0.45 + 0.55 * uLightInt;
      float face = 1.0 - w;
      float sb = smoothstep(0.15, 0.97, dot(R, Ld));
      col += vec3(sb * sb) * (0.42 * face + 0.85 * w * F + 0.1) * li * boost;
      vec3 Ls = normalize(vec3(cos(la) * 0.55, 0.8, 0.35));
      float xs = dot(R, Ls);
      vec3 strip = vec3(exp(-pow((xs - 0.9) / 0.05, 2.0)));             // fehér csíkfény (szivárvány nélkül)
      vec2 eq = abs(vLocal) - (uHalf - uRad);
      float din = max(-(length(max(eq, 0.0)) + min(max(eq.x, eq.y), 0.0) - uRad), 0.0) / uHalf.y;
      float edgeZone = max(w, exp(-din / 0.18) * face);                  // a perem és a lap széle
      col += strip * (0.25 + 1.1 * edgeZone) * li * rimK;
      col += vec3(exp(-pow(din / 0.025, 2.0)) * 0.18 * face) * li;       // tiszta, vékony szél
      col += pow(max(dot(Nc, normalize(Ld + V)), 0.0), 140.0) * 1.4 * li * rimK;   // csillanás
    } else {
      col += vec3(envAt(R, Ld)) * F * uLightInt * boost * rimK;
      col += smoothstep(0.86, 1.0, dot(R, Ld)) * 0.26 * uLightInt;        // sheen
      col += pow(max(dot(Nc, normalize(Ld + V)), 0.0), 110.0) * 1.8 * uLightInt * rimK;  // csillanás
    }
    col += smoothstep(0.86, 0.985, g) * 0.28 * uLightInt * boost * uRim;  // vékony világos kontúr

    // belső ragyogás, pontosan a Figma belső árnyéka szerint (inset 0 0 35.9px −6px, 45% fehér, a pill 164 px magas):
    // a körvonal legszélén ~17% fehér, ~10 px-en a felére, ~30 px-re eltűnik. A normális eloszlás farka logisztikus közelítéssel.
    if (uGlow * uGlowOn > 0.001) {
      vec2 q = abs(vLocal) - (uHalf - uRad);
      float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRad;   // < 0 a körvonalon belül
      float xpx = max(-sd, 0.0) / (2.0 * uHalf.y) * 164.0;             // távolság a széltől, Figma-pixelben
      float gl = 0.45 / (1.0 + exp(1.702 * (xpx + 6.0) / 17.95));
      col += vec3(gl * uGlow * uGlowOn * (0.4 + 0.6 * ndv));
      // hajszálvékony fényes él (Figma glass): a sziluett mentén (ahol a felület elfordul a nézőtől), a fény felőli oldalon
      // a legerősebb, a túloldalon halványabb; az oldalfalra szemből nem kerül
      vec2 n2 = normalize(N.xy + vec2(1e-5));
      vec2 L2 = normalize(vec2(-cos(radians(uLightAng)), -sin(radians(uLightAng))));
      float lf = 0.25 + 0.75 * max(dot(n2, L2), 0.0) + 0.3 * max(-dot(n2, L2), 0.0);
      float hair = smoothstep(0.9, 0.99, g);
      col += vec3(0.5 * hair * lf * uGlow * uGlowOn);          // az oldalfalon (súrolva) gyengébb
    }

    gl_FragColor = vec4(col, 1.0);
  }`;

// A pill belső, hátsó felülete (BackSide), a háttérbe (1-es réteg) rajzolva, csak fényként (additív): a túloldali perem
// vékony fényvonala és a belső falak tükröződései (fehéren). Az elülső lap ezt az üvegen át, megtörve mutatja,
// így látszik át a pill (ettől nem tömör test, mint a referencia üvegkorongjai).
export const glassBackFS = /* glsl */`
  precision highp float;
  uniform float uLightAng, uLightInt, uRim;
  varying vec3 vN;
  varying vec3 vV;
  varying float vEdge;
  varying vec2 vLocal;
  varying vec3 vTx, vTy;
  void main() {
    vec3 N = -normalize(vN);                                   // a belső felület befelé néz
    vec3 V = normalize(-vV);
    float w = smoothstep(0.0, 1.0, vEdge);
    float g = 1.0 - abs(dot(N, V));
    float la = radians(uLightAng);
    vec3 Ld = normalize(vec3(-cos(la), -sin(la), 0.7));
    vec3 R = reflect(-V, N);
    float li = 0.45 + 0.55 * uLightInt;
    float sb = smoothstep(0.2, 0.97, dot(R, Ld));
    vec3 Ls = normalize(vec3(cos(la) * 0.55, 0.8, 0.35));
    float xs = dot(R, Ls);
    vec3 strip = vec3(exp(-pow((xs - 0.9) / 0.06, 2.0)));      // fehér
    vec3 col = vec3(sb * sb) * (0.07 + 0.6 * w * g) + strip * (0.18 + 0.9 * w);
    col += vec3(smoothstep(0.55, 0.98, g)) * 0.32 * w;        // a túloldali perem vékony fényes vonala
    gl_FragColor = vec4(col * li * (0.6 + 0.4 * uRim), 1.0);
  }`;
