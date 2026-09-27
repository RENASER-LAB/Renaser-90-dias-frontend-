/**
 * Las reglas del chat estilo WhatsApp (2026-09-26): hora, día, vista previa, orden y tandas.
 *
 * Las fechas se arman con el constructor LOCAL de `Date` y se pasan como ISO: así las pruebas dicen
 * lo mismo en cualquier zona en la que corra Jest, igual que el teléfono muestra su hora local.
 */
import { describe, expect, it } from '@jest/globals';

import {
  agruparMensajes,
  colorDeRemitente,
  cuantosIntegrantes,
  elementosDeLaListaInvertida,
  etiquetaDeDia,
  horaCorta,
  horaDeLaLista,
  ordenarPorActividad,
  subtituloDeLaCabecera,
  integrantesDelChatDeGrupo,
  vistaPreviaDelMensaje,
} from '../formatoChat';

/** Sábado 26 de septiembre de 2026, 21:30 local. */
const AHORA = new Date(2026, 8, 26, 21, 30);
const iso = (...partes: [number, number, number, number, number]) => new Date(...partes).toISOString();

describe('horaCorta', () => {
  it('dice la hora en 24 h con dos dígitos', () => {
    expect(horaCorta(iso(2026, 8, 26, 21, 4))).toBe('21:04');
    expect(horaCorta(iso(2026, 8, 26, 7, 5))).toBe('07:05');
  });

  it('sin fecha válida no inventa una hora', () => {
    expect(horaCorta(null)).toBe('');
    expect(horaCorta('no-es-fecha')).toBe('');
  });
});

describe('horaDeLaLista', () => {
  it('hoy: la hora', () => {
    expect(horaDeLaLista(iso(2026, 8, 26, 21, 4), AHORA)).toBe('21:04');
  });

  it('ayer: «Ayer», aunque hayan pasado solo minutos (cuenta días de calendario, no 24 h)', () => {
    const pasadaLaMedianoche = new Date(2026, 8, 27, 0, 10);
    expect(horaDeLaLista(iso(2026, 8, 26, 23, 50), pasadaLaMedianoche)).toBe('Ayer');
  });

  it('dentro de la semana: el día abreviado', () => {
    // 21/09/2026 fue lunes.
    expect(horaDeLaLista(iso(2026, 8, 21, 10, 0), AHORA)).toBe('lun');
  });

  it('más viejo: la fecha, con año si es de otro', () => {
    expect(horaDeLaLista(iso(2026, 8, 2, 10, 0), AHORA)).toBe('02/09');
    expect(horaDeLaLista(iso(2025, 11, 30, 10, 0), AHORA)).toBe('30/12/25');
  });

  it('sin mensajes, sin hora', () => {
    expect(horaDeLaLista(null, AHORA)).toBe('');
  });
});

describe('etiquetaDeDia', () => {
  it('«Hoy», «Ayer» y la fecha larga', () => {
    expect(etiquetaDeDia(iso(2026, 8, 26, 8, 0), AHORA)).toBe('Hoy');
    expect(etiquetaDeDia(iso(2026, 8, 25, 23, 59), AHORA)).toBe('Ayer');
    expect(etiquetaDeDia(iso(2026, 8, 24, 12, 0), AHORA)).toBe('24 de septiembre');
    expect(etiquetaDeDia(iso(2025, 0, 3, 12, 0), AHORA)).toBe('3 de enero de 2025');
  });
});

describe('vistaPreviaDelMensaje', () => {
  it('antepone «Tú: » a lo propio', () => {
    expect(vistaPreviaDelMensaje({ tipo: 'text', texto: 'Hola grupo', esMio: true })).toBe('Tú: Hola grupo');
    expect(vistaPreviaDelMensaje({ tipo: 'text', texto: 'Hola grupo', esMio: false })).toBe('Hola grupo');
  });

  it('rotula fotos, audios y videos', () => {
    expect(vistaPreviaDelMensaje({ tipo: 'image_grid', texto: null, esMio: false })).toBe('📷 Foto');
    expect(vistaPreviaDelMensaje({ tipo: 'image_grid', texto: 'Mi evidencia', esMio: true })).toBe('Tú: 📷 Mi evidencia');
    expect(vistaPreviaDelMensaje({ tipo: 'audio', texto: null, esMio: false })).toBe('🎤 Audio');
    expect(vistaPreviaDelMensaje({ tipo: 'audio', texto: null, esMio: true })).toBe('Tú: 🎤 Audio');
    expect(vistaPreviaDelMensaje({ tipo: 'video', texto: null, esMio: false })).toBe('🎥 Video');
  });

  it('sin mensajes lo dice', () => {
    expect(vistaPreviaDelMensaje(null)).toBe('Todavía no hay mensajes');
  });
});

