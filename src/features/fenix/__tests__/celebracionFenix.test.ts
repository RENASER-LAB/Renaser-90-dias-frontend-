/**
 * La celebración corta: dispara `trgCelebrateShort`, termina con el evento del `.riv`, se salta tocándola y con
 * «reducir movimiento» no salta (queda quieta un momento y se va).
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act } from 'react-test-renderer';

import { Presionable } from '../../../components/Presionable';
import { CelebracionFenix, QUIETO_MS } from '../components/CelebracionFenix';
import { crear, desmontarTodo, disparos, emitir, ultimaVistaRive, vistasRive } from './ayudasDePrueba';

const mockSesion = { reducido: false };
jest.mock('../../../theme/ThemeContext', () => ({ useTheme: () => ({ mode: 'dark' }) }));
jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  useReducedMotion: () => mockSesion.reducido,
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function montar(onTerminar: () => void) {
  const raiz = crear(
      React.createElement(CelebracionFenix, { hito: 'todosLosHabitos', animo: 'alegre', onTerminar }),
    );
  return raiz;
}

afterEach(() => {
  desmontarTodo();
  mockSesion.reducido = false;
  jest.useRealTimers();
});

describe('CelebracionFenix', () => {
  it('salta con trgCelebrateShort y termina cuando el .riv avisa', async () => {
    const onTerminar = jest.fn();
    const raiz = montar(onTerminar);
    const rive = ultimaVistaRive();
    act(() => emitir(vistasRive(raiz)[0], 'PHOENIX_READY'));
    expect(disparos(rive)).toContain('trgCelebrateShort');
    expect(onTerminar).not.toHaveBeenCalled();
    await act(async () => emitir(vistasRive(raiz)[0], 'PHOENIX_ACTION_COMPLETE'));
    expect(onTerminar).toHaveBeenCalledTimes(1);
    act(() => raiz.unmount());
  });

  it('tocar el fénix la salta', () => {
    const onTerminar = jest.fn();
    const raiz = montar(onTerminar);
    act(() => raiz.root.findAll(n => n.type === Presionable)[0].props.onPress());
    expect(onTerminar).toHaveBeenCalledTimes(1);
    act(() => raiz.unmount());
  });

  it('con «reducir movimiento» no salta: queda quieto un momento y se va', () => {
    jest.useFakeTimers();
    mockSesion.reducido = true;
    const onTerminar = jest.fn();
    const raiz = montar(onTerminar);
    const rive = ultimaVistaRive();
    act(() => emitir(vistasRive(raiz)[0], 'PHOENIX_READY'));
    expect(disparos(rive)).not.toContain('trgCelebrateShort');
    act(() => jest.advanceTimersByTime(QUIETO_MS));
    expect(onTerminar).toHaveBeenCalledTimes(1);
    act(() => raiz.unmount());
  });

  it('la capa no se come los toques de la pantalla', () => {
    const raiz = montar(jest.fn());
    expect(raiz.root.findAll(n => n.props.testID === 'celebracion-fenix')[0].props.pointerEvents).toBe('box-none');
    act(() => raiz.unmount());
  });
});
