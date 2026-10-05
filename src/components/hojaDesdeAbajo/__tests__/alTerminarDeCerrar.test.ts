import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Platform, Text } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * La hoja avisa cuando ya se fue del todo (e2e en el emulador Android, 2026-10-05).
 *
 * Lo que se rompió: «Responder» en el menú de un mensaje del chat enfocaba el campo a los 250 ms con
 * un `setTimeout`. En Android la hoja todavía estaba en pantalla (200 ms de bajada y después se
 * desmonta su `Modal`, que es otra ventana): el campo quedaba con el cursor y el teclado cerrado.
 * Ahora la hoja avisa con `alTerminarDeCerrar` cuando su `Modal` ya no está y, en Android, cuando
 * la ventana de abajo tuvo tiempo de recuperar el foco.
 *
 * Contra el código de antes fallan: la hoja no tenía ese aviso y nunca lo llamaba.
 */

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'dark', c: tokens.dark, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import { ESPERA_VENTANA_ANDROID_MS, HojaDesdeAbajo } from '../HojaDesdeAbajo';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function hoja(visible: boolean, alTerminarDeCerrar: () => void) {
  return React.createElement(HojaDesdeAbajo, {
    visible,
    alCerrar: () => undefined,
    alTerminarDeCerrar,
    titulo: 'Tu mensaje',
    children: React.createElement(Text, null, 'Responder'),
  });
}

/**
 * Abre la hoja y la cierra. En las pruebas la bajada termina al instante y el desmontaje llega por
 * `scheduleOnRN`, que el doble de Worklets manda a la cola de microtareas: se la deja correr.
 */
async function abrirYCerrar(alTerminarDeCerrar: () => void) {
  act(() => {
    raiz = TestRenderer.create(hoja(true, alTerminarDeCerrar));
  });
  expect(alTerminarDeCerrar).not.toHaveBeenCalled();
  expect(hayModal()).toBe(true);
  act(() => raiz!.update(hoja(false, alTerminarDeCerrar)));
  await act(async () => {
    await Promise.resolve();
  });
}

/** Si la hoja sigue montada: su `Modal` está en el árbol. */
function hayModal(): boolean {
  return raiz!.root.findAll(n => (n.type as unknown) === 'Modal' || (n.type as { name?: string }).name === 'Modal').length > 0;
}

/** Relojes falsos, pero sin tocar las microtareas (por donde llega el desmontaje). */
function relojesFalsos() {
  jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
}

describe('HojaDesdeAbajo: el aviso de que ya se fue', () => {
  it('avisa una sola vez, después de cerrarse (iOS y web: en cuanto se desmonta)', async () => {
    const alTerminarDeCerrar = jest.fn();
    await abrirYCerrar(alTerminarDeCerrar);
    expect(alTerminarDeCerrar).toHaveBeenCalledTimes(1);
    expect(hayModal()).toBe(false);
  });

  it('en Android espera a que la ventana de abajo recupere el foco', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    relojesFalsos();
    const alTerminarDeCerrar = jest.fn();
    await abrirYCerrar(alTerminarDeCerrar);
    expect(hayModal()).toBe(false);
    expect(alTerminarDeCerrar).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(ESPERA_VENTANA_ANDROID_MS));
    expect(alTerminarDeCerrar).toHaveBeenCalledTimes(1);
  });

  it('si se vuelve a abrir antes de que pase la espera, no avisa', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    relojesFalsos();
    const alTerminarDeCerrar = jest.fn();
    await abrirYCerrar(alTerminarDeCerrar);
    expect(hayModal()).toBe(false);
    act(() => raiz!.update(hoja(true, alTerminarDeCerrar)));
    act(() => jest.advanceTimersByTime(ESPERA_VENTANA_ANDROID_MS * 2));
    expect(alTerminarDeCerrar).not.toHaveBeenCalled();
  });
});
