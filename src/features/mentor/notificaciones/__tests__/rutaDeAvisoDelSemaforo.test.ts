import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  alAbrirAviso,
  anotarRutaDeAviso,
  consumirRutaPendiente,
  olvidarRutaPendiente,
} from '../rutaDeAviso';

/**
 * Las cuatro clases de destino comparten UN lugar de espera. Cada escucha de Hoy consume solo la
 * suya: si la del mentor se llevara el resumen general, el líder no vería su pantalla; si la del
 * semáforo propio se llevara el del grupo, el mentor quedaría en Hoy sin saber por qué.
 *
 * Son pruebas de mutación del filtro por clase de `consumirRutaPendiente`: si el filtro se quita o
 * se equivoca de clase, la primera expectativa de cada caso falla.
 */
beforeEach(() => {
  olvidarRutaPendiente();
});

const TODAS = ['alumno', 'semaforo', 'semaforoGrupo', 'semaforoGrupos'] as const;

function lasOtras(tipo: (typeof TODAS)[number]) {
  return TODAS.filter(t => t !== tipo);
}

describe('cada escucha se lleva solo su resumen del sábado', () => {
  it('el del grupo es solo del mentor', () => {
    expect(anotarRutaDeAviso('/mentor/groups/g-1/semaforo')).toBe(true);
    for (const otra of lasOtras('semaforoGrupo')) expect(consumirRutaPendiente(otra)).toBeNull();
    expect(consumirRutaPendiente('semaforoGrupo')).toEqual({ tipo: 'semaforoGrupo', grupoId: 'g-1' });
    /* Consumida: volver atrás no la reabre. */
    expect(consumirRutaPendiente('semaforoGrupo')).toBeNull();
  });

  it('el general es solo del líder y de administración', () => {
    expect(anotarRutaDeAviso('/semaforo/grupos')).toBe(true);
    for (const otra of lasOtras('semaforoGrupos')) expect(consumirRutaPendiente(otra)).toBeNull();
    expect(consumirRutaPendiente('semaforoGrupos')).toEqual({ tipo: 'semaforoGrupos' });
    expect(consumirRutaPendiente('semaforoGrupos')).toBeNull();
  });

  it('las rutas de siempre no se las llevan las escuchas nuevas', () => {
    anotarRutaDeAviso('/semaforo');
    expect(consumirRutaPendiente('semaforoGrupo')).toBeNull();
    expect(consumirRutaPendiente('semaforoGrupos')).toBeNull();
    expect(consumirRutaPendiente('semaforo')).toEqual({ tipo: 'semaforo' });

    anotarRutaDeAviso('/mentor/groups/g-1/learners/u-2');
    expect(consumirRutaPendiente('semaforoGrupo')).toBeNull();
    expect(consumirRutaPendiente('alumno')).toEqual({ tipo: 'alumno', grupoId: 'g-1', alumnoId: 'u-2' });
  });

  /* La escucha del resumen general espera a saber si la cuenta administra: mientras tanto, la ruta
     tiene que seguir ahí para cuando llegue la respuesta. */
  it('una ruta que nadie consumió todavía sigue esperando', () => {
    anotarRutaDeAviso('/semaforo/grupos');
    expect(consumirRutaPendiente('alumno')).toBeNull();
    expect(consumirRutaPendiente('semaforoGrupos')).toEqual({ tipo: 'semaforoGrupos' });
  });

  it('el último toque gana', () => {
    anotarRutaDeAviso('/semaforo/grupos');
    anotarRutaDeAviso('/mentor/groups/g-2/semaforo');
    expect(consumirRutaPendiente('semaforoGrupos')).toBeNull();
    expect(consumirRutaPendiente('semaforoGrupo')).toEqual({ tipo: 'semaforoGrupo', grupoId: 'g-2' });
  });

  it('al cerrar sesión se olvida', () => {
    anotarRutaDeAviso('/mentor/groups/g-1/semaforo');
    olvidarRutaPendiente();
    expect(consumirRutaPendiente('semaforoGrupo')).toBeNull();
  });
});

describe('quien escucha se entera de las rutas nuevas', () => {
  it('con la app cerrada (ya esperaba) y con la app abierta', () => {
    anotarRutaDeAviso('/semaforo/grupos');
    const oyente = jest.fn();
    const dejar = alAbrirAviso(oyente);
    expect(oyente).toHaveBeenLastCalledWith({ tipo: 'semaforoGrupos' });

    anotarRutaDeAviso('/mentor/groups/g-1/semaforo');
    expect(oyente).toHaveBeenLastCalledWith({ tipo: 'semaforoGrupo', grupoId: 'g-1' });
    dejar();
  });
});