describe('ordenarPorActividad', () => {
  it('lo más reciente arriba; sin mensajes cuenta la creación; sin fechas, al final y en su orden', () => {
    const lista = [
      { id: 'viejo', lastMessageAt: iso(2026, 8, 20, 10, 0) },
      { id: 'sin-fechas-1' },
      { id: 'nuevo', lastMessageAt: iso(2026, 8, 26, 21, 0) },
      { id: 'recien-creado', lastMessageAt: null, createdAt: iso(2026, 8, 25, 9, 0) },
      { id: 'sin-fechas-2' },
    ];
    expect(ordenarPorActividad(lista).map(c => c.id)).toEqual([
      'nuevo',
      'recien-creado',
      'viejo',
      'sin-fechas-1',
      'sin-fechas-2',
    ]);
  });

  it('no toca la lista que recibe', () => {
    const lista = [{ id: 'a', lastMessageAt: iso(2026, 8, 1, 1, 0) }, { id: 'b', lastMessageAt: iso(2026, 8, 2, 1, 0) }];
    ordenarPorActividad(lista);
    expect(lista.map(c => c.id)).toEqual(['a', 'b']);
  });
});

describe('agruparMensajes', () => {
  const msj = (id: string, quien: string, cuando: string, isMe = false) => ({
    id,
    isMe,
    sender: quien,
    senderId: quien,
    createdAt: cuando,
  });

  it('pone un separador por día y agrupa las tandas del mismo remitente', () => {
    const elementos = agruparMensajes(
      [
        msj('1', 'ana', iso(2026, 8, 25, 20, 0)),
        msj('2', 'ana', iso(2026, 8, 25, 20, 1)),
        msj('3', 'yo', iso(2026, 8, 25, 20, 2), true),
        msj('4', 'ana', iso(2026, 8, 26, 9, 0)),
        msj('5', 'luis', iso(2026, 8, 26, 9, 1)),
      ],
      AHORA
    );
    expect(
      elementos.map(e =>
        e.tipo === 'dia' ? `[${e.etiqueta}]` : `${e.mensaje.id}${e.primeroDeLaTanda ? '^' : ''}${e.ultimoDeLaTanda ? '$' : ''}`
      )
    ).toEqual(['[Ayer]', '1^', '2$', '3^$', '[Hoy]', '4^$', '5^$']);
  });

  it('el mismo remitente pasa de día: la tanda se corta y el nuevo día lleva cola otra vez', () => {
    const elementos = agruparMensajes(
      [msj('1', 'ana', iso(2026, 8, 25, 23, 59)), msj('2', 'ana', iso(2026, 8, 26, 0, 1))],
      AHORA
    );
    const mensajes = elementos.filter(e => e.tipo === 'mensaje');
    expect(mensajes.map(e => e.tipo === 'mensaje' && e.primeroDeLaTanda)).toEqual([true, true]);
  });

  it('una pausa de más de diez minutos corta la tanda', () => {
    const elementos = agruparMensajes(
      [msj('1', 'ana', iso(2026, 8, 26, 9, 0)), msj('2', 'ana', iso(2026, 8, 26, 9, 30))],
      AHORA
    );
    const segundo = elementos[2];
    expect(segundo.tipo === 'mensaje' && segundo.primeroDeLaTanda).toBe(true);
  });

  it('un mensaje sin fecha se queda en el día del anterior', () => {
    const elementos = agruparMensajes(
      [msj('1', 'ana', iso(2026, 8, 26, 9, 0)), { id: '2', isMe: false, sender: 'ana', senderId: 'ana' }],
      AHORA
    );
    expect(elementos.filter(e => e.tipo === 'dia')).toHaveLength(1);
  });
});

/*
 * La lista de la conversación es invertida desde el 2026-09-27 (el grupo «Fénix» abría arriba y no
 * bajaba): el primer elemento se dibuja ABAJO de todo. Estas pruebas fijan que el orden, los
 * separadores de día y las tandas sigan diciendo lo mismo al revés.
 */
