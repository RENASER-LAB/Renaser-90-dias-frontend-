/**
 * «Quitar preguntas» y «Retiradas» en el editor MONTADO (spec 026): selección múltiple con contador, una confirmación única, el
 * 409 de las dependientes con su salida, el resultado en palabras y restaurar con el 409 del destino ocupado.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
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
const mockAvisar = jest.fn();
jest.mock('../../admin/utils/dialogo', () => ({
  confirmar: (...a: unknown[]) => mockConfirmar(...a),
  avisar: (...a: unknown[]) => mockAvisar(...a),
}));
jest.mock('../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => ({ HojaDesdeAbajo: () => null }));
const mockQuitar = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const mockRestaurar = jest.fn<(...a: unknown[]) => Promise<unknown>>();
jest.mock('../api/diagnosticoAdminApi', () => ({
  ...(jest.requireActual('../api/diagnosticoAdminApi') as object),
  quitarPreguntas: (...a: unknown[]) => mockQuitar(...a),
  restaurarPregunta: (...a: unknown[]) => mockRestaurar(...a),
}));

import { ApiError } from '../../../services/http/apiClient';
import type { EstadoDelDiagnosticoAdmin } from '../hooks/useDiagnosticoAdmin';
import { DiagnosticoEditorScreen } from '../screens/DiagnosticoEditorScreen';
import type { BorradorDelDiagnostico } from '../types/diagnosticoAdmin.types';
import { fichaDePrueba, pregunta } from './fixtures';
import { crearAyudas } from './montaje';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const borrador = (parcial: Partial<BorradorDelDiagnostico> = {}): BorradorDelDiagnostico => ({
  publicada: { version: 3, publicadaEn: '2026-10-31T15:04:00Z', publicadaPor: { id: 'u1', nombre: 'Ana' } },
  hayCambiosSinPublicar: true,
  puedePublicar: { ok: true, motivos: [] },
  secciones: fichaDePrueba(),
  retiradas: [],
  totales: { secciones: 2, preguntas: 5 },
  noEntendidas: 0,
  ...parcial,
});
const ejecutar = jest.fn(async (accion: () => Promise<unknown>) => accion());
const onVolver = jest.fn();
let raiz: ReactTestRenderer | null = null;
const { hay, textos, tocar, tocarPorEtiqueta, tocablePorEtiqueta, apagado } = crearAyudas(() => raiz!);
const montar = async (parcial: Partial<EstadoDelDiagnosticoAdmin> = {}) => {
  if (raiz) await act(async () => { raiz!.unmount(); });
  await act(async () => {
    raiz = TestRenderer.create(
      React.createElement(DiagnosticoEditorScreen, {
        estado: { borrador: borrador(), cargando: false, fallo: null, desactualizado: false, versionBase: 3, otraPersona: false, recargar: jest.fn(), ejecutar, ...parcial } as never,
        onVolver,
      }),
    );
  });
};
const fila = (texto: string) => {
  const n = raiz!.root.findAll(x => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string' && x.props.accessibilityLabel.startsWith(`${texto}.`))[0];
  if (!n) throw new Error(`No hay una fila «${texto}»`);
  return n;
};
const marcar = (texto: string) => act(async () => { await fila(texto).props.onPress(); });

beforeEach(() => {
  jest.clearAllMocks();
  mockConfirmar.mockResolvedValue(true);
  mockQuitar.mockResolvedValue({ eliminadas: 1, retiradas: 1, conRespuestas: 1 });
  mockRestaurar.mockResolvedValue({ id: 900 });
  ejecutar.mockImplementation(async accion => accion());
});
afterEach(async () => {
  if (raiz) await act(async () => { raiz!.unmount(); });
  raiz = null;
});

describe('el modo «Quitar preguntas»', () => {
  it('entra, cambia la cabecera y esconde lo de editar', async () => {
    await montar();
    await tocar('Quitar preguntas');
    expect(hay('Marca las que ya no quieres')).toBe(true);
    expect(hay('Marca las preguntas que quieres quitar')).toBe(true);
    // Sin los botones de editar, subir/bajar ni añadir.
    expect(hay('Añadir sección')).toBe(false);
    expect(raiz!.root.findAll(n => n.props.accessibilityLabel === 'Subir esta pregunta')).toHaveLength(0);
    // «Quitar» está apagado hasta marcar algo.
    expect(apagado(tocablePorEtiqueta('Quitar'))).toBe(true);
  });

  it('el contador dice cuántas y cuántas con respuestas', async () => {
    await montar();
    await tocar('Quitar preguntas');
    await marcar('¿Cuál es tu nombre completo?');
    expect(hay('1 marcada')).toBe(true);
    await marcar('¿Qué quieres lograr con tu cuerpo?');
    expect(textos()).toContain('2 marcadas · 1 con respuestas');
    // Desmarcar.
    await marcar('¿Cuál es tu nombre completo?');
    expect(textos()).toContain('1 marcada · 1 con respuestas');
  });

  it('una protegida no se marca', async () => {
    await montar();
    await tocar('Quitar preguntas');
    expect(apagado(fila('¿Cómo te llamamos?'))).toBe(true);
    await marcar('¿Cómo te llamamos?');
    expect(hay('Marca las preguntas que quieres quitar')).toBe(true);
  });

  it('«Cancelar» sale del modo sin quitar nada', async () => {
    await montar();
    await tocar('Quitar preguntas');
    await marcar('¿Cuál es tu nombre completo?');
    await tocar('Cancelar');
    expect(hay('Añadir sección')).toBe(true);
    expect(mockQuitar).not.toHaveBeenCalled();
  });

  it('quitar pide UNA confirmación con las cuentas, manda los ids y dice qué pasó', async () => {
    await montar();
    await tocar('Quitar preguntas');
    await marcar('¿Cuál es tu nombre completo?');
    await marcar('¿Qué quieres lograr con tu cuerpo?');
    await tocar('Quitar');
    expect(mockConfirmar).toHaveBeenCalledTimes(1);
    const [titulo, mensaje] = mockConfirmar.mock.calls[0] as [string, string];
    expect(titulo).toBe('¿Quitar 2 preguntas?');
    expect(mensaje).toContain('1 tiene respuestas y se retirará');
    expect(mockQuitar).toHaveBeenCalledWith([10, 13], false);
    expect(mockLogro).toHaveBeenCalled();
    expect(hay('1 eliminada · 1 retirada')).toBe(true);
    // Sale del modo.
    expect(hay('Añadir sección')).toBe(true);
  });

  it('si no se confirma, no se quita nada y se queda en el modo', async () => {
    mockConfirmar.mockResolvedValue(false);
    await montar();
    await tocar('Quitar preguntas');
    await marcar('¿Cuál es tu nombre completo?');
    await tocar('Quitar');
    expect(mockQuitar).not.toHaveBeenCalled();
    expect(hay('1 marcada')).toBe(true);
  });

  it('con 409 TIENE_DEPENDIENTES ofrece quitar también las que dependen; aceptar repite con «quitarDependientes»', async () => {
    mockQuitar.mockRejectedValueOnce(new ApiError(409, 'Tiene dependientes', { codigo: 'TIENE_DEPENDIENTES', dependientes: [12] }));
    mockQuitar.mockResolvedValueOnce({ eliminadas: 2, retiradas: 0, conRespuestas: 0 });
    await montar();
    await tocar('Quitar preguntas');
    await marcar('¿Tienes pareja?');
    await tocar('Quitar');
    expect(mockConfirmar).toHaveBeenCalledTimes(2);
    const [titulo, mensaje, opciones] = mockConfirmar.mock.calls[1] as [string, string, { ok: string }];
    expect(titulo).toBe('Otras preguntas dependen de esta');
    expect(mensaje).toBe('«Cuéntanos de tu pareja» se muestra según una de las que quieres quitar.');
    expect(opciones.ok).toBe('Quitar también las que dependen de ella');
    expect(mockQuitar).toHaveBeenNthCalledWith(1, [11], false);
    expect(mockQuitar).toHaveBeenNthCalledWith(2, [11], true);
    expect(hay('2 eliminadas')).toBe(true);
  });

  it('con 409 TIENE_DEPENDIENTES y cancelar, no se quita nada y se sigue en el modo', async () => {
    mockQuitar.mockRejectedValue(new ApiError(409, 'Tiene dependientes', { codigo: 'TIENE_DEPENDIENTES', dependientes: [12] }));
    mockConfirmar.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await montar();
    await tocar('Quitar preguntas');
    await marcar('¿Tienes pareja?');
    await tocar('Quitar');
    expect(mockQuitar).toHaveBeenCalledTimes(1);
    expect(hay('1 marcada')).toBe(true);
  });

  it('otro error del servidor se dice con su motivo', async () => {
    mockQuitar.mockRejectedValue(new ApiError(409, 'La pregunta está protegida'));
    await montar();
    await tocar('Quitar preguntas');
    await marcar('¿Cuál es tu nombre completo?');
    await tocar('Quitar');
    expect(mockAvisar).toHaveBeenCalledWith('No se pudieron quitar', 'La pregunta está protegida');
  });
});

describe('Retiradas', () => {
  const conRetirada = () =>
    borrador({
      retiradas: [pregunta({ id: 900, texto: '¿Cuál es tu signo?', estado: 'RETIRADA', respuestas: 12, alimenta: 'PRIMERA_ACCION' })],
    });

  it('no se dibuja sin retiradas', async () => {
    await montar();
    expect(hay('Retiradas')).toBe(false);
  });

  it('plegada dice cuántas; abierta, cada una con sus respuestas y «Restaurar»', async () => {
    await montar({ borrador: conRetirada() });
    expect(hay('Retiradas · 1')).toBe(true);
    expect(hay('¿Cuál es tu signo?')).toBe(false);
    await tocarPorEtiqueta('Retiradas · 1');
    expect(hay('¿Cuál es tu signo?')).toBe(true);
    expect(hay('12 personas la respondieron')).toBe(true);
  });

  it('restaurar la devuelve y lo dice', async () => {
    await montar({ borrador: conRetirada() });
    await tocarPorEtiqueta('Retiradas · 1');
    await tocarPorEtiqueta('Restaurar la pregunta ¿Cuál es tu signo?');
    expect(mockRestaurar).toHaveBeenCalledWith(900);
    expect(hay('Pregunta restaurada.')).toBe(true);
  });

  it('si su destino ya lo tiene otra, el 409 dice cuál', async () => {
    mockRestaurar.mockRejectedValue(new ApiError(409, 'Ya alimenta la pregunta «¿Qué quieres hacer primero?»'));
    await montar({ borrador: conRetirada() });
    await tocarPorEtiqueta('Retiradas · 1');
    await tocarPorEtiqueta('Restaurar la pregunta ¿Cuál es tu signo?');
    expect(mockAvisar).toHaveBeenCalledWith('No se pudo restaurar', 'Ya alimenta la pregunta «¿Qué quieres hacer primero?»');
  });
});
