/**
 * La tarjeta «Tu tribu» de Comunidad → Tribu (bug del 2026-09-26, captura del dueño).
 *
 * Contra el código viejo falla el caso del mentor: la pantalla armaba la tarjeta SOLO con
 * `/me/cell` —que a un mentor le responde `{assigned:false}`— y mostraba siempre el bloque del
 * mentor, así que un mentor leía «Todavía no tienes un mentor asignado» y «Todavía no tienes
 * integrantes en tu grupo» debajo de su propio grupo con dos aprendices.
 */
import { describe, expect, it } from '@jest/globals';

import type { CelulaDelAprendiz } from '../../types/community.types';
import { decidirTarjetaDeTribu, esAprendiz } from '../tarjetaDeTribu';

function grupo(cellId: string, cellName: string): CelulaDelAprendiz {
  return {
    cellId,
    cellName,
    cohortName: 'Cohorte 1',
    cohortStatus: 'ACTIVE',
    mentorName: 'Mentor Uno',
    mentorAvatarUrl: null,
    memberCount: 2,
    totalCellsInCohort: 1,
    videoCallUrl: null,
    nextSessionAt: null,
  };
}

const FENIX = grupo('g-fenix', 'Grupo Fénix (prueba)');
const AGUILA = grupo('g-aguila', 'Grupo Águila');

describe('decidirTarjetaDeTribu', () => {
  it('un mentor sin grupo como aprendiz ve SU grupo de /me/cells y no el bloque del mentor', () => {
    const tarjeta = decidirTarjetaDeTribu({
      rol: 'MENTOR',
      miCelula: { assigned: false },
      grupos: [FENIX],
      gruposCargando: false,
    });
    expect(tarjeta.mostrarMentor).toBe(false);
    expect(tarjeta.grupo).toEqual({ fuente: 'mis-grupos', celula: FENIX });
  });

  it('con varios grupos usa el elegido, y si no hay elección el primero', () => {
    const base = { rol: 'MENTOR', miCelula: { assigned: false } as const, grupos: [FENIX, AGUILA], gruposCargando: false };
    expect(decidirTarjetaDeTribu(base).grupo).toEqual({ fuente: 'mis-grupos', celula: FENIX });
    expect(decidirTarjetaDeTribu({ ...base, grupoElegidoId: 'g-aguila' }).grupo).toEqual({
      fuente: 'mis-grupos',
      celula: AGUILA,
    });
    // Un id que ya no está en la lista (salió del grupo) no deja la tarjeta vacía.
    expect(decidirTarjetaDeTribu({ ...base, grupoElegidoId: 'g-viejo' }).grupo).toEqual({
      fuente: 'mis-grupos',
      celula: FENIX,
    });
  });

  it('un aprendiz con grupo sigue como siempre: /me/cell y el bloque del mentor', () => {
    const tarjeta = decidirTarjetaDeTribu({
      rol: 'TRAINEE',
      miCelula: {
        assigned: true,
        cellId: 'g-fenix',
        cellName: 'Grupo Fénix (prueba)',
        cohortName: 'Cohorte 1',
        cohortStatus: 'ACTIVE',
        mentorName: 'Mentor Uno',
        mentorAvatarUrl: null,
        memberCount: 2,
        totalCellsInCohort: 1,
        videoCallUrl: null,
        nextSessionAt: null,
      },
      grupos: [FENIX],
      gruposCargando: false,
    });
    expect(tarjeta).toEqual({ mostrarMentor: true, grupo: { fuente: 'mi-celula' } });
  });

  it('un aprendiz sin grupo sigue viendo «todavía no tienes mentor»', () => {
    const tarjeta = decidirTarjetaDeTribu({
      rol: 'TRAINEE',
      miCelula: { assigned: false },
      grupos: [],
      gruposCargando: false,
    });
    expect(tarjeta).toEqual({ mostrarMentor: true, grupo: { fuente: 'ninguno' } });
  });

  it('el staff sin grupos no ve el bloque del mentor', () => {
    const tarjeta = decidirTarjetaDeTribu({ rol: 'ADMIN', miCelula: { assigned: false }, grupos: [], gruposCargando: false });
    expect(tarjeta).toEqual({ mostrarMentor: false, grupo: { fuente: 'ninguno' } });
  });

  it('mientras /me/cell o /me/cells cargan, no dice «no tienes integrantes»', () => {
    expect(decidirTarjetaDeTribu({ rol: 'MENTOR', miCelula: null, grupos: [], gruposCargando: false }).grupo).toEqual({
      fuente: 'cargando',
    });
    expect(
      decidirTarjetaDeTribu({ rol: 'MENTOR', miCelula: { assigned: false }, grupos: [], gruposCargando: true }).grupo
    ).toEqual({ fuente: 'cargando' });
  });
});

describe('esAprendiz', () => {
  it('sin rol conocido cuenta como aprendiz; mentores y staff no', () => {
    expect(esAprendiz(undefined)).toBe(true);
    expect(esAprendiz('trainee')).toBe(true);
    expect(esAprendiz('MENTOR')).toBe(false);
    expect(esAprendiz('MENTOR_LEAD')).toBe(false);
    expect(esAprendiz('ALCHEMIST')).toBe(false);
  });
});
