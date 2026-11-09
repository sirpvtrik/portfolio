/* ---------- Projektek (Patrik listája) ---------- */
// cat: a pillen a cím alatt nagybetűvel; meta: egyelőre nem jelenik meg
// image: hoverre a pill belsejében középről kinyíló kép (focus: a kép melyik pontja kerüljön középre, 0..1)
// A hullámok kattintásra a kép 3 árnyalatára váltanak (automatikusan a képből; palette: [[r,g,b] ×3] kézzel felülírja,
// color: tartalék szín, ha nincs kép)
export const PROJECTS = [
  { id: 'P01', name: 'Water',           cat: 'Font',  meta: '' },
  { id: 'P02', name: 'Kurwa',           cat: 'Font',  meta: '' },
  { id: 'P03', name: 'Prototype',       cat: 'Font',  meta: '' },
  { id: 'P04', name: 'Oldalra fújva',   cat: 'Print', meta: 'Zöldkönyv', image: 'assets/projects/oldalra-fujva/cover.webp', focus: [0.5, 0.52], color: [0.24, 0.92, 0.5],
    detail: {   // a projekt-aloldal saját szövege (a többi mező a DETAIL_TEST-ből jön)
      label: 'Zsebkönyv · Illusztráció',
      intro: '24 kannabiszfajta, 24 fantázianév, 24 illusztráció – egy zsebkönyvben, ami egyszerre informatív(!) és szórakoztató.',
      text: 'Egyetemi feladat volt: 24 illusztráció, mind más stílusban, Adobe Illustratorban. A keretet én adtam hozzá: minden kép egy kannabiszfajta fantázianevéből indul ki.',
      // további nagy képek (henger): a borító után, egyenként, a borítóval azonos méretben (Patrik: a „Használat” oldal)
      full: ['assets/projects/zsebkonyv/hasznalat.webp'],
      // galéria: kép, vagy { src, video }: a videó akkor játszódik le (egyszer), amikor a kép a helyére ért, és az utolsó
      // kockáján áll meg (az a poszter maga). A 19-es videó visszafelé van kiírva (Patrik: visszafelé fusson, majd álljon meg).
      // name: a fajta neve, a kép alatt jelenik meg (Patrik táblája szerint)
      gallery: [
        { src: 'assets/projects/zsebkonyv/poszterek-05.webp', video: 'assets/projects/zsebkonyv/poszterek-05.mp4', name: 'Lavender' },   // a RAR 39-ese ugyanez a kép
        { src: 'assets/projects/zsebkonyv/poszterek-30.webp', name: 'Deathstar' },
        { src: 'assets/projects/zsebkonyv/poszterek-08.webp', name: 'Permanent Marker' },
        { src: 'assets/projects/zsebkonyv/poszterek-12.webp', name: 'Alien Rock Candy' },
        { src: 'assets/projects/zsebkonyv/poszterek-15.webp', name: 'Blue Dream' },
        { src: 'assets/projects/zsebkonyv/poszterek-16.webp', name: 'Runtz' },
        { src: 'assets/projects/zsebkonyv/poszterek-17.webp', name: 'AK-47' },
        { src: 'assets/projects/zsebkonyv/poszterek-19.webp', video: 'assets/projects/zsebkonyv/poszterek-19-rev.mp4', name: 'Amnesia' },
        { src: 'assets/projects/zsebkonyv/poszterek-32.webp', name: 'Cat Piss' },
        { src: 'assets/projects/zsebkonyv/poszterek-34.webp', name: 'Guava' },
        { src: 'assets/projects/zsebkonyv/poszterek-35.webp', name: 'Sour Diesel' },
      ],
    } },
  { id: 'P05', name: 'Digitális pokol', cat: 'Print', meta: '' },
  { id: 'P06', name: 'Painpoint',       cat: 'App',   meta: '' },
  { id: 'P07', name: 'Ringme',          cat: 'Web',   meta: '' },
  { id: 'P08', name: 'MDI Backrooms',   cat: 'Video', meta: '' },
  { id: 'P09', name: 'Apória',          cat: 'Video', meta: '' },
];
export const N = PROJECTS.length;

/* ---------- Kapcsolat (a jobb felső névjegy-blob, js/contact.js) ----------
   Patriktól kell még: a Behance-profil címe, az Instagram címe és a kapcsolati e-mail. Ami üres, az nem kattintható. */
export const CONTACT = { behance: '', instagram: '', email: '' };
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Glass beállítások (Figma alapértékek) ---------- */
export const DEFAULTS = { ang: 24, int: 27, refr: 100, depth: 3, thick: 100, glow: false, rim: 0, disp: 100, frost: 0, splay: 100, spin: reduced ? 10 : 40, react: 42, wlight: 57, wpush: 43, wspeed: reduced ? 12 : 40, surge: 50, wshift: 0, bpmSync: true, wstyle: 0, pjMode: 2, pjTextStill: false, pjLight: false };   // Patrik beállításai (Másolás)
// pjMode: a projekt-aloldal formája (0 = üvegkártyák, 1 = függőleges pill-test csigavonallal, 2 = henger: a vízszintes pill
// a teljes képernyőre nyúlik, a tartalom vízszintes tengelyű hengeren gördül fel; js/drum.js)
// pjLight: a henger-oldal teljes képernyős pill-testén legyen-e fény (tükröződés, csíkfény); alapból nincs (Patrik tesztje)
// pjTextStill: teszt a pill-oldalon: a cím és a szöveg nem forog, a test közepén áll (a képek körülötte forognak); alapból ki
// az aktuális beállítások (a Glass panel írja, mindenki más olvassa)
export const S = Object.assign({}, DEFAULTS);

