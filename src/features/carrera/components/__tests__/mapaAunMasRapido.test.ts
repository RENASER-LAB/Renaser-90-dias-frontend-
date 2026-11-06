/**
 * Spec 042 (2026-11-06, el dueño en su teléfono: «el mapa todavía tarda unos 3 segundos en cargar»). En frío pesaban la primera carga
 * de Google Maps, la ubicación y el arranque del servicio del GPS. Ahora: Google Maps se calienta al verse la fila de «Kilómetros
 * diarios», el peso y el sexo se leen ya ahí, el mapa no muestra su gris de carga, y la cuenta sale sin esperar al servicio del GPS.
 * Nada de esto mide la carrera.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: jest.fn(), logro: jest.fn(), error: jest.fn() } }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: { mapaGoogle: true } } } }));
const mockAnimar = jest.fn();
/** Si el mapa simulado avisa «listo» al montarse (como el nativo) o hay que avisarlo a mano. */
let mockListoAlMontar = true;
jest.mock('react-native-maps', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const MapView = R.forwardRef((props: Record<string, unknown>, ref) => {
    R.useImperativeHandle(ref, () => ({ animateCamera: (...a: unknown[]) => mockAnimar(...a) }));
    R.useEffect(() => {
      if (mockListoAlMontar) (props.onMapReady as (() => void) | undefined)?.();
    }, []);
    return R.createElement(View, { testID: 'mapa-google', ...props });
  });
  return { __esModule: true, default: MapView, Polyline: () => null, PROVIDER_GOOGLE: 'google' };
});
const mockRocas = jest.fn(async () => [] as unknown[]);
const mockRespuestas = jest.fn(async () => ({ sections: [] }) as unknown);
jest.mock('../../../objetivos/api/objetivosApi', () => ({ obtenerRocasMaestras: () => mockRocas() }));
jest.mock('../../../onboarding/api/onboardingApi', () => ({ obtenerRespuestas: () => mockRespuestas() }));
const mockUbicacion = {
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: true }) as unknown),
  getLastKnownPositionAsync: jest.fn(async () => ({ coords: { latitude: -12.12, longitude: -77.03 } }) as unknown),
  getCurrentPositionAsync: jest.fn(() => new Promise(() => undefined)),
  hasStartedLocationUpdatesAsync: jest.fn(async () => false),
  stopLocationUpdatesAsync: jest.fn(async () => undefined),
  Accuracy: { Balanced: 3 },
};
jest.mock('expo-location', () => mockUbicacion, { virtual: true });
jest.mock('expo-task-manager', () => ({ defineTask: () => undefined }), { virtual: true });
jest.mock('../../servicios/notificacionDeCarrera', () => ({ mostrarNotificacionDeCarrera: jest.fn(), quitarNotificacionDeCarrera: jest.fn() }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ESPERA_ANTES_DE_PREPARAR_MS,
  marcarMapaCalentado,
  mapaYaCalentado,
  pedirCalentarElMapa,
  ponerCuentaDeLaCarrera,
  reiniciarCalentamientoParaPruebas,
  usePrepararLaCarrera,
} from '../../servicios/calentarLaCarrera';
import {
  adelantarCentroDelMapa,
  centroDelMapa,
  CLAVE_DEL_CENTRO_GUARDADO,
  olvidarCentroDelMapa,
  olvidarLoAdelantadoParaPruebas,
  prepararCentroDelMapa,
} from '../../servicios/centroDelMapa';
import { leerDatosDeLaPersona, olvidarDatosDeLaPersonaParaPruebas } from '../../servicios/datosDeLaPersona';
import { detenerGps } from '../../servicios/tareaDeUbicacion';
import { CalentadorDelMapa, TOPE_DEL_CALENTADOR_MS } from '../CalentadorDelMapa';
import { DURACION_DEL_VELO_MS, MapaDeCarrera, TOPE_DEL_VELO_MS } from '../MapaDeCarrera';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LIMA = { lat: -12.1219, lng: -77.0312 };
const base = { ruta: [], rumbo: 45, duracionMs: 0, figura: 'neutral' as const, caminando: false, iniciales: 'AP' };
let r: ReactTestRenderer | null = null;
const dibujar = (el: React.ReactElement): ReactTestRenderer => {
  act(() => {
    r = TestRenderer.create(el);
  });
  return r!;
};
const mapaDe = (raiz: ReactTestInstance) => raiz.findAll(n => n.props.testID === 'mapa-google' && typeof n.type !== 'string')[0];
const veloDe = (raiz: ReactTestInstance) => raiz.findAll(n => n.props.testID === 'velo-del-mapa' && typeof n.type !== 'string');

beforeEach(async () => {
  Object.defineProperty(Platform, 'OS', { get: () => 'android', configurable: true });
  mockListoAlMontar = true;
  reiniciarCalentamientoParaPruebas();
  olvidarDatosDeLaPersonaParaPruebas();
  olvidarLoAdelantadoParaPruebas();
  olvidarCentroDelMapa();
  mockAnimar.mockClear();
  mockRocas.mockClear();
  mockRespuestas.mockClear();
  mockUbicacion.getLastKnownPositionAsync.mockClear();
  mockUbicacion.getForegroundPermissionsAsync.mockClear();
  await AsyncStorage.clear();
});
afterEach(() => {
  act(() => r?.unmount());
  r = null;
  jest.useRealTimers();
});

describe('Google Maps se calienta antes de tocar «Correr»', () => {
  // spec 042 FR-037
  it('sin pedido no hay nada; pedido, un mapa de 1 × 1 sin gestos ni lector; al cargar se quita y no vuelve en el proceso', () => {
    const raiz = dibujar(React.createElement(CalentadorDelMapa)).root;
    expect(raiz.findAll(n => n.props.testID === 'mapa-google')).toHaveLength(0);
    act(() => pedirCalentarElMapa());
    const mapa = mapaDe(raiz);
    expect(mapa).toBeDefined();
    const caja = raiz.findAll(n => n.props.testID === 'calentador-del-mapa' && typeof n.type !== 'string')[0];
    expect(StyleSheet.flatten(caja.props.style)).toMatchObject({ width: 1, height: 1, opacity: 0 });
    expect(caja.props.pointerEvents).toBe('none');
    expect(caja.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(mapa.props.googleRenderer).toBe('LATEST');
    act(() => mapa.props.onMapLoaded());
    expect(raiz.findAll(n => n.props.testID === 'mapa-google')).toHaveLength(0);
    expect(mapaYaCalentado()).toBe(true);
    act(() => pedirCalentarElMapa());
    expect(raiz.findAll(n => n.props.testID === 'mapa-google')).toHaveLength(0);
  });

  // spec 042 FR-037
  it('si Google Maps nunca avisa que cargó, se quita igual al tope', () => {
    jest.useFakeTimers();
    const raiz = dibujar(React.createElement(CalentadorDelMapa)).root;
    act(() => pedirCalentarElMapa());
    expect(mapaDe(raiz)).toBeDefined();
    act(() => jest.advanceTimersByTime(TOPE_DEL_CALENTADOR_MS));
    expect(raiz.findAll(n => n.props.testID === 'mapa-google')).toHaveLength(0);
  });

  // spec 042 FR-037
  it('el mapa de la carrera, al quedar listo, también deja Google Maps por calentado', () => {
    dibujar(React.createElement(MapaDeCarrera, { ...base, posicion: LIMA }));
    expect(mapaYaCalentado()).toBe(true);
  });

  // spec 042 FR-037, FR-004
  it('al verse la fila que ofrece correr: calienta el mapa, lee el peso y el sexo y adelanta la ubicación (sin pedir permiso)', async () => {
    jest.useFakeTimers();
    ponerCuentaDeLaCarrera('ana');
    const Fila = ({ activo }: { activo: boolean }) => {
      usePrepararLaCarrera(activo);
      return null;
    };
    dibujar(React.createElement(Fila, { activo: true }));
    expect(mockRocas).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(ESPERA_ANTES_DE_PREPARAR_MS);
    });
    jest.useRealTimers();
    await act(async () => undefined);
    expect(mockRocas).toHaveBeenCalledTimes(1);
    expect(mockRespuestas).toHaveBeenCalledTimes(1);
    expect(mockUbicacion.getForegroundPermissionsAsync).toHaveBeenCalled();
    expect(mockUbicacion.getLastKnownPositionAsync).toHaveBeenCalled();
    // Y al calentador le llega el pedido.
    const calentador = dibujar(React.createElement(CalentadorDelMapa)).root;
    expect(mapaDe(calentador)).toBeDefined();
  });

  // spec 042 FR-037
  it('con una carrera en curso (`activo` en falso) la fila no adelanta nada', () => {
    jest.useFakeTimers();
    ponerCuentaDeLaCarrera('ana');
    const Fila = () => {
      usePrepararLaCarrera(false);
      return null;
    };
    dibujar(React.createElement(Fila));
    act(() => jest.advanceTimersByTime(ESPERA_ANTES_DE_PREPARAR_MS * 2));
    expect(mockRocas).not.toHaveBeenCalled();
  });
});

