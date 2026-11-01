# Portfólió — Patrik Madarász

Statikus weboldal: forgó, 3D liquid glass pillek a projektekkel, a két szélen zenére reagáló fényhullámokkal, és egy blob-szerűen kinyíló, liquid glass zenelejátszóval.

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
- **Alapbeállítások:** `main.js`, `DEFAULTS` objektum (üveg, hullám, reakció).
- **Saját zene:** a lejátszó borítójára kattintva tölthető be böngészőben; a demó loop kódból generált.
