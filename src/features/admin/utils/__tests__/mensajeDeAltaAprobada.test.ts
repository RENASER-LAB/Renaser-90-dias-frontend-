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

  it('dice que entró cuando la cola de sin grupo no creció', () => {
    expect(mensajeDeAltaAprobada('Ana', 3, 3)).toContain('entró al grupo de bienvenida');
  });

  /* Entre las dos consultas se puede haber ubicado a mano a otra persona. Que la cola BAJE no
     significa que esta quedó afuera. */
  it('dice que entró aunque la cola haya bajado por otro motivo', () => {
    expect(mensajeDeAltaAprobada('Ana', 3, 1)).toContain('entró al grupo de bienvenida');
  });

  it('avisa que quedó sin grupo solo cuando la cola creció', () => {
    const mensaje = mensajeDeAltaAprobada('Ana', 3, 4);
    expect(mensaje).toContain('SIN grupo');
    expect(mensaje).toContain('no hay una bienvenida abierta hoy');
  });

  it('usa el nombre cuando lo hay y un genérico cuando no', () => {
    expect(mensajeDeAltaAprobada('Ana Pérez', 3, 3)).toContain('Ana Pérez');
    expect(mensajeDeAltaAprobada(null, 3, 3)).toContain('La persona');
    expect(mensajeDeAltaAprobada(undefined, 3, 4)).toContain('La persona');
  });
});
