/** La conexión de los pasos en este teléfono (spec 037, D-310): por cuenta, y un almacenamiento roto nunca tumba la pantalla. */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { borrarLaConexion, guardarLaConexion, leerLaConexion } from '../conexionDeLosPasos';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('conexionDeLosPasos', () => {
  it('sin nada guardado no está conectado', async () => {
    expect(await leerLaConexion('ana')).toEqual({ conectadoEn: null });
  });

  it('guarda cuándo se conectó y lo lee igual', async () => {
    await guardarLaConexion('ana', new Date('2026-11-04T19:05:00Z'));
    expect(await leerLaConexion('ana')).toEqual({ conectadoEn: '2026-11-04T19:05:00.000Z' });
  });

  it('es por cuenta: la de otra persona en el mismo teléfono no se ve conectada', async () => {
    await guardarLaConexion('ana', new Date('2026-11-04T19:05:00Z'));
    expect(await leerLaConexion('beto')).toEqual({ conectadoEn: null });
  });

  it('desconectar borra solo la de esa cuenta', async () => {
    await guardarLaConexion('ana', new Date('2026-11-04T19:05:00Z'));
    await guardarLaConexion('beto', new Date('2026-11-04T20:00:00Z'));
    await borrarLaConexion('ana');
    expect(await leerLaConexion('ana')).toEqual({ conectadoEn: null });
    expect((await leerLaConexion('beto')).conectadoEn).not.toBeNull();
  });

  it('un valor roto se lee como «sin conectar», no como un error', async () => {
    await AsyncStorage.setItem('renaser.pasos.conexion.ana', '{no es json');
    expect(await leerLaConexion('ana')).toEqual({ conectadoEn: null });
    await AsyncStorage.setItem('renaser.pasos.conexion.ana', JSON.stringify({ conectadoEn: 'ayer' }));
    expect(await leerLaConexion('ana')).toEqual({ conectadoEn: null });
  });

  it('si el almacenamiento falla, no se rompe nada', async () => {
    const roto = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disco lleno'));
    await expect(guardarLaConexion('ana', new Date())).resolves.toBeUndefined();
    roto.mockRestore();
  });
});
