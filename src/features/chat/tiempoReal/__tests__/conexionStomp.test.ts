/**
 * El socket del chat contra un WebSocket falso que se comporta como el de React Native.
 *
 * Bug del 2026-09-26: con la conversación abierta, un mensaje de otra persona no aparecía nunca.
 * El socket abría (`GET /ws 101`) pero el servidor jamás procesaba el CONNECT
 * (`processed CONNECT(0)`): React Native cortaba el NUL final de cada trama mandada como texto.
 * Estas pruebas fallan contra el código de antes (mandaba `string`, y con `heart-beat:0,0`
 * reconectaba cada 32 s de silencio dejando el socket viejo abierto).
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../../../config/apiConfig', () => ({ API_CONFIG: { BASE_URL: 'http://localhost:8080' } }));
jest.mock('../../../../services/http/apiClient', () => ({ getTokenSesion: () => 'token-de-prueba' }));

import { conexionChat } from '../conexionStomp';

class SocketFalso {
  static creados: SocketFalso[] = [];
  enviados: unknown[] = [];
  cerrado = false;
  onopen: (() => void) | null = null;
  onmessage: ((evento: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(public url: string) {
    SocketFalso.creados.push(this);
  }
  send(datos: unknown) {
    this.enviados.push(datos);
  }
  close() {
    this.cerrado = true;
  }
  /** Lo enviado, como texto, para leer los comandos. */
  textos(): string[] {
    return this.enviados.map(d => (typeof d === 'string' ? d : String.fromCharCode(...(d as Uint8Array))));
  }
}

const original = globalThis.WebSocket;

beforeEach(() => {
  jest.useFakeTimers();
  SocketFalso.creados = [];
  (globalThis as { WebSocket: unknown }).WebSocket = SocketFalso;
});

afterEach(() => {
  conexionChat.cerrarTodo();
  jest.useRealTimers();
  (globalThis as { WebSocket: unknown }).WebSocket = original;
});

describe('conexionChat', () => {
  it('manda las tramas en binario y con su NUL final, que el puente de texto cortaba', () => {
    conexionChat.suscribir('/topic/conversaciones/c1', () => undefined);
    const socket = SocketFalso.creados[0];
    socket.onopen?.();

    const connect = socket.enviados[0];
    expect(typeof connect).not.toBe('string');
    expect(connect).toBeInstanceOf(Uint8Array);
    const bytes = connect as Uint8Array;
    expect(bytes[bytes.length - 1]).toBe(0);
    expect(socket.textos()[0].startsWith('CONNECT\n')).toBe(true);
  });

  it('se suscribe tras el CONNECTED aunque llegue sin NUL, y entrega el mensaje ajeno', () => {
    const recibidos: string[] = [];
    conexionChat.suscribir('/topic/conversaciones/c1', cuerpo => recibidos.push(cuerpo));
    const socket = SocketFalso.creados[0];
    socket.onopen?.();

    socket.onmessage?.({ data: 'CONNECTED\nversion:1.2\nheart-beat:0,0\n\n' });
    const subscribe = socket.textos().find(t => t.startsWith('SUBSCRIBE\n'));
    expect(subscribe).toContain('destination:/topic/conversaciones/c1');

    socket.onmessage?.({
      data: 'MESSAGE\ndestination:/topic/conversaciones/c1\nsubscription:sub-0\n\n{"event":"MESSAGE"}\u0000',
    });
    expect(recibidos).toEqual(['{"event":"MESSAGE"}']);
  });

  it('con «heart-beat:0,0» una conversación callada no se da por muerta', () => {
    conexionChat.suscribir('/topic/conversaciones/c1', () => undefined);
    const socket = SocketFalso.creados[0];
    socket.onopen?.();
    socket.onmessage?.({ data: 'CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\u0000' });

    jest.advanceTimersByTime(120_000);

    expect(SocketFalso.creados).toHaveLength(1);
    expect(socket.cerrado).toBe(false);
  });

  it('si el CONNECTED no llega, cierra ese socket y reintenta con otro', () => {
    conexionChat.suscribir('/topic/conversaciones/c1', () => undefined);
    const socket = SocketFalso.creados[0];
    socket.onopen?.();

    jest.advanceTimersByTime(40_000);

    expect(socket.cerrado).toBe(true);
    expect(SocketFalso.creados).toHaveLength(2);
  });
});
