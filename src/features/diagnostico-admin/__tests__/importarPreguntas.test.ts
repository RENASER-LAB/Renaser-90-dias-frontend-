/**
 * Importar preguntas pegando una tabla, la plantilla y la descarga de la ficha, en el editor MONTADO (spec 026): vista previa con errores por
 * fila, avisos que no bloquean, «Añadir al final» o «Reemplazar la ficha» con su confirmación, y lo importado queda en borrador.
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
    const { View, Text, Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
    const R = jest.requireActual<typeof import('react')>('react');
    return props.visible
      ? R.createElement(
          View,
          null,
          R.createElement(Text, null, props.titulo),
          R.createElement(Pressable, { accessibilityLabel: 'Cerrar la hoja', onPress: props.alCerrar }),
          props.children as never,
          props.pie as never,
        )
      : null;
  },
}));
const mockApi = {
  revisarImportacion: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  confirmarImportacion: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
};
jest.mock('../api/diagnosticoAdminApi', () => ({
  ...(jest.requireActual('../api/diagnosticoAdminApi') as object),
  revisarImportacion: (...a: unknown[]) => mockApi.revisarImportacion(...a),
  confirmarImportacion: (...a: unknown[]) => mockApi.confirmarImportacion(...a),
}));
const mockDescargar = jest.fn<(...a: unknown[]) => Promise<unknown>>();
jest.mock('../../caja/utils/archivosConSesion', () => ({ descargarConSesion: (...a: unknown[]) => mockDescargar(...a) }));

import { ApiError } from '../../../services/http/apiClient';
import type { EstadoDelDiagnosticoAdmin } from '../hooks/useDiagnosticoAdmin';
import { DiagnosticoEditorScreen } from '../screens/DiagnosticoEditorScreen';
import type { BorradorDelDiagnostico } from '../types/diagnosticoAdmin.types';
import { fichaDePrueba } from './fixtures';
import { crearAyudas } from './montaje';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const borrador: BorradorDelDiagnostico = {
  publicada: { version: 3, publicadaEn: '2026-10-31T15:04:00Z', publicadaPor: { id: 'u1', nombre: 'Ana' } },
  hayCambiosSinPublicar: true,
  puedePublicar: { ok: true, motivos: [] },
  secciones: fichaDePrueba(),
  retiradas: [],
  totales: { secciones: 2, preguntas: 5 },
  noEntendidas: 0,
};
const ejecutar = jest.fn(async (accion: () => Promise<unknown>, _o?: unknown) => accion());
let raiz: ReactTestRenderer | null = null;
const { hay, textos, tocar, tocarPorEtiqueta, tocablePorEtiqueta, apagado, escribir } = crearAyudas(() => raiz!);
const montar = async () => {
  await act(async () => {
    raiz = TestRenderer.create(
      React.createElement(DiagnosticoEditorScreen, {
        estado: { borrador, cargando: false, fallo: null, desactualizado: false, versionBase: 3, otraPersona: false, recargar: jest.fn(), ejecutar } as never,
        onVolver: jest.fn(),
      }),
    );
  });
};
const TABLA = 'Sección\tClave\tPregunta\r\nConociéndote\tp1\t¿Cómo te llamas?\r\nTu vida\tp2\t¿Dónde vives?';
const VISTA = {
  secciones: 6, preguntas: 29,
  filas: [{ numero: 2, seccion: 'Conociéndote', clave: 'p1', texto: '¿Cómo te llamas?', tipo: 'Texto corto' }],
  errores: [], advertencias: [], preguntasQueSeRetirarian: 0, conRespuestas: 0,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockConfirmar.mockResolvedValue(true);
  mockApi.revisarImportacion.mockResolvedValue(VISTA);
  mockApi.confirmarImportacion.mockResolvedValue({ secciones: 6, preguntas: 29, eliminadas: 0, retiradas: 0 });
  mockDescargar.mockResolvedValue({ ok: true, valor: null });
  ejecutar.mockImplementation(async accion => accion());
});
afterEach(async () => {
  if (raiz) await act(async () => { raiz!.unmount(); });
  raiz = null;
});

const hojaAbierta = () => textos().filter(t => t === 'Importar preguntas').length === 2;
const abrir = async () => {
  await montar();
  await tocar('Importar preguntas');
};

describe('pegar y revisar', () => {
  it('explica cómo pegar, ofrece la plantilla y no deja revisar sin tabla', async () => {
    await abrir();
    expect(hojaAbierta()).toBe(true);
    expect(hay('Copia las celdas de tu hoja de cálculo y pégalas aquí.')).toBe(true);
    expect(hay('Descargar plantilla')).toBe(true);
    expect(apagado(tocablePorEtiqueta('Revisar'))).toBe(true);
    await escribir('Tabla de preguntas', 'solo la cabecera');
    expect(apagado(tocablePorEtiqueta('Revisar'))).toBe(true);
    await escribir('Tabla de preguntas', TABLA);
    expect(apagado(tocablePorEtiqueta('Revisar'))).toBe(false);
    expect(hay('Pegaste 3 filas, con la cabecera.')).toBe(true);
  });

  it('revisar manda el texto limpio y muestra «6 secciones · 29 preguntas» con las opciones de importar', async () => {
    await abrir();
    await escribir('Tabla de preguntas', TABLA);
    await tocar('Revisar');
    // Los saltos de Windows se normalizan antes de mandarlo.
    expect(mockApi.revisarImportacion).toHaveBeenCalledWith('Sección\tClave\tPregunta\nConociéndote\tp1\t¿Cómo te llamas?\nTu vida\tp2\t¿Dónde vives?');
    expect(hay('6 secciones · 29 preguntas')).toBe(true);
    expect(hay('Fila 2 · Conociéndote · ¿Cómo te llamas? · Texto corto')).toBe(true);
    expect(hay('Añadir al final')).toBe(true);
    expect(hay('Reemplazar la ficha')).toBe(true);
  });

  it('con errores los dice por fila, no deja confirmar y pide corregir', async () => {
    mockApi.revisarImportacion.mockResolvedValue({
      ...VISTA,
      errores: [
        { fila: 14, columna: 'Tipo', mensaje: 'No se conoce el tipo «Foto»' },
        { fila: 20, columna: null, mensaje: 'Falta el texto de la pregunta' },
      ],
    });
    await abrir();
    await escribir('Tabla de preguntas', TABLA);
    await tocar('Revisar');
    expect(hay('Fila 14, columna «Tipo»: No se conoce el tipo «Foto»')).toBe(true);
    expect(hay('Fila 20: Falta el texto de la pregunta')).toBe(true);
    expect(hay('Corrige los 2 errores de la tabla y vuelve a revisarla.')).toBe(true);
    // No hay botón de importar: queda «Revisar».
    expect(textos().includes('Añadir al final')).toBe(false);
    expect(mockApi.confirmarImportacion).not.toHaveBeenCalled();
  });

  it('los avisos de duplicados se ven pero no bloquean', async () => {
    mockApi.revisarImportacion.mockResolvedValue({ ...VISTA, advertencias: [{ fila: 8, mensaje: 'La pregunta se repite con la fila 5' }] });
    await abrir();
    await escribir('Tabla de preguntas', TABLA);
    await tocar('Revisar');
    expect(hay('Fila 8: La pregunta se repite con la fila 5')).toBe(true);
    expect(hay('1 aviso')).toBe(true);
    expect(hay('Cómo importar')).toBe(true);
  });

  it('cambiar la tabla después de revisar obliga a revisar de nuevo', async () => {
    await abrir();
    await escribir('Tabla de preguntas', TABLA);
    await tocar('Revisar');
    expect(hay('Cómo importar')).toBe(true);
    await escribir('Tabla de preguntas', `${TABLA}\nTu vida\tp3\t¿Y tus hijos?`);
    expect(hay('Cómo importar')).toBe(false);
    expect(hay('6 secciones · 29 preguntas')).toBe(false);
  });

  it('un error del servidor al revisar se dice con su motivo', async () => {
    mockApi.revisarImportacion.mockRejectedValue(new ApiError(400, 'La tabla no se pudo leer: separador desconocido'));
    await abrir();
    await escribir('Tabla de preguntas', TABLA);
    await tocar('Revisar');
    expect(hay('La tabla no se pudo leer: separador desconocido')).toBe(true);
  });
});

describe('importar', () => {
  it('«Añadir al final» manda el modo, deja la ficha en borrador y lo dice', async () => {
    await abrir();
    await escribir('Tabla de preguntas', TABLA);
    await tocar('Revisar');
    // El botón de abajo se llama como el modo elegido (la fila de la opción dice lo mismo con su explicación).
    await tocarPorEtiqueta('Añadir al final');
    expect(mockApi.confirmarImportacion).toHaveBeenCalledTimes(1);
    expect(mockApi.confirmarImportacion.mock.calls[0][1]).toBe('ANADIR');
    expect(mockConfirmar).not.toHaveBeenCalled();
    expect(mockLogro).toHaveBeenCalled();
    expect(hay('Importadas 6 secciones · 29 preguntas')).toBe(true);
    expect(hojaAbierta()).toBe(false);
  });

  it('«Reemplazar la ficha» dice cuántas se retiran y cuántas tienen respuestas, y pide confirmar', async () => {
    mockApi.revisarImportacion.mockResolvedValue({ ...VISTA, preguntasQueSeRetirarian: 12, conRespuestas: 4 });
    mockApi.confirmarImportacion.mockResolvedValue({ secciones: 6, preguntas: 29, eliminadas: 8, retiradas: 4 });
    await abrir();
    await escribir('Tabla de preguntas', TABLA);
    await tocar('Revisar');
    await tocarPorEtiqueta('Reemplazar la ficha. La ficha pasa a ser solo lo que pegaste.');
    expect(hay('12 preguntas de la ficha actual se quitarán.')).toBe(true);
    expect(hay('4 tienen respuestas y se retiran')).toBe(true);
    // Ahora el botón de abajo reemplaza.
    const botones = raiz!.root.findAll(n => n.props.accessibilityLabel === 'Reemplazar la ficha' && typeof n.props.onPress === 'function');
    await act(async () => { await botones[botones.length - 1].props.onPress(); });
    expect(mockConfirmar).toHaveBeenCalledWith('¿Reemplazar la ficha?', expect.stringContaining('12 preguntas de la ficha actual se quitarán.'), expect.anything());
    expect(mockApi.confirmarImportacion.mock.calls[0][1]).toBe('REEMPLAZAR');
    expect(hay('Importadas 6 secciones · 29 preguntas · 8 eliminadas · 4 retiradas')).toBe(true);
  });

  it('si no confirma el reemplazo, no se importa nada', async () => {
    mockConfirmar.mockResolvedValue(false);
    await abrir();
    await escribir('Tabla de preguntas', TABLA);
    await tocar('Revisar');
    await tocarPorEtiqueta('Reemplazar la ficha. La ficha pasa a ser solo lo que pegaste.');
    const botones = raiz!.root.findAll(n => n.props.accessibilityLabel === 'Reemplazar la ficha' && typeof n.props.onPress === 'function');
    await act(async () => { await botones[botones.length - 1].props.onPress(); });
    expect(mockApi.confirmarImportacion).not.toHaveBeenCalled();
    expect(hojaAbierta()).toBe(true);
  });

  it('si el servidor rechaza con errores (400), no guarda nada y los muestra por fila', async () => {
    mockApi.confirmarImportacion.mockRejectedValue(
      new ApiError(400, 'La tabla tiene errores', { errores: [{ fila: 3, columna: 'Obligatoria', mensaje: 'Escribe Sí o No' }] }),
    );
    await abrir();
    await escribir('Tabla de preguntas', TABLA);
    await tocar('Revisar');
    await tocarPorEtiqueta('Añadir al final');
    expect(hay('Fila 3, columna «Obligatoria»: Escribe Sí o No')).toBe(true);
    expect(hay('La tabla tiene errores')).toBe(true);
    expect(hojaAbierta()).toBe(true);
    expect(mockLogro).not.toHaveBeenCalled();
  });

  it('salir con la tabla pegada pregunta antes', async () => {
    await abrir();
    await escribir('Tabla de preguntas', TABLA);
    mockConfirmar.mockResolvedValue(false);
    await tocarPorEtiqueta('Cerrar la hoja');
    expect(mockConfirmar).toHaveBeenCalledWith('¿Salir sin importar?', 'Se pierde la tabla que pegaste.', expect.anything());
    expect(hojaAbierta()).toBe(true);
    mockConfirmar.mockResolvedValue(true);
    await tocarPorEtiqueta('Cerrar la hoja');
    expect(hojaAbierta()).toBe(false);
  });
});

describe('plantilla y ficha en archivo', () => {
  it('«Descargar plantilla» baja la plantilla con la sesión', async () => {
    await abrir();
    await tocar('Descargar plantilla');
    expect(mockDescargar).toHaveBeenCalledTimes(1);
    expect(mockDescargar.mock.calls[0][0]).toMatchObject({ ruta: '/api/v1/admin/diagnostico/plantilla.csv', nombre: 'plantilla-del-diagnostico.csv', tipo: 'text/csv' });
  });

  it('«Descargar la ficha» baja el borrador en el mismo formato', async () => {
    await montar();
    await tocar('Descargar la ficha');
    expect(mockDescargar.mock.calls[0][0]).toMatchObject({ ruta: '/api/v1/admin/diagnostico/exportar.csv', nombre: 'diagnostico-inicial.csv' });
  });

  it('si no se pudo descargar, lo dice con el motivo', async () => {
    mockDescargar.mockResolvedValue({ ok: false, status: 403, mensaje: 'Solo Administración puede ver esto.' });
    await montar();
    await tocar('Descargar la ficha');
    expect(mockAvisar).toHaveBeenCalledWith('No se pudo descargar', 'Solo Administración puede ver esto.');
  });
});
