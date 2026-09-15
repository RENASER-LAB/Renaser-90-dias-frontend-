/**
 * Las cuatro fases del programa: que sean cuatro, que estén en orden, y que sus nombres y rangos
 * sean los del documento del cliente.
 *
 * **Por qué existe este archivo.** Durante meses hubo tres listas de fases vivas a la vez —esta,
 * la de `YoScreen` (que decía tres fases con otros nombres) y un `currentPhase: 1 | 2 | 3` muerto
 * en `types/schema.types.ts`—, y nada rompía: cada una se mostraba en su pantalla y la app
 * compilaba en verde contradiciéndose a sí misma. Un logro llegó a prometer *"Completar la Fase 1:
 * días 1 al 30"* cuando la Fase 1 son 7 días.
 *
 * Estas pruebas fallan contra ese código viejo, que es la única razón válida para escribirlas.
 *
 * La fuente es `RENASER, PROGRAMA Y FASES.docx` §"ESTRUCTURA POR FASES (DÍA 1 AL 90)".
 */
import { describe, expect, it } from '@jest/globals';

import {
  CLAVES_DE_FASE,
  DIAS_DEL_PROGRAMA,
  FASES_EN_ORDEN,
  descripcionDeFase,
  rotuloDeFase,
} from '../useResumenHome';

/** `'Días 8–34'` → `[8, 34]`. Si el formato del rótulo cambia, estas pruebas avisan. */
function diasDelRango(rango: string): [number, number] {
  const encontrados = rango.match(/\d+/g);
  expect(encontrados).toHaveLength(2);
  return [Number(encontrados![0]), Number(encontrados![1])];
}

describe('las fases del programa', () => {
  it('son cuatro, en orden, con los nombres del documento del cliente', () => {
    expect(FASES_EN_ORDEN.map(f => [f.numero, f.nombre, f.rango])).toEqual([
      [1, 'El Espejo', 'Días 1–7'],
      [2, 'El Ciclo Alquímico', 'Días 8–34'],
      [3, 'El Maestro Interno', 'Días 35–64'],
      [4, 'Sistema de Alto Rendimiento', 'Días 65–90'],
    ]);
  });

  it('cubren los 90 días sin huecos ni solapes', () => {
    // Éste es el test que atrapa un "días 1 al 30": un rango mal escrito deja de encajar con el
    // siguiente y la cuenta ya no llega a 90.
    let esperado = 1;
    for (const fase of FASES_EN_ORDEN) {
      const [desde, hasta] = diasDelRango(fase.rango);
      expect(desde).toBe(esperado);
      expect(hasta).toBeGreaterThanOrEqual(desde);
      esperado = hasta + 1;
    }
    expect(esperado - 1).toBe(DIAS_DEL_PROGRAMA);
  });

  it('cada clave del backend tiene su fase, y ninguna sobra', () => {
    expect(FASES_EN_ORDEN.map(f => f.clave)).toEqual([...CLAVES_DE_FASE]);
    for (const clave of CLAVES_DE_FASE) {
      expect(rotuloDeFase(clave)).toBeTruthy();
      expect(descripcionDeFase(clave)).not.toBeNull();
    }
  });

  it('una fase que esta app no conoce no dibuja un rótulo inventado', () => {
    // La regla de tolerancia: si el backend agrega una fase antes que el móvil, se muestra el día
    // sin rótulo en vez de mentir.
    expect(rotuloDeFase('PHASE_5_LO_QUE_SEA')).toBeNull();
    expect(descripcionDeFase('PHASE_5_LO_QUE_SEA')).toBeNull();
  });

  it('sin fase cargada todavía tampoco inventa nada', () => {
    expect(rotuloDeFase(null)).toBeNull();
    expect(rotuloDeFase(undefined)).toBeNull();
    expect(rotuloDeFase('')).toBeNull();
    expect(descripcionDeFase(null)).toBeNull();
  });
});
