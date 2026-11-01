// Projekt-aloldal: pillre kattintva a többi pill leesik, és sorban megjelennek a kártyák.
// Görgetéskor a sorok domborúak (középen nagyobbak, fent és lent kisebbek, mint egy dob),
// a galéria a képernyő közepére ragad: amíg a végére nem ért, a görgetés jobbra lapozza (egy síkban),
// utána a lap megy tovább. A kártyák üvegét a cardglass.js rajzolja WebGL-ben (a pillekével azonos jellegű).
import { reduced, DETAIL_TEST } from './config.js';
import { onSelect, restorePills } from './pills.js';
import { setWavesCentered } from './waves.js';
import { setGlassCards, updateCardGlass } from './cardglass.js';
import { damp } from './util.js';

const root = document.getElementById('project');
const scroller = document.getElementById('pjScroll');
const grid = document.getElementById('pjGrid');
const backBtn = document.getElementById('projectBack');

export let isOpen = false;
let rows = [], gal = null, pin = null, r3 = null, items = [], closing = 0;
let galOff = 0, galShown = 0, travel = 0, stickTop = 0;

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

  r3 = el('div', 'pj-row r3');
  pin = el('div', 'pj-pin');                                      // a galéria ebben ragad középre; a magassága = a forgatás útja
  gal = el('div', 'pj-gallery');
  const pics = d.gallery.length ? d.gallery : [null, null, null, null];
  items = [];
  pics.forEach((src, k) => {                                      // minden kép egyszer (nincs ismétlés)
    const it = el('div', 'gal-item'), card = el('div', 'card anim gal-card'), media = el('div', 'gal-media');
    card.style.setProperty('--i', 4 + Math.min(k, 3));
    if (src) { const im = new Image(); im.src = src; im.alt = ''; im.decoding = 'async'; media.append(im); }
    else media.classList.add('ph');                                 // helyőrző, amíg nincs kép
    card.append(media); it.append(card); gal.append(it); items.push(it);
  });
  r3.append(gal); pin.append(r3);
  grid.append(r1, r2, pin);
  rows = [r1, r2, r3];
  setGlassCards([imgA, intro, text, imgB], items.map(it => it.firstChild), gal);
}

/* ---------- Nyitás / zárás ---------- */
function open() {
  build(DETAIL_TEST);
  isOpen = true; closing = 0;
  galOff = galShown = 0;
  root.hidden = false;
  scroller.scrollTop = 0;
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

/* ---------- Kockánkénti frissítés: domború sorok, hengeres galéria ---------- */
let W = 900, cardW = 325, gap = 20;
function layout() {
  if (!gal) return;
  W = gal.clientWidth;
  const first = items[0];
  cardW = first ? first.offsetWidth : 325;
  gap = W * 20 / 900;
  // ragadás: a galéria a képernyő közepén áll meg; az itt eltöltött görgetési út = amíg az utolsó kártya be nem ér
  travel = Math.max(0, items.length * (cardW + gap) - gap - W);
  stickTop = Math.max(0, (scroller.clientHeight - r3.offsetHeight) / 2);
  r3.style.top = stickTop + 'px';
  pin.style.height = (r3.offsetHeight + travel) + 'px';
}
window.addEventListener('resize', layout);

export function updateProject(dt) {
  updateCardGlass(isOpen);
  if (!isOpen) return;
  // domború sorok: a képernyő közepén a legnagyobbak, felé és lefelé kisebbek és hátradőlnek
  const vh = scroller.clientHeight, top = scroller.scrollTop, sTop = scroller.getBoundingClientRect().top;
  for (const r of rows) {
    const b = r.getBoundingClientRect(), c = b.top + b.height / 2 - sTop;   // a ragadó galériánál is a valódi helyzet
    const d = Math.max(-1, Math.min(1, (c - vh / 2) / (vh / 2 + r.offsetHeight / 2)));
    r.style.transform = 'perspective(1400px) rotateX(' + (-d * 16).toFixed(2) + 'deg) scale(' + (1 - 0.14 * d * d).toFixed(4) + ')';
  }
  // galéria: amíg középre ragadva áll, a görgetés jobbra lapozza (a sor balra csúszik), a végén a lap megy tovább
  const prog = travel > 0 ? Math.max(0, Math.min(1, (top - (pin.offsetTop - stickTop)) / travel)) : 0;
  galOff = prog * travel;
  galShown = damp(galShown, galOff, reduced ? 30 : 12, dt);
  const p = cardW + gap;
  items.forEach((it, i) => { it.style.transform = 'translate3d(' + (i * p - galShown).toFixed(1) + 'px,0,0)'; });
}
