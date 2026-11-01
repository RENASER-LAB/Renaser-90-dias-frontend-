/** «Fichas» MONTADA: la lista con las dos fichas, el editor al tocar el diagnóstico y el atrás un nivel por vez. */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: (props: { children: unknown }) => props.children,
}));
jest.mock('../../../utils/tacto', () => ({ tacto: { seleccion: () => undefined, error: () => undefined, logro: () => undefined } }));
jest.mock('../../admin/utils/dialogo', () => ({ confirmar: async () => true, avisar: () => undefined }));
const mockLeer = jest.fn<() => Promise<unknown>>();
jest.mock('../api/diagnosticoAdminApi', () => ({
  ...(jest.requireActual('../api/diagnosticoAdminApi') as object),
  leerBorradorDelDiagnostico: () => mockLeer(),
}));

import { ApiError } from '../../../services/http/apiClient';
import { FichasAdminScreen } from '../screens/FichasAdminScreen';
import { fichaDePrueba } from './fixtures';
import { crearAyudas } from './montaje';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const BORRADOR = {
  publicada: { version: 3, publicadaEn: '2026-10-31T15:04:00Z', publicadaPor: { id: 'u1', nombre: 'Ana' } },
  hayCambiosSinPublicar: true,
  puedePublicar: { ok: true, motivos: [] },
  secciones: fichaDePrueba(),
  retiradas: [],
  totales: { secciones: 6, preguntas: 29 },
};

const onBack = jest.fn();
let raiz: ReactTestRenderer | null = null;
const ayudas = crearAyudas(() => raiz!);
const { hay, tocar, textos } = ayudas;
const montar = async () => {
  await act(async () => { raiz = TestRenderer.create(React.createElement(FichasAdminScreen, { onBack })); });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockLeer.mockResolvedValue(BORRADOR);
});
afterEach(async () => {
  if (raiz) await act(async () => { raiz!.unmount(); });
  raiz = null;
});

describe('Fichas', () => {
  it('lista las dos fichas: el diagnóstico con su estado y la estándar que no se edita', async () => {
    await montar();
    expect(hay('Diagnóstico inicial')).toBe(true);
    expect(hay('29 preguntas · 6 secciones')).toBe(true);
    expect(hay('Publicado el 31 oct por Ana · versión 3')).toBe(true);
    expect(hay('Tiene cambios sin publicar')).toBe(true);
    expect(hay('Ficha inicial estándar')).toBe(true);
    expect(hay('La de siempre. No se edita aquí.')).toBe(true);
    // La estándar no se abre: no hay nada tocable que la nombre.
    const tocables = raiz!.root.findAll(n => typeof n.props.onPress === 'function' && /estándar/.test(String(n.props.accessibilityLabel ?? '')));
    expect(tocables).toHaveLength(0);
  });

  it('sin versión publicada dice «Todavía sin publicar»', async () => {
    mockLeer.mockResolvedValue({ ...BORRADOR, publicada: null });
    await montar();
    expect(hay('Todavía sin publicar')).toBe(true);
  });

  it('tocar el diagnóstico abre el editor; el atrás vuelve a la lista y de ahí a Más opciones', async () => {
    await montar();
    await tocar('Diagnóstico inicial');
    expect(hay('¿Cuál es tu nombre completo?')).toBe(true);
    expect(onBack).not.toHaveBeenCalled();
    // El editor tiene su botón «Volver» en la cabecera.
    await act(async () => { raiz!.root.findAll(n => n.props.accessibilityLabel === 'Volver' && typeof n.props.onPress === 'function')[0].props.onPress(); });
    expect(hay('29 preguntas · 6 secciones')).toBe(true);
    expect(hay('¿Cuál es tu nombre completo?')).toBe(false);
    await act(async () => { raiz!.root.findAll(n => n.props.accessibilityLabel === 'Volver' && typeof n.props.onPress === 'function')[0].props.onPress(); });
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('cargando, sin permiso y sin la función del servidor, lo dice sin pantalla rota', async () => {
    mockLeer.mockReturnValue(new Promise(() => undefined));
    await montar();
    expect(hay('Cargando las fichas…')).toBe(true);
    mockLeer.mockRejectedValue(new ApiError(403, 'no'));
    await montar();
    expect(hay('Tu cuenta no tiene permiso para administrar las fichas.')).toBe(true);
    expect(textos().includes('Reintentar')).toBe(false);
    mockLeer.mockRejectedValue(new ApiError(404, 'no'));
    await montar();
    expect(hay('Esta versión del servidor todavía no tiene las fichas con diagnóstico.')).toBe(true);
  });

  it('un fallo de red ofrece reintentar', async () => {
    mockLeer.mockRejectedValue(new ApiError(0, 'sin red'));
    await montar();
    expect(hay('Sin conexión con el servidor.')).toBe(true);
    mockLeer.mockResolvedValue(BORRADOR);
    await tocar('Reintentar');
    expect(hay('29 preguntas · 6 secciones')).toBe(true);
  });
});
