/* Betöltő animáció
 *
 * 1. szakasz: a betöltő (4,5 s, a logó nem mozdul, nem változik a mérete)
 *    0      → 0,15 s  várakozás
 *    0,15   → 3,15 s  a körvonal kirajzolódik az alsó csúcstól, egyetlen vonalként
 *    3,15   → 3,75 s  a fehér kitöltés lentről felfelé, vízszintes határvonallal
 *    3,75   → 4,50 s  a kész logó kitart (a körvonal végig megmarad)
 *
 * 2. szakasz: átvezetés az oldalba (a POST értékek itt állíthatók)
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
    beam: 2.1, beamDur: 1.6,          // a fénycsóva a pillek megérkezése után alulról felnő, és fényt ad nekik
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

  loaderDone.then(() => {
    intro.classList.add('done');
    state.t2 = performance.now();

    const logoTop = document.getElementById('logoTop');
    const ui = [document.querySelector('.ui .row'), document.querySelector('.ui .bottom')].filter(Boolean);

    // 1) a logó a fejléc logójának helyére úszik és oda kicsinyedik (FLIP)
    const from = box.getBoundingClientRect();
    const to = logoTop.getBoundingClientRect();
    const k = to.width / from.width;
    const dx = to.left - from.left, dy = to.top - from.top;
    const swap = () => {
      logoTop.style.opacity = '1';
      intro.remove();
    };
    if (reduced) {
      box.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' });
      logoTop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
      logoTop.style.opacity = '1';
      setTimeout(() => intro.remove(), 420);
    } else {
      box.animate(
        [{ transform: 'translate(0, 0) scale(1)' }, { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(' + k + ')' }],
        { duration: POST.fly, easing: POST.flyEase, fill: 'forwards' });
      // a fejléc logója körvonal nélküli és --fg színű: menet közben ehhez igazodik
      lineSvg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: POST.fly * 0.8, easing: 'ease-out', fill: 'forwards' });
      fill.animate([{ fill: '#ffffff' }, { fill: getComputedStyle(logoTop).fill || '#ececee' }], { duration: POST.fly, fill: 'forwards' });
      setTimeout(swap, POST.fly);
    }

    // 2) a feliratok és a lejátszó
    setTimeout(() => {
      document.body.classList.remove('intro-on');
      ui.forEach(el => el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: POST.uiDur, easing: 'ease-out' }));
    }, reduced ? 300 : POST.ui);
  });
})();
