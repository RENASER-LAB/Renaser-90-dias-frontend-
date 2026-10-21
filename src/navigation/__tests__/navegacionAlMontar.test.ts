import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  atenderPestanaPedida,
  ESPERA_ENTRE_INTENTOS_MS,
  navegacionAlMontar,
  TOPE_DE_ESPERA_MS,
  type DependenciasAlMontar,
} from '../navegacionAlMontar';
import { pedirPestanaAlMontar, tomarPestanaAlMontar, verPestanaAlMontar } from '../pestanaAlMontar';

/**
 * Al salir de «ver como» las pestañas se arman de nuevo con la cuenta de Soporte TI, pero el `NavigationContainer` es el
 * mismo y React Navigation puede rehidratar el estado anterior e ignorar `initialRouteName` / `initialParams` (Maestro,
 * flujo 39: la app caía en Hoy). `MainTabs` ya no se fía de eso: consume el pedido y navega cuando el navegador está
 * listo. Aquí se prueba la decisión (pura) y la espera, con un navegador de mentira.
 */

const PEDIDO_YO = { nombre: 'Yo', params: { abrirSoporteTi: true } };

describe('navegacionAlMontar (la decisión)', () => {
  it('sin pedido no hay nada que hacer', () => {
    expect(navegacionAlMontar(null, 'Hoy', true)).toEqual({ accion: 'nada' });
  });

  it('con el navegador sin la pestaña, espera', () => {
    expect(navegacionAlMontar(PEDIDO_YO, undefined, false)).toEqual({ accion: 'esperar' });
    expect(navegacionAlMontar(PEDIDO_YO, 'Hoy', false)).toEqual({ accion: 'esperar' });
  });

  it('si el navegador se quedó en otra pestaña (ignoró la inicial), navega a la pedida con sus parámetros', () => {
    expect(navegacionAlMontar(PEDIDO_YO, 'Hoy', true)).toEqual({ accion: 'navegar', nombre: 'Yo', params: { abrirSoporteTi: true } });
    expect(navegacionAlMontar(PEDIDO_YO, undefined, true)).toEqual({ accion: 'navegar', nombre: 'Yo', params: { abrirSoporteTi: true } });
  });

  it('si ya está en la pedida pero trae parámetros, los entrega otra vez (la pantalla se armó de nuevo sin ellos)', () => {
    expect(navegacionAlMontar(PEDIDO_YO, 'Yo', true)).toEqual({ accion: 'navegar', nombre: 'Yo', params: { abrirSoporteTi: true } });
  });

  it('si ya está en la pedida y no hay parámetros, no navega', () => {
    expect(navegacionAlMontar({ nombre: 'Yo' }, 'Yo', true)).toEqual({ accion: 'nada' });
    expect(navegacionAlMontar({ nombre: 'Yo', params: {} }, 'Yo', true)).toEqual({ accion: 'nada' });
  });

  it('sin parámetros pero en otra pestaña, navega a la pedida', () => {
    expect(navegacionAlMontar({ nombre: 'Comunidad' }, 'Hoy', true)).toEqual({ accion: 'navegar', nombre: 'Comunidad', params: undefined });
  });
});

