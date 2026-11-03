// Hullámok a két szélen: teljes képernyős 2D shader (Fényszalag / Üveg stílus)

export const waveFS = /* glsl */`
  precision highp float;
  uniform float uTime, uAmp, uPush, uReact, uBeat, uGain, uFlowY, uStyle, uShift, uColFront, uRise, uFlash;
  uniform float uBeam, uBeamS;   // a középső fény erőssége és mérete (lélegzik; js/waves.js)
  uniform vec3 uPalA[3], uPalB[3];   // régi és új paletta (szalagonként egy árnyalat); a front (0 → 1.2) fentről lefelé viszi át
  uniform vec2 uRes;
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
  // a Középre eltolás képernyőmagasság-egységben, a képarányhoz igazítva:
  // uShift = 1 → a szalag a pillek széléig ér bármilyen széles képernyőn; álló (mobil) képernyőn 0
  float shiftH() { return uShift * max(0.0, 0.5 * uRes.x / uRes.y - 0.25); }
  float curve(float y, float side, float k, float sp, float beat) {
    float env = pow(sin(3.14159265 * clamp(y, 0.0, 1.0)), 1.2);
    float t = uTime + side * 3.7;
    float amp = 1.0 + beat * 2.0 + sp * 2.4;
    float yy = y + uFlowY;                                            // a minta lefelé csúszik (basszusra rántva)
    float mainW = sin(yy * 3.8 + t * 0.35 + k * 0.55) * 0.05;
    float drift = sin(yy * 2.2 - t * 0.27 + k * 1.7) * 0.011 * (k + 1.0);
    float ripple = sin(yy * 15.0 - t * 1.4 + k * 2.3) * 0.004 * (1.0 + sp * 6.0 + beat * 3.0);   // finom, folyékony fodrozódás
    // uShift: a Középre csúszka, a szalagokat a pillek felé hozza (a végeik a sarkokban maradnak)
    return env * (0.07 + shiftH() + k * 0.012 + uPush * 0.32 + (mainW + drift) * amp + ripple + sp * 0.05 * (1.0 + k * 0.3));   // a hangsávok helyben kidomborítják
  }
  float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  // uStyle: 0 = fényszalag, 1 = üvegrúd
  vec3 ribbons(vec2 px, float side) {
    float H = uRes.y;
    float y = px.y / H + uRise;                                         // uRise: belépéskor lejjebbről úszik fel
    float xe = (side < 0.0 ? px.x : uRes.x - px.x) / H;
    float sh = shiftH();
    if (xe > 1.3 + sh) return vec3(0.0);                                   // messze a széltől nincs mit számolni
    float sp = specAt(0.03 + sqrt((y - 0.5) * (y - 0.5) + 0.004) * 1.7) * uAmp * uReact;
    float beat = uBeat * uReact;
    float env = pow(sin(3.14159265 * clamp(y, 0.0, 1.0)), 1.4);       // a végein sötétbe fut
    vec3 sum = vec3(0.0);
    float yt = 1.0 - px.y / H;                                         // 0 fent, 1 lent (képernyő)
    float colMix = 1.0 - smoothstep(uColFront - 0.18, uColFront, yt);
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
      vec3 spine; float veil;
      if (uStyle < 0.5) {
        // FÉNYSZALAG: lágy gerinc + egyoldalú selymes fátyol
        float lw = max(1.4, H * 0.0015) * (0.75 + 0.5 * bl) * depth * (1.0 + beat * 0.3);
        float core = exp(-(d * d) / (lw * lw)) / sqrt(depth);
        float hs = H * 0.005 * depth;
        float inner = exp(-(d * d) / (hs * hs)) * 0.22;
        float sheet = (exp(-(g * g) / (ws * ws)) * 0.32 + exp(-g / (ws * 0.25)) * 0.16) * smoothstep(-lw * 3.0, lw * 3.0, d * dir);
        spine = vec3(core * 0.95 + inner);
        veil = bloom + sheet;
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
        spine = glass;
        veil = inner + bloom + sheet;
      }
      // szín: a szalag árnyalata a palettából (a színhatár fentről lefelé fut); a gerinc világosabb marad, a fátyol színes
      vec3 pc = mix(uPalA[i], uPalB[i], colMix);
      vec3 c = spine * mix(pc, vec3(1.0), 0.5) + veil * pc;
      sum += c * bl * (1.0 - k * 0.2);
    }
    return sum * env * (1.0 - smoothstep(0.7, 1.3, xe - sh * env));   // fokozatos elhalványulás, nincs éles határ
  }
  void main() {
    vec2 px = gl_FragCoord.xy;
    vec3 l = (ribbons(px, -1.0) + ribbons(px, 1.0)) * uGain * (uStyle < 0.5 ? 0.75 : 1.0);
    float yt = 1.0 - gl_FragCoord.y / uRes.y;                         // 0 fent, 1 lent
    // felvillanás kattintáskor: a lefelé futó színhatár előtt fényes sáv, közben az egész kicsit felragyog, majd lecseng
    float f = uColFront;
    float band = exp(-pow((yt - f + 0.06) / 0.1, 2.0)) * (1.0 - smoothstep(1.0, 1.2, f));
    float glow = smoothstep(0.0, 0.1, f) * (1.0 - smoothstep(0.15, 1.2, f));
    l *= 1.0 + uFlash * (0.3 * glow + 0.9 * band);
    vec3 v = 1.0 - exp(-l * 1.1);                                    // lágy fénycsúcsok, nincs kiégés
    // középső fény (Patrik Figma-terve, Desktop – 7): függőleges „diamond” színátmenet a képernyő közepén.
    // Figmában 1440 × 1024-en: fél magassága 354 px, fél szélessége 40 px, középen 85%-os szürke, egyenletesen fut ki.
    // Képernyőmagassághoz mérve, így minden képarányon ugyanolyan; a pillek mögött van, így az üveg megtöri.
    if (uBeam > 0.001) {
      vec2 dd = abs(px - uRes * 0.5) / uRes.y / uBeamS;
      float tb = dd.y / 0.5 + dd.x / 0.0571;                            // L1 („diamond”) távolság, Figma-egységben
      v += vec3(0.85 * clamp(1.0 - tb / 0.692, 0.0, 1.0) * uBeam);
    }
    v += (hash(px + fract(uTime) * 61.0) - 0.5) / 255.0;              // dithering: nincs sávosodás a sötét átmenetekben
    gl_FragColor = vec4(max(v, 0.0), 1.0);
  }`;
