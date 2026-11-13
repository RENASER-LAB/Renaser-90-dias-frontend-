import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { EstadoDelWhatsapp } from '../../api/whatsappConfirmadoApi';

/** Spec 051: la fila de Yo lee el estado del servidor, se esconde si no lo ofrece y relee tras confirmar. */

const mockLeer = jest.fn<() => Promise<EstadoDelWhatsapp>>();
jest.mock('../../api/whatsappConfirmadoApi', () => ({ leerWhatsappConfirmado: () => mockLeer() }));
jest.mock('../../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' }, isAuthenticated: true }) }));

import { useWhatsappConfirmado } from '../useWhatsappConfirmado';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
let ultimo: ReturnType<typeof useWhatsappConfirmado> | null = null;
function Sonda() {
  ultimo = useWhatsappConfirmado();
  return null;
}
async function montar() {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda));
  });
}

beforeEach(() => {
  mockLeer.mockReset();
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  ultimo = null;
});

describe('useWhatsappConfirmado', () => {
  // spec 051 FR-010
  it('si el servidor no lo ofrece (404, backend anterior) no hay estado y la fila no se dibuja', async () => {
    mockLeer.mockRejectedValue(new Error('404'));
    await montar();
    expect(ultimo!.estado).toBeNull();
  });

  // spec 051 FR-010, FR-012
  it('lee el estado al entrar y lo relee tras confirmar: la fila muestra lo que guardó el servidor', async () => {
    mockLeer.mockResolvedValueOnce({ disponible: true, confirmado: null });
    await montar();
    expect(ultimo!.estado).toEqual({ disponible: true, confirmado: null });
    mockLeer.mockResolvedValueOnce({ disponible: true, confirmado: '+51 9•• ••• •21' });
    await act(async () => ultimo!.recargar());
    expect(ultimo!.estado?.confirmado).toBe('+51 9•• ••• •21');
    expect(mockLeer).toHaveBeenCalledTimes(2);
  });

  // spec 051 FR-012
  it('una lectura vieja nunca pisa a una nueva', async () => {
    let soltarVieja: (e: EstadoDelWhatsapp) => void = () => undefined;
    mockLeer.mockReturnValueOnce(new Promise(r => { soltarVieja = r; }));
    await montar();
    mockLeer.mockResolvedValueOnce({ disponible: true, confirmado: '+51 9•• ••• •21' });
    await act(async () => ultimo!.recargar());
    await act(async () => soltarVieja({ disponible: true, confirmado: null }));
    expect(ultimo!.estado?.confirmado).toBe('+51 9•• ••• •21');
  });
});
