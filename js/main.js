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
import { lgUpdate } from './langswitch.js';
import { uiSlideUpdate } from './uislide.js';
import { backUpdate, touchUpdate, iconsUpdate } from './backglass.js';
import { updateHero } from './hero.js';
import './perf.js';                                  // ?perf: teljesítmény-mérő (FPS, felbontás, szóló videók)

startLoop(dt => {
  updatePills(dt);           // hover, görgetés, pillek
  updateWaves(dt);           // a hullámok Középre eltolása
  updateCursor(dt);          // egérfény (folyékony nyom, a kurzor kis fénye)
  updateAudio(dt);           // zenei reakció: hullámok, logó, pulzálás
  if (actx) updateTime();    // idősáv
  uiSlideUpdate();           // a sarokelemek becsúszása (a pillek felúszása után)
  plUpdate(dt);              // a lejátszó blobja
  ctUpdate(dt);              // a névjegy-blob jobb felül
  lgUpdate(dt);              // a HU / EN váltó jobb alul
  backUpdate(dt);            // a Vissza gomb üvege
  touchUpdate(dt);           // a GET IN TOUCH gomb üvege (a projekt-oldal végén)
  iconsUpdate(dt);           // a lejátszó és a névjegy kis gombjai: a kurzor a formájukat veszi fel
  updateProject(dt);         // projekt-aloldal: domború sorok, galéria
  updateHero(dt);            // hero: a logó fénye a szövegen (a betöltő után, a pillek előtt)
});
