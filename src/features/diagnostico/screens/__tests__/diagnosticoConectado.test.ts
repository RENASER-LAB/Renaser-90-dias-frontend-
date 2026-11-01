import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * El diagnóstico de la persona conectado al servidor (spec 026): abrir, guardar cada paso, terminar, y lo que pasa ANTES de que
 * haya recorrido (404, 409, sin red). Los dos envoltorios —la ficha de ingreso y «Completa tu diagnóstico» para quien ya estaba
 * dentro— comparten todo; cambian la cabecera de los avisos y lo que dice el cierre sobre qué sigue.
 */

const mockAbrir = jest.fn<() => Promise<unknown>>();
const mockGuardar = jest.fn<(r: unknown) => Promise<number>>();
const mockTerminar = jest.fn<() => Promise<unknown>>();
const mockAvanzar = jest.fn<(e: unknown) => Promise<unknown>>();
let mockAtras: (() => boolean | void) | null = null;

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: jest.fn(), error: jest.fn(), logro: jest.fn() } }));
jest.mock('../../../../hooks/useSystemBackHandler', () => ({
  useSystemBackHandler: (manejador: () => boolean | void, activo = true) => {
    if (activo) mockAtras = manejador;
  },
}));
jest.mock('../../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u-1' } }) }));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../api/diagnosticoApi', () => ({
  ...jest.requireActual<object>('../../api/diagnosticoApi'),
  abrirMiDiagnostico: () => mockAbrir(),
  guardarRespuestasDelDiagnostico: (r: unknown) => mockGuardar(r),
  terminarMiDiagnostico: () => mockTerminar(),
}));
jest.mock('../../../onboarding/api/onboardingApi', () => ({ avanzarEstado: (e: unknown) => mockAvanzar(e) }));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { ApiError } from '../../../../services/http/apiClient';
import { botonDe, hayBoton, pasoQueSeVe, pulsar, textos, tocar, vaciar } from '../../components/__tests__/ayudasDePrueba';
import { escucharDiagnosticoTerminado } from '../../events/avisoDiagnosticoTerminado';
import { diagnosticoDeEjemplo, respuestasCompletas, seccionesDeEjemplo } from '../../__tests__/fixturesDelDiagnostico';
import { armarPasos } from '../../utils/pasosDelRecorrido';
import { valoresIniciales } from '../../utils/respuestasEnEdicion';
import { CompletarDiagnosticoScreen } from '../CompletarDiagnosticoScreen';
import { DiagnosticoDeLaPersonaScreen } from '../DiagnosticoDeLaPersonaScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const RESULTADO = {
  estado: 'COMPLETADO',
  objetivos: [{ eje: 'TRABAJO', texto: 'Duplicar mis ventas.' }],
  prioridad: 'TRABAJO',
  primeraAccion: null,
};
const onTerminado = jest.fn();
const onSalir = jest.fn();
let raiz: ReactTestRenderer | null = null;

async function montar(tipo: 'ingreso' | 'dentro'): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r =
      tipo === 'ingreso'
        ? TestRenderer.create(React.createElement(DiagnosticoDeLaPersonaScreen, { onTerminado, onSalir }))
        : TestRenderer.create(React.createElement(CompletarDiagnosticoScreen, { onBack: onSalir, onTerminado }));
    await vaciar();
  });
  raiz = r;
  return r;
}

