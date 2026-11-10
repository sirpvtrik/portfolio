// Hullámok a két szélen: 2D shader (Fényszalag / Üveg / Folyékony stílus).
// Oldalanként egy-egy négyszögre rajzolunk, ami csak addig ér be a képbe, ameddig a hullám elérhet (uReachN): a képernyő
// többi részén a shader le sem fut (a régi, teljes képernyős változat minden képpontra mindkét oldalt kiszámolta).

// position = (u: 0 a szélen → 1 befelé, y: −1..1, oldal: −1 bal / +1 jobb)
export const waveVS = /* glsl */`
  uniform float uReachN;      // a négyszög szélessége NDC-ben (2 = a teljes képernyő)
  varying float vSide;
  void main() {
    vSide = position.z;
    gl_Position = vec4(position.z * (1.0 - position.x * uReachN), position.y, 0.0, 1.0);
  }`;

export const waveFS = /* glsl */`
  precision highp float;
  uniform float uTime, uAmp, uPush, uReact, uBeat, uGain, uFlowY, uStyle, uShift, uColFront, uRise, uFlash;
  uniform vec2 uCur[6];      // az egérfény nyomának pontjai (pixel, alulról)
  uniform float uCurE, uCurB; // a mozgás energiája (0 → 1) és a kurzor kis fénye (0 → 1)
  uniform vec2 uCurV;        // a kurzor (a rugós fej) sebessége, pixel/s: ettől nyúlik cseppé
  uniform vec3 uPalA[3], uPalB[3];   // régi és új paletta (szalagonként egy árnyalat); a front (0 → 1.2) fentről lefelé viszi át
  uniform vec2 uRes;
  uniform float uBands[6];
  uniform float uMid, uHigh;   // a közép- és a magas hangok szintje (0 → 1): ettől fodrozódik a folyékony szalag
  varying float vSide;
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

  // ---------- FOLYÉKONY (uStyle = 2; Patrik referenciája: csavarodó üvegszalag fekete háttéren) ----------
  // Oldalanként két szalag (elöl egy vastagabb, mögötte egy vékonyabb). Egy szalag a két széle (a, b) között fekszik; a
  // szélessége a csavarodással változik (ahol élére fordul, elvékonyodik). Sötét, átlátszó test, a két szélén hajszálvékony,
  // a hossza mentén fel-felerősödő fényes él, a testen ferdén végigvándorló, egyik oldalán éles szélű tükröződés.
  // Zene: a basszus kilengeti és megduzzasztja, a közép hangok végigfutó hullámokat, a magasak apró fodrokat és
  // csillanást adnak (zene nélkül sima, nyugodt üveg). Olcsó: képpontonként ~20 szögfüggvény, Newton-lépés nélkül.
  vec4 strand(float xe, float yy, float env, float Hs, float k, float sp, float beat, vec3 pal0, vec3 pal1) {
    float t = uTime + k * 4.3 + vSide * 1.9;
    float mid = uMid * uReact, high = uHigh * uReact;
    // középvonal: lassú, nagy ívek (a basszus kilengeti) + a hangsávok helyi kidomborodása + végigfutó hullámok
    float sway = sin(yy * (3.1 - k * 0.9) + t * 0.33 + k * 2.0) * 0.042 + sin(yy * 1.7 - t * 0.21 + k) * 0.02;
    float run = sin(yy * 10.5 - t * 1.9 + k * 1.3) * 0.0055 * (0.3 + mid * 5.0 + sp * 3.0);
    float c = 0.088 + k * 0.03 + uPush * 0.11 + sway * (1.0 + beat * 1.1) + sp * 0.03 + run;
    float over = max(c - 0.19, 0.0);
    c += shiftH() - over * over / (over + 0.06);                       // lágy korlát: a hatósugáron (a négyszögön) belül marad
    // csavarodás: a szalag lapja lassan körbefordul
    float tw = yy * (2.4 + k * 0.7) + t * 0.19 + sin(yy * 1.15 - t * 0.13 + k * 3.0) * 1.3;
    float ct = cos(tw);
    float w = (0.009 + (0.05 - k * 0.028) * (0.08 + 0.92 * ct * ct)) * (1.0 + beat * 0.45 + sp * 0.5);
    // fodrok a két szélen (külön fázissal): a magas hangokra
    float rp = 0.0012 * (0.12 + high * 9.0 + mid * 2.5 + sp * 3.0);
    float a = env * (c - w + sin(yy * 31.0 - t * 3.3 + k) * rp);
    float b = env * (c + w + sin(yy * 27.0 + t * 2.9 + k * 2.0) * rp);
    float sl = dFdy(a + b) * 0.5 * Hs;                                 // a szalag dőlése (a képernyő-deriváltból)
    float inv = Hs / sqrt(1.0 + sl * sl);
    float da = (xe - a) * inv, db = (b - xe) * inv;                    // távolság a két széltől, pixelben (belül pozitív)
    float inside = smoothstep(-0.8, 0.8, da) * smoothstep(-0.8, 0.8, db);
    float wpx = max((b - a) * inv, 1.0);
    float u = clamp((da - db) / wpx, -1.0, 1.0);                       // −1 az egyik szél, +1 a másik
    float nz = sqrt(1.0 - u * u);
    // a test: a tükröződés a keresztmetszet szögével és a csavarodással vándorol (ferde fénycsíkok)
    float psi = asin(u) + sin(tw * 0.5 + k) * 1.1;
    float sheet = smoothstep(-0.05, 0.0, psi - 0.15) * (1.0 - smoothstep(0.15, 1.0, psi)) * 0.42   // egyik szélén éles, a másikon lágyan elfogy
                + exp(-pow((psi + 0.75) / 0.32, 2.0)) * 0.09;
    float rim = pow(1.0 - nz, 3.0);
    float fold = pow(1.0 - ct * ct, 5.0) * 0.5 * nz;                    // ahol élére fordul, fényes ékké szűkül
    float body = (0.012 + sheet * (0.35 + 0.65 * nz) + rim * 0.1 + fold) * inside;
    // hajszálvékony fényes élek, a hossz mentén fel-felerősödve (a magas hangokra csillannak)
    float lw = max(1.1, Hs * 0.0013);
    float ma = 0.18 + 0.82 * pow(0.5 + 0.5 * sin(yy * 2.3 - t * 0.5 + k * 1.7), 2.0);
    float mb = 0.18 + 0.82 * pow(0.5 + 0.5 * sin(yy * 1.9 + t * 0.41 + k * 2.9 + 2.0), 2.0);
    float wa = lw * (0.7 + 1.5 * ma), wb = lw * (0.7 + 1.5 * mb);      // ahol fényesebb, ott vastagabb is
    float la = exp(-(da * da) / (wa * wa)) * ma, lb = exp(-(db * db) / (wb * wb)) * mb;
    // az él fénye befelé lágyan a testbe fut (mint a referencián), kifelé élesen véget ér
    float bleed = (exp(-max(da, 0.0) / (wpx * 0.2)) * ma + exp(-max(db, 0.0) / (wpx * 0.2)) * mb) * 0.26 * inside;
    float lines = (la + lb) * (1.0 + high * 1.2 + beat * 0.4) + bleed;
    // halvány fényudvar az élek körül
    float gs = Hs * 0.02;
    float glow = (exp(-abs(da) / gs) * ma + exp(-abs(db) / gs) * mb) * 0.05;
    float dim = 1.0 - k * 0.45;                                        // a hátsó szalag halványabb
    vec3 col = (lines * mix(pal0, vec3(1.0), 0.55) + (body + glow) * pal1) * dim;
    return vec4(col, inside);
  }
  vec3 liquid(vec2 px, float side) {
    float H = uRes.y, Hs = min(H, uRes.x * 1.6);                       // álló képernyőn a szélességhez mér (nem ér a közepéig)
    float y = px.y / H + uRise;
    float xe = (side < 0.0 ? px.x : uRes.x - px.x) / Hs;
    float env = pow(sin(3.14159265 * clamp(y, 0.0, 1.0)), 1.1);       // a végei a sarkokba futnak
    float yy = y * H / Hs + uFlowY;                                    // a hossz mentén (a minta a basszusra lefelé csúszik)
    float sp = specAt(0.03 + sqrt((y - 0.5) * (y - 0.5) + 0.004) * 1.7) * uAmp * uReact;
    float beat = uBeat * uReact;
    float yt = 1.0 - px.y / H;
    float colMix = 1.0 - smoothstep(uColFront - 0.18, uColFront, yt);
    vec3 p0 = mix(uPalA[0], uPalB[0], colMix), p1 = mix(uPalA[1], uPalB[1], colMix), p2 = mix(uPalA[2], uPalB[2], colMix);
    vec4 back = strand(xe, yy, env, Hs, 1.0, sp, beat, p1, p2);
    vec4 front = strand(xe, yy, env, Hs, 0.0, sp, beat, p0, p1);
    vec3 sum = back.rgb * (1.0 - front.a * 0.8) + front.rgb;          // az elülső szalag teste eltakarja a hátsót
    return sum * smoothstep(0.0, 0.25, env) * (1.0 - smoothstep(0.34, 0.40, xe - shiftH()));
  }
  void main() {
    vec2 px = gl_FragCoord.xy;
    vec3 l = (uStyle > 1.5 ? liquid(px, vSide) * 1.25 : ribbons(px, vSide) * (uStyle < 0.5 ? 0.75 : 1.0)) * uGain;
    float yt = 1.0 - gl_FragCoord.y / uRes.y;                         // 0 fent, 1 lent
    // felvillanás kattintáskor: a lefelé futó színhatár előtt fényes sáv, közben az egész kicsit felragyog, majd lecseng
    float f = uColFront;
    float band = exp(-pow((yt - f + 0.06) / 0.1, 2.0)) * (1.0 - smoothstep(1.0, 1.2, f));
    float glow = smoothstep(0.0, 0.1, f) * (1.0 - smoothstep(0.15, 1.2, f));
    l *= 1.0 + uFlash * (0.3 * glow + 0.9 * band);
    vec3 v = 1.0 - exp(-l * 1.1);                                    // lágy fénycsúcsok, nincs kiégés
    // a kurzort már nem itt rajzoljuk: saját, legfelső rétegen van (js/cursor.js), hogy ne kerüljön semmi mögé
    v += (hash(px + fract(uTime) * 61.0) - 0.5) / 255.0;              // dithering: nincs sávosodás a sötét átmenetekben
    gl_FragColor = vec4(max(v, 0.0), 1.0);
  }`;
