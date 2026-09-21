/**
 * Un tipo de mensaje que este binario no conoce.
 *
 * El caso importa más de lo que parece: `lastMessage` viaja ANIDADO dentro de cada elemento de
 * `GET /conversations`. Con el `z.enum` cerrado que había antes, un solo mensaje de tipo nuevo
 * hacía fallar la validación del array de conversaciones — la persona se quedaba sin LA BANDEJA
 * entera por un mensaje que ni siquiera iba a abrir. Y aflojar el schema no alcanzaba: el mapeo
 * devolvía `undefined` como texto, o sea una burbuja vacía, que es el mismo "fallo convertido en
 * silencio" que ARF-02 prohíbe.
 */
import { describe, expect, it } from '@jest/globals';

import { mapearMensaje } from '../chatMappers';
import { wireConversacionesListSchema, wireMensajeSchema } from '../chatSchemas';

/** Un mensaje completo, con el `type` como única variable del experimento. */
function mensajeCon(type: string) {
  return {
    id: 'm1',
    conversationId: 'c1',
    senderId: 'u1',
    senderName: 'Quien sea',
    senderAvatarUrl: null,
    type,
    text: null,
    mediaBucket: null,
    mediaPath: null,
    mediaMime: null,
    mediaBytes: null,
    mediaDurationSeconds: null,
    mediaUrl: null,
    hidden: false,
    replyToId: null,
    replyTo: null,
    createdAt: '2026-09-16T01:00:00Z',
  };
}

const CONVERSACION = {
  id: 'c1',
  type: 'DIRECT',
  celulaId: null,
  nombre: null,
  createdAt: '2026-09-16T01:00:00Z',
};

describe('tipo de mensaje desconocido', () => {
  it('no tumba la validación de un mensaje', () => {
    expect(wireMensajeSchema.safeParse(mensajeCon('STICKER')).success).toBe(true);
  });

  /* El que de verdad importa: con el enum cerrado, este caso dejaba a la persona sin NINGUNA
     conversación, no sin una. */
  it('no tumba la bandeja entera cuando llega como último mensaje', () => {
    const r = wireConversacionesListSchema.safeParse([
      { conversation: CONVERSACION, lastMessage: mensajeCon('STICKER'), unreadCount: 0 },
    ]);
    expect(r.success).toBe(true);
  });

  it('se ve como un mensaje no compatible, no como una burbuja vacía', () => {
    expect(mapearMensaje(mensajeCon('STICKER') as never, 'otro').text)
      .toBe('Mensaje no compatible. Actualiza la app para verlo.');
  });

  it('un TEXT sin texto sigue sin inventar contenido', () => {
    expect(mapearMensaje(mensajeCon('TEXT') as never, 'otro').text).toBeUndefined();
  });
});
