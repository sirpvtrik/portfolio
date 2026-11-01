// Projekt-aloldal: pillre kattintva a többi pill leesik, és sorban megjelennek a kártyák.
// Görgetéskor a sorok domborúak (középen nagyobbak, fent és lent kisebbek, mint egy dob),
// a galéria pedig jobbra halad, végtelenül ismétlődik, és a széleken hengerként begörbül.
import { reduced, DETAIL_TEST } from './config.js';
import { onSelect, restorePills } from './pills.js';
import { setWavesCentered } from './waves.js';
import { damp } from './util.js';

const root = document.getElementById('project');
const scroller = document.getElementById('pjScroll');
const grid = document.getElementById('pjGrid');
const backBtn = document.getElementById('projectBack');

export let isOpen = false;
let rows = [], gal = null, items = [], closing = 0;
let galOff = 0, galShown = 0, lastTop = 0;

/* ---------- Felépítés ---------- */
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.textContent = html; return e; };
function build(d) {
  grid.textContent = '';
  // megjelenési sorrend (a rajz nyila szerint): bal felső → jobb felső → jobb középső → bal középső → galéria balról jobbra
  const r1 = el('div', 'pj-row r1'), r2 = el('div', 'pj-row r2');
  const imgA = el('div', 'card anim c-img a1'); imgA.style.setProperty('--i', 0);
  const intro = el('div', 'card anim c-intro');  intro.style.setProperty('--i', 1);
  intro.append(el('span', 'pj-label', d.label), el('p', 'pj-big', d.intro));
  const imgB = el('div', 'card anim c-img a2'); imgB.style.setProperty('--i', 2);
  const text = el('div', 'card anim c-text');   text.style.setProperty('--i', 3);
  text.append(el('p', 'pj-text', d.text));
  r1.append(imgA, intro); r2.append(text, imgB);

  const r3 = el('div', 'pj-row r3');
  gal = el('div', 'pj-gallery');
  const pics = d.gallery.length ? d.gallery : [null, null, null, null];
  items = [];
  for (let k = 0; k < 8; k++) {                                   // elég elem a végtelen körhöz (képek ismétlődnek)
    const it = el('div', 'gal-item'), card = el('div', 'card anim gal-card');
    card.style.setProperty('--i', 4 + Math.min(k, 3));
    const src = pics[k % pics.length];
    if (src) { const im = new Image(); im.src = src; im.alt = ''; im.decoding = 'async'; card.append(im); }
    else card.classList.add('ph');                                  // helyőrző, amíg nincs kép
    it.append(card); gal.append(it); items.push(it);
  }
  r3.append(gal);
  grid.append(r1, r2, r3);
  rows = [r1, r2, r3];
}

/* ---------- Nyitás / zárás ---------- */
function open() {
  build(DETAIL_TEST);
  isOpen = true; closing = 0;
  galOff = galShown = 0;
  root.hidden = false;
  scroller.scrollTop = 0; lastTop = 0;
  document.body.classList.add('project-open');
  setWavesCentered(false);                                        // a hullámok kiúsznak a szélekre, hogy ne zavarják a szöveget
  layout();
  // a pillek leesése után indul a kártyák megjelenése
  setTimeout(() => { if (isOpen) root.classList.add('show'); }, reduced ? 0 : 380);
  setTimeout(() => backBtn.focus({ preventScroll: true }), 400);
}
function close() {
  if (!isOpen || closing) return;
  closing = 1;
  root.classList.remove('show');
  root.classList.add('hide');
  setTimeout(() => {
    isOpen = false; closing = 0;
    root.hidden = true; root.classList.remove('hide');
    document.body.classList.remove('project-open');
    setWavesCentered(true);
    restorePills();
  }, reduced ? 0 : 420);
}
onSelect(open);
backBtn.addEventListener('click', close);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) close(); });

/* ---------- Görgetés → galéria ---------- */
scroller.addEventListener('scroll', () => {
  const t = scroller.scrollTop;
  galOff += (t - lastTop) * 0.9;                                  // lefelé görgetve jobbra megy
  lastTop = t;
});
// a lap tetején / alján is tovább görgethető a galéria (végtelen)
scroller.addEventListener('wheel', e => {
  const k = e.deltaMode === 1 ? 32 : (e.deltaMode === 2 ? 400 : 1);
  const atTop = scroller.scrollTop <= 0, atEnd = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
  if ((atTop && e.deltaY < 0) || (atEnd && e.deltaY > 0)) galOff += e.deltaY * k * 0.9;
}, { passive: true });

/* ---------- Kockánkénti frissítés: domború sorok, hengeres galéria ---------- */
let W = 900, cardW = 325, gap = 20, R = 324, flatR = 648;
function layout() {
  if (!gal) return;
  W = gal.clientWidth;
  const first = items[0];
  cardW = first ? first.offsetWidth : 325;
  gap = W * 20 / 900;
  R = Math.max(120, W * 0.36);                                    // a henger sugara (az utolsó, ki nem férő kártya erre görbül)
  flatR = W * 0.72;                                               // eddig sík a sor (a terv harmadik kártyája már görbül)
}
window.addEventListener('resize', layout);

export function updateProject(dt) {
  if (!isOpen) return;
  // domború sorok: a képernyő közepén a legnagyobbak, felé és lefelé kisebbek és hátradőlnek
  const vh = scroller.clientHeight, top = scroller.scrollTop;
  for (const r of rows) {
    const c = r.offsetTop + r.offsetHeight / 2 - top;
    const d = Math.max(-1, Math.min(1, (c - vh / 2) / (vh / 2 + r.offsetHeight / 2)));
    r.style.transform = 'perspective(1400px) rotateX(' + (-d * 16).toFixed(2) + 'deg) scale(' + (1 - 0.14 * d * d).toFixed(4) + ')';
  }
  // galéria: végtelen sor, a széleken hengerre tekeredik
  galShown = damp(galShown, galOff, reduced ? 30 : 8, dt);
  const p = cardW + gap, n = items.length, total = n * p, lead = R + p;
  const flatL = cardW / 2;                                        // a bal szélen kifelé görbül (onnan jönnek be)
  items.forEach((it, i) => {
    const x = (((i * p + galShown + lead) % total) + total) % total - lead;   // a kártya bal széle
    const c = x + cardW / 2;
    let X = c, Z = 0, th = 0;
    if (c > flatR) { th = (c - flatR) / R; X = flatR + R * Math.sin(Math.min(th, Math.PI / 2)); Z = -R * (1 - Math.cos(Math.min(th, Math.PI / 2))); }
    else if (c < flatL) { th = -(flatL - c) / R; X = flatL + R * Math.sin(Math.max(th, -Math.PI / 2)); Z = -R * (1 - Math.cos(Math.max(th, -Math.PI / 2))); }
    const a = Math.abs(th);
    it.style.transform = 'translate3d(' + (X - cardW / 2).toFixed(1) + 'px,0,' + Z.toFixed(1) + 'px) rotateY(' + (th * 57.2958).toFixed(2) + 'deg)';
    it.style.opacity = Math.max(0, Math.min(1, (1.45 - a) / 0.35)).toFixed(3);   // a henger hátoldalán eltűnik
    it.style.visibility = a > 1.45 ? 'hidden' : 'visible';
  });
}
