/* Betöltő animáció
 *
 * 1. szakasz: a betöltő (4,5 s, a logó nem mozdul, nem változik a mérete)
 *    0      → 0,15 s  várakozás
 *    0,15   → 3,15 s  a körvonal kirajzolódik az alsó csúcstól, egyetlen vonalként
 *    3,15   → 3,75 s  a fehér kitöltés lentről felfelé, vízszintes határvonallal
 *    3,75   → 4,50 s  a kész logó kitart (a körvonal végig megmarad)
 *
 * 2. szakasz: hero (ha be van kapcsolva): a logó középen marad, fényt vet a szövegre (js/hero.js); görgetésre tovább.
 * 3. szakasz: átvezetés az oldalba (a POST értékek itt állíthatók)
 *    a logó felúszik a fejléc helyére; közben a hullámokkal együtt alulról felúsznak a pillek, végül jön a felület.
 *    A hullámokat, a pilleket és a lejátszó-blobot a WebGL rajzolja: a js/entrance.js a window.MPIntro.t2 időponthoz méri magát.
 */
(() => {
  'use strict';

  const LOADER = {
    wait: 150,
    line: 3000, lineEase: 'cubic-bezier(0.42, 0, 0.22, 1)',
    fill: 600,  fillEase: 'cubic-bezier(0.30, 0, 0.20, 1)',
    hold: 750,
  };
  const POST = {
    fly: 900, flyEase: 'cubic-bezier(0.65, 0, 0.35, 1)',   // a logó felúszik a fejlécbe
    ui: 1800, uiDur: 600,                                    // a sarkokban lévő feliratok és a lejátszó
    // a js/entrance.js ezeket olvassa (másodpercben):
    // a pillek és a két szélső hullám együtt, azonos sebességgel indulnak alulról; a hullám előbb ér a helyére,
    // a pill tovább fut, mert messzebbről jön (fentebb ér véget). Távolság képernyőmagasságban.
    rise: 0.45,                       // indulás a betöltő vége után
    wavesDist: 0.6, wavesDur: 1.3,    // a hullámok ennyivel lejjebbről úsznak fel, ennyi idő alatt
    wavesFade: 0.5,                   // közben ennyi idő alatt halványodnak be
    pillsDist: 1.0,                   // a pillek egy teljes képernyőnyivel lejjebbről (az idejük ebből és a hullámok sebességéből adódik)
    pillsStagger: 0,                  // >0: a pillek felülről lefelé, ennyi késéssel egymás után
  };

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const intro = document.getElementById('intro');
  const box = document.getElementById('introLogo');
  const fill = document.getElementById('introFill');
  const line = document.getElementById('introLine');
  const lineSvg = line.ownerSVGElement;

  const state = { t2: null, post: POST, reduced };
  window.MPIntro = state;

  const t1 = LOADER.wait, t2 = t1 + LOADER.line, t3 = t2 + LOADER.fill, total = t3 + LOADER.hold;

  // körvonal: a szaggatás pontosan a vonal hossza → a dashoffset hossz → 0 rajzolja ki
  const len = line.getTotalLength();
  line.style.strokeDasharray = len + ' ' + len;
  line.style.strokeDashoffset = len;
  const lineAnim = line.animate(
    [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
    { duration: LOADER.line, delay: t1, easing: LOADER.lineEase, fill: 'forwards' });

  // kitöltés: a viewBox peremét levonva a határvonal pontosan az alsó csúcsnál indul és a logó tetején ér véget
  const VB_Y = -4, VB_H = 164, TOP = 0, BOTTOM = 155.11;
  const pct = y => ((y - VB_Y) / VB_H * 100).toFixed(3) + '%';
  fill.animate(
    [{ clipPath: 'inset(' + pct(BOTTOM) + ' 0 0 0)' }, { clipPath: 'inset(' + pct(TOP) + ' 0 0 0)' }],
    { duration: LOADER.fill, delay: t2, easing: LOADER.fillEase, fill: 'forwards' });

  // a körvonal végétől számolva: kitöltés + kitartás
  const loaderDone = lineAnim.finished.then(() => new Promise(r => setTimeout(r, total - t2)));

  // Hero (Patrik, Figma: Desktop – 22, node 296-12): a betöltő után a logó középen marad (kicsinyítve), mint egy lámpa,
  // és fényt vet a „DARKNESS IS MY BRIGHTNESS” szövegre (js/hero.js). A pillek és a hullámok csak a hero elhagyásakor
  // úsznak fel: a t2 (a js/entrance.js időpontja) ekkor indul. Kikapcsolható a Glass panelen („Hero (teszt)”, localStorage).
  let heroPref = true;
  try { heroPref = localStorage.getItem('mpHero') !== '0'; } catch (_) {}
  state.hero = heroPref;          // a hero.js felülírhatja
  state.heroOn = false;           // a hero épp látszik (a kurzor ilyenkor is látszik)
  // a hero-ban a logó a betöltő méretében marad (Patrik: „ne menjen össze, csak kattintásra”; a Figmában 97 px volt)

  loaderDone.then(() => {
    intro.classList.add('done');
    const logoTop = document.getElementById('logoTop');
    const ui = [document.querySelector('.ui .row'), document.querySelector('.ui .bottom')].filter(Boolean);
    const from = box.getBoundingClientRect();                        // a doboz természetes helye (még nincs rajta transzformáció)
    const heroT = 'translate(0px, 0px) scale(1)';
    const headT = () => {                                            // a fejléc logójának helye (FLIP)
      const to = logoTop.getBoundingClientRect(), k = to.width / from.width;
      return 'translate(' + (to.left - from.left) + 'px, ' + (to.top - from.top) + 'px) scale(' + k + ')';
    };
    const curT = () => getComputedStyle(box).transform;
    const toFg = () => getComputedStyle(logoTop).fill || '#ececee';
    let first = true;

    // a logó a fejléc helyére úszik, majd átadja a helyét a fejléc logójának (első alkalommal: belépés a pillekhez)
    function out() {
      state.heroOn = false;
      if (first) state.t2 = performance.now();
      if (reduced) {
        box.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' });
        document.body.classList.remove('hero-on');
        logoTop.style.opacity = '1';
        setTimeout(() => { intro.style.visibility = 'hidden'; }, 420);
      } else {
        box.animate([{ transform: curT() }, { transform: headT() }], { duration: POST.fly, easing: POST.flyEase, fill: 'forwards' });
        lineSvg.animate([{ opacity: getComputedStyle(lineSvg).opacity }, { opacity: 0 }], { duration: POST.fly * 0.8, easing: 'ease-out', fill: 'forwards' });
        fill.animate([{ fill: '#ffffff' }, { fill: toFg() }], { duration: POST.fly, fill: 'forwards' });
        setTimeout(() => { if (!state.heroOn) { document.body.classList.remove('hero-on'); logoTop.style.opacity = '1'; intro.style.visibility = 'hidden'; } }, POST.fly);
      }
      // a feliratok és a lejátszó
      setTimeout(() => {
        if (state.heroOn) return;
        document.body.classList.remove('intro-on', 'hero-on');
        ui.forEach(el => el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: POST.uiDur, easing: 'ease-out' }));
      }, reduced ? 300 : (first ? POST.ui : POST.fly * 0.6));
      first = false;
    }
    // vissza a hero-ba (a fejléc logójára kattintva, js/hero.js): a logó a fejlécből visszaúszik középre
    function back() {
      state.heroOn = true;
      document.body.classList.add('hero-on');
      intro.style.visibility = 'visible';
      logoTop.style.opacity = '0';
      box.animate([{ transform: headT(), opacity: 1 }, { transform: heroT, opacity: 1 }], { duration: reduced ? 1 : POST.fly, easing: POST.flyEase, fill: 'forwards' });
      fill.animate([{ fill: toFg() }, { fill: '#ffffff' }], { duration: reduced ? 1 : POST.fly, fill: 'forwards' });
    }
    state.heroOut = () => { if (state.heroOn) out(); };
    state.heroBack = () => { if (!state.heroOn && !first) back(); };
    // a lámpa (a logó) közepe a képernyőn, CSS-pixelben
    state.heroLamp = () => { const r = box.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.45, cy: r.top + r.height / 2, w: r.width }; };

    if (state.hero) {
      // hero: a logó a helyén marad, a körvonal elhalványul; a fényt a hero.js kapcsolja fel
      state.heroOn = true;
      state.heroUsed = true;          // a pillek ezután felvilágítva lépnek be, nem alulról úsznak fel (js/entrance.js)
      state.heroAt = performance.now();
      document.body.classList.add('hero-on');
      lineSvg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, easing: 'ease-out', fill: 'forwards' });
    } else out();
  });
})();
