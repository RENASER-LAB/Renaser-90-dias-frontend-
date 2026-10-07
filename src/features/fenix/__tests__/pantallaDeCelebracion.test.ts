/**
 * La pantalla completa de los momentos grandes (2026-10-07): qué hito dispara qué pantalla, que un hábito suelto nunca
 * la abra, «reducir movimiento» (fénix quieto en su imagen, sin brasas), que haya UN solo lienzo Rive (el fénix del
 * centro de Hoy pasa a su foto mientras está) y cómo se cierra.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { act } from 'react-test-renderer';

import { avisarHabitoCumplido } from '../../habits/eventos/habitoCumplido';
import { OrbeAcompanante } from '../../renasia/components/OrbeAcompanante';
import { AnfitrionDeCelebraciones } from '../components/AnfitrionDeCelebraciones';
import { PantallaDeCelebracion } from '../components/PantallaDeCelebracion';
import { momentoGrandeActual, reiniciarMomentoGrandeParaPruebas, type MomentoGrande } from '../estado/momentoGrande';
import { reiniciarRevisionParaPruebas, revisarHitosDelDia } from '../estado/revisarHitosDelDia';
import { PANTALLA_MS, planDeLaPantalla, textosDeLaPantalla } from '../utils/pantallaDeCelebracion';
import { crear, desmontarTodo, disparos, emitir, ultimaVistaRive, vistasRive } from './ayudasDePrueba';

const mockSesion = { reducido: false };
const mockServidor = {
  home: { rachaActual: 3, habitosHoy: { completados: 1, total: 3 }, fase: 'PHASE_2_DEVELOPMENT' as string | null },
  tracks: [{ puntosOtorgados: 10 }, { puntosOtorgados: 15 }, { puntosOtorgados: 0 }],
};
const mockTacto = { hito: jest.fn(), logro: jest.fn(), seleccion: jest.fn() };

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../../theme/ThemeContext', () => {
  const tokens = require('../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('react-native-reanimated', () => {
  const doble = require('react-native-reanimated/mock');
  const { useRef } = require('react');
  return {
    ...doble,
    useReducedMotion: () => mockSesion.reducido,
    useSharedValue: (inicial: unknown) => {
      const ref = useRef(null);
      if (ref.current === null) ref.current = doble.useSharedValue(inicial);
      return ref.current;
    },
  };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../../utils/tacto', () => ({
  get tacto() {
    return mockTacto;
  },
}));
jest.mock('../../auth/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'TRAINEE' }, isAuthenticated: true, isOnboardingCompleted: true }),
}));
jest.mock('../../renasia/hooks/useOrbeALaVista', () => ({ useOrbeALaVista: () => true }));
jest.mock('../../home/api/homeApi', () => ({ obtenerResumenHome: () => Promise.resolve(mockServidor.home) }));
jest.mock('../../habits/api/habitsApi', () => ({ obtenerTracksDeHoy: () => Promise.resolve(mockServidor.tracks) }));
jest.mock('../../yo/api/animalesDeFaseApi', () => ({ leerAnimalesDeFase: () => Promise.resolve([]) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const momento = (m: Partial<MomentoGrande>): MomentoGrande => ({
  principal: 'todosLosHabitos',
  otros: [],
  rachaActual: 4,
  puntosHoy: 25,
  fase: null,
  ...m,
});

const animal = { nombre: 'Gorila', imagen: 1, imagenDeRespaldo: 1 };

async function vaciarPromesas() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

beforeEach(async () => {
  await AsyncStorage.clear();
  reiniciarMomentoGrandeParaPruebas();
  reiniciarRevisionParaPruebas();
  mockServidor.home = { rachaActual: 3, habitosHoy: { completados: 1, total: 3 }, fase: 'PHASE_2_DEVELOPMENT' };
});
afterEach(() => {
  desmontarTodo();
  mockSesion.reducido = false;
  jest.useRealTimers();
});

describe('qué dice cada pantalla', () => {
  it('día completo: «¡Día completo!» con los puntos de hoy y la racha que suben', () => {
    const textos = textosDeLaPantalla(momento({}));
    expect(textos.titulo).toBe('¡Día completo!');
    expect(textos.numeroGrande).toBeNull();
    expect(textos.contadores).toEqual([
      { clave: 'puntos', valor: 25, rotulo: 'puntos hoy' },
      { clave: 'racha', valor: 4, rotulo: 'días de racha' },
    ]);
  });
  it.each<['racha7' | 'racha30', number]>([
    ['racha7', 7],
    ['racha30', 30],
  ])('%s: el número grande y «días seguidos»; la racha no se repite como contador', (principal, n) => {
    const textos = textosDeLaPantalla(momento({ principal, rachaActual: n }));
    expect(textos.numeroGrande).toBe(n);
    expect(textos.titulo).toBe('días seguidos');
    expect(textos.anuncio.startsWith(`${n} días seguidos`)).toBe(true);
    expect(textos.contadores.map(c => c.clave)).toEqual(['puntos']);
  });
  it('fase: «¡Entraste en la Fase N · nombre!» con el animal; lo que coincidió va como línea', () => {
    const textos = textosDeLaPantalla(
      momento({ principal: 'fase', otros: ['racha7', 'todosLosHabitos'], fase: { numero: 2, nombre: 'El Ciclo Alquímico', animal } }),
    );
    expect(textos.titulo).toBe('¡Entraste en la Fase 2 · El Ciclo Alquímico!');
    expect(textos.bajada).toBe('Tu animal: Gorila');
    expect(textos.lineas).toEqual(['Y llevas 7 días seguidos', 'Y cumpliste todos tus hábitos de hoy']);
  });
  it('sin dato del servidor no hay contador (nada inventado)', () => {
    expect(textosDeLaPantalla(momento({ puntosHoy: null, rachaActual: null })).contadores).toEqual([]);
  });
  it('«reducir movimiento»: imagen quieta, fundido, sin brasas y los números ya puestos', () => {
    expect(planDeLaPantalla(true)).toEqual({ fenix: 'imagen', entrada: 'fundido', brasas: false, contadoresSuben: false });
    expect(planDeLaPantalla(false)).toEqual({ fenix: 'rive', entrada: 'resorte', brasas: true, contadoresSuben: true });
  });
});

const porTestID = (raiz: ReturnType<typeof crear>, id: string) => raiz.root.findAll(n => n.props.testID === id && typeof n.type !== 'string');

describe('PantallaDeCelebracion', () => {
  it('el fénix grande celebra con trgCelebrate, hay brasas y vibra una vez al aparecer', async () => {
    jest.useFakeTimers();
    const raiz = crear(React.createElement(PantallaDeCelebracion, { momento: momento({}), animo: 'alegre', onCerrar: () => undefined }));
    expect(vistasRive(raiz)).toHaveLength(1);
    const rive = ultimaVistaRive();
    act(() => emitir(vistasRive(raiz)[0], 'PHOENIX_READY'));
    /* El Director anticipa 160 ms (ojos, agacharse) antes del salto. */
    await act(async () => {
      jest.advanceTimersByTime(400);
      await vaciarPromesas();
    });
    expect(disparos(rive)).toContain('trgCelebrate');
    expect(porTestID(raiz, 'brasas-doradas').length).toBeGreaterThan(0);
    expect(mockTacto.hito).toHaveBeenCalledTimes(1);
  });

  it('con «reducir movimiento»: el fénix es su imagen, sin Rive y sin brasas', () => {
    mockSesion.reducido = true;
    const raiz = crear(React.createElement(PantallaDeCelebracion, { momento: momento({}), animo: 'alegre', onCerrar: () => undefined }));
    expect(raiz.root.findAll(n => n.props.testID === 'rive-del-fenix')).toHaveLength(0);
    expect(porTestID(raiz, 'fenix-celebrando-quieto').length).toBeGreaterThan(0);
    expect(porTestID(raiz, 'brasas-doradas')).toHaveLength(0);
  });

  it('fase nueva: el animal junto al fénix', () => {
    const raiz = crear(
      React.createElement(PantallaDeCelebracion, {
        momento: momento({ principal: 'fase', fase: { numero: 2, nombre: 'El Ciclo Alquímico', animal } }),
        animo: 'neutral',
        onCerrar: () => undefined,
      }),
    );
    expect(porTestID(raiz, 'animal-de-la-fase').length).toBeGreaterThan(0);
  });

  it('«Seguir» cierra después de la salida corta, una sola vez', () => {
    jest.useFakeTimers();
    const onCerrar = jest.fn();
    const raiz = crear(React.createElement(PantallaDeCelebracion, { momento: momento({}), animo: 'alegre', onCerrar }));
    const seguir = raiz.root.findAll(n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function' && n.props.accessibilityLabel === undefined);
    act(() => {
      seguir[0].props.onPress();
      seguir[0].props.onPress();
    });
    expect(onCerrar).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(PANTALLA_MS.salida));
    expect(onCerrar).toHaveBeenCalledTimes(1);
    expect(PANTALLA_MS.salida).toBeLessThanOrEqual(200);
  });

  it('se cierra sola', async () => {
    jest.useFakeTimers();
    const onCerrar = jest.fn();
    crear(React.createElement(PantallaDeCelebracion, { momento: momento({}), animo: 'alegre', onCerrar }));
    await act(async () => {
      await vaciarPromesas();
      jest.advanceTimersByTime(PANTALLA_MS.autocierre + PANTALLA_MS.salida);
    });
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });
});

