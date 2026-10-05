/**
 * Las piezas del chat estilo WhatsApp (2026-09-26) se dibujan con datos reales de la forma que
 * deja el mapeador: la fila con «Tú: …», hora y no leídos; la burbuja con la hora adentro, el nombre
 * en los grupos y la foto; la cabecera con «Grupo · N integrantes».
 */
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { light } from '../../../../theme/tokens';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
// La nota de voz usa `expo-audio`; acá no se prueba y se reemplaza por nada.
jest.mock('../BurbujaAudioChat', () => ({ BurbujaAudioChat: () => null }));
// Las tarjetas con nombre se piden con la sesión (D-205, D-206): una sesión fija para verlas pedidas.
jest.mock('../../../../services/http/apiClient', () => ({
  ...jest.requireActual<object>('../../../../services/http/apiClient'),
  getTokenSesion: () => 'sesion-de-prueba',
}));

import type { ChatConversation, ChatMessage } from '../../../../screens/ComunidadScreen';
import { mapearMensaje } from '../../api/chatMappers';
import { integrantesDeLaInfo, integrantesDelChat } from '../../utils/infoDelChat';
import { BotonBajarAlFinal } from '../BotonBajarAlFinal';
import { BurbujaDeMensaje, huecoParaLaHora } from '../BurbujaDeMensaje';
import { CabeceraDeChat } from '../CabeceraDeChat';
import { coloresDelChat } from '../coloresDelChat';
import { FilaDeConversacion } from '../FilaDeConversacion';
import { InfoDelChat } from '../InfoDelChat';
import { AvatarDeChat, FotoDelGrupo, FotoDelPrograma } from '../AvatarDeChat';
import { Icon } from '../../../../components/Icon';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function dibujar(elemento: React.ReactElement): ReactTestRenderer {
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(elemento);
  });
  return raiz;
}

/** Todo el texto visible, en orden, para buscar frases. */
function textos(raiz: ReactTestRenderer): string {
  return raiz.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
}

const COLORES = coloresDelChat(light, false);

/** Las marcas de enviado/leído que dibuja la burbuja (íconos, desde el 2026-10-05). */
function marcas(raiz: ReactTestRenderer): string[] {
  return raiz.root
    .findAll(n => n.type === Icon && (n.props.name === 'check' || n.props.name === 'checkCheck'))
    .map(n => n.props.name as string);
}

describe('FilaDeConversacion', () => {
  it('muestra nombre, vista previa, hora y el contador de no leídos', () => {
    const conversacion: ChatConversation = {
      id: 'c-1',
      type: 'celula',
      celulaId: 'g-fenix',
      title: 'Mi Grupo',
      subtitle: 'Chat de tu grupo',
      avatar: '👥',
      lastMessage: 'Tú: 📷 Foto',
      lastTime: '21:04',
      lastMessageAt: new Date(2026, 8, 26, 21, 4).toISOString(),
      unreadCount: 3,
      messages: [],
    };
    const raiz = dibujar(
      React.createElement(FilaDeConversacion, {
        conversacion,
        titulo: 'Grupo Fénix (prueba)',
        ahora: new Date(2026, 8, 26, 22, 0),
        onPress: () => undefined,
      })
    );
    const todo = textos(raiz);
    expect(todo).toContain('Grupo Fénix (prueba)');
    expect(todo).toContain('Tú: 📷 Foto');
    expect(todo).toContain('21:04');
    expect(todo).toContain('3');
  });
});

/** La imagen (`expo-image`) con ese rótulo: el primer nodo que lo lleva junto con su `source`. */
function imagenDe(raiz: ReactTestRenderer, rotulo: string) {
  return raiz.root.findAll(n => n.props.accessibilityLabel === rotulo && n.props.source !== undefined)[0];
}
function fuenteDe(raiz: ReactTestRenderer, rotulo: string): unknown {
  return imagenDe(raiz, rotulo)?.props.source;
}
const TARJETAS_EMPAQUETADAS: Record<string, unknown> = {
  verde: require('../../../../../assets/semaforo/verde-v1.jpg'),
  amarillo: require('../../../../../assets/semaforo/amarillo-v1.jpg'),
  rojo: require('../../../../../assets/semaforo/rojo-v1.jpg'),
};

