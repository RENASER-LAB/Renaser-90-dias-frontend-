/**
 * #236 (spec 042, requisito del aviso): en Android 12 o más el permiso de ubicación puede ser solo «Aproximada» (y en iPhone, «Ubicación exacta»
 * apagada). La carrera lo dice en una línea corta, con un botón que abre los ajustes de la app, y solo cuando es el caso.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { AppState, Linking, Platform, StyleSheet } from 'react-native';
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
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: jest.fn() } }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: {} } } }));
jest.mock('../../hooks/useCarreraEnVivo', () => ({
  useRelojDeLaCarrera: () => 1_800_000_000_500,
  useEstadoDelEnvio: () => null,
  useCarreraEnVivo: () => null,
  usePreferenciasDeLaCarrera: () => null,
}));
const mockPermiso = jest.fn(async () => ({ granted: true, android: { accuracy: 'coarse' } }) as unknown);
jest.mock('expo-location', () => ({ getForegroundPermissionsAsync: () => mockPermiso() }), { virtual: true });

import { Alert } from '../../../../components/Alerta';
import { ubicacionEsAproximada } from '../../servicios/ubicacionAproximada';
import { PREFERENCIAS_POR_DEFECTO } from '../../types/carrera.types';
import { crearCarrera, pausar } from '../../utils/motorDeCarrera';
import { TEXTOS_DE_LA_CARRERA } from '../../utils/textosDeLaCarrera';
import { AvisoDeUbicacionAproximada } from '../AvisoDeUbicacionAproximada';
import { PantallaCorriendo } from '../PantallaDeCarrera';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let sistema = 'android';
let r: ReactTestRenderer | null = null;
let alVolverAlFrente: ((estado: string) => void) | null = null;
const abrirAjustes = jest.spyOn(Linking, 'openSettings');

beforeEach(() => {
  sistema = 'android';
  Object.defineProperty(Platform, 'OS', { get: () => sistema, configurable: true });
  mockPermiso.mockImplementation(async () => ({ granted: true, android: { accuracy: 'coarse' } }) as unknown);
  abrirAjustes.mockReset();
  abrirAjustes.mockResolvedValue(undefined);
  (Alert.alert as jest.Mock).mockClear();
  alVolverAlFrente = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, fn: (estado: string) => void) => {
    alVolverAlFrente = fn;
    return { remove: () => undefined };
  }) as never);
});
afterEach(() => {
  act(() => r?.unmount());
  r = null;
});

async function dibujar(el: React.ReactElement): Promise<ReactTestRenderer> {
  await act(async () => {
    r = TestRenderer.create(el);
  });
  return r!;
}
const textosDe = (n: ReactTestInstance) => n.findAll(x => (x.type as unknown) === 'Text').map(x => ([] as unknown[]).concat(x.props.children).join(''));
const botonDe = (raiz: ReactTestInstance) =>
  raiz.findAll(n => n.props.accessibilityLabel === TEXTOS_DE_LA_CARRERA.abrirAjustesAccesible && typeof n.props.onPress === 'function')[0];

describe('cuándo la ubicación cuenta como aproximada', () => {
  // spec 042 FR-056
  it('Android: solo con el permiso en «coarse»; en iPhone, solo con la exactitud «reduced»', async () => {
    expect(await ubicacionEsAproximada()).toBe(true);
    mockPermiso.mockResolvedValue({ granted: true, android: { accuracy: 'fine' } });
    expect(await ubicacionEsAproximada()).toBe(false);
    sistema = 'ios';
    mockPermiso.mockResolvedValue({ granted: true, ios: { scope: 'whenInUse', accuracy: 'reduced' } });
    expect(await ubicacionEsAproximada()).toBe(true);
    mockPermiso.mockResolvedValue({ granted: true, ios: { scope: 'whenInUse', accuracy: 'full' } });
    expect(await ubicacionEsAproximada()).toBe(false);
  });

  // spec 042 FR-056
  it('sin permiso, sin poder leerlo o en la web, no avisa nada', async () => {
    mockPermiso.mockResolvedValue({ granted: false, android: { accuracy: 'none' } });
    expect(await ubicacionEsAproximada()).toBe(false);
    mockPermiso.mockRejectedValue(new Error('sin servicio'));
    expect(await ubicacionEsAproximada()).toBe(false);
    sistema = 'web';
    mockPermiso.mockClear();
    mockPermiso.mockResolvedValue({ granted: true, android: { accuracy: 'coarse' } });
    expect(await ubicacionEsAproximada()).toBe(false);
    expect(mockPermiso).not.toHaveBeenCalled();
  });
});

describe('el aviso de ubicación aproximada', () => {
  // spec 042 FR-056
  it('con el permiso aproximado: una línea corta y un botón de 48 que abre los ajustes de la app', async () => {
    const raiz = (await dibujar(React.createElement(AvisoDeUbicacionAproximada))).root;
    const textos = textosDe(raiz);
    expect(textos).toEqual([TEXTOS_DE_LA_CARRERA.ubicacionAproximada, TEXTOS_DE_LA_CARRERA.abrirAjustes]);
    const boton = botonDe(raiz);
    expect(boton.props.accessibilityRole).toBe('button');
    expect(StyleSheet.flatten(boton.props.style).minHeight).toBeGreaterThanOrEqual(48);
    await act(async () => boton.props.onPress());
    expect(abrirAjustes).toHaveBeenCalledTimes(1);
  });

  // spec 042 FR-056
  it('con la ubicación precisa no ocupa lugar', async () => {
    mockPermiso.mockResolvedValue({ granted: true, android: { accuracy: 'fine' } });
    const arbol = await dibujar(React.createElement(AvisoDeUbicacionAproximada));
    expect(arbol.toJSON()).toBeNull();
  });

  // spec 042 FR-056
  it('al volver de los ajustes con la ubicación precisa, desaparece solo', async () => {
    const arbol = await dibujar(React.createElement(AvisoDeUbicacionAproximada));
    expect(botonDe(arbol.root)).toBeDefined();
    mockPermiso.mockResolvedValue({ granted: true, android: { accuracy: 'fine' } });
    await act(async () => alVolverAlFrente!('active'));
    expect(arbol.toJSON()).toBeNull();
  });

  // spec 042 FR-056
  it('una lectura lenta y vieja del permiso no pisa a la nueva', async () => {
    let soltarVieja: (v: unknown) => void = () => undefined;
    mockPermiso.mockImplementationOnce(() => new Promise(res => (soltarVieja = res)));
    const arbol = await dibujar(React.createElement(AvisoDeUbicacionAproximada));
    // La primera lectura sigue en el aire; la persona vuelve de los ajustes y la segunda dice «precisa».
    mockPermiso.mockResolvedValue({ granted: true, android: { accuracy: 'fine' } });
    await act(async () => alVolverAlFrente!('active'));
    expect(arbol.toJSON()).toBeNull();
    await act(async () => soltarVieja({ granted: true, android: { accuracy: 'coarse' } }));
    expect(arbol.toJSON()).toBeNull();
  });

  // spec 042 FR-056
  it('si los ajustes no abren, dice dónde ir (con el camino de cada sistema)', async () => {
    abrirAjustes.mockRejectedValue(new Error('no hay'));
    const raiz = (await dibujar(React.createElement(AvisoDeUbicacionAproximada))).root;
    await act(async () => botonDe(raiz).props.onPress());
    expect(Alert.alert).toHaveBeenCalledWith(TEXTOS_DE_LA_CARRERA.sinAjustesTitulo, TEXTOS_DE_LA_CARRERA.sinAjustesAndroid);
    sistema = 'ios';
    await act(async () => botonDe(raiz).props.onPress());
    expect(Alert.alert).toHaveBeenLastCalledWith(TEXTOS_DE_LA_CARRERA.sinAjustesTitulo, TEXTOS_DE_LA_CARRERA.sinAjustesIos);
  });

  // spec 042 FR-056
  it('en iPhone con «Ubicación exacta» apagada también aparece', async () => {
    sistema = 'ios';
    mockPermiso.mockResolvedValue({ granted: true, ios: { scope: 'whenInUse', accuracy: 'reduced' } });
    const raiz = (await dibujar(React.createElement(AvisoDeUbicacionAproximada))).root;
    expect(textosDe(raiz)).toContain(TEXTOS_DE_LA_CARRERA.ubicacionAproximada);
  });
});

describe('en la pantalla de la carrera', () => {
  const T0 = 1_800_000_000_000;
  const comun = {
    prefs: PREFERENCIAS_POR_DEFECTO,
    persona: { figura: 'mujer' as const, iniciales: 'AP', fotoUrl: null },
    alPausar: () => undefined,
    alSeguir: () => undefined,
    alTerminar: () => undefined,
    alDescartar: () => undefined,
    alCambiarPrefs: () => undefined,
    panel: null,
    alCambiarPanel: () => undefined,
    bloqueada: false,
    alBloquear: () => undefined,
  };
  const corriendo = () => crearCarrera({ carreraId: 'c', cuentaId: 'cuenta', ahora: T0, pesoKg: 70, conPasos: false, pausaAutomatica: false });

  // spec 042 FR-056
  it('corriendo, el aviso se ve en la pantalla; con la ubicación precisa, no', async () => {
    const aproximada = (await dibujar(React.createElement(PantallaCorriendo, { ...comun, e: corriendo() }))).root;
    expect(textosDe(aproximada)).toContain(TEXTOS_DE_LA_CARRERA.ubicacionAproximada);
    act(() => r?.unmount());
    mockPermiso.mockResolvedValue({ granted: true, android: { accuracy: 'fine' } });
    const precisa = (await dibujar(React.createElement(PantallaCorriendo, { ...comun, e: corriendo() }))).root;
    expect(textosDe(precisa)).not.toContain(TEXTOS_DE_LA_CARRERA.ubicacionAproximada);
  });

  // spec 042 FR-056
  it('detrás de la cuenta 3, 2, 1 queda escondido como lo demás que no es el mapa, y en la pausa manual no está', async () => {
    const detras = (await dibujar(React.createElement(PantallaCorriendo, { ...comun, e: corriendo(), detrasDeLaCuenta: true }))).root;
    const fila = detras.findAll(n => n.props.testID === 'aviso-de-ubicacion-aproximada' && typeof n.type === 'string')[0];
    expect(fila).toBeDefined();
    expect(StyleSheet.flatten(fila.props.style).opacity).toBe(0);
    act(() => r?.unmount());
    const pausa = (await dibujar(React.createElement(PantallaCorriendo, { ...comun, e: pausar(corriendo(), T0) }))).root;
    expect(textosDe(pausa)).not.toContain(TEXTOS_DE_LA_CARRERA.ubicacionAproximada);
  });
});
