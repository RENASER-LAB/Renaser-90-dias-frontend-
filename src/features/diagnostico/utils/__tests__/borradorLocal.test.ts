import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';

import { respuestaTexto } from '../../__tests__/fixturesDelDiagnostico';
import { borrarBorrador, claveDelBorrador, guardarBorrador, leerBorrador } from '../borradorLocal';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('borrador local del diagnóstico', () => {
  it('la clave es por usuario y versión', () => {
    expect(claveDelBorrador('u-1', 3)).toBe('renaser.diagnostico.u-1.3');
  });

  it('lo guardado se lee igual, y otra cuenta u otra versión no lo ve', async () => {
    await guardarBorrador('u-1', 3, 4, [respuestaTexto(1, 'Ana')]);
    const b = await leerBorrador('u-1', 3);
    expect(b?.paso).toBe(4);
    expect(b?.respuestas).toEqual([respuestaTexto(1, 'Ana')]);
    expect(await leerBorrador('u-2', 3)).toBeNull();
    expect(await leerBorrador('u-1', 4)).toBeNull();
  });

  it('se borra al terminar', async () => {
    await guardarBorrador('u-1', 3, 0, [respuestaTexto(1, 'Ana')]);
    await borrarBorrador('u-1', 3);
    expect(await leerBorrador('u-1', 3)).toBeNull();
  });

  it('un JSON corrupto o de otra forma se lee como «no hay borrador», sin romper', async () => {
    await AsyncStorage.setItem(claveDelBorrador('u-1', 3), '{no es json');
    expect(await leerBorrador('u-1', 3)).toBeNull();
    await AsyncStorage.setItem(claveDelBorrador('u-1', 3), '"hola"');
    expect(await leerBorrador('u-1', 3)).toBeNull();
    await AsyncStorage.setItem(claveDelBorrador('u-1', 3), JSON.stringify({ paso: 'x', respuestas: [{ roto: true }, respuestaTexto(2, 'ok')] }));
    const b = await leerBorrador('u-1', 3);
    expect(b?.paso).toBe(0);
    expect(b?.respuestas).toEqual([respuestaTexto(2, 'ok')]);
  });

  it('si el almacenamiento falla, la app sigue sin borrador', async () => {
    const roto = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('lleno'));
    await expect(guardarBorrador('u-1', 3, 0, [])).resolves.toBeUndefined();
    roto.mockRestore();
    const lee = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('roto'));
    expect(await leerBorrador('u-1', 3)).toBeNull();
    lee.mockRestore();
  });
});