describe('BurbujaDeMensaje', () => {
  const base: ChatMessage = {
    id: 'm-1',
    sender: 'Ana López',
    senderId: 'u-ana',
    avatar: '',
    isMe: false,
    time: '21:04',
    type: 'text',
    text: 'Hola a todos',
  };

  it('en un grupo, el primero de la tanda lleva el nombre; la hora va dentro', () => {
    const todo = textos(
      dibujar(
        React.createElement(BurbujaDeMensaje, {
          mensaje: base,
          enGrupo: true,
          primeroDeLaTanda: true,
          ultimoDeLaTanda: true,
          colores: COLORES,
          audioActivo: false,
          alActivarAudio: () => undefined,
          onAbrirFoto: () => undefined,
        })
      )
    );
    expect(todo).toContain('Ana López');
    expect(todo).toContain('Hola a todos');
    expect(todo).toContain('21:04');
  });

  it('lo propio no lleva nombre y marca «✓» (guardado), no «✓✓»', () => {
    const raiz = dibujar(
      React.createElement(BurbujaDeMensaje, {
        mensaje: { ...base, isMe: true },
        enGrupo: true,
        primeroDeLaTanda: true,
        ultimoDeLaTanda: true,
        colores: COLORES,
        audioActivo: false,
        alActivarAudio: () => undefined,
        onAbrirFoto: () => undefined,
      })
    );
    const todo = textos(raiz);
    expect(todo).not.toContain('Ana López');
    expect(todo).toContain('21:04');
    // 2026-10-05: las marcas son íconos (`check` / `checkCheck`), ya no caracteres.
    expect(marcas(raiz)).toEqual(['check']);
  });

  it('una foto se dibuja dentro de la burbuja y se abre al tocarla', () => {
    const abrir = jest.fn();
    const raiz = dibujar(
      React.createElement(BurbujaDeMensaje, {
        mensaje: { ...base, type: 'image_grid', text: undefined, mediaUrl: 'https://s3/foto.jpg', mediaPath: 'chat/c/fotos/1' },
        enGrupo: false,
        primeroDeLaTanda: true,
        ultimoDeLaTanda: true,
        colores: COLORES,
        audioActivo: false,
        alActivarAudio: () => undefined,
        onAbrirFoto: abrir,
      })
    );
    expect(fuenteDe(raiz, 'Foto enviada por chat')).toEqual({ uri: 'https://s3/foto.jpg', cacheKey: 'chat/c/fotos/1' });
    const tocable = raiz.root.findAll(n => n.props.accessibilityLabel === 'Ver la foto en grande' && !!n.props.onPress);
    act(() => tocable[0].props.onPress());
    // El visor recibe la misma fuente, con la misma clave: no vuelve a bajar la foto.
    expect(abrir).toHaveBeenCalledWith({ uri: 'https://s3/foto.jpg', cacheKey: 'chat/c/fotos/1' });
  });

  /*
   * 2026-10-01: la tarjeta del semáforo aparecía ~1 s después de su burbuja. El backend firma la
   * URL de nuevo en cada lectura; con la URL como clave la caché nunca acertaba. La clave es la
   * ruta, que no cambia, y la caché es la de disco.
   */
  it('dos lecturas con firmas distintas usan la misma clave de caché (la ruta), en disco', () => {
    const conFirma = (firma: string) =>
      dibujar(
        React.createElement(BurbujaDeMensaje, {
          mensaje: {
            ...base,
            type: 'image_grid',
            text: undefined,
            mediaUrl: `https://renaser.s3.amazonaws.com/chat/c/fotos/1.jpg?X-Amz-Signature=${firma}`,
            mediaPath: 'chat/c/fotos/1.jpg',
          },
          enGrupo: false,
          primeroDeLaTanda: true,
          ultimoDeLaTanda: true,
          colores: COLORES,
          audioActivo: false,
          alActivarAudio: () => undefined,
          onAbrirFoto: () => undefined,
        })
      );
    const primera = imagenDe(conFirma('aaa'), 'Foto enviada por chat');
    const segunda = imagenDe(conFirma('bbb'), 'Foto enviada por chat');
    expect(primera.props.source.cacheKey).toBe('chat/c/fotos/1.jpg');
    expect(segunda.props.source.cacheKey).toBe(primera.props.source.cacheKey);
    expect(primera.props.cachePolicy).toBe('memory-disk');
  });

  it('el sticker también usa la ruta como clave de caché', () => {
    const raiz = dibujar(
      React.createElement(BurbujaDeMensaje, {
        mensaje: {
          ...base,
          type: 'image_grid',
          text: undefined,
          esSticker: true,
          stickerNombre: '¡Muy bien!',
          mediaUrl: 'https://s3/sticker.webp?firma=1',
          mediaPath: 'chat/c/stickers/muy-bien.webp',
        },
        enGrupo: false,
        primeroDeLaTanda: true,
        ultimoDeLaTanda: true,
        colores: COLORES,
        audioActivo: false,
        alActivarAudio: () => undefined,
        onAbrirFoto: () => undefined,
      })
    );
    const sticker = imagenDe(raiz, '¡Muy bien!');
    expect(sticker.props.source).toEqual({ uri: 'https://s3/sticker.webp?firma=1', cacheKey: 'chat/c/stickers/muy-bien.webp' });
    expect(sticker.props.cachePolicy).toBe('memory-disk');
  });
});

