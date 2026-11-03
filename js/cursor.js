// Egérfény: a kurzor egy kis fénypont, mozgás közben mögötte folyékony fény nyúlik és erősödik,
// megállva elsötétül (csak a kis fénypont marad). A hullám-shaderbe kerül, a pillek mögé: az üveg megtöri.
// A nyom 6 pontja rugóval követi egymást (az első a kurzort, a többi az előzőt): ettől folyékony, nyúlós.
// Érintőképernyőn: húzás / görgetés közben az ujjat követi, elengedve elhalványul (a kis fénypont is).
import { WU } from './waves.js';
import { damp } from './util.js';

const N = 6;
const pts = Array.from({ length: N }, () => ({ x: -9999, y: -9999, vx: 0, vy: 0 }));
let tx = -9999, ty = -9999, inside = false, seen = false, isTouch = false, touching = false;
let energy = 0, base = 0, lastX = 0, lastY = 0, speed = 0;

function move(e) {
  isTouch = e.pointerType === 'touch';
  tx = e.clientX; ty = e.clientY;
  if (!seen) { pts.forEach(p => { p.x = tx; p.y = ty; }); lastX = tx; lastY = ty; seen = true; }
  inside = true;
}
window.addEventListener('pointermove', move, { passive: true });
window.addEventListener('pointerdown', e => { move(e); if (e.pointerType === 'touch') touching = true; }, { passive: true });
window.addEventListener('pointerup', e => { if (e.pointerType === 'touch') touching = false; }, { passive: true });
window.addEventListener('pointercancel', () => { touching = false; }, { passive: true });
document.addEventListener('pointerleave', () => { inside = false; });
document.documentElement.addEventListener('mouseleave', () => { inside = false; });

export function updateCursor(dt) {
  if (!seen) return;
  // mozgás sebessége (px/s), simítva → energia: gyorsan felfut, lassan (~1 s alatt) lecseng, ha megáll
  const d = Math.hypot(tx - lastX, ty - lastY);
  lastX = tx; lastY = ty;
  speed = damp(speed, d / Math.max(dt, 1e-3), 10, dt);
  const target = Math.min(1, speed / 1400);
  energy = damp(energy, target, target > energy ? 6 : 1.1, dt);
  // a kurzor kis fénye: egérrel mindig látszik (ha az ablakban van), érintésnél csak húzás közben
  base = damp(base, (isTouch ? touching : inside) ? 1 : 0, 4, dt);
  // rugós nyom: az első pont a kurzort, a többi az előzőt követi, egyre lazábban
  const H = innerHeight, dpr = WU.uRes.value.y / H;
  for (let i = 0; i < N; i++) {
    const p = pts[i], q = i === 0 ? { x: tx, y: ty } : pts[i - 1];
    const k = i === 0 ? 260 : 150 - i * 14, c = i === 0 ? 26 : 17;
    p.vx += ((q.x - p.x) * k - p.vx * c) * dt;
    p.vy += ((q.y - p.y) * k - p.vy * c) * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    WU.uCur.value[i].set(p.x * dpr, (H - p.y) * dpr);           // a shader pixelben, alulról mér
  }
  WU.uCurE.value = energy;
  WU.uCurB.value = base;
}