describe('dónde y cuándo aparece', () => {
  async function cumplirUnHabito() {
    await act(async () => {
      avisarHabitoCumplido({ registroId: 'r1', puntosOtorgados: 10 });
      jest.advanceTimersByTime(1000);
      await vaciarPromesas();
    });
  }

  it('un hábito suelto (sin cerrar el día ni llegar a 7 o 30) nunca abre la pantalla', async () => {
    jest.useFakeTimers();
    const raiz = crear(React.createElement(AnfitrionDeCelebraciones));
    await cumplirUnHabito();
    expect(momentoGrandeActual()).toBeNull();
    expect(porTestID(raiz, 'pantalla-de-celebracion')).toHaveLength(0);
  });

  it('el hábito que cierra el día abre «¡Día completo!» desde cualquier pestaña, con los puntos del servidor', async () => {
    jest.useFakeTimers();
    await AsyncStorage.setItem('yo.faseVista.u1', '2');
    mockServidor.home = { rachaActual: 3, habitosHoy: { completados: 3, total: 3 }, fase: 'PHASE_2_DEVELOPMENT' };
    const raiz = crear(React.createElement(AnfitrionDeCelebraciones));
    await cumplirUnHabito();
    expect(momentoGrandeActual()).toMatchObject({ principal: 'todosLosHabitos', otros: [], puntosHoy: 25, rachaActual: 3 });
    expect(porTestID(raiz, 'pantalla-de-celebracion').length).toBeGreaterThan(0);
  });

  it('si coinciden, una sola pantalla con la de mayor jerarquía; y una sola por día', async () => {
    await AsyncStorage.setItem('yo.faseVista.u1', '1');
    const resumen = { rachaActual: 7, habitosHoy: { completados: 3, total: 3 }, fase: 'PHASE_2_DEVELOPMENT' };
    await revisarHitosDelDia('u1', resumen, new Date(2026, 9, 7, 20, 0));
    expect(momentoGrandeActual()).toMatchObject({ principal: 'fase', otros: ['racha7', 'todosLosHabitos'] });
    expect(momentoGrandeActual()?.fase).toMatchObject({ numero: 2, nombre: 'El Ciclo Alquímico' });
    reiniciarMomentoGrandeParaPruebas();
    await revisarHitosDelDia('u1', resumen, new Date(2026, 9, 7, 21, 0));
    expect(momentoGrandeActual()).toBeNull();
  });

  it('un solo lienzo Rive: con la pantalla a la vista, el fénix del centro de Hoy pasa a su foto', async () => {
    jest.useFakeTimers();
    await AsyncStorage.setItem('yo.faseVista.u1', '2');
    const hoy = crear(React.createElement(OrbeAcompanante, { fase: 'reposo', diametro: 140, onTocar: () => undefined }));
    expect(vistasRive(hoy)).toHaveLength(1);
    mockServidor.home = { rachaActual: 3, habitosHoy: { completados: 3, total: 3 }, fase: 'PHASE_2_DEVELOPMENT' };
    const anfitrion = crear(React.createElement(AnfitrionDeCelebraciones));
    await cumplirUnHabito();
    expect(vistasRive(hoy)).toHaveLength(0);
    expect(hoy.root.findAll(n => n.props.testID === 'fenix-de-ser-quieto').length).toBeGreaterThan(0);
    expect(vistasRive(anfitrion)).toHaveLength(1);
  });
});