describe('CabeceraDeChat', () => {
  it('muestra nombre y subtítulo, y abre la info al tocar', () => {
    const abrirInfo = jest.fn();
    const raiz = dibujar(
      React.createElement(CabeceraDeChat, {
        tipo: 'celula',
        titulo: 'Grupo Fénix (prueba)',
        subtitulo: 'Grupo · 2 integrantes',
        enLinea: false,
        onVolver: () => undefined,
        onAbrirInfo: abrirInfo,
      })
    );
    const todo = textos(raiz);
    expect(todo).toContain('Grupo Fénix (prueba)');
    expect(todo).toContain('Grupo · 2 integrantes');
    const quien = raiz.root.findAll(
      n => n.props.accessibilityLabel === 'Ver la información de Grupo Fénix (prueba)' && !!n.props.onPress
    );
    act(() => quien[0].props.onPress());
    expect(abrirInfo).toHaveBeenCalled();
  });

  /* Pedido del dueño (2026-09-27): «si le doy en el círculo, ver la info del grupo». El círculo
     (el fénix del grupo) está DENTRO del botón que abre la info, junto con el nombre. */
  it('el círculo del avatar es parte de lo que se toca para abrir la info', () => {
    const raiz = dibujar(
      React.createElement(CabeceraDeChat, {
        tipo: 'celula',
        titulo: 'Grupo Fénix (prueba)',
        subtitulo: 'Grupo · 2 integrantes',
        enLinea: false,
        onVolver: () => undefined,
        onAbrirInfo: () => undefined,
      })
    );
    const quien = raiz.root.findAll(
      n => n.props.accessibilityLabel === 'Ver la información de Grupo Fénix (prueba)' && !!n.props.onPress
    );
    const circulo = quien[0].findAll(n => (n.type as unknown) === 'Image');
    expect(circulo.length).toBeGreaterThan(0);
  });
});

describe('huecoParaLaHora', () => {
  it('reserva el lugar con espacios que no dibujan nada (en Android la hora anidada se veía dos veces)', () => {
    const hueco = huecoParaLaHora('09:56 ✓');
    expect(hueco).toMatch(/^ +$/);
    expect(hueco).not.toContain('09:56');
    expect(hueco.length).toBeGreaterThanOrEqual(15);
  });
});

/*
 * Mensajes del programa (2026-09-27): la bienvenida del soporte llega como mensaje de sistema y
 * se dibuja como una burbuja de «Formación Renaser» con el fénix, no como una persona.
 */
