/**
 * Spec 042 (2026-11-05, pedido del dueño en su teléfono): el mapa aparecía recién con el primer punto del GPS (5 a 30 s) y la cámara
 * se quería «en diagonal, para que se note más el 3D». El centro de vista que lo acelera es SOLO para mirar: nunca se mide.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('expo-keep-awake', () => ({ activateKeepAwakeAsync: () => Promise.resolve(), deactivateKeepAwake: () => undefined }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: jest.fn(), logro: jest.fn(), error: jest.fn() } }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: { mapaGoogle: true } } } }));
const mockAnimar = jest.fn();
jest.mock('react-native-maps', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const MapView = R.forwardRef((props: Record<string, unknown>, ref) => {
    R.useImperativeHandle(ref, () => ({ animateCamera: (...a: unknown[]) => mockAnimar(...a) }));
    // Como el nativo: Google Maps avisa que está listo después de montarse.
    R.useEffect(() => {
      (props.onMapReady as (() => void) | undefined)?.();
    }, []);
    return R.createElement(View, { testID: 'mapa-google', ...props });
  });
  const Polyline = (props: Record<string, unknown>) => R.createElement(View, { testID: 'ruta-dorada', ...props });
  return { __esModule: true, default: MapView, Polyline, PROVIDER_GOOGLE: 'google' };
});
jest.mock('../../hooks/useCarreraEnVivo', () => ({
  useRelojDeLaCarrera: () => 1_800_000_000_500,
  useEstadoDelEnvio: () => null,
  useCarreraEnVivo: () => null,
  usePreferenciasDeLaCarrera: () => null,
}));

import { MapaDeCarrera } from '../MapaDeCarrera';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let r: ReactTestRenderer | null = null;
afterEach(() => {
  act(() => r?.unmount());
  r = null;
});

const p = (n: number, corte?: 'pausa' | 'hueco') => ({ lat: -12 + n * 0.0001, lng: -77, t: n, ...(corte ? { corte } : {}) });
const base = { rumbo: 0, duracionMs: 0, figura: 'neutral' as const, caminando: false, iniciales: 'AP', posicion: { lat: -12, lng: -77 } };
function dibujar(ruta: ReturnType<typeof p>[]): ReactTestInstance {
  act(() => {
    r = TestRenderer.create(React.createElement(MapaDeCarrera, { ...base, ruta }));
  });
  return r!.root;
}
const doradas = (raiz: ReactTestInstance) => raiz.findAll(n => n.props.testID === 'ruta-dorada' && typeof n.type === 'string');
const huecos = (raiz: ReactTestInstance) => raiz.findAll(n => n.props.testID === 'ruta-hueco' && typeof n.type === 'string');

describe('el mapa no une con una recta lo que está cortado', () => {
  // spec 042 FR-037
  it('sin cortes (estado viejo) es una sola línea dorada', () => {
    const raiz = dibujar([p(1), p(2), p(3), p(4)]);
    expect(doradas(raiz)).toHaveLength(1);
    expect(huecos(raiz)).toHaveLength(0);
  });

  // spec 042 FR-037
  it("un corte 'pausa' deja dos líneas doradas separadas y ningún conector", () => {
    const raiz = dibujar([p(1), p(2), p(3, 'pausa'), p(4)]);
    const lineas = doradas(raiz);
    expect(lineas).toHaveLength(2);
    expect(lineas[0].props.coordinates).toHaveLength(2);
    expect(lineas[1].props.coordinates).toHaveLength(2);
    expect(lineas.every(l => l.props.strokeColor === '#B2924F' && l.props.strokeWidth === 6)).toBe(true);
    expect(huecos(raiz)).toHaveLength(0);
  });

  // spec 042 FR-037
  it("un corte 'hueco' deja dos líneas y un conector punteado y tenue", () => {
    const raiz = dibujar([p(1), p(2), p(3, 'hueco'), p(4)]);
    expect(doradas(raiz)).toHaveLength(2);
    const conectores = huecos(raiz);
    expect(conectores).toHaveLength(1);
    expect(conectores[0].props.lineDashPattern).toEqual([6, 8]);
    expect(conectores[0].props.strokeWidth).toBe(3);
    expect(conectores[0].props.coordinates).toHaveLength(2);
  });
});
