// Képkocka-független simítás: a → b felé, k sebességgel
export const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
