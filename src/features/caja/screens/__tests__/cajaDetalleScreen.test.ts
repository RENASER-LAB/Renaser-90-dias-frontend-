import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * El detalle de una caja para el Admin (D-219, spec §7 y §9): el botón del estado, «Marcar enviada»
 * apagado mientras falte algo (y diciendo qué), y el 409 del servidor mostrado con su motivo.
 */

type Detalle = Record<string, unknown>;
const mockLeer = jest.fn<(id: string) => Promise<Detalle>>();
const mockAccion = jest.fn<(id: string, accion: string) => Promise<Detalle>>();
const mockEnviar = jest.fn<(id: string, datos: unknown) => Promise<Detalle>>();
const mockChecklist = jest.fn<(id: string, marcados: string[]) => Promise<Detalle>>();

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
jest.mock('../../../renasia/components/RenasiaLauncher', () => ({ ESPACIO_PARA_LANZADOR: 0 }));
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
jest.mock('../../../admin/utils/dialogo', () => ({ confirmar: async () => true, avisar: () => undefined }));
jest.mock('../../components/ImagenDeLaCaja', () => ({ ImagenDeLaCaja: () => null }));
jest.mock('../../components/CartaDeLaCaja', () => ({ CartaDeLaCaja: () => null }));
jest.mock('../../api/cajaApi', () => ({
  leerCaja: (id: string) => mockLeer(id),
  ejecutarAccion: (id: string, accion: string) => mockAccion(id, accion),
  marcarEnviada: (id: string, datos: unknown) => mockEnviar(id, datos),
  guardarChecklist: (id: string, marcados: string[]) => mockChecklist(id, marcados),
  marcarEntregada: async () => ({}),
  reportarProblema: async () => ({}),
}));

import { ApiError } from '../../../../services/http/apiClient';
import { CajaDetalleScreen } from '../CajaDetalleScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ARMANDO: Detalle = {
  aprendizId: 'a-1',
  nombre: 'Ana Torres',
  estado: 'ARMANDO',
  contenido: [
    { valor: 'LIBRETA', etiqueta: 'Libreta', marcado: true },
    { valor: 'TAZA', etiqueta: 'Taza', marcado: false },
  ],
  faltaParaEnviar: ['CONTENIDO', 'FOTO'],
  historial: [{ envio: 1, estado: 'ARMANDO', en: '2026-09-27T15:00:00Z', porNombre: 'Rosa' }],
};

async function montar(detalle: Detalle): Promise<ReactTestRenderer> {
  mockLeer.mockResolvedValue(detalle);
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(CajaDetalleScreen, { aprendizId: 'a-1', onVolver: () => undefined }));
  });
  return r;
}

function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
}

const pulsable = (r: ReactTestRenderer, etiqueta: string) =>
  r.root.findAll(
    n =>
      typeof n.props.onPress === 'function' &&
      !!n.props.accessibilityRole &&
      String(n.props.accessibilityLabel ?? '').startsWith(etiqueta),
  )[0];

beforeEach(() => {
  mockLeer.mockReset();
  mockAccion.mockReset();
  mockEnviar.mockReset();
  mockChecklist.mockReset();
});

describe('la caja mientras se arma', () => {
  it('«Marcar enviada» está apagado y dice qué falta', async () => {
    const r = await montar(ARMANDO);
    const enviar = pulsable(r, 'Marcar enviada');
    expect(enviar.props.disabled).toBe(true);
    expect(textos(r)).toContain('Falta: contenido, foto de la caja, por dónde se envió, código');
    expect(textos(r)).toContain('Armando · 27 sep · Rosa');
  });

  it('con todo lo del servidor y el formulario lleno, se marca enviada con esos datos', async () => {
    const r = await montar({ ...ARMANDO, faltaParaEnviar: [] });
    const campo = (rotulo: string) =>
      r.root.findAll(n => n.props.accessibilityLabel === rotulo && typeof n.props.onChangeText === 'function')[0];
    act(() => campo('Por dónde se envió').props.onChangeText('Courier'));
    act(() => pulsable(r, 'Olva').props.onPress());
    act(() => campo('Código').props.onChangeText('OL-9'));
    act(() => campo('Costo (S/)').props.onChangeText('12,5'));
    mockEnviar.mockResolvedValue({ ...ARMANDO, estado: 'ENVIADA', faltaParaEnviar: [] });
    const enviar = pulsable(r, 'Marcar enviada');
    expect(enviar.props.disabled).toBe(false);
    await act(async () => {
      await enviar.props.onPress();
    });
    expect(mockEnviar).toHaveBeenCalledWith('a-1', { medio: 'Courier', courier: 'Olva', codigo: 'OL-9', costo: 12.5 });
    expect(pulsable(r, 'Marcar entregada')).toBeDefined();
  });

  it('tocar un elemento del checklist lo guarda con todos los marcados', async () => {
    const r = await montar(ARMANDO);
    mockChecklist.mockResolvedValue({ ...ARMANDO, faltaParaEnviar: ['FOTO'] });
    await act(async () => {
      pulsable(r, 'Taza').props.onPress();
    });
    expect(mockChecklist).toHaveBeenCalledWith('a-1', ['LIBRETA', 'TAZA']);
  });
});

describe('los otros estados', () => {
  it('por revisar: «Empezar a armar» y «Ya se envió antes»', async () => {
    const r = await montar({ aprendizId: 'a-1', estado: 'POR_REVISAR' });
    expect(pulsable(r, 'Empezar a armar')).toBeDefined();
    expect(pulsable(r, 'Ya se envió antes')).toBeDefined();
    expect(pulsable(r, 'Marcar enviada')).toBeUndefined();
  });

  it('un 409 del servidor se muestra con su motivo, sin romper la pantalla', async () => {
    const r = await montar({ aprendizId: 'a-1', estado: 'EN_EVALUACION' });
    mockAccion.mockRejectedValue(new ApiError(409, 'Otro Admin ya la aprobó.'));
    await act(async () => {
      await pulsable(r, 'Aprobar para la caja').props.onPress();
    });
    expect(mockAccion).toHaveBeenCalledWith('a-1', 'aprobar');
    expect(textos(r)).toContain('Otro Admin ya la aprobó.');
  });

  it('entregada: sin botones', async () => {
    const r = await montar({ aprendizId: 'a-1', estado: 'ENTREGADA' });
    for (const etiqueta of ['Aprobar para la caja', 'Empezar a armar', 'Marcar enviada', 'Marcar entregada', 'Reenviar']) {
      expect(pulsable(r, etiqueta)).toBeUndefined();
    }
  });
});
