/**
 * La nota «la persona tocó Conectar y se abrió el diálogo del sistema» (issue #127): sirve para no perder la conexión si Android cierra
 * la app con el diálogo abierto. Va en su propio archivo porque `conexionDeLosPasos.test.ts` deja el `setItem` del almacenamiento de
 * prueba sin comportamiento (su `mockRestore` sobre un doble que ya era `jest.fn`).
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  anotarElIntento,
  borrarElIntento,
  guardarLaConexion,
  hayUnIntentoReciente,
  leerLaConexion,
  VIGENCIA_DEL_INTENTO_MS,
} from '../conexionDeLosPasos';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const ahora = new Date('2026-11-05T10:00:00Z');
const hace = (ms: number) => new Date(ahora.getTime() - ms);

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('el intento de conectar', () => {
  it('sin nota no hay intento', async () => {
    expect(await hayUnIntentoReciente('ana', ahora)).toBe(false);
  });

  it('anotado hace un momento es reciente; vale poco tiempo: pasado el límite ya no cuenta', async () => {
    await anotarElIntento('ana', hace(60_000));
    expect(await hayUnIntentoReciente('ana', ahora)).toBe(true);

    await anotarElIntento('ana', hace(VIGENCIA_DEL_INTENTO_MS + 1_000));
    expect(await hayUnIntentoReciente('ana', ahora)).toBe(false);
  });

  it('una nota con fecha del futuro (reloj movido) o rota no cuenta', async () => {
    await anotarElIntento('ana', new Date(ahora.getTime() + 60_000));
    expect(await hayUnIntentoReciente('ana', ahora)).toBe(false);

    await AsyncStorage.setItem('renaser.pasos.intento.ana', 'ayer');
    expect(await hayUnIntentoReciente('ana', ahora)).toBe(false);
  });

  it('es por cuenta, y borrarla solo borra la de esa cuenta', async () => {
    await anotarElIntento('ana', hace(1_000));
    await anotarElIntento('beto', hace(1_000));
    expect(await hayUnIntentoReciente('carla', ahora)).toBe(false);

    await borrarElIntento('ana');
    expect(await hayUnIntentoReciente('ana', ahora)).toBe(false);
    expect(await hayUnIntentoReciente('beto', ahora)).toBe(true);
  });

  it('no es la conexión: anotar un intento no deja a la cuenta «conectada», ni guardar la conexión borra el intento', async () => {
    await anotarElIntento('ana', hace(1_000));
    expect(await leerLaConexion('ana')).toEqual({ conectadoEn: null });

    await guardarLaConexion('ana', ahora);
    expect(await hayUnIntentoReciente('ana', ahora)).toBe(true);
  });

  it('si el almacenamiento falla no se rompe nada: no hay intento y la persona vuelve a tocar «Conectar»', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disco lleno'));
    await expect(anotarElIntento('ana', ahora)).resolves.toBeUndefined();

    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disco roto'));
    expect(await hayUnIntentoReciente('ana', ahora)).toBe(false);
  });
});
