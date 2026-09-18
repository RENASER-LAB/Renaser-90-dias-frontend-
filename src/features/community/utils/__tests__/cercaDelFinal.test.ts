/**
 * El disparador del lazy loading del Muro.
 *
 * Antes de 2026-09-18 el Muro pedía UNA página y ahí se quedaba, aunque `GET /api/v1/wall` viniera
 * paginado por cursor desde siempre. Estas pruebas fijan cuándo se pide la siguiente.
 */
import { describe, expect, it } from '@jest/globals';

import { MARGEN_PARA_PEDIR_MAS, estaCercaDelFinal } from '../cercaDelFinal';

/** Una pantalla de 800 px sobre un contenido de `alto` px, desplazada `y`. */
function scroll(y: number, alto: number) {
  return { layoutMeasurement: { height: 800 }, contentOffset: { y }, contentSize: { height: alto } };
}

describe('estaCercaDelFinal', () => {
  it('arriba del todo, con contenido largo, no pide nada', () => {
    expect(estaCercaDelFinal(scroll(0, 10_000))).toBe(false);
  });

  it('pide cuando faltan menos de una pantalla y media', () => {
    // 10 000 de contenido, 800 de pantalla: el umbral cae en y = 10 000 - 800 - 900 = 8 300.
    expect(estaCercaDelFinal(scroll(8_299, 10_000))).toBe(false);
    expect(estaCercaDelFinal(scroll(8_300, 10_000))).toBe(true);
  });

  it('al fondo del todo, pide', () => {
    expect(estaCercaDelFinal(scroll(9_200, 10_000))).toBe(true);
  });

  it('si todo entra en la pantalla, pide sin que nadie se mueva', () => {
    // Tres publicaciones que no llenan la pantalla: no hay nada que desplazar, así que si el
    // servidor dice que hay más, esta es la única forma de que lleguen.
    expect(estaCercaDelFinal(scroll(0, 600))).toBe(true);
  });

  it('el margen es el que dice la constante, no un numero suelto en la pantalla', () => {
    expect(MARGEN_PARA_PEDIR_MAS).toBe(900);
  });
});
