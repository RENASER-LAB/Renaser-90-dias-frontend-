/**
 * Responder a un mensaje (pedido del dueño, 2026-10-05; D-251 del backend): la cita que se dibuja
 * arriba de la burbuja que responde, salga del servidor —nuevo o anterior a D-251— o del mensaje que
 * la persona eligió en pantalla.
 *
 * Contra el código anterior fallan: el mapeador no armaba ninguna cita (la app no dibujaba
 * respuestas), y un `replyTo` que no cumplía el esquema tiraba la página entera de mensajes.
 */
import { describe, expect, it } from '@jest/globals';

import type { ChatMessage } from '../../../../screens/ComunidadScreen';
import { mapearMensaje } from '../../api/chatMappers';
import { wireMensajeSchema, wireMensajesPageSchema } from '../../api/chatSchemas';
import type { WireMensaje } from '../../types/chat.types';
import {
  citaDeMensajeCargado,
  citaDelServidor,
  conCitaCompleta,
  extracto,
  LARGO_DEL_EXTRACTO,
  textoParaCopiar,
} from '../citaDelMensaje';

const YO = 'u-ana';

/** Un mensaje crudo como lo manda el backend, validado por el esquema y mapeado. */
function wire(parcial: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'm-2',
    conversationId: 'c-1',
    senderId: 'u-luis',
    senderName: 'Luis Soto',
    senderAvatarUrl: null,
    type: 'TEXT',
    text: 'Sí, voy',
    mediaBucket: null,
    mediaPath: null,
    mediaMime: null,
    mediaBytes: null,
    mediaDurationSeconds: null,
    mediaUrl: null,
    hidden: false,
    replyToId: null,
    replyTo: null,
    createdAt: '2026-10-05T15:00:00Z',
    status: null,
    ...parcial,
  };
}

function delServidor(parcial: Record<string, unknown>): ChatMessage {
  const pagina = wireMensajesPageSchema.parse({ messages: [wire(parcial)], nextCursor: null, hasMore: false });
  return mapearMensaje(pagina.messages[0] as WireMensaje, YO);
}

const PREVIEW_NUEVO = {
  id: 'm-1', senderName: 'Ana Pérez', type: 'TEXT', text: '¿Nos vemos a las 7?', deletedAt: null,
  mediaMime: null, mediaDurationSeconds: null, mediaUrl: null, mine: true,
};

describe('la cita que manda el servidor (D-251)', () => {
  it('una respuesta a un mensaje propio dice «Tú», en dorado, con el extracto', () => {
    const mensaje = delServidor({ replyToId: 'm-1', replyTo: PREVIEW_NUEVO, replyToDeleted: false });

    expect(mensaje.cita).toEqual({
      estado: 'visible', id: 'm-1', autor: 'Tú', esMia: true, clase: 'texto', resumen: '¿Nos vemos a las 7?',
      miniatura: undefined,
    });
  });

  it('un sticker citado se reconoce igual que en la burbuja y trae su miniatura', () => {
    const mensaje = delServidor({
      replyToId: 'm-1',
      replyTo: { ...PREVIEW_NUEVO, mine: false, senderName: 'Luis Soto', type: 'IMAGE',
        text: 'Sticker Renaser: ¡Muy bien!', mediaMime: 'image/webp', mediaUrl: 'https://s3/sticker.webp' },
    });

    expect(mensaje.cita).toMatchObject({ autor: 'Luis Soto', esMia: false, clase: 'sticker', resumen: 'Sticker',
      miniatura: 'https://s3/sticker.webp' });
  });

  it('una foto sin pie se lee «Foto» y una nota de voz con su duración', () => {
    expect(delServidor({ replyTo: { ...PREVIEW_NUEVO, type: 'IMAGE', text: null, mediaMime: 'image/jpeg',
      mediaUrl: 'https://s3/f.jpg' } }).cita).toMatchObject({ clase: 'foto', resumen: 'Foto', miniatura: 'https://s3/f.jpg' });
    expect(delServidor({ replyTo: { ...PREVIEW_NUEVO, type: 'AUDIO', text: null, mediaMime: 'audio/m4a',
      mediaDurationSeconds: 72 } }).cita).toMatchObject({ clase: 'audio', resumen: 'Nota de voz (1:12)' });
  });

  it('si el citado ya no está, dice «Mensaje eliminado» sin autor', () => {
    expect(delServidor({ replyToDeleted: true }).cita).toEqual({ estado: 'eliminada' });
  });

  it('un backend anterior (sin los campos nuevos) sigue funcionando: cita con el nombre, sin «Tú» ni miniatura', () => {
    const viejo = { id: 'm-1', senderName: 'Ana Pérez', type: 'IMAGE', text: null, deletedAt: null };
    const mensaje = delServidor({ replyToId: 'm-1', replyTo: viejo });

    expect(mensaje.cita).toEqual({ estado: 'visible', id: 'm-1', autor: 'Ana Pérez', esMia: false, clase: 'foto',
      resumen: 'Foto', miniatura: undefined });
    // Y uno anterior que marcaba el borrado con `deletedAt`.
    expect(delServidor({ replyTo: { ...viejo, deletedAt: '2026-10-01T00:00:00Z' } }).cita).toEqual({ estado: 'eliminada' });
  });

  it('sin cita, nada: el mensaje sale como siempre (también si el backend no manda los campos)', () => {
    expect(delServidor({}).cita).toBeUndefined();
    const { replyToId: _a, replyTo: _b, ...sinCampos } = wire({});
    expect(mapearMensaje(wireMensajeSchema.parse(sinCampos) as WireMensaje, YO).cita).toBeUndefined();
  });

  it('un resumen roto pierde solo la cita, no la página de mensajes', () => {
    const roto = { id: 5, type: null };
    const pagina = wireMensajesPageSchema.safeParse({ messages: [wire({ replyToId: 'm-1', replyTo: roto })],
      nextCursor: null, hasMore: false });

    expect(pagina.success).toBe(true);
    expect(mapearMensaje(pagina.data!.messages[0] as WireMensaje, YO).cita).toBeUndefined();
  });

  it('citaDelServidor sin nada que citar devuelve undefined', () => {
    expect(citaDelServidor({ replyTo: null, replyToDeleted: null })).toBeUndefined();
  });
});

