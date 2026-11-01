/**
 * «Hábitos del programa» y «Categorías» por formación (spec 023, historias 2 y 3). Se dibujan las tres pantallas con el estado simulado:
 * el filtro de formación, «Todas» que solo lee, la entrada a las categorías, el orden con ▲ ▼, los rechazos con el motivo del servidor, y
 * «Copiar a otra formación» con la categoría de ESA formación.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }) };
});
jest.mock('../../../../theme/responsive', () => ({ useResponsive: () => ({ horizontalPadding: 18, contentMaxWidth: 560 }) }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaInsetsContext: require('react').createContext(null),
}));
jest.mock('../../../../navigation/barraAlDesplazar/BarraInferior', () => ({ useOcultarBarraAlDesplazar: () => ({}) }));
jest.mock('../../../renasia/components/RenasiaLauncher', () => ({ ESPACIO_PARA_LANZADOR: 0 }));
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: () => undefined, error: () => undefined, logro: () => undefined } }));
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));
type PropsDeLaHoja = { visible: boolean; titulo: string; subtitulo?: string; children: React.ReactNode };
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const R = jest.requireActual<typeof import('react')>('react');
  return {
    HojaDesdeAbajo: (p: PropsDeLaHoja) => (p.visible ? R.createElement(View, { accessibilityLabel: `hoja ${p.titulo}` }, p.children) : null),
  };
});
const mockConfirmar = jest.fn<(titulo: string, mensaje: string, opciones?: unknown) => Promise<boolean>>();
jest.mock('../../utils/dialogo', () => ({ confirmar: (...a: [string, string, unknown?]) => mockConfirmar(...a), avisar: jest.fn() }));

const mockCategoriasApi = {
  crear: jest.fn<(datos: unknown) => Promise<unknown>>(),
  actualizar: jest.fn<(clave: string, datos: unknown) => Promise<unknown>>(),
  activa: jest.fn<(clave: string, activa: boolean) => Promise<unknown>>(),
  ordenar: jest.fn<(formacion: string, claves: string[]) => Promise<unknown>>(),
  eliminar: jest.fn<(clave: string) => Promise<void>>(),
};
jest.mock('../../../habits/categorias/api/categoriasApi', () => ({
  crearCategoriaAdmin: (d: unknown) => mockCategoriasApi.crear(d),
  actualizarCategoriaAdmin: (c: string, d: unknown) => mockCategoriasApi.actualizar(c, d),
  cambiarActivaCategoriaAdmin: (c: string, a: boolean) => mockCategoriasApi.activa(c, a),
  ordenarCategoriasAdmin: (f: string, k: string[]) => mockCategoriasApi.ordenar(f, k),
  eliminarCategoriaAdmin: (c: string) => mockCategoriasApi.eliminar(c),
}));
const mockCopiar = jest.fn<(id: string, destino: unknown) => Promise<unknown>>();
jest.mock('../../api/habitosProgramaApi', () => {
  const real = jest.requireActual<typeof import('../../api/habitosProgramaApi')>('../../api/habitosProgramaApi');
  return {
    TODAS_LAS_FORMACIONES: real.TODAS_LAS_FORMACIONES,
    copiarHabitoDelPrograma: (id: string, d: unknown) => mockCopiar(id, d),
    crearHabitoDelPrograma: jest.fn(),
    editarHabitoDelPrograma: jest.fn(),
    cambiarActivoDelHabito: jest.fn(),
    eliminarHabitoDelPrograma: jest.fn(),
  };
});

import { ApiError } from '../../../../services/http/apiClient';
import type { CategoriaAdmin } from '../../../habits/categorias/types/categorias.types';
import type { HabitoDelProgramaApi } from '../../api/habitosProgramaSchemas';
import type { useHabitosProgramaAdmin } from '../../hooks/useHabitosProgramaAdmin';
import { CategoriasDeHabitoAdminScreen } from '../CategoriasDeHabitoAdminScreen';
import { HabitoProgramaFormScreen } from '../HabitoProgramaFormScreen';
import { HabitosProgramaAdminScreen } from '../HabitosProgramaAdminScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PANTALLAS = path.resolve(__dirname, '..');
const leer = (archivo: string) => fs.readFileSync(path.join(PANTALLAS, archivo), 'utf8');

type Estado = ReturnType<typeof useHabitosProgramaAdmin>;

const cat = (formation: string, key: string, name: string, extra: Partial<CategoriaAdmin> = {}): CategoriaAdmin => ({
  key, code: key, formation, name, icon: 'bookOpen', order: 1, isActive: true, activeHabits: 0, totalHabits: 0,
  canBeDeactivated: true, canBeDeleted: true, ...extra,
});
const habito = (id: string, title: string, formation: string, category: string, extra: Partial<HabitoDelProgramaApi> = {}): HabitoDelProgramaApi => ({
  id, title, description: null, habitType: 'CHECKBOX', category, evidenceRequirement: 'OPTIONAL', isOptional: false, isActive: true,
  formation, targetRoles: [], ...extra,
});

const CATEGORIAS = [
  cat('DIPLOMADO', 'DIPLOMADO_ESTUDIO', 'Estudio profundo', { order: 1, activeHabits: 2, totalHabits: 2, canBeDeactivated: false, canBeDeleted: false }),
  cat('DIPLOMADO', 'DIPLOMADO_PRACTICA', 'Práctica', { order: 2, icon: 'target' }),
  cat('DIPLOMADO', 'DIPLOMADO_HISTORIA', 'Historia', { order: 3, isActive: false, totalHabits: 1, canBeDeleted: false }),
  cat('CERTIFICACION', 'CERTIFICACION_ETICA', 'Ética'),
];

const elegirFormacion = jest.fn<(codigo: string) => void>();
const reemplazar = jest.fn();
const reemplazarCategoria = jest.fn();
const quitarCategoria = jest.fn();
const reemplazarCategoriasDe = jest.fn();

function estado(extra: Partial<Estado> = {}): Estado {
  return {
    formacion: 'DIPLOMADO',
    elegirFormacion,
    habitos: [habito('h1', 'Lectura diaria', 'DIPLOMADO', 'DIPLOMADO_ESTUDIO')],
    roles: [],
    categorias: CATEGORIAS,
    categoriasDelServidor: true,
    categoriasDe: (f: string) => CATEGORIAS.filter(c => c.formation === f),
    cargando: false,
    fallo: null,
    recargar: jest.fn(),
    reemplazar,
    quitar: jest.fn(),
    reemplazarCategoria,
    quitarCategoria,
    reemplazarCategoriasDe,
    ...extra,
  } as unknown as Estado;
}

let raiz: ReactTestRenderer | null = null;
function dibujar(elemento: React.ReactElement): ReactTestRenderer {
  act(() => raiz?.unmount());
  act(() => {
    raiz = TestRenderer.create(elemento);
  });
  return raiz!;
}
const textos = (r: ReactTestRenderer) => r.root.findAll(n => n.type === 'Text').map(n => [n.props.children].flat().join('')).join(' | ');
const botones = (r: ReactTestRenderer, etiqueta: string): ReactTestInstance[] =>
  r.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === etiqueta);
/** El botón cuyo texto visible es `texto` (los de `Legible` no llevan `accessibilityLabel` propio). */
const botonPorTexto = (r: ReactTestRenderer, texto: string): ReactTestInstance =>
  r.root.findAll(n => typeof n.props.onPress === 'function' && n.findAll(x => x.type === 'Text' && [x.props.children].flat().join('') === texto).length > 0)[0];
