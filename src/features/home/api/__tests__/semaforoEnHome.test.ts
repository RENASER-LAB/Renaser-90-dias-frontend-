import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { aResumenHome } from '../homeApi';
import { homeSchemas, validarRespuesta } from '../homeSchemas';

/**
 * El campo nuevo `semaforo` de `GET /api/v1/home` (D-168). Tiene que ser aditivo de verdad: la
 * lección de `coherenciaSinAcciones.test.ts` es que un campo exigido de más deja a la persona sin
 * su pantalla de Inicio con un "Revisa tu conexión" que no es de conexión.
 *
 * Lo que se fija: con el campo, sin él, en `null` y mal formado, `/home` se sigue leyendo entero.
 */

/** La misma respuesta de producción del test de coherencia, sin el campo nuevo. */
const resumenSinSemaforo = {
  puntosLiga: 100,
  coherencia: null,
  rachaActual: 0,
  rachaMaxima: 0,
  diaPrograma: 3,
  inscrito: true,
  fase: 'FUNDACION',
  habitosHoy: { completados: 0, total: 2 },
  rocasHoy: null,
  proximoEvento: null,
  notificacionesNoLeidas: 0,
  bloqueos: [],
};

function leer(crudo: unknown) {
  return aResumenHome(validarRespuesta(homeSchemas.resumen, crudo, 'GET /api/v1/home'));
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /api/v1/home con el campo semaforo', () => {
  it('un backend anterior al semáforo (sin el campo) sigue funcionando, y no hay tarjeta', () => {
    const resumen = leer(resumenSinSemaforo);
    expect(resumen.semaforo).toBeNull();
    expect(resumen.habitosHoy).toEqual({ completados: 0, total: 2 });
  });

  it('`null` es "esta persona no se mide": no hay tarjeta', () => {
    expect(leer({ ...resumenSinSemaforo, semaforo: null }).semaforo).toBeNull();
  });

  it('el ejemplo del contrato llega normalizado a la tarjeta', () => {
    const resumen = leer({
      ...resumenSinSemaforo,
      semaforo: { color: 'AMARILLO', etiqueta: 'Requiere atención', porcentaje: 78.3, diasConDatos: 6, pausado: false },
    });
    expect(resumen.semaforo).toEqual({
      color: 'AMARILLO',
      etiqueta: 'Requiere atención',
      porcentaje: 78.3,
      diasConDatos: 6,
      pausado: false,
      /* Sin el campo aditivo `dias`: `null`, y la tarjeta saca las barras de `/me/semaforo`. */
      dias: null,
    });
  });

  it('con campos que la app todavía no conoce, igual se lee', () => {
    const resumen = leer({
      ...resumenSinSemaforo,
      semaforo: { color: 'VERDE', etiqueta: 'Al día', porcentaje: 86, diasConDatos: 7, pausado: false, tendencia: 'SUBE' },
    });
    expect(resumen.semaforo?.color).toBe('VERDE');
  });

  /* El caso que este campo NO puede repetir: mal formado, se esconde la tarjeta y Inicio sigue. */
  it('mal formado, esconde la tarjeta y NO tumba Inicio', () => {
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const resumen = leer({ ...resumenSinSemaforo, semaforo: { porcentaje: 'setenta' } });

    expect(resumen.semaforo).toBeNull();
    expect(resumen.diaPrograma).toBe(3);
    expect(resumen.habitosHoy).toEqual({ completados: 0, total: 2 });
    /* En desarrollo se avisa: esconder sin decir nada haría invisible un cambio del backend. */
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining('semaforo'));
  });

  it('un texto en lugar del objeto tampoco tumba Inicio', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(leer({ ...resumenSinSemaforo, semaforo: 'AMARILLO' }).semaforo).toBeNull();
  });

  it('sin porcentaje, la tarjeta dice "Sin datos" aunque el color diga verde', () => {
    const resumen = leer({ ...resumenSinSemaforo, semaforo: { color: 'VERDE', etiqueta: 'Al día', porcentaje: null } });
    expect(resumen.semaforo).toMatchObject({ color: 'SIN_DATOS', etiqueta: null, porcentaje: null });
  });
});
