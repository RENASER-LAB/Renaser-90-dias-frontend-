/**
 * El tipo de conversación que llega del backend.
 *
 * Estas pruebas protegen dos propiedades, y la segunda es la importante:
 *
 * 1. **`SUPPORT` se entiende y se ve bien.** El chat de soporte por aprendiz (staff del otro lado)
 *    aparece en la bandeja con el nombre que manda el servidor, su propio subtítulo y su ícono.
 * 2. **Un tipo que este cliente NO conoce no tumba la bandeja.** Hasta 2026-09-16 el schema tenía
 *    `type: z.enum(['CELL','DIRECT','GLOBAL'])` dentro de un `z.array(...)`: UNA conversación con
 *    un tipo nuevo hacía fallar la validación de la lista entera, y la persona se quedaba sin
 *    NINGUNA de sus conversaciones. Como la app vive publicada en la tienda, eso le pasaría a todo
 *    el que no hubiera actualizado el día que el backend estrene un tipo.
 *
 * Los dos bloques fallan contra el código viejo: el de `SUPPORT` porque el `enum` lo rechazaba y
 * `mapearTipoConversacion` no tenía rama para él, y el de `'BROADCAST'` porque era exactamente el
 * caso que lanzaba.
 */
import { describe, expect, it } from '@jest/globals';

import { mapearResumenConversacion, mapearTipoConversacion, reconocerTipoChat } from '../chatMappers';
import { validarRespuesta, wireConversacionesListSchema } from '../chatSchemas';
import type { WireConversacionResumen } from '../../types/chat.types';

/** Un resumen mínimo pero completo, con el tipo como única variable. */
function resumen(type: string, nombre: string | null = null): WireConversacionResumen {
  return {
    conversation: {
      id: 'c-1',
      type,
      celulaId: null,
      nombre,
      createdAt: '2026-09-16T12:00:00Z',
    },
    lastMessage: null,
    unreadCount: 0,
  };
}

describe('reconocerTipoChat', () => {
  it('entiende los cuatro tipos que manda el backend', () => {
    expect(reconocerTipoChat('CELL')).toBe('celula');
    expect(reconocerTipoChat('DIRECT')).toBe('direct');
    expect(reconocerTipoChat('GLOBAL')).toBe('global');
    expect(reconocerTipoChat('SUPPORT')).toBe('soporte');
  });

  it('marca como desconocido cualquier otro, en vez de fingir que es uno conocido', () => {
    expect(reconocerTipoChat('BROADCAST')).toBe('desconocido');
    expect(reconocerTipoChat('')).toBe('desconocido');
  });

  /* Las claves heredadas de `Object.prototype` son el agujero clásico de una tabla de traducción
     escrita como objeto literal: `tabla['constructor']` no da `undefined`, da una función. */
  it('no confunde una propiedad heredada de Object con un tipo de chat', () => {
    expect(reconocerTipoChat('constructor')).toBe('desconocido');
    expect(reconocerTipoChat('toString')).toBe('desconocido');
  });
});

describe('mapearTipoConversacion', () => {
  it('no mueve de cajón a los tres de siempre', () => {
    expect(mapearTipoConversacion('CELL')).toBe('celula');
    expect(mapearTipoConversacion('DIRECT')).toBe('direct');
    expect(mapearTipoConversacion('GLOBAL')).toBe('global');
  });

  /* Corregido el 2026-09-22. Este caso se llamaba «manda soporte y lo desconocido al único cajón
     donde la bandeja los muestra» y esperaba 'direct' para los dos, porque el conmutador
     DIRECTOS | GLOBAL de la pestaña Tribu no tenía dónde poner un tercer tipo. Ese conmutador ya
     no existe: la sección "Formación Renaser" lista los tres GRUPOS a los que la persona
     pertenece —general, el de su mentor y el de soporte—, así que soporte tiene cajón propio.
     Este test falla contra el mapper viejo, que devolvía 'direct'. */
  it('le da cajón propio a soporte, ahora que la bandeja lo tiene', () => {
    expect(mapearTipoConversacion('SUPPORT')).toBe('soporte');
  });

  /* Lo desconocido SÍ sigue cayendo en 'direct', y por el mismo motivo de siempre: una fila
     genérica entre los 1 a 1 es mejor que una conversación que no aparece en ninguna parte. */
  it('deja lo desconocido entre los directos', () => {
    expect(mapearTipoConversacion('BROADCAST')).toBe('direct');
  });
});

