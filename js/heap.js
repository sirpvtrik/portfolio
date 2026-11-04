// A projekt alján a leesett pillek halomban (Patrik ötlete): aki végiggörgeti a projektet, ott látja őket egymáson,
// hegyükre-hátukra esve. Minden nyitáskor máshogy (véletlen helyről, szögben, pörgéssel esnek le), amikor a halom
// helye a képbe ér. A képernyő síkjában 2D fizika (Matter.js, js/vendor/, csak az első projektnyitáskor töltődik be);
// a pill alakja pontosan a stadion (lekerekített téglalap, a sarok sugara a magasság fele).
// Itt nem forognak; a hover ugyanúgy kinyitja a projektképet, és a pillek húzhatók, dobhatók.
// A torony pilljeit (pills.js) mozgatja, amíg a projekt nyitva van (mode 'away'); a kiválasztott pill nincs a halomban.
import { PW, PH } from './config.js';
import { pills, stack, selectedIndex, mode } from './pills.js';
import { camera } from './scene.js';
import { damp } from './util.js';

/* ---------- Matter.js betöltése (egyszer, az első projektnyitáskor) ---------- */
let loading = false;
export function preloadHeap() {
  if (window.Matter || loading) return;
  loading = true;
  const sc = document.createElement('script');
  sc.src = 'js/vendor/matter.min.js';
  sc.onerror = () => { loading = false; };
  document.head.appendChild(sc);
}

const STEP = 1000 / 120;                   // ms: fix lépés (két lépés kockánként), így minden gépen ugyanúgy esnek
const HEAP_Z = 0.4;                        // kicsit a kártyák előtt: esés közben a galéria előtt hullanak el

let engine = null, bodies = [], cfg = null, spawned = false, acc = 0, a = 0;
let drag = null, hovered = -1, pageV = 0, ptr = null;

// cfg: { floor, width, k, vh, vw, pillW } (oldal-pixelben: x a képernyő közepétől, y a lap tetejétől)
// ha a méretek nem változtak (pl. a Depth csúszka építi újra a kártyákat), a halom marad; átméretezéskor újra lehullanak
export function setupHeap(c) {
  if (cfg && c.width === cfg.width && c.floor === cfg.floor && c.pillW === cfg.pillW && c.vw === cfg.vw && c.vh === cfg.vh) return;
  resetHeap();
  cfg = c;
}
export function resetHeap() {
  if (engine) { window.Matter.Engine.clear(engine); window.Matter.Composite.clear(engine.world, false); }
  engine = null; bodies = []; spawned = false; drag = null; hovered = -1; acc = 0; a = 0; cfg = null;
}

function build() {
  const M = window.Matter, { floor, width, pillW } = cfg, pillH = pillW * PH / PW;
  engine = M.Engine.create({ gravity: { x: 0, y: 1, scale: 0.0024 }, positionIterations: 10, velocityIterations: 8, constraintIterations: 6 });
  const wall = { isStatic: true, friction: 0.5 };
  const T = 2000, H = 20000;
  M.Composite.add(engine.world, [
    M.Bodies.rectangle(0, floor + T / 2, width + 2 * T, T, wall),                       // padló
    M.Bodies.rectangle(-width / 2 - T / 2, floor - H / 2, T, H, wall),                 // bal fal (a képernyő széle)
    M.Bodies.rectangle(width / 2 + T / 2, floor - H / 2, T, H, wall),                  // jobb fal
  ]);
  // véletlen sorrendben, a kép fölül, egymás fölött lépcsőzve hullanak le, véletlen szögben és pörgéssel
  const list = pills.map((pl, i) => i).filter(i => i !== selectedIndex()).sort(() => Math.random() - 0.5);
  const top = pageV - pillH;
  list.forEach((i, n) => {
    const x = (Math.random() - 0.5) * (width - pillW);
    const y = top - n * pillH * 1.25 - Math.random() * pillH;
    const b = M.Bodies.rectangle(x, y, pillW, pillH, {
      chamfer: { radius: pillH * 0.499 }, friction: 0.35, frictionStatic: 0.7, restitution: 0.18,
      frictionAir: 0.012, density: 0.0012,
    });
    M.Body.setAngle(b, (Math.random() - 0.5) * 2.4);
    M.Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.16);
    M.Body.setVelocity(b, { x: (Math.random() - 0.5) * 3, y: Math.random() * 4 });
    b.plIndex = i; b.flip = 0;
    bodies.push(b);
  });
  M.Composite.add(engine.world, bodies);
  spawned = true;
}

