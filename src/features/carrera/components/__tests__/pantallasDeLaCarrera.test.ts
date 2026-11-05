/**
 * Las pantallas de la carrera con GPS (spec 042): el mapa solo dibuja lo que el motor aceptó, y las pantallas nuevas cumplen las reglas
 * de siempre (tipo oración, tuteo, fuente por roles, toques de 44 o más).
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
let mockConClave = false;
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return { extra: { mapaGoogle: mockConClave } };
    },
  },
}));
jest.mock('react-native-maps', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const MapView = R.forwardRef((props: Record<string, unknown>, ref) => {
    R.useImperativeHandle(ref, () => ({ animateCamera: () => undefined }));
    return R.createElement(View, { testID: 'mapa-google', ...props });
  });
  const Polyline = (props: Record<string, unknown>) => R.createElement(View, { testID: 'ruta-dorada', ...props });
  return { __esModule: true, default: MapView, Polyline, PROVIDER_GOOGLE: 'google' };
});
jest.mock('../../hooks/useCarreraEnVivo', () => ({
  useRelojDeLaCarrera: () => 1_800_000_700_000,
  useEstadoDelEnvio: () => ({ tipo: 'en-cola', km: '2,10' }),
  useCarreraEnVivo: () => null,
  usePreferenciasDeLaCarrera: () => null,
}));

import { fuentes } from '../../../../theme/fuentes';
import { PREFERENCIAS_POR_DEFECTO } from '../../types/carrera.types';
import { puntoDestino } from '../../utils/geo';
import { alPunto, crearCarrera, pausar } from '../../utils/motorDeCarrera';
import { TEXTOS_DE_LA_CARRERA } from '../../utils/textosDeLaCarrera';
import { MapaDeCarrera } from '../MapaDeCarrera';
import { PantallaCorriendo, PantallaTerminaste } from '../PantallaDeCarrera';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ORIGEN = { lat: -12.0464, lng: -77.0428 };
const T0 = 1_800_000_000_000;
const PERSONA = { figura: 'mujer' as const, iniciales: 'AP', fotoUrl: null };

function carrera() {
  let e = crearCarrera({ carreraId: 'c', cuentaId: 'cuenta', ahora: T0, pesoKg: 70, conPasos: true, pausaAutomatica: false });
  for (let i = 0; i <= 700; i++) e = alPunto(e, { ...puntoDestino(ORIGEN, 90, 3 * i), t: T0 + 1000 + i * 1000, precision: 5, velocidad: 3 }).estado;
  return e;
}

let r: ReactTestRenderer | null = null;
afterEach(() => {
  act(() => r?.unmount());
  r = null;
  mockConClave = false;
});

function dibujar(el: React.ReactElement): ReactTestRenderer {
  act(() => {
    r = TestRenderer.create(el);
  });
  return r!;
}

function textos(raiz: ReactTestInstance): Array<{ texto: string; familia: unknown }> {
  return raiz
    .findAll(n => (n.type as unknown) === 'Text' || (typeof n.type === 'string' && n.type === 'RCTText'))
    .map(n => {
      const hijos = ([] as unknown[]).concat(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number');
      return { texto: hijos.join(''), familia: StyleSheet.flatten(n.props.style)?.fontFamily };
    })
    .filter(x => x.texto.length > 0);
}

describe('el mapa no calcula nada', () => {
  // spec 042 FR-037
  it('con la clave de Maps dibuja Google con la cámara inclinada y la ruta aceptada como una línea dorada', () => {
    mockConClave = true;
    const e = carrera();
    const raiz = dibujar(
      React.createElement(MapaDeCarrera, {
        ruta: e.ruta,
        posicion: e.ruta[e.ruta.length - 1],
        rumbo: 90,
        duracionMs: 600,
        figura: 'mujer',
        caminando: true,
        iniciales: 'AP',
      }),
    ).root;
    const mapa = raiz.findAll((n: ReactTestInstance) => n.props.testID === 'mapa-google' && typeof n.type !== 'string')[0];
    expect(mapa.props.provider).toBe('google');
    expect(mapa.props.initialCamera.pitch).toBe(60);
    expect(mapa.props.showsBuildings).toBe(true);
    const linea = raiz.findAll((n: ReactTestInstance) => n.props.testID === 'ruta-dorada' && typeof n.type !== 'string')[0];
    expect(linea.props.strokeColor).toBe('#B2924F');
    expect(linea.props.coordinates).toHaveLength(e.ruta.length);
    expect(linea.props.coordinates[0]).toEqual({ latitude: e.ruta[0].lat, longitude: e.ruta[0].lng });
    expect(raiz.findAll(n => n.props.accessibilityLabel === 'Tu avatar, mujer').length).toBeGreaterThan(0);
  });

  // spec 042 FR-038, FR-014
  it('el avatar no es enfocable (sin el resaltado gris de Android detrás de él en «Terminaste»)', () => {
    const raiz = dibujar(
      React.createElement(MapaDeCarrera, { ruta: [], posicion: ORIGEN, rumbo: 0, duracionMs: 0, figura: 'mujer', caminando: false, iniciales: 'AP', alto: 220 }),
    ).root;
    const avatar = raiz.findAll(n => n.props.accessibilityLabel === 'Tu avatar, mujer' && typeof n.type === 'string')[0];
    expect(avatar).toBeDefined();
    expect(avatar.props.accessible).not.toBe(true);
    expect(avatar.props.focusable).toBe(false);
    expect(avatar.props.importantForAccessibility).toBe('no-hide-descendants');
    // Nada sobre el mapa toma el foco: ninguna vista del mapa es `accessible`.
    expect(raiz.findAll(n => typeof n.type === 'string' && n.props.accessible === true)).toHaveLength(0);
  });

  // spec 042 FR-037
  it('sin la clave de Maps no rompe: fondo neutro con el avatar y una línea que lo dice', () => {
    const raiz = dibujar(
      React.createElement(MapaDeCarrera, { ruta: [], posicion: ORIGEN, rumbo: 0, duracionMs: 0, figura: 'neutral', caminando: false, iniciales: 'AP' }),
    ).root;
    expect(raiz.findAll(n => n.props.testID === 'mapa-google')).toHaveLength(0);
    expect(textos(raiz).map(t => t.texto)).toContain(TEXTOS_DE_LA_CARRERA.mapaSinClave);
  });
});

describe('las pantallas nuevas cumplen las reglas de siempre', () => {
  const ROLES = new Set<unknown>(Object.values(fuentes));
  const comun = {
    prefs: PREFERENCIAS_POR_DEFECTO,
    persona: PERSONA,
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

  function revisar(raiz: ReactTestInstance) {
    const todos = textos(raiz);
    expect(todos.length).toBeGreaterThan(3);
    for (const { texto, familia } of todos) {
      // Fuente por roles de theme/fuentes.ts (nunca un nombre de archivo suelto).
      if (familia != null) expect(ROLES.has(familia)).toBe(true);
      // Tipo oración: nada escrito todo en MAYÚSCULAS (salvo números, unidades e iniciales de 2 letras).
      if (/[a-záéíóúñ]{3,}/i.test(texto)) expect(texto).not.toMatch(/^[^a-záéíóúñ]*[A-ZÁÉÍÓÚÑ]{4,}[^a-záéíóúñ]*$/);
      // Tuteo de Perú, nunca voseo ni «usted».
      expect(texto).not.toMatch(/\busted\b|\bpodés\b|\btenés\b|\bquerés\b/i);
    }
    // Toques cómodos: todo lo que se aprieta con texto propio mide 44 o más de alto (o lo hereda de un botón de la app).
    const botones = raiz.findAll(n => n.props.accessibilityRole === 'button' && n.props.style != null && typeof n.type !== 'string');
    for (const b of botones) {
      const alto = StyleSheet.flatten(b.props.style)?.minHeight ?? StyleSheet.flatten(b.props.style)?.height;
      if (typeof alto === 'number') expect(alto).toBeGreaterThanOrEqual(44);
    }
  }

  // spec 042 FR-046, FR-007
  it('Corriendo: tiempo, distancia, ritmo, calorías, las cuatro pestañas y «Desliza para pausar»', () => {
    const raiz = dibujar(React.createElement(PantallaCorriendo, { ...comun, e: carrera() })).root;
    const visibles = textos(raiz).map(t => t.texto);
    for (const t of [TEXTOS_DE_LA_CARRERA.duracion, 'Mapa', 'Estadísticas', 'Tramos', 'Voz', TEXTOS_DE_LA_CARRERA.deslizaParaPausar]) {
      expect(visibles).toContain(t);
    }
    revisar(raiz);
  });

  // spec 042 FR-046, FR-012
  it('Pausa: «Tu carrera queda guardada…», las opciones, Seguir, Terminar y Descartar', () => {
    const e = pausar(carrera(), T0 + 702_000);
    const raiz = dibujar(React.createElement(PantallaCorriendo, { ...comun, e })).root;
    const visibles = textos(raiz).map(t => t.texto);
    for (const t of [
      TEXTOS_DE_LA_CARRERA.enPausa,
      TEXTOS_DE_LA_CARRERA.guardada,
      TEXTOS_DE_LA_CARRERA.verTramos,
      TEXTOS_DE_LA_CARRERA.verEstadisticas,
      TEXTOS_DE_LA_CARRERA.vozYSonidos,
      TEXTOS_DE_LA_CARRERA.bloquearPantalla,
      TEXTOS_DE_LA_CARRERA.descartar,
    ]) {
      expect(visibles).toContain(t);
    }
    revisar(raiz);
  });

  // spec 042 FR-046, FR-014, FR-018
  it('Terminaste: título, datos, la línea del hábito y «Compartir en el Muro»', () => {
    const e = pausar(carrera(), T0 + 702_000);
    const raiz = dibujar(
      React.createElement(PantallaTerminaste, {
        final: e,
        terminadaEnMs: T0 + 702_000,
        conHabito: true,
        persona: PERSONA,
        alCompartir: () => undefined,
        alListo: () => undefined,
      }),
    ).root;
    const visibles = textos(raiz).map(t => t.texto);
    expect(visibles).toContain(TEXTOS_DE_LA_CARRERA.terminaste);
    expect(visibles).toContain('Guardada en tu teléfono, se enviará al tener señal');
    revisar(raiz);
  });
});
