import { describe, expect, it } from '@jest/globals';

import { aPapel, papelesDeHoy, papelQueSeVe, type LoQueTieneLaCuenta } from '../papelesDeHoy';

/**
 * Spec 018, FR-001 a FR-004: quién ve el control de papel de Hoy y qué opciones trae.
 *
 * El control es para quien lidera mentores. El aprendiz y el mentor que solo es mentor ven Hoy como siempre, y con un
 * solo papel disponible tampoco hay control.
 */

const lider: LoQueTieneLaCuenta = { esLider: true, tienePrograma: true, tieneGrupo: true, tieneMentores: true };

describe('quién ve el control', () => {
  it('un aprendiz no lo ve: Hoy es el de siempre', () => {
    expect(papelesDeHoy({ esLider: false, tienePrograma: true, tieneGrupo: false, tieneMentores: false })).toEqual([]);
  });

  it('un mentor que solo es mentor tampoco: conserva su tarjeta «Mi grupo» y su día', () => {
    expect(papelesDeHoy({ esLider: false, tienePrograma: true, tieneGrupo: true, tieneMentores: false })).toEqual([]);
  });

  it('ni un cargo que ve las tres cosas sin ser líder (Administración tiene su propia entrada)', () => {
    expect(papelesDeHoy({ ...lider, esLider: false })).toEqual([]);
  });

  it('el líder que además acompaña un grupo y hace su programa ve las tres opciones, en ese orden', () => {
    expect(papelesDeHoy(lider)).toEqual(['programa', 'grupo', 'mentores']);
  });

  it('el líder sin grupo no tiene «Mi grupo»: le quedan su programa y sus mentores', () => {
    expect(papelesDeHoy({ ...lider, tieneGrupo: false })).toEqual(['programa', 'mentores']);
  });

  it('con una entrada apagada por Soporte TI, esa opción no se ofrece', () => {
    expect(papelesDeHoy({ ...lider, tieneMentores: false })).toEqual(['programa', 'grupo']);
    expect(papelesDeHoy({ ...lider, tienePrograma: false })).toEqual(['grupo', 'mentores']);
  });

  it('con un solo papel disponible no hay control (un selector de una opción es ruido)', () => {
    expect(papelesDeHoy({ ...lider, tieneGrupo: false, tieneMentores: false })).toEqual([]);
    expect(papelesDeHoy({ ...lider, tienePrograma: false, tieneGrupo: false })).toEqual([]);
  });
});

describe('qué papel se ve', () => {
  const tres = papelesDeHoy(lider);

  it('el último que eligió, mientras lo tenga', () => {
    expect(papelQueSeVe(tres, 'mentores')).toBe('mentores');
    expect(papelQueSeVe(tres, 'grupo')).toBe('grupo');
  });

  it('si nunca eligió, «Mi programa»: Hoy sigue siendo su día', () => {
    expect(papelQueSeVe(tres, null)).toBe('programa');
  });

  it('si lo que eligió ya no le corresponde (dejó de acompañar un grupo), vuelve al primero', () => {
    expect(papelQueSeVe(['programa', 'mentores'], 'grupo')).toBe('programa');
  });

  it('sin control no hay papel que ver', () => {
    expect(papelQueSeVe([], 'mentores')).toBeNull();
  });
});

describe('lo guardado', () => {
  it('solo se aceptan los tres papeles; cualquier otra cosa es «sin elección»', () => {
    expect(aPapel('programa')).toBe('programa');
    expect(aPapel('grupo')).toBe('grupo');
    expect(aPapel('mentores')).toBe('mentores');
    for (const raro of ['Mentores', '', 'admin', null, undefined]) expect(aPapel(raro)).toBeNull();
  });
});