describe('la cita armada con lo que ya está en pantalla', () => {
  const citado: ChatMessage = {
    id: 'm-1', sender: 'Luis Soto', avatar: '', isMe: false, time: '15:00', type: 'audio',
    text: 'Nota de voz', audioDuration: '0:12', senderId: 'u-luis',
  };

  it('es lo que dibuja la barra «Respondiendo a…»', () => {
    expect(citaDeMensajeCargado(citado)).toEqual({ estado: 'visible', id: 'm-1', autor: 'Luis Soto', esMia: false,
      clase: 'audio', resumen: 'Nota de voz (0:12)', miniatura: undefined });
    expect(citaDeMensajeCargado({ ...citado, isMe: true, type: 'text', text: 'hola' })).toMatchObject({ autor: 'Tú',
      esMia: true, resumen: 'hola' });
  });

  it('completa la burbuja recién enviada si el servidor (anterior a D-251) devolvió solo replyToId', () => {
    const enviado = delServidor({ senderId: YO, replyToId: 'm-1', replyTo: null });
    expect(enviado.cita).toBeUndefined();

    expect(conCitaCompleta(enviado, 'm-1', [citado]).cita).toMatchObject({ id: 'm-1', autor: 'Luis Soto' });
    // Si el citado no está cargado no se inventa nada; si el servidor ya mandó la cita, queda la suya.
    expect(conCitaCompleta(enviado, 'm-1', []).cita).toBeUndefined();
    const conLaDelServidor = delServidor({ replyToId: 'm-1', replyTo: PREVIEW_NUEVO });
    expect(conCitaCompleta(conLaDelServidor, 'm-1', [citado]).cita).toBe(conLaDelServidor.cita);
  });
});

describe('extracto', () => {
  it('corta en 80 letras sin partir un emoji', () => {
    const largo = `${'a'.repeat(LARGO_DEL_EXTRACTO - 1)}🦅🦅🦅`;
    const corto = extracto(largo);
    expect(corto.endsWith('🦅…')).toBe(true);
    expect(Array.from(corto)).toHaveLength(LARGO_DEL_EXTRACTO + 1);
    expect(extracto('  hola\n\nmundo ')).toBe('hola mundo');
  });
});

describe('textoParaCopiar', () => {
  const base: ChatMessage = { id: 'm', sender: 'Ana', avatar: '', isMe: true, time: '10:00', type: 'text', text: 'Hola\nqué tal' };

  it('copia el texto tal cual y el pie de una foto', () => {
    expect(textoParaCopiar(base)).toBe('Hola\nqué tal');
    expect(textoParaCopiar({ ...base, type: 'image_grid', text: 'Mi foto', mediaUrl: 'https://s3/f.jpg' })).toBe('Mi foto');
  });

  it('no copia rótulos que nadie escribió: sticker, nota de voz ni foto sin URL', () => {
    expect(textoParaCopiar({ ...base, type: 'image_grid', esSticker: true, text: undefined })).toBeNull();
    expect(textoParaCopiar({ ...base, type: 'audio', text: 'Nota de voz' })).toBeNull();
    expect(textoParaCopiar({ ...base, type: 'image_grid', text: 'Imagen adjunta' })).toBeNull();
    expect(textoParaCopiar({ ...base, text: '   ' })).toBeNull();
  });
});
