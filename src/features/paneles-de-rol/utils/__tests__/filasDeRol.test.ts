import { describe, expect, it } from '@jest/globals';

import { filasDeRolEnYo, type EntradaDeLasFilasDeRol } from '../filasDeRol';

/**
 * Qué filas de rol salen en Yo (2026-10-31). Las reglas son las de siempre —el rol, si acompaña un grupo y las entradas de Soporte TI—;
 * lo único nuevo es dónde se dibujan: junto a «Administración», no en Hoy.
 */
const todoPrendido: Pick<EntradaDeLasFilasDeRol, 'miGrupoDisponible' | 'liderDisponible' | 'ticketsDisponible' | 'semaforoDisponible'> = {
  miGrupoDisponible: true,
  liderDisponible: true,
  ticketsDisponible: true,
  semaforoDisponible: true,
};

function entrada(sobre: Partial<EntradaDeLasFilasDeRol>): EntradaDeLasFilasDeRol {
  return { esMentor: false, rol: 'TRAINEE', fallo: null, hayVista: false, ...todoPrendido, ...sobre };
}

describe('el aprendiz', () => {
  it('no ve ninguna: Yo queda como estaba', () => {
    expect(filasDeRolEnYo(entrada({}))).toEqual({ miGrupo: false, misMentores: false });
  });

  it('aunque todas las entradas estén prendidas', () => {
    expect(filasDeRolEnYo(entrada({ rol: 'TRAINEE', esMentor: false }))).toEqual({ miGrupo: false, misMentores: false });
  });
});

describe('«Mi grupo»: el mentor o la guía de aprendiz', () => {
  it.each(['MENTOR', 'TRAINEE_GUIDE', 'GUIA_APRENDIZ'])('%s ve «Mi grupo» y no «Mis mentores»', rol => {
    expect(filasDeRolEnYo(entrada({ rol, esMentor: true, hayVista: true }))).toEqual({ miGrupo: true, misMentores: false });
  });

  it('un mentor que todavía no tiene grupo la conserva (la pantalla se lo explica)', () => {
    expect(filasDeRolEnYo(entrada({ rol: 'MENTOR', esMentor: true, fallo: 'sin_celula' })).miGrupo).toBe(true);
  });

  it('un mentor la ve desde el primer instante, sin esperar a que cargue el grupo', () => {
    expect(filasDeRolEnYo(entrada({ rol: 'MENTOR', esMentor: true, hayVista: false, fallo: null })).miGrupo).toBe(true);
  });

  it('con «Mi grupo» apagada en Soporte TI (`mentor.mi_grupo`) no sale', () => {
    expect(filasDeRolEnYo(entrada({ rol: 'MENTOR', esMentor: true, hayVista: true, miGrupoDisponible: false })).miGrupo).toBe(false);
  });

  it('las entradas del líder (`lider`, `tickets`, `semaforo`) no tocan la del mentor', () => {
    const e = entrada({
      rol: 'MENTOR',
      esMentor: true,
      hayVista: true,
      liderDisponible: false,
      ticketsDisponible: false,
      semaforoDisponible: false,
    });
    expect(filasDeRolEnYo(e)).toEqual({ miGrupo: true, misMentores: false });
  });
});

describe('«Mis mentores»: solo el líder de mentores', () => {
  it.each(['MENTOR_LEAD', 'LIDER_MENTORES'])('%s la ve (las dos nomenclaturas del rol)', rol => {
    expect(filasDeRolEnYo(entrada({ rol, esMentor: true })).misMentores).toBe(true);
  });

  it('ni el mentor, ni el administrador, ni el alquimista la ven', () => {
    for (const rol of ['MENTOR', 'TRAINEE_GUIDE', 'ADMIN', 'ALCHEMIST']) {
      expect({ rol, ve: filasDeRolEnYo(entrada({ rol, esMentor: rol === 'MENTOR' || rol === 'TRAINEE_GUIDE' })).misMentores }).toEqual({ rol, ve: false });
    }
  });

  it('sale con cualquiera de sus tres entradas prendidas', () => {
    const solo = (clave: 'liderDisponible' | 'ticketsDisponible' | 'semaforoDisponible') =>
      filasDeRolEnYo(
        entrada({ rol: 'MENTOR_LEAD', esMentor: true, liderDisponible: false, ticketsDisponible: false, semaforoDisponible: false, [clave]: true }),
      ).misMentores;
    expect(solo('liderDisponible')).toBe(true);
    expect(solo('ticketsDisponible')).toBe(true);
    expect(solo('semaforoDisponible')).toBe(true);
  });

  it('con las tres apagadas en Soporte TI no sale', () => {
    const e = entrada({ rol: 'MENTOR_LEAD', esMentor: true, liderDisponible: false, ticketsDisponible: false, semaforoDisponible: false });
    expect(filasDeRolEnYo(e).misMentores).toBe(false);
  });
});

describe('«Mi grupo» del líder: solo si de verdad acompaña uno', () => {
  const lider = { rol: 'MENTOR_LEAD', esMentor: true } as const;

  it('mientras no se sabe (sin grupo leído ni fallo) no sale: dibujarla para quitarla enseguida es un parpadeo', () => {
    expect(filasDeRolEnYo(entrada({ ...lider, hayVista: false, fallo: null })).miGrupo).toBe(false);
  });

  it('con un grupo leído, sale', () => {
    expect(filasDeRolEnYo(entrada({ ...lider, hayVista: true })).miGrupo).toBe(true);
  });

  it('si el servidor dice que no acompaña ninguno (`sin_celula`), no sale: «Mis mentores» es su única entrada propia', () => {
    expect(filasDeRolEnYo(entrada({ ...lider, hayVista: false, fallo: 'sin_celula' }))).toEqual({ miGrupo: false, misMentores: true });
  });

  it('si la lectura falló por la red o un error, sale para poder reintentar', () => {
    for (const fallo of ['sin_red', 'error', 'no_disponible', 'sin_permiso'] as const) {
      expect({ fallo, sale: filasDeRolEnYo(entrada({ ...lider, fallo })).miGrupo }).toEqual({ fallo, sale: true });
    }
  });

  it('el líder que acompaña un grupo ve las dos filas', () => {
    expect(filasDeRolEnYo(entrada({ ...lider, hayVista: true }))).toEqual({ miGrupo: true, misMentores: true });
  });
});
