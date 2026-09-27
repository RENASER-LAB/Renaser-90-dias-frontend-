/**
 * `apiFetch` con un `FormData` (D-212, la foto de un grupo): va tal cual y sin `Content-Type` propio,
 * porque el `boundary` del multipart lo pone `fetch`. Con un `Content-Type: application/json` o
 * pasado por `JSON.stringify`, el backend no encontraría la parte `foto`.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../storage/almacenamientoSeguro', () => ({
  almacenamientoSeguro: {
    guardarToken: jest.fn(async () => undefined),
    borrarToken: jest.fn(async () => undefined),
    leerToken: jest.fn(async () => null),
  },
}));

import { apiFetch, setTokenSesion } from '../apiClient';

type Pedido = { method: string; headers: Record<string, string>; body: unknown };

function capturarPedidos(): Pedido[] {
  const pedidos: Pedido[] = [];
  (globalThis as unknown as { fetch: unknown }).fetch = jest.fn(async (_url: string, opciones: Pedido) => {
    pedidos.push(opciones);
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => '{"ok":true}' };
  });
  return pedidos;
}

beforeEach(() => {
  setTokenSesion('sesion-1');
});

describe('apiFetch con FormData', () => {
  it('manda el formulario tal cual, sin Content-Type propio y con la sesión', async () => {
    const pedidos = capturarPedidos();
    const formulario = new FormData();
    formulario.append('foto', 'contenido');

    await apiFetch('/api/v1/admin/cells/g-1/photo', { method: 'PUT', body: formulario });

    expect(pedidos[0].body).toBe(formulario);
    expect(pedidos[0].headers['Content-Type']).toBeUndefined();
    expect(pedidos[0].headers['X-Auth-Token']).toBe('sesion-1');
  });

  it('un objeto común sigue yendo como JSON', async () => {
    const pedidos = capturarPedidos();

    await apiFetch('/api/v1/algo', { method: 'POST', body: { a: 1 } });

    expect(pedidos[0].body).toBe('{"a":1}');
    expect(pedidos[0].headers['Content-Type']).toBe('application/json');
  });
});
