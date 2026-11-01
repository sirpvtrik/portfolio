// Közös üveg-geometria: a pillek és a projekt-kártyák ugyanabból épülnek
// (kihúzott alak lekerekített peremmel, simított perem-normálokkal → a sík előlap tiszta, a perem tör)

export function stadium(w, h) {
  const r = h / 2, x = w / 2 - r, s = new THREE.Shape();
  s.moveTo(-x, -r); s.lineTo(x, -r);
  s.absarc(x, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(-x, r);
  s.absarc(-x, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  return s;
}
// lekerekített téglalap (a projekt-kártyákhoz)
export function roundedRect(w, h, r) {
  r = Math.max(0.001, Math.min(r, w / 2, h / 2));
  const x = w / 2, y = h / 2, s = new THREE.Shape();
  s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.absarc(x - r, -y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x, y - r); s.absarc(x - r, y - r, r, 0, Math.PI / 2, false);
  s.lineTo(-x + r, y); s.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-x, -y + r); s.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
// Az oldalfal + perem normáljait kisimítjuk (az előlap marad sík → tiszta közép)
export function smoothSides(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  const side = geo.groups[1] || { start: 0, count: p.count };
  const key = i => Math.round(p.getX(i) * 1e4) + '_' + Math.round(p.getY(i) * 1e4) + '_' + Math.round(p.getZ(i) * 1e4);
  const acc = new Map();
  for (let i = side.start; i < side.start + side.count; i++) {
    const k = key(i); let a = acc.get(k);
    if (!a) { a = [0, 0, 0]; acc.set(k, a); }
    a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i);
  }
  for (let i = side.start; i < side.start + side.count; i++) {
    const a = acc.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1;
    n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l);
  }
  n.needsUpdate = true;
  return geo;
}
// perem mérete a Depth csúszkából (0..1)
export const bevelOf = depth01 => 0.05 + depth01 * 0.32;
// vastag üveglap az alakból: shapeFn(belső szélesség, belső magasság) → Shape
export function glassSlab(shapeFn, w, h, depth01, curveSegments) {
  const b = bevelOf(depth01);
  const geo = new THREE.ExtrudeGeometry(shapeFn(w - 2 * b, h - 2 * b), {
    depth: 0.18, bevelEnabled: true, bevelThickness: b * 0.95, bevelSize: b, bevelSegments: 16, curveSegments,
  });
  geo.center();
  return smoothSides(geo);
}
// UV a bounding boxhoz igazítva (a címke-textúra a teljes alakot kitölti)
export function remapUV(geo) {
  geo.computeBoundingBox();
  const bb = geo.boundingBox, p = geo.attributes.position, uv = geo.attributes.uv;
  const w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - bb.min.x) / w, (p.getY(i) - bb.min.y) / h);
  uv.needsUpdate = true; return geo;
}
