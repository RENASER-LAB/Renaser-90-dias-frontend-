/**
 * La ficha que se abre desde la info del grupo (D-207) es la misma que abre «Mi grupo».
 */
import { describe, expect, it } from '@jest/globals';

import { conEstado } from '../../reglas';
import { alumnoDesdeLaInfo } from '../alumnoDesdeLaInfo';

const ANA = conEstado({
  participanteId: 'u-ana',
  nombre: 'Ana Pérez',
  diaPrograma: 12,
  ultimaActividadEn: null,
  habitosProgramados: null,
  habitosCumplidos: null,
  evidenciasPendientes: 2,
});

describe('alumnoDesdeLaInfo', () => {
  it('si «Mi grupo» ya la tiene en el padrón de ESE grupo, es el mismo alumno', () => {
    const alumno = alumnoDesdeLaInfo({ usuarioId: 'u-ana', nombre: 'Ana Pérez' }, 'g-1', {
      grupoId: 'g-1',
      alumnos: [ANA],
    });

    expect(alumno).toBe(ANA);
  });

  it('si «Mi grupo» muestra OTRO grupo, no se toma de ahí: se arma con lo de la info', () => {
    const alumno = alumnoDesdeLaInfo({ usuarioId: 'u-ana', nombre: 'Ana Pérez' }, 'g-2', {
      grupoId: 'g-1',
      alumnos: [ANA],
    });

    expect(alumno).not.toBe(ANA);
    expect(alumno).toMatchObject({ participanteId: 'u-ana', nombre: 'Ana Pérez', diaPrograma: null });
  });

  it('sin padrón, lo de seguimiento va en null («no se sabe»), nunca en cero', () => {
    const alumno = alumnoDesdeLaInfo({ usuarioId: 'u-beto', nombre: 'Beto Díaz' }, 'g-1', null);

    expect(alumno).toEqual({
      participanteId: 'u-beto',
      nombre: 'Beto Díaz',
      diaPrograma: null,
      ultimaActividadEn: null,
      habitosProgramados: null,
      habitosCumplidos: null,
      evidenciasPendientes: null,
      motivos: [],
      requiereSeguimiento: false,
      evaluable: false,
      cumplimiento: null,
    });
  });
});
