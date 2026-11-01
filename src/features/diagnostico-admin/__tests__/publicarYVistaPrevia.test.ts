/**
 * Publicar, versiones y vista previa en el editor MONTADO (spec 026): el panel dice el motivo ANTES de intentar, la confirmación,
 * el 409 de otra persona que publicó, y el recorrido de la persona con el borrador sin guardar nada.
 */
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
const mockAvisar = jest.fn();
jest.mock('../../admin/utils/dialogo', () => ({
  confirmar: (...a: unknown[]) => mockConfirmar(...a),
  avisar: (...a: unknown[]) => mockAvisar(...a),
}));
jest.mock('../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => ({
  HojaDesdeAbajo: (props: { visible: boolean; titulo: string; children: unknown; pie?: unknown; alCerrar: () => void }) => {
    const { View, Text } = jest.requireActual<typeof import('react-native')>('react-native');
    const R = jest.requireActual<typeof import('react')>('react');
    return props.visible ? R.createElement(View, null, R.createElement(Text, null, props.titulo), props.children as never, props.pie as never) : null;
  },
}));
const mockApi = {
  publicarDiagnostico: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  leerVersionesDelDiagnostico: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  leerVistaPreviaDelDiagnostico: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
};
jest.mock('../api/diagnosticoAdminApi', () => ({
  ...(jest.requireActual('../api/diagnosticoAdminApi') as object),
  publicarDiagnostico: (...a: unknown[]) => mockApi.publicarDiagnostico(...a),
  leerVersionesDelDiagnostico: (...a: unknown[]) => mockApi.leerVersionesDelDiagnostico(...a),
  leerVistaPreviaDelDiagnostico: (...a: unknown[]) => mockApi.leerVistaPreviaDelDiagnostico(...a),
}));
const mockListarFormaciones = jest.fn<() => Promise<unknown>>();
jest.mock('../../formaciones/api/formacionesApi', () => ({ listarFormaciones: () => mockListarFormaciones() }));
const mockRecorrido = jest.fn();
jest.mock('../../diagnostico/components/RecorridoDelDiagnostico', () => ({
  RecorridoDelDiagnostico: (props: { datos: { titulo: string }; modo: string }) => {
    mockRecorrido(props);
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return jest.requireActual<typeof import('react')>('react').createElement(Text, null, `RECORRIDO ${props.datos.titulo} (${props.modo})`);
  },
}));

