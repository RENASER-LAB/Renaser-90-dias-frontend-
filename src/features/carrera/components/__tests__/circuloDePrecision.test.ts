/**
 * #236 (spec 042, promedio quieto y círculo; el dueño en su casa: «me pone al frente o en otra casa»): el mapa dibuja a la persona con un círculo de
 * precisión alrededor, la precisión dicha en palabras para el lector de pantalla y, quieta, en el promedio de las últimas lecturas. Todo
 * es solo para mirar: la ruta y la distancia siguen siendo del motor.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
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
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: { mapaGoogle: true, mapaGoogleIos: true } } } }));
const mockAnimar = jest.fn();
jest.mock('react-native-maps', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const MapView = R.forwardRef((props: Record<string, unknown>, ref) => {
    R.useImperativeHandle(ref, () => ({ animateCamera: (...a: unknown[]) => mockAnimar(...a) }));
    R.useEffect(() => {
      (props.onMapReady as (() => void) | undefined)?.();
    }, []);
    return R.createElement(View, { testID: 'mapa-google', ...props });
  });
  const Polyline = (props: Record<string, unknown>) => R.createElement(View, { testID: 'ruta-dorada', ...props });
  const Circle = (props: Record<string, unknown>) => R.createElement(View, props);
  return { __esModule: true, default: MapView, Polyline, Circle, PROVIDER_GOOGLE: 'google' };
});
jest.mock('../../hooks/useCarreraEnVivo', () => ({
  useRelojDeLaCarrera: () => 1_800_000_000_500,
  useEstadoDelEnvio: () => null,
  useCarreraEnVivo: () => null,
  usePreferenciasDeLaCarrera: () => null,
}));

import { light } from '../../../../theme/tokens';
import { PREFERENCIAS_POR_DEFECTO } from '../../types/carrera.types';
import { distanciaM, puntoDestino } from '../../utils/geo';
import { RADIO_MAXIMO_DEL_CIRCULO_M } from '../../utils/lecturaDelMapa';
import { alPunto, crearCarrera } from '../../utils/motorDeCarrera';
import { olvidarCentroDelMapa, ponerCentroDelMapa, ponerLecturaDelMapa } from '../../servicios/centroDelMapa';
import { MapaDeCarrera } from '../MapaDeCarrera';
import { PantallaCorriendo } from '../PantallaDeCarrera';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const CASA = { lat: -12.1219, lng: -77.0312 };
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
const circuloDe = (raiz: ReactTestInstance) => raiz.findAll(n => n.props.testID === 'circulo-de-precision' && typeof n.type !== 'string');
const precisionDe = (raiz: ReactTestInstance) => raiz.findAll(n => n.props.testID === 'precision-del-punto' && typeof n.type === 'string');
const base = { ruta: [], rumbo: 45, duracionMs: 0, figura: 'neutral' as const, caminando: false, iniciales: 'AP' };
const textosDe = (n: ReactTestInstance) => n.findAll(x => (x.type as unknown) === 'Text').map(x => ([] as unknown[]).concat(x.props.children).join(''));

describe('el círculo de precisión alrededor del punto', () => {
  // spec 042 FR-055
  it('radio = la precisión en metros, centrado en el punto, con los colores del tema y un borde (no depende solo del color)', () => {
    const raiz = dibujar(React.createElement(MapaDeCarrera, { ...base, posicion: null, centroDeVista: CASA, precisionM: 18 })).root;
    const [circulo] = circuloDe(raiz);
    expect(circulo).toBeDefined();
    expect(circulo.props.center).toEqual({ latitude: CASA.lat, longitude: CASA.lng });
    expect(circulo.props.radius).toBe(18);
    expect(circulo.props.fillColor).toBe(light.ring3);
    expect(circulo.props.strokeColor).toBe(light.gold);
    expect(circulo.props.strokeWidth).toBeGreaterThan(0);
    // El punto sigue a la vista: el avatar no se esconde ni se reemplaza por el círculo.
    const avatar = raiz.findAll(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Tu avatar'));
    expect(avatar.length).toBeGreaterThan(0);
  });

  // spec 042 FR-055
  it('el círculo no pasa del tope aunque la precisión sea de cientos de metros; la precisión dicha sí es la real', () => {
    const raiz = dibujar(React.createElement(MapaDeCarrera, { ...base, posicion: null, centroDeVista: CASA, precisionM: 500 })).root;
    expect(circuloDe(raiz)[0].props.radius).toBe(RADIO_MAXIMO_DEL_CIRCULO_M);
    expect(precisionDe(raiz)[0].props.accessibilityLabel).toBe('Precisión de 500 metros');
  });

  // spec 042 FR-055
  it('con lector de pantalla, la precisión se dice en palabras; el mapa en sí sigue oculto para el lector', () => {
    const raiz = dibujar(React.createElement(MapaDeCarrera, { ...base, posicion: null, centroDeVista: CASA, precisionM: 18.4 })).root;
    const [chip] = precisionDe(raiz);
    expect(chip.props.accessible).toBe(true);
    expect(chip.props.accessibilityLabel).toBe('Precisión de 18 metros');
    expect(textosDe(chip)).toEqual(['Precisión de 18 m']);
    expect(mapaDe(raiz).props.importantForAccessibility).toBe('no-hide-descendants');
  });

  // spec 042 FR-055
  it('sin una lectura fresca (el centro guardado, la última conocida) no hay círculo ni precisión', () => {
    const raiz = dibujar(React.createElement(MapaDeCarrera, { ...base, posicion: null, centroDeVista: CASA, precisionM: null })).root;
    expect(circuloDe(raiz)).toHaveLength(0);
    expect(precisionDe(raiz)).toHaveLength(0);
  });

  // spec 042 FR-055, FR-014
  it('«Terminaste» no lleva círculo', () => {
    const raiz = dibujar(React.createElement(MapaDeCarrera, { ...base, posicion: CASA, modo: 'resumen', alto: 220, precisionM: 18 })).root;
    expect(circuloDe(raiz)).toHaveLength(0);
    expect(precisionDe(raiz)).toHaveLength(0);
  });
});

describe('el punto que se dibuja: promedio quieta, punto del motor al moverse', () => {
  const motor = puntoDestino(CASA, 0, 18);

  // spec 042 FR-054
  it('quieta y con lecturas promediadas, la cámara y el círculo van al promedio y no al primer punto suelto del motor', () => {
    const raiz = dibujar(
      React.createElement(MapaDeCarrera, { ...base, posicion: motor, centroDeVista: CASA, precisionM: 12, promediado: true, quieta: true }),
    ).root;
    expect(mapaDe(raiz).props.initialCamera.center).toEqual({ latitude: CASA.lat, longitude: CASA.lng });
    expect(circuloDe(raiz)[0].props.center).toEqual({ latitude: CASA.lat, longitude: CASA.lng });
  });

  // spec 042 FR-054
  it('al moverse, la cámara y el círculo siguen al punto real del motor', () => {
    dibujar(React.createElement(MapaDeCarrera, { ...base, posicion: motor, centroDeVista: CASA, precisionM: 12, promediado: true, quieta: true }));
    mockAnimar.mockClear();
    act(() =>
      r!.update(React.createElement(MapaDeCarrera, { ...base, posicion: motor, centroDeVista: CASA, precisionM: 12, promediado: true, quieta: false })),
    );
    const [camara] = mockAnimar.mock.calls[mockAnimar.mock.calls.length - 1] as [{ center: { latitude: number; longitude: number } }];
    expect(camara.center).toEqual({ latitude: motor.lat, longitude: motor.lng });
    expect(circuloDe(r!.root)[0].props.center).toEqual({ latitude: motor.lat, longitude: motor.lng });
  });

  // spec 042 FR-054
  it('con una sola lectura todavía no hay promedio: manda el punto del motor aunque esté quieta', () => {
    const raiz = dibujar(
      React.createElement(MapaDeCarrera, { ...base, posicion: motor, centroDeVista: CASA, precisionM: 12, promediado: false, quieta: true }),
    ).root;
    expect(mapaDe(raiz).props.initialCamera.center).toEqual({ latitude: motor.lat, longitude: motor.lng });
  });
});

describe('la pantalla de correr junta las lecturas, el motor y el mapa', () => {
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
  /** El primer punto suelto que aceptó el motor: a 18 m al norte de la casa (el motor acepta hasta 20 m). */
  const motor = puntoDestino(CASA, 0, 18);
  const conPrimerPunto = (conPasos: boolean) => {
    const e0 = crearCarrera({ carreraId: 'c', cuentaId: 'cuenta', ahora: T0, pesoKg: 70, conPasos, pausaAutomatica: false });
    return alPunto(e0, { lat: motor.lat, lng: motor.lng, t: T0, precision: 18, velocidad: 0 }).estado;
  };
  const lecturasQuietas = () => {
    for (const [dx, dy] of [[0, 0], [2, 1], [1, -2], [-2, 1]]) {
      const p = puntoDestino(puntoDestino(CASA, 90, dx), 0, dy);
      ponerLecturaDelMapa({ lat: p.lat, lng: p.lng, t: Date.now(), precision: 12, velocidad: 0 }, 'gps');
    }
  };

  // spec 042 FR-054, FR-055
  it('quieta: el punto es el promedio de las lecturas y el círculo trae la mejor precisión; el motor no se toca', async () => {
    lecturasQuietas();
    const e = conPrimerPunto(false);
    const raiz = dibujar(React.createElement(PantallaCorriendo, { ...comun, e })).root;
    // La vista 2D / 3D del mapa se lee del teléfono: se deja terminar para que nada quede sin `act`.
    await act(async () => undefined);
    const [circulo] = circuloDe(raiz);
    expect(distanciaM({ lat: circulo.props.center.latitude, lng: circulo.props.center.longitude }, CASA)).toBeLessThan(3);
    expect(distanciaM({ lat: circulo.props.center.latitude, lng: circulo.props.center.longitude }, motor)).toBeGreaterThan(14);
    expect(circulo.props.radius).toBe(12);
    expect(precisionDe(raiz)[0].props.accessibilityLabel).toBe('Precisión de 12 metros');
    // spec 042 FR-057: la ruta y la distancia son del motor: el promedio de la vista no las cambió.
    expect(e.ruta).toHaveLength(1);
    expect(e.ruta[0].lat).toBeCloseTo(motor.lat, 6);
    expect(e.distanciaM).toBe(0);
  });

  // spec 042 FR-054
  it('en cuanto hay pasos (la persona se mueve), el punto vuelve a ser el del motor', async () => {
    lecturasQuietas();
    const e = { ...conPrimerPunto(true), pasos: 3, ultimoPasoMs: T0 };
    const raiz = dibujar(React.createElement(PantallaCorriendo, { ...comun, e })).root;
    // La vista 2D / 3D del mapa se lee del teléfono: se deja terminar para que nada quede sin `act`.
    await act(async () => undefined);
    const [circulo] = circuloDe(raiz);
    expect(distanciaM({ lat: circulo.props.center.latitude, lng: circulo.props.center.longitude }, motor)).toBeLessThan(1);
  });

  // spec 042 FR-055
  it('con un centro de vista que no viene de una lectura (guardado o última conocida) no hay círculo', async () => {
    ponerCentroDelMapa(CASA, 'ultima-conocida');
    const e = crearCarrera({ carreraId: 'c', cuentaId: 'cuenta', ahora: T0, pesoKg: 70, conPasos: false, pausaAutomatica: false });
    const raiz = dibujar(React.createElement(PantallaCorriendo, { ...comun, e, detrasDeLaCuenta: true })).root;
    await act(async () => undefined);
    expect(mapaDe(raiz)).toBeDefined();
    expect(circuloDe(raiz)).toHaveLength(0);
    expect(precisionDe(raiz)).toHaveLength(0);
  });
});
