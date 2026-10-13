/**
 * El estado de los interruptores de la sesión (spec 002, contrato §8): lo apagado, el 304, sin red, por cuenta, y la
 * lectura de `GET /funcionalidades/mias` con fetch simulado.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../../services/storage/almacenamientoSeguro', () => ({
  almacenamientoSeguro: {
    guardarToken: jest.fn(async () => undefined),
    borrarToken: jest.fn(async () => undefined),
    leerToken: jest.fn(async () => null),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError, setTokenSesion } from '../../../services/http/apiClient';
import { leerMisFuncionalidades, type LecturaDeFuncionalidades } from '../api/funcionalidadesApi';
import { crearAlmacenDeFuncionalidades, type DependenciasDelAlmacen } from '../estado/almacenDeFuncionalidades';
import { claveYSusMadres, evaluarFuncionalidad } from '../estado/evaluacion';
import { claveDeLaCuenta, guardarLectura, recuperarLectura, type LecturaGuardada } from '../estado/memoriaLocal';

const nueva = (version: number, apagadas: { clave: string; aviso: string | null }[], etag: string | null = `"v${version}"`): LecturaDeFuncionalidades => ({
  tipo: 'nueva',
  version,
  etag,
  apagadas,
});

function dependencias(leer: DependenciasDelAlmacen['leer'], guardadas: Record<string, LecturaGuardada> = {}) {
  const guardar = jest.fn(async (cuenta: string, lectura: LecturaGuardada) => {
    guardadas[cuenta] = lectura;
  });
  return {
    leer: jest.fn(leer),
    recuperar: jest.fn(async (cuenta: string) => guardadas[cuenta] ?? null),
    guardar,
    guardadas,
  };
}

describe('evaluar una funcionalidad', () => {
  const apagadas = { chat: 'El chat vuelve a las 18:00.', 'ia.voz': null };

  it('lo que no figura está prendido; sin clave, prendida', () => {
    expect(evaluarFuncionalidad(apagadas, 'muro')).toEqual({ prendida: true, aviso: null });
    expect(evaluarFuncionalidad(apagadas, null)).toEqual({ prendida: true, aviso: null });
  });

  it('una hija de una madre apagada se ve apagada con el aviso de la madre', () => {
    expect(claveYSusMadres('chat.grupos')).toEqual(['chat.grupos', 'chat']);
    expect(evaluarFuncionalidad(apagadas, 'chat.grupos')).toEqual({ prendida: false, aviso: 'El chat vuelve a las 18:00.' });
    expect(evaluarFuncionalidad(apagadas, 'ia.voz')).toEqual({ prendida: false, aviso: null });
    expect(evaluarFuncionalidad(apagadas, 'ia.chat')).toEqual({ prendida: true, aviso: null });
  });

  it('una clave con nombre de propiedad de objeto no se confunde', () => {
    expect(evaluarFuncionalidad({}, 'constructor').prendida).toBe(true);
  });
});

describe('almacén de funcionalidades', () => {
  it('sin cuenta o sin datos todavía, todo prendido', async () => {
    const deps = dependencias(async () => {
      throw new ApiError(0, 'sin red');
    });
    const almacen = crearAlmacenDeFuncionalidades(deps);
    expect(evaluarFuncionalidad(almacen.estado().apagadas, 'chat').prendida).toBe(true);
    await almacen.cambiarCuenta('u-1');
    expect(almacen.estado()).toMatchObject({ cuenta: 'u-1', origen: 'nada' });
    expect(evaluarFuncionalidad(almacen.estado().apagadas, 'chat').prendida).toBe(true);
    expect(deps.leer).toHaveBeenCalledWith(null);
  });

  it('lee lo apagado del servidor, lo guarda por cuenta y avisa a los suscriptores', async () => {
    const deps = dependencias(async () => nueva(42, [{ clave: 'chat.audio', aviso: 'Las notas de voz vuelven mañana.' }]));
    const almacen = crearAlmacenDeFuncionalidades(deps);
    const oyente = jest.fn();
    almacen.suscribir(oyente);
    await almacen.cambiarCuenta('u-1');

    expect(almacen.estado()).toMatchObject({ cuenta: 'u-1', version: 42, etag: '"v42"', origen: 'servidor' });
    expect(evaluarFuncionalidad(almacen.estado().apagadas, 'chat.audio')).toEqual({
      prendida: false,
      aviso: 'Las notas de voz vuelven mañana.',
    });
    expect(deps.guardadas['u-1']).toEqual({
      version: 42,
      etag: '"v42"',
      apagadas: [{ clave: 'chat.audio', aviso: 'Las notas de voz vuelven mañana.' }],
    });
    expect(oyente).toHaveBeenCalled();
  });

  it('relee con If-None-Match; un 304 deja todo como estaba', async () => {
    let vuelta = 0;
    const deps = dependencias(async () => (vuelta++ === 0 ? nueva(7, [{ clave: 'muro', aviso: null }]) : { tipo: 'sin_cambios' }));
    const almacen = crearAlmacenDeFuncionalidades(deps);
    await almacen.cambiarCuenta('u-1');
    const antes = almacen.estado();
    await almacen.releer();

    expect(deps.leer).toHaveBeenLastCalledWith('"v7"');
    expect(almacen.estado()).toBe(antes);
    expect(deps.guardar).toHaveBeenCalledTimes(1);
  });

  it('prender de nuevo (lista vacía) deja todo prendido', async () => {
    let vuelta = 0;
    const deps = dependencias(async () => (vuelta++ === 0 ? nueva(7, [{ clave: 'muro', aviso: null }]) : nueva(8, [])));
    const almacen = crearAlmacenDeFuncionalidades(deps);
    await almacen.cambiarCuenta('u-1');
    expect(evaluarFuncionalidad(almacen.estado().apagadas, 'muro').prendida).toBe(false);
    await almacen.releer();
    expect(evaluarFuncionalidad(almacen.estado().apagadas, 'muro').prendida).toBe(true);
  });

  it('sin red usa lo último guardado de ESA cuenta, y no lo de otra', async () => {
    const deps = dependencias(
      async () => {
        throw new ApiError(0, 'sin red');
      },
      { 'u-1': { version: 3, etag: '"v3"', apagadas: [{ clave: 'ranking', aviso: 'Recalculando.' }] } },
    );
    const almacen = crearAlmacenDeFuncionalidades(deps);
    await almacen.cambiarCuenta('u-1');
    expect(almacen.estado().origen).toBe('guardado');
    expect(evaluarFuncionalidad(almacen.estado().apagadas, 'ranking')).toEqual({ prendida: false, aviso: 'Recalculando.' });
    expect(deps.leer).toHaveBeenCalledWith('"v3"');

    await almacen.cambiarCuenta('u-2');
    expect(almacen.estado()).toMatchObject({ cuenta: 'u-2', origen: 'nada' });
    expect(evaluarFuncionalidad(almacen.estado().apagadas, 'ranking').prendida).toBe(true);

    await almacen.cambiarCuenta(null);
    expect(almacen.estado().cuenta).toBeNull();
  });

  it('una respuesta que llega después de cambiar de cuenta se descarta', async () => {
    let soltar: (l: LecturaDeFuncionalidades) => void = () => undefined;
    let vuelta = 0;
    const deps = dependencias(() =>
      vuelta++ === 0 ? new Promise<LecturaDeFuncionalidades>(r => (soltar = r)) : Promise.resolve(nueva(1, [])),
    );
    const almacen = crearAlmacenDeFuncionalidades(deps);
    const primera = almacen.cambiarCuenta('u-1');
    await Promise.resolve();
    await Promise.resolve();
    await almacen.cambiarCuenta('u-2');
    soltar(nueva(9, [{ clave: 'chat', aviso: 'De la otra cuenta' }]));
    await primera;

    expect(almacen.estado()).toMatchObject({ cuenta: 'u-2', version: 1 });
    expect(evaluarFuncionalidad(almacen.estado().apagadas, 'chat').prendida).toBe(true);
    expect(deps.guardadas['u-1']).toBeUndefined();
  });

  it('con una lectura en vuelo, los pedidos que llegan se juntan en UNA vuelta más', async () => {
    const soltares: ((l: LecturaDeFuncionalidades) => void)[] = [];
    const deps = dependencias(() => new Promise<LecturaDeFuncionalidades>(r => soltares.push(r)));
    const almacen = crearAlmacenDeFuncionalidades(deps);
    const entrada = almacen.cambiarCuenta('u-1');
    await new Promise(r => setImmediate(r));
    expect(almacen.releyendo()).toBe(true);
    void almacen.releer();
    void almacen.releer();
    soltares[0](nueva(1, []));
    await new Promise(r => setImmediate(r));
    expect(deps.leer).toHaveBeenCalledTimes(2);
    soltares[1](nueva(2, []));
    await entrada;
    expect(almacen.releyendo()).toBe(false);
    expect(almacen.estado().version).toBe(2);
  });

  it('un 503 FUNCIONALIDAD_APAGADA marca la clave al instante y relee sin If-None-Match', async () => {
    let vuelta = 0;
    const deps = dependencias(async () =>
      vuelta++ === 0 ? nueva(5, []) : nueva(5, [{ clave: 'ia.voz', aviso: 'SER está en pausa.' }]),
    );
    const almacen = crearAlmacenDeFuncionalidades(deps);
    await almacen.cambiarCuenta('u-1');

    almacen.recibirApagada({ clave: 'ia.voz', aviso: 'SER está en pausa.' });
    expect(evaluarFuncionalidad(almacen.estado().apagadas, 'ia.voz')).toEqual({ prendida: false, aviso: 'SER está en pausa.' });
    await new Promise(r => setImmediate(r));
    expect(deps.leer).toHaveBeenLastCalledWith(null);
    expect(evaluarFuncionalidad(almacen.estado().apagadas, 'ia.voz').prendida).toBe(false);
  });

  it('si la relectura tras el 503 dice que ya volvió, manda la relectura', async () => {
    const deps = dependencias(async () => nueva(6, []));
    const almacen = crearAlmacenDeFuncionalidades(deps);
    await almacen.cambiarCuenta('u-1');
    almacen.recibirApagada({ clave: 'muro', aviso: null });
    expect(evaluarFuncionalidad(almacen.estado().apagadas, 'muro').prendida).toBe(false);
    await new Promise(r => setImmediate(r));
    expect(evaluarFuncionalidad(almacen.estado().apagadas, 'muro').prendida).toBe(true);
  });
});

describe('memoria local por cuenta', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('guarda y recupera por cuenta; un JSON roto es «nada guardado»', async () => {
    await guardarLectura('u-1', { version: 2, etag: '"v2"', apagadas: [{ clave: 'muro', aviso: '  ' }] });
    expect(await recuperarLectura('u-1')).toEqual({ version: 2, etag: '"v2"', apagadas: [{ clave: 'muro', aviso: null }] });
    expect(await recuperarLectura('u-2')).toBeNull();

    await AsyncStorage.setItem(claveDeLaCuenta('u-3'), '{roto');
    expect(await recuperarLectura('u-3')).toBeNull();
  });

  it('si el almacenamiento falla, no revienta', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('sin disco'));
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('sin disco'));
    await expect(guardarLectura('u-1', { version: 1, etag: null, apagadas: [] })).resolves.toBeUndefined();
    await expect(recuperarLectura('u-1')).resolves.toBeNull();
  });
});

describe('GET /api/v1/funcionalidades/mias (fetch simulado)', () => {
  type Pedido = { headers: Record<string, string> };
  function servidor(status: number, cuerpo: unknown, etag: string | null = null): Pedido[] {
    const pedidos: Pedido[] = [];
    (globalThis as unknown as { fetch: unknown }).fetch = jest.fn(async (_url: string, opciones: Pedido) => {
      pedidos.push(opciones);
      return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: (n: string) => (n.toLowerCase() === 'etag' ? etag : null) },
        text: async () => (cuerpo === undefined ? '' : JSON.stringify(cuerpo)),
      };
    });
    return pedidos;
  }

  beforeEach(() => setTokenSesion('sesion-1'));

  it('200: la versión, el ETag y las apagadas con el aviso limpio', async () => {
    const pedidos = servidor(
      200,
      { version: 42, apagadas: [{ clave: 'chat.audio', aviso: 'Vuelven mañana.' }, { clave: 'ia.voz', aviso: '' }], extra: true },
      '"v42"',
    );
    const lectura = await leerMisFuncionalidades(null);
    expect(pedidos[0].headers['If-None-Match']).toBeUndefined();
    expect(lectura).toEqual({
      tipo: 'nueva',
      version: 42,
      etag: '"v42"',
      apagadas: [
        { clave: 'chat.audio', aviso: 'Vuelven mañana.' },
        { clave: 'ia.voz', aviso: null },
      ],
    });
  });

  it('con ETag manda If-None-Match y entiende el 304', async () => {
    const pedidos = servidor(304, undefined);
    expect(await leerMisFuncionalidades('"v42"')).toEqual({ tipo: 'sin_cambios' });
    expect(pedidos[0].headers['If-None-Match']).toBe('"v42"');
  });

  it('un cuerpo fuera de contrato es un error (se queda lo último)', async () => {
    servidor(200, { apagadas: 'nada' });
    await expect(leerMisFuncionalidades(null)).rejects.toThrow(/inesperado/);
  });
});