import { ApiError } from '../../../services/http/apiClient';
import type { EstadoDelDiagnosticoAdmin } from '../hooks/useDiagnosticoAdmin';
import { DiagnosticoEditorScreen } from '../screens/DiagnosticoEditorScreen';
import type { BorradorDelDiagnostico } from '../types/diagnosticoAdmin.types';
import { fichaDePrueba } from './fixtures';
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
const ejecutar = jest.fn(async (accion: () => Promise<unknown>, _opciones?: unknown) => accion());
const recargar = jest.fn(async () => undefined);
const onVolver = jest.fn();
let raiz: ReactTestRenderer | null = null;
const { hay, textos, tocar, tocarPorEtiqueta, tocablePorEtiqueta, apagado } = crearAyudas(() => raiz!);
const montar = async (parcial: Partial<EstadoDelDiagnosticoAdmin> = {}) => {
  if (raiz) await act(async () => { raiz!.unmount(); });
  await act(async () => {
    raiz = TestRenderer.create(
      React.createElement(DiagnosticoEditorScreen, {
        estado: { borrador: borrador(), cargando: false, fallo: null, desactualizado: false, versionBase: 3, otraPersona: false, recargar, ejecutar, ...parcial } as never,
        onVolver,
      }),
    );
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockConfirmar.mockResolvedValue(true);
  mockApi.publicarDiagnostico.mockResolvedValue({ version: 4 });
  mockApi.leerVersionesDelDiagnostico.mockResolvedValue([
    { version: 3, publicadaEn: '2026-10-31T15:04:00Z', publicadaPor: { id: 'u1', nombre: 'Ana' }, preguntas: 29 },
    { version: 2, publicadaEn: '2026-10-20T10:00:00Z', publicadaPor: { id: 'u2', nombre: 'Luis' }, preguntas: 27 },
  ]);
  mockApi.leerVistaPreviaDelDiagnostico.mockResolvedValue({
    version: 3, estado: 'EN_CURSO', titulo: 'Diagnóstico inicial', portada: { titulo: 'x', mensaje: null }, formacion: null,
    duracion: { dias: 365, texto: '1 año' }, paso: null, respuestas: [],
    secciones: [{ clave: 'a', titulo: 'A', descripcion: null, preguntas: [{ id: 1, clave: 'p1', texto: 'x', tipo: 'TEXTO' }] }],
  });
  mockListarFormaciones.mockResolvedValue([
    { resumen: { codigo: 'ESCUELA', nombre: 'Escuela Renaser', descripcion: '', activa: true, duracionesDias: [90], etiquetasDeDuracion: [], version: 1 }, aprendicesActivos: 0, personal: 0, grupos: 0, porAtender: 0 },
    { resumen: { codigo: 'DIPLOMADO', nombre: 'Diplomado Renaser', descripcion: '', activa: true, duracionesDias: [90, 365], etiquetasDeDuracion: [], version: 1 }, aprendicesActivos: 0, personal: 0, grupos: 0, porAtender: 0 },
  ]);
  ejecutar.mockImplementation(async accion => accion());
});
afterEach(async () => {
  if (raiz) await act(async () => { raiz!.unmount(); });
  raiz = null;
});

describe('publicar', () => {
  it('con cambios, pide confirmar con la frase de siempre, manda la versión base y avisa la versión nueva', async () => {
    await montar();
    expect(hay('Publicado el 31 oct por Ana · versión 3')).toBe(true);
    expect(hay('Tienes cambios sin publicar. Las personas ven solo lo publicado.')).toBe(true);
    await tocar('Publicar');
    expect(mockConfirmar).toHaveBeenCalledWith(
      '¿Publicar la versión 4?',
      'Lo verán las personas que empiecen desde ahora. Quienes ya empezaron terminan con la versión que tenían.',
      expect.anything(),
    );
    expect(mockApi.publicarDiagnostico).toHaveBeenCalledWith(3);
    // Tras publicar, la versión nueva es la base.
    expect(ejecutar).toHaveBeenCalledWith(expect.any(Function), { reiniciarBase: true });
    expect(mockLogro).toHaveBeenCalled();
    expect(hay('Publicada la versión 4.')).toBe(true);
  });

  it('si no se confirma, no se publica', async () => {
    mockConfirmar.mockResolvedValue(false);
    await montar();
    await tocar('Publicar');
    expect(mockApi.publicarDiagnostico).not.toHaveBeenCalled();
  });

  it('los motivos del servidor se ven ANTES y apagan el botón', async () => {
    await montar({ borrador: borrador({ puedePublicar: { ok: false, motivos: ['Falta el texto de la declaración de responsabilidad'] } }) });
    expect(hay('Falta el texto de la declaración de responsabilidad')).toBe(true);
    expect(apagado(tocablePorEtiqueta('Publicar'))).toBe(true);
    await tocar('Publicar');
    expect(mockConfirmar).not.toHaveBeenCalled();
    expect(mockApi.publicarDiagnostico).not.toHaveBeenCalled();
  });

  it('sin cambios sin publicar, el botón queda apagado y lo dice', async () => {
    await montar({ borrador: borrador({ hayCambiosSinPublicar: false }) });
    expect(hay('No hay cambios sin publicar.')).toBe(true);
    expect(apagado(tocablePorEtiqueta('Publicar'))).toBe(true);
    expect(hay('Lo que ves es lo que ven las personas que empiezan.')).toBe(true);
  });

  it('409 OTRA_PERSONA_PUBLICO: recarga lo vigente y lo dice', async () => {
    mockApi.publicarDiagnostico.mockRejectedValue(new ApiError(409, 'Otra persona publicó', { codigo: 'OTRA_PERSONA_PUBLICO', versionVigente: 4 }));
    await montar();
    await tocar('Publicar');
    expect(recargar).toHaveBeenCalledTimes(1);
    expect(mockAvisar).toHaveBeenCalledWith(
      'Otra persona publicó cambios mientras editabas',
      expect.stringContaining('Ya cargamos la versión vigente'),
    );
    expect(mockLogro).not.toHaveBeenCalled();
  });

  it('400 NO_SE_PUEDE_PUBLICAR: dice los motivos, uno por renglón, y recarga', async () => {
    mockApi.publicarDiagnostico.mockRejectedValue(
      new ApiError(400, 'No se puede publicar', { codigo: 'NO_SE_PUEDE_PUBLICAR', motivos: ['La ficha no tiene preguntas', 'Hay una condición rota'] }),
    );
    await montar();
    await tocar('Publicar');
    expect(mockAvisar).toHaveBeenCalledWith('Todavía no se puede publicar', 'La ficha no tiene preguntas\nHay una condición rota');
    expect(recargar).toHaveBeenCalled();
  });

  it('cualquier otro error se dice con su motivo', async () => {
    mockApi.publicarDiagnostico.mockRejectedValue(new ApiError(403, 'No tienes permiso'));
    await montar();
    await tocar('Publicar');
    expect(mockAvisar).toHaveBeenCalledWith('No se pudo publicar', 'Tu cuenta no tiene permiso para esto.');
  });
});

describe('versiones', () => {
  it('lista quién y cuándo publicó cada una, y marca la vigente', async () => {
    await montar();
    await tocar('Versiones');
    expect(hay('Versiones publicadas')).toBe(true);
    expect(textos()).toContain('Versión 3 · 31 oct · Ana · 29 preguntas');
    expect(textos()).toContain('Versión 2 · 20 oct · Luis · 27 preguntas');
    expect(hay('La que ven hoy quienes empiezan')).toBe(true);
  });

  it('sin versiones lo dice; con error ofrece reintentar', async () => {
    mockApi.leerVersionesDelDiagnostico.mockResolvedValue([]);
    await montar();
    await tocar('Versiones');
    expect(hay('Todavía no se publicó ninguna versión.')).toBe(true);
    mockApi.leerVersionesDelDiagnostico.mockRejectedValue(new ApiError(0, 'sin red'));
    await montar();
    await tocar('Versiones');
    expect(hay('Sin conexión con el servidor.')).toBe(true);
    mockApi.leerVersionesDelDiagnostico.mockResolvedValue([]);
    await tocar('Reintentar');
    expect(hay('Todavía no se publicó ninguna versión.')).toBe(true);
  });
});

describe('vista previa', () => {
  it('se elige formación y duración, y abre el recorrido de la persona en modo vista previa con los datos del borrador', async () => {
    await montar();
    await tocar('Vista previa');
    expect(hay('Cómo lo ve quien empieza. No se guarda nada.')).toBe(false); // el doble de la hoja no dibuja subtítulo
    await tocarPorEtiqueta('Diplomado');
    await tocarPorEtiqueta('1 año');
    await tocar('Ver el diagnóstico');
    expect(mockApi.leerVistaPreviaDelDiagnostico).toHaveBeenCalledWith({ formacion: 'DIPLOMADO', duracionDias: 365 });
    expect(hay('RECORRIDO Diagnóstico inicial (vistaPrevia)')).toBe(true);
    expect(mockRecorrido.mock.calls[0][0]).toMatchObject({ modo: 'vistaPrevia' });
    // No guarda nada: ningún callback de guardado ni de terminar.
    expect((mockRecorrido.mock.calls[0][0] as { onGuardarPaso?: unknown }).onGuardarPaso).toBeUndefined();
    expect((mockRecorrido.mock.calls[0][0] as { onTerminar?: unknown }).onTerminar).toBeUndefined();
  });

  it('«Todas» manda la formación vacía y 90 días', async () => {
    await montar();
    await tocar('Vista previa');
    await tocar('Ver el diagnóstico');
    expect(mockApi.leerVistaPreviaDelDiagnostico).toHaveBeenCalledWith({ formacion: null, duracionDias: 90 });
  });

  it('cambiar de formación pasa a una duración que sí exista', async () => {
    await montar();
    await tocar('Vista previa');
    await tocarPorEtiqueta('Diplomado');
    await tocarPorEtiqueta('1 año');
    await tocarPorEtiqueta('Escuela');
    await tocar('Ver el diagnóstico');
    expect(mockApi.leerVistaPreviaDelDiagnostico).toHaveBeenCalledWith({ formacion: 'ESCUELA', duracionDias: 90 });
  });

  it('el recorrido, al salir, vuelve al editor', async () => {
    await montar();
    await tocar('Vista previa');
    await tocar('Ver el diagnóstico');
    const { onSalir } = mockRecorrido.mock.calls[0][0] as { onSalir: () => void };
    await act(async () => { onSalir(); });
    expect(hay('RECORRIDO')).toBe(false);
    expect(hay('Publicado el 31 oct por Ana · versión 3')).toBe(true);
  });

  it('si esa formación no tiene preguntas, lo dice y se puede volver', async () => {
    mockApi.leerVistaPreviaDelDiagnostico.mockResolvedValue({ version: 3, titulo: 'x', secciones: [] });
    await montar();
    await tocar('Vista previa');
    await tocar('Ver el diagnóstico');
    expect(hay('el diagnóstico no tiene preguntas')).toBe(true);
    expect(mockRecorrido).not.toHaveBeenCalled();
    await act(async () => { tocablePorEtiqueta('Volver').props.onPress(); });
    expect(hay('Publicado el 31 oct por Ana · versión 3')).toBe(true);
  });

  it('un error se dice y se puede reintentar', async () => {
    mockApi.leerVistaPreviaDelDiagnostico.mockRejectedValueOnce(new ApiError(500, 'Error'));
    await montar();
    await tocar('Vista previa');
    await tocar('Ver el diagnóstico');
    expect(hay('No se pudo preparar la vista previa.')).toBe(true);
    await tocar('Reintentar');
    expect(hay('RECORRIDO')).toBe(true);
  });
});
