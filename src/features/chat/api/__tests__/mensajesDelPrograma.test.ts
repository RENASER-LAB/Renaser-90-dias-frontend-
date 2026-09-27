/**
 * Los mensajes que manda el PROGRAMA (2026-09-27): la bienvenida del chat de soporte pasa a
 * mandarse con el tipo de sistema del backend (`TipoMensaje.SISTEMA`, `"SYSTEM"` en el JSON de
 * `MensajeResponse`) y puede llegar sin una persona detrás.
 *
 * Contra el código anterior fallan: el esquema exigía `senderId` como texto (un emisor `null`
 * rechazaba la página de mensajes y, anidado en `lastMessage`, LA BANDEJA entera); un mensaje de
 * sistema salía a nombre de la cuenta que lo guardó —a la derecha si esa cuenta era la de quien
 * mira— y su imagen se perdía, porque se pintaba siempre como texto.
 */
import { describe, expect, it } from '@jest/globals';

import type { ChatConversation, ChatMessage } from '../../../../screens/ComunidadScreen';
import {
  conversacionConHistorial,
  esMensajeDelPrograma,
  FIRMA_DEL_PROGRAMA,
  mapearMensaje,
  mapearResumenConversacion,
  refinarTituloConMensajes,
  resumenDelUltimoMensaje,
} from '../chatMappers';
import { wireConversacionesListSchema, wireMensajeSchema, wireMensajesPageSchema } from '../chatSchemas';
import type { WireMensaje } from '../../types/chat.types';

const YO = 'u-kelin';
const AHORA = new Date(2026, 8, 27, 10, 0);

function mensaje(parcial: Partial<WireMensaje>): WireMensaje {
  return {
    id: 'm-1',
    conversationId: 'c-soporte',
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
    createdAt: new Date(2026, 8, 27, 9, 30).toISOString(),
    ...parcial,
  };
}

/** Lo que manda el backend en el JSON, crudo, antes de validar. */
function crudo(parcial: Record<string, unknown>): Record<string, unknown> {
  return { ...mensaje({}), ...parcial };
}

const TARJETA = {
  type: 'SYSTEM',
  text: null,
  mediaBucket: 'chat',
  mediaPath: 'chat/c-soporte/fotos/abc',
  mediaMime: 'image/png',
  mediaUrl: 'https://s3/tarjeta.png',
} as const;

describe('el parser tolera un mensaje sin emisor', () => {
  it('acepta `senderId` en null y lo deja en null', () => {
    const r = wireMensajeSchema.safeParse(crudo({ type: 'SYSTEM', senderId: null, text: 'Bienvenida' }));
    expect(r.success).toBe(true);
    expect(r.success && r.data.senderId).toBeNull();
  });

  it('un `senderId` vacío no identifica a nadie: también queda en null', () => {
    const r = wireMensajeSchema.safeParse(crudo({ type: 'SYSTEM', senderId: '  ', text: 'Bienvenida' }));
    expect(r.success && r.data.senderId).toBeNull();
  });

  it('acepta que falten el emisor, su nombre y su foto', () => {
    const sinEmisor = crudo({ type: 'SYSTEM', text: 'Bienvenida' });
    delete sinEmisor.senderId;
    delete sinEmisor.senderName;
    delete sinEmisor.senderAvatarUrl;
    const r = wireMensajeSchema.safeParse(sinEmisor);
    expect(r.success).toBe(true);
    expect(r.success && [r.data.senderId, r.data.senderName, r.data.senderAvatarUrl]).toEqual([null, null, null]);
  });

  it('no tumba LA BANDEJA cuando el último mensaje de una conversación no tiene emisor', () => {
    const r = wireConversacionesListSchema.safeParse([
      {
        conversation: { id: 'c-soporte', type: 'SUPPORT', celulaId: null, nombre: 'Formación Renaser', createdAt: '2026-09-27T14:00:00Z' },
        lastMessage: crudo({ type: 'SYSTEM', senderId: null, text: '¡Bienvenida, Ana!' }),
        unreadCount: 1,
      },
    ]);
    expect(r.success).toBe(true);
  });

  it('no tumba el historial de la conversación', () => {
    const r = wireMensajesPageSchema.safeParse({
      messages: [crudo({ id: 'm-2', senderId: null, ...TARJETA }), crudo({ id: 'm-1' })],
      nextCursor: null,
      hasMore: false,
    });
    expect(r.success).toBe(true);
  });

  it('un mensaje de persona con emisor null no rompe el mapeo: no es de nadie de la sesión', () => {
    const m = mapearMensaje(mensaje({ senderId: null, senderName: null }), YO);
    expect(m.isMe).toBe(false);
    expect(m.sender).toBe('Miembro Renaser');
    expect(m.senderId).toBeUndefined();
  });
});

