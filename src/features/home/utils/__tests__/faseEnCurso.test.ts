/**
 * La fase en la que está alguien, la que leen Plan («Fase actual» y «Arquitectura de tiempo») y la tarjeta
 * de Yo (pedido del dueño, 2026-10-06: «En Yo las fases deben ser iguales que en Plan […] los mismos días
 * que salen en Plan, en "Arquitectura de tiempo"»).
 *
 * Contra el código anterior falla: `faseEnCurso` no existía; Yo hacía su cuenta en
 * `yo/utils/diasDeLaFase.ts` y no tenía el rango («Días 8–34») que muestra Plan.
 */
import { describe, expect, it } from '@jest/globals';

import { FASES_EN_ORDEN } from '../../hooks/useResumenHome';
import { tramosDeLasFases } from '../../../objetivos/utils/arquitecturaDeTiempo';
import { faseEnCurso } from '../faseEnCurso';

/** La regla del backend, `users.api.FasePrograma.paraDiaPrograma` (cortes 8, 35 y 65), copiada solo para el test. */
function faseDelBackend(dia: number): string {
  if (dia >= 65) return 'PHASE_4_ASCENSION';
  if (dia >= 35) return 'PHASE_3_ALCHEMIST_WARRIOR';
  if (dia >= 8) return 'PHASE_2_DEVELOPMENT';
  return 'PHASE_1_REBIRTH';
}

describe('faseEnCurso en el día 30 y en los bordes de cada fase', () => {
  it.each([
    [1, 1, 'El Espejo', 'Días 1–7', 1, 7],
    [7, 1, 'El Espejo', 'Días 1–7', 7, 7],
    [8, 2, 'El Ciclo Alquímico', 'Días 8–34', 1, 27],
    [30, 2, 'El Ciclo Alquímico', 'Días 8–34', 23, 27],
    [34, 2, 'El Ciclo Alquímico', 'Días 8–34', 27, 27],
    [35, 3, 'El Maestro Interno', 'Días 35–64', 1, 30],
    [64, 3, 'El Maestro Interno', 'Días 35–64', 30, 30],
    [65, 4, 'Sistema de Alto Rendimiento', 'Días 65–90', 1, 26],
    [90, 4, 'Sistema de Alto Rendimiento', 'Días 65–90', 26, 26],
  ])('día %i: fase %i, %s, %s, día %i de %i de esta fase', (dia, numero, nombre, rango, diaEnLaFase, total) => {
    const fase = faseEnCurso(faseDelBackend(dia), dia);
    expect(fase).toMatchObject({ numero, nombre, rango, diasDeLaFase: { dia: diaEnLaFase, total } });
  });

  it('del día 1 al 90, es la misma fase que Plan marca «en curso» en «Arquitectura de tiempo»', () => {
    for (let dia = 1; dia <= 90; dia++) {
      const fase = faseEnCurso(faseDelBackend(dia), dia);
      const tramo = tramosDeLasFases(dia, faseDelBackend(dia)).find(t => t.estado === 'en_curso');
      expect([fase?.numero, fase?.nombre, fase?.rango]).toEqual([tramo?.numero, tramo?.nombre, tramo?.rango]);
      // El día dentro de la fase es el relleno del tramo en curso de Plan.
      expect(fase!.diasDeLaFase!.dia / fase!.diasDeLaFase!.total).toBeCloseTo(tramo!.avance, 6);
    }
  });
});

describe('faseEnCurso: la fase la dice el backend, no el día', () => {
  it('si el backend dice otra fase que la que daría el día, manda el backend (como «Fase actual» de Plan)', () => {
    expect(faseEnCurso('PHASE_3_ALCHEMIST_WARRIOR', 34)?.numero).toBe(3);
  });

  it('un día fuera de la fase se acota: la barra no desborda', () => {
    expect(faseEnCurso('PHASE_2_DEVELOPMENT', 40)?.diasDeLaFase).toEqual({ dia: 27, total: 27 });
    expect(faseEnCurso('PHASE_2_DEVELOPMENT', 0)?.diasDeLaFase).toEqual({ dia: 1, total: 27 });
  });

  it('sin fase conocida no hay fase; sin día hay fase pero no días', () => {
    expect(faseEnCurso(null, 5)).toBeNull();
    expect(faseEnCurso('PHASE_9', 5)).toBeNull();
    expect(faseEnCurso('PHASE_2_DEVELOPMENT', null)).toMatchObject({ numero: 2, diasDeLaFase: null });
    expect(faseEnCurso('PHASE_2_DEVELOPMENT', Number.NaN)?.diasDeLaFase).toBeNull();
  });

  it('el rango es el de la tabla única de fases, el mismo texto que Plan', () => {
    for (const f of FASES_EN_ORDEN) expect(faseEnCurso(f.clave, f.primerDia)?.rango).toBe(f.rango);
  });
});
