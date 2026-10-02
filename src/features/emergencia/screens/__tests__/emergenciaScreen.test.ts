import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Yo → «Tuve una emergencia» (D-244): qué pasó y a qué día volver (de 1 al de hoy), confirmar, y
 * «Recibimos tu pedido». Con un pedido ya abierto, solo eso.
 */

const mockPedir = jest.fn(async (_c: unknown) => ({}));
const mockConfirmar = jest.fn(async (_t: string, _m?: string, _o?: unknown) => true);

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
jest.mock('../../../admin/utils/dialogo', () => ({
  confirmar: (t: string, m?: string, o?: unknown) => mockConfirmar(t, m, o),
  avisar: () => undefined,
}));
jest.mock('../../api/emergenciaApi', () => ({
  pedirAyudaPorEmergencia: (c: unknown) => mockPedir(c),
}));

import type { MiEmergencia } from '../../api/emergenciaSchemas';
import { EmergenciaScreen } from '../EmergenciaScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const onEnviado = jest.fn(async () => undefined);

function montar(mia: MiEmergencia): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(React.createElement(EmergenciaScreen, { mia, onVolver: () => undefined, onEnviado }));
  });
  return r;
}

function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
}

const tocable = (r: ReactTestRenderer, etiqueta: string) =>
  r.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function')[0];

const campo = (r: ReactTestRenderer) =>
  r.root.findAll(n => n.props.accessibilityLabel === 'Qué pasó' && typeof n.props.onChangeText === 'function')[0];

beforeEach(() => {
  mockPedir.mockClear();
  mockConfirmar.mockClear();
  onEnviado.mockClear();
});

describe('Tuve una emergencia', () => {
  it('muestra el día de hoy y arranca el selector ahí, sin pasarse', async () => {
    const r = montar({ diaActual: 20, diaMaximo: 20, abierta: null });
    expect(textos(r)).toContain('Hoy estás en el día 20.');
    expect(tocable(r, 'Un día después').props.disabled).toBe(true);
    expect(r.root.findAll(n => n.props.accessibilityLabel === 'Día 20').length).toBeGreaterThan(0);
  });

  it('pide qué pasó antes de enviar y no llama al servidor', async () => {
    const r = montar({ diaActual: 20, diaMaximo: 20, abierta: null });
    await act(async () => {
      tocable(r, 'Enviar a soporte').props.onPress();
    });
    expect(textos(r)).toContain('Cuéntanos en pocas palabras qué pasó.');
    expect(mockPedir).not.toHaveBeenCalled();
  });

  it('envía lo escrito y el día elegido, confirma, y muestra «Recibimos tu pedido»', async () => {
    const r = montar({ diaActual: 20, diaMaximo: 20, abierta: null });
    act(() => campo(r).props.onChangeText('  Tuve un accidente  '));
    for (let i = 0; i < 8; i++) {
      act(() => tocable(r, 'Un día antes').props.onPress());
    }
    await act(async () => {
      tocable(r, 'Enviar a soporte').props.onPress();
    });

    expect(mockConfirmar).toHaveBeenCalledWith('¿Pedir volver al día 12?', expect.stringContaining('día 20'), expect.anything());
    expect(mockPedir).toHaveBeenCalledWith({ queOcurrio: 'Tuve un accidente', diaPedido: 12 });
    expect(onEnviado).toHaveBeenCalledTimes(1);
    expect(textos(r)).toContain('Recibimos tu pedido');
    expect(textos(r)).toContain('Soporte te va a escribir.');
  });

  it('si cancela la confirmación no se envía', async () => {
    mockConfirmar.mockResolvedValueOnce(false);
    const r = montar({ diaActual: 20, diaMaximo: 20, abierta: null });
    act(() => campo(r).props.onChangeText('Accidente'));
    await act(async () => {
      tocable(r, 'Enviar a soporte').props.onPress();
    });
    expect(mockPedir).not.toHaveBeenCalled();
  });

  it('con un pedido abierto no muestra el formulario: dice a qué día pidió volver', () => {
    const r = montar({
      diaActual: 20,
      diaMaximo: 20,
      abierta: { id: 'p-1', queOcurrio: 'Accidente', diaPedido: 12, diaAlPedir: 20, estado: 'ABIERTA' },
    });
    expect(textos(r)).toContain('Pediste volver al día 12. Soporte te va a escribir.');
    expect(tocable(r, 'Enviar a soporte')).toBeUndefined();
  });
});
