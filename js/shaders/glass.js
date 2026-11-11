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


// ÉLETHŰ ÜVEG (teszt, Patrik: fekete háttér előtt „műanyag hatásuk van”). Az ok: a lapon széles, lágy, szürke fényfolt ült
// (fényes műanyag ilyen), a peremen pedig nem volt éles csillanás. A valódi üveg fekete előtt szinte láthatatlan, csak a
// fényforrások ÉLES szélű tükörképe látszik rajta: szemből alig (Fresnel: ~4%), súroló szögben erősen, a vastag peremen
// pedig a mögötte álló lámpák fénye jön át (sötét látóterű világítás, ahogy az üveget fotózzák). Ez a stúdió:
const realEnv = /* glsl */`
  // egy téglalap alakú lámpa a c irányban (hs: fél méret, f: a szél lágysága), 0..1
  float boxL(vec3 d, vec3 c, vec2 hs, float f) {
    float dz = dot(d, c);
    vec3 rx = normalize(cross(vec3(0.0, 1.0, 0.0), c));
    vec3 ry = cross(c, rx);
    vec2 p = vec2(dot(d, rx), dot(d, ry)) / max(dz, 1e-3);
    vec2 q = abs(p) - hs;
    float sd = max(q.x, q.y);
    return step(0.05, dz) * smoothstep(f, -f, sd) * (1.0 - 0.22 * dot(p / hs, p / hs));
  }
  // a stúdió elöl (ezt tükrözi az üveg): nagy softbox a Light irányából, magas csíkfény a túloldalon, vékony felső csík
  // kb: a softbox súlya (a sík lapon 0: Patrik kérte, hogy a lapról a fehér „fényablakok” kerüljenek le; a peremen 1)
  float envFront(vec3 d, float la, float f, float kb) {
    vec3 K  = normalize(vec3(-cos(la), -sin(la), 0.7));
    vec3 Sd = normalize(vec3(cos(la) * 0.95, 0.12, 0.42));
    vec3 Tp = normalize(vec3(cos(la) * 0.55, 0.8, 0.35));
    float e = boxL(d, K, vec2(0.30, 0.20), 0.012 + f) * 16.0 * kb;
    e += boxL(d, Sd, vec2(0.055, 0.85), 0.008 + f) * 7.0;
    e += boxL(d, Tp, vec2(0.6, 0.04), 0.008 + f) * 6.0;
    return e + 0.025 + 0.035 * max(d.y, 0.0);                    // a stúdió sosem teljesen fekete
  }
  // a tárgy mögött, kétoldalt álló lámpák (ezek fénye jön át a vastag peremen, és ez csillan a sziluetten)
  float envBack(vec3 d, float f) {
    float e = boxL(d, normalize(vec3(-0.82, 0.1, -0.55)), vec2(0.26, 0.9), 0.02 + f) * 5.0;
    e += boxL(d, normalize(vec3(0.82, 0.1, -0.55)), vec2(0.26, 0.9), 0.02 + f) * 5.0;
    e += boxL(d, normalize(vec3(0.0, 0.85, -0.5)), vec2(0.9, 0.12), 0.02 + f) * 3.0;
    return e;
  }`;

