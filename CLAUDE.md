# Portfólió — Patrik Madarász

Patrik grafikus hallgató (Eszterházy Károly Egyetem, Eger) és szabadúszó tervező. Ez a saját portfólió-oldala, Vercelen hostolva, a `main` branchről automatikusan települ.

## Kommunikáció
- Magyarul válaszolj, röviden és egyenesen, technikai dolgoknál lépésenként.
- A UI/UX javaslatokat irányként kezeli, nem kész megoldásként.

## Felépítés
- Statikus oldal, build lépés nincs. `index.html` a gyökérben, `css/styles.css`, `assets/cover.jpg`, a JS natív ES modulokban (`<script type="module" src="js/main.js">`).
- Three.js 0.149 CDN-ről (jsDelivr, UMD `three.min.js`, globális `THREE`, a modulok előtt töltődik be), Google Fonts: Archivo (display), Geist Mono (UI-címkék).
- `js/main.js`: belépési pont, kockánkénti sorrend: pillek → zenei reakció → idősáv → lejátszó.
- `js/config.js`: `PROJECTS`, `DEFAULTS`, aktuális beállítások (`S`), pill-méretek (`PW`, `PH`, `SP`), `LOGO_PATHS`.
- `js/scene.js`: renderer, kamera, render target, rétegek, közös üveg-uniformok (`U`), méretezés, render loop (`startLoop`).
- `js/pills.js`: pill-geometria, címke-textúrák, üveg, hover, görgetés. `js/waves.js`: hullám-anyag és `WU` uniformok.
- `js/audio.js`: demó loop, fájlbetöltés, analyser, basszus-detektor, BPM-becslés, zenei reakció (`updateAudio`). `js/logo.js`: MP logó.
- `js/player.js`: blob lejátszó (idővonal, rugók, SDF üveg, hangerő, előző/következő, tekerés). `js/panel.js`: Glass panel csúszkái.
- `js/project.js`: projekt-aloldal (DOM-overlay a vászon fölött, `#project`): felépítés a `DETAIL_TEST`-ből, nyitás/zárás, domború sorok, végtelen hengeres galéria. A pills.js `onSelect`/`restorePills` függvényein keresztül kapcsolódik.
- `js/shaders/*.js`: GLSL template stringként (`glass`, `waves`, `player`, `fullscreen`).
- Az importok egy irányba mennek, körkörös import nincs. Egy modul csak a saját `let` változóit írhatja (az importált binding csak olvasható): ha más modulnak kell állítania, függvényt exportál (pl. `setVol`, `requestGeoRebuild`).
- A kódban a kommentek magyarul vannak, maradjanak is.

