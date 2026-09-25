import { describe, expect, it } from '@jest/globals';

import { dark, light } from '../../../../theme/tokens';
import { coloresDelSemaforo } from '../coloresDelSemaforo';

/**
 * Los colores salen de la paleta del tema, en claro y en oscuro. Lo que no puede pasar nunca, en
 * ninguno de los dos: que "sin datos" se pinte con el verde de "al día" (D-128, D-131).
 */
describe.each([
  ['claro', light],
  ['oscuro', dark],
])('colores del semáforo en tema %s', (_nombre, paleta) => {
  it('sin datos es neutro: ni verde, ni amarillo, ni rojo', () => {
    const sinDatos = coloresDelSemaforo('SIN_DATOS', paleta);
    const colores = [paleta.success, paleta.gold, paleta.goldInk, paleta.danger];
    expect(colores).not.toContain(sinDatos.relleno);
    expect(colores).not.toContain(sinDatos.tinta);
  });

  it('cada estado con datos tiene su propio relleno', () => {
    const rellenos = (['VERDE', 'AMARILLO', 'ROJO', 'SIN_DATOS'] as const).map(color => coloresDelSemaforo(color, paleta).relleno);
    expect(new Set(rellenos).size).toBe(4);
  });

  /* `gold` sobre crema no pasa contraste de lectura: el texto amarillo va en `goldInk`. */
  it('el amarillo se escribe con el dorado de texto y se pinta con el de superficie', () => {
    expect(coloresDelSemaforo('AMARILLO', paleta)).toEqual({
      tinta: paleta.goldInk,
      relleno: paleta.gold,
      lavado: paleta.goldWash,
    });
  });
});