describe('qué es un mensaje del programa', () => {
  it('uno de sistema con texto, con imagen, o con las dos', () => {
    expect(esMensajeDelPrograma(mensaje({ type: 'SYSTEM', text: 'Bienvenida' }))).toBe(true);
    expect(esMensajeDelPrograma(mensaje({ ...TARJETA }))).toBe(true);
    // En la lista de chats la imagen llega sin URL firmada: alcanza con la ruta.
    expect(esMensajeDelPrograma(mensaje({ ...TARJETA, mediaUrl: null }))).toBe(true);
    expect(esMensajeDelPrograma(mensaje({ ...TARJETA, text: 'Bienvenida' }))).toBe(true);
  });

  it('uno de sistema vacío no lo es, ni uno de persona', () => {
    expect(esMensajeDelPrograma(mensaje({ type: 'SYSTEM', text: null }))).toBe(false);
    expect(esMensajeDelPrograma(mensaje({ type: 'SYSTEM', text: '   ' }))).toBe(false);
    expect(esMensajeDelPrograma(mensaje({ type: 'TEXT', text: 'Hola' }))).toBe(false);
    expect(esMensajeDelPrograma(mensaje({ type: 'IMAGE', mediaUrl: 'https://s3/f.jpg', mediaMime: 'image/jpeg' }))).toBe(false);
  });
});

describe('la burbuja de un mensaje del programa', () => {
  it('va firmada «Formación Renaser», a la izquierda, aunque se haya guardado a nombre de quien mira', () => {
    const m = mapearMensaje(mensaje({ type: 'SYSTEM', text: '¡Bienvenida, Ana!', senderId: YO, senderName: 'Kelin Arango' }), YO);
    expect(m.sender).toBe(FIRMA_DEL_PROGRAMA);
    expect(m.sender).toBe('Formación Renaser');
    expect(m.esDelPrograma).toBe(true);
    expect(m.isMe).toBe(false);
    expect(m.type).toBe('text');
    expect(m.text).toBe('¡Bienvenida, Ana!');
    // No se le atribuye a nadie: ni el id ni la foto de la cuenta que lo guardó.
    expect(m.senderId).toBeUndefined();
    expect(m.senderAvatarUrl).toBeNull();
  });

  it('con emisor null también', () => {
    const m = mapearMensaje(mensaje({ type: 'SYSTEM', text: 'Bienvenida', senderId: null }), YO);
    expect(m.sender).toBe('Formación Renaser');
    expect(m.isMe).toBe(false);
  });

  it('la tarjeta sin texto es una foto dentro de la burbuja, sin rótulos', () => {
    const m = mapearMensaje(mensaje({ ...TARJETA, senderId: null }), YO);
    expect(m.type).toBe('image_grid');
    expect(m.mediaUrl).toBe('https://s3/tarjeta.png');
    expect(m.text).toBeUndefined();
    expect(m.mediaList).toBeUndefined();
    expect(m.esDelPrograma).toBe(true);
  });

  it('foto y texto juntos: los dos', () => {
    const m = mapearMensaje(mensaje({ ...TARJETA, text: 'Te damos la bienvenida' }), YO);
    expect(m.type).toBe('image_grid');
    expect(m.mediaUrl).toBe('https://s3/tarjeta.png');
    expect(m.text).toBe('Te damos la bienvenida');
  });

  it('una imagen sin URL firmada se rotula, como la foto de una persona', () => {
    const m = mapearMensaje(mensaje({ ...TARJETA, mediaUrl: null }), YO);
    expect(m.type).toBe('image_grid');
    expect(m.mediaUrl).toBeUndefined();
    expect(m.mediaList).toEqual(['📷 Imagen adjunta']);
  });

  it('un mensaje de sistema VACÍO sigue como antes: «Mensaje del sistema», sin firma del programa', () => {
    const m = mapearMensaje(mensaje({ type: 'SYSTEM', text: null, senderId: null, senderName: null }), YO);
    expect(m.esDelPrograma).toBeFalsy();
    expect(m.text).toBe('Mensaje del sistema');
    expect(m.type).toBe('text');
    expect(m.sender).toBe('Miembro Renaser');
  });
});

