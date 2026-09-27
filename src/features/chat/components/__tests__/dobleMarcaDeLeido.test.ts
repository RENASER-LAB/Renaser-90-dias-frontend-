/**
 * La burbuja con la doble marca de leído (D-208 del backend, 2026-09-27): «✓» si el servidor lo
 * guardó, «✓✓» dorado si lo leyeron. Contra el código anterior fallan las de ✓✓: la burbuja pintaba
 * siempre «✓» y el mapeador ponía `status: 'read'` a todo sin mirar el servidor.
 *
 * Y lo que no puede romper nada: un `status` desconocido o ausente (un APK nuevo contra un backend
 * viejo, o un backend futuro con un «entregado») se ve «✓».
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
jest.mock('../BurbujaAudioChat', () => ({ BurbujaAudioChat: () => null }));

import type { ChatMessage } from '../../../../screens/ComunidadScreen';
import { mapearMensaje } from '../../api/chatMappers';
import { wireMensajesPageSchema } from '../../api/chatSchemas';
import type { WireMensaje } from '../../types/chat.types';
import { conLeidoHasta } from '../../utils/lecturaDelChat';
import { BurbujaDeMensaje } from '../BurbujaDeMensaje';
import { coloresDelChat } from '../coloresDelChat';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const COLORES = coloresDelChat(light, false);
const YO = 'u-ana';

function dibujar(mensaje: ChatMessage): ReactTestRenderer {
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(BurbujaDeMensaje, {
        mensaje,
        enGrupo: true,
        primeroDeLaTanda: true,
        ultimoDeLaTanda: true,
        colores: COLORES,
        audioActivo: false,
        alActivarAudio: () => undefined,
        onAbrirFoto: () => undefined,
      })
    );
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

/** El `Text` que dibuja la doble marca, o `undefined`. */
function laDobleMarca(raiz: ReactTestRenderer) {
  return raiz.root.findAll(n => (n.type as unknown) === 'Text' && n.props.children === ' ✓✓')[0];
}

/** Crudo, como en el JSON: `status` puede traer cualquier cosa, también algo que no es texto. */
function wire(parcial: Record<string, unknown>): WireMensaje {
  return {
    id: 'm-1',
    conversationId: 'c-1',
    senderId: YO,
    senderName: 'Ana Pérez',
    senderAvatarUrl: null,
    type: 'TEXT',
    text: 'Hola a todos',
    mediaBucket: null,
    mediaPath: null,
    mediaMime: null,
    mediaBytes: null,
    mediaDurationSeconds: null,
    mediaUrl: null,
    hidden: false,
    replyToId: null,
    replyTo: null,
    createdAt: '2026-09-27T02:04:00.123456Z',
    ...parcial,
  } as WireMensaje;
}

/** Como llega de verdad: validado por el esquema y mapeado, no armado a mano. */
function delServidor(parcial: Record<string, unknown>): ChatMessage {
  const pagina = wireMensajesPageSchema.parse({ messages: [wire(parcial)], nextCursor: null, hasMore: false });
  return mapearMensaje(pagina.messages[0] as WireMensaje, YO);
}

describe('BurbujaDeMensaje con la doble marca de leído', () => {
  it('READ del servidor: «✓✓» en el dorado de leído, y lo dice para quien no ve la pantalla', () => {
    const raiz = dibujar(delServidor({ status: 'READ' }));

    const marca = laDobleMarca(raiz);
    expect(marca).toBeDefined();
    expect(marca.props.style).toEqual({ color: COLORES.leido });
    const hora = raiz.root.findAll(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Enviado'));
    expect(hora[0].props.accessibilityLabel).toMatch(/, leído$/);
  });

  it('SENT: un solo «✓», en el color de la hora', () => {
    const raiz = dibujar(delServidor({ status: 'SENT' }));

    expect(textos(raiz)).toContain('✓');
    expect(textos(raiz)).not.toContain('✓✓');
    expect(laDobleMarca(raiz)).toBeUndefined();
  });

  it('un estado ausente, nulo o que esta versión no conoce no rompe nada: se ve «✓»', () => {
    for (const parcial of [{}, { status: null }, { status: 'DELIVERED' }, { status: 42 }]) {
      const raiz = dibujar(delServidor(parcial));
      expect(textos(raiz)).toContain('✓');
      expect(laDobleMarca(raiz)).toBeUndefined();
    }
  });

  it('el mensaje de otra persona no lleva marca, aunque diga READ', () => {
    const raiz = dibujar(delServidor({ senderId: 'u-luis', senderName: 'Luis Soto', status: 'READ' }));

    expect(textos(raiz)).not.toContain('✓');
  });

  it('pasa de «✓» a «✓✓» cuando llega el aviso en vivo con una marca posterior', () => {
    const enviado = delServidor({ status: 'SENT' });
    expect(laDobleMarca(dibujar(enviado))).toBeUndefined();

    const [leido] = conLeidoHasta([enviado], '2026-09-27T02:05:00Z');

    expect(laDobleMarca(dibujar(leido))).toBeDefined();
    // Un aviso anterior al mensaje no lo marca.
    expect(laDobleMarca(dibujar(conLeidoHasta([enviado], '2026-09-27T02:03:59Z')[0]))).toBeUndefined();
  });

  it('una foto sin texto leída lleva «✓✓» sobre la franja oscura, en su dorado claro', () => {
    const raiz = dibujar(delServidor({ type: 'IMAGE', text: null, mediaBucket: 'chat', mediaPath: 'chat/c-1/fotos/1',
      mediaMime: 'image/jpeg', mediaUrl: 'https://s3/foto.jpg', status: 'READ' }));

    expect(laDobleMarca(raiz)?.props.style).toEqual({ color: COLORES.leidoSobreFoto });
  });
});
