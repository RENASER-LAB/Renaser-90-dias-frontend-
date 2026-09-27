/**
 * No adivinar el rol del otro en un 1 a 1 (2026-09-27).
 *
 * El resumen de `GET /conversations` trae el nombre del otro pero no su rol; el rol sale del
 * directorio (`GET /chat/members`, una página). Cuando el directorio no lo traía, el mapeador
 * ponía `role ?? 'TRAINEE'` y la cabecera decía «Aprendiz · 1 a 1» —y la info del contacto,
 * «Aprendiz»— de un mentor o de alguien del staff. Contra ese código fallan las dos primeras.
 */
import { describe, expect, it } from '@jest/globals';

import { mapearResumenConversacion, SUBTITULO_DE_UN_1_A_1_SIN_ROL } from '../chatMappers';
import { subtituloDeLaCabecera } from '../../utils/formatoChat';
import { subtituloDeLaInfo } from '../../utils/infoDelChat';
import type { WireConversacionResumen, WireMiembro } from '../../types/chat.types';

const directo: WireConversacionResumen = {
  conversation: { id: 'c-1', type: 'DIRECT', celulaId: null, nombre: null, createdAt: '2026-09-20T12:00:00Z' },
  lastMessage: null,
  unreadCount: 0,
  otherParticipantId: 'u-ricardo',
  otherParticipantName: 'Ricardo Díaz',
};

/** Lo que muestran la cabecera del chat y la info del contacto con esa conversación. */
function loQueSeLee(directorio: Record<string, WireMiembro>) {
  const conversacion = mapearResumenConversacion(directo, 'u-yo', directorio);
  return {
    conversacion,
    cabecera: subtituloDeLaCabecera({ tipo: 'direct', integrantes: null, subtitulo: conversacion.subtitle }),
    info: subtituloDeLaInfo({
      tipo: 'direct',
      integrantes: null,
      rolDelOtro: conversacion.rolDelOtro,
      subtitulo: conversacion.subtitle,
    }),
  };
}

describe('el rol del otro en un 1 a 1', () => {
  it('sin rol en el directorio no dice «Aprendiz»: queda «1 a 1» en la cabecera y en la info', () => {
    const { conversacion, cabecera, info } = loQueSeLee({});
    expect(conversacion.title).toBe('Ricardo Díaz');
    expect(conversacion.rolDelOtro).toBeNull();
    expect(cabecera).toBe('1 a 1');
    expect(info).toBe('1 a 1');
    expect(`${cabecera} ${info}`).not.toContain('Aprendiz');
    expect(SUBTITULO_DE_UN_1_A_1_SIN_ROL).toBe('1 a 1');
  });

  it('un rol vacío tampoco dice quién es', () => {
    const { conversacion, info } = loQueSeLee({
      'u-ricardo': { id: 'u-ricardo', fullName: 'Ricardo Díaz', avatarUrl: null, role: '  ' },
    });
    expect(conversacion.subtitle).toBe('1 a 1');
    expect(info).toBe('1 a 1');
  });

  it('con el rol en el directorio se dice el rol, en la cabecera y en la info', () => {
    const mentor = loQueSeLee({
      'u-ricardo': { id: 'u-ricardo', fullName: 'Ricardo Díaz', avatarUrl: null, role: 'MENTOR' },
    });
    expect(mentor.cabecera).toBe('Mentor · 1 a 1');
    expect(mentor.info).toBe('Mentor');

    const aprendiz = loQueSeLee({
      'u-ricardo': { id: 'u-ricardo', fullName: 'Ricardo Díaz', avatarUrl: null, role: 'TRAINEE' },
    });
    expect(aprendiz.cabecera).toBe('Aprendiz · 1 a 1');
    expect(aprendiz.info).toBe('Aprendiz');
  });

  it('sin saber ni quién es el otro sigue diciendo «Conversación directa»', () => {
    const conversacion = mapearResumenConversacion(
      { ...directo, otherParticipantId: null, otherParticipantName: null },
      'u-yo',
      {}
    );
    expect(conversacion.subtitle).toBe('Conversación directa');
    expect(conversacion.rolDelOtro).toBeNull();
  });

  it('resuelto por el remitente del último mensaje (backend viejo), el rol sale del directorio', () => {
    const conversacion = mapearResumenConversacion(
      {
        ...directo,
        otherParticipantId: null,
        otherParticipantName: null,
        lastMessage: {
          id: 'm-1',
          conversationId: 'c-1',
          senderId: 'u-ana',
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
          createdAt: '2026-09-27T09:00:00Z',
        },
      },
      'u-yo',
      { 'u-ana': { id: 'u-ana', fullName: 'Ana Rojas', avatarUrl: null, role: 'ADMIN' } }
    );
    expect(conversacion.title).toBe('Ana Rojas');
    expect(conversacion.subtitle).toBe('Administrador · 1 a 1');
    expect(conversacion.rolDelOtro).toBe('Administrador');
  });
});
