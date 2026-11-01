import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Qué ficha ve cada persona al entrar (spec 026): la estándar de siempre, o el diagnóstico EN LUGAR de ella. Después, en los dos
 * casos, siguen Términos y «Elige tu Día 1». Las pantallas de cada paso se reemplazan por una etiqueta: aquí solo se prueba
 * cuál se elige y cómo se pasa de una a otra.
 */

const mockObtenerEstado = jest.fn<() => Promise<unknown>>();
const mockEstadoDiagnostico = jest.fn<() => Promise<unknown>>();
const mockCompletar = jest.fn();
const mockLogout = jest.fn();
const capturas: Record<string, Record<string, unknown>> = {};

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../../../auth/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-1', name: 'Ana', email: 'ana@renaser.test' }, completeOnboarding: mockCompletar, logout: mockLogout }),
}));
jest.mock('../../api/onboardingApi', () => ({ obtenerEstado: () => mockObtenerEstado() }));
jest.mock('../../../diagnostico/api/diagnosticoApi', () => ({ obtenerEstadoDeMiDiagnostico: () => mockEstadoDiagnostico() }));

function mockPantalla(nombre: string) {
  return (props: Record<string, unknown>) => {
    capturas[nombre] = props;
    return React.createElement(Text, null, nombre);
  };
}
jest.mock('../FichaInicialScreen', () => ({ FichaInicialScreen: mockPantalla('FICHA ESTANDAR') }));
jest.mock('../TerminosScreen', () => ({ TerminosScreen: mockPantalla('TERMINOS') }));
jest.mock('../ActivarProgramaScreen', () => ({ ActivarProgramaScreen: mockPantalla('ELEGIR DIA 1') }));
jest.mock('../../../diagnostico/screens/DiagnosticoDeLaPersonaScreen', () => ({ DiagnosticoDeLaPersonaScreen: mockPantalla('DIAGNOSTICO') }));
jest.mock('../../../diagnostico/screens/MiDiagnosticoScreen', () => ({ MiDiagnosticoScreen: mockPantalla('LECTURA DEL DIAGNOSTICO') }));

import { OnboardingFlow } from '../OnboardingFlow';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const estado = (extra: Record<string, unknown> = {}) => ({
  userId: 'u-1', completed: false, termsAcceptedAt: null, ficha: 'ESTANDAR', ...extra,
});
const vaciar = () => new Promise<void>(res => setImmediate(res));
let raiz: ReactTestRenderer | null = null;

async function montar(): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(OnboardingFlow));
    await vaciar();
  });
  raiz = r;
  return r;
}
const pantallaActual = (r: ReactTestRenderer) =>
  r.root.findAll(n => (n.type as unknown) === 'Text').map(n => n.props.children).join(',');

