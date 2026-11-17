import { describe, expect, it } from '@jest/globals';

import type { AlumnoConEstado } from '../../../mentor/types/mentor.types';
import { SIN_VISTA, hayPanelAbierto, vistaDeEntradaAlGrupo, vistaDeRegreso, type VistaDelPanel } from '../vistasDeLosPaneles';

/**
 * El atrás de los paneles de rol sube un nivel por vez hasta Yo (AGENTS.md §6; pedido del dueño del 2026-10-31).
 */
const alumno = { participanteId: 'p-1' } as unknown as AlumnoConEstado;
const grupo = { grupoId: 'g-1', nombre: 'Octubre', inicio: null } as unknown as NonNullable<Extract<VistaDelPanel, { tipo: 'cumplimiento' }>['grupo']>;

/** Sigue el «volver» desde `vista` hasta salir a Yo y devuelve los pasos. */
function recorrido(vista: VistaDelPanel, variosGrupos = false): string[] {
  const pasos: string[] = [vista.tipo];
  let actual = vista;
  while (actual.tipo !== 'ninguna' && pasos.length < 10) {
    actual = vistaDeRegreso(actual, variosGrupos);
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
  it.each(['consultas', 'mentores', 'todos', 'habitosDeTodos'] as const)('«%s» vuelve a «Mis mentores» y de ahí a Yo', tipo => {
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
      { tipo: 'habitosDeTodos' },
      { tipo: 'cumplimiento', grupo: null },
    ];
    for (const v of abiertas) expect({ v: v.tipo, abierto: hayPanelAbierto(v) }).toEqual({ v: v.tipo, abierto: true });
  });
});


describe('«Mis grupos» (spec 055)', () => {
  it('con dos o más grupos, la fila de Yo entra a «Mis grupos»; con uno, directo a «Mi grupo»', () => { // spec 055 FR-002, FR-003
    expect(vistaDeEntradaAlGrupo(3)).toEqual({ tipo: 'misGrupos' });
    expect(vistaDeEntradaAlGrupo(2)).toEqual({ tipo: 'misGrupos' });
    expect(vistaDeEntradaAlGrupo(1)).toEqual({ tipo: 'miGrupo', enfocarSemaforo: false });
    expect(vistaDeEntradaAlGrupo(0)).toEqual({ tipo: 'miGrupo', enfocarSemaforo: false });
  });

  it('volver sube un nivel por vez: ficha → Mi grupo → Mis grupos → Yo', () => { // spec 055 FR-003
    expect(recorrido({ tipo: 'alumno', alumno }, true)).toEqual(['alumno', 'miGrupo', 'misGrupos', 'ninguna']);
  });

  it('con un solo grupo, volver desde «Mi grupo» sale a Yo sin pasar por la lista', () => { // spec 055 FR-003
    expect(recorrido({ tipo: 'alumno', alumno }, false)).toEqual(['alumno', 'miGrupo', 'ninguna']);
  });

  it('con «Mis grupos» abierto, Yo no dibuja su lista', () => { // spec 055 FR-003
    expect(hayPanelAbierto({ tipo: 'misGrupos' })).toBe(true);
  });
});