/* ---------- Pill méretek ---------- */
export const PW = 3.8, PH = 1.416;  // egy pill szélessége / magassága (Figma: 440 × 164)
export const SP = 1.5;              // a pillek távolsága a toronyban
export const VIEW_N = 7;            // a kamera ennyi pill magasságához igazodik (a pillek mérete ettől nem függ a projektek számától; a többi görgetéssel jön)
export const TOWER_Y = -0.45;       // a torony függőleges eltolása (negatív = lejjebb; alul már nincs felirat)

/* ---------- MP logó útvonalai ---------- */
export const LOGO_PATHS = [
  'M 253.86 0.00 L 58.83 0.00 C 56.47 0.00 53.97 0.83 51.32 2.48 C 48.67 4.13 46.70 6.13 45.40 8.48 L 1.24 84.80 C 0.41 86.33 0.00 87.75 0.00 89.04 C 0.00 91.87 1.65 93.28 4.95 93.28 L 47.34 93.28 C 49.58 93.28 52.03 92.46 54.68 90.81 C 57.33 89.16 59.30 87.16 60.59 84.80 L 99.81 16.96 C 101.23 14.61 103.23 12.61 105.82 10.96 C 108.41 9.31 110.88 8.48 113.24 8.48 C 116.42 8.48 118.01 9.90 118.01 12.72 C 118.01 14.01 117.59 15.42 116.76 16.95 L 77.54 84.79 C 76.72 86.33 76.32 87.74 76.32 89.04 C 76.32 91.87 77.97 93.28 81.27 93.28 L 123.77 93.28 C 126.01 93.28 128.46 92.47 131.12 90.83 C 133.77 89.20 135.75 87.22 137.05 84.88 L 176.16 16.98 C 177.57 14.62 179.57 12.61 182.15 10.96 C 184.74 9.31 187.21 8.48 189.56 8.48 C 192.74 8.48 194.33 9.90 194.33 12.72 C 194.33 14.02 193.91 15.43 193.09 16.96 L 144.86 100.70 C 143.45 103.06 142.74 105.71 142.74 108.65 C 142.74 110.65 143.10 112.30 143.80 113.60 L 167.30 153.35 C 167.89 154.52 168.71 155.11 169.77 155.11 C 171.77 155.11 173.66 153.58 175.42 150.52 L 257.40 8.48 C 258.22 6.95 258.63 5.54 258.63 4.24 C 258.63 1.42 257.04 0.00 253.86 0.00 Z',
  'M 330.16 0.00 L 211.44 0.00 C 209.09 0.00 206.61 0.83 204.02 2.48 C 201.43 4.13 199.43 6.13 198.02 8.48 L 144.84 100.70 C 143.43 103.06 142.72 105.71 142.72 108.65 C 142.72 110.65 143.08 112.30 143.78 113.60 L 167.28 153.35 C 167.87 154.52 168.75 155.11 169.93 155.11 C 171.69 155.11 173.41 153.77 175.08 151.08 L 203.52 101.77 L 252.43 16.96 C 253.84 14.61 255.84 12.61 258.43 10.96 C 261.03 9.31 263.50 8.48 265.86 8.48 C 269.15 8.48 270.80 9.89 270.80 12.71 C 270.80 13.74 270.50 14.85 269.89 16.02 C 269.73 16.33 269.56 16.64 269.36 16.95 L 235.12 76.32 L 234.61 77.19 L 229.49 86.07 C 227.64 89.27 229.95 93.28 233.65 93.28 L 276.28 93.28 C 278.63 93.28 281.11 92.46 283.70 90.81 C 286.29 89.16 288.29 87.16 289.71 84.80 L 333.69 8.48 C 334.64 6.95 335.11 5.54 335.11 4.24 C 335.11 1.42 333.46 0.00 330.16 0.00 Z',
];

/* ---------- Projekt-aloldal (teszt) ----------
   Egyelőre minden pill ezt nyitja meg. gallery: képek útvonalai (pl. 'assets/projects/water/01.jpg');
   üres lista → helyőrző kártyák. */
export const DETAIL_TEST = {
  label: 'Introduction ipsum',
  intro: 'Ez az alufóliából készült víz témájú portfólióm bemutató szövege. / This is the showcase text for my water-themed portfolio made from aluminum foil.',
  text: 'Ez az alufóliából készült víz témájú portfólióm bemutató szövege. / This is the showcase text for my water-themed portfolio made from aluminum foil.',
  gallery: [   // Zsebkönyv illusztrációk (Patrik posztersorozata, a RAR-jában lévő 12 kép; a 39 = a 05)
    'assets/projects/zsebkonyv/poszterek-05.webp',
    'assets/projects/zsebkonyv/poszterek-08.webp',
    'assets/projects/zsebkonyv/poszterek-12.webp',
    'assets/projects/zsebkonyv/poszterek-15.webp',
    'assets/projects/zsebkonyv/poszterek-16.webp',
    'assets/projects/zsebkonyv/poszterek-17.webp',
    'assets/projects/zsebkonyv/poszterek-19.webp',
    'assets/projects/zsebkonyv/poszterek-30.webp',
    'assets/projects/zsebkonyv/poszterek-32.webp',
    'assets/projects/zsebkonyv/poszterek-34.webp',
    'assets/projects/zsebkonyv/poszterek-35.webp',
  ],
};
