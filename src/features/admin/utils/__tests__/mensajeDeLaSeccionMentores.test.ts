import { describe, expect, it } from '@jest/globals';

import { mensajeDeLaSeccionMentores } from '../mensajes';

/** El estado en que la sección sí puede afirmar cosas: las dos consultas terminaron y anduvieron. */
const TODO_BIEN = {
  falloElListadoDeGrupos: false,
  falloElListadoDeStaff: false,
  cargando: false,
  hayFilas: false,
};

/**
 * Qué dice la sección «Mentores» de «Staff y roles».
 *
 * Las pruebas que importan son las tres primeras: **con la condición vieja, la pantalla afirmaba
 * «Todavía no hay mentores» aunque la carga se hubiera caído**. El código anterior era
 * `mentoresVisibles.length === 0 && !cargando && !cargandoStaff`, que no miraba ningún error; con
 * la lista vacía por fallo, caía igual en la rama de "no hay". Estos casos fallan contra ese
 * código.
 */
describe('mensajeDeLaSeccionMentores', () => {
  it('no afirma que no hay mentores si falló el listado de los grupos', () => {
    const mensaje = mensajeDeLaSeccionMentores({ ...TODO_BIEN, falloElListadoDeGrupos: true });
    expect(mensaje?.tono).toBe('aviso');
    expect(mensaje?.texto).not.toContain('Todavía no hay mentores');
  });

  it('no afirma que no hay mentores si falló el listado de staff', () => {
    const mensaje = mensajeDeLaSeccionMentores({ ...TODO_BIEN, falloElListadoDeStaff: true });
    expect(mensaje?.tono).toBe('aviso');
    expect(mensaje?.texto).not.toContain('Todavía no hay mentores');
  });

  it('con las dos consultas caídas dice que puede haber mentores y no verse', () => {
    const mensaje = mensajeDeLaSeccionMentores({
      ...TODO_BIEN,
      falloElListadoDeGrupos: true,
      falloElListadoDeStaff: true,
    });
    expect(mensaje?.tono).toBe('aviso');
    expect(mensaje?.texto).toContain('Puede haber mentores y no estarse viendo');
    expect(mensaje?.texto).not.toContain('Todavía no hay mentores');
  });

  /* El único estado en que la afirmación es cierta: nada falló, nada sigue cargando, no hay nadie. */
  it('dice que no hay mentores solo cuando se pudo comprobar', () => {
    const mensaje = mensajeDeLaSeccionMentores(TODO_BIEN);
    expect(mensaje?.tono).toBe('vacio');
    expect(mensaje?.texto).toContain('Todavía no hay mentores');
  });

  it('no afirma el vacío mientras alguna consulta sigue en vuelo', () => {
    expect(mensajeDeLaSeccionMentores({ ...TODO_BIEN, cargando: true })).toBeNull();
  });

  it('no dice nada cuando hay filas y no falló nada', () => {
    expect(mensajeDeLaSeccionMentores({ ...TODO_BIEN, hayFilas: true })).toBeNull();
  });

  /* El aviso que la pantalla ya daba antes de este arreglo, y que no se perdió al mover la
     decisión acá: con filas a la vista, el fallo del staff sigue avisando de los suspendidos. */
  it('con filas a la vista y el staff caído, avisa por los suspendidos', () => {
    const mensaje = mensajeDeLaSeccionMentores({
      ...TODO_BIEN,
      falloElListadoDeStaff: true,
      hayFilas: true,
    });
    expect(mensaje?.texto).toContain('con la cuenta suspendida');
    expect(mensaje?.texto).toContain('estos son los activos');
  });

  /* Cada fallo deja un hueco distinto y se nombra distinto: sin el listado de grupos las filas
     salen de staff —están todos los roles MENTOR, pero sin grupo—, que no es lo mismo que faltar
     los suspendidos. Un único "no se pudo cargar" haría desconfiar de filas correctas. */
  it('no confunde el hueco de un listado con el del otro', () => {
    const sinGrupos = mensajeDeLaSeccionMentores({ ...TODO_BIEN, falloElListadoDeGrupos: true });
    const sinStaff = mensajeDeLaSeccionMentores({ ...TODO_BIEN, falloElListadoDeStaff: true });
    expect(sinGrupos?.texto).toContain('quién acompaña cada grupo');
    expect(sinGrupos?.texto).not.toContain('suspendida');
    expect(sinStaff?.texto).not.toContain('quién acompaña cada grupo');
    expect(sinGrupos?.texto).not.toBe(sinStaff?.texto);
  });
});
