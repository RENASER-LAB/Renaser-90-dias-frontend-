/** «Asignar a varias personas» MONTADA (spec 026-9): búsqueda como en Personas, marcar, una confirmación y «12 asignadas · 2 omitidas». */
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
const mockLogro = jest.fn();
jest.mock('../../../utils/tacto', () => ({ tacto: { seleccion: () => undefined, error: () => undefined, logro: () => mockLogro() } }));
const mockConfirmar = jest.fn<(...a: unknown[]) => Promise<boolean>>();
jest.mock('../../admin/utils/dialogo', () => ({ confirmar: (...a: unknown[]) => mockConfirmar(...a), avisar: () => undefined }));
const mockListar = jest.fn<(...a: unknown[]) => Promise<unknown>>();
jest.mock('../../admin/api/adminApi', () => ({ listarAprendices: (...a: unknown[]) => mockListar(...a) }));
const mockAsignar = jest.fn<(...a: unknown[]) => Promise<unknown>>();
jest.mock('../api/diagnosticoAdminApi', () => ({
  ...(jest.requireActual('../api/diagnosticoAdminApi') as object),
  asignarFicha: (...a: unknown[]) => mockAsignar(...a),
}));

import { ApiError } from '../../../services/http/apiClient';
import { AsignarDiagnosticoVariasScreen } from '../screens/AsignarDiagnosticoVariasScreen';
import { crearAyudas } from './montaje';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const persona = (id: string, nombre: string, extra: object = {}) => ({
  id, fullName: nombre, email: `${id}@x.pe`, status: 'ACTIVE', programDay: 12, cellId: 'g1', mentorId: null, ...extra,
});
const PAGINA = { content: [persona('u1', 'Ana Pérez'), persona('u2', 'Luis Rojas', { formation: 'DIPLOMADO' }), persona('u3', 'Eva Soto')], total: 3, page: 0, size: 20 };

const onVolver = jest.fn();
let raiz: ReactTestRenderer | null = null;
const { hay, textos, tocar, tocarPorEtiqueta, tocablePorEtiqueta, escribir } = crearAyudas(() => raiz!);
const montar = async () => {
  await act(async () => { raiz = TestRenderer.create(React.createElement(AsignarDiagnosticoVariasScreen, { onVolver })); });
};
const marcar = (nombre: string) => {
  const n = raiz!.root.findAll(x => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string' && x.props.accessibilityLabel.startsWith(`${nombre}.`))[0];
  return act(async () => { await n.props.onPress(); });
};
const esperar = (ms: number) => act(async () => { jest.advanceTimersByTime(ms); });

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockConfirmar.mockResolvedValue(true);
  mockListar.mockResolvedValue(PAGINA);
  mockAsignar.mockResolvedValue({ asignadas: 2, omitidas: [{ id: 'u3', nombre: 'Eva Soto', motivo: 'Ya respondió su ficha' }] });
});
afterEach(async () => {
  if (raiz) await act(async () => { raiz!.unmount(); });
  raiz = null;
  jest.useRealTimers();
});

