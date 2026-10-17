import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { Platform } from 'react-native';
import { useActualizacionDelDia } from '../useActualizacionDelDia';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const mockActualizar = jest.fn<(invalidar?: boolean) => Promise<void>>().mockResolvedValue(undefined);
let raiz: ReactTestRenderer | null = null;
const ventana = new EventTarget();
const documento = Object.assign(new EventTarget(), { visibilityState: 'visible' });
const windowOriginal = Object.getOwnPropertyDescriptor(globalThis, 'window');
const documentOriginal = Object.getOwnPropertyDescriptor(globalThis, 'document');
function Sonda() {
  useActualizacionDelDia({ activa: true, contexto: null, actualizar: mockActualizar });
  return null;
}
beforeEach(() => {
  jest.useFakeTimers(); mockActualizar.mockClear(); documento.visibilityState = 'visible';
  jest.replaceProperty(Platform, 'OS', 'web');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: ventana });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: documento });
});
afterEach(() => {
  act(() => raiz?.unmount()); raiz = null; jest.restoreAllMocks(); jest.useRealTimers();
  if (windowOriginal) Object.defineProperty(globalThis, 'window', windowOriginal);
  else Reflect.deleteProperty(globalThis, 'window');
  if (documentOriginal) Object.defineProperty(globalThis, 'document', documentOriginal);
  else Reflect.deleteProperty(globalThis, 'document');
});

describe('Training vuelve de una pestaña suspendida', () => {
  it('revalida al volver a visible y al recuperar foco; una pestaña oculta no consulta cada minuto', async () => {
    await act(async () => { raiz = TestRenderer.create(React.createElement(Sonda)); });
    expect(mockActualizar).toHaveBeenCalledTimes(1);
    documento.visibilityState = 'hidden';
    await act(async () => {
      documento.dispatchEvent(new Event('visibilitychange'));
      jest.advanceTimersByTime(60_000);
    });
    expect(mockActualizar).toHaveBeenCalledTimes(1);
    documento.visibilityState = 'visible';
    await act(async () => { documento.dispatchEvent(new Event('visibilitychange')); });
    expect(mockActualizar).toHaveBeenLastCalledWith(true);
    expect(mockActualizar).toHaveBeenCalledTimes(2);
    await act(async () => { ventana.dispatchEvent(new Event('focus')); });
    expect(mockActualizar).toHaveBeenCalledTimes(3);
  });
  it('desmontar elimina oyentes y temporizadores', async () => {
    await act(async () => { raiz = TestRenderer.create(React.createElement(Sonda)); });
    act(() => raiz!.unmount()); raiz = null;
    await act(async () => {
      ventana.dispatchEvent(new Event('focus'));
      documento.dispatchEvent(new Event('visibilitychange'));
      jest.advanceTimersByTime(120_000);
    });
    expect(mockActualizar).toHaveBeenCalledTimes(1);
  });
});
