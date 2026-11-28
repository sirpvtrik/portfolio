// A sarokelemek becsúszása (Patrik: „a gombok a széleken oldalról csússzanak be, ha a pillek feljöttek”): a lejátszó
// balról, a névjegy és a nyelvváltó jobbról. A dobozokat CSS-transzformmal toljuk; az üvegüket a WebGL a DOM-helyükből
// rajzolja, így az is velük csúszik. A helyükre érve a transzformot levesszük: a transzform külön réteget képezne,
// és a gomb-ikonok difference keverése (lásd CLAUDE.md) csak a rétegen belül hatna.
import { uiSlide } from './entrance.js';

const items = [
  { el: document.getElementById('pl'), side: -1, lag: 0 },
  { el: document.getElementById('ct'), side: 1, lag: 0.08 },
  { el: document.getElementById('lg'), side: 1, lag: 0.04 },
].filter(o => o.el);

export function uiSlideUpdate() {
  items.forEach(o => {
    const e = uiSlide(o.lag);
    if (e >= 1) { if (o.on) { o.el.style.transform = ''; o.on = false; } return; }
    const dist = o.el.offsetWidth + 26 + 60;                    // a doboz + a sarok-margó + egy kis ráhagyás: teljesen kívül
    o.el.style.transform = `translateX(${(o.side * dist * (1 - e)).toFixed(2)}px)`;
    o.on = true;
  });
}