describe('el peso y el sexo se leen una sola vez', () => {
  // spec 042 FR-004
  it('si al tocar «Correr» la lectura adelantada todavía va en camino, se espera esa misma: un solo pedido', async () => {
    const a = leerDatosDeLaPersona('ana');
    const b = leerDatosDeLaPersona('ana');
    await Promise.all([a, b]);
    expect(mockRocas).toHaveBeenCalledTimes(1);
    expect(mockRespuestas).toHaveBeenCalledTimes(1);
    await leerDatosDeLaPersona('ana');
    expect(mockRocas).toHaveBeenCalledTimes(1);
  });
});

describe('el centro del mapa está al instante (solo para mirar)', () => {
  // spec 042 FR-037
  it('con un centro guardado, la cuenta no espera a la ubicación: ya hay dónde mirar', async () => {
    await AsyncStorage.setItem(CLAVE_DEL_CENTRO_GUARDADO, JSON.stringify(LIMA));
    let soltar: (v: unknown) => void = () => undefined;
    mockUbicacion.getLastKnownPositionAsync.mockImplementationOnce(() => new Promise(res => (soltar = res)));
    await prepararCentroDelMapa();
    // Volvió sin la última conocida (que sigue sin llegar) y con el centro guardado puesto.
    expect(centroDelMapa()).toEqual({ pos: LIMA, fuente: 'guardada' });
    soltar({ coords: { latitude: -12.12, longitude: -77.03 } });
    await act(async () => undefined);
    expect(centroDelMapa()).toEqual({ pos: { lat: -12.12, lng: -77.03 }, fuente: 'ultima-conocida' });
    // Y lo mostrado queda guardado para la próxima carrera.
    expect(JSON.parse((await AsyncStorage.getItem(CLAVE_DEL_CENTRO_GUARDADO))!)).toEqual({ lat: -12.12, lng: -77.03 });
  });

  // spec 042 FR-037
  it('lo adelantado al verse la fila se usa al instante; sin permiso no se lee la ubicación', async () => {
    await adelantarCentroDelMapa();
    await prepararCentroDelMapa();
    expect(centroDelMapa()?.fuente).toBe('ultima-conocida');
    olvidarLoAdelantadoParaPruebas();
    mockUbicacion.getLastKnownPositionAsync.mockClear();
    mockUbicacion.getForegroundPermissionsAsync.mockImplementationOnce(async () => ({ granted: false }));
    await adelantarCentroDelMapa();
    expect(mockUbicacion.getLastKnownPositionAsync).not.toHaveBeenCalled();
  });
});

