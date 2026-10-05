import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  ...jest.requireActual<object>('../../../../services/http/apiClient'),
  apiFetch: (...a: unknown[]) => mockApiFetch(...a),
}));

import { enviarMensajeConMedia, enviarMensajeTexto } from '../chatApi';

/**
 * Responder a un mensaje (D-251 del backend, 2026-10-05): `POST .../messages` lleva `replyToId` solo
 * cuando hay cita. Sin cita el cuerpo es exactamente el de antes, campo por campo: lo que se manda a
 * un backend de producción no cambia para nadie que no esté respondiendo.
 *
 * Contra el código anterior falla la de la cita: `replyToId` no viajaba nunca.
 */
const RESPUESTA = {
  id: 'm-2', conversationId: 'c-1', senderId: 'u-ana', senderName: null, senderAvatarUrl: null, type: 'TEXT',
  text: 'Sí', mediaBucket: null, mediaPath: null, mediaMime: null, mediaBytes: null, mediaDurationSeconds: null,
  mediaUrl: null, hidden: false, replyToId: 'm-1', replyTo: null, createdAt: '2026-10-05T15:00:00Z', status: null,
};

describe('enviar con cita', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue(RESPUESTA);
  });

  it('texto: replyToId solo si hay cita', async () => {
    await enviarMensajeTexto('c-1', 'Sí', 'm-1');
    await enviarMensajeTexto('c-1', 'Hola');
    await enviarMensajeTexto('c-1', 'Hola', null);

    expect(mockApiFetch.mock.calls[0]).toEqual(['/api/v1/chat/conversations/c-1/messages',
      { method: 'POST', body: { type: 'TEXT', text: 'Sí', replyToId: 'm-1' } }]);
    expect(mockApiFetch.mock.calls[1][1]).toEqual({ method: 'POST', body: { type: 'TEXT', text: 'Hola' } });
    expect(mockApiFetch.mock.calls[2][1]).toEqual({ method: 'POST', body: { type: 'TEXT', text: 'Hola' } });
  });

  it('foto, sticker o nota de voz: la misma regla', async () => {
    const media = { tipo: 'AUDIO' as const, bucket: 'chat', ruta: 'chat/c-1/audios/x', mime: 'audio/m4a', durationSeconds: 5 };
    await enviarMensajeConMedia('c-1', { ...media, replyToId: 'm-1' });
    await enviarMensajeConMedia('c-1', media);

    const conCita = (mockApiFetch.mock.calls[0][1] as { body: Record<string, unknown> }).body;
    const sinCita = (mockApiFetch.mock.calls[1][1] as { body: Record<string, unknown> }).body;
    expect(conCita.replyToId).toBe('m-1');
    expect(sinCita).toEqual({ type: 'AUDIO', text: null, mediaBucket: 'chat', mediaPath: 'chat/c-1/audios/x',
      mediaMime: 'audio/m4a', mediaDurationSeconds: 5 });
  });

  it('la respuesta de un backend sin los campos nuevos de D-251 se valida igual', async () => {
    const { replyToId: _a, replyTo: _b, ...sinCampos } = RESPUESTA;
    mockApiFetch.mockResolvedValue(sinCampos);

    await expect(enviarMensajeTexto('c-1', 'Hola')).resolves.toMatchObject({ id: 'm-2' });
  });
});
