import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { aResumenHome } from '../../../home/api/homeApi';
import { homeSchemas, validarRespuesta as validarHome } from '../../../home/api/homeSchemas';
import { aSemaforoDeHoy, semaforoSchemas, validarRespuesta } from '../semaforoSchemas';

/**
 * Los 7 días que el backend agregó (aditivo) al campo `semaforo` de `GET /api/v1/home`, en su forma
 * corta: `{fecha, estado, porcentaje, color, etiqueta}`. Con ellos la tarjeta de Hoy dibuja sus
 * barras sin pedir `/me/semaforo`. Tienen que ser aditivos de verdad: sin ellos todo queda como
 * antes, y mal formados no se llevan la tarjeta — ni Inicio.
 */

afterEach(() => {
  jest.restoreAllMocks();
});

/** El campo tal como lo arma hoy `ResumenHomeResponse.SemaforoResponse`, con los días desordenados. */
const SEMAFORO_CON_DIAS = {
  color: 'AMARILLO', etiqueta: 'Requiere atención', porcentaje: 78.3, diasConDatos: 6, pausado: false,
  dias: [
    { fecha: '2026-09-24', estado: 'MEDIDO', porcentaje: 85, color: 'VERDE', etiqueta: 'Al día' },
    { fecha: '2026-09-18', estado: 'MEDIDO', porcentaje: 75, color: 'AMARILLO', etiqueta: 'Requiere atención' },
    { fecha: '2026-09-21', estado: 'SIN_DATOS', porcentaje: null, color: 'SIN_DATOS', etiqueta: 'Sin datos' },
    { fecha: '2026-09-19', estado: 'MEDIDO', porcentaje: 83, color: 'VERDE', etiqueta: 'Al día' },
    { fecha: '2026-09-20', estado: 'MEDIDO', porcentaje: 60, color: 'AMARILLO', etiqueta: 'Requiere atención' },
    { fecha: '2026-09-22', estado: 'MEDIDO', porcentaje: 100, color: 'VERDE', etiqueta: 'Al día' },
    { fecha: '2026-09-23', estado: 'MEDIDO', porcentaje: 67, color: 'AMARILLO', etiqueta: 'Requiere atención' },
  ],
};

function leer(crudo: unknown) {
  return aSemaforoDeHoy(validarRespuesta(semaforoSchemas.deHoy, crudo, 'GET /api/v1/home'));
}

describe('`/home.semaforo.dias`', () => {
  it('llegan normalizados, del más viejo al más nuevo, sin conteos inventados', () => {
    const semaforo = leer(SEMAFORO_CON_DIAS);
    expect(semaforo.dias?.map(d => d.fecha)).toEqual([
      '2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24',
    ]);
    expect(semaforo.dias?.[0]).toEqual({
      fecha: '2026-09-18', estado: 'MEDIDO', porcentaje: 75, color: 'AMARILLO', habitos: null, objetivos: null,
    });
    /* Un día sin nada programado sigue sin porcentaje: la regla del detalle, la misma. */
    expect(semaforo.dias?.[3]).toMatchObject({ estado: 'SIN_DATOS', porcentaje: null, color: 'SIN_DATOS' });
  });

  it('un día que no es MEDIDO no muestra porcentaje aunque venga uno', () => {
    const semaforo = leer({
      ...SEMAFORO_CON_DIAS,
      dias: [{ fecha: '2026-09-18', estado: 'PAUSADO', porcentaje: 0, color: 'ROJO', etiqueta: 'Con problemas' }],
    });
    expect(semaforo.dias?.[0]).toMatchObject({ estado: 'PAUSADO', porcentaje: null, color: 'SIN_DATOS' });
  });

  it('sin el campo, `null`: la tarjeta vuelve a pedirlos a `/me/semaforo`', () => {
    const { dias: _dias, ...sinDias } = SEMAFORO_CON_DIAS;
    expect(leer(sinDias).dias).toBeNull();
    expect(leer({ ...sinDias, dias: null }).dias).toBeNull();
  });

  it('una lista vacía se respeta (vino, y dice que no hay barras que dibujar)', () => {
    expect(leer({ ...SEMAFORO_CON_DIAS, dias: [] }).dias).toEqual([]);
  });

  it('mal formados se pierden SOLO los días: la tarjeta sigue, y en desarrollo se avisa', () => {
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const semaforo = leer({ ...SEMAFORO_CON_DIAS, dias: [{ estado: 'MEDIDO' }] });
    expect(semaforo).toMatchObject({ color: 'AMARILLO', porcentaje: 78.3, dias: null });
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining('semaforo.dias'));
  });
});

describe('`/home` entero, con los días', () => {
  const resumen = {
    puntosLiga: 100, coherencia: null, rachaActual: 0, rachaMaxima: 0, diaPrograma: 12, inscrito: true,
    fase: 'FUNDACION', habitosHoy: { completados: 0, total: 2 }, rocasHoy: null, proximoEvento: null,
    notificacionesNoLeidas: 0, bloqueos: [],
  };

  it('Inicio se lee entero y la tarjeta recibe sus 7 días', () => {
    const leido = aResumenHome(validarHome(homeSchemas.resumen, { ...resumen, semaforo: SEMAFORO_CON_DIAS }, 'GET /api/v1/home'));
    expect(leido.diaPrograma).toBe(12);
    expect(leido.semaforo?.dias).toHaveLength(7);
  });

  it('días mal formados no tumban Inicio ni esconden la tarjeta', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const leido = aResumenHome(
      validarHome(homeSchemas.resumen, { ...resumen, semaforo: { ...SEMAFORO_CON_DIAS, dias: 'siete' } }, 'GET /api/v1/home'),
    );
    expect(leido.habitosHoy).toEqual({ completados: 0, total: 2 });
    expect(leido.semaforo).toMatchObject({ color: 'AMARILLO', dias: null });
  });
});