describe('en la lista de chats', () => {
  it('un mensaje del programa nunca dice «Tú: », y su tarjeta se lee «📷 Foto»', () => {
    const tarjeta = mensaje({ ...TARJETA, mediaUrl: null, senderId: YO });
    expect(resumenDelUltimoMensaje(tarjeta, YO, AHORA).lastMessage).toBe('📷 Foto');
    const texto = mensaje({ type: 'SYSTEM', text: '¡Bienvenida, Ana!', senderId: YO });
    expect(resumenDelUltimoMensaje(texto, YO, AHORA).lastMessage).toBe('¡Bienvenida, Ana!');
  });

  it('un 1 a 1 cuyo último mensaje no tiene emisor no rompe ni adivina quién es el otro', () => {
    const conversacion = mapearResumenConversacion(
      {
        conversation: { id: 'c-1', type: 'DIRECT', celulaId: null, nombre: null, createdAt: '2026-09-20T12:00:00Z' },
        lastMessage: mensaje({ type: 'SYSTEM', text: 'Aviso', senderId: null }),
        unreadCount: 0,
      },
      YO,
      {}
    );
    expect(conversacion.title).toBe('Conversación directa');
    expect(conversacion.rolDelOtro).toBeNull();
  });

  it('un 1 a 1 guarda el rol del otro en palabras, el mismo del subtítulo', () => {
    const conversacion = mapearResumenConversacion(
      {
        conversation: { id: 'c-2', type: 'DIRECT', celulaId: null, nombre: null, createdAt: '2026-09-20T12:00:00Z' },
        lastMessage: null,
        unreadCount: 0,
        otherParticipantId: 'u-mentor',
        otherParticipantName: 'Ricardo Díaz',
      },
      YO,
      { 'u-mentor': { id: 'u-mentor', fullName: 'Ricardo Díaz', avatarUrl: null, role: 'MENTOR' } }
    );
    expect(conversacion.rolDelOtro).toBe('Mentor');
    expect(conversacion.subtitle).toBe('Mentor · 1 a 1');
  });
});

describe('refinarTituloConMensajes', () => {
  it('un mensaje del programa no le pone nombre a un 1 a 1', () => {
    const conversacion: ChatConversation = {
      id: 'c-1',
      type: 'direct',
      celulaId: null,
      title: 'Conversación directa',
      subtitle: 'Conversación directa',
      avatar: '👤',
      lastMessage: '',
      lastTime: '',
      unreadCount: 0,
      messages: [],
    };
    const delPrograma: ChatMessage = mapearMensaje(mensaje({ type: 'SYSTEM', text: 'Aviso', senderId: null }), YO);
    expect(refinarTituloConMensajes(conversacion, [delPrograma]).title).toBe('Conversación directa');
  });
});

describe('conversacionConHistorial', () => {
  const base: ChatConversation = {
    id: 'c-grupo',
    type: 'celula',
    celulaId: 'g-1',
    title: 'Mi Grupo',
    subtitle: 'Chat de tu grupo',
    avatar: '👥',
    lastMessage: 'Tú: Hola',
    lastTime: '08:00',
    lastMessageAt: new Date(2026, 8, 27, 8, 0).toISOString(),
    unreadCount: 0,
    messages: [],
  };

  it('pone los mensajes del más viejo al más nuevo', () => {
    const r = conversacionConHistorial(
      base,
      [mensaje({ id: 'nuevo', createdAt: new Date(2026, 8, 27, 9, 45).toISOString() }), mensaje({ id: 'viejo' })],
      YO,
      AHORA
    );
    expect(r.messages.map(m => m.id)).toEqual(['viejo', 'nuevo']);
  });

  /* El caso que ordenaba mal la lista: llega un mensaje en vivo con la conversación abierta, se
     recarga el historial, y la fila seguía con la vista previa y la fecha de antes. */
  it('pone al día la vista previa, la hora y la fecha con la que se ordena la lista', () => {
    const llegado = mensaje({ id: 'nuevo', text: 'Ya subí mi foto', senderId: 'u-ana', createdAt: new Date(2026, 8, 27, 9, 45).toISOString() });
    const r = conversacionConHistorial(base, [llegado, mensaje({ id: 'viejo', senderId: YO })], YO, AHORA);
    expect(r.lastMessage).toBe('Ya subí mi foto');
    expect(r.lastTime).toBe('09:45');
    expect(r.lastMessageAt).toBe(llegado.createdAt);
  });

  it('con la página vacía deja el resumen que había', () => {
    const r = conversacionConHistorial(base, [], YO, AHORA);
    expect(r.lastMessage).toBe('Tú: Hola');
    expect(r.lastMessageAt).toBe(base.lastMessageAt);
  });
});
