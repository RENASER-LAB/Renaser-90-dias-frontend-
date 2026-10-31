import { describe, expect, it } from '@jest/globals';
import { PRACTICAS_ABIERTAS, PRACTICAS_CERRADAS, alRetroceder, type EstadoDePracticas } from '../navegacionDePracticas';

describe('El retroceso dentro de «Tus prácticas» (AGENTS.md §6)', () => {
  it('con las prácticas cerradas, el atrás no es de esta vista', () => {
    expect(alRetroceder(PRACTICAS_CERRADAS)).toBeNull();
  });

  it('desde la lista de dimensiones, cierra las prácticas y vuelve a Training', () => {
    expect(alRetroceder(PRACTICAS_ABIERTAS)).toEqual(PRACTICAS_CERRADAS);
  });

  it('con la hoja de una dimensión abierta, vuelve a «Tus prácticas» (ya no hay un detalle en el medio)', () => {
    expect(alRetroceder({ ...PRACTICAS_ABIERTAS, dimension: 'CUERPO' })).toEqual(PRACTICAS_ABIERTAS);
    expect(alRetroceder({ ...PRACTICAS_ABIERTAS, dimension: 'VIDA Y NEGOCIO' })).toEqual(PRACTICAS_ABIERTAS);
  });

  it('el estado ya no conoce niveles intermedios: solo si está abierta y qué dimensión', () => {
    expect(Object.keys(PRACTICAS_ABIERTAS).sort()).toEqual(['abierta', 'dimension']);
  });

  it('un atrás por vez: la hoja → «Tus prácticas» → Training; nunca salta dos niveles', () => {
    let estado: EstadoDePracticas = { ...PRACTICAS_ABIERTAS, dimension: 'CUERPO' };
    const pasos: string[] = [];
    for (let i = 0; i < 4; i++) {
      const siguiente = alRetroceder(estado);
      if (!siguiente) break;
      pasos.push(`${siguiente.abierta}/${siguiente.dimension}`);
      estado = siguiente;
    }
    expect(pasos).toEqual(['true/null', 'false/null']);
  });
});
