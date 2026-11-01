# Portfólió — Patrik Madarász

Patrik grafikus hallgató (Eszterházy Károly Egyetem, Eger) és szabadúszó tervező. Ez a saját portfólió-oldala, Vercelen hostolva, a `main` branchről automatikusan települ.

## Kommunikáció
- Magyarul válaszolj, röviden és egyenesen, technikai dolgoknál lépésenként.
- A UI/UX javaslatokat irányként kezeli, nem kész megoldásként.

## Felépítés
- Statikus oldal, build lépés nincs: `index.html`, `styles.css`, `main.js`.
- Three.js 0.149 CDN-ről (jsDelivr, UMD `three.min.js`, globális `THREE`), Google Fonts: Archivo (display), Geist Mono (UI-címkék).
- A kódban a kommentek magyarul vannak, maradjanak is.

## Ami az oldalon van (main.js)
- **Pill-torony:** 6 forgó, vastag 3D pill (ExtrudeGeometry, simított perem-normálok) saját liquid glass shaderrel: képernyőtérbeli fénytörés a 3D normálokból, diszperzió, fresnel, stúdió-env reflexió. A sík előlap tiszta, csak a perem tör. A címkék a pill belsejében vannak (render target → az üveg megtöri).
- **Rétegek:** 1 = háttér + címkék (render targetbe, ezt töri az üveg), 2 = pillek üvege, 3 = blit, 4 = lejátszó üvege.
- **Görgetés:** végtelen dob, lendület + súrlódás + ráugrás a legközelebbi pillre; gyors görgetésnél dőlés és gyorsabb forgás. Hover: a pill szembefordul, a többi szétcsúszik.
- **Hullámok a két szélen:** teljes képernyős 2D shader, oldalanként 3 szalag. Két stílus a panelen váltható: *Fényszalag* (alap) és *Üveg* (kettős kontúr, diszperzió, csillanás).
- **Zenei reakció:** saját basszus-detektor (30–150 Hz, a pillanatnyi átlaghoz mérve) → „pak–húz” lefelé rántás (`uFlowY`), folyamatos áramlás a basszussal; hangsávok helyben kidomborítják a szalagot; opcionális BPM-szinkron tempóbecsléssel.
- **MP logó** fent középen: a szárai a zenére rövidülnek (1 mély, 2 közép, 3 hangerő, 4 magas).
- **Blob lejátszó** bal alul: csukva hangszóró-kör; hoverre rugós, folyékony nyitás (jobbra nyúlik → középen felnő egy csepp → kétfelé válik → felül kinyílik), csukás pontosan visszafelé. Az alakot WebGL rajzolja SDF smooth-unionnal, liquid glass-szal. Hangerő-pill, előző/lejátszás/következő, idősáv, saját zene a borítóra kattintva.
- **Glass panel** (jobb felső gomb): a Figma Glass effekt csúszkái (Light, Intensity, Refraction, Depth, Dispersion, Frost, Splay) + Forgás + Hullám (stílus, Reakció, Fényerő, Behúzás, Áramlás, Lendület, BPM-szinkron). Alapértékek: `DEFAULTS` a `main.js` elején.

## Design-irány
- Fekete háttér, monokróm, finom fehér fények; üveg (Apple liquid glass) és fémes hatások.
- UI: mono, nagybetűs, kis címkék a sarkokban; display-betű csak a projektnevekhez.
- Folyékony, rugós, „liquid” mozgás; kerüld a rángatást és a túl erős lüktetést (ezt kifejezetten zavarónak találta).
- Hullámoknál: sima, folytonos ívek, ne legyen csíkos/moirés, kockás vagy éles levágás.
- A logó: „MP” jel (m + p betűforma), az útvonalak a `LOGO_PATHS`-ban.

## Nyitott pontok
- A `PROJECTS` lista placeholder (Water, MP, Chime, Időkövető, Backrooms, Csarnok) — a valódi projektek és képek még jönnek.
- A lejátszó borítója a Figma-designból kivágott kép, minden számnál ugyanaz.
- Teljesítmény: a hullám- és üveg-shaderek nehezek; ha gyenge gépen akad, könnyített mód kell.
