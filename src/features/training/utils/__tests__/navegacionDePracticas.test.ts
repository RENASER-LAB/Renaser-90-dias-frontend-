import { describe, expect, it } from '@jest/globals';
import { PRACTICAS_ABIERTAS, PRACTICAS_CERRADAS, alRetroceder } from '../navegacionDePracticas';

describe('El retroceso dentro de «Tus prácticas» (AGENTS.md §6)', () => {
  it('con las prácticas cerradas, el atrás no es de esta vista', () => {
    expect(alRetroceder(PRACTICAS_CERRADAS)).toBeNull();
  });

  it('desde la lista de dimensiones, cierra las prácticas', () => {
    expect(alRetroceder(PRACTICAS_ABIERTAS)).toEqual(PRACTICAS_CERRADAS);
  });

  it('desde una dimensión, vuelve a la lista de dimensiones', () => {
    expect(alRetroceder({ ...PRACTICAS_ABIERTAS, dimension: 'CUERPO' })).toEqual(PRACTICAS_ABIERTAS);
  });

  it('desde Planificar, cierra la hoja y se queda en la dimensión', () => {
    expect(alRetroceder({ ...PRACTICAS_ABIERTAS, dimension: 'MENTE', planificando: true, habitoId: 'h1' })).toEqual({
      ...PRACTICAS_ABIERTAS,
      dimension: 'MENTE',
    });
  });

  it('un atrás por vez: nunca salta dos niveles', () => {
    let estado = { ...PRACTICAS_ABIERTAS, dimension: 'CUERPO' as const, planificando: true, habitoId: 'h1' };
    const pasos: string[] = [];
    for (let i = 0; i < 4; i++) {
      const siguiente = alRetroceder(estado);
      if (!siguiente) break;
      pasos.push(`${siguiente.abierta}/${siguiente.dimension}/${siguiente.planificando}`);
      estado = siguiente as typeof estado;
    }
    expect(pasos).toEqual(['true/CUERPO/false', 'true/null/false', 'false/null/false']);
  });
});
