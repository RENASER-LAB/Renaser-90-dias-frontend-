import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';

/**
 * El háptico de la app (`tacto`, 2026-10-05). Lo que no se puede romper:
 *
 * - **Un APK sin el módulo nativo no revienta.** `expo-haptics` entró con este cambio y el APK que
 *   ya está instalado no lo trae: cada llamada rechaza la promesa. `tacto` se lo traga.
 * - **En Android va por `performAndroidHapticsAsync`** (respeta «Respuesta táctil» del sistema) y,
 *   si la constante no existe en esa versión de Android, cae a una que existe desde siempre.
 */

const mockAndroid = jest.fn<(tipo: string) => Promise<void>>();
const mockSeleccion = jest.fn<() => Promise<void>>();
const mockNotificacion = jest.fn<(tipo: string) => Promise<void>>();

jest.mock('expo-haptics', () => ({
  performAndroidHapticsAsync: (tipo: string) => mockAndroid(tipo),
  selectionAsync: () => mockSeleccion(),
  notificationAsync: (tipo: string) => mockNotificacion(tipo),
  AndroidHaptics: {
    Segment_Tick: 'segment-tick',
    Clock_Tick: 'clock-tick',
    Reject: 'reject',
    Long_Press: 'long-press',
    Confirm: 'confirm',
    Virtual_Key: 'virtual-key',
  },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

import { tacto } from '../tacto';

const plataformaOriginal = Platform.OS;
function enPlataforma(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

/** Deja correr las promesas encadenadas (el respaldo se pide en el `catch` de la primera). */
const vaciarPromesas = () => new Promise(resolver => setImmediate(resolver));

afterEach(() => {
  enPlataforma(plataformaOriginal);
  mockAndroid.mockReset();
  mockSeleccion.mockReset();
  mockNotificacion.mockReset();
});

describe('tacto', () => {
  it('Android: si la constante nueva no existe en ese teléfono, usa la de siempre', async () => {
    enPlataforma('android');
    mockAndroid.mockImplementation(async tipo => {
      if (tipo === 'segment-tick') throw new Error('HapticsNotSupportedException');
    });
    tacto.seleccion();
    await vaciarPromesas();
    expect(mockAndroid.mock.calls.map(([tipo]) => tipo)).toEqual(['segment-tick', 'clock-tick']);
  });

  it('sin el módulo nativo (APK viejo) no rompe nada', async () => {
    enPlataforma('android');
    mockAndroid.mockRejectedValue(new TypeError("Cannot read properties of null (reading 'performHapticsAsync')"));
    expect(() => {
      tacto.seleccion();
      tacto.error();
      tacto.logro();
    }).not.toThrow();
    await vaciarPromesas();

    enPlataforma('ios');
    mockSeleccion.mockRejectedValue(new Error('UnavailabilityError'));
    mockNotificacion.mockRejectedValue(new Error('UnavailabilityError'));
    expect(() => {
      tacto.seleccion();
      tacto.logro();
    }).not.toThrow();
    await vaciarPromesas();
  });

  it('en la web no hace nada', () => {
    enPlataforma('web');
    tacto.seleccion();
    tacto.error();
    tacto.logro();
    expect(mockAndroid).not.toHaveBeenCalled();
    expect(mockSeleccion).not.toHaveBeenCalled();
    expect(mockNotificacion).not.toHaveBeenCalled();
  });
});