describe('atenderPestanaPedida (la espera, con el pedido real y un navegador de mentira)', () => {
  let ruta: string | undefined;
  let pestanas: Set<string>;
  let listo: boolean;
  let navegar: jest.Mock<(nombre: string, params?: Record<string, unknown>) => boolean>;
  let deps: DependenciasAlMontar;

  beforeEach(() => {
    jest.useFakeTimers();
    pedirPestanaAlMontar(null);
    ruta = 'Hoy';
    pestanas = new Set(['Hoy', 'Plan', 'Training', 'Comunidad', 'Yo']);
    listo = true;
    navegar = jest.fn((nombre: string) => {
      if (!listo) return false;
      ruta = nombre;
      return true;
    });
    deps = {
      ver: verPestanaAlMontar,
      tomar: tomarPestanaAlMontar,
      rutaActual: () => (listo ? ruta : undefined),
      disponible: nombre => listo && pestanas.has(nombre),
      navegar,
    };
  });
  afterEach(() => {
    pedirPestanaAlMontar(null);
    jest.useRealTimers();
  });

  it('el navegador rehidrató Hoy e ignoró la pestaña inicial: navega a Yo con la consola y consume el pedido', () => {
    pedirPestanaAlMontar(PEDIDO_YO);
    atenderPestanaPedida(deps);
    jest.advanceTimersByTime(0);
    expect(navegar).toHaveBeenCalledTimes(1);
    expect(navegar).toHaveBeenCalledWith('Yo', { abrirSoporteTi: true });
    expect(verPestanaAlMontar()).toBeNull();
  });

  it('no consume el pedido antes de poder atenderlo', () => {
    pedirPestanaAlMontar(PEDIDO_YO);
    atenderPestanaPedida(deps);
    // Todavía no corrió ningún intento.
    expect(verPestanaAlMontar()).toEqual(PEDIDO_YO);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('espera a que el navegador esté listo y entonces navega', () => {
    listo = false;
    pedirPestanaAlMontar(PEDIDO_YO);
    atenderPestanaPedida(deps);
    jest.advanceTimersByTime(ESPERA_ENTRE_INTENTOS_MS * 4);
    expect(navegar).not.toHaveBeenCalled();
    expect(verPestanaAlMontar()).toEqual(PEDIDO_YO);
    listo = true;
    jest.advanceTimersByTime(ESPERA_ENTRE_INTENTOS_MS);
    expect(navegar).toHaveBeenCalledWith('Yo', { abrirSoporteTi: true });
    expect(verPestanaAlMontar()).toBeNull();
  });

  it('si la navegación falla (navegador no listo), reintenta sin consumir', () => {
    pedirPestanaAlMontar(PEDIDO_YO);
    navegar.mockReturnValueOnce(false).mockReturnValueOnce(false);
    atenderPestanaPedida(deps);
    // Intentos a los 0, 50 y 100 ms: los dos primeros fallan, el tercero navega.
    jest.advanceTimersByTime(ESPERA_ENTRE_INTENTOS_MS);
    expect(navegar).toHaveBeenCalledTimes(2);
    expect(verPestanaAlMontar()).toEqual(PEDIDO_YO);
    jest.advanceTimersByTime(ESPERA_ENTRE_INTENTOS_MS);
    expect(navegar).toHaveBeenCalledTimes(3);
    expect(verPestanaAlMontar()).toBeNull();
  });

  it('si ya está en la pedida y sin parámetros, solo consume', () => {
    ruta = 'Yo';
    pedirPestanaAlMontar({ nombre: 'Yo' });
    atenderPestanaPedida(deps);
    jest.advanceTimersByTime(0);
    expect(navegar).not.toHaveBeenCalled();
    expect(verPestanaAlMontar()).toBeNull();
  });

  it('un montaje intermedio que se desmonta no se lleva el pedido: queda para el siguiente', () => {
    pedirPestanaAlMontar(PEDIDO_YO);
    const soltar = atenderPestanaPedida(deps);
    soltar();
    jest.advanceTimersByTime(TOPE_DE_ESPERA_MS * 2);
    expect(navegar).not.toHaveBeenCalled();
    expect(verPestanaAlMontar()).toEqual(PEDIDO_YO);

    atenderPestanaPedida(deps);
    jest.advanceTimersByTime(0);
    expect(navegar).toHaveBeenCalledWith('Yo', { abrirSoporteTi: true });
    expect(verPestanaAlMontar()).toBeNull();
  });

  it('sin pedido no programa nada', () => {
    atenderPestanaPedida(deps);
    jest.advanceTimersByTime(TOPE_DE_ESPERA_MS);
    expect(navegar).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('si otro (el respaldo de la franja) ya lo atendió, no navega otra vez', () => {
    pedirPestanaAlMontar(PEDIDO_YO);
    atenderPestanaPedida(deps);
    tomarPestanaAlMontar();
    jest.advanceTimersByTime(TOPE_DE_ESPERA_MS);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('si el navegador nunca tiene la pestaña, descarta el pedido al tope para que no le caiga a otro montaje', () => {
    pestanas.delete('Yo');
    pedirPestanaAlMontar(PEDIDO_YO);
    atenderPestanaPedida(deps);
    jest.advanceTimersByTime(TOPE_DE_ESPERA_MS - ESPERA_ENTRE_INTENTOS_MS);
    expect(verPestanaAlMontar()).toEqual(PEDIDO_YO);
    jest.advanceTimersByTime(ESPERA_ENTRE_INTENTOS_MS * 2);
    expect(verPestanaAlMontar()).toBeNull();
    expect(navegar).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
});
