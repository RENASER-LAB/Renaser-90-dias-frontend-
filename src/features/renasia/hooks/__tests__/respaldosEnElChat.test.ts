/**
 * El chat de SER no deja ningún texto de respaldo visible encima de la tarjeta, ni al llegar ni al releer el historial (issue #105, E2E del 02/11,
 * capturas `B4-ser-ritual-tarjeta` y `B4-ser-historial-recargado`).
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { CallbacksMensajeRenasia } from '../../api/renasiaStream';
import type { HistorialRenasiaApi } from '../../types/renasia.types';

let mockHistorial: HistorialRenasiaApi = { messages: [], nextCursor: null, hasMore: false };
let mockStream: (callbacks: CallbacksMensajeRenasia) => void = () => undefined;

jest.mock('../../api/renasiaApi', () => ({
  obtenerHistorialRenasia: async () => mockHistorial,
  confirmarPropuestaRenasia: async () => ({ estado: 'CONFIRMADA', mensaje: '' }),
  cancelarPropuestaRenasia: async () => undefined,
}));
jest.mock('../../api/renasiaStream', () => ({
  RenasiaCuotaExcedidaError: class extends Error {},
  enviarMensajeRenasia: async (_pregunta: string, _opciones: unknown, callbacks: CallbacksMensajeRenasia) => {
    mockStream(callbacks);
  },
}));

import { useRenasiaChat, type EstadoRenasiaChat } from '../useRenasiaChat';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const RITUAL = 'RITUAL TIERRA - AGUA - FUEGO (mañana)';
const RESPALDO_RITUAL = `Para registrar '${RITUAL}' cuenta como te sientes: si no ves el boton para escribir, hazlo desde Training.`;
const RESUMEN = "Marcar 'DESPERTAR' como hecho (+10 puntos si lo confirmas ahora)";
const DESPERTAR = `Propuesta: ${RESUMEN}`;

let raiz: ReactTestRenderer | null = null;
let chat: EstadoRenasiaChat;

function Sonda() {
  chat = useRenasiaChat({ agent: 'COMPANION' });
  return null;
}

async function montar() {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda));
  });
}

beforeEach(() => {
  mockHistorial = { messages: [], nextCursor: null, hasMore: false };
  mockStream = () => undefined;
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('al llegar la respuesta', () => {
  it('el respaldo del ritual y el de la propuesta, seguidos, no quedan como texto: solo las tarjetas', async () => {
    await montar();
    mockStream = c => {
      c.onTexto?.('Te dejé abajo el botón para escribir cómo te sientes. ✨');
      c.onTexto?.(`\n\n${RESPALDO_RITUAL}`);
      c.onTexto?.(`\n\n${DESPERTAR}`);
      c.onEvidencia?.({ tipo: 'evidencia', registroId: 'r1', titulo: RITUAL, venceEn: '2026-11-03T05:00:00Z', conPregunta: true, destino: 'habito' });
      c.onPropuesta?.({ tipo: 'propuesta', id: 'p1', resumen: RESUMEN, venceEn: '2026-11-03T00:59:46Z' });
      c.onFin?.();
    };
    await act(async () => {
      await chat.enviarPregunta('Hice mi ritual de la mañana');
    });
    const respuesta = chat.mensajes.find(m => m.autor === 'asistente')!;
    expect(respuesta.texto).toBe('Te dejé abajo el botón para escribir cómo te sientes. ✨');
    expect(respuesta.pedidosDeFoto).toHaveLength(1);
    expect(respuesta.propuestas).toHaveLength(1);
  });

  it('la foto de «Kilómetros diarios» con «desde Training» tampoco se queda', async () => {
    await montar();
    mockStream = c => {
      c.onTexto?.("¡Excelente esos 6 km! 👟\n\nFoto para registrar 'KILÓMETROS DIARIOS': si no ves el boton de la camara, subela desde Training.");
      c.onEvidencia?.({ tipo: 'evidencia', registroId: 'r2', titulo: 'KILÓMETROS DIARIOS', venceEn: '2026-11-03T05:00:00Z', conPregunta: false, destino: 'habito' });
      c.onFin?.();
    };
    await act(async () => {
      await chat.enviarPregunta('Hoy caminé 6 km');
    });
    expect(chat.mensajes.find(m => m.autor === 'asistente')!.texto).toBe('¡Excelente esos 6 km! 👟');
  });
});

describe('al releer el historial', () => {
  it('la propuesta guardada dos veces en la misma burbuja sale una sola vez', async () => {
    mockHistorial = {
      messages: [
        { id: 'm2', role: 'ASSISTANT', content: `¿Quieres que veamos algo más?\n\n${DESPERTAR}\n\n${DESPERTAR}`, createdAt: '2026-11-02T19:50:00Z' },
        { id: 'm1', role: 'USER', content: 'Ya me desperté', createdAt: '2026-11-02T19:49:00Z' },
      ] as never,
      nextCursor: null,
      hasMore: false,
    };
    await montar();
    await act(async () => {
      await chat.cargarHistorialInicial();
    });
    const textos = chat.mensajes.map(m => m.texto);
    expect(textos).toEqual(['Ya me desperté', `¿Quieres que veamos algo más?\n\n${DESPERTAR}`]);
  });

  it('lo que escribió la persona no se toca, aunque repita una línea', async () => {
    mockHistorial = {
      messages: [{ id: 'm1', role: 'USER', content: `${DESPERTAR}\n\n${DESPERTAR}`, createdAt: '2026-11-02T19:49:00Z' }] as never,
      nextCursor: null,
      hasMore: false,
    };
    await montar();
    await act(async () => {
      await chat.cargarHistorialInicial();
    });
    expect(chat.mensajes[0].texto).toBe(`${DESPERTAR}\n\n${DESPERTAR}`);
  });
});