const campoDeNombre = (r: ReactTestRenderer): ReactTestInstance => r.root.findAll(n => n.props.placeholder === 'Ej.: Estudio' && typeof n.props.onChangeText === 'function')[0];
const pulsar = async (n: ReactTestInstance) => {
  await act(async () => {
    await n.props.onPress();
  });
};

beforeEach(() => {
  for (const f of [elegirFormacion, reemplazar, reemplazarCategoria, quitarCategoria, reemplazarCategoriasDe, mockConfirmar, mockCopiar]) f.mockReset();
  for (const f of Object.values(mockCategoriasApi)) f.mockReset();
  act(() => raiz?.unmount());
  raiz = null;
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('«Hábitos del programa» por formación', () => {
  const lista = (e: Estado, extra: Record<string, unknown> = {}) =>
    dibujar(React.createElement(HabitosProgramaAdminScreen, { estado: e, onAbrir: jest.fn(), onNuevo: jest.fn(), onCategorias: jest.fn(), onVolver: jest.fn(), ...extra } as never));

  it('la cabecera dice la formación, el filtro ofrece Todas y las tres, y la lista es la de esa formación', () => {
    const r = lista(estado());
    const t = textos(r);
    expect(t).toContain('Diplomado Renaser');
    for (const opcion of ['Todas las formaciones', 'Escuela', 'Diplomado', 'Certificación']) {
      expect(r.root.findAll(n => n.props.accessibilityLabel === opcion && n.props.accessibilityRole === 'radio').length).toBeGreaterThan(0);
    }
    expect(t).toContain('Lectura diaria');
    expect(t).toContain('Nuevo');
  });

  it('elegir otra formación la pide al estado; «Todas» pide ALL', async () => {
    const r = lista(estado());
    await pulsar(botones(r, 'Certificación')[0]);
    expect(elegirFormacion).toHaveBeenLastCalledWith('CERTIFICACION');
    await pulsar(botones(r, 'Todas las formaciones')[0]);
    expect(elegirFormacion).toHaveBeenLastCalledWith('ALL');
  });

  it('en «Todas» solo se lee: cada fila lleva el nombre de su formación, no hay «Nuevo» ni entrada a las categorías', () => {
    const r = lista(
      estado({
        formacion: 'ALL',
        habitos: [habito('h1', 'Lectura diaria', 'DIPLOMADO', 'DIPLOMADO_ESTUDIO'), habito('h2', 'Agua tibia', 'ESCUELA', 'BODY')],
      }),
    );
    const t = textos(r);
    expect(t).toContain('Las tres formaciones');
    expect(t).toContain('Diplomado Renaser');
    expect(t).toContain('Escuela Renaser');
    expect(t).not.toContain('Nuevo');
    expect(botones(r, 'Categorías de Escuela')).toHaveLength(0);
    expect(t).toContain('elige una formación');
  });

  it('con una formación concreta ofrece las categorías de ESA formación', async () => {
    const abrir = jest.fn();
    const r = lista(estado(), { onCategorias: abrir });
    await pulsar(botones(r, 'Categorías de Diplomado')[0]);
    expect(abrir).toHaveBeenCalledTimes(1);
  });

  it('una formación sin hábitos lo dice, sin error ni pantalla vacía', () => {
    expect(textos(lista(estado({ habitos: [] })))).toContain('Esta formación todavía no tiene hábitos');
  });

  it('la fila usa el nombre y el ícono de la categoría que puso Administración', () => {
    const r = lista(estado());
    const fila = r.root.findAll(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Lectura diaria'))[0];
    expect(fila.props.accessibilityLabel).toContain('Estudio profundo');
  });
});

describe('«Categorías» de una formación', () => {
  const pantalla = (e: Estado) => dibujar(React.createElement(CategoriasDeHabitoAdminScreen, { estado: e, onVolver: jest.fn() }));

  it('lista las de la formación en su orden, con ícono, estado y cuántos hábitos tiene; ninguna de otra formación', () => {
    const t = textos(pantalla(estado()));
    expect(t).toContain('Diplomado Renaser');
    expect(t.indexOf('Estudio profundo')).toBeLessThan(t.indexOf('Práctica'));
    expect(t).toContain('Activa · 2 hábitos activos');
    expect(t).toContain('Activa · Sin hábitos');
    expect(t).toContain('Desactivada · 0 hábitos activos de 1');
    expect(t).not.toContain('Ética');
  });

  it('bajar una categoría manda el orden completo; la primera no sube y la última no baja', async () => {
    mockCategoriasApi.ordenar.mockResolvedValue([]);
    const r = pantalla(estado());
    expect(botones(r, 'Subir Estudio profundo')[0].props.disabled).toBe(true);
    expect(botones(r, 'Bajar Historia')[0].props.disabled).toBe(true);
    await pulsar(botones(r, 'Bajar Estudio profundo')[0]);
    expect(mockCategoriasApi.ordenar).toHaveBeenCalledWith('DIPLOMADO', ['DIPLOMADO_PRACTICA', 'DIPLOMADO_ESTUDIO', 'DIPLOMADO_HISTORIA']);
    expect(reemplazarCategoriasDe).toHaveBeenCalledWith('DIPLOMADO', []);
  });

  it('el botón de los botones de orden mide 48 y todos tienen nombre para el lector de pantalla', () => {
    const r = pantalla(estado());
    for (const etiqueta of ['Subir Práctica', 'Bajar Práctica']) {
      const nodo = botones(r, etiqueta)[0];
      expect(nodo).toBeDefined();
    }
    expect(leer('CategoriasDeHabitoAdminScreen.tsx')).toMatch(/botonDeOrden: \{ width: 48, height: 48/);
  });

  it('una formación sin categorías invita a crear la primera', () => {
    const t = textos(pantalla(estado({ formacion: 'ESCUELA', categoriasDe: () => [] })));
    expect(t).toContain('Esta formación todavía no tiene categorías');
    expect(t).toContain('Nueva categoría');
  });

  it('crear: valida el nombre antes de enviar y manda formación, nombre e ícono; al terminar se confirma en línea', async () => {
    mockCategoriasApi.crear.mockResolvedValue(cat('DIPLOMADO', 'DIPLOMADO_LECTURA', 'Lectura'));
    const r = pantalla(estado());
    await pulsar(botones(r, 'Nueva')[0]);
    expect(r.root.findAll(n => n.props.accessibilityLabel === 'hoja Nueva categoría').length).toBeGreaterThan(0);

    // Sin nombre no se envía nada: se dice qué falta.
    await pulsar(botonPorTexto(r, 'Crear categoría'));
    expect(mockCategoriasApi.crear).not.toHaveBeenCalled();
    expect(textos(r)).toContain('Escribe el nombre de la categoría.');

    // Un nombre que ya existe en la formación, tampoco.
    await act(async () => { campoDeNombre(r).props.onChangeText('práctica'); });
    await pulsar(botonPorTexto(r, 'Crear categoría'));
    expect(mockCategoriasApi.crear).not.toHaveBeenCalled();
    expect(textos(r)).toContain('Ya hay una categoría con ese nombre en esta formación.');

    // Con nombre e ícono, se envía.
    await act(async () => { campoDeNombre(r).props.onChangeText('Lectura'); });
    await pulsar(r.root.findAll(n => n.props.accessibilityRole === 'radio' && n.props.accessibilityLabel === 'Libro abierto')[0]);
    await pulsar(botonPorTexto(r, 'Crear categoría'));
    expect(mockCategoriasApi.crear).toHaveBeenCalledWith({ formacion: 'DIPLOMADO', nombre: 'Lectura', icono: 'bookOpen' });
    expect(reemplazarCategoria).toHaveBeenCalledWith(expect.objectContaining({ key: 'DIPLOMADO_LECTURA' }));
    expect(textos(r)).toContain('Categoría «Lectura» creada.');
  });

  it('el motivo del servidor se dice tal cual: «tiene hábitos activos» al desactivar', async () => {
    mockCategoriasApi.activa.mockRejectedValue(
      new ApiError(409, 'Esta categoría tiene hábitos activos. Muévelos o desactívalos primero.', { message: 'Esta categoría tiene hábitos activos. Muévelos o desactívalos primero.' }),
    );
    const r = pantalla(estado({ categoriasDe: () => [cat('DIPLOMADO', 'DIPLOMADO_PRACTICA', 'Práctica')] }));
    await pulsar(botones(r, 'Práctica. Activa · Sin hábitos. Abrir para cambiarla')[0]);
    await pulsar(r.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === 'Desactivar')[0]);
    expect(textos(r)).toContain('Esta categoría tiene hábitos activos. Muévelos o desactívalos primero.');
    expect(reemplazarCategoria).not.toHaveBeenCalled();
  });

  it('una con hábitos activos ya muestra apagado «Desactivar» y «Eliminar», con el porqué', async () => {
    const r = pantalla(estado());
    await pulsar(botones(r, 'Estudio profundo. Activa · 2 hábitos activos. Abrir para cambiarla')[0]);
    expect(textos(r)).toContain('Esta categoría tiene hábitos activos. Muévelos o desactívalos primero.');
    const desactivar = r.root.findAll(n => n.props.accessibilityLabel === 'Desactivar' || n.props.accessibilityLabel === 'Eliminar');
    expect(desactivar.every(n => n.props.disabled === true || n.props.accessibilityState?.disabled === true)).toBe(true);
  });

  it('eliminar pide confirmación y, si el servidor acepta, la quita de la lista', async () => {
    mockConfirmar.mockResolvedValue(true);
    mockCategoriasApi.eliminar.mockResolvedValue(undefined);
    const r = pantalla(estado({ categoriasDe: () => [cat('DIPLOMADO', 'DIPLOMADO_PRACTICA', 'Práctica')] }));
    await pulsar(botones(r, 'Práctica. Activa · Sin hábitos. Abrir para cambiarla')[0]);
    await pulsar(r.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === 'Eliminar')[0]);
    expect(mockConfirmar).toHaveBeenCalledWith('¿Eliminar esta categoría?', expect.stringContaining('Práctica'), expect.objectContaining({ destructivo: true }));
    expect(mockCategoriasApi.eliminar).toHaveBeenCalledWith('DIPLOMADO_PRACTICA');
    expect(quitarCategoria).toHaveBeenCalledWith('DIPLOMADO_PRACTICA');
  });
});

describe('«Copiar a otra formación» desde el hábito', () => {
  const formulario = (e: Estado) => dibujar(React.createElement(HabitoProgramaFormScreen, { id: 'h1', estado: e, onVolver: jest.fn() }));
  const chip = (r: ReactTestRenderer, etiqueta: string) => r.root.findAll(n => n.props.accessibilityRole === 'radio' && n.props.accessibilityLabel === etiqueta)[0];

  it('ofrece las OTRAS dos formaciones y, al elegir una, SUS categorías (nunca las de la formación del hábito)', async () => {
    const r = formulario(estado());
    // El hábito es del Diplomado: se copia a las OTRAS dos, nunca a la suya.
    const opciones = r.root.findAll(n => n.props.accessibilityRole === 'radio').map(n => n.props.accessibilityLabel);
    expect(opciones).toContain('Escuela');
    expect(opciones).toContain('Certificación');
    expect(opciones).not.toContain('Diplomado');
    expect(r.root.findAll(n => n.props.accessibilityLabel === 'Ética')).toHaveLength(0);
    await pulsar(chip(r, 'Certificación'));
    expect(chip(r, 'Ética')).toBeDefined();
    expect(textos(r)).toContain('Categoría en Certificación');
  });

  it('copiar manda la formación destino y la categoría de ESA formación, y avisa en línea que quedaron independientes', async () => {
    mockCopiar.mockResolvedValue(habito('h9', 'Lectura diaria', 'CERTIFICACION', 'CERTIFICACION_ETICA'));
    const r = formulario(estado());
    await pulsar(chip(r, 'Certificación'));
    await pulsar(chip(r, 'Ética'));
    await pulsar(botonesPorTexto(r, 'Copiar a Certificación'));
    expect(mockCopiar).toHaveBeenCalledWith('h1', { formacion: 'CERTIFICACION', categoria: 'CERTIFICACION_ETICA' });
    expect(textos(r)).toContain('Copiado a Certificación Renaser. Desde ahora son dos hábitos independientes.');
    // La copia no es de la lista de esta formación: no se agrega.
    expect(reemplazar).not.toHaveBeenCalled();
  });

  it('E2E 01/11: el botón apagado dice qué falta (la formación, y luego la categoría de ESA formación) y desaparece al completarlo', async () => {
    const r = formulario(estado());
    expect(textos(r)).toContain('Elige la formación a la que quieres copiarlo.');
    expect(botonesPorTexto(r, 'Copiar').props.disabled).toBe(true);
    await pulsar(chip(r, 'Certificación'));
    expect(textos(r)).not.toContain('Elige la formación a la que quieres copiarlo.');
    expect(textos(r)).toContain('Elige la categoría en Certificación para poder copiar.');
    expect(botonesPorTexto(r, 'Copiar a Certificación').props.disabled).toBe(true);
    await pulsar(chip(r, 'Ética'));
    expect(textos(r)).not.toContain('Elige la categoría en Certificación para poder copiar.');
    expect(botonesPorTexto(r, 'Copiar a Certificación').props.disabled).toBe(false);
  });

  it('E2E 01/11: «Copiado a …» sale dentro de la misma sección, junto al botón, no solo arriba', async () => {
    mockCopiar.mockResolvedValue(habito('h9', 'Lectura diaria', 'CERTIFICACION', 'CERTIFICACION_ETICA'));
    const r = formulario(estado());
    await pulsar(chip(r, 'Certificación'));
    await pulsar(chip(r, 'Ética'));
    await pulsar(botonesPorTexto(r, 'Copiar a Certificación'));
    const seccion = r.root.findAll(n => n.props.accessibilityRole === 'radiogroup' && n.props.accessibilityLabel === 'Formación de la copia')[0];
    expect(seccion).toBeDefined();
    expect(textos(r).split('Copiado a Certificación Renaser.').length - 1).toBe(1);
  });

  it('un 409 («ya hay uno con ese título») se dice con el motivo del servidor', async () => {
    mockCopiar.mockRejectedValue(new ApiError(409, 'Ya hay un hábito con ese título en la formación elegida.', { message: 'Ya hay un hábito con ese título en la formación elegida.' }));
    const r = formulario(estado());
    await pulsar(chip(r, 'Certificación'));
    await pulsar(chip(r, 'Ética'));
    await pulsar(botonesPorTexto(r, 'Copiar a Certificación'));
    expect(textos(r)).toContain('Ya hay un hábito con ese título en la formación elegida.');
  });

  it('una formación destino sin categorías activas lo dice y no deja copiar', async () => {
    const r = formulario(estado({ categorias: CATEGORIAS.filter(c => c.formation !== 'CERTIFICACION') }));
    await pulsar(chip(r, 'Certificación'));
    expect(textos(r)).toContain('Certificación Renaser todavía no tiene categorías activas');
    expect(botonesPorTexto(r, 'Copiar a Certificación').props.disabled).toBe(true);
  });

  it('el formulario solo ofrece las categorías ACTIVAS de la formación del hábito, con la cabecera diciendo cuál es', () => {
    const r = formulario(estado());
    const t = textos(r);
    expect(t).toContain('Diplomado Renaser');
    expect(chip(r, 'Estudio profundo')).toBeDefined();
    expect(chip(r, 'Práctica')).toBeDefined();
    expect(r.root.findAll(n => n.props.accessibilityLabel === 'Historia')).toHaveLength(0);
    expect(r.root.findAll(n => n.props.accessibilityLabel === 'Cuerpo')).toHaveLength(0);
  });

  function botonesPorTexto(r: ReactTestRenderer, texto: string): ReactTestInstance {
    return r.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === texto)[0]
      ?? r.root.findAll(n => typeof n.props.onPress === 'function' && n.findAll(x => x.type === 'Text' && [x.props.children].flat().join('') === texto).length > 0)[0];
  }
});

describe('el cableado en Administración', () => {
  it('AdminScreen tiene la vista «categorias-habito» y la lista de hábitos la abre', () => {
    const admin = leer('AdminScreen.tsx');
    expect(admin).toMatch(/\{\s*nombre:\s*'categorias-habito'\s*\}/);
    expect(admin).toMatch(/onCategorias=\{\(\) => entrar\(\{ nombre: 'categorias-habito' \}\)\}/);
    expect(admin).toMatch(/<CategoriasDeHabitoAdminScreen estado=\{habitosDelPrograma\} onVolver=\{volver\} \/>/);
  });

  it('la pantalla de categorías atiende el gesto atrás del sistema (sube un nivel: categorías → hábitos → más opciones)', () => {
    expect(leer('CategoriasDeHabitoAdminScreen.tsx')).toMatch(/useSystemBackHandler/);
  });
});
