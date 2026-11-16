/**
 * #220 (2026-11-16, primer build de iOS): la carrera pedía Google Maps en iPhone con la marca de la clave de ANDROID
 * (`extra.mapaGoogle`). Sin `iosGoogleMapsApiKey`, el plugin de react-native-maps no instala Google Maps en iOS, así que
 * el mapa salía roto en vez del fondo neutro. Ahora cada plataforma mira su propia clave: Android `mapaGoogle`
 * (`GOOGLE_MAPS_ANDROID_KEY`), iOS `mapaGoogleIos` (`GOOGLE_MAPS_IOS_KEY`).
 *
 * Contra el código anterior falla la primera: en iOS devolvía el módulo con solo la clave de Android.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';

let mockExtra: Record<string, unknown> = {};
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return { extra: mockExtra };
    },
  },
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('expo-keep-awake', () => ({ activateKeepAwakeAsync: () => Promise.resolve(), deactivateKeepAwake: () => undefined }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-maps', () => ({ __esModule: true, default: () => null, PROVIDER_GOOGLE: 'google' }));

import { cargarMapas } from '../MapaDeCarrera';

const original = Platform.OS;
function en(os: 'ios' | 'android') {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

describe('el mapa de la carrera por plataforma (#220)', () => {
  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original });
  });

  it('en iPhone, sin su clave de iOS, no pide Google Maps aunque Android tenga la suya (fondo neutro)', () => {
    en('ios');
    mockExtra = { mapaGoogle: true, mapaGoogleIos: false };
    expect(cargarMapas()).toBeNull();
  });

  it('en iPhone, con su clave de iOS, usa Google Maps', () => {
    en('ios');
    mockExtra = { mapaGoogle: false, mapaGoogleIos: true };
    expect(cargarMapas()).not.toBeNull();
  });

  it('en Android sigue mirando solo la clave de Android', () => {
    en('android');
    mockExtra = { mapaGoogle: true, mapaGoogleIos: false };
    expect(cargarMapas()).not.toBeNull();
    mockExtra = { mapaGoogle: false, mapaGoogleIos: true };
    expect(cargarMapas()).toBeNull();
  });
});