/** Un diagnóstico con todo respondido, parado en el último paso: un «Terminar» y listo. */
function enElUltimoPaso() {
  const base = diagnosticoDeEjemplo({ respuestas: respuestasCompletas(false) });
  const total = armarPasos(seccionesDeEjemplo(), valoresIniciales(base)).length;
  return { datos: { ...base, paso: total - 1, estado: 'EN_CURSO' as const }, total };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockAbrir.mockReset().mockResolvedValue(diagnosticoDeEjemplo());
  mockGuardar.mockReset().mockResolvedValue(1);
  mockTerminar.mockReset().mockResolvedValue(RESULTADO);
  mockAvanzar.mockReset().mockResolvedValue({});
  onTerminado.mockReset();
  onSalir.mockReset();
  mockAtras = null;
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('antes del recorrido', () => {
  it('abre el diagnóstico de la persona y muestra su portada', async () => {
    const r = await montar('ingreso');
    expect(mockAbrir).toHaveBeenCalledTimes(1);
    expect(textos(r)).toContain('Tiempo estimado: 15 minutos');
    expect(hayBoton(r, 'EMPEZAR')).toBe(true);
  });

  it('404: «Todavía no tienes un diagnóstico disponible.» con «Reintentar», que vuelve a pedir', async () => {
    mockAbrir.mockRejectedValueOnce(new ApiError(404, 'No existe'));
    const r = await montar('ingreso');
    expect(textos(r)).toContain('Todavía no tienes un diagnóstico disponible.');
    expect(hayBoton(r, 'REINTENTAR')).toBe(true);
    await pulsar(r, 'REINTENTAR');
    expect(mockAbrir).toHaveBeenCalledTimes(2);
    expect(textos(r)).toContain('Tiempo estimado: 15 minutos');
  });

  it('409: ya lo terminó, así que avisa que terminó y no muestra nada más', async () => {
    mockAbrir.mockRejectedValueOnce(new ApiError(409, 'Ya lo terminaste'));
    const r = await montar('ingreso');
    expect(onTerminado).toHaveBeenCalledTimes(1);
    expect(textos(r)).not.toContain('Tiempo estimado');
  });

  it('sin red: lo dice con «Reintentar» y no se queda atrapada (hay salida)', async () => {
    mockAbrir.mockRejectedValueOnce(new ApiError(0, 'sin red'));
    const r = await montar('ingreso');
    expect(textos(r)).toContain('No pudimos cargar tu diagnóstico. Revisa tu conexión.');
    await pulsar(r, 'REINTENTAR');
    expect(textos(r)).toContain('Tiempo estimado: 15 minutos');
    // Una respuesta que no es un diagnóstico también se trata como un fallo, no como una pantalla vacía.
    mockAbrir.mockResolvedValueOnce(null);
    act(() => raiz?.unmount());
    const otra = await montar('ingreso');
    expect(textos(otra)).toContain('No pudimos cargar tu diagnóstico');
  });

  it('en las pantallas de aviso, el atrás del sistema y la flecha salen (en el ingreso, cierra la sesión)', async () => {
    mockAbrir.mockRejectedValue(new ApiError(404, 'No existe'));
    const r = await montar('ingreso');
    expect(mockAtras?.()).toBe(true);
    expect(onSalir).toHaveBeenCalledTimes(1);
    await tocar(r, 'Salir del diagnóstico');
    expect(onSalir).toHaveBeenCalledTimes(2);
  });

  it('para quien ya está dentro, los avisos llevan la cabecera «Diagnóstico» con su flecha', async () => {
    mockAbrir.mockRejectedValue(new ApiError(404, 'No existe'));
    const r = await montar('dentro');
    expect(textos(r)).toContain('Diagnóstico');
    await tocar(r, 'Volver');
    expect(onSalir).toHaveBeenCalledTimes(1);
  });
});

describe('guardar y terminar', () => {
  it('cada paso guarda las respuestas y mueve el cursor de reanudación (flow diagnostico, step = el paso al que llega)', async () => {
    const r = await montar('ingreso');
    await pulsar(r, 'EMPEZAR');
    mockGuardar.mockClear();
    // El nombre y la ciudad vienen precargados; falta la edad: se completa el paso y se avanza.
    await act(async () => {
      r.root.findAll(n => n.props.accessibilityLabel === '¿Qué edad tienes?' && typeof n.props.onChangeText === 'function')[0].props.onChangeText('34');
      await vaciar();
    });
    await pulsar(r, 'SIGUIENTE');
    expect(mockGuardar).toHaveBeenCalledTimes(1);
    const enviadas = mockGuardar.mock.calls[0][0] as Array<{ preguntaId: number }>;
    expect(enviadas.map(x => x.preguntaId)).toEqual([1, 2, 3]);
    expect(mockAvanzar).toHaveBeenCalledWith({ flow: 'diagnostico', step: 1 });
    expect(pasoQueSeVe(r)).toContain('Paso 2 de');
  });

  it('al terminar llama a terminar, avisa a Hoy y Yo, muestra el cierre y «Continuar» llama a onTerminado', async () => {
    const { datos, total } = enElUltimoPaso();
    mockAbrir.mockResolvedValue(datos);
    const avisos = jest.fn();
    const dejarDeEscuchar = escucharDiagnosticoTerminado(avisos);
    const r = await montar('ingreso');
    expect(pasoQueSeVe(r)).toContain(`Paso ${total} de ${total}`);
    await pulsar(r, 'TERMINAR');
    expect(mockGuardar).toHaveBeenCalledTimes(1);
    expect(mockAvanzar).toHaveBeenCalledWith({ flow: 'diagnostico', step: total - 1 });
    expect(mockTerminar).toHaveBeenCalledTimes(1);
    expect(avisos).toHaveBeenCalledTimes(1);
    dejarDeEscuchar();
    expect(textos(r)).toContain('Tus objetivos ya están preparados');
    expect(textos(r)).toContain('Duplicar mis ventas.');
    expect(textos(r)).toContain('Términos'); // en el ingreso sigue Términos y el Día 1
    expect(onTerminado).not.toHaveBeenCalled();
    await pulsar(r, 'CONTINUAR');
    expect(onTerminado).toHaveBeenCalledTimes(1);
  });

  it('para quien ya está dentro, el cierre manda a Plan en vez de a Términos', async () => {
    mockAbrir.mockResolvedValue(enElUltimoPaso().datos);
    const r = await montar('dentro');
    await pulsar(r, 'TERMINAR');
    expect(textos(r)).toContain('En Plan puedes revisar tus objetivos y confirmarlos.');
    expect(textos(r)).not.toContain('Términos');
  });

  it('si el servidor rechaza solo el cursor de reanudación, el paso se da por guardado (lo respondido está a salvo)', async () => {
    mockAvanzar.mockRejectedValue(new ApiError(400, 'flujo desconocido'));
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const r = await montar('ingreso');
    await pulsar(r, 'EMPEZAR');
    await act(async () => {
      r.root.findAll(n => n.props.accessibilityLabel === '¿Qué edad tienes?' && typeof n.props.onChangeText === 'function')[0].props.onChangeText('34');
      await vaciar();
    });
    await pulsar(r, 'SIGUIENTE');
    expect(textos(r)).not.toContain('No se pudo guardar');
    expect(pasoQueSeVe(r)).toContain('Paso 2 de');
    expect(aviso).toHaveBeenCalled();
    aviso.mockRestore();
  });

  it('si no se pueden guardar las respuestas, NO se avanza ni se mueve el cursor, y se puede reintentar', async () => {
    mockGuardar.mockRejectedValueOnce(new ApiError(0, 'sin red'));
    const r = await montar('ingreso');
    await pulsar(r, 'EMPEZAR');
    await act(async () => {
      r.root.findAll(n => n.props.accessibilityLabel === '¿Qué edad tienes?' && typeof n.props.onChangeText === 'function')[0].props.onChangeText('34');
      await vaciar();
    });
    await pulsar(r, 'SIGUIENTE');
    expect(textos(r)).toContain('No se pudo guardar. Revisa tu conexión.');
    expect(mockAvanzar).not.toHaveBeenCalled();
    expect(pasoQueSeVe(r)).toContain('Paso 1 de');
    await tocar(r, 'Reintentar');
    expect(mockAvanzar).toHaveBeenCalledTimes(1);
    expect(pasoQueSeVe(r)).toContain('Paso 2 de');
  });

  it('si al guardar el servidor dice que ya lo había terminado (409), avisa que terminó', async () => {
    mockGuardar.mockRejectedValueOnce(new ApiError(409, 'Ya terminó'));
    const r = await montar('ingreso');
    await pulsar(r, 'EMPEZAR');
    await act(async () => {
      r.root.findAll(n => n.props.accessibilityLabel === '¿Qué edad tienes?' && typeof n.props.onChangeText === 'function')[0].props.onChangeText('34');
      await vaciar();
    });
    await pulsar(r, 'SIGUIENTE');
    expect(onTerminado).toHaveBeenCalledTimes(1);
  });

  it('el botón de terminar sigue siendo el único camino: sin conexión al terminar, reintenta', async () => {
    mockAbrir.mockResolvedValue(enElUltimoPaso().datos);
    mockTerminar.mockRejectedValueOnce(new ApiError(0, 'sin red'));
    const r = await montar('ingreso');
    await pulsar(r, 'TERMINAR');
    expect(textos(r)).toContain('No se pudo terminar. Revisa tu conexión.');
    expect(botonDe(r, 'TERMINAR')).toBeDefined();
    await tocar(r, 'Reintentar');
    expect(mockTerminar).toHaveBeenCalledTimes(2);
    expect(textos(r)).toContain('Tus objetivos ya están preparados');
  });
});
