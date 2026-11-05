// Glass panel (jobb felső gomb): a Figma Glass effekt csúszkái + Forgás + Hullám beállítások
import { S, DEFAULTS } from './config.js';
import { canvas, U } from './scene.js';
import { WU } from './waves.js';
import { requestGeoRebuild } from './pills.js';
import { requestCardRebuild } from './project.js';
import { bevelOf } from './glassgeo.js';

const panel = document.getElementById('panel'), panelBtn = document.getElementById('panelBtn');
const CTL = ['ang', 'int', 'refr', 'depth', 'thick', 'rim', 'disp', 'frost', 'splay', 'spin', 'pjRoll', 'react', 'wlight', 'wpush', 'wshift', 'wspeed', 'surge'];
function applySettings() {
  U.uLightAng.value = S.ang;
  U.uLightInt.value = S.int / 100;
  U.uRefr.value = S.refr / 100;
  U.uDisp.value = S.disp / 100;
  U.uFrost.value = S.frost / 100;
  U.uSplay.value = S.splay / 100;
  U.uThick.value = bevelOf(S.depth / 100) / bevelOf(0.55);   // Depth 55-nél 1 (a megszokott törés)
  U.uRim.value = S.rim / 100;
  U.uGlowOn.value = S.glow ? 1 : 0;
  document.getElementById('c-glow').checked = S.glow;
  document.getElementById('c-pjtext').checked = S.pjTextStill;
  requestGeoRebuild();
  requestCardRebuild();                       // a projekt-kártyák (a galéria is) ugyanazt a peremet kapják
  document.getElementById('c-bpm').checked = S.bpmSync;
  WU.uStyle.value = S.wstyle;
  [0, 1].forEach(v => document.getElementById('ws-' + v).setAttribute('aria-pressed', String(S.wstyle === v)));
  [0, 1].forEach(v => document.getElementById('pm-' + v).setAttribute('aria-pressed', String(S.pjMode === v)));
  CTL.forEach(k => {
    const el = document.getElementById('c-' + k);
    el.value = S[k];
    el.nextElementSibling.textContent = k === 'ang' ? S[k] + '°' : (k === 'int' ? S[k] + '%' : S[k]);
  });
}
CTL.forEach(k => document.getElementById('c-' + k).addEventListener('input', e => { S[k] = +e.target.value; applySettings(); }));
document.getElementById('c-bpm').addEventListener('change', e => { S.bpmSync = e.target.checked; });
document.getElementById('c-glow').addEventListener('change', e => { S.glow = e.target.checked; applySettings(); });
document.getElementById('c-pjtext').addEventListener('change', e => { S.pjTextStill = e.target.checked; });   // kockánként olvassa, nem kell újraépíteni
[0, 1].forEach(v => document.getElementById('ws-' + v).addEventListener('click', () => { S.wstyle = v; applySettings(); }));
[0, 1].forEach(v => document.getElementById('pm-' + v).addEventListener('click', () => { S.pjMode = v; applySettings(); }));   // nyitott projektnél azonnal átépül
document.getElementById('reset').addEventListener('click', () => { Object.assign(S, DEFAULTS); applySettings(); });
// Másolás: az aktuális beállítások JSON-ként a vágólapra (ebből lesz az új DEFAULTS)
document.getElementById('copy').addEventListener('click', async e => {
  const btn = e.currentTarget, txt = JSON.stringify(S);
  try { await navigator.clipboard.writeText(txt); btn.textContent = 'Másolva'; }
  catch (_) { window.prompt('Másold ki és küldd el:', txt); }
  setTimeout(() => { btn.textContent = 'Másolás'; }, 1500);
});
panelBtn.addEventListener('click', () => {
  const open = panel.hidden;
  panel.hidden = !open; panelBtn.setAttribute('aria-expanded', String(open));
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { panel.hidden = true; panelBtn.setAttribute('aria-expanded', 'false'); panelBtn.focus(); } });
// a színpadra kattintás becsukja a panelt
canvas.addEventListener('pointerdown', () => {
  if (!panel.hidden) { panel.hidden = true; panelBtn.setAttribute('aria-expanded', 'false'); }
});
applySettings();
