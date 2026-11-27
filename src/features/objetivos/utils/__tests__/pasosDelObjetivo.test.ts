import { describe, expect, it } from '@jest/globals';

import {
  IDEAS_POR_EJE,
  MAXIMO_DE_LA_UNIDAD,
  UNIDADES_POR_EJE,
  avanceDelCamino,
  definicionDelObjetivo,
  fraseDelObjetivo,
  lineaDelAvance,
  validarNumeros,
  validarObjetivo,
  validarUnidad,
} from '../pasosDelObjetivo';

/** Spec 058 FR-015: «Define tu objetivo» en tres pasos y «Anota tu avance». Solo cambia cómo se pide; el pedido al servidor es el de siempre. */
describe('pasosDelObjetivo', () => {
  // spec 058 FR-015
  it('cada eje ofrece ideas y unidades de un toque, y todas caben en el tope de la unidad', () => {
    for (const eje of ['CUERPO', 'TRABAJO', 'RELACIONES'] as const) {
      expect(IDEAS_POR_EJE[eje].length).toBeGreaterThanOrEqual(3);
      for (const u of UNIDADES_POR_EJE[eje]) expect(u.length).toBeLessThanOrEqual(MAXIMO_DE_LA_UNIDAD);
    }
    expect(IDEAS_POR_EJE.CUERPO).toContain('Bajar de peso');
    expect(UNIDADES_POR_EJE.CUERPO).toContain('kg');
  });

  // spec 058 FR-015
  it('arma la frase con el plazo de la formación y lo que toca por mes', () => {
    expect(fraseDelObjetivo({ base: '82', meta: '76', unidad: 'kg', plazo: '90 días', duracionDias: 90 })).toBe(
      'Tu objetivo: bajar de 82 a 76 kg en 90 días. Son unos 2 kg por mes.',
    );
    expect(fraseDelObjetivo({ base: '10', meta: '22', unidad: 'clientes', plazo: '1 año', duracionDias: 365 })).toBe(
      'Tu objetivo: subir de 10 a 22 clientes en 1 año. Son unos 1 clientes por mes.',
    );
  });

  // spec 058 FR-015
  it('las unidades que ya dicen «por semana» o «al mes» no llevan «por mes», y sin números no hay frase', () => {
    expect(fraseDelObjetivo({ base: '1', meta: '4', unidad: 'días por semana', plazo: '90 días', duracionDias: 90 })).toBe(
      'Tu objetivo: subir de 1 a 4 días por semana en 90 días.',
    );
    expect(fraseDelObjetivo({ base: '', meta: '4', unidad: 'kg', plazo: '90 días' })).toBeNull();
    expect(fraseDelObjetivo({ base: '4', meta: '4', unidad: 'kg', plazo: '90 días' })).toBeNull();
  });

  // spec 058 FR-015
  it('guarda con el mismo pedido de siempre: «Vas en» = «Partiste de»', () => {
    expect(definicionDelObjetivo({ objetivo: ' Bajar de peso ', sinNumero: false, unidad: 'kg', base: '82,5', meta: '76' })).toEqual({
      objetivo: 'Bajar de peso',
      meta: 76,
      avance: 82.5,
      unidad: 'kg',
      lineaBase: 82.5,
    });
  });

  // spec 058 FR-015
  it('«No se mide con un número» guarda solo la declaración', () => {
    expect(definicionDelObjetivo({ objetivo: 'Más tiempo en familia', sinNumero: true, unidad: 'kg', base: '1', meta: '2' })).toEqual({
      objetivo: 'Más tiempo en familia',
    });
  });

  // spec 058 FR-015
  it('dice qué falta en cada paso', () => {
    expect(validarObjetivo('  ').ok).toBe(false);
    expect(validarObjetivo('Vender más').ok).toBe(true);
    expect(validarUnidad('').ok).toBe(false);
    expect(validarUnidad('kg').ok).toBe(true);
    expect(validarNumeros('', '5').ok).toBe(false);
    expect(validarNumeros('-1', '5').ok).toBe(false);
    expect(validarNumeros('5', '-2').ok).toBe(false);
    expect(validarNumeros('5', '5').ok).toBe(false);
    // Llegar a cero es una meta válida: ya hay punto de partida.
    expect(validarNumeros('30', '0').ok).toBe(true);
  });

  // spec 058 FR-015
  it('«Anota tu avance»: cuánto del camino llevas, en las dos direcciones', () => {
    expect(avanceDelCamino(82, 76, 80.5)).toEqual({ recorrido: 1.5, total: 6, porcentaje: 25 });
    expect(avanceDelCamino(0, 100, 40)).toEqual({ recorrido: 40, total: 100, porcentaje: 40 });
    expect(avanceDelCamino(82, 76, 90)?.porcentaje).toBe(0);
    expect(lineaDelAvance(82, 76, 'kg', '80,5')).toBe('Llevas 1,5 de 6 kg · 25 %');
    expect(lineaDelAvance(null, 76, 'kg', '80')).toBeNull();
  });
});
