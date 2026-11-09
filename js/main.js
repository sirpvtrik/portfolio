// Belépési pont: a modulok betöltése és a kockánkénti frissítés sorrendje
// (a Three.js az index.html-ből jön globális THREE-ként)
import { startLoop } from './scene.js';
import { updatePills } from './pills.js';
import { updateWaves } from './waves.js';
import './panel.js';
import { actx, updateAudio } from './audio.js';
import { plUpdate, updateTime } from './player.js';
import { updateProject } from './project.js';
import { updateCursor } from './cursor.js';
import { ctUpdate } from './contact.js';

startLoop(dt => {
  updatePills(dt);           // hover, görgetés, pillek
  updateWaves(dt);           // a hullámok Középre eltolása
  updateCursor(dt);          // egérfény (folyékony nyom, a kurzor kis fénye)
  updateAudio(dt);           // zenei reakció: hullámok, logó, pulzálás
  if (actx) updateTime();    // idősáv
  plUpdate(dt);              // a lejátszó blobja
  ctUpdate(dt);              // a névjegy-blob jobb felül
  updateProject(dt);         // projekt-aloldal: domború sorok, galéria
});