describe('BurbujaDeMensaje de un mensaje del programa', () => {
  const delPrograma = (parcial: Record<string, unknown>) =>
    mapearMensaje(
      {
        id: 'm-bienvenida',
        conversationId: 'c-soporte',
        senderId: null,
        senderName: null,
        senderAvatarUrl: null,
        type: 'SYSTEM',
        text: '¡Bienvenida, Ana!',
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
      },
      'u-yo'
    );

  const dibujarBurbuja = (mensaje: ChatMessage, primeroDeLaTanda = true) =>
    dibujar(
      React.createElement(BurbujaDeMensaje, {
        mensaje,
        // El soporte no es un grupo: igual va firmado.
        enGrupo: false,
        primeroDeLaTanda,
        ultimoDeLaTanda: true,
        colores: COLORES,
        audioActivo: false,
        alActivarAudio: () => undefined,
        onAbrirFoto: () => undefined,
      })
    );

  it('va firmada «Formación Renaser», con el fénix al lado y sin la marca de enviado', () => {
    const raiz = dibujarBurbuja(delPrograma({}));
    const todo = textos(raiz);
    expect(todo).toContain('Formación Renaser');
    expect(todo).toContain('¡Bienvenida, Ana!');
    expect(marcas(raiz)).toEqual([]);
    const fenix = raiz.root.findAll(n => (n.type as unknown) === 'Image' && n.props.accessibilityLabel === 'Formación Renaser');
    expect(fenix).toHaveLength(1);
  });

  it('la tarjeta se ve como foto dentro de la burbuja', () => {
    const raiz = dibujarBurbuja(delPrograma({ text: null, mediaPath: 'chat/c/fotos/1', mediaMime: 'image/png', mediaUrl: 'https://s3/tarjeta.png' }));
    expect(fuenteDe(raiz, 'Foto enviada por chat')).toEqual({ uri: 'https://s3/tarjeta.png', cacheKey: 'chat/c/fotos/1' });
  });

  /* Las tarjetas del semáforo viajan dentro de la app: con la ruta versionada exacta que sube el
     backend (`ColorDeTarjeta.rutaEnAlmacenamiento()`) no se baja nada, ni la primera vez. */
  it.each(['verde', 'amarillo', 'rojo'])('la tarjeta %s del semáforo (v1) sale de la app, no de la red', color => {
    const raiz = dibujarBurbuja(
      delPrograma({
        mediaPath: `semaforo/tarjetas/${color}-v1.jpg`,
        mediaMime: 'image/jpeg',
        mediaUrl: `https://s3/semaforo/tarjetas/${color}-v1.jpg?X-Amz-Signature=x`,
      })
    );
    expect(fuenteDe(raiz, 'Foto enviada por chat')).toBe(TARJETAS_EMPAQUETADAS[color]);
  });

  it('una tarjeta con otra versión (diseño nuevo) sale de la red, nunca la empaquetada vieja', () => {
    const raiz = dibujarBurbuja(
      delPrograma({
        mediaPath: 'semaforo/tarjetas/verde-v2.jpg',
        mediaMime: 'image/jpeg',
        mediaUrl: 'https://s3/semaforo/tarjetas/verde-v2.jpg?X-Amz-Signature=x',
      })
    );
    expect(fuenteDe(raiz, 'Foto enviada por chat')).toEqual({
      uri: 'https://s3/semaforo/tarjetas/verde-v2.jpg?X-Amz-Signature=x',
      cacheKey: 'semaforo/tarjetas/verde-v2.jpg',
    });
  });

  it('los siguientes de la tanda no repiten firma ni fénix', () => {
    const raiz = dibujarBurbuja(delPrograma({}), false);
    expect(textos(raiz)).not.toContain('Formación Renaser');
    expect(raiz.root.findAll(n => (n.type as unknown) === 'Image')).toHaveLength(0);
  });
});

