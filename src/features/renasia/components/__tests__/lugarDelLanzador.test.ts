/**
 * Las medidas del botón flotante de SER salen de un solo lugar (`lugarDelLanzador.ts`), y el botón
 * no se movió al sacarlas de `RenasiaLauncher` (2026-10-05).
 */
import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  ALTO_TAB_BAR,
  ANCHO_PARA_LANZADOR,
  DIAMETRO,
  ESPACIO_PARA_LANZADOR,
  MARGEN_DERECHO,
  SEPARACION,
  entradaParaElLanzador,
} from '../lugarDelLanzador';

const LANZADOR = readFileSync(join(__dirname, '..', 'RenasiaLauncher.tsx'), 'utf8');

describe('el lugar del botón de SER', () => {
  it('sigue donde estaba: 52 de diámetro, a 18 del borde y a 16 sobre la barra de 62', () => {
    expect({ ALTO_TAB_BAR, SEPARACION, DIAMETRO, MARGEN_DERECHO, ESPACIO_PARA_LANZADOR }).toEqual({
      ALTO_TAB_BAR: 62,
      SEPARACION: 16,
      DIAMETRO: 52,
      MARGEN_DERECHO: 18,
      ESPACIO_PARA_LANZADOR: 88,
    });
  });

  it('el botón se dibuja con estas medidas, no con números propios', () => {
    expect(LANZADOR).toMatch(/from '\.\/lugarDelLanzador'/);
    expect(LANZADOR).toMatch(/bottom: insets\.bottom \+ ALTO_TAB_BAR \+ SEPARACION/);
    expect(LANZADOR).toMatch(/right: MARGEN_DERECHO/);
    expect(LANZADOR).not.toMatch(/const (ALTO_TAB_BAR|SEPARACION|DIAMETRO) =/);
    expect(LANZADOR).not.toMatch(/right: \d/);
  });

  it('cuánto entrar para no quedar debajo: lo que falta del margen, nunca negativo', () => {
    expect(ANCHO_PARA_LANZADOR).toBe(86);
    expect(entradaParaElLanzador(24)).toBe(62);
    expect(entradaParaElLanzador(20)).toBe(66);
    expect(entradaParaElLanzador(120)).toBe(0);
  });
});
