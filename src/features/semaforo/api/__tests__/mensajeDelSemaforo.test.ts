import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { aResumenHome } from '../../../home/api/homeApi';
import { homeSchemas, validarRespuesta as validarHome } from '../../../home/api/homeSchemas';
import { aSemaforoDeHoy, semaforoSchemas, validarRespuesta } from '../semaforoSchemas';
import { stickerDelSemaforo } from '../../data/stickersDelSemaforo';

/**
 * El mensaje del día que el backend suma (aditivo) al campo `semaforo` de `GET /api/v1/home` (spec 006,
 * contrato `home-semaforo-mensaje`): `{ id, texto, sticker }`. Tiene que ser aditivo de verdad: sin él la
 * tarjeta queda como estaba, y mal formado se pierde SOLO el mensaje — no la tarjeta, ni Inicio.
 */

afterEach(() => {
  jest.restoreAllMocks();
});

/* El ejemplo del contrato, tal cual. */
const MENSAJE = {
  id: 'a011',
  texto: 'María, faltan 2 para avanzar de color. Empieza por lo más sencillo y recupera movimiento.',
  sticker: 'azul-reloj',
};

const SEMAFORO = { color: 'AMARILLO', etiqueta: 'Requiere atención', porcentaje: 71.4, diasConDatos: 6, pausado: false };

function leer(crudo: unknown) {
  return aSemaforoDeHoy(validarRespuesta(semaforoSchemas.deHoy, crudo, 'GET /api/v1/home'));
}

describe('`/home.semaforo.mensaje`', () => {
  it('el ejemplo del contrato llega tal cual: el texto no se transforma', () => {
    const semaforo = leer({ ...SEMAFORO, mensaje: MENSAJE });
    expect(semaforo.mensaje).toEqual(MENSAJE);
    expect(semaforo).toMatchObject({ color: 'AMARILLO', porcentaje: 71.4 });
  });

  it('ausente o `null`: `null`, y la tarjeta se ve como hoy', () => {
    expect(leer(SEMAFORO).mensaje).toBeNull();
    expect(leer({ ...SEMAFORO, mensaje: null }).mensaje).toBeNull();
  });

  it('sin sticker (`null` o ausente) queda en `null`: se muestra solo el texto', () => {
    expect(leer({ ...SEMAFORO, mensaje: { ...MENSAJE, sticker: null } }).mensaje).toEqual({ ...MENSAJE, sticker: null });
    const { sticker: _sticker, ...sinSticker } = MENSAJE;
    expect(leer({ ...SEMAFORO, mensaje: sinSticker }).mensaje).toEqual({ ...MENSAJE, sticker: null });
  });

  it('un sticker que esta versión no conoce se conserva como nombre, pero no hay imagen: solo texto', () => {
    const semaforo = leer({ ...SEMAFORO, mensaje: { ...MENSAJE, sticker: 'violeta-bailando' } });
    expect(semaforo.mensaje?.sticker).toBe('violeta-bailando');
    expect(stickerDelSemaforo(semaforo.mensaje?.sticker)).toBeNull();
  });

  it('un sticker que ni siquiera es texto no pierde el mensaje', () => {
    const semaforo = leer({ ...SEMAFORO, mensaje: { ...MENSAJE, sticker: 42 } });
    expect(semaforo.mensaje).toEqual({ ...MENSAJE, sticker: null });
  });

  it('con campos que la app todavía no conoce, igual se lee', () => {
    expect(leer({ ...SEMAFORO, mensaje: { ...MENSAJE, grupo: 'AMARILLO' } }).mensaje).toEqual(MENSAJE);
  });

  it.each([
    ['sin texto', { id: 'a011', sticker: 'azul-reloj' }],
    ['texto vacío', { ...MENSAJE, texto: '' }],
    ['texto en blanco', { ...MENSAJE, texto: '   ' }],
    ['sin id', { texto: MENSAJE.texto, sticker: 'azul-reloj' }],
    ['una variable sin reemplazar', { ...MENSAJE, texto: '{nombre}, faltan 2.' }],
    ['una llave suelta', { ...MENSAJE, texto: 'Faltan 2 }' }],
    ['un texto en lugar del objeto', 'a011'],
  ])('mal formado (%s): se pierde SOLO el mensaje, la tarjeta sigue y en desarrollo se avisa', (_caso, mensaje) => {
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const semaforo = leer({ ...SEMAFORO, mensaje });
    expect(semaforo).toMatchObject({ color: 'AMARILLO', etiqueta: 'Requiere atención', porcentaje: 71.4, mensaje: null });
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining('semaforo.mensaje'));
  });
});

describe('`/home` con el mensaje', () => {
  /* La respuesta de producción de `semaforoEnHome.test.ts`, con el semáforo y su mensaje. */
  const resumen = {
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
    semaforo: { ...SEMAFORO, mensaje: MENSAJE },
  };

  it('llega a la tarjeta dentro del resumen de Hoy', () => {
    const lectura = aResumenHome(validarHome(homeSchemas.resumen, resumen, 'GET /api/v1/home'));
    expect(lectura.semaforo?.mensaje).toEqual(MENSAJE);
  });

  it('un mensaje roto no tumba Inicio ni esconde la tarjeta', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const lectura = aResumenHome(
      validarHome(homeSchemas.resumen, { ...resumen, semaforo: { ...SEMAFORO, mensaje: { texto: 7 } } }, 'GET /api/v1/home'),
    );
    expect(lectura.diaPrograma).toBe(3);
    expect(lectura.habitosHoy).toEqual({ completados: 0, total: 2 });
    expect(lectura.semaforo).toMatchObject({ color: 'AMARILLO', mensaje: null });
  });

  it('para quien no se mide (`semaforo: null`) no hay mensaje: la tarjeta tampoco existe', () => {
    expect(aResumenHome(validarHome(homeSchemas.resumen, { ...resumen, semaforo: null }, 'GET /api/v1/home')).semaforo).toBeNull();
  });
});