describe('la conversación de soporte en la bandeja', () => {
  it('se llama como la nombró el servidor', () => {
    const conv = mapearResumenConversacion(resumen('SUPPORT', 'Soporte · Ana Pérez'), 'yo', {});
    expect(conv.title).toBe('Soporte · Ana Pérez');
  });

  it('tiene nombre, subtítulo e ícono propios aunque el servidor no mande nombre', () => {
    const conv = mapearResumenConversacion(resumen('SUPPORT'), 'yo', {});
    expect(conv.title).toBe('Soporte Renaser');
    expect(conv.subtitle).toBe('Soporte · Equipo Renaser');
    expect(conv.avatar).toBe('🎧');
    /* Corregido el 2026-09-22: acá se esperaba 'direct' con el comentario «sin esto no aparecería
       en ninguna pestaña de la bandeja». Dejó de valer cuando la pestaña Tribu ganó la sección
       "Formación Renaser", que lista los tres grupos de la persona y le da cajón propio a soporte. */
    expect(conv.type).toBe('soporte');
  });

  /* Del otro lado del soporte no hay una persona sino el staff entero. Si se resolviera "el otro"
     como en un 1 a 1, el título y el subtítulo del chat cambiarían según cuál administrador haya
     contestado último — que es justo lo que no tiene que pasar. */
  it('no se titula con el nombre de quien contestó último', () => {
    const conSoporteRespondido: WireConversacionResumen = {
      ...resumen('SUPPORT', 'Soporte Renaser'),
      lastMessage: {
        id: 'm-1',
        conversationId: 'c-1',
        senderId: 'admin-1',
        senderName: null,
        senderAvatarUrl: null,
        type: 'TEXT',
        text: 'Ya lo vemos',
        mediaBucket: null,
        mediaPath: null,
        mediaMime: null,
        mediaBytes: null,
        mediaDurationSeconds: null,
        mediaUrl: null,
        hidden: false,
        replyToId: null,
        replyTo: null,
        createdAt: '2026-09-16T12:05:00Z',
      },
      otherParticipantId: 'admin-1',
      otherParticipantName: 'Carla Admin',
    };
    const directorio = {
      'admin-1': { id: 'admin-1', fullName: 'Carla Admin', avatarUrl: null, role: 'ADMIN' },
    };

    const conv = mapearResumenConversacion(conSoporteRespondido, 'yo', directorio);

    expect(conv.title).toBe('Soporte Renaser');
    expect(conv.subtitle).toBe('Soporte · Equipo Renaser');
  });
});

describe('un tipo de conversación que este cliente no conoce', () => {
  /* El caso que rompía todo. `wireConversacionesListSchema` es un `z.array`: basta un elemento
     inválido para que `validarRespuesta` lance y la bandeja quede vacía con un error. */
  it('no tumba la lista entera de conversaciones', () => {
    const respuesta = [resumen('CELL'), resumen('BROADCAST', 'Anuncios'), resumen('DIRECT')];

    const validada = validarRespuesta<WireConversacionResumen[]>(
      wireConversacionesListSchema,
      respuesta,
      'GET /api/v1/chat/conversations'
    );

    expect(validada).toHaveLength(3);
    expect(validada[1].conversation.type).toBe('BROADCAST');
  });

  it('acepta SUPPORT sin marcarlo como respuesta inesperada', () => {
    const validada = validarRespuesta<WireConversacionResumen[]>(
      wireConversacionesListSchema,
      [resumen('SUPPORT', 'Soporte Renaser')],
      'GET /api/v1/chat/conversations'
    );

    expect(validada[0].conversation.type).toBe('SUPPORT');
  });

  /* Sigue siendo estricto con lo que sí importa: sin `id` no hay nada que abrir ni que marcar como
     leído, y ahí conviene fallar ruidosamente en vez de pintar una fila rota. */
  it('sigue rechazando una conversación sin id', () => {
    const rota = [{ ...resumen('DIRECT'), conversation: { type: 'DIRECT', celulaId: null, nombre: null, createdAt: 'x' } }];

    expect(() =>
      validarRespuesta(wireConversacionesListSchema, rota, 'GET /api/v1/chat/conversations')
    ).toThrow(/inesperado/);
  });

  it('se muestra con el nombre que mandó el servidor en vez de desaparecer', () => {
    const conv = mapearResumenConversacion(resumen('BROADCAST', 'Anuncios'), 'yo', {});

    expect(conv.title).toBe('Anuncios');
    expect(conv.avatar).toBe('💬');
    expect(conv.type).toBe('direct');
  });
});

describe('lo que ya andaba sigue andando', () => {
  it('GLOBAL conserva nombre, subtítulo e ícono', () => {
    const conv = mapearResumenConversacion(resumen('GLOBAL', 'Comunidad RENASER'), 'yo', {});
    expect(conv.type).toBe('global');
    expect(conv.title).toBe('Comunidad RENASER');
    expect(conv.subtitle).toBe('Comunidad completa RENASER');
    expect(conv.avatar).toBe('🌐');
  });

  it('CELL sigue titulándose Mi Grupo', () => {
    const conv = mapearResumenConversacion(resumen('CELL'), 'yo', {});
    expect(conv.type).toBe('celula');
    expect(conv.title).toBe('Mi Grupo');
    expect(conv.subtitle).toBe('Chat de tu grupo');
    expect(conv.avatar).toBe('👥');
  });

  it('DIRECT sigue resolviendo a la otra persona', () => {
    const directo: WireConversacionResumen = {
      ...resumen('DIRECT'),
      otherParticipantId: 'u-2',
      otherParticipantName: 'Ana Pérez',
    };
    const directorio = {
      'u-2': { id: 'u-2', fullName: 'Ana Pérez', avatarUrl: null, role: 'MENTOR' },
    };

    const conv = mapearResumenConversacion(directo, 'yo', directorio);

    expect(conv.type).toBe('direct');
    expect(conv.title).toBe('Ana Pérez');
    expect(conv.subtitle).toBe('Mentor · 1 a 1');
    expect(conv.avatar).toBe('👤');
  });
});
