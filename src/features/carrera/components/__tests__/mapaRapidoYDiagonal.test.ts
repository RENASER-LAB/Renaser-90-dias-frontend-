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

import { PREFERENCIAS_POR_DEFECTO } from '../../types/carrera.types';
import { crearCarrera, pausar } from '../../utils/motorDeCarrera';
import { TEXTOS_DE_LA_CARRERA } from '../../utils/textosDeLaCarrera';
import { olvidarCentroDelMapa, ponerCentroDelMapa } from '../../servicios/centroDelMapa';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tacto } from '../../../../utils/tacto';
import { olvidarVistasEnMemoriaParaPruebas, PREFIJO_VISTA_DEL_MAPA } from '../../servicios/vistaDelMapa';
import { bajadaDelAvatar, CAMARA, camaraDelMapa, DURACION_CAMBIO_DE_VISTA_MS, MapaDeCarrera, rellenoDeArriba } from '../MapaDeCarrera';
import { PantallaCorriendo } from '../PantallaDeCarrera';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LIMA = { lat: -12.1219, lng: -77.0312 };
const T0 = 1_800_000_000_000;
let r: ReactTestRenderer | null = null;
afterEach(() => {
  act(() => r?.unmount());
  r = null;
  mockAnimar.mockClear();
  olvidarCentroDelMapa();
});

function dibujar(el: React.ReactElement): ReactTestRenderer {
  act(() => {
    r = TestRenderer.create(el);
  });
  return r!;
}
const mapaDe = (raiz: ReactTestInstance) => raiz.findAll(n => n.props.testID === 'mapa-google' && typeof n.type !== 'string')[0];
const base = { ruta: [], rumbo: 45, duracionMs: 0, figura: 'neutral' as const, caminando: false, iniciales: 'AP' };

describe('el mapa aparece sin esperar el primer punto del GPS', () => {
  // spec 042 FR-037
  it('sin `posicion` pero con el centro de vista, Google Maps se monta ahí', () => {
    const raiz = dibujar(React.createElement(MapaDeCarrera, { ...base, posicion: null, centroDeVista: LIMA })).root;
    const mapa = mapaDe(raiz);
    expect(mapa).toBeDefined();
    expect(mapa.props.initialCamera.center).toEqual({ latitude: LIMA.lat, longitude: LIMA.lng });
  });

  // spec 042 FR-037
  it('sin nada conocido no muestra el mar en 0,0: queda el fondo neutro', () => {
    ponerCentroDelMapa({ lat: 0, lng: 0 }, 'ultima-conocida');
    const raiz = dibujar(React.createElement(MapaDeCarrera, { ...base, posicion: null, centroDeVista: null })).root;
    expect(raiz.findAll(n => n.props.testID === 'mapa-google')).toHaveLength(0);
  });

  // spec 042 FR-037
  it('cuando llega el primer punto real, la cámara viaja hasta él', () => {
    const real = { lat: LIMA.lat + 0.001, lng: LIMA.lng };
    dibujar(React.createElement(MapaDeCarrera, { ...base, posicion: null, centroDeVista: LIMA }));
    mockAnimar.mockClear();
    act(() => r!.update(React.createElement(MapaDeCarrera, { ...base, posicion: real, centroDeVista: LIMA })));
    const [camara, opciones] = mockAnimar.mock.calls[mockAnimar.mock.calls.length - 1] as [{ center: unknown }, { duration: number }];
    expect(camara.center).toEqual({ latitude: real.lat, longitude: real.lng });
    expect(opciones.duration).toBeGreaterThan(1);
  });

  // spec 042 FR-037, FR-003
  it('detrás de la cuenta 3, 2, 1 (carrera todavía en pausa) ya está el mapa, no el menú de la pausa', () => {
    ponerCentroDelMapa(LIMA, 'ultima-conocida');
    const e = pausar(crearCarrera({ carreraId: 'c', cuentaId: 'cuenta', ahora: T0, pesoKg: 70, conPasos: true, pausaAutomatica: false }), T0);
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
    const raiz = dibujar(React.createElement(PantallaCorriendo, { ...comun, e, detrasDeLaCuenta: true })).root;
    expect(mapaDe(raiz)).toBeDefined();
    const textos = raiz.findAll(n => (n.type as unknown) === 'Text').map(n => ([] as unknown[]).concat(n.props.children).join(''));
    expect(textos).not.toContain(TEXTOS_DE_LA_CARRERA.guardada);
    // Y el centro de vista no se dibuja como ruta.
    expect(raiz.findAll(n => n.props.testID === 'ruta-dorada')).toHaveLength(0);
  });
});