describe('asignar el diagnóstico a varias personas', () => {
  it('lista a las personas como «Personas», sin botón de asignar hasta marcar a alguien', async () => {
    await montar();
    expect(mockListar).toHaveBeenCalledWith({ pagina: 0, tamano: 20, busqueda: '', formacion: null, soloActivas: true });
    expect(hay('Ana Pérez')).toBe(true);
    expect(hay('Día 12 · Diplomado')).toBe(true);
    expect(hay('Marca a las personas que quieres incluir')).toBe(true);
    expect(textos().includes('Asignar el diagnóstico')).toBe(false);
  });

  it('marcar cuenta; una confirmación; manda los ids y dice «2 asignadas · 1 omitida» con el motivo', async () => {
    await montar();
    await marcar('Ana Pérez');
    await marcar('Luis Rojas');
    await marcar('Eva Soto');
    expect(hay('3 personas marcadas')).toBe(true);
    await tocar('Asignar el diagnóstico');
    expect(mockConfirmar).toHaveBeenCalledWith('¿Asignar el diagnóstico a 3 personas?', expect.stringContaining('Completa tu diagnóstico'), expect.anything());
    expect(mockAsignar).toHaveBeenCalledWith(['u1', 'u2', 'u3'], 'CON_DIAGNOSTICO');
    expect(mockLogro).toHaveBeenCalled();
    expect(hay('2 asignadas · 1 omitida')).toBe(true);
    expect(hay('Eva Soto')).toBe(true);
    expect(hay('Ya respondió su ficha')).toBe(true);
    // La selección se vacía y «Entendido» cierra el resultado.
    expect(hay('Marca a las personas que quieres incluir')).toBe(true);
    await tocar('Entendido');
    expect(hay('Ya respondió su ficha')).toBe(false);
  });

  it('si no se confirma, no se asigna', async () => {
    mockConfirmar.mockResolvedValue(false);
    await montar();
    await marcar('Ana Pérez');
    await tocar('Asignar el diagnóstico');
    expect(mockAsignar).not.toHaveBeenCalled();
    expect(hay('1 persona marcada')).toBe(true);
  });

  it('«Marcar las de esta lista» marca todas y vuelve a tocarlo las quita', async () => {
    await montar();
    await tocar('Marcar las de esta lista');
    expect(hay('3 personas marcadas')).toBe(true);
    await tocar('Quitar las marcas de esta lista');
    expect(hay('Marca a las personas que quieres incluir')).toBe(true);
  });

  it('buscar pide al servidor tras una pausa y lo marcado se conserva', async () => {
    await montar();
    await marcar('Ana Pérez');
    mockListar.mockResolvedValue({ content: [persona('u9', 'Beto Luna')], total: 1, page: 0, size: 20 });
    await escribir('Buscar personas', 'beto');
    expect(mockListar).toHaveBeenCalledTimes(1);
    await esperar(400);
    expect(mockListar).toHaveBeenLastCalledWith({ pagina: 0, tamano: 20, busqueda: 'beto', formacion: null, soloActivas: true });
    expect(hay('Beto Luna')).toBe(true);
    expect(hay('1 persona marcada')).toBe(true);
    await marcar('Beto Luna');
    expect(hay('2 personas marcadas')).toBe(true);
    await tocar('Asignar el diagnóstico');
    expect(mockAsignar).toHaveBeenCalledWith(['u1', 'u9'], 'CON_DIAGNOSTICO');
  });

  it('el filtro de formación va al servidor', async () => {
    await montar();
    await tocarPorEtiqueta('Diplomado');
    expect(mockListar).toHaveBeenLastCalledWith({ pagina: 0, tamano: 20, busqueda: '', formacion: 'DIPLOMADO', soloActivas: true });
  });

  it('«Ver más» trae la página siguiente y las suma', async () => {
    mockListar.mockResolvedValueOnce({ content: [persona('u1', 'Ana Pérez')], total: 2, page: 0, size: 20 });
    await montar();
    expect(hay('Ver más (1 de 2)')).toBe(true);
    mockListar.mockResolvedValueOnce({ content: [persona('u2', 'Luis Rojas')], total: 2, page: 1, size: 20 });
    await tocar('Ver más (1 de 2)');
    expect(mockListar).toHaveBeenLastCalledWith({ pagina: 1, tamano: 20, busqueda: '', formacion: null, soloActivas: true });
    expect(hay('Luis Rojas')).toBe(true);
    expect(hay('Ana Pérez')).toBe(true);
  });

  it('un fallo al asignar se dice con su motivo y conserva lo marcado', async () => {
    mockAsignar.mockRejectedValue(new ApiError(403, 'no'));
    await montar();
    await marcar('Ana Pérez');
    await tocar('Asignar el diagnóstico');
    expect(hay('Tu cuenta no tiene permiso para esto.')).toBe(true);
    expect(hay('1 persona marcada')).toBe(true);
  });

  it('un fallo al listar se dice; sin coincidencias también', async () => {
    mockListar.mockRejectedValue(new ApiError(0, 'sin red'));
    await montar();
    expect(hay('Sin conexión con el servidor.')).toBe(true);
    mockListar.mockResolvedValue({ content: [], total: 0, page: 0, size: 20 });
    await escribir('Buscar personas', 'zzz');
    await esperar(400);
    expect(hay('Nadie coincide con "zzz".')).toBe(true);
  });

  it('el botón «Volver» sube un nivel', async () => {
    await montar();
    await act(async () => { botonVolver().props.onPress(); });
    expect(onVolver).toHaveBeenCalledTimes(1);
  });
});

function botonVolver() {
  return tocablePorEtiqueta('Volver');
}
