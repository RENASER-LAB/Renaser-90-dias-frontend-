import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  alAbrirAviso,
  anotarRutaDeAviso,
  consumirRutaPendiente,
  olvidarRutaPendiente,
} from '../rutaDeAviso';

/**
 * La ruta que deja un aviso tocado espera hasta que su pantalla la consume. Desde el semáforo hay
 * dos clases de destino compartiendo ese único lugar de espera, y cada pantalla tiene que llevarse
 * **solo la suya**: si la escucha del mentor se tragara un `/semaforo`, el aviso del sábado no
 * abriría nada, y al revés el mentor perdería la ficha del alumno.
 */
beforeEach(() => {
  olvidarRutaPendiente();
});

describe('cada pantalla consume solo su clase de ruta', () => {
  it('el mentor no se lleva la ruta del semáforo', () => {
    expect(anotarRutaDeAviso('/semaforo')).toBe(true);

    expect(consumirRutaPendiente('alumno')).toBeNull();
    expect(consumirRutaPendiente('semaforo')).toEqual({ tipo: 'semaforo' });
    /* Consumida: volver atrás no la reabre. */
    expect(consumirRutaPendiente('semaforo')).toBeNull();
  });

  it('el semáforo no se lleva la ruta del alumno', () => {
    anotarRutaDeAviso('/mentor/groups/g-1/learners/u-2');

    expect(consumirRutaPendiente('semaforo')).toBeNull();
    expect(consumirRutaPendiente('alumno')).toEqual({ tipo: 'alumno', grupoId: 'g-1', alumnoId: 'u-2' });
  });

  /* Decía `/semaforo/grupos`, que desde el resumen por grupos sí se abre (2026-09-25). */
  it('una ruta que esta versión no abre no deja nada esperando', () => {
    expect(anotarRutaDeAviso('/semaforo/historial')).toBe(false);
    expect(consumirRutaPendiente('semaforo')).toBeNull();
    expect(consumirRutaPendiente('alumno')).toBeNull();
  });

  it('al cerrar sesión se olvida lo que esperaba', () => {
    anotarRutaDeAviso('/semaforo');
    olvidarRutaPendiente();
    expect(consumirRutaPendiente('semaforo')).toBeNull();
  });
});

describe('quien escucha se entera', () => {
  it('de lo que ya esperaba al suscribirse (arranque en frío) y de lo que llega después', () => {
    anotarRutaDeAviso('/semaforo');
    const oyente = jest.fn();

    const dejarDeEscuchar = alAbrirAviso(oyente);
    expect(oyente).toHaveBeenLastCalledWith({ tipo: 'semaforo' });

    anotarRutaDeAviso('/mentor/groups/g-1/learners/u-2');
    expect(oyente).toHaveBeenLastCalledWith({ tipo: 'alumno', grupoId: 'g-1', alumnoId: 'u-2' });

    dejarDeEscuchar();
    anotarRutaDeAviso('/semaforo');
    expect(oyente).toHaveBeenCalledTimes(2);
  });
});
