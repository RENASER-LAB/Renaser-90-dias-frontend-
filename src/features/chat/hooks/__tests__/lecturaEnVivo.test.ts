/**
 * La conversación abierta recibe en vivo hasta dónde leyeron todos (D-208 del backend, 2026-09-27)
 * y quien escribió ve pasar ✓ a ✓✓ sin recargar. Contra el `useChatEnVivo` anterior fallan: el aviso
 * `READ` no se entendía y el hook no devolvía ninguna marca.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

type Oyente = (cuerpo: string) => void;
const oyentes = new Map<string, Oyente>();
const mockSuscribir = jest.fn((destino: string, oyente: Oyente) => {
  oyentes.set(destino, oyente);
  return () => oyentes.delete(destino);
});
jest.mock('../../tiempoReal/conexionStomp', () => ({
  HAY_CHAT_EN_VIVO: true,
  destinoDeConversacion: (id: string) => `/topic/conversaciones/${id}`,
  conexionChat: { suscribir: (destino: string, oyente: Oyente) => mockSuscribir(destino, oyente) },
}));
jest.mock('../../api/chatApi', () => ({
  obtenerPresencia: () => Promise.resolve([]),
}));

import { useChatEnVivo } from '../useChatEnVivo';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let vivo: ReturnType<typeof useChatEnVivo>;
function Sonda({ conversacionId, confirmaLectura }: { conversacionId: string | null; confirmaLectura?: boolean }) {
  vivo = useChatEnVivo({ conversacionId, miUsuarioId: 'u-ana', confirmaLectura });
  return null;
}

async function montar(props: { conversacionId: string | null; confirmaLectura?: boolean }): Promise<ReactTestRenderer> {
  let raiz!: ReactTestRenderer;
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda, props));
  });
  return raiz;
}

/** Lo que el backend empuja por `/topic/conversaciones/{id}`. */
async function llega(conversacionId: string, cuerpo: string) {
  await act(async () => {
    oyentes.get(`/topic/conversaciones/${conversacionId}`)?.(cuerpo);
  });
}

const leyeronHasta = (instante: string) => JSON.stringify({ event: 'READ', readUpTo: instante });

describe('useChatEnVivo y la doble marca', () => {
  beforeEach(() => {
    oyentes.clear();
    mockSuscribir.mockClear();
  });

  it('el aviso READ da la marca de la conversación abierta, y solo avanza', async () => {
    await montar({ conversacionId: 'c-1' });
    expect(vivo.leidoHasta).toBeNull();

    await llega('c-1', leyeronHasta('2026-09-27T17:05:00Z'));
    expect(vivo.leidoHasta).toBe('2026-09-27T17:05:00Z');

    // Un aviso viejo que llega tarde no la hace retroceder.
    await llega('c-1', leyeronHasta('2026-09-27T17:00:00Z'));
    expect(vivo.leidoHasta).toBe('2026-09-27T17:05:00Z');
  });

  it('la marca de un chat no se ve en otro, y volver al primero la encuentra', async () => {
    const raiz = await montar({ conversacionId: 'c-1' });
    await llega('c-1', leyeronHasta('2026-09-27T17:05:00Z'));

    await act(async () => raiz.update(React.createElement(Sonda, { conversacionId: 'c-2' })));
    expect(vivo.leidoHasta).toBeNull();

    await act(async () => raiz.update(React.createElement(Sonda, { conversacionId: 'c-1' })));
    expect(vivo.leidoHasta).toBe('2026-09-27T17:05:00Z');
  });

  it('en la comunidad no hay ✓✓: un aviso de lectura se ignora', async () => {
    await montar({ conversacionId: 'c-global', confirmaLectura: false });

    await llega('c-global', leyeronHasta('2026-09-27T17:05:00Z'));

    expect(vivo.leidoHasta).toBeNull();
  });

  it('un aviso raro no rompe nada ni cambia la marca', async () => {
    await montar({ conversacionId: 'c-1' });

    await llega('c-1', '{"event":"READ"}');
    await llega('c-1', '{esto no es json');

    expect(vivo.leidoHasta).toBeNull();
  });
});
