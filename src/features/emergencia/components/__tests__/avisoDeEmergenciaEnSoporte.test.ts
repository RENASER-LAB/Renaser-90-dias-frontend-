import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/** D-244: la franja del pedido de emergencia en el chat de soporte, para quien atiende. */

const mockLeer = jest.fn(async (_id: string): Promise<unknown> => null);
const mockCerrar = jest.fn(async (_id: string) => undefined);

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../../../admin/utils/dialogo', () => ({ confirmar: async () => true, avisar: () => undefined }));
jest.mock('../../api/emergenciaApi', () => ({
  leerEmergenciaAbierta: (id: string) => mockLeer(id),
  cerrarEmergenciaSinCambio: (id: string) => mockCerrar(id),
}));

import { AvisoDeEmergenciaEnSoporte } from '../AvisoDeEmergenciaEnSoporte';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const pedido = {
  id: 'p-1',
  aprendizId: 'a-1',
  nombre: 'Ana Pérez',
  queOcurrio: 'Accidente',
  diaPedido: 12,
  diaAlPedir: 18,
  diaActual: 20,
};

async function montar(onCambiarDia = jest.fn()): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(AvisoDeEmergenciaEnSoporte, { aprendizId: 'a-1', onCambiarDia }));
  });
  return r;
}

/** Lo que se lee en pantalla; vacío si el componente no pinta nada. */
function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string').join(''))
    .join(' | ');
}

const tocable = (r: ReactTestRenderer, etiqueta: string) =>
  r.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function')[0];

beforeEach(() => {
  mockLeer.mockReset();
  mockCerrar.mockClear();
});

describe('AvisoDeEmergenciaEnSoporte', () => {
  it('sin pedido abierto no se ve nada', async () => {
    mockLeer.mockResolvedValue(null);
    const r = await montar();
    expect(textos(r)).toBe('');
  });

  it('si el servidor no deja leerlo (403), tampoco', async () => {
    mockLeer.mockRejectedValue(Object.assign(new Error('x'), { status: 403 }));
    const r = await montar();
    expect(textos(r)).toBe('');
  });

  it('con pedido: el resumen y «Cambiar al día N» abre el cambio con ese pedido', async () => {
    mockLeer.mockResolvedValue(pedido);
    const onCambiarDia = jest.fn();
    const r = await montar(onCambiarDia);
    expect(textos(r)).toContain('Pide volver al día 12 (hoy está en el día 20).');

    act(() => tocable(r, 'Cambiar al día 12').props.onPress());
    expect(onCambiarDia).toHaveBeenCalledWith(pedido);
  });

  it('«Cerrar sin cambiar» lo cierra y la franja desaparece', async () => {
    mockLeer.mockResolvedValue(pedido);
    const r = await montar();
    await act(async () => {
      tocable(r, 'Cerrar sin cambiar').props.onPress();
    });
    expect(mockCerrar).toHaveBeenCalledWith('p-1');
    expect(textos(r)).toBe('');
  });

  it('si ya está en el día pedido, solo se puede cerrar', async () => {
    mockLeer.mockResolvedValue({ ...pedido, diaPedido: 20 });
    const r = await montar();
    expect(tocable(r, 'Cambiar al día 20')).toBeUndefined();
    expect(tocable(r, 'Cerrar sin cambiar')).toBeDefined();
  });
});
