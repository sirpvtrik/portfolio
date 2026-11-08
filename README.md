# Portfólió — Patrik Madarász

Statikus weboldal: forgó, 3D liquid glass pillek a projektekkel, a két szélen zenére reagáló fényhullámokkal, és egy blob-szerűen kinyíló, liquid glass zenelejátszóval.

**Projektnézet (teszt):** egy pillre kattintva (vagy Enterrel a középsőt) a pill folyékonyan egy matt liquid glass panellé nyílik, mögötte átlátszanak a hullámok. A panelen a projekt csempéi egy vízszintes hengeren csúsznak: görgővel / trackpaddel / húzással / nyilakkal lapozható, oszloponként ráugrik. Vissza: Esc, a bal felső gomb, vagy kattintás a panelen kívülre. Nyitott panelnél a pillek nem renderelődnek.

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
- **Projektnézet csempéi:** `main.js`, `COLS` (oszlopok szélessége és a csempék típusa/magassága) és `paintTile` (a helyőrző tartalom rajzolása — ide kerülnek majd a saját képek). A panelen: Görbület, Matt üveg, Tónus.
- **Alapbeállítások:** `main.js`, `DEFAULTS` objektum (üveg, hullám, reakció).
- **Saját zene:** a lejátszó borítójára kattintva tölthető be böngészőben; a demó loop kódból generált.
