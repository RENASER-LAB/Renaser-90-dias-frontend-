/** Spec 048 (FR-004, FR-006): sin señal, Hoy, los hábitos de hoy y el Plan muestran lo último cargado; lo demás no se inventa. */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../../services/storage/almacenamientoSeguro', () => ({ almacenamientoSeguro: {
  guardarToken: jest.fn(async () => undefined), borrarToken: jest.fn(async () => undefined), leerToken: jest.fn(async () => null),
} }));

import { apiFetch, setTokenSesion } from '../../../services/http/apiClient';
import { _reiniciarConexion, sinConexionDesdeMs } from '../estadoDeConexion';

const original = globalThis.fetch;
const responde = (cuerpo: unknown) => jest.fn<typeof fetch>(async () => ({
  ok: true, status: 200, headers: { get: () => null }, text: async () => JSON.stringify(cuerpo),
} as unknown as Response));
const sinRed = () => jest.fn<typeof fetch>(async () => {
  throw new TypeError('Network request failed');
});

beforeEach(async () => {
  await AsyncStorage.clear();
  _reiniciarConexion();
  setTokenSesion('token-de-la-sesion-de-ana-0001');
});
afterEach(() => {
  globalThis.fetch = original;
});

describe('lecturas sin red (spec 048)', () => {
  it('los hábitos de hoy se ven sin señal con lo último que dio el servidor', async () => { // spec 048 FR-004
    globalThis.fetch = responde([{ id: 'r1', estado: 'PENDIENTE' }]);
    await apiFetch('/api/v1/habit-tracks/today');
    await new Promise(r => setTimeout(r, 0));
    globalThis.fetch = sinRed();

    await expect(apiFetch('/api/v1/habit-tracks/today')).resolves.toEqual([{ id: 'r1', estado: 'PENDIENTE' }]);
  });

  it('fase 2: las categorías del Muro se leen sin señal, para escribir una publicación', async () => { // spec 048 FR-021
    globalThis.fetch = responde([{ clave: 'LOGROS', nombre: 'Logros' }]);
    await apiFetch('/api/v1/wall/categories');
    await new Promise(r => setTimeout(r, 0));
    globalThis.fetch = sinRed();

    await expect(apiFetch('/api/v1/wall/categories')).resolves.toEqual([{ clave: 'LOGROS', nombre: 'Logros' }]);
  });

  it('una lectura que no está en la lista (por ejemplo SER) no se inventa: falla como sin red', async () => { // spec 048 FR-005
    globalThis.fetch = responde({ ok: true });
    await apiFetch('/api/v1/renasia/historial');
    globalThis.fetch = sinRed();

    await expect(apiFetch('/api/v1/renasia/historial')).rejects.toMatchObject({ status: 0 });
  });

  it('sin respuesta queda «sin conexión desde…» y vuelve con la próxima respuesta', async () => { // spec 048 FR-006
    globalThis.fetch = sinRed();
    await apiFetch('/api/v1/renasia/historial').catch(() => undefined);
    expect(sinConexionDesdeMs()).not.toBeNull();

    globalThis.fetch = responde({});
    await apiFetch('/api/v1/renasia/historial');
    expect(sinConexionDesdeMs()).toBeNull();
  });

  it('lo guardado es de esa sesión: con otra sesión no se muestra', async () => { // spec 048 FR-009
    globalThis.fetch = responde({ hoy: 'de ana' });
    await apiFetch('/api/v1/home');
    await new Promise(r => setTimeout(r, 0));
    setTokenSesion('token-de-la-sesion-de-luis-9999');
    globalThis.fetch = sinRed();

    await expect(apiFetch('/api/v1/home')).rejects.toMatchObject({ status: 0 });
  });
});
