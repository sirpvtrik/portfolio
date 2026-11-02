# Portfólió — Patrik Madarász

Statikus weboldal: forgó, 3D liquid glass pillek a projektekkel, a két szélen zenére reagáló fényhullámokkal, és egy blob-szerűen kinyíló, liquid glass zenelejátszóval.

## Felépítés

| Fájl | Mi van benne |
| --- | --- |
| `index.html` | Az oldal váza: fejléc, Glass panel, lejátszó |
| `css/styles.css` | Minden stílus |
| `assets/cover.jpg` | A lejátszó borítója |
| `intro.js` | Betöltő animáció (logó körvonal → kitöltés) és a belépés időzítése; a `js/entrance.js` olvassa |
| `js/main.js` | Belépési pont: betölti a modulokat, és kockánként ebben a sorrendben frissít: pillek → zenei reakció → idősáv → lejátszó |
| `js/config.js` | `PROJECTS`, `DEFAULTS`, az aktuális beállítások (`S`), pill-méretek, `LOGO_PATHS` |
| `js/scene.js` | Renderer, kamera, render target, rétegek, közös üveg-uniformok (`U`), méretezés, render loop |
| `js/pills.js` | Pill-geometria, címke-textúrák, üveg-anyag, hover, görgetés/húzás |
| `js/waves.js` | A két szélső hullám anyaga és uniformjai (`WU`) |
| `js/audio.js` | Demó loop (WebAudio), saját fájl betöltése, analyser, basszus-detektor, BPM-becslés, zenei reakció |
| `js/logo.js` | A zenére reagáló MP logó |
| `js/player.js` | Blob lejátszó: nyitás/csukás idővonala, rugók, SDF üveg, hangerő, előző/következő, tekerés |
| `js/panel.js` | A Glass panel csúszkái |
| `js/project.js` | Projekt-aloldal 3D-ben: üvegkártyák (mint a pillek), dob-görgetés, hengeres galéria |
| `js/glassgeo.js` | Közös üveg-geometria a pilleknek és a kártyáknak |
| `js/util.js` | Kis segédfüggvények (`damp`) |
| `js/shaders/*.js` | GLSL shaderek template stringként: `glass`, `waves`, `player`, `fullscreen`, `pillimage` |

A JS natív ES modul (`<script type="module">`), build lépés nincs. Külső függőség csak CDN-ről jön: Three.js 0.149 (jsDelivr, UMD build, globális `THREE`, a modulok előtt töltődik be) és Google Fonts (Archivo, Geist Mono).

A modulok egy irányba hivatkoznak egymásra (`config` → `scene` → `pills`/`waves`/`logo` → `audio` → `player`, a `panel` a `pills`-t és a `waves`-t állítja), körkörös import nincs. Egy modul csak a saját változóit írhatja: ha másnak is állítania kell valamit, arra függvényt exportál (pl. `setVol`, `requestGeoRebuild`).

## Helyi futtatás

Bármilyen statikus szerverrel (ES modulok miatt `file://`-ból nem megy), például:

```bash
npx serve .
```

## Telepítés (Vercel)

Vercelen: **Add New → Project → Import** ezt a repót, a Framework Preset legyen **Other**, build parancs és output mappa üresen. Minden `main`-re pusholt commit automatikusan újratelepíti az oldalt.

## Hol mit állíts

- **Betöltő és belépés időzítése:** `intro.js` elején a `LOADER` (körvonal, kitöltés, kitartás) és a `POST` (felúszás, hullámok, pillek, felület) objektum.
- **Projektek:** `js/config.js`, `PROJECTS` lista (jelenleg részben placeholderek). A pill felirata a `name` és a `cat` (a `js/pills.js` `drawLabel`-je rajzolja).
- **Projektkép a pillben:** `image: 'assets/projects/<projekt>/cover.webp'` a `PROJECTS`-ben (széles kép, kb. 1600 px), `focus: [x, y]` (0..1) a kép középre kerülő pontja. A hullámok kattintásra a kép árnyalataira váltanak; `palette: [[r,g,b], [r,g,b], [r,g,b]]` kézzel felülírja.
- **Alapbeállítások:** `js/config.js`, `DEFAULTS` objektum (üveg, hullám, reakció).
- **Projekt-aloldal tartalma:** `js/config.js`, `DETAIL_TEST` (szövegek, `gallery` képlista; üresen helyőrzők).
- **Shaderek:** `js/shaders/` — a pill üvege a `glass.js`, a hullámok a `waves.js`, a lejátszó a `player.js`.
- **Saját zene:** a lejátszó borítójára kattintva tölthető be böngészőben; a demó loop kódból generált.
