/**
 * Responder y copiar desde el chat (pedido del dueño, 2026-10-05; D-251 del backend), dibujado con
 * datos de la forma que deja el mapeador:
 *
 * - la burbuja que responde muestra la cita arriba; tocarla pide ir al citado; si el citado ya no
 *   está dice «Mensaje eliminado» sin autor y no se toca;
 * - mantener presionada la burbuja (o su foto, o su cita) abre el menú del mensaje;
 * - el menú ofrece «Responder» siempre y «Copiar» solo con texto que copiar y un teléfono que pueda.
 *
 * Contra el código anterior fallan todas: la burbuja no tenía cita ni «mantener presionado» (la
 * captura comunidad-antes-10 del 05/10: el toque largo no hacía nada) y no existía el menú.
 */
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { light } from '../../../../theme/tokens';

const mockSeleccion = jest.fn();
jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../../../utils/tacto', () => ({
  tacto: { seleccion: () => mockSeleccion(), error: () => undefined, logro: () => undefined, mantener: () => undefined, descartar: () => undefined },
}));
jest.mock('../BurbujaAudioChat', () => ({ BurbujaAudioChat: () => null }));

import type { ChatMessage } from '../../../../screens/ComunidadScreen';
import { mapearMensaje } from '../../api/chatMappers';
import { wireMensajesPageSchema } from '../../api/chatSchemas';
import type { WireMensaje } from '../../types/chat.types';
import { BurbujaDeMensaje } from '../BurbujaDeMensaje';
import { coloresDelChat } from '../coloresDelChat';
import { MenuDelMensaje, opcionesDelMensaje } from '../MenuDelMensaje';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const COLORES = coloresDelChat(light, false);
const YO = 'u-ana';

function delServidor(parcial: Record<string, unknown>): ChatMessage {
  const pagina = wireMensajesPageSchema.parse({
    messages: [{
      id: 'm-2', conversationId: 'c-1', senderId: 'u-luis', senderName: 'Luis Soto', senderAvatarUrl: null,
      type: 'TEXT', text: 'Sí, a las 7 está bien', mediaBucket: null, mediaPath: null, mediaMime: null,
      mediaBytes: null, mediaDurationSeconds: null, mediaUrl: null, hidden: false, replyToId: null, replyTo: null,
      createdAt: '2026-10-05T15:00:00Z', status: null, ...parcial,
    }],
    nextCursor: null,
    hasMore: false,
  });
  return mapearMensaje(pagina.messages[0] as WireMensaje, YO);
}

function dibujar(elemento: React.ReactElement): ReactTestRenderer {
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(elemento);
  });
  return raiz;
}

function burbuja(mensaje: ChatMessage, extra: Record<string, unknown> = {}) {
  return React.createElement(BurbujaDeMensaje, {
    mensaje,
    enGrupo: true,
    primeroDeLaTanda: true,
    ultimoDeLaTanda: true,
    colores: COLORES,
    audioActivo: false,
    alActivarAudio: () => undefined,
    onAbrirFoto: () => undefined,
    ...extra,
  });
}

/** Todo el texto visible, en orden. */
function textos(raiz: ReactTestRenderer): string {
  return raiz.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
}

function conEtiqueta(raiz: ReactTestRenderer, prefijo: string): ReactTestInstance[] {
  return raiz.root.findAll(
    n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith(prefijo) && !!n.props.onPress
  );
}

const CITA = { id: 'm-1', senderName: 'Ana Pérez', type: 'TEXT', text: '¿Nos vemos a las 7?', deletedAt: null, mine: true };

