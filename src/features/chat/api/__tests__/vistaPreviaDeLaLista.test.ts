/**
 * Lo que la lista de chats dice del último mensaje (chat estilo WhatsApp, 2026-09-26), armado con
 * lo que ya manda `GET /api/v1/chat/conversations`.
 *
 * Contra el código viejo fallan todas: la fila mostraba el texto crudo («Imagen adjunta», «Nota de
 * voz») sin «Tú: », la hora era «9:04 PM» y el mapeo no guardaba ni la fecha del último mensaje
 * (con la que se ordena) ni la foto del otro en un 1 a 1.
 */
import { describe, expect, it } from '@jest/globals';

import { mapearMensaje, mapearResumenConversacion, resumenDelUltimoMensaje } from '../chatMappers';
import type { WireConversacionResumen, WireMensaje } from '../../types/chat.types';

const YO = 'u-yo';
const AHORA = new Date(2026, 8, 26, 21, 30);

function mensaje(parcial: Partial<WireMensaje>): WireMensaje {
  return {
    id: 'm-1',
    conversationId: 'c-1',
    senderId: 'u-otra',
    senderName: null,
    senderAvatarUrl: null,
    type: 'TEXT',
    text: 'Hola',
    mediaBucket: null,
    mediaPath: null,
    mediaMime: null,
    mediaBytes: null,
    mediaDurationSeconds: null,
    mediaUrl: null,
    hidden: false,
    replyToId: null,
    replyTo: null,
    createdAt: new Date(2026, 8, 26, 21, 4).toISOString(),
    ...parcial,
  };
}

describe('resumenDelUltimoMensaje', () => {
  it('«Tú: …» si lo mandé yo, con la hora corta y la fecha para ordenar', () => {
    const ultimo = mensaje({ senderId: YO, text: 'Ya subí mi foto' });
    expect(resumenDelUltimoMensaje(ultimo, YO, AHORA)).toEqual({
      lastMessage: 'Tú: Ya subí mi foto',
      lastTime: '21:04',
      lastMessageAt: ultimo.createdAt,
    });
  });

  it('una foto sin texto dice «📷 Foto» y un audio «🎤 Audio»', () => {
    expect(resumenDelUltimoMensaje(mensaje({ type: 'IMAGE', text: null }), YO, AHORA).lastMessage).toBe('📷 Foto');
    expect(resumenDelUltimoMensaje(mensaje({ type: 'AUDIO', text: null, senderId: YO }), YO, AHORA).lastMessage).toBe(
      'Tú: 🎤 Audio'
    );
  });

  it('sin mensajes no hay hora ni fecha', () => {
    expect(resumenDelUltimoMensaje(null, YO, AHORA)).toEqual({
      lastMessage: 'Todavía no hay mensajes',
      lastTime: '',
      lastMessageAt: null,
    });
  });
});

describe('mapearResumenConversacion', () => {
  it('guarda la fecha de creación y la foto del otro en un 1 a 1', () => {
    const resumen: WireConversacionResumen = {
      conversation: { id: 'c-1', type: 'DIRECT', celulaId: null, nombre: null, createdAt: '2026-09-20T12:00:00Z' },
      lastMessage: null,
      unreadCount: 2,
      otherParticipantId: 'u-otra',
      otherParticipantName: 'Ana López',
      otherParticipantAvatarUrl: 'https://cdn/ana.jpg',
    };
    const conversacion = mapearResumenConversacion(resumen, YO, {});
    expect(conversacion.createdAt).toBe('2026-09-20T12:00:00Z');
    expect(conversacion.avatarUrl).toBe('https://cdn/ana.jpg');
    expect(conversacion.lastMessageAt).toBeNull();
    expect(conversacion.unreadCount).toBe(2);
  });
});

describe('mapearMensaje', () => {
  it('una foto que se puede ver no lleva el rótulo «Imagen adjunta» al pie', () => {
    const foto = mapearMensaje(mensaje({ type: 'IMAGE', text: null, mediaUrl: 'https://s3/foto.jpg' }), YO);
    expect(foto.text).toBeUndefined();
    const conTexto = mapearMensaje(mensaje({ type: 'IMAGE', text: 'Mi evidencia', mediaUrl: 'https://s3/foto.jpg' }), YO);
    expect(conTexto.text).toBe('Mi evidencia');
  });

  it('trae la fecha, el remitente y la hora en 24 h para las burbujas', () => {
    const m = mapearMensaje(mensaje({ senderId: 'u-ana', senderName: 'Ana' }), YO);
    expect(m.time).toBe('21:04');
    expect(m.senderId).toBe('u-ana');
    expect(m.createdAt).toBe(mensaje({}).createdAt);
  });
});
