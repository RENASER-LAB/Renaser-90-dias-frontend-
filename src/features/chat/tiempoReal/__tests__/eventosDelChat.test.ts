import { describe, expect, it } from '@jest/globals';

import { leerEventoDelChat } from '../eventosDelChat';

/**
 * El contrato con el backend. Los cuerpos de acá están copiados de lo que serializan
 * `MensajeFanoutPayload` y `PresenciaFanoutPayload`: si alguien cambia esos records del lado
 * Java sin avisar, estas pruebas son las que lo delatan.
 *
 * Lo que más importa es la última parte: **nada que no se entienda llega a la pantalla**. Esto
 * corre dentro del manejador del socket, así que un payload raro —un backend más nuevo que la
 * app instalada— no puede tumbar la conexión.
 */
describe('eventos del chat en vivo', () => {
  it('lee un mensaje nuevo', () => {
    const evento = leerEventoDelChat(JSON.stringify({
      event: 'MESSAGE',
      id: '6f1c',
      conversationId: 'c1',
      senderId: 'u9',
      type: 'TEXT',
      text: 'hola',
      createdAt: '2026-09-17T12:00:00Z',
    }));

    expect(evento).toEqual(expect.objectContaining({ event: 'MESSAGE', senderId: 'u9', text: 'hola' }));
  });

  it('un mensaje sin texto (una foto, un audio) sigue siendo válido', () => {
    const evento = leerEventoDelChat(JSON.stringify({
      event: 'MESSAGE',
      id: '6f1c',
      conversationId: 'c1',
      senderId: 'u9',
      type: 'IMAGE',
      text: null,
      createdAt: '2026-09-17T12:00:00Z',
    }));

    expect(evento?.event).toBe('MESSAGE');
  });

  it('lee un encendido de presencia', () => {
    expect(leerEventoDelChat('{"event":"PRESENCE","userId":"u9","online":true}'))
      .toEqual({ event: 'PRESENCE', userId: 'u9', online: true });
  });

  it('lee un apagado de presencia', () => {
    expect(leerEventoDelChat('{"event":"PRESENCE","userId":"u9","online":false}'))
      .toEqual({ event: 'PRESENCE', userId: 'u9', online: false });
  });

  it('acepta un mensaje SIN el campo event: es lo que manda el backend de produccion', () => {
    // Exactamente lo que serializa el `MensajeFanoutPayload` anterior al 2026-09-17. Si esto se
    // rompe, la app nueva se queda sin mensajes en vivo hasta que se despliegue el backend — y
    // en silencio, que es la peor forma de romperse.
    const evento = leerEventoDelChat(JSON.stringify({
      id: '6f1c',
      conversationId: 'c1',
      senderId: 'u9',
      type: 'TEXT',
      text: 'hola',
      createdAt: '2026-09-17T12:00:00Z',
    }));

    expect(evento).toEqual(expect.objectContaining({ event: 'MESSAGE', senderId: 'u9' }));
  });

  it('descarta un evento de un tipo que esta version no conoce, sin lanzar', () => {
    expect(leerEventoDelChat('{"event":"ESCRIBIENDO","userId":"u9"}')).toBeNull();
  });

  it('un event desconocido NO se cuela por la rama tolerante del mensaje', () => {
    const conFormaDeMensaje = JSON.stringify({
      event: 'ESCRIBIENDO',
      id: '6f1c',
      conversationId: 'c1',
      senderId: 'u9',
      type: 'TEXT',
      text: 'hola',
      createdAt: '2026-09-17T12:00:00Z',
    });

    expect(leerEventoDelChat(conFormaDeMensaje)).toBeNull();
  });

  it('descarta una presencia a la que le falta el booleano en vez de darla por apagada', () => {
    expect(leerEventoDelChat('{"event":"PRESENCE","userId":"u9"}')).toBeNull();
  });

  it('descarta un JSON roto sin lanzar', () => {
    expect(leerEventoDelChat('{esto no es json')).toBeNull();
    expect(leerEventoDelChat('')).toBeNull();
  });

  it('descarta un cuerpo que no es un objeto', () => {
    expect(leerEventoDelChat('"hola"')).toBeNull();
    expect(leerEventoDelChat('null')).toBeNull();
  });
});
