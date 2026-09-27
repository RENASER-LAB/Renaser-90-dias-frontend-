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

import type { ChatConversation, ChatMessage } from '../../../../screens/ComunidadScreen';
import { BurbujaDeMensaje, huecoParaLaHora } from '../BurbujaDeMensaje';
import { CabeceraDeChat } from '../CabeceraDeChat';
import { coloresDelChat } from '../coloresDelChat';
import { FilaDeConversacion } from '../FilaDeConversacion';

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
    const todo = textos(
      dibujar(
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
      )
    );
    expect(todo).not.toContain('Ana López');
    expect(todo).toContain('21:04 ✓');
    expect(todo).not.toContain('✓✓');
  });

  it('una foto se dibuja dentro de la burbuja y se abre al tocarla', () => {
    const abrir = jest.fn();
    const raiz = dibujar(
      React.createElement(BurbujaDeMensaje, {
        mensaje: { ...base, type: 'image_grid', text: undefined, mediaUrl: 'https://s3/foto.jpg' },
        enGrupo: false,
        primeroDeLaTanda: true,
        ultimoDeLaTanda: true,
        colores: COLORES,
        audioActivo: false,
        alActivarAudio: () => undefined,
        onAbrirFoto: abrir,
      })
    );
    const imagen = raiz.root.findAll(n => (n.type as unknown) === 'Image');
    expect(imagen[0]?.props.source).toEqual({ uri: 'https://s3/foto.jpg' });
    const tocable = raiz.root.findAll(n => n.props.accessibilityLabel === 'Ver la foto en grande' && !!n.props.onPress);
    act(() => tocable[0].props.onPress());
    expect(abrir).toHaveBeenCalledWith('https://s3/foto.jpg');
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
});

describe('huecoParaLaHora', () => {
  it('reserva el lugar con espacios que no dibujan nada (en Android la hora anidada se veía dos veces)', () => {
    const hueco = huecoParaLaHora('09:56 ✓');
    expect(hueco).toMatch(/^ +$/);
    expect(hueco).not.toContain('09:56');
    expect(hueco.length).toBeGreaterThanOrEqual(15);
  });
});
