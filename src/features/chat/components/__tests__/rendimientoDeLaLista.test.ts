/**
 * El chat abría lento en teléfonos de gama baja (issue #190). La causa no era el servidor (la página de mensajes usa su
 * índice y firma en lote): era que cada cambio mínimo —tocar una nota de voz, resaltar un renglón— re-dibujaba TODAS las
 * burbujas, que cada burbuja montaba un valor animado de Reanimated solo para un tinte casi siempre apagado, y que la
 * lista montaba casi todas sus filas en el primer pase.
 *
 * Cómo se arregla: `BurbujaDeMensaje` es `React.memo` y la pantalla le pasa funciones estables (el id viaja por argumento);
 * el tinte solo existe mientras el renglón está resaltado; y la lista monta lo que se ve y el resto por tandas
 * (`utils/ventanaDelChat.ts`).
 */
import { describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockContador = { temas: 0, valoresAnimados: 0 };

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    // Una llamada a `useTheme` = un render de la burbuja: es lo que se cuenta.
    useTheme: () => {
      mockContador.temas += 1;
      return { mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined };
    },
  };
});
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doble: any = jest.requireActual('react-native-reanimated/mock');
  const { useRef } = jest.requireActual<typeof import('react')>('react');
  return {
    ...doble,
    useReducedMotion: () => false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useSharedValue: (inicial: any) => {
      mockContador.valoresAnimados += 1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ref = useRef<any>(null);
      if (ref.current === null) ref.current = doble.useSharedValue(inicial);
      return ref.current;
    },
  };
});
jest.mock('../BurbujaAudioChat', () => ({ BurbujaAudioChat: () => null }));
jest.mock('../../../../services/http/apiClient', () => ({
  ...jest.requireActual<object>('../../../../services/http/apiClient'),
  getTokenSesion: () => 'sesion-de-prueba',
}));

import type { ChatMessage } from '../../../../screens/ComunidadScreen';
import { light } from '../../../../theme/tokens';
import { BurbujaDeMensaje } from '../BurbujaDeMensaje';
import { coloresDelChat } from '../coloresDelChat';
import { VENTANA_DEL_CHAT } from '../../utils/ventanaDelChat';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const COLORES = coloresDelChat(light, false);
const PAGINA = 30; // el tamaño de la primera página de `GET .../messages`

const mensajes: ChatMessage[] = Array.from({ length: PAGINA }, (_, i) => ({
  id: `m-${i}`,
  sender: i % 2 ? 'Ana' : 'Tú',
  senderId: i % 2 ? 'u-ana' : 'u-yo',
  avatar: '',
  isMe: i % 2 === 0,
  time: '21:04',
  type: 'text',
  text: `Mensaje ${i}`,
}));

/** La lista tal como la arma la pantalla: el estado del audio y del resaltado viven arriba, las filas las dibuja `renderItem`. */
function Lista({ audioActivo, resaltadoId }: { audioActivo: string | null; resaltadoId: string | null }) {
  const [, setAudio] = React.useState<string | null>(null);
  const alActivarAudio = React.useCallback((id: string) => setAudio(id), []);
  const onAbrirFoto = React.useCallback(() => undefined, []);
  const onMantener = React.useCallback(() => undefined, []);
  const onTocarCita = React.useCallback(() => undefined, []);
  return React.createElement(
    React.Fragment,
    null,
    mensajes.map(m =>
      React.createElement(BurbujaDeMensaje, {
        key: m.id,
        mensaje: m,
        enGrupo: true,
        primeroDeLaTanda: true,
        ultimoDeLaTanda: true,
        colores: COLORES,
        audioActivo: audioActivo === m.id,
        alActivarAudio,
        onAbrirFoto,
        onMantener,
        onTocarCita,
        resaltado: resaltadoId === m.id,
      })
    )
  );
}

describe('Rendimiento del chat (issue #190)', () => {
  it('abrir la primera página no monta un valor animado por burbuja', () => {
    mockContador.valoresAnimados = 0;
    act(() => {
      TestRenderer.create(React.createElement(Lista, { audioActivo: null, resaltadoId: null }));
    });
    // Antes: 30 (uno por burbuja, solo para un tinte apagado).
    expect(mockContador.valoresAnimados).toBe(0);
  });

  it('resaltar un renglón o activar un audio re-dibuja solo las burbujas afectadas', () => {
    let raiz!: ReactTestRenderer;
    act(() => {
      raiz = TestRenderer.create(React.createElement(Lista, { audioActivo: null, resaltadoId: null }));
    });
    mockContador.temas = 0;
    act(() => raiz.update(React.createElement(Lista, { audioActivo: null, resaltadoId: 'm-3' })));
    // Antes: 30 renders (todas). Ahora: la que se resalta.
    expect(mockContador.temas).toBeLessThanOrEqual(2);

    mockContador.temas = 0;
    act(() => raiz.update(React.createElement(Lista, { audioActivo: 'm-5', resaltadoId: 'm-3' })));
    expect(mockContador.temas).toBeLessThanOrEqual(2);
  });

  it('el tinte sigue apareciendo en el renglón resaltado', () => {
    let raiz!: ReactTestRenderer;
    act(() => {
      raiz = TestRenderer.create(React.createElement(Lista, { audioActivo: null, resaltadoId: null }));
    });
    mockContador.valoresAnimados = 0;
    act(() => raiz.update(React.createElement(Lista, { audioActivo: null, resaltadoId: 'm-3' })));
    expect(mockContador.valoresAnimados).toBeGreaterThan(0);
  });

  it('la ventana de la lista monta lo que se ve y el resto por tandas', () => {
    expect(VENTANA_DEL_CHAT.initialNumToRender).toBeLessThanOrEqual(12);
    expect(VENTANA_DEL_CHAT.maxToRenderPerBatch).toBeLessThanOrEqual(10);
    expect(VENTANA_DEL_CHAT.windowSize).toBeLessThanOrEqual(11);
  });

  it('la pantalla usa esa ventana y no le pasa a la burbuja una función nueva en cada fila', () => {
    const fuente = fs.readFileSync(path.join(__dirname, '../../../../screens/ComunidadScreen.tsx'), 'utf8');
    expect(fuente).toContain('{...VENTANA_DEL_CHAT}');
    expect(fuente).not.toMatch(/alActivarAudio=\{\s*\(\)\s*=>/);
  });
});