describe('la cámara en diagonal, estilo navegación', () => {
  // spec 042 FR-037
  it('inclinación 67,5°, acercamiento 18,5 y el avatar en el tercio de abajo', () => {
    const raiz = dibujar(React.createElement(MapaDeCarrera, { ...base, posicion: LIMA })).root;
    const contenedor = raiz.findAll(n => typeof n.props.onLayout === 'function' && typeof n.type !== 'string')[0];
    act(() => contenedor.props.onLayout({ nativeEvent: { layout: { width: 400, height: 800 } } }));
    const mapa = mapaDe(raiz);
    expect(mapa.props.initialCamera.pitch).toBe(67.5);
    expect(mapa.props.initialCamera.zoom).toBe(18.5);
    expect(mapa.props.showsBuildings).toBe(true);
    const relleno = rellenoDeArriba(800, CAMARA.navegacion.avatarAlto);
    expect(relleno).toBe(288);
    expect(mapa.props.mapPadding.top).toBe(relleno);
    // El centro de la cámara cae en P + (alto − P) / 2 = 544, el 68 % del alto: ahí va el avatar.
    expect(relleno + (800 - relleno) / 2).toBeCloseTo(800 * 0.68, 0);
    const capa = raiz.findAll(n => typeof n.type === 'string' && n.props.pointerEvents === 'none')[0];
    expect(capa.findAll(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Tu avatar')).length).toBeGreaterThan(0);
    // El avatar baja P / 2 desde el centro del recuadro (400 + 144 = 544): queda justo en el centro de la cámara.
    expect(bajadaDelAvatar(800, 'navegacion')).toBe(144);
    expect(bajadaDelAvatar(800, 'plano')).toBe(0);
    const [camara] = mockAnimar.mock.calls[mockAnimar.mock.calls.length - 1] as [{ pitch: number; zoom: number; heading: number }];
    expect(camara).toMatchObject({ pitch: 67.5, zoom: 18.5, heading: 45 });
  });

  // spec 042 FR-014
  it('«Terminaste» conserva la cámara centrada del resumen', () => {
    const raiz = dibujar(React.createElement(MapaDeCarrera, { ...base, posicion: LIMA, modo: 'resumen', alto: 220 })).root;
    const mapa = mapaDe(raiz);
    expect(mapa.props.initialCamera.pitch).toBe(60);
    expect(mapa.props.mapPadding.top).toBe(0);
  });
});

describe('el botón 2D / 3D del mapa', () => {
  const boton = (raiz: ReactTestInstance) =>
    raiz.findAll(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Ver el mapa en') && typeof n.props.onPress === 'function')[0];

  // spec 042 FR-037
  it('la cámara de cada modo: 3D en diagonal, 2D desde arriba con el avatar al centro, y el resumen siempre igual', () => {
    expect(camaraDelMapa('navegacion', '3d')).toBe('navegacion');
    expect(camaraDelMapa('navegacion', '2d')).toBe('plano');
    expect(camaraDelMapa('resumen', '2d')).toBe('resumen');
    expect(CAMARA.plano.inclinacion).toBe(0);
    expect(rellenoDeArriba(800, CAMARA.plano.avatarAlto)).toBe(0);
  });

  // spec 042 FR-037
  it('empieza en 3D; tocarlo pasa a 2D con un pase de 400 ms, vibra y lo recuerda por cuenta', async () => {
    olvidarVistasEnMemoriaParaPruebas();
    await AsyncStorage.clear();
    const raiz = dibujar(React.createElement(MapaDeCarrera, { ...base, posicion: LIMA, cuentaId: 'ana' })).root;
    await act(async () => undefined);
    const b = boton(raiz);
    expect(b.props.accessibilityLabel).toBe('Ver el mapa en 2D');
    expect(StyleSheet.flatten(b.props.style).height).toBeGreaterThanOrEqual(48);
    mockAnimar.mockClear();
    await act(async () => b.props.onPress());
    expect(tacto.seleccion).toHaveBeenCalledTimes(1);
    const [camara, opciones] = mockAnimar.mock.calls[mockAnimar.mock.calls.length - 1] as [{ pitch: number }, { duration: number }];
    expect(camara.pitch).toBe(0);
    expect(opciones.duration).toBe(DURACION_CAMBIO_DE_VISTA_MS);
    expect(boton(raiz).props.accessibilityLabel).toBe('Ver el mapa en 3D');
    expect(await AsyncStorage.getItem(PREFIJO_VISTA_DEL_MAPA + 'ana')).toBe('2d');

    // La próxima carrera (otro montaje, memoria vacía) abre en 2D.
    act(() => r?.unmount());
    olvidarVistasEnMemoriaParaPruebas();
    const otra = dibujar(React.createElement(MapaDeCarrera, { ...base, posicion: LIMA, cuentaId: 'ana' })).root;
    await act(async () => undefined);
    expect(boton(otra).props.accessibilityLabel).toBe('Ver el mapa en 3D');
    // Otra cuenta, en este mismo teléfono, sigue en 3D.
    act(() => r?.unmount());
    const deOtra = dibujar(React.createElement(MapaDeCarrera, { ...base, posicion: LIMA, cuentaId: 'luis' })).root;
    await act(async () => undefined);
    expect(boton(deOtra).props.accessibilityLabel).toBe('Ver el mapa en 2D');
  });

  // spec 042 FR-037, FR-014
  it('no aparece en «Terminaste» ni con el fondo neutro', () => {
    const resumen = dibujar(React.createElement(MapaDeCarrera, { ...base, posicion: LIMA, modo: 'resumen', cuentaId: 'ana' })).root;
    expect(boton(resumen)).toBeUndefined();
    act(() => r?.unmount());
    const neutro = dibujar(React.createElement(MapaDeCarrera, { ...base, posicion: null, centroDeVista: null, cuentaId: 'ana' })).root;
    expect(boton(neutro)).toBeUndefined();
  });
});
