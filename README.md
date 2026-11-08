# Portfólió — Patrik Madarász

Statikus weboldal: forgó, 3D liquid glass pillek a projektekkel, a két szélen zenére reagáló fényhullámokkal, és egy blob-szerűen kinyíló, liquid glass zenelejátszóval.

**Projektnézet (teszt):** egy pillre kattintva (vagy Enterrel a középsőt) a pill folyékonyan egy matt liquid glass panellé nyílik, mögötte átlátszanak a hullámok. A csempék felülről beesnek, majd görgetésre (görgő, trackpad, húzás, nyilak, vagy kattintás egy csempére) jelenetről jelenetre átrendeződnek: újak csúsznak be, széttolják és átméretezik a többit, a régiek kicsúsznak. A panel teteje és alja felé a csempék enyhén hátrahajlanak (vízszintes tengelyű henger), oldalt egyenesek. Álló képernyőn a rács elfordul (oszlopok helyett sorok). Vissza: Esc, a bal felső gomb, vagy kattintás a panelen kívülre. Nyitott panelnél a pillek nem renderelődnek.

**Két projektnézet** (a Glass panelen, „Projektnézet”, a következő megnyitástól érvényes):
- **Zoom** (alap): perspektivikus „végtelen zoom”. A pill egy kis matt üveg plakáttá nyílik, előtte a projekt nevéből és számából óriási liquid glass betűk lebegnek, amik megtörik a mögöttük lévő plakátot és hullámokat. A kamera átrepül a betűkön és landol a plakáton; görgetésre belemerül a plakát „fotójába”, és a következő projekt távoli nézetéből repül be újra (körbeér). A plakát rétegei (fotó, szöveg) más mélységben vannak, így parallaxisan mozognak.
- **Bento**: a lenti jelenetről jelenetre átrendeződő csempék.

## Felépítés

| Fájl | Mi van benne |
| --- | --- |
| `index.html` | Az oldal váza: fejléc, Glass panel, lejátszó |
| `styles.css` | Minden stílus |
| `main.js` | Three.js jelenet: pillek és üveg-shader, hullám-shader, zene (WebAudio), görgetés, lejátszó-animáció |

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
- **Zoom-nézet:** `main.js`, `paintPoster` (a plakát tartalma és a „fotó” — ide jöhet a saját kép), `posterLayout` (elrendezés), `Z_…` konstansok (rétegek mélysége), `ACCENTS` (projektszínek).
- **Bento-nézet:** `main.js`, `TILES` (melyik csempe melyik jelenetben hol van, és merről jön be / merre megy ki) és `paintTile` (a helyőrző tartalom rajzolása — ide kerülnek majd a saját képek). A panelen: Görbület, Matt üveg, Tónus.
- **Alapbeállítások:** `main.js`, `DEFAULTS` objektum (üveg, hullám, reakció).
- **Saját zene:** a lejátszó borítójára kattintva tölthető be böngészőben; a demó loop kódból generált.
