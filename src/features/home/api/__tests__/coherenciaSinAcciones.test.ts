import { describe, expect, it } from '@jest/globals';

import { homeSchemas, validarRespuesta } from '../homeSchemas';

/**
 * Lo que devuelve producción a quien no planificó ninguna acción en la semana. Se copió tal
 * cual del `GET /api/v1/home` que el 2026-09-16 tumbaba la pantalla de Inicio en web y en el
 * APK con "No pudimos cargar tu día. Revisa tu conexión." — que no era de conexión: era el
 * esquema exigiendo un número donde el backend, a propósito, manda `null` (D-128).
 */
const resumenSinAccionesPlanificadas = {
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

describe('GET /api/v1/home sin acciones planificadas en la semana', () => {
  it('acepta coherencia en null: es una respuesta, no un hueco', () => {
    const validado = validarRespuesta(homeSchemas.resumen, resumenSinAccionesPlanificadas, 'GET /api/v1/home');
    expect(validado.coherencia).toBeNull();
  });

  it('sigue aceptando la coherencia numerica de quien si planifico', () => {
    const validado = validarRespuesta(
      homeSchemas.resumen,
      { ...resumenSinAccionesPlanificadas, coherencia: 66.67 },
      'GET /api/v1/home',
    );
    expect(validado.coherencia).toBe(66.67);
  });
});
