/**
 * Spec 056 FR-019 y SC-005: el mensaje de «Avisar a su mentor» termina con `Ficha de <nombre>: /mentor/groups/<grupo>/learners/<persona>`. En el chat del
 * mentor eso se veía como una ruta cruda. Ahora se ve «Abrir la ficha de <nombre>», un toque de 48 de alto que abre la ficha de ese aprendiz con la misma
 * navegación de los avisos de acompañamiento (`anotarRutaDeAviso`). Solo en esa forma exacta y solo para quien recibe el mensaje.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { light } from '../../../../theme/tokens';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../BurbujaAudioChat', () => ({ BurbujaAudioChat: () => null }));
const mockAnotar = jest.fn<(ruta: unknown) => boolean>();
jest.mock('../../../mentor/notificaciones/rutaDeAviso', () => ({ anotarRutaDeAviso: (ruta: unknown) => mockAnotar(ruta) }));

import type { ChatMessage } from '../../../../screens/ComunidadScreen';
import { mapearMensaje } from '../../api/chatMappers';
import { wireMensajesPageSchema } from '../../api/chatSchemas';
import type { WireMensaje } from '../../types/chat.types';
import { BurbujaDeMensaje } from '../BurbujaDeMensaje';
import { coloresDelChat } from '../coloresDelChat';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const COLORES = coloresDelChat(light, false);
const MENTOR = 'u-mentor';
const LIDER = 'u-lider';
const G = '3f2b8c1e-0a4d-4e7b-9c55-1a2b3c4d5e6f';
const P = '9d8c7b6a-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const RUTA = `/mentor/groups/${G}/learners/${P}`;
const AVISO = `Ana López necesita tu apoyo esta semana. ¿Le escribes hoy?\n\nFicha de Ana López: ${RUTA}`;

function dibujar(mensaje: ChatMessage): ReactTestRenderer {
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(BurbujaDeMensaje, {
        mensaje,
        enGrupo: false,
        primeroDeLaTanda: true,
        ultimoDeLaTanda: true,
        colores: COLORES,
        audioActivo: false,
        alActivarAudio: () => undefined,
        onAbrirFoto: () => undefined,
      }),
    );
  });
  return raiz;
}

/** El mensaje como lo ve `yo`: el del líder es suyo si el que mira es el líder, y de otro si el que mira es el mentor. */
function mensajeDe(texto: string, yo: string): ChatMessage {
  const wire = {
    id: 'm-1', conversationId: 'c-1', senderId: LIDER, senderName: 'Rocío Líder', senderAvatarUrl: null, type: 'TEXT', text: texto,
    mediaBucket: null, mediaPath: null, mediaMime: null, mediaBytes: null, mediaDurationSeconds: null, mediaUrl: null, hidden: false,
    replyToId: null, replyTo: null, createdAt: '2026-11-18T15:00:00.000000Z',
  };
  const pagina = wireMensajesPageSchema.parse({ messages: [wire], nextCursor: null, hasMore: false });
  return mapearMensaje(pagina.messages[0] as WireMensaje, yo);
}

const textos = (r: ReactTestRenderer) =>
  r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');

const enlaceDeLaFicha = (r: ReactTestRenderer): ReactTestInstance | undefined =>
  r.root.findAll(n => typeof n.props.onPress === 'function' && typeof n.props.accessibilityLabel === 'string' && (n.props.accessibilityLabel as string).startsWith('Abrir la ficha de'))[0];

beforeEach(() => {
  mockAnotar.mockReset().mockReturnValue(true);
});

describe('«Avisar a su mentor» en el chat del mentor (FR-019)', () => {
  it('muestra el texto del líder y un enlace «Abrir la ficha de Ana López» en lugar de la ruta cruda', () => { // spec 056 FR-019
    const r = dibujar(mensajeDe(AVISO, MENTOR));
    const todo = textos(r);
    expect(todo).toContain('Ana López necesita tu apoyo esta semana. ¿Le escribes hoy?');
    expect(todo).toContain('Abrir la ficha de Ana López');
    expect(todo).not.toContain('/mentor/groups');
    expect(todo).not.toContain(G);
    expect(todo).not.toContain('Ficha de Ana López:');
    expect(enlaceDeLaFicha(r)?.props.accessibilityLabel).toBe('Abrir la ficha de Ana López');
  });

  it('tocarlo abre la ficha de ese aprendiz con la misma navegación de los avisos de acompañamiento', async () => { // spec 056 FR-019
    const r = dibujar(mensajeDe(AVISO, MENTOR));
    await act(async () => {
      enlaceDeLaFicha(r)!.props.onPress();
    });
    expect(mockAnotar).toHaveBeenCalledTimes(1);
    expect(mockAnotar).toHaveBeenCalledWith(RUTA);
  });

  it('el enlace es un toque de 48 de alto como mínimo y lo lee el lector de pantalla como botón de navegación', () => { // spec 056 FR-044
    const r = dibujar(mensajeDe(AVISO, MENTOR));
    const enlace = enlaceDeLaFicha(r)!;
    const estilos = [enlace, ...enlace.findAll(() => true)].map(n => StyleSheet.flatten(n.props.style) as { minHeight?: number; height?: number } | undefined);
    expect(Math.max(0, ...estilos.map(e => Math.max(Number(e?.minHeight ?? 0), Number(e?.height ?? 0))))).toBeGreaterThanOrEqual(48);
    expect(['link', 'button']).toContain(enlace.props.accessibilityRole);
  });

  it('un mensaje que es solo la línea también se ve como enlace', () => { // spec 056 FR-019
    const r = dibujar(mensajeDe(`Ficha de Ana López: ${RUTA}`, MENTOR));
    expect(textos(r)).toContain('Abrir la ficha de Ana López');
    expect(enlaceDeLaFicha(r)).toBeDefined();
  });

  it('el líder, que lo escribió, no ve la ruta ni un enlace que a él no le abre nada: ve «Ficha de Ana López»', () => { // spec 056 FR-019
    const r = dibujar(mensajeDe(AVISO, LIDER));
    expect(textos(r)).toContain('Ficha de Ana López');
    expect(textos(r)).not.toContain('/mentor/groups');
    expect(enlaceDeLaFicha(r)).toBeUndefined();
  });

  it('solo en esa forma exacta: otra ruta, ids que no son de verdad o la línea en medio del texto se quedan como texto, sin enlace', () => { // spec 056 FR-019
    for (const texto of [
      'Ficha de Ana López: /mentor/groups/g-1/learners/p-1',
      `Ficha de Ana López: /admin/groups/${G}/learners/${P}`,
      `Mira ${RUTA} cuando puedas`,
      `Ficha de Ana López: ${RUTA}\nGracias por tu apoyo`,
    ]) {
      const r = dibujar(mensajeDe(texto, MENTOR));
      expect(enlaceDeLaFicha(r)).toBeUndefined();
      expect(textos(r)).not.toContain('Abrir la ficha de');
    }
  });

  it('un mensaje de siempre no cambia: ni enlace ni nada de más', () => { // spec 056 FR-019
    const r = dibujar(mensajeDe('Nos vemos a las 8', MENTOR));
    expect(textos(r)).toContain('Nos vemos a las 8');
    expect(enlaceDeLaFicha(r)).toBeUndefined();
  });
});