export const glassFS = /* glsl */`
  precision highp float;
  uniform sampler2D uBg;
  uniform vec2  uRes;
  uniform float uRefr, uDisp, uFrost, uSplay, uLightAng, uLightInt, uHover, uPulse, uThick, uTintK;
  uniform float uDark, uFlash;   // belépés a hero után: sötétből felvilágít, közben felvillan (js/pills.js)
  uniform vec3 uTint;
  uniform vec2 uHalf;     // a lap fél szélessége / magassága (a körvonal)
  uniform float uRad;     // a sarok sugara (pillnél a fél magasság)
  uniform float uGlow;    // belső fehér ragyogás a szélen (Figma: inset 0 0 35.9px -6px rgba(255,255,255,.45)); lapanként
  uniform float uGlowOn;  // a Glass panel „Perem-glow” kapcsolója (közös)
  uniform float uRim;
  uniform float uLens;    // lencse a lap szélén (liquid glass): 1 = pill, 0 = kártya
  uniform float uLensW;   // a lencse-sáv szélessége a fél magassághoz képest (pill: 0,62; a nagy projekt-testen keskenyebb)
  uniform float uSpecK;   // minden fény az üvegen (tükröződés, csíkfény, csillanás, kontúr, ragyogás): 1 = pill; a henger-oldal
                          // testén 0 = fény nélkül (Patrik tesztje), csak a fénytörés marad
  uniform float uFace;    // a sík lap tükröződései (softbox, csíkfény, csillanás): 1 = pill; a teljes képernyős projekt-testen
                          // szinte 0, mert ott a lap egésze egyszerre fényesedett ki (Patrik: „nagyon zavaróan fénylik”)
  uniform vec2 uCurP;     // az egérfény helye (pixel, alulról) és ereje: a perem közelében elkapja a fényt
  uniform float uCurL;     // a perem tükröződéseinek erőssége (Glass panel „Perem” csúszka; a sík lapot nem érinti)
  uniform float uEdge;    // a kinyílt projekt-test (henger) széle: fényes él + befelé elfogyó derengés (0 = nincs; a pilleken 0)
  uniform float uEdgeW;   // a derengés szélessége a lap saját egységében (~26 px)
  uniform float uReal;    // élethű üveg (teszt): 1 = a pilleken a fekete stúdió éles fényforrásai, Fresnel szerint` + realEnv + /* glsl */`
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

  // belépés a hero után (Patrik: „oldalt kapják meg a fényt, szép átmenettel világosodjanak fel”): a fény a pill két végén,
  // a hullámok felől jön be, és fényes szegéllyel lágyan a közepe felé terjed. uDark: 1 = sötét, 0 = kész (más lapokon 0)
  vec3 sideLight(vec3 c) {
    if (uDark < 0.001) return c;
    float p = (1.0 - uDark) * 1.4;
    float s = 1.0 - clamp(abs(vLocal.x) / max(uHalf.x, 1e-3), 0.0, 1.0);   // 0 a két végén, 1 középen
    float r = smoothstep(0.0, 0.4, p - s);
    float band = exp(-pow((p - s - 0.08) / 0.1, 2.0)) * uFlash;
    return c * r + (c * 0.8 + vec3(0.93, 0.96, 1.0) * 0.1) * band;
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
      // a lencse iránya a legközelebbi szél felé (lekerekített téglalapra általánosan; a pillen, ahol uHalf.y = uRad,
      // pontosan a régi: a sarokív középpontjától kifelé, az egyenes szakaszon fel / le). A henger-oldal széthúzott testén
      // így a függőleges oldalakon is vízszintesen tör.
      vec2 n2 = (lq.x > 0.0 && lq.y > 0.0) ? normalize(lq) * sign(vLocal + vec2(1e-6))
              : (lq.x > lq.y ? vec2(sign(vLocal.x + 1e-6), 0.0) : vec2(0.0, sign(vLocal.y + 1e-6)));
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
    vec3 colRefr = col;                                  // a megtört háttér, fények nélkül (uSpecK)
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
    // élethű üvegnél erősebb domborúság (mint egy üvegkavics): a softbox így éles szélű „ablakként” ül a lap egy részén,
    // nem tölti ki szürkén az egészet
    float dome = mix(0.16, 0.42, uReal);
    vec3 Nc = normalize(Nr + (vTx * dl.x + vTy * dl.y) * dome * uLens * (1.0 - w));
    vec3 R = reflect(-V, Nc);
    float F = 0.05 + 0.95 * pow(g, 3.0);
    float boost = 1.0 + uPulse * 0.5 + uHover * 0.4;
    float rimK = mix(1.0, uRim, w);                                     // a peremen a Perem csúszka szerint
    if (uLens > 0.001 && uReal > 0.5) {
      // ÉLETHŰ ÜVEG (teszt): nincs lágy szürke folt a lapon; minden fény a stúdió tükörképe, Fresnel szerint
      float li = 0.45 + 0.55 * uLightInt;
      float Fr = 0.04 + 0.96 * pow(g, 5.0);                              // szemből 4%, súroló szögben tükör
      float fR = clamp(length(fwidth(R)) * 1.2, 0.0, 0.4);               // ahol a tükörkép összesűrűsödik, ott lágyabb szél (élsimítás)
      float refl = (envFront(R, la, fR, w) + envBack(R, fR)) * Fr * mix(uFace, 1.0, w);
      // a vastag peremen / oldalfalon átjövő fény: a megtört sugár a tárgy mögötti lámpákra néz
      // (a lap szélén a lencse-sáv is így világít: ott az üveg íve a szélek felé fordítja a sugarat). A Dispersion csúszka
      // enyhe színes szegélyt ad az átjövő fény szélének, mint egy prizma.
      float tw = max(w, lens * uFace) * 0.85 * (1.0 - Fr);             // a nagy projekt-testen a lap széle nem világít
      float kd = uDisp * 0.022;
      vec3 trans = vec3(
        envBack(normalize(refract(-V, Nr, 1.0 / (1.5 - kd)) - Nr * 0.35), 0.03 + fR),
        envBack(normalize(refract(-V, Nr, 1.0 / 1.5) - Nr * 0.35), 0.03 + fR),
        envBack(normalize(refract(-V, Nr, 1.0 / (1.5 + kd)) - Nr * 0.35), 0.03 + fR)) * tw;
      float hair = pow(g, 6.0) * 0.1 * (1.0 - w);                        // a lap legszélén hajszálnyi derengés (a forma kivehető marad)
      vec3 light = (vec3(refl + hair) + trans) * li * boost;
      col += 1.0 - exp(-light);                                          // a nagyon erős fény lágyan telítődik (nem ég ki élesen)
    } else if (uLens > 0.001) {
      // STÚDIÓ-ÜVEG (Patrik referenciája: üvegkorongok fekete háttéren) – a pilleken:
      //  1) nagy, lágy softbox a fény felől: a domború lapon fokozatos fényfolt (egyik oldalon fehér, a másik felé
      //     sötétbe fut), forgás közben végigsiklik; a lap többi része sötét és átlátszó marad
      //  2) vékony, fehér csíkfény a túloldalról a peremen és a lap szélén (a szivárványos változat Patriknak nem tetszett)
      //  3) tiszta, vékony szél
      float li = 0.45 + 0.55 * uLightInt;
      float face = 1.0 - w;
      float sb = smoothstep(0.15, 0.97, dot(R, Ld));
      col += vec3(sb * sb) * ((0.42 * face + 0.1) * uFace + 0.85 * w * F) * li * boost;
      vec3 Ls = normalize(vec3(cos(la) * 0.55, 0.8, 0.35));
      float xs = dot(R, Ls);
      vec3 strip = vec3(exp(-pow((xs - 0.9) / 0.05, 2.0)));             // fehér csíkfény (szivárvány nélkül)
      vec2 eq = abs(vLocal) - (uHalf - uRad);
      float din = max(-(length(max(eq, 0.0)) + min(max(eq.x, eq.y), 0.0) - uRad), 0.0) / uHalf.y;
      float edgeZone = max(w, exp(-din / 0.18) * face);                  // a perem és a lap széle
      col += strip * (0.25 * uFace + 1.1 * edgeZone * (0.5 + 0.5 * uFace)) * li * rimK;   // a nagy testen a szélén is visszafogottabb
      col += vec3(exp(-pow(din / 0.025, 2.0)) * 0.18 * face) * li;       // tiszta, vékony szél
      col += pow(max(dot(Nc, normalize(Ld + V)), 0.0), 140.0) * 1.4 * li * rimK * mix(uFace, 1.0, w);   // csillanás
    } else {
      col += vec3(envAt(R, Ld)) * F * uLightInt * boost * rimK;
      col += smoothstep(0.86, 1.0, dot(R, Ld)) * 0.26 * uLightInt;        // sheen
      col += pow(max(dot(Nc, normalize(Ld + V)), 0.0), 110.0) * 1.8 * uLightInt * rimK;  // csillanás
    }
    col += smoothstep(0.86, 0.985, g) * 0.28 * uLightInt * boost * uRim * (1.0 - uReal * step(0.001, uLens));  // vékony világos kontúr

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

    col = mix(colRefr, col, uSpecK);
    // a kinyílt projekt-test széle (Patrik: jobban lehessen látni, érezni, hogy „belelépünk a hengerbe”): hajszálvékony
    // fényes él a körvonalon + befelé lágyan elfogyó derengés; a fény felőli oldalon erősebb, a túloldalon halvány
    // (így üvegperemnek hat, nem egyenletes keretnek). A test többi fényétől (uSpecK) független.
    if (uEdge > 0.001) {
      vec2 eq = abs(vLocal) - (uHalf - uRad);
      float ein = max(-(length(max(eq, 0.0)) + min(max(eq.x, eq.y), 0.0) - uRad), 0.0);   // távolság a körvonaltól befelé
      vec2 en = (eq.x > 0.0 && eq.y > 0.0) ? normalize(eq) * sign(vLocal + vec2(1e-6))
              : (eq.x > eq.y ? vec2(sign(vLocal.x + 1e-6), 0.0) : vec2(0.0, sign(vLocal.y + 1e-6)));
      float lf = 0.68 + 0.32 * dot(en, normalize(vec2(-cos(la), -sin(la))));
      float px1 = uEdgeW / 26.0;
      float line = exp(-pow(ein / (1.5 * px1), 2.0));
      float soft = exp(-ein / uEdgeW) * 0.45 + exp(-ein / (uEdgeW * 0.28)) * 0.55;
      col += vec3(0.93, 0.96, 1.0) * uEdge * lf * mix(line * 0.55 + soft * 0.17, 0.42, w);
    }
    col = sideLight(col);
    gl_FragColor = vec4(col, 1.0);
  }`;