describe('elementosDeLaListaInvertida', () => {
  const msj = (id: string, quien: string, cuando: string, isMe = false) => ({
    id,
    isMe,
    sender: quien,
    senderId: quien,
    createdAt: cuando,
  });
  const conversacion = [
    msj('1', 'ana', iso(2026, 8, 25, 20, 0)),
    msj('2', 'ana', iso(2026, 8, 25, 20, 1)),
    msj('3', 'yo', iso(2026, 8, 25, 20, 2), true),
    msj('4', 'ana', iso(2026, 8, 26, 9, 0)),
    msj('5', 'luis', iso(2026, 8, 26, 9, 1)),
  ];
  const leer = (elementos: ReturnType<typeof elementosDeLaListaInvertida>) =>
    elementos.map(e =>
      e.tipo === 'dia' ? `[${e.etiqueta}]` : `${e.mensaje.id}${e.primeroDeLaTanda ? '^' : ''}${e.ultimoDeLaTanda ? '$' : ''}`
    );

  it('el último mensaje va primero (abajo de todo) y el más viejo al final (arriba)', () => {
    const elementos = elementosDeLaListaInvertida(conversacion, AHORA);
    expect(elementos[0].tipo === 'mensaje' && elementos[0].mensaje.id).toBe('5');
    const ultimoMensaje = [...elementos].reverse().find(e => e.tipo === 'mensaje');
    expect(ultimoMensaje?.tipo === 'mensaje' && ultimoMensaje.mensaje.id).toBe('1');
  });

  it('cada separador queda DESPUÉS de sus mensajes en el arreglo: dibujado ARRIBA de ellos', () => {
    expect(leer(elementosDeLaListaInvertida(conversacion, AHORA))).toEqual([
      '5^$',
      '4^$',
      '[Hoy]',
      '3^$',
      '2$',
      '1^',
      '[Ayer]',
    ]);
  });

  it('es exactamente la agrupación cronológica dada vuelta: tandas y claves intactas', () => {
    const derecha = agruparMensajes(conversacion, AHORA);
    const invertida = elementosDeLaListaInvertida(conversacion, AHORA);
    expect(invertida).toEqual([...derecha].reverse());
    expect(new Set(invertida.map(e => e.clave)).size).toBe(invertida.length);
  });

  it('no toca los mensajes que recibe', () => {
    const copia = conversacion.map(x => ({ ...x }));
    elementosDeLaListaInvertida(conversacion, AHORA);
    expect(conversacion).toEqual(copia);
  });

  it('los mensajes del programa forman su propia tanda, aunque vengan guardados a nombre de alguien', () => {
    const programa = (id: string, cuando: string) => ({ ...msj(id, 'kelin', cuando), sender: 'Formación Renaser', esDelPrograma: true });
    const elementos = agruparMensajes(
      [
        programa('tarjeta', iso(2026, 8, 26, 9, 0)),
        programa('texto', iso(2026, 8, 26, 9, 0)),
        msj('kelin-escribe', 'kelin', iso(2026, 8, 26, 9, 2)),
      ],
      AHORA
    );
    expect(elementos.map(e => (e.tipo === 'dia' ? `[${e.etiqueta}]` : `${e.clave}${e.primeroDeLaTanda ? '^' : ''}`))).toEqual([
      '[Hoy]',
      'tarjeta^',
      'texto',
      // Kelin, escribiendo como persona, vuelve a llevar su nombre y su cola.
      'kelin-escribe^',
    ]);
  });
});

describe('cuantosIntegrantes', () => {
  it('singular y plural', () => {
    expect(cuantosIntegrantes(1)).toBe('1 integrante');
    expect(cuantosIntegrantes(5)).toBe('5 integrantes');
  });
});

describe('subtituloDeLaCabecera', () => {
  it('en un grupo cuenta integrantes, sin inventar la cifra', () => {
    expect(subtituloDeLaCabecera({ tipo: 'celula', integrantes: 3, subtitulo: 'Chat de tu grupo' })).toBe(
      'Grupo · 3 integrantes'
    );
    expect(subtituloDeLaCabecera({ tipo: 'celula', integrantes: 1, subtitulo: 'Chat de tu grupo' })).toBe(
      'Grupo · 1 integrante'
    );
    expect(subtituloDeLaCabecera({ tipo: 'celula', integrantes: null, subtitulo: 'Chat de tu grupo' })).toBe(
      'Grupo · toca para ver quiénes son'
    );
  });

  it('en el resto deja el subtítulo de la conversación', () => {
    expect(subtituloDeLaCabecera({ tipo: 'direct', integrantes: null, subtitulo: 'Aprendiz · 1 a 1' })).toBe(
      'Aprendiz · 1 a 1'
    );
  });
});

describe('integrantesDelChatDeGrupo', () => {
  it('cuenta al mentor además de los aprendices, como WhatsApp cuenta a todos', () => {
    // El caso del dueño: mentor de un grupo sin aprendices vigentes leía «0 integrantes».
    expect(integrantesDelChatDeGrupo({ memberCount: 0, mentorName: 'Ricardo' })).toBe(1);
    expect(integrantesDelChatDeGrupo({ memberCount: 2, mentorName: 'Ricardo' })).toBe(3);
  });

  it('sin mentor cuenta solo a los aprendices, y sin grupo no inventa cifra', () => {
    expect(integrantesDelChatDeGrupo({ memberCount: 2, mentorName: null })).toBe(2);
    expect(integrantesDelChatDeGrupo(null)).toBeNull();
  });
});

describe('colorDeRemitente', () => {
  it('es siempre el mismo para la misma persona', () => {
    expect(colorDeRemitente('usuario-1', false)).toBe(colorDeRemitente('usuario-1', false));
    expect(colorDeRemitente('usuario-1', false)).toMatch(/^#[0-9A-F]{6}$/);
  });
});
