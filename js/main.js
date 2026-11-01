// Belépési pont: a modulok betöltése és a kockánkénti frissítés sorrendje
// (a Three.js az index.html-ből jön globális THREE-ként)
import { startLoop } from './scene.js';
import { updatePills } from './pills.js';
import { updateWaves } from './waves.js';
import './panel.js';
import { actx, updateAudio } from './audio.js';
import { plUpdate, updateTime } from './player.js';
import { updateProject } from './project.js';

startLoop(dt => {
  updatePills(dt);           // hover, görgetés, pillek
  updateWaves(dt);           // a hullámok Középre eltolása
  updateAudio(dt);           // zenei reakció: hullámok, logó, pulzálás
  if (actx) updateTime();    // idősáv
  plUpdate(dt);              // a lejátszó blobja
  updateProject(dt);         // projekt-aloldal: domború sorok, galéria
});
