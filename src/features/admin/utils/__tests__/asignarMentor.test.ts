/**
 * ADM-13 del e2e del 2026-09-27 (E-372, P0): «Asignar mentor» llamaba siempre al TRASLADO, y el mentor
 * quedaba afuera de sus otros grupos, que se quedaban sin mentor, en silencio. Desde D-141 un mentor puede
 * liderar varios grupos: por defecto se SUMA, y el traslado es una opción aparte que nombra los grupos que
 * pierden su mentor. Fallan contra el código anterior (estas funciones no existían y la pregunta decía
 * «Hoy ya acompaña otro grupo.»).
 */
import { describe, expect, it } from '@jest/globals';

import {
  avisoDeTrasladoDeMentor,
  listaDeNombres,
  nombresDeLosGrupos,
  otrosGruposDelMentor,
  planParaAsignarMentor,
  preguntaDeAsignarMentor,
  yaLideraEsteGrupo,
} from '../asignarMentor';

const FENIX = 'g-fenix';

describe('los grupos que el mentor ya lidera', () => {
  it('salen de cellIds (D-141), sin contar este', () => {
    expect(otrosGruposDelMentor({ cellId: 'g-a', cellIds: ['g-a', FENIX, 'g-b'] }, FENIX)).toEqual(['g-a', 'g-b']);
  });

  it('un backend anterior solo manda cellId: se usa ese', () => {
    expect(otrosGruposDelMentor({ cellId: 'g-a' }, FENIX)).toEqual(['g-a']);
    expect(otrosGruposDelMentor({ cellId: null, cellIds: [] }, FENIX)).toEqual([]);
  });

  it('si ya lidera este grupo se sabe, aunque no sea el primero de la lista', () => {
    expect(yaLideraEsteGrupo({ cellId: 'g-a', cellIds: ['g-a', FENIX] }, FENIX)).toBe(true);
    expect(yaLideraEsteGrupo({ cellId: 'g-a', cellIds: ['g-a'] }, FENIX)).toBe(false);
  });
});

describe('qué hace «Asignar» (por defecto, SUMAR)', () => {
  const mentor = (cellIds: string[]) => ({ userId: 'u-luz', cellId: cellIds[0] ?? null, cellIds });

  it('si ya lo lidera, nada', () => {
    expect(planParaAsignarMentor({ grupoId: FENIX, mentorDelGrupoId: 'u-luz', mentor: mentor([FENIX]) })).toEqual({
      tipo: 'nada',
    });
  });

  it('si no lidera otros grupos, el traslado es lo mismo que sumar: una sola llamada, que además cambia al mentor que hubiera', () => {
    expect(planParaAsignarMentor({ grupoId: FENIX, mentorDelGrupoId: 'u-otro', mentor: mentor([]) })).toEqual({
      tipo: 'asignar',
    });
  });

  it('si lidera otros grupos, se SUMA y los conserva', () => {
    expect(planParaAsignarMentor({ grupoId: FENIX, mentorDelGrupoId: null, mentor: mentor(['g-a']) })).toEqual({
      tipo: 'sumar',
      quitarAlActual: false,
    });
  });

  it('y si este grupo tiene otro mentor, antes se lo quita (un grupo tiene un solo mentor)', () => {
    expect(planParaAsignarMentor({ grupoId: FENIX, mentorDelGrupoId: 'u-otro', mentor: mentor(['g-a']) })).toEqual({
      tipo: 'sumar',
      quitarAlActual: true,
    });
  });
});

describe('lo que se le pregunta al administrador', () => {
  it('sin otros grupos: asignar', () => {
    expect(preguntaDeAsignarMentor('Luz Ramos', 'Fénix', [])).toBe('¿Asignar a Luz Ramos como mentor de Fénix?');
  });

  it('con otros grupos: sumar, y dice cuáles conserva', () => {
    expect(preguntaDeAsignarMentor('Luz Ramos', 'Fénix', ['Aurora', 'Brisa'])).toBe(
      '¿Sumar a Luz Ramos como mentor de Fénix? Sigue acompañando a Aurora y Brisa.'
    );
  });

  it('el traslado nombra los grupos que se quedan sin mentor', () => {
    expect(avisoDeTrasladoDeMentor('Luz Ramos', 'Fénix', ['Aurora', 'Brisa', 'Cielo'])).toBe(
      'Si trasladas a Luz Ramos a Fénix, deja de acompañar a Aurora, Brisa y Cielo, que se quedan sin mentor.'
    );
  });

  it('sin nombres no deja huecos', () => {
    expect(preguntaDeAsignarMentor(null, '  ', [])).toBe('¿Asignar a esta persona como mentor de este grupo?');
  });
});

describe('los nombres de los grupos', () => {
  it('se buscan por id; los que no se conocen se dicen sin inventar un nombre', () => {
    expect(nombresDeLosGrupos(['g-a', 'g-x', 'g-y'], { 'g-a': 'Aurora' })).toEqual(['Aurora', '2 grupos más']);
    expect(nombresDeLosGrupos(['g-x'], {})).toEqual(['1 grupo más']);
  });

  it('se leen como en castellano', () => {
    expect(listaDeNombres(['Aurora'])).toBe('Aurora');
    expect(listaDeNombres(['Aurora', 'Brisa'])).toBe('Aurora y Brisa');
    expect(listaDeNombres(['Aurora', 'Brisa', 'Cielo'])).toBe('Aurora, Brisa y Cielo');
  });
});
