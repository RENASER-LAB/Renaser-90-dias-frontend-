import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/** Yo → «Mi diagnóstico» (spec 026): lo que la persona respondió, en solo lectura, con su cabecera y su atrás. */

const mockLectura = jest.fn<() => Promise<unknown>>();
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
jest.mock('../../../../hooks/useSystemBackHandler', () => ({
  useSystemBackHandler: (manejador: () => boolean | void, activo = true) => {
    if (activo) mockAtras = manejador;
  },
}));
jest.mock('../../api/diagnosticoApi', () => ({ obtenerLecturaDeMiDiagnostico: () => mockLectura() }));
jest.mock('../../../renasia/components/RenasiaLauncher', () => ({ ESPACIO_PARA_LANZADOR: 80 }));

import { ApiError } from '../../../../services/http/apiClient';
import { textos, tocar, vaciar } from '../../components/__tests__/ayudasDePrueba';
import type { LecturaDelDiagnostico } from '../../types/diagnostico.types';
import { MiDiagnosticoScreen } from '../MiDiagnosticoScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LECTURA: LecturaDelDiagnostico = {
  persona: { id: 'p', nombre: 'Yo' },
  ficha: 'CON_DIAGNOSTICO',
  estado: 'COMPLETADO',
  version: 3,
  completadoEn: '2026-11-02T15:04:00Z',
  formacion: null,
  secciones: [{ titulo: 'Tu vida hoy', preguntas: [{ id: 1, texto: '¿Tienes un negocio?', tipo: 'SELECCION_UNICA', retirada: false, respuesta: { texto: 'Sí.', valores: [], filas: [] } }] }],
};

const onBack = jest.fn();

async function montar(): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(MiDiagnosticoScreen, { onBack }));
    await vaciar();
  });
  return r;
}

beforeEach(() => {
  mockLectura.mockReset().mockResolvedValue(LECTURA);
  onBack.mockReset();
  mockAtras = null;
});

describe('MiDiagnosticoScreen', () => {
  it('muestra «Mi diagnóstico» con lo que respondió', async () => {
    const t = textos(await montar());
    expect(t).toContain('Mi diagnóstico');
    expect(t).toContain('Tu vida hoy');
    expect(t).toContain('¿Tienes un negocio?');
    expect(t).toContain('Sí.');
    expect(t).toContain('Completado el 2 de noviembre de 2026');
  });

  it('la flecha y el atrás del sistema vuelven (un nivel: a Yo)', async () => {
    const r = await montar();
    await tocar(r, 'Volver');
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(mockAtras?.()).toBe(true);
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it('sin diagnóstico (404) lo dice', async () => {
    mockLectura.mockRejectedValue(new ApiError(404, 'No existe'));
    expect(textos(await montar())).toContain('Todavía no tienes un diagnóstico disponible.');
  });

  it('si todavía no lo completó, lo dice en segunda persona', async () => {
    mockLectura.mockResolvedValue({ ...LECTURA, estado: 'EN_CURSO', completadoEn: null, secciones: [] });
    expect(textos(await montar())).toContain('Todavía no has completado tu diagnóstico.');
  });

  it('un fallo de red se dice con «Reintentar»', async () => {
    mockLectura.mockRejectedValueOnce(new ApiError(0, 'sin red'));
    const r = await montar();
    expect(textos(r)).toContain('No se pudo cargar el diagnóstico. Revisa tu conexión.');
    await act(async () => {
      r.root.findAll(n => n.props.accessibilityLabel === 'Reintentar' && typeof n.props.onPress === 'function')[0].props.onPress();
      await vaciar();
    });
    expect(textos(r)).toContain('Tu vida hoy');
  });
});
