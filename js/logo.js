// Kis MP logó fent középen.
// A logó szárai a zenére rövidülnek, a saját 60°-os dőlésük mentén (a korábbi „MP Hangreaktív Logó” logikája)
// 1 = mély, 2 = közép, 3 = teljes hangerő, 4 = magas; csendben a teljes logó látszik
import { LOGO_PATHS } from './config.js';

const logoSvg = document.getElementById('logoTop');
logoSvg.setAttribute('viewBox', '-4 -4 343 164');
logoSvg.innerHTML = '<defs><g id="lgMp">' + LOGO_PATHS.map(d => '<path d="' + d + '"/>').join('') + '</g>' +
  '<clipPath id="lgFixed"><rect id="lgCut"/></clipPath><clipPath id="lgBelow"><rect id="lgBel"/></clipPath>' +
  [1, 2, 3, 4].map(i => '<clipPath id="lgC' + i + '"><polygon id="lgS' + i + '"/></clipPath>').join('') + '</defs>' +
  '<use href="#lgMp" clip-path="url(#lgFixed)"/><g clip-path="url(#lgBelow)">' +
  [1, 2, 3, 4].map(i => '<g id="lgB' + i + '"><use href="#lgMp" clip-path="url(#lgC' + i + ')"/></g>').join('') + '</g>';
export const updateLogo = (() => {
  const BASE = 93.28, YMIN = 35.8, YCUT = 20, K = 0.578, HMAX = BASE - YMIN;
  const gap = (x0, y0) => y => x0 - K * (y - y0);
  const g1 = gap(108.29, 16.96), g2 = gap(184.6, 16.97), g3 = gap(260.94, 16.95);
  const T = -60, B = 180, L = -60, RR = 420;
  const pts = a => a.map(p => p.map(n => n.toFixed(2)).join(',')).join(' ');
  const $ = id => document.getElementById(id);
  const set = (el, o) => { for (const k in o) el.setAttribute(k, o[k]); };
  set($('lgCut'), { x: L, y: T, width: RR - L, height: YCUT - T });
  set($('lgBel'), { x: L, y: YCUT - 0.6, width: RR - L, height: B - YCUT });
  const s0 = YCUT - 3;
  $('lgS1').setAttribute('points', pts([[L, s0], [g1(s0), s0], [g1(B), B], [L, B]]));
  $('lgS2').setAttribute('points', pts([[g1(s0), s0], [g2(s0), s0], [g2(B), B], [g1(B), B]]));
  $('lgS3').setAttribute('points', pts([[g2(s0), s0], [g3(s0), s0], [g3(B), B], [g2(B), B]]));
  $('lgS4').setAttribute('points', pts([[g3(s0), s0], [RR, s0], [RR, B], [g3(B), B]]));
  const V_LEAD = 113.6 - BASE, H3MAX = HMAX + V_LEAD;     // a V hegye mindig a leghosszabb marad
  const bars = [1, 2, 3, 4].map(i => $('lgB' + i));
  const move = (i, h) => bars[i].setAttribute('transform', 'translate(' + (K * h).toFixed(3) + ' ' + (-h).toFixed(3) + ')');
  const bands = [[30, 160], [160, 2200], [30, 11000], [2200, 11000]];
  const peak = [0.3, 0.3, 0.3, 0.3], lvl = [1, 1, 1, 1], FLOOR = [0.12, 0.08, 0.08, 0.04];
  return (freqArr, sampleRate, fftSize, active, sens) => {
    for (let i = 0; i < 4; i++) {
      let target = 1;
      if (active) {
        const hz = sampleRate / fftSize;
        const a = Math.max(1, Math.floor(bands[i][0] / hz)), b = Math.min(freqArr.length - 1, Math.ceil(bands[i][1] / hz));
        let sum = 0; for (let j = a; j <= b; j++) sum += freqArr[j];
        const v = sum / ((b - a + 1) * 255);
        peak[i] = Math.max(v, peak[i] * 0.996, FLOOR[i]);              // sávonkénti automatikus erősítés
        target = Math.min(1, Math.max(0, Math.pow(v / peak[i], 1.8) * sens - 0.08));
      }
      lvl[i] += (target - lvl[i]) * (target > lvl[i] ? 0.55 : (active ? 0.12 : 0.08));
    }
    const h = [0, 1, 3].map(i => (1 - lvl[i]) * HMAX);
    move(0, h[0]); move(1, h[1]); move(3, h[2]);
    move(2, Math.min((1 - lvl[2]) * H3MAX, Math.min(...h) + V_LEAD));
  };
})();
