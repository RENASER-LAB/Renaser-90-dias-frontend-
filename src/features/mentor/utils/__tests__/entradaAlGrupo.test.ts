/**
 * Cuándo se dibuja la entrada a «Mi grupo».
 *
 * **La prueba que falla contra el código viejo es la primera.** Hasta ahora la condición era
 * `esMentor ? <TarjetaMentorHoy/> : null`, es decir: siempre que la persona contara como mentor.
 * Para un LÍDER DE MENTORES eso significaba una tarjeta permanentemente muerta, porque el backend
 * no le deja tener grupo asignado.
 *
 * Las otras existen para que el arreglo no se pase de largo: esconder la entrada cuando hubo un
 * error de red, o cuando todavía está cargando, dejaría a alguien que SÍ tiene grupo sin forma de
 * llegar a él.
 */
import { describe, expect, it } from '@jest/globals';

import { entradaAlGrupoVisible, esLiderDeMentores } from '../entradaAlGrupo';

describe('entradaAlGrupoVisible', () => {
  it('la esconde para un líder de mentores que no acompaña ningún grupo', () => {
    expect(entradaAlGrupoVisible({ esMentor: true, rol: 'MENTOR_LEAD', fallo: 'sin_celula' })).toBe(
      false,
    );
  });

  it('la esconde también con el nombre del rol en castellano', () => {
    expect(
      entradaAlGrupoVisible({ esMentor: true, rol: 'LIDER_MENTORES', fallo: 'sin_celula' }),
    ).toBe(false);
  });

  /* Si de verdad tiene una asignación —heredada o no—, la sigue viendo. Es el caso que impide
     resolver esto sacando a MENTOR_LEAD de `ROL_MENTOR`. */
  it('la mantiene para un líder de mentores que sí acompaña un grupo', () => {
    expect(entradaAlGrupoVisible({ esMentor: true, rol: 'MENTOR_LEAD', fallo: null })).toBe(true);
  });

  it('no esconde nada cuando no se sabe si tiene grupo', () => {
    for (const fallo of ['sin_red', 'error', 'no_disponible', 'sin_permiso'] as const) {
      expect(entradaAlGrupoVisible({ esMentor: true, rol: 'MENTOR_LEAD', fallo })).toBe(true);
    }
  });

  it('no le cambia nada a un mentor, tenga grupo o no', () => {
    expect(entradaAlGrupoVisible({ esMentor: true, rol: 'MENTOR', fallo: 'sin_celula' })).toBe(true);
    expect(entradaAlGrupoVisible({ esMentor: true, rol: 'MENTOR', fallo: null })).toBe(true);
  });

  it('sigue sin dibujarse para quien no acompaña células', () => {
    expect(entradaAlGrupoVisible({ esMentor: false, rol: 'TRAINEE', fallo: null })).toBe(false);
    expect(entradaAlGrupoVisible({ esMentor: false, rol: 'MENTOR_LEAD', fallo: null })).toBe(false);
  });

  it('un rol desconocido no se trata como líder', () => {
    expect(entradaAlGrupoVisible({ esMentor: true, rol: null, fallo: 'sin_celula' })).toBe(true);
    expect(entradaAlGrupoVisible({ esMentor: true, rol: 'ASSISTANT', fallo: 'sin_celula' })).toBe(
      true,
    );
  });
});

describe('esLiderDeMentores', () => {
  it('acepta las dos nomenclaturas y no confunde a un mentor', () => {
    expect(esLiderDeMentores('MENTOR_LEAD')).toBe(true);
    expect(esLiderDeMentores('LIDER_MENTORES')).toBe(true);
    expect(esLiderDeMentores('mentor_lead')).toBe(true);
    expect(esLiderDeMentores('MENTOR')).toBe(false);
    expect(esLiderDeMentores(null)).toBe(false);
  });
});
