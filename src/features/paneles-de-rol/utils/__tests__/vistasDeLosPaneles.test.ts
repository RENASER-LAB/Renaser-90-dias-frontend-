import { describe, expect, it } from '@jest/globals';

import type { AlumnoConEstado } from '../../../mentor/types/mentor.types';
import { SIN_VISTA, hayPanelAbierto, vistaDeRegreso, type VistaDelPanel } from '../vistasDeLosPaneles';

/**
 * El atrás de los paneles de rol sube un nivel por vez hasta Yo (AGENTS.md §6; pedido del dueño del 2026-10-31).
 */
const alumno = { participanteId: 'p-1' } as unknown as AlumnoConEstado;
const grupo = { grupoId: 'g-1', nombre: 'Octubre', inicio: null } as unknown as NonNullable<Extract<VistaDelPanel, { tipo: 'cumplimiento' }>['grupo']>;

/** Sigue el «volver» desde `vista` hasta salir a Yo y devuelve los pasos. */
function recorrido(vista: VistaDelPanel): string[] {
  const pasos: string[] = [vista.tipo];
  let actual = vista;
  while (actual.tipo !== 'ninguna' && pasos.length < 10) {
    actual = vistaDeRegreso(actual);
    pasos.push(actual.tipo);
  }
  return pasos;
}

describe('«Mi grupo»', () => {
  it('la ficha de un aprendiz vuelve a «Mi grupo», y «Mi grupo» vuelve a Yo', () => {
    expect(recorrido({ tipo: 'alumno', alumno })).toEqual(['alumno', 'miGrupo', 'ninguna']);
  });

  it('volver desde «Mi grupo» deja la ficha sin abrir y sin enfocar el semáforo', () => {
    expect(vistaDeRegreso({ tipo: 'alumno', alumno })).toEqual({ tipo: 'miGrupo', enfocarSemaforo: false });
  });
});

describe('«Mis mentores»', () => {
  it.each(['consultas', 'mentores', 'todos'] as const)('«%s» vuelve a «Mis mentores» y de ahí a Yo', tipo => {
    expect(recorrido({ tipo })).toEqual([tipo, 'misMentores', 'ninguna']);
  });

  it('el resultado por grupo (abierto directo en un grupo o el resumen general) vuelve a «Mis mentores»', () => {
    expect(recorrido({ tipo: 'cumplimiento', grupo })).toEqual(['cumplimiento', 'misMentores', 'ninguna']);
    expect(recorrido({ tipo: 'cumplimiento', grupo: null })).toEqual(['cumplimiento', 'misMentores', 'ninguna']);
  });
});

describe('Yo', () => {
  it('sin panel abierto, volver no hace nada y Yo dibuja su lista', () => {
    expect(vistaDeRegreso(SIN_VISTA)).toEqual(SIN_VISTA);
    expect(hayPanelAbierto(SIN_VISTA)).toBe(false);
  });

  it('con cualquier panel abierto, Yo no dibuja su lista', () => {
    const abiertas: VistaDelPanel[] = [
      { tipo: 'miGrupo', enfocarSemaforo: true },
      { tipo: 'alumno', alumno },
      { tipo: 'misMentores' },
      { tipo: 'consultas' },
      { tipo: 'mentores' },
      { tipo: 'todos' },
      { tipo: 'cumplimiento', grupo: null },
    ];
    for (const v of abiertas) expect({ v: v.tipo, abierto: hayPanelAbierto(v) }).toEqual({ v: v.tipo, abierto: true });
  });
});