// A pill belső, hátsó felülete (BackSide), a háttérbe (1-es réteg) rajzolva, csak fényként (additív): a túloldali perem
// vékony fényvonala és a belső falak tükröződései (fehéren). Az elülső lap ezt az üvegen át, megtörve mutatja,
// így látszik át a pill (ettől nem tömör test, mint a referencia üvegkorongjai).
export const glassBackFS = /* glsl */`
  precision highp float;
  uniform float uLightAng, uLightInt, uRim;
  uniform float uDark, uFlash;
  uniform vec2 uHalf;     // (csak a pillek hátlapja kapja; máshol uDark = 0, így nem használjuk)
  uniform float uBackK;   // a belső hátlap fénye (1 = pill; a teljes képernyős projekt-testen halvány, különben az egész kép ködös)
  uniform float uReal;    // élethű üveg (teszt): a belső felületek a stúdiót tükrözik, a kritikus szög fölött teljesen` + realEnv + /* glsl */`
  varying vec3 vN;
  varying vec3 vV;
  varying float vEdge;
  varying vec2 vLocal;
  varying vec3 vTx, vTy;
  // belépés a hero után (Patrik: „oldalt kapják meg a fényt, szép átmenettel világosodjanak fel”): a fény a pill két végén,
  // a hullámok felől jön be, és fényes szegéllyel lágyan a közepe felé terjed. uDark: 1 = sötét, 0 = kész (más lapokon 0)
  vec3 sideLight(vec3 c) {
    if (uDark < 0.001) return c;
    float p = (1.0 - uDark) * 1.4;
    float s = 1.0 - clamp(abs(vLocal.x) / max(uHalf.x, 1e-3), 0.0, 1.0);   // 0 a két végén, 1 középen
    float r = smoothstep(0.0, 0.4, p - s);
    float band = exp(-pow((p - s - 0.08) / 0.1, 2.0)) * uFlash;
    return c * r + (c * 0.8 + vec3(0.93, 0.96, 1.0) * 0.1) * band;
  }
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
    if (uReal > 0.5) {
      // belső tükröződés: a párhuzamos hátlapon gyenge (a fény kimegy rajta), a peremen / oldalfalon a kritikus szög
      // (~42°) fölött teljes: ettől látszik a túloldali perem az üvegen át, második, halványabb tükörképként
      float c = abs(dot(N, V));
      float ci = mix(sqrt(1.0 - (1.0 - c * c) / 2.25), c, w);          // a lapon a beeső sugár már megtört
      float Fi = 0.04 + 0.96 * smoothstep(0.80, 0.70, ci);
      // a hátlap belülről homorú tükör (kifelé domború üveg): a softbox második, kisebb, fordított tükörképe másutt ül,
      // mint az előlapé (ez a kettős tükröződés az üveg egyik ismertetőjele)
      vec2 dl = vLocal / 0.708;
      vec3 Rb = reflect(-V, normalize(N - (vTx * dl.x + vTy * dl.y) * 0.42 * (1.0 - w)));
      float fR = clamp(length(fwidth(Rb)) * 1.2, 0.0, 0.4);
      float e = (envFront(Rb, la, fR, w) + envBack(Rb, fR)) * Fi * 0.85;
      gl_FragColor = vec4(sideLight((1.0 - exp(-vec3(e) * li)) * uBackK), 1.0);
      return;
    }
    gl_FragColor = vec4(sideLight(col * li * (0.6 + 0.4 * uRim) * uBackK), 1.0);
  }`;
