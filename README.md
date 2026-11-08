# Portfólió — Patrik Madarász

Statikus weboldal: forgó, 3D liquid glass pillek a projektekkel, a két szélen zenére reagáló fényhullámokkal, és egy blob-szerűen kinyíló, liquid glass zenelejátszóval.

**Projektnézet (teszt):** egy pillre kattintva (vagy Enterrel a középsőt) a pill folyékonyan egy matt liquid glass panellé nyílik, mögötte átlátszanak a hullámok. A csempék felülről beesnek, majd görgetésre (görgő, trackpad, húzás, nyilak, vagy kattintás egy csempére) jelenetről jelenetre átrendeződnek: újak csúsznak be, széttolják és átméretezik a többit, a régiek kicsúsznak. A panel teteje és alja felé a csempék enyhén hátrahajlanak (vízszintes tengelyű henger), oldalt egyenesek. Álló képernyőn a rács elfordul (oszlopok helyett sorok). Vissza: Esc, a bal felső gomb, vagy kattintás a panelen kívülre. Nyitott panelnél a pillek nem renderelődnek.

**Hologram (teszt):** a háttérben, az üvegek mögött én mozgok pontfelhőként (pontok + finom vonalháló, a körvonalak és redők világítanak). Zenei ütésre felvillan és „telítődik”, az egér felé kicsit elfordul (látszik a mélysége). Projekt megnyitásakor a forgató mozdulatot játssza le, lapozáskor a legyintéseket, egyébként a nyugalmi loopot. Fényereje a panelen állítható (0 = kikapcsolva, ilyenkor a videó is megáll).

## Felépítés

| Fájl | Mi van benne |
| --- | --- |
| `index.html` | Az oldal váza: fejléc, Glass panel, lejátszó |
| `styles.css` | Minden stílus |
| `main.js` | Three.js jelenet: pillek és üveg-shader, hullám-shader, zene (WebAudio), görgetés, lejátszó-animáció, projektnézet, hologram |
| `assets/holo.mp4` | A hologram forrása: három szürke sáv egymás mellett — fény, maszk, ál-mélység (nyugalmi loop + mozdulatok egy fájlban) |
| `tools/holo.py` | Ezzel készül a `holo.mp4` a nyers felvételből (MediaPipe háttérkivágás, kontraszt, ál-mélység) |

Külső függőség csak CDN-ről jön: Three.js 0.149 (jsDelivr) és Google Fonts (Archivo, Geist Mono). Build lépés nincs.

## Helyi futtatás

Bármilyen statikus szerverrel, például:

```bash
npx serve .
```

## Telepítés (Vercel)

Vercelen: **Add New → Project → Import** ezt a repót, a Framework Preset legyen **Other**, build parancs és output mappa üresen. Minden `main`-re pusholt commit automatikusan újratelepíti az oldalt.

## Hol mit állíts

- **Projektek:** `main.js` elején a `PROJECTS` lista (jelenleg placeholderek).
- **Projektnézet:** `main.js`, `TILES` (melyik csempe melyik jelenetben hol van, és merről jön be / merre megy ki) és `paintTile` (a helyőrző tartalom rajzolása — ide kerülnek majd a saját képek). A panelen: Görbület, Matt üveg, Tónus.
- **Hologram:** `main.js`, `HSEG` (a mozdulatok helye a videóban). Új felvételből: `python3 tools/holo.py <felvétel.mov> <selfie_multiclass_256x256.tflite> assets/holo.mp4 '[["idle",30.5,37,true],["open",15.9,21.9,false],...]'` — a kiírt időtáblát kell a `HSEG`-be másolni. Kell hozzá: `pip install mediapipe opencv-python-headless`, a modell a MediaPipe oldaláról tölthető le.
- **Alapbeállítások:** `main.js`, `DEFAULTS` objektum (üveg, hullám, reakció).
- **Saját zene:** a lejátszó borítójára kattintva tölthető be böngészőben; a demó loop kódból generált.