/* ---------- Egér / érintés (a project.js #pjInput rétegéről) ---------- */
const toPage = e => ({ x: e.clientX - cfg.vw / 2, y: e.clientY + pageV });
function bodyAt(p) {
  if (!engine) return null;
  return window.Matter.Query.point(bodies, p)[0] || null;
}
// true: a halom kezeli (a lap ilyenkor nem görög)
export function heapPointer(kind, e) {
  if (!cfg) return false;
  if (kind === 'move' && e.pointerType !== 'touch') ptr = { x: e.clientX, y: e.clientY };
  if (kind === 'leave') { ptr = null; return false; }
  const M = window.Matter;
  if (kind === 'down') {
    const p = toPage(e), b = bodyAt(p);
    if (!b) return false;
    // feszes kötés: a megfogott pont gyors mozdulatnál is a kurzor alatt marad (a laza rugó lemaradt); közben a pill
    // kevésbé pörög (nagyobb légellenállás), elengedve visszaáll
    const c = M.Constraint.create({
      pointA: p, bodyB: b, pointB: { x: p.x - b.position.x, y: p.y - b.position.y },
      stiffness: 0.9, damping: 0.2, length: 0,
    });
    M.Composite.add(engine.world, c);
    drag = { c, b, client: { x: e.clientX, y: e.clientY }, air: b.frictionAir };
    b.frictionAir = 0.06;
    return true;
  }
  if (!drag) return false;
  if (kind === 'move') { drag.client = { x: e.clientX, y: e.clientY }; return true; }
  if (kind === 'up') {
    M.Composite.remove(engine.world, drag.c);
    drag.b.frictionAir = drag.air;
    const v = drag.b.velocity, s = Math.hypot(v.x, v.y), max = 45;             // dobás: túl nagy lendületet nem kap
    if (s > max) M.Body.setVelocity(drag.b, { x: v.x * max / s, y: v.y * max / s });
    drag = null;
    return true;
  }
  return false;
}
export const heapDragging = () => !!drag;

/* ---------- Kockánként (a project.js hívja): v = a lap görgetése pixelben, on = a projekt nyitva van ---------- */
export function updateHeap(dt, v, on) {
  pageV = v;
  if (!cfg || mode !== 'away') return;
  const M = window.Matter;
  if (!M) { preloadHeap(); return; }
  // akkor hullanak le, amikor a halom helye (a padló) a képbe ér
  if (!spawned && cfg.floor - v < cfg.vh + 40) build();
  if (!engine) { stack.visible = false; return; }

  if (drag) {                                       // a húzott pont az ujjat / egeret követi (görgetés közben is)
    drag.c.pointA = { x: drag.client.x - cfg.vw / 2, y: drag.client.y + v };
  }
  acc = Math.min(acc + dt * 1000, STEP * 6);
  while (acc >= STEP) { M.Engine.update(engine, STEP); acc -= STEP; }

  // hover: a kurzor alatti pill (húzás közben a húzott)
  let h = -1;
  if (drag) h = drag.b.plIndex;
  else if (ptr) { const b = bodyAt({ x: ptr.x - cfg.vw / 2, y: ptr.y + v }); if (b) h = b.plIndex; }
  hovered = h;

  a = damp(a, on ? 1 : 0, on ? 6 : 12, dt);
  stack.visible = a > 0.002;
  stack.position.set(0, 0, 0); stack.rotation.set(0, 0, 0); stack.scale.setScalar(1);
  // oldal-pixel → világ (a kamera perspektívája miatt a kicsit előrébb lévő síkon visszaszorozva)
  const k = cfg.k, pc = (camera.position.z - HEAP_Z) / camera.position.z, hs = cfg.pillW * k / PW;
  pills.forEach((pl, i) => { if (i === selectedIndex()) pl.holder.visible = false; });
  bodies.forEach(b => {
    const pl = pills[b.plIndex], isH = b.plIndex === hovered;
    pl.holder.visible = true;
    pl.hv = damp(pl.hv, isH ? 1 : 0, 6, dt);
    pl.mat.uniforms.uHover.value = pl.hv;
    pl.holder.position.set(b.position.x * k * pc, -(b.position.y - v - cfg.vh / 2) * k * pc, HEAP_Z + pl.hv * 0.15);
    // a stadion 180°-ra elforgatva ugyanaz az alak: ha fejjel lefelé állna, a pillt 180°-kal arrébb rajzoljuk, így a felirat
    // mindig olvasható (hiszterézissel, hogy az élére állt pill ne billegjen oda-vissza)
    let r = b.angle + b.flip;
    r -= Math.round(r / (2 * Math.PI)) * 2 * Math.PI;
    if (Math.abs(r) > 1.75) { b.flip += r > 0 ? -Math.PI : Math.PI; r += r > 0 ? -Math.PI : Math.PI; }
    pl.holder.rotation.set(0, 0, -r);
    pl.holder.scale.setScalar(Math.max(0.0001, hs * pc * a * (1 + pl.hv * 0.03)));
    pl.spin.rotation.set(0, 0, 0);                  // itt nem forognak: szemből látszanak
    if (pl.img) {                                    // projektkép: hoverre kinyílik, mint a tornyon
      pl.rv = damp(pl.rv, isH ? 1 : 0, isH ? 2.4 : 3.2, dt);
      if (pl.rv < 0.002 && !isH) pl.rv = 0;
      const u = pl.img.mat.uniforms;
      u.uReveal.value = pl.rv; u.uTime.value += dt;
      pl.img.mesh.visible = pl.rv > 0.002;
    }
  });
}