beforeEach(() => {
  mockObtenerEstado.mockReset().mockResolvedValue(estado());
  mockEstadoDiagnostico.mockReset().mockResolvedValue({ ficha: 'CON_DIAGNOSTICO', estado: 'PENDIENTE', version: null, completedAt: null });
  mockCompletar.mockReset();
  mockLogout.mockReset();
  for (const k of Object.keys(capturas)) delete capturas[k];
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('la ficha estándar no cambia', () => {
  it('sin el campo `ficha` (un backend anterior) o con ESTANDAR, empieza por la ficha de siempre y no pregunta por el diagnóstico', async () => {
    expect(pantallaActual(await montar())).toBe('FICHA ESTANDAR');
    expect(mockEstadoDiagnostico).not.toHaveBeenCalled();
    act(() => raiz?.unmount());
    mockObtenerEstado.mockResolvedValue({ userId: 'u-1', completed: false, termsAcceptedAt: null });
    expect(pantallaActual(await montar())).toBe('FICHA ESTANDAR');
  });

  it('con Términos ya aceptados salta a «Elige tu Día 1», como antes', async () => {
    mockObtenerEstado.mockResolvedValue(estado({ termsAcceptedAt: '2026-10-30T10:00:00Z' }));
    expect(pantallaActual(await montar())).toBe('ELEGIR DIA 1');
  });

  it('sin red se queda en la ficha, como antes', async () => {
    mockObtenerEstado.mockRejectedValue(new Error('sin red'));
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(pantallaActual(await montar())).toBe('FICHA ESTANDAR');
    aviso.mockRestore();
  });

  it('desde Términos, atrás vuelve a la ficha estándar y terminar la ficha lleva a Términos', async () => {
    const r = await montar();
    await act(async () => {
      (capturas['FICHA ESTANDAR'].onComplete as (d: unknown) => void)({ identidad: { nombre: 'Ana' } });
      await vaciar();
    });
    expect(pantallaActual(r)).toBe('TERMINOS');
    await act(async () => {
      (capturas['TERMINOS'].onBack as () => void)();
      await vaciar();
    });
    expect(pantallaActual(r)).toBe('FICHA ESTANDAR');
  });
});

describe('con diagnóstico', () => {
  beforeEach(() => {
    mockObtenerEstado.mockResolvedValue(estado({ ficha: 'CON_DIAGNOSTICO' }));
  });

  it('el diagnóstico va EN LUGAR de la ficha estándar', async () => {
    const r = await montar();
    expect(pantallaActual(r)).toBe('DIAGNOSTICO');
    expect(r.root.findAll(n => n.props.children === 'FICHA ESTANDAR')).toHaveLength(0);
  });

  it('en curso lo retoma; «Salir» cierra la sesión como la ficha estándar', async () => {
    mockEstadoDiagnostico.mockResolvedValue({ ficha: 'CON_DIAGNOSTICO', estado: 'EN_CURSO', version: 3, completedAt: null });
    const r = await montar();
    expect(pantallaActual(r)).toBe('DIAGNOSTICO');
    (capturas['DIAGNOSTICO'].onSalir as () => void)();
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('al terminar sigue Términos y luego «Elige tu Día 1»; entonces entra a la app SIN ficha estándar', async () => {
    const r = await montar();
    await act(async () => {
      (capturas['DIAGNOSTICO'].onTerminado as () => void)();
      await vaciar();
    });
    expect(pantallaActual(r)).toBe('TERMINOS');
    await act(async () => {
      (capturas['TERMINOS'].onAccept as () => void)();
      await vaciar();
    });
    expect(pantallaActual(r)).toBe('ELEGIR DIA 1');
    await act(async () => {
      (capturas['ELEGIR DIA 1'].onActivated as () => void)();
      await vaciar();
    });
    // No hay ficha estándar que entregar: el diagnóstico ya está en el servidor.
    expect(mockCompletar).toHaveBeenCalledTimes(1);
    expect(mockCompletar).toHaveBeenCalledWith(undefined);
  });

  it('si ya lo terminó y no aceptó Términos, entra directo a Términos', async () => {
    mockEstadoDiagnostico.mockResolvedValue({ ficha: 'CON_DIAGNOSTICO', estado: 'COMPLETADO', version: 3, completedAt: '2026-11-02T15:04:00Z' });
    expect(pantallaActual(await montar())).toBe('TERMINOS');
  });

  it('con Términos ya aceptados salta a «Elige tu Día 1» sin tocar el diagnóstico', async () => {
    mockObtenerEstado.mockResolvedValue(estado({ ficha: 'CON_DIAGNOSTICO', termsAcceptedAt: '2026-10-30T10:00:00Z' }));
    expect(pantallaActual(await montar())).toBe('ELEGIR DIA 1');
    expect(mockEstadoDiagnostico).not.toHaveBeenCalled();
  });

  it('si no se puede saber el estado del diagnóstico (sin red), se abre el diagnóstico, que sabe reintentar', async () => {
    mockEstadoDiagnostico.mockRejectedValue(new Error('sin red'));
    expect(pantallaActual(await montar())).toBe('DIAGNOSTICO');
  });

  it('desde Términos, atrás muestra lo que respondió en solo lectura (no hay ficha que editar) y de ahí vuelve a Términos', async () => {
    const r = await montar();
    await act(async () => {
      (capturas['DIAGNOSTICO'].onTerminado as () => void)();
      await vaciar();
    });
    await act(async () => {
      (capturas['TERMINOS'].onBack as () => void)();
      await vaciar();
    });
    expect(pantallaActual(r)).toBe('LECTURA DEL DIAGNOSTICO');
    await act(async () => {
      (capturas['LECTURA DEL DIAGNOSTICO'].onBack as () => void)();
      await vaciar();
    });
    expect(pantallaActual(r)).toBe('TERMINOS');
  });
});