## Ami az oldalon van
- **Pill-torony:** 6 forgó, vastag 3D pill (ExtrudeGeometry, simított perem-normálok) saját liquid glass shaderrel: képernyőtérbeli fénytörés a 3D normálokból, diszperzió, fresnel, stúdió-env reflexió. A sík előlap tiszta, csak a perem tör. A címkék a pill belsejében vannak (render target → az üveg megtöri).
- **Rétegek:** 1 = háttér + címkék (render targetbe, ezt töri az üveg), 2 = pillek üvege, 3 = blit, 4 = lejátszó üvege.
- **Görgetés:** végtelen dob, lendület + súrlódás + ráugrás a legközelebbi pillre; gyors görgetésnél dőlés és gyorsabb forgás. Hover: a pill szembefordul, a többi szétcsúszik.
- **Hullámok a két szélen:** teljes képernyős 2D shader, oldalanként 3 szalag. Két stílus a panelen váltható: *Fényszalag* (alap) és *Üveg* (kettős kontúr, diszperzió, csillanás).
- **Zenei reakció:** saját basszus-detektor (30–150 Hz, a pillanatnyi átlaghoz mérve) → „pak–húz” lefelé rántás (`uFlowY`), folyamatos áramlás a basszussal; hangsávok helyben kidomborítják a szalagot; opcionális BPM-szinkron tempóbecsléssel.
- **MP logó** fent középen: a szárai a zenére rövidülnek (1 mély, 2 közép, 3 hangerő, 4 magas).
- **Blob lejátszó** bal alul: csukva hangszóró-kör; hoverre rugós, folyékony nyitás (jobbra nyúlik → középen felnő egy csepp → kétfelé válik → felül kinyílik), csukás pontosan visszafelé. Az alakot WebGL rajzolja SDF smooth-unionnal, liquid glass-szal. Hangerő-pill, előző/lejátszás/következő, idősáv, saját zene a borítóra kattintva.
- **Projekt-aloldal** (Figma: Desktop – 2): pillre kattintva a többi pill leesik, a kiválasztott összehúzódik, a hullámok kiúsznak a szélekre, és sorban megjelennek az üvegkártyák (bal felső → jobb felső → jobb középső → bal középső → galéria). Görgetéskor a sorok domborúak (középen nagyobbak, fent/lent kisebbek és hátradőlnek), a galéria lefelé görgetve jobbra halad, végtelenül ismétlődik, a széleken hengerként begörbül. Vissza: bal felső gomb vagy Esc → a pillek felülről visszaesnek. Tartalom: `DETAIL_TEST` a `js/config.js`-ben (egyelőre minden pill ezt nyitja).
- **Glass panel** (jobb felső gomb): a Figma Glass effekt csúszkái (Light, Intensity, Refraction, Depth, Dispersion, Frost, Splay) + Forgás + Hullám (stílus, Reakció, Fényerő, Behúzás, Középre, Áramlás, Lendület, BPM-szinkron). Alapértékek: `DEFAULTS` a `js/config.js`-ben. A fejlécben a **Másolás** gomb az aktuális beállításokat JSON-ként a vágólapra teszi: Patrik így küldi vissza a beállított értékeket, ezekből lesz az új `DEFAULTS`.
- **Középre** (`wshift` → `uShift`): a hullámszalagokat a pillek mögé hozza; ahol a pillek mögé érnek, az üveg megtöri őket. 0 = a régi, szélen futó hullám. A shader a képarányhoz igazítja (~70 → épp a pillek széléig ér bármilyen széles képernyőn), álló/mobil képernyőn nincs hatása. Alapértékek: Refraction 40, Középre 90 → átlátszó üvegpillek, mögöttük áthaladó hullámokkal.

## Design-irány
- Fekete háttér, monokróm, finom fehér fények; üveg (Apple liquid glass) és fémes hatások.
- UI: mono, nagybetűs, kis címkék a sarkokban; display-betű csak a projektnevekhez.
- Folyékony, rugós, „liquid” mozgás; kerüld a rángatást és a túl erős lüktetést (ezt kifejezetten zavarónak találta).
- Hullámoknál: sima, folytonos ívek, ne legyen csíkos/moirés, kockás vagy éles levágás.
- A logó: „MP” jel (m + p betűforma), az útvonalak a `LOGO_PATHS`-ban.

## Nyitott pontok
- A `PROJECTS` lista placeholder (Water, MP, Chime, Időkövető, Backrooms, Csarnok) — a valódi projektek és képek még jönnek.
- A lejátszó borítója a Figma-designból kivágott kép, minden számnál ugyanaz.
- Projekt-aloldal: a galéria képei (a Figma-poszter) és a **Nohemi** betűtípus még hiányzik (a Figma-assetek ebből a környezetből nem tölthetők le); addig helyőrző kártyák és Archivo Light/Regular. Képek: `DETAIL_TEST.gallery`, betű: `assets/fonts/` + `@font-face`. Valódi projektenkénti tartalom még nincs.
- Teljesítmény: a hullám- és üveg-shaderek nehezek; ha gyenge gépen akad, könnyített mód kell.
- Betűtípus-verseny a címkéknél: a pill-címkék újrarajzolása csak az Archivo/Geist Mono *latin* részét várja meg (`document.fonts.load`), a latin-ext részt (Ő, Ű) nem, így a betöltés sorrendjétől függ, hogy az „IDŐKÖVETŐ” / „BETŰKÉSZLET” ékezetes betűje a webfonttal vagy tartalék betűvel rajzolódik. Javítás: a `load` hívásokba a tényleges szöveget is át kell adni.
