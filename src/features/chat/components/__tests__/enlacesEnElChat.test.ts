/**
 * #209 (2026-11-16, reportado por el cliente): el recordatorio de un evento que llega al chat de la Tribu dice
 * «Entra aquí: https://meet.google.com/…», pero el enlace salía como texto y no se podía tocar. La burbuja pintaba
 * `mensaje.text` con un `<Text>` a secas. Ahora usa `TextoConEnlaces` (solo `http`/`https`, como en Cursos).
 *
 * Contra el código anterior fallan las dos primeras: no había ningún texto con rol de enlace.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Linking } from 'react-native';
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
import { BurbujaDeMensaje } from '../BurbujaDeMensaje';
import { coloresDelChat } from '../coloresDelChat';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const COLORES = coloresDelChat(light, false);
const YO = 'u-ana';
const MEET = 'https://meet.google.com/abc-defg-hij';
const RECORDATORIO = `Recordatorio: Sesión personalizada · Grupo Fénix\nHoy a las 20:00\nEntra aquí: ${MEET}`;

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

function delServidor(parcial: Record<string, unknown>): ChatMessage {
  const wire = {
    id: 'm-1', conversationId: 'c-1', senderId: 'u-rocio', senderName: 'Rocío Líder', senderAvatarUrl: null, type: 'TEXT',
    text: 'Hola a todos', mediaBucket: null, mediaPath: null, mediaMime: null, mediaBytes: null, mediaDurationSeconds: null,
    mediaUrl: null, hidden: false, replyToId: null, replyTo: null, createdAt: '2026-11-16T15:00:00.000000Z', ...parcial,
  };
  const pagina = wireMensajesPageSchema.parse({ messages: [wire], nextCursor: null, hasMore: false });
  return mapearMensaje(pagina.messages[0] as WireMensaje, YO);
}

const enlaces = (r: ReactTestRenderer) => r.root.findAll(n => (n.type as unknown) === 'Text' && n.props.accessibilityRole === 'link');

describe('enlaces en el chat (#209)', () => {
  const abrir = jest.spyOn(Linking, 'openURL');
  beforeEach(() => {
    abrir.mockReset().mockResolvedValue(true);
  });

  it('el recordatorio de un evento trae el enlace de Meet tocable, y al tocarlo abre esa dirección', async () => {
    const r = dibujar(delServidor({ text: RECORDATORIO }));
    const [enlace] = enlaces(r);
    expect(enlace).toBeDefined();
    await act(async () => {
      enlace.props.onPress();
    });
    expect(abrir).toHaveBeenCalledWith(MEET);
  });

  it('también en un mensaje del programa (tipo SYSTEM, sin remitente)', () => {
    const r = dibujar(delServidor({ type: 'SYSTEM', senderId: null, senderName: null, text: RECORDATORIO }));
    expect(enlaces(r)).toHaveLength(1);
  });

  it('un mensaje sin enlace no cambia, y lo que no es http(s) no se vuelve tocable', () => {
    expect(enlaces(dibujar(delServidor({ text: 'Nos vemos a las 8' })))).toHaveLength(0);
    expect(enlaces(dibujar(delServidor({ text: 'Llama al tel:999888777 o escribe a javascript:alert(1)' })))).toHaveLength(0);
  });
});