describe('la cita dentro de la burbuja', () => {
  it('va arriba con «Tú» y el extracto; tocarla pide ir al mensaje citado', () => {
    const irA = jest.fn();
    const raiz = dibujar(burbuja(delServidor({ replyToId: 'm-1', replyTo: CITA }), { onTocarCita: irA }));

    const todo = textos(raiz);
    expect(todo).toContain('Tú');
    expect(todo).toContain('¿Nos vemos a las 7?');
    expect(todo.indexOf('¿Nos vemos a las 7?')).toBeLessThan(todo.indexOf('Sí, a las 7 está bien'));

    const cita = conEtiqueta(raiz, 'Responde a Tú');
    expect(cita).toHaveLength(1);
    act(() => cita[0].props.onPress());
    expect(irA).toHaveBeenCalledWith('m-1');
  });

  it('si el citado ya no está: «Mensaje eliminado», sin autor y sin toque', () => {
    const irA = jest.fn();
    const raiz = dibujar(burbuja(delServidor({ replyToDeleted: true }), { onTocarCita: irA }));

    expect(textos(raiz)).toContain('Mensaje eliminado');
    expect(raiz.root.findAll(n => n.props.accessibilityHint === 'Lleva al mensaje citado')).toHaveLength(0);
  });

  it('sin cita, la burbuja es la de siempre', () => {
    const raiz = dibujar(burbuja(delServidor({})));
    expect(textos(raiz)).not.toContain('Mensaje eliminado');
    expect(raiz.root.findAll(n => typeof n.props.accessibilityLabel === 'string'
      && n.props.accessibilityLabel.startsWith('Responde a'))).toHaveLength(0);
  });
});

describe('mantener presionado un mensaje', () => {
  it('la burbuja, su foto y su cita abren el menú de ESE mensaje', () => {
    const mantener = jest.fn();
    const mensaje = delServidor({ type: 'IMAGE', text: 'Mi foto', mediaBucket: 'chat', mediaPath: 'chat/c-1/fotos/1',
      mediaMime: 'image/jpeg', mediaUrl: 'https://s3/f.jpg', replyToId: 'm-1', replyTo: CITA });
    const raiz = dibujar(burbuja(mensaje, { onMantener: mantener, onTocarCita: () => undefined }));

    const conMantener = raiz.root.findAll(n => typeof n.props.onLongPress === 'function' && n.props.delayLongPress === 350);
    // La burbuja, la foto y la cita (cada una con su Pressable).
    expect(conMantener.length).toBeGreaterThanOrEqual(3);
    conMantener.forEach(n => act(() => n.props.onLongPress()));
    expect(mantener).toHaveBeenCalledTimes(conMantener.length);
    expect(mantener).toHaveBeenCalledWith(mensaje);
  });
});

describe('el menú del mensaje', () => {
  const texto = delServidor({});
  const sticker = delServidor({ type: 'IMAGE', text: 'Sticker Renaser: ¡Muy bien!', mediaBucket: 'chat',
    mediaPath: 'chat/c-1/fotos/s', mediaMime: 'image/webp', mediaUrl: 'https://s3/s.webp' });

  it('Responder siempre; Copiar solo con texto y un teléfono que pueda copiar', () => {
    expect(opcionesDelMensaje(texto, true)).toEqual(['responder', 'copiar']);
    expect(opcionesDelMensaje(texto, false)).toEqual(['responder']);
    expect(opcionesDelMensaje(sticker, true)).toEqual(['responder']);
  });

  it('dice de quién es el mensaje, y sus filas responden y copian con el «tic» de selección', () => {
    const alResponder = jest.fn();
    const alCopiar = jest.fn();
    const raiz = dibujar(React.createElement(MenuDelMensaje, {
      mensaje: texto, alCerrar: () => undefined, alResponder, alCopiar, puedeCopiar: true,
    }));

    expect(textos(raiz)).toContain('Mensaje de Luis Soto');
    act(() => conEtiqueta(raiz, 'Responder')[0].props.onPress());
    act(() => conEtiqueta(raiz, 'Copiar')[0].props.onPress());

    expect(alResponder).toHaveBeenCalledWith(texto);
    expect(alCopiar).toHaveBeenCalledWith('Sí, a las 7 está bien');
    expect(mockSeleccion).toHaveBeenCalledTimes(2);
  });
});
