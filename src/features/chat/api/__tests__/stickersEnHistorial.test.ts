import { describe, expect, it } from '@jest/globals';
import { mapearMensaje, resumenDelUltimoMensaje } from '../chatMappers';
import type { WireMensaje } from '../../types/chat.types';

const wire: WireMensaje = {
  id: 'm-sticker', conversationId: 'chat-1', senderId: 'aprendiz-1', senderName: 'Ana',
  senderAvatarUrl: null, type: 'IMAGE', text: 'Sticker Renaser: Conéctate a tu sesión',
  mediaBucket: 'renaser', mediaPath: 'chat/chat-1/fotos/webp', mediaMime: 'image/webp',
  mediaBytes: 38608, mediaDurationSeconds: null, mediaUrl: 'https://s3.example/lectura-firmada',
  hidden: false, replyToId: null, replyTo: null, createdAt: '2026-09-30T17:00:00Z', status: 'SENT',
};

describe('stickers en el historial que recibe otra persona', () => {
  it('reconoce el sticker tras recargar, con su URL real y sin mostrar la etiqueta técnica', () => {
    const mensaje = mapearMensaje(wire, 'mentor-1');
    expect(mensaje.esSticker).toBe(true);
    expect(mensaje.isMe).toBe(false);
    expect(mensaje.stickerNombre).toBe('Conéctate a tu sesión');
    expect(mensaje.text).toBeUndefined();
    expect(mensaje.mediaUrl).toBe(wire.mediaUrl);
    expect(resumenDelUltimoMensaje(wire, 'mentor-1').lastMessage).toBe('Sticker');
    expect(resumenDelUltimoMensaje(wire, 'aprendiz-1').lastMessage).toBe('Tú: Sticker');
  });

  it('una foto normal, incluso WebP, sigue mostrándose como foto con su texto', () => {
    for (const foto of [{ ...wire, text: 'Mi foto' }, { ...wire, mediaMime: 'image/jpeg' }]) {
      const mensaje = mapearMensaje(foto, 'mentor-1');
      expect(mensaje.esSticker).toBe(false);
      expect(mensaje.type).toBe('image_grid');
      expect(mensaje.text).toBe(foto.text);
    }
    expect(mapearMensaje({ ...wire, type: 'TEXT', mediaMime: null }, 'mentor-1').esSticker).toBe(false);
  });

  it('con la URL ausente muestra un respaldo y conserva la marca de leído', () => {
    const mensaje = mapearMensaje({ ...wire, mediaUrl: null, status: 'READ' }, 'aprendiz-1');
    expect(mensaje.mediaList).toEqual(['Sticker no disponible']);
    expect(mensaje.status).toBe('read');
  });
});
