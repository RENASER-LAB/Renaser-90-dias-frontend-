import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../storage/almacenamientoSeguro', () => ({ almacenamientoSeguro: {
  guardarToken: jest.fn(async () => undefined), borrarToken: jest.fn(async () => undefined),
  leerToken: jest.fn(async () => null),
} }));
import { apiFetch, setTokenSesion } from '../apiClient';

const original = globalThis.fetch;
beforeEach(() => { jest.useFakeTimers(); setTokenSesion('token-de-prueba'); });
afterEach(() => { globalThis.fetch = original; jest.useRealTimers(); });

describe('lecturas del Día 1 con espera limitada', () => {
  it('corta una conexión que nunca responde y permite una segunda petición', async () => {
    globalThis.fetch = jest.fn<typeof fetch>((_ruta, opciones) => new Promise((_resolver, rechazar) => {
      opciones?.signal?.addEventListener('abort', () => rechazar(new Error('cancelada')));
    }));
    const resultado = apiFetch('/api/v1/onboarding/activate-program', { timeoutMs: 15_000 }).catch(e => e);
    await jest.advanceTimersByTimeAsync(15_000);
    expect(await resultado).toMatchObject({ status: 0, message: 'El servidor tardó en responder. Intenta de nuevo.' });
    globalThis.fetch = jest.fn<typeof fetch>(async () => ({ ok: true, status: 200,
      headers: { get: () => null }, text: async () => '{"activated":false}' } as unknown as Response));
    await expect(apiFetch('/api/v1/onboarding/activate-program', { timeoutMs: 15_000 })).resolves.toEqual({ activated: false });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('corta también un cuerpo que no termina de llegar después de las cabeceras', async () => {
    globalThis.fetch = jest.fn<typeof fetch>(async (_ruta, opciones) => ({ ok: true, status: 200,
      headers: { get: () => null }, text: () => new Promise((_resolver, rechazar) => {
        opciones?.signal?.addEventListener('abort', () => rechazar(new Error('cuerpo cancelado')));
      }) } as unknown as Response));
    const resultado = apiFetch('/api/v1/onboarding/activate-program', { timeoutMs: 15_000 }).catch(e => e);
    await jest.advanceTimersByTimeAsync(15_000);
    expect(await resultado).toMatchObject({ status: 0 });
    expect(jest.getTimerCount()).toBe(0);
  });
});
