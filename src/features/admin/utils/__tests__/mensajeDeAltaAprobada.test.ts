import { describe, expect, it } from '@jest/globals';

import { mensajeDeAltaAprobada } from '../mensajes';

/**
 * El aviso que ve el administrador justo después de aprobar una cuenta.
 *
 * La prueba que importa es la tercera: **con la comparación rota, el mensaje afirmaba «quedó SIN
 * grupo» aunque la persona sí hubiera entrado**. El código viejo era
 * `sinGrupo !== null && despues.total <= sinGrupo`, un booleano para tres estados; con
 * `sinGrupo === null` daba `false` y caía en la rama de "no entró". Estos casos fallan contra
 * ese código.
 */
describe('mensajeDeAltaAprobada', () => {
  it('no afirma nada sobre el grupo si no se pudo contar ANTES', () => {
    const mensaje = mensajeDeAltaAprobada('Ana', null, 4);
    expect(mensaje).toContain('No pudimos comprobar');
    expect(mensaje).not.toContain('SIN grupo');
    expect(mensaje).not.toContain('entró al grupo');
  });

  it('no afirma nada sobre el grupo si no se pudo contar DESPUÉS', () => {
    const mensaje = mensajeDeAltaAprobada('Ana', 4, null);
    expect(mensaje).toContain('No pudimos comprobar');
    expect(mensaje).not.toContain('SIN grupo');
    expect(mensaje).not.toContain('entró al grupo');
  });

  it('dice que entró cuando la cola de sin grupo BAJÓ', () => {
    expect(mensajeDeAltaAprobada('Ana', 3, 2)).toContain('entró al grupo de bienvenida');
  });

  /* Entre las dos consultas se puede haber ubicado a mano a otra persona. Que la cola baje de más
     no cambia la lectura: esta entró. */
  it('dice que entró aunque la cola haya bajado de más', () => {
    expect(mensajeDeAltaAprobada('Ana', 3, 1)).toContain('entró al grupo de bienvenida');
  });

  /* EL CASO QUE ANTES MENTÍA. Quien se aprueba ya contaba como "sin grupo" antes —el usuario se
     crea al registrarse, no al aprobar—, así que si NO se la ubica la cola queda igual. Con el
     `<=` viejo eso se leía como "entró al grupo de bienvenida" y la persona quedaba suelta sin
     que nadie se enterara. Esta prueba falla contra el código anterior. */
  it('avisa que quedó sin grupo cuando la cola NO se movió', () => {
    const mensaje = mensajeDeAltaAprobada('Ana', 3, 3);
    expect(mensaje).toContain('SIN grupo');
    expect(mensaje).toContain('no hay una bienvenida abierta hoy');
  });

  it('usa el nombre cuando lo hay y un genérico cuando no', () => {
    expect(mensajeDeAltaAprobada('Ana Pérez', 3, 2)).toContain('Ana Pérez');
    expect(mensajeDeAltaAprobada(null, 3, 2)).toContain('La persona');
    expect(mensajeDeAltaAprobada(undefined, 3, 4)).toContain('La persona');
  });
});
