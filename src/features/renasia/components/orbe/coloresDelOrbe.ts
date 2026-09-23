/**
 * Paleta del orbe líquido, la misma de `docs/pendientes/orbe-liquido-preview.html` (tomada de
 * `src/theme/tokens.ts`). El shader mezcla en espacio LINEAL, así que se convierte acá.
 */
const PALETA = {
  oscuro: { idleA: '#8A7340', idleB: '#C6A45C', thinkA: '#C09A4F', thinkB: '#E5C689' },
  claro: { idleA: '#9C7C3C', idleB: '#B2924F', thinkA: '#B2924F', thinkB: '#D8BE85' },
} as const;

export type Rgb = [number, number, number];

/** `#RRGGBB` en sRGB → componentes lineales 0..1 (la conversión estándar de sRGB). */
export function aLineal(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [16, 8, 0].map(desplazamiento => {
    const c = ((n >> desplazamiento) & 255) / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }) as Rgb;
}

export function coloresDelOrbe(oscuro: boolean): { idleA: Rgb; idleB: Rgb; thinkA: Rgb; thinkB: Rgb } {
  const p = oscuro ? PALETA.oscuro : PALETA.claro;
  return { idleA: aLineal(p.idleA), idleB: aLineal(p.idleB), thinkA: aLineal(p.thinkA), thinkB: aLineal(p.thinkB) };
}
