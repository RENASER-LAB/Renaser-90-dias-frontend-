/**
 * La fila de medallones de Comunidad tiene que mostrar que se desliza (2026-10-05). A 412 px entraban
 * cinco medallones casi exactos y el sexto (Testimonios) quedaba entero fuera: nada invitaba a
 * deslizar. Ahora el último visible asoma por la mitad.
 *
 * Contra el código anterior falla: la separación era 12 fija y a 412 px el quinto medallón se veía
 * al 94 % —no parecía cortado— y el sexto no asomaba.
 */
import { describe, expect, it } from '@jest/globals';

import { separacionDeLaFila } from '../filaDeMedallones';

/** Qué fracción del primer medallón que no entra entero queda a la vista. */
function asomo(anchoVisible: number, relleno: number, anchoMedallon: number, separacion: number, cantidad: number): number {
  let x = relleno;
  for (let i = 0; i < cantidad; i++) {
    const fin = x + anchoMedallon;
    if (fin > anchoVisible) return Math.max(0, anchoVisible - x) / anchoMedallon;
    x = fin + separacion;
  }
  return 1;
}

describe('la fila de medallones', () => {
  // Lo que usa la pantalla: `rs(40) + 26` de ancho por medallón, relleno de `horizontalPadding`.
  const casos = [
    { ancho: 360, medallon: 38 + 26, relleno: 18 },
    { ancho: 390, medallon: 42 + 26, relleno: 18 },
    { ancho: 412, medallon: 44 + 26, relleno: 18 },
  ];

  it('en teléfonos deja asomar medio medallón, así se ve que hay más', () => {
    for (const { ancho, medallon, relleno } of casos) {
      const { separacion, desliza } = separacionDeLaFila({ anchoVisible: ancho, relleno, anchoMedallon: medallon, cantidad: 6 });
      expect(desliza).toBe(true);
      expect(separacion).toBeGreaterThanOrEqual(8);
      expect(separacion).toBeLessThanOrEqual(24);
      expect(asomo(ancho, relleno, medallon, separacion, 6)).toBeCloseTo(0.5, 2);
    }
  });

  it('con la separación fija de antes, a 412 px el quinto se veía casi entero y el sexto nada', () => {
    // 94 % de Ranking a la vista: no parecía cortado, y Testimonios no asomaba. Nada invitaba a deslizar.
    expect(asomo(412, 18, 70, 12, 6)).toBeGreaterThan(0.9);
  });

  it('si la fila entra entera (tablet), no la toca', () => {
    expect(separacionDeLaFila({ anchoVisible: 768, relleno: 32, anchoMedallon: 76, cantidad: 6 })).toEqual({
      separacion: 12,
      desliza: false,
    });
  });

  it('antes de medirse (ancho 0) no inventa nada', () => {
    expect(separacionDeLaFila({ anchoVisible: 0, relleno: 18, anchoMedallon: 70, cantidad: 6 })).toEqual({
      separacion: 12,
      desliza: false,
    });
  });
});