describe('InfoDelChat', () => {
  const filas = integrantesDeLaInfo({
    mentor: { nombre: 'Ricardo Díaz', avatarUrl: null },
    miembros: [
      { traineeId: 'u-yo', fullName: 'Ana Rojas', avatarUrl: null, isSelf: true },
      { traineeId: 'u-luis', fullName: 'Luis Soto', avatarUrl: null, isSelf: false },
    ],
  });

  it('muestra nombre grande, «Grupo · N integrantes» y la sección con el mentor primero y sus marcas', () => {
    const raiz = dibujar(
      React.createElement(InfoDelChat, {
        tipo: 'celula',
        titulo: 'Info. del grupo',
        nombre: 'Grupo Fénix (prueba)',
        subtitulo: 'Grupo · 3 integrantes',
        detalle: 'Cohorte Septiembre',
        integrantes: { filas, cifra: 3, cargando: false, error: null },
        onVolver: () => undefined,
        onAbrirChatCon: () => undefined,
        onVerFicha: () => undefined,
      })
    );
    const todo = textos(raiz);
    expect(todo).toContain('Info. del grupo');
    expect(todo).toContain('Grupo Fénix (prueba)');
    expect(todo).toContain('Grupo · 3 integrantes');
    expect(todo).toContain('Cohorte Septiembre');
    expect(todo).toContain('3 integrantes');
    expect(todo.indexOf('Ricardo Díaz')).toBeLessThan(todo.indexOf('Tú'));
    expect(todo.indexOf('Tú')).toBeLessThan(todo.indexOf('Luis Soto'));
    expect(todo).toContain('Mentor');
    expect(todo).toContain('Aprendiz');
  });

  it('tocar a un compañero abre su 1 a 1; al mentor y a uno mismo no se los puede tocar', () => {
    const abrir = jest.fn();
    const volver = jest.fn();
    const raiz = dibujar(
      React.createElement(InfoDelChat, {
        tipo: 'celula',
        titulo: 'Info. del grupo',
        nombre: 'Grupo Fénix (prueba)',
        subtitulo: 'Grupo · 3 integrantes',
        integrantes: { filas, cifra: 3, cargando: false, error: null },
        onVolver: volver,
        onAbrirChatCon: abrir,
        onVerFicha: () => undefined,
      })
    );
    const tocables = raiz.root.findAll(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Escribirle a') && !!n.props.onPress);
    expect(tocables.map(n => n.props.accessibilityLabel)).toEqual(['Escribirle a Luis Soto, Aprendiz']);
    act(() => tocables[0].props.onPress());
    expect(abrir).toHaveBeenCalledWith('u-luis');

    const flecha = raiz.root.findAll(n => n.props.accessibilityLabel === 'Volver al chat' && !!n.props.onPress);
    act(() => flecha[0].props.onPress());
    expect(volver).toHaveBeenCalled();
  });

  it('en un 1 a 1 no hay sección de integrantes: nombre y rol', () => {
    const todo = textos(
      dibujar(
        React.createElement(InfoDelChat, {
          tipo: 'direct',
          titulo: 'Info. del contacto',
          nombre: 'Luis Soto',
          subtitulo: 'Aprendiz',
          integrantes: null,
          onVolver: () => undefined,
          onAbrirChatCon: () => undefined,
          onVerFicha: () => undefined,
        })
      )
    );
    expect(todo).toContain('Luis Soto');
    expect(todo).toContain('Aprendiz');
    expect(todo).not.toContain('integrantes');
  });
});

/** Las fuentes de todas las `Image` dibujadas. */
/** Las fuentes de cada `Image`. La foto con sesión va en un arreglo (E-411): se aplana. */
function fuentes(raiz: ReactTestRenderer): unknown[] {
  return raiz.root
    .findAll(n => (n.type as unknown) === 'Image')
    .flatMap(n => (Array.isArray(n.props.source) ? n.props.source : [n.props.source]));
}

describe('AvatarDeChat (D-206)', () => {
  it('la comunidad vuelve al fénix; el grupo sigue con la tarjeta sin nombre', () => {
    const fenix = fuentes(dibujar(React.createElement(FotoDelPrograma, { size: 40 })))[0];
    const tarjeta = fuentes(dibujar(React.createElement(FotoDelGrupo, { size: 40 })))[0];

    expect(fuentes(dibujar(React.createElement(AvatarDeChat, { tipo: 'global', nombre: 'Comunidad', size: 40 })))).toEqual([fenix]);
    expect(fuentes(dibujar(React.createElement(AvatarDeChat, { tipo: 'celula', nombre: 'Fénix', size: 40 })))).toEqual([tarjeta]);
    expect(fenix).not.toEqual(tarjeta);
  });
});

describe('La foto propia del grupo (D-212)', () => {
  const RUTA = '/api/v1/chat/conversations/g-1/foto?v=1790000000000';

  it('el avatar del grupo pide su foto propia con la sesión, con la tarjeta debajo', () => {
    const tarjeta = fuentes(dibujar(React.createElement(FotoDelGrupo, { size: 40 })))[0];

    const imagenes = fuentes(dibujar(React.createElement(AvatarDeChat, { tipo: 'celula', nombre: 'Fénix', fotoPath: RUTA, size: 40 })));

    expect(imagenes[0]).toEqual(tarjeta);
    expect(imagenes[1]).toEqual({ uri: expect.stringContaining(RUTA), headers: { 'X-Auth-Token': 'sesion-de-prueba' } });
  });

  const info = (fotoDelGrupo: { grupoId: string; tieneFotoPropia: boolean; onCambiada: () => void } | null) =>
    dibujar(
      React.createElement(InfoDelChat, {
        tipo: 'celula',
        titulo: 'Info. del grupo',
        nombre: 'Fénix',
        subtitulo: 'Grupo · 3 integrantes',
        integrantes: { filas: [], cifra: 3, cargando: false, error: null },
        onVolver: () => undefined,
        onAbrirChatCon: () => undefined,
        onVerFicha: () => undefined,
        fotoDelGrupo,
      })
    );

  it('a quien puede cambiarla, «Cambiar foto del grupo»; con foto propia, también «Volver a la foto de Renaser»', () => {
    const sinPropia = textos(info({ grupoId: 'g-1', tieneFotoPropia: false, onCambiada: () => undefined }));
    const conPropia = textos(info({ grupoId: 'g-1', tieneFotoPropia: true, onCambiada: () => undefined }));

    expect(sinPropia).toContain('Foto del grupo');
    expect(sinPropia).toContain('Cambiar foto del grupo');
    expect(sinPropia).not.toContain('Volver a la foto de Renaser');
    expect(conPropia).toContain('Volver a la foto de Renaser');
  });

  it('a quien no puede, nada', () => {
    const todo = textos(info(null));

    expect(todo).not.toContain('Foto del grupo');
    expect(todo).not.toContain('Cambiar foto del grupo');
  });
});

describe('InfoDelChat: tarjetas con nombre, escribirle al mentor y la ficha (D-206, D-207)', () => {
  const RUTA = (id: string) => `/api/v1/chat/conversations/g-1/miembros/${id}/foto`;
  const mentor = { id: 'u-ricardo', nombre: 'Ricardo Palomino', avatarUrl: 'https://s3/avatares/ricardo.jpg', fotoPath: RUTA('u-ricardo') };
  const miembros = [
    { traineeId: 'u-e2e-1', fullName: 'E2E Libre 01', avatarUrl: null, isSelf: false, photoPath: RUTA('u-e2e-1') },
    { traineeId: 'u-e2e-2', fullName: 'E2E Libre 02', avatarUrl: 'https://s3/avatares/e2e-2.jpg', isSelf: false, photoPath: null },
  ];
  const dibujarInfo = (yoId: string, acciones: { abrir?: () => void; ficha?: () => void } = {}) =>
    dibujar(
      React.createElement(InfoDelChat, {
        tipo: 'celula',
        titulo: 'Info. del grupo',
        nombre: 'Grupo Fénix (prueba)',
        subtitulo: 'Grupo · 3 integrantes',
        integrantes: { filas: integrantesDeLaInfo({ mentor, miembros, yoId }), cifra: 3, cargando: false, error: null },
        onVolver: () => undefined,
        onAbrirChatCon: acciones.abrir ?? (() => undefined),
        onVerFicha: acciones.ficha ?? (() => undefined),
      })
    );

  it('con la ruta, la tarjeta pedida con la sesión y NO la foto subida; sin la ruta, la foto subida', () => {
    const pedidas = fuentes(dibujarInfo('u-e2e-1')).filter(
      (f): f is { uri: string; headers?: Record<string, string> } => typeof f === 'object' && f !== null && 'uri' in f
    );

    const deRicardo = pedidas.find(f => f.uri.endsWith(RUTA('u-ricardo')));
    expect(deRicardo?.headers).toEqual({ 'X-Auth-Token': 'sesion-de-prueba' });
    expect(pedidas.some(f => f.uri.endsWith(RUTA('u-e2e-1')))).toBe(true);
    expect(pedidas.some(f => f.uri === 'https://s3/avatares/ricardo.jpg')).toBe(false);
    expect(pedidas.some(f => f.uri === 'https://s3/avatares/e2e-2.jpg')).toBe(true);
  });

  it('el aprendiz le escribe a su mentor desde la info, y no ve «Ver ficha»', () => {
    const abrir = jest.fn();
    const raiz = dibujarInfo('u-e2e-1', { abrir });

    const alMentor = raiz.root.findAll(n => n.props.accessibilityLabel === 'Escribirle a Ricardo Palomino, Mentor' && !!n.props.onPress);
    act(() => alMentor[0].props.onPress());
    expect(abrir).toHaveBeenCalledWith('u-ricardo');
    expect(textos(raiz)).not.toContain('Ver ficha');
  });

  it('el mentor de este grupo se ve como «Tú» y ve «Ver ficha» en cada aprendiz, con el 1 a 1 al lado', () => {
    const abrir = jest.fn();
    const ficha = jest.fn();
    const raiz = dibujarInfo('u-ricardo', { abrir, ficha });

    expect(textos(raiz)).toContain('Tú');
    const botones = raiz.root.findAll(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Ver la ficha de') && !!n.props.onPress);
    expect(botones.map(n => n.props.accessibilityLabel)).toEqual(['Ver la ficha de E2E Libre 01', 'Ver la ficha de E2E Libre 02']);
    act(() => botones[1].props.onPress());
    expect(ficha).toHaveBeenCalledWith(expect.objectContaining({ usuarioId: 'u-e2e-2', nombreCompleto: 'E2E Libre 02' }));

    const chats = raiz.root.findAll(n => n.props.accessibilityLabel === 'Escribirle a E2E Libre 01' && !!n.props.onPress);
    act(() => chats[0].props.onPress());
    expect(abrir).toHaveBeenCalledWith('u-e2e-1');
    expect(raiz.root.findAll(n => n.props.accessibilityLabel === 'Escribirle a Tú, Mentor')).toHaveLength(0);
  });
});

describe('InfoDelChat: los integrantes de todo chat, para todo rol (D-222)', () => {
  const persona = (userId: string, nombre: string, rol: string, esUnoMismo = false) => ({ userId, nombre, rol, esUnoMismo });
  const base = {
    titulo: 'Info. del chat',
    onVolver: () => undefined,
    onAbrirChatCon: () => undefined,
    onVerFicha: () => undefined,
  };

  it('el Admin abre la info de un grupo y ve a los integrantes con su marca, «Tú» incluido y «Ver ficha» en cada aprendiz', () => {
    const filas = integrantesDelChat({
      participantes: [
        persona('u-ricardo', 'Ricardo Palomino', 'MENTOR'),
        persona('u-kelin', 'Kelin Rojas', 'ADMIN', true),
        persona('u-ana', 'Ana Pérez', 'APRENDIZ'),
      ],
      tipo: 'celula',
      miRol: 'ADMIN',
    });
    const raiz = dibujar(
      React.createElement(InfoDelChat, {
        ...base,
        tipo: 'celula',
        titulo: 'Info. del grupo',
        nombre: 'Fénix',
        subtitulo: 'Grupo · 3 integrantes',
        integrantes: { filas, cifra: 3, cargando: false, error: null },
      })
    );

    const todo = textos(raiz);
    expect(todo).toContain('3 integrantes');
    expect(todo).toContain('Ricardo Palomino');
    expect(todo).toContain('Ana Pérez');
    expect(todo).toContain('Tú');
    expect(todo).toContain('Mentor');
    expect(todo).toContain('Admin');
    const fichas = raiz.root.findAll(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Ver la ficha de') && !!n.props.onPress);
    expect(fichas.map(n => n.props.accessibilityLabel)).toEqual(['Ver la ficha de Ana Pérez']);
  });

  it('la comunidad muestra «N integrantes» con la marca de cada uno, el buscador y «Ver más»; tocar «Ver más» pide la siguiente página', () => {
    const verMas = jest.fn();
    const buscar = jest.fn();
    const filas = integrantesDelChat({
      participantes: [persona('u-ana', 'Ana Pérez', 'APRENDIZ', true), persona('u-zoe', 'Zoe Alquimia', 'ALQUIMISTA')],
      tipo: 'global',
      miRol: 'TRAINEE',
    });
    const raiz = dibujar(
      React.createElement(InfoDelChat, {
        ...base,
        tipo: 'global',
        nombre: 'Formación Renaser Global',
        subtitulo: 'Comunidad completa RENASER',
        integrantes: { filas, cifra: 240, cargando: false, error: null, hayMas: true, onVerMas: verMas, busqueda: '', onBuscar: buscar },
      })
    );

    const todo = textos(raiz);
    expect(todo).toContain('240 integrantes');
    expect(todo).toContain('Alquimista');
    expect(todo).toContain('Ver más');
    const buscador = raiz.root.findAll(n => n.props.accessibilityLabel === 'Buscar integrantes por nombre' && !!n.props.onChangeText);
    act(() => buscador[0].props.onChangeText('zo'));
    expect(buscar).toHaveBeenCalledWith('zo');
    const boton = raiz.root.findAll(n => n.props.accessibilityLabel === 'Ver más integrantes' && !!n.props.onPress);
    act(() => boton[0].props.onPress());
    expect(verMas).toHaveBeenCalled();
  });

  it('el soporte muestra al aprendiz y al staff; sin «Ver más» ni buscador cuando son pocos', () => {
    const filas = integrantesDelChat({
      participantes: [persona('u-ana', 'Ana Pérez', 'APRENDIZ', true), persona('u-kelin', 'Kelin Rojas', 'ADMIN')],
      tipo: 'soporte',
      miRol: 'TRAINEE',
    });
    const raiz = dibujar(
      React.createElement(InfoDelChat, {
        ...base,
        tipo: 'soporte',
        nombre: 'Ana – Formación Renaser',
        subtitulo: 'Chat de soporte',
        integrantes: { filas, cifra: 2, cargando: false, error: null },
      })
    );

    const todo = textos(raiz);
    expect(todo).toContain('2 integrantes');
    expect(todo).toContain('Kelin Rojas');
    expect(todo).not.toContain('Ver más');
    expect(raiz.root.findAll(n => n.props.accessibilityLabel === 'Buscar integrantes por nombre')).toHaveLength(0);
  });

  it('si el servidor falla se dice, no «Todavía no hay integrantes»; buscando sin resultados, se dice distinto', () => {
    const conError = textos(
      dibujar(
        React.createElement(InfoDelChat, {
          ...base,
          tipo: 'global',
          nombre: 'Global',
          subtitulo: 'Comunidad',
          integrantes: { filas: [], cifra: null, cargando: false, error: 'No pudimos cargar los integrantes.' },
        })
      )
    );
    const sinCoincidencias = textos(
      dibujar(
        React.createElement(InfoDelChat, {
          ...base,
          tipo: 'global',
          nombre: 'Global',
          subtitulo: 'Comunidad',
          integrantes: { filas: [], cifra: 240, cargando: false, error: null, busqueda: 'zzz', onBuscar: () => undefined },
        })
      )
    );

    expect(conError).toContain('No pudimos cargar los integrantes.');
    expect(conError).not.toContain('Todavía no hay integrantes');
    expect(sinCoincidencias).toContain('Nadie coincide con esa búsqueda.');
  });
});

describe('BotonBajarAlFinal', () => {
  it('dice cuántos mensajes nuevos llegaron y baja al tocarlo', () => {
    const bajar = jest.fn();
    const raiz = dibujar(React.createElement(BotonBajarAlFinal, { nuevosSinVer: 3, onPress: bajar }));
    expect(textos(raiz)).toContain('3');
    const boton = raiz.root.findAll(n => n.props.accessibilityLabel === 'Ir al último mensaje. 3 mensajes nuevos' && !!n.props.onPress);
    act(() => boton[0].props.onPress());
    expect(bajar).toHaveBeenCalled();
  });

  it('sin nuevos, solo la flecha', () => {
    const raiz = dibujar(React.createElement(BotonBajarAlFinal, { nuevosSinVer: 0, onPress: () => undefined }));
    expect(textos(raiz)).toBe('');
  });
});
