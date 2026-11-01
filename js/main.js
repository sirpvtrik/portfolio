// Belépési pont: a modulok betöltése és a kockánkénti frissítés sorrendje
// (a Three.js az index.html-ből jön globális THREE-ként)
import { startLoop } from './scene.js';
import { updatePills } from './pills.js';
import './panel.js';
import { actx, updateAudio } from './audio.js';
import { plUpdate, updateTime } from './player.js';

startLoop(dt => {
  updatePills(dt);           // hover, görgetés, pillek
  updateAudio(dt);           // zenei reakció: hullámok, logó, pulzálás
  if (actx) updateTime();    // idősáv
  plUpdate(dt);              // a lejátszó blobja
});