describe('el mapa de la carrera mientras Google Maps carga', () => {
  // spec 042 FR-037
  it('antes de quedar listo no se le pasa `mapPadding` (se caía) ni se mueve la cámara; al quedar listo, las dos cosas', () => {
    mockListoAlMontar = false;
    const raiz = dibujar(React.createElement(MapaDeCarrera, { ...base, posicion: LIMA })).root;
    const contenedor = raiz.findAll(n => typeof n.props.onLayout === 'function' && typeof n.type !== 'string')[0];
    act(() => contenedor.props.onLayout({ nativeEvent: { layout: { width: 400, height: 800 } } }));
    expect(mapaDe(raiz).props.mapPadding).toBeUndefined();
    expect(mockAnimar).not.toHaveBeenCalled();
    act(() => mapaDe(raiz).props.onMapReady());
    expect(mapaDe(raiz).props.mapPadding).toEqual({ top: 288, right: 0, bottom: 0, left: 0 });
    const [camara] = mockAnimar.mock.calls[mockAnimar.mock.calls.length - 1] as [{ center: unknown }];
    expect(camara.center).toEqual({ latitude: LIMA.lat, longitude: LIMA.lng });
  });

  // spec 042 FR-037
  it('un velo del color de la tarjeta tapa el gris de carga y se funde cuando aparecen las calles', () => {
    jest.useFakeTimers();
    const raiz = dibujar(React.createElement(MapaDeCarrera, { ...base, posicion: LIMA })).root;
    const velo = veloDe(raiz)[0];
    expect(velo).toBeDefined();
    expect(velo.props.pointerEvents).toBe('none');
    act(() => mapaDe(raiz).props.onMapLoaded());
    act(() => jest.advanceTimersByTime(DURACION_DEL_VELO_MS));
    expect(veloDe(raiz)).toHaveLength(0);
  });

  // spec 042 FR-037
  it('si Google Maps no avisa, el velo se quita igual al tope (nunca deja el mapa tapado)', () => {
    jest.useFakeTimers();
    const raiz = dibujar(React.createElement(MapaDeCarrera, { ...base, posicion: LIMA })).root;
    act(() => jest.advanceTimersByTime(TOPE_DEL_VELO_MS));
    expect(veloDe(raiz)).toHaveLength(1);
    act(() => jest.advanceTimersByTime(DURACION_DEL_VELO_MS));
    expect(veloDe(raiz)).toHaveLength(0);
  });

  // spec 042 FR-037
  it('del centro guardado a uno lejano la cámara salta en vez de cruzar la ciudad', () => {
    dibujar(React.createElement(MapaDeCarrera, { ...base, posicion: null, centroDeVista: LIMA }));
    mockAnimar.mockClear();
    const lejos = { lat: LIMA.lat + 0.1, lng: LIMA.lng };
    act(() => r!.update(React.createElement(MapaDeCarrera, { ...base, posicion: null, centroDeVista: lejos })));
    const [, opciones] = mockAnimar.mock.calls[mockAnimar.mock.calls.length - 1] as [unknown, { duration: number }];
    expect(opciones.duration).toBe(1);
  });
});

describe('la cuenta sale sin esperar al servicio del GPS', () => {
  // spec 042 FR-003
  it('si se cancela en la cuenta mientras el GPS arrancaba, se detiene aunque todavía no figure como arrancado', async () => {
    mockUbicacion.stopLocationUpdatesAsync.mockClear();
    await detenerGps();
    expect(mockUbicacion.stopLocationUpdatesAsync).not.toHaveBeenCalled();
    await detenerGps(true);
    expect(mockUbicacion.stopLocationUpdatesAsync).toHaveBeenCalledTimes(1);
  });
});

describe('se marca calentado al volver a pedirlo', () => {
  // spec 042 FR-037
  it('`marcarMapaCalentado` apaga un pedido pendiente', () => {
    pedirCalentarElMapa();
    marcarMapaCalentado();
    const raiz = dibujar(React.createElement(CalentadorDelMapa)).root;
    expect(raiz.findAll(n => n.props.testID === 'mapa-google')).toHaveLength(0);
  });
});
