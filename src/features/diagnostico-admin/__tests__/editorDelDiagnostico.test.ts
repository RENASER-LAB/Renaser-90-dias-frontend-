/**
 * El editor del diagnóstico MONTADO (Administración → Fichas, spec 026): crear, editar, duplicar y reordenar preguntas y secciones.
 * La red es un doble que anota cada pedido; la hoja de abajo, un doble que dibuja su título, su cuerpo y su pie (la de verdad la
 * prueban las de `components/hojaDesdeAbajo`).
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
const mockError = jest.fn();
jest.mock('../../../utils/tacto', () => ({
  tacto: { seleccion: () => undefined, error: () => mockError(), logro: () => mockLogro() },
}));
const mockConfirmar = jest.fn<(...a: unknown[]) => Promise<boolean>>();
const mockAvisar = jest.fn();
jest.mock('../../admin/utils/dialogo', () => ({
  confirmar: (...a: unknown[]) => mockConfirmar(...a),
  avisar: (...a: unknown[]) => mockAvisar(...a),
}));
jest.mock('../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => ({
  HojaDesdeAbajo: (props: { visible: boolean; titulo: string; subtitulo?: string; children: unknown; pie?: unknown; alCerrar: () => void }) => {
    const { View, Text, Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
    const R = jest.requireActual<typeof import('react')>('react');
    return props.visible
      ? R.createElement(
          View,
          null,
          R.createElement(Text, null, props.titulo),
          R.createElement(Text, null, props.subtitulo ?? ''),
          R.createElement(Pressable, { accessibilityLabel: 'Cerrar la hoja', onPress: props.alCerrar }),
          props.children as never,
          props.pie as never,
        )
      : null;
  },
}));
const mockApi = {
  crearPregunta: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  editarPregunta: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  duplicarPregunta: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  moverPregunta: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  crearSeccion: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  editarSeccion: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  borrarSeccion: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  ordenarSecciones: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
};
jest.mock('../api/diagnosticoAdminApi', () => ({
  ...(jest.requireActual('../api/diagnosticoAdminApi') as object),
  crearPregunta: (...a: unknown[]) => mockApi.crearPregunta(...a),
  editarPregunta: (...a: unknown[]) => mockApi.editarPregunta(...a),
  duplicarPregunta: (...a: unknown[]) => mockApi.duplicarPregunta(...a),
  moverPregunta: (...a: unknown[]) => mockApi.moverPregunta(...a),
  crearSeccion: (...a: unknown[]) => mockApi.crearSeccion(...a),
  editarSeccion: (...a: unknown[]) => mockApi.editarSeccion(...a),
  borrarSeccion: (...a: unknown[]) => mockApi.borrarSeccion(...a),
  ordenarSecciones: (...a: unknown[]) => mockApi.ordenarSecciones(...a),
}));

import { ApiError } from '../../../services/http/apiClient';
import { DiagnosticoEditorScreen } from '../screens/DiagnosticoEditorScreen';
import type { EstadoDelDiagnosticoAdmin } from '../hooks/useDiagnosticoAdmin';
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

const ejecutar = jest.fn(async (accion: () => Promise<unknown>) => accion());
const recargar = jest.fn();
const onVolver = jest.fn();
let raiz: ReactTestRenderer | null = null;
const ayudas = crearAyudas(() => raiz!);
const { hay, tocar, tocarPorEtiqueta, escribir, textos } = ayudas;

const estado = (parcial: Partial<EstadoDelDiagnosticoAdmin> = {}): EstadoDelDiagnosticoAdmin =>
  ({ borrador: borrador(), cargando: false, fallo: null, desactualizado: false, versionBase: 3, otraPersona: false, recargar, ejecutar, ...parcial }) as never;

const desmontar = async () => {
  if (raiz) await act(async () => { raiz!.unmount(); });
  raiz = null;
};
const montar = async (parcial: Partial<EstadoDelDiagnosticoAdmin> = {}) => {
  await desmontar();
  await act(async () => { raiz = TestRenderer.create(React.createElement(DiagnosticoEditorScreen, { estado: estado(parcial), onVolver })); });
};

afterEach(desmontar);

beforeEach(() => {
  jest.clearAllMocks();
  mockConfirmar.mockResolvedValue(true);
  for (const f of Object.values(mockApi)) f.mockResolvedValue({});
  ejecutar.mockImplementation(async accion => accion());
});

describe('lo que se ve', () => {
  it('la portada, los pasos con sus preguntas y lo que dice cada una', async () => {
    await montar();
    expect(hay('Diagnóstico inicial')).toBe(true);
    expect(hay('Publicado el 31 oct por Ana · versión 3')).toBe(true);
    expect(hay('Conociéndote')).toBe(true);
    expect(hay('¿Cuál es tu nombre completo?')).toBe(true);
    expect(hay('Texto corto · Obligatoria')).toBe(true);
    expect(hay('Alimenta: Objetivo de Cuerpo')).toBe(true);
    expect(hay('Se muestra si «¿Tienes pareja?» es «Sí.»')).toBe(true);
    expect(hay('9 personas la respondieron')).toBe(true);
    expect(hay('Protegida')).toBe(true);
  });

  it('cargando y con error dice qué pasa, y reintenta', async () => {
    await montar({ borrador: null, cargando: true });
    expect(hay('Cargando la ficha…')).toBe(true);
    await montar({ borrador: null, cargando: false, fallo: 'sin_permiso' });
    expect(hay('Tu cuenta no tiene permiso para administrar las fichas.')).toBe(true);
    await montar({ borrador: null, cargando: false, fallo: 'error' });
    await tocar('Reintentar');
    expect(recargar).toHaveBeenCalled();
  });

  it('avisa si otra persona publicó, y actualizar relee', async () => {
    await montar({ otraPersona: true });
    expect(hay('Otra persona publicó cambios mientras editabas')).toBe(true);
    await tocar('Actualizar');
    expect(recargar).toHaveBeenCalled();
  });

  it('dice cuántas preguntas no sabe mostrar en esta versión', async () => {
    await montar({ borrador: borrador({ noEntendidas: 2 }) });
    expect(hay('2 preguntas son de un tipo que esta versión de la app todavía no sabe mostrar')).toBe(true);
  });
});

describe('editar una pregunta', () => {
  it('tocarla abre su hoja con lo que tiene; guardar manda el cuerpo y avisa', async () => {
    mockApi.editarPregunta.mockResolvedValue({ id: 10 });
    await montar();
    await tocarPorEtiqueta(ayudasEtiquetaDe('¿Cuál es tu nombre completo?'));
    expect(hay('Editar pregunta')).toBe(true);
    await escribir('Pregunta', '¿Cómo te llamas?');
    await tocar('Guardar');
    expect(mockApi.editarPregunta).toHaveBeenCalledTimes(1);
    const [id, cuerpo] = mockApi.editarPregunta.mock.calls[0] as [number, { texto: string; seccionId: number; tipo: string; requerida: boolean }];
    expect(id).toBe(10);
    expect(cuerpo).toMatchObject({ texto: '¿Cómo te llamas?', seccionId: 2, tipo: 'TEXTO', requerida: true });
    expect(ejecutar).toHaveBeenCalled();
    expect(mockLogro).toHaveBeenCalled();
    expect(hay('Pregunta guardada.')).toBe(true);
    expect(hay('Editar pregunta')).toBe(false);
  });

  it('sin texto no guarda: lo dice en el campo y arriba del botón', async () => {
    await montar();
    await tocarPorEtiqueta(ayudasEtiquetaDe('¿Cuál es tu nombre completo?'));
    await escribir('Pregunta', '   ');
    await tocar('Guardar');
    expect(mockApi.editarPregunta).not.toHaveBeenCalled();
    expect(mockError).toHaveBeenCalled();
    expect(textos().filter(t => t === 'Escribe la pregunta.')).toHaveLength(1);
    expect(hay('Falta: Escribe la pregunta.')).toBe(true);
  });

  it('el motivo del servidor (409) se dice en la hoja y la hoja sigue abierta', async () => {
    mockApi.editarPregunta.mockRejectedValue(new ApiError(409, 'Ya alimenta la pregunta «¿Qué quieres lograr con tu cuerpo?»'));
    await montar();
    await tocarPorEtiqueta(ayudasEtiquetaDe('¿Cuál es tu nombre completo?'));
    await escribir('Pregunta', '¿Cómo te llamas?');
    await tocar('Guardar');
    expect(hay('Ya alimenta la pregunta «¿Qué quieres lograr con tu cuerpo?»')).toBe(true);
    expect(hay('Editar pregunta')).toBe(true);
    expect(mockLogro).not.toHaveBeenCalled();
  });

  it('salir con cambios sin guardar pregunta antes; si se queda, la hoja sigue abierta', async () => {
    await montar();
    await tocarPorEtiqueta(ayudasEtiquetaDe('¿Cuál es tu nombre completo?'));
    await escribir('Pregunta', 'otra cosa');
    // Con cambios, duplicar espera a que se guarde.
    expect(ayudas.apagado(ayudas.tocableCon('Duplicar esta pregunta'))).toBe(true);
    expect(hay('Guarda tus cambios antes de duplicar.')).toBe(true);
    mockConfirmar.mockResolvedValue(false);
    await tocarPorEtiqueta('Cerrar la hoja');
    expect(mockConfirmar).toHaveBeenCalledWith('¿Salir sin guardar?', 'Se pierden los cambios de esta pregunta.', expect.anything());
    expect(hay('Editar pregunta')).toBe(true);
    mockConfirmar.mockResolvedValue(true);
    await tocarPorEtiqueta('Cerrar la hoja');
    expect(hay('Editar pregunta')).toBe(false);
    expect(mockApi.editarPregunta).not.toHaveBeenCalled();
  });

  it('sin cambios, cerrar no pregunta nada', async () => {
    await montar();
    await tocarPorEtiqueta(ayudasEtiquetaDe('¿Cuál es tu nombre completo?'));
    await tocarPorEtiqueta('Cerrar la hoja');
    expect(mockConfirmar).not.toHaveBeenCalled();
    expect(hay('Editar pregunta')).toBe(false);
  });

  it('quitar el destino que alimenta un objetivo avisa y pide confirmar; si no se confirma, no se guarda', async () => {
    await montar();
    await tocarPorEtiqueta(ayudasEtiquetaDe('¿Qué quieres lograr con tu cuerpo?'));
    await tocarPorEtiqueta('Nada');
    mockConfirmar.mockResolvedValue(false);
    await tocar('Guardar');
    expect(mockConfirmar).toHaveBeenCalledWith('Esta pregunta deja de alimentar un objetivo', 'Las personas ya no tendrán ese objetivo preparado: lo escribirán en Plan.', expect.anything());
    expect(mockApi.editarPregunta).not.toHaveBeenCalled();
    mockConfirmar.mockResolvedValue(true);
    await tocar('Guardar');
    expect(mockApi.editarPregunta).toHaveBeenCalledTimes(1);
    expect((mockApi.editarPregunta.mock.calls[0][1] as { alimenta: unknown }).alimenta).toBeNull();
  });

  it('una protegida no deja cambiar el tipo y dice por qué', async () => {
    await montar();
    await tocarPorEtiqueta(ayudasEtiquetaDe('¿Cómo te llamamos?'));
    expect(hay('Protegida: no se quita ni cambia de tipo.')).toBe(true);
    expect(hay('Esta pregunta es de las que alimentan Plan o el trato de SER: no cambia de tipo.')).toBe(true);
    expect(ayudas.apagado(ayudas.tocablePorEtiqueta('Párrafo'))).toBe(true);
    expect(ayudas.apagado(ayudas.tocablePorEtiqueta('Opción única'))).toBe(false);
  });
});

describe('crear y duplicar', () => {
  it('«Añadir pregunta» crea en esa sección con el tipo elegido', async () => {
    mockApi.crearPregunta.mockResolvedValue({ id: 99 });
    await montar();
    await tocarPorEtiqueta('Añadir una pregunta a Tu vida');
    expect(hay('Pregunta nueva')).toBe(true);
    expect(hay('En «Tu vida»')).toBe(true);
    await escribir('Pregunta', '¿Cuántos años tienes?');
    await tocarPorEtiqueta('Número');
    await tocar('Crear pregunta');
    expect(mockApi.crearPregunta).toHaveBeenCalledTimes(1);
    expect(mockApi.crearPregunta.mock.calls[0][0]).toMatchObject({ seccionId: 3, texto: '¿Cuántos años tienes?', tipo: 'NUMERO', opciones: [] });
    expect(hay('Pregunta creada.')).toBe(true);
  });

  it('una opción única pide sus opciones antes de crearse', async () => {
    await montar();
    await tocarPorEtiqueta('Añadir una pregunta a Tu vida');
    await escribir('Pregunta', '¿Fumas?');
    await tocarPorEtiqueta('Opción única');
    await tocar('Crear pregunta');
    expect(mockApi.crearPregunta).not.toHaveBeenCalled();
    expect(hay('Falta: Escribe al menos 2 opciones.')).toBe(true);
    await tocar('Añadir opción');
    await tocar('Añadir opción');
    await escribir('Opción 1', 'Sí');
    await escribir('Opción 2', 'No');
    await tocar('Crear pregunta');
    expect(mockApi.crearPregunta.mock.calls[0][0]).toMatchObject({ tipo: 'SELECCION_UNICA', opciones: [{ etiqueta: 'Sí' }, { etiqueta: 'No' }] });
  });

  it('duplicar la pregunta abierta', async () => {
    await montar();
    await tocarPorEtiqueta(ayudasEtiquetaDe('¿Cuál es tu nombre completo?'));
    await tocar('Duplicar esta pregunta');
    expect(mockApi.duplicarPregunta).toHaveBeenCalledWith(10);
    expect(hay('Pregunta duplicada. La copia quedó debajo.')).toBe(true);
  });
});

describe('reordenar', () => {
  it('subir y bajar una pregunta manda la sección y la posición', async () => {
    await montar();
    const bajar = raiz!.root.findAll(n => n.props.accessibilityLabel === 'Bajar esta pregunta' && typeof n.props.onPress === 'function');
    // La primera de la ficha (id 10) baja a la posición 1 de su sección.
    await act(async () => { await bajar[0].props.onPress(); });
    expect(mockApi.moverPregunta).toHaveBeenCalledWith(10, { seccionId: 2, posicion: 1 });
  });

  it('la primera de la ficha no sube; la última no baja', async () => {
    await montar();
    const subir = raiz!.root.findAll(n => n.props.accessibilityLabel === 'Subir esta pregunta' && typeof n.props.onPress === 'function');
    const bajar = raiz!.root.findAll(n => n.props.accessibilityLabel === 'Bajar esta pregunta' && typeof n.props.onPress === 'function');
    expect(ayudas.apagado(subir[0])).toBe(true);
    expect(ayudas.apagado(bajar[bajar.length - 1])).toBe(true);
  });

  it('subir una sección manda TODAS en el orden nuevo, con la portada primera', async () => {
    await montar();
    await tocarPorEtiqueta('Subir la sección Tu vida');
    expect(mockApi.ordenarSecciones).toHaveBeenCalledWith([1, 3, 2]);
  });

  it('si mover falla, lo dice con el motivo del servidor', async () => {
    mockApi.moverPregunta.mockRejectedValue(new ApiError(400, 'La condición nombra una pregunta posterior'));
    await montar();
    const bajar = raiz!.root.findAll(n => n.props.accessibilityLabel === 'Bajar esta pregunta' && typeof n.props.onPress === 'function');
    await act(async () => { await bajar[0].props.onPress(); });
    expect(mockAvisar).toHaveBeenCalledWith('No se pudo mover la pregunta', 'La condición nombra una pregunta posterior');
  });
});

describe('secciones', () => {
  it('crear una sección', async () => {
    mockApi.crearSeccion.mockResolvedValue({ id: 50 });
    await montar();
    await tocar('Añadir sección');
    expect(hay('Sección nueva')).toBe(true);
    await escribir('Título', 'Tu trabajo');
    await escribir('Descripción (opcional)', 'Cómo trabajas hoy');
    await tocar('Crear sección');
    expect(mockApi.crearSeccion).toHaveBeenCalledWith({ titulo: 'Tu trabajo', descripcion: 'Cómo trabajas hoy' });
    expect(hay('Sección creada.')).toBe(true);
  });

  it('la portada solo edita título y mensaje', async () => {
    mockApi.editarSeccion.mockResolvedValue({ id: 1 });
    await montar();
    await tocar('Editar la portada');
    expect(hay('Título de la portada')).toBe(true);
    await escribir('Mensaje de la portada', 'Tiempo estimado: 15 minutos');
    await tocar('Guardar');
    expect(mockApi.editarSeccion).toHaveBeenCalledWith(1, { titulo: 'Diagnóstico inicial', descripcion: 'Tiempo estimado: 15 minutos' });
    expect(hay('Portada guardada.')).toBe(true);
  });

  it('quitar una sección pide confirmar y dice qué pasó', async () => {
    mockApi.borrarSeccion.mockResolvedValue({ eliminadas: 0, retiradas: 3, conRespuestas: 2 });
    await montar();
    await tocarPorEtiqueta('Quitar la sección Tu vida');
    expect(mockConfirmar).toHaveBeenCalledWith('¿Quitar la sección «Tu vida»?', expect.stringContaining('Se quitan sus 3 preguntas'), expect.anything());
    expect(mockApi.borrarSeccion).toHaveBeenCalledWith(3);
    expect(hay('Sección quitada · 3 retiradas')).toBe(true);
  });

  it('si no se confirma, no se quita nada', async () => {
    mockConfirmar.mockResolvedValue(false);
    await montar();
    await tocarPorEtiqueta('Quitar la sección Tu vida');
    expect(mockApi.borrarSeccion).not.toHaveBeenCalled();
  });
});

/** El nombre accesible de la fila de una pregunta (empieza con su texto). */
function ayudasEtiquetaDe(texto: string): string {
  const n = raiz!.root.findAll(x => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string' && x.props.accessibilityLabel.startsWith(`${texto}.`))[0];
  if (!n) throw new Error(`No hay una fila «${texto}»`);
  return n.props.accessibilityLabel as string;
}
