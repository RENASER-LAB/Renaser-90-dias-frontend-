import { describe, expect, it } from '@jest/globals';

import { botonDeMasAprendices } from '../mensajes';

/** Una lista sana a mitad de camino: 20 de 50 traídos, nada en vuelo y nada caído. */
const A_MITAD = { cargando: false, falloLaCarga: false, cargados: 20, total: 50 };

/**
 * El botón del pie de la lista de aprendices.
 *
 * Las dos primeras pruebas son las que importan: **con la versión vieja, un fallo no cambiaba
 * nada**. El botón seguía diciendo «Ver más» y seguía sumando uno al contador de página, así que
 * la página caída se salteaba para siempre; y si la que fallaba era la primera, no había botón
 * (`total` en `null`) y no quedaba forma de reintentar sin salir de la pantalla. Estos casos
 * fallan contra ese código.
 */
describe('botonDeMasAprendices', () => {
  it('tras un fallo reintenta, en vez de avanzar sobre el hueco', () => {
    const boton = botonDeMasAprendices({ ...A_MITAD, falloLaCarga: true });
    expect(boton?.accion).toBe('reintentar');
    expect(boton?.etiqueta).not.toContain('Ver más');
  });

  it('ofrece reintentar aunque la primera carga se haya caído sin llegar a saber el total', () => {
    const boton = botonDeMasAprendices({
      cargando: false,
      falloLaCarga: true,
      cargados: 0,
      total: null,
    });
    expect(boton?.accion).toBe('reintentar');
    expect(boton?.etiqueta).toBe('Volver a intentar');
  });

  it('con páginas por traer avanza, y dice cuántas van', () => {
    const boton = botonDeMasAprendices(A_MITAD);
    expect(boton?.accion).toBe('siguiente-pagina');
    expect(boton?.etiqueta).toBe('Ver más (20 de 50)');
  });

  it('no muestra botón mientras la consulta está en vuelo', () => {
    expect(botonDeMasAprendices({ ...A_MITAD, cargando: true })).toBeNull();
    // Ni siquiera con un fallo anterior: se está reintentando justo ahora.
    expect(botonDeMasAprendices({ ...A_MITAD, cargando: true, falloLaCarga: true })).toBeNull();
  });

  it('no muestra botón cuando ya está todo traído', () => {
    expect(botonDeMasAprendices({ ...A_MITAD, cargados: 50 })).toBeNull();
  });

  /* Sin total no se sabe si falta alguien, y un «Ver más» ahí prometería filas que quizá no hay. */
  it('no ofrece más cuando no se sabe cuántos hay', () => {
    expect(botonDeMasAprendices({ ...A_MITAD, total: null })).toBeNull();
  });
});
