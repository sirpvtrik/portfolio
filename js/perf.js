// Teljesítmény-mérő (csak ?perf esetén): FPS, a leglassabb kocka az utolsó másodpercben, a rajzolási felbontás
// (pixel ratio) és hogy hány videó szól épp. Patrik gyengébb laptopján így derül ki, mi akad (a videók vagy a rajzolás).
import { renderer } from './scene.js';

if (/[?&]perf\b/.test(location.search)) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:8px;top:8px;z-index:9999;padding:6px 9px;border-radius:8px;background:rgba(0,0,0,.72);' +
    'color:#fff;font:12px/1.4 ui-monospace,Menlo,Consolas,monospace;pointer-events:none;white-space:pre';
  document.body.appendChild(el);
  let last = performance.now(), n = 0, worst = 0, acc = 0;
  const tick = now => {
    const d = now - last; last = now; n++; acc += d; worst = Math.max(worst, d);
    if (acc >= 1000) {
      const vids = [...document.querySelectorAll('video')];
      const playing = vids.filter(v => !v.paused && !v.ended).length;
      el.textContent = `FPS ${Math.round(n * 1000 / acc)}  leglassabb ${Math.round(worst)} ms\n` +
        `felbontás ${renderer.getPixelRatio().toFixed(2)}×  ${innerWidth}×${innerHeight}\n` +
        `videó: ${playing} szól / ${vids.length}`;
      n = 0; acc = 0; worst = 0;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
