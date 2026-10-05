/**
 * «Arquitectura de tiempo» de Plan: las cuatro fases del programa, cada una de su largo (rediseño de
 * Plan, 2026-10-05, decisión del dueño: «4 fases que mencionas»).
 *
 * Contra el código anterior falla entera: `tramosDeLasFases` no existía y la pantalla dibujaba tres
 * tramos parejos de 30 días (`TRAMOS_DEL_RECORRIDO`, 1–30 / 31–60 / 61–90) que no son fases del
 * método, debajo de un rótulo que decía «Fase 02 · Días 8–34».
 */
import { describe, expect, it } from '@jest/globals';

import { DIAS_DEL_PROGRAMA, FASES_EN_ORDEN } from '../../../home/hooks/useResumenHome';
import { tramosDeLasFases } from '../arquitecturaDeTiempo';

describe('las fases como números', () => {
  it('cada fase trae sus días como números, y el rótulo sale de ellos', () => {
    for (const fase of FASES_EN_ORDEN) {
      expect(fase.rango).toBe(`Días ${fase.primerDia}–${fase.ultimoDia}`);
    }
  });

  it('los cortes son los del backend (`users.api.FasePrograma`: 8, 35 y 65) y cubren los 90 días', () => {
    expect(FASES_EN_ORDEN.map(f => f.primerDia)).toEqual([1, 8, 35, 65]);
    let esperado = 1;
    for (const fase of FASES_EN_ORDEN) {
      expect(fase.primerDia).toBe(esperado);
      esperado = fase.ultimoDia + 1;
    }
    expect(esperado - 1).toBe(DIAS_DEL_PROGRAMA);
  });
});

describe('tramosDeLasFases', () => {
  it('dibuja cuatro tramos, uno por fase, con el largo de cada una (no tres de 30)', () => {
    const tramos = tramosDeLasFases(15, 'PHASE_2_DEVELOPMENT');
    expect(tramos.map(t => [t.numero, t.nombre, t.rango, t.dias])).toEqual([
      [1, 'El Espejo', 'Días 1–7', 7],
      [2, 'El Ciclo Alquímico', 'Días 8–34', 27],
      [3, 'El Maestro Interno', 'Días 35–64', 30],
      [4, 'Sistema de Alto Rendimiento', 'Días 65–90', 26],
    ]);
    expect(tramos.reduce((suma, t) => suma + t.dias, 0)).toBe(90);
  });

  it('día 15: la primera cumplida, la segunda en curso y rellena hasta su día 8 de 27', () => {
    const tramos = tramosDeLasFases(15, 'PHASE_2_DEVELOPMENT');
    expect(tramos.map(t => t.estado)).toEqual(['cumplida', 'en_curso', 'por_venir', 'por_venir']);
    expect(tramos[0].avance).toBe(1);
    expect(tramos[1].avance).toBeCloseTo(8 / 27, 6);
    expect(tramos[2].avance).toBe(0);
    expect(tramos[3].avance).toBe(0);
  });

  it('la fase en curso la dice el backend, como el rótulo «Fase actual» de arriba', () => {
    // Un día que por el cálculo caería en la fase 2, pero el backend ya dice la 3: manda el backend.
    expect(tramosDeLasFases(34, 'PHASE_3_ALCHEMIST_WARRIOR').map(t => t.estado)).toEqual([
      'cumplida',
      'cumplida',
      'en_curso',
      'por_venir',
    ]);
  });

  it('sin fase del backend (o una que la app no conoce), se deduce del día', () => {
    expect(tramosDeLasFases(40, null).map(t => t.estado)).toEqual(['cumplida', 'cumplida', 'en_curso', 'por_venir']);
    expect(tramosDeLasFases(7, 'PHASE_9_NUEVA').map(t => t.estado)).toEqual([
      'en_curso',
      'por_venir',
      'por_venir',
      'por_venir',
    ]);
  });

  it('sin día conocido (cargando o antes del Día 1) no rellena nada ni inventa una fase', () => {
    const tramos = tramosDeLasFases(null, null);
    expect(tramos.every(t => t.avance === 0)).toBe(true);
    expect(tramos.every(t => t.estado === 'por_venir')).toBe(true);
    expect(tramosDeLasFases(0, null).every(t => t.estado === 'por_venir')).toBe(true);
  });

  it('el Día 90 deja las tres primeras cumplidas y la última llena y en curso', () => {
    const tramos = tramosDeLasFases(90, null);
    expect(tramos.map(t => t.estado)).toEqual(['cumplida', 'cumplida', 'cumplida', 'en_curso']);
    expect(tramos.every(t => t.avance === 1)).toBe(true);
  });
});
