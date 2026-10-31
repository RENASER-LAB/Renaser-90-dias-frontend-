import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { DiaDeLaSemanaApi, PreferenciaHabitoApi } from '../../habits/types/habits.types';
import type { HabitItem } from '../../../screens/TrainingScreen';

/**
 * «Cambiar nombre» dentro del editor de «Planificar» (2026-10-31, D-127). Hasta el 2026-10-30 vivía en el detalle de la
 * dimensión de «Tus prácticas», que se quitó: ahora está en el editor de Agua tibia con limón y de Jugo verde, y solo
 * ahí, con el mismo flujo de siempre (`RenombrarHabitoModal` → `renombre.renombrar` / `quitarRenombre`). El nombre
 * nuevo se ve en el título del editor y en la lista sin recargar. La hoja también abre sin saber de ningún
 * `abrirEnHabitoId` (esa prop se borró: nadie más la usaba) y Vida y negocio dice dónde se planifica.
 */

const mockAlerta = jest.fn<(titulo: string, mensaje?: string) => void>();
const mockPreferencias = jest.fn<() => Promise<PreferenciaHabitoApi[]>>();
const mockSemana = jest.fn<() => Promise<DiaDeLaSemanaApi[]>>();
const mockRenombrarHoja = jest.fn<(props: PropsDelRenombre) => void>();

type PropsDelRenombre = {
  visible: boolean;
  tituloCatalogo: string;
  tituloActual: string | null;
  onGuardar: (titulo: string, motivo: string) => Promise<void>;
  onQuitar?: () => Promise<void>;
  onCerrar: () => void;
};

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u-1' } }) }));
jest.mock('../../../components/Alerta', () => ({
  Alert: { alert: (titulo: string, mensaje?: string) => mockAlerta(titulo, mensaje) },
}));
jest.mock('../../../utils/tacto', () => ({ tacto: { seleccion: jest.fn(), logro: jest.fn(), error: jest.fn() } }));
jest.mock('../../habits/components/RuedaHoraPicker', () => ({ RuedaHoraPicker: () => null }));
jest.mock('../../habits/components/FilaDeDiasDelPlan', () => ({ FilaDeDiasDelPlan: () => null }));
jest.mock('../../habits/components/RenombrarHabitoModal', () => ({
  RenombrarHabitoModal: (props: PropsDelRenombre) => {
    mockRenombrarHoja(props);
    return null;
  },
}));
jest.mock('../../habits/notificaciones/recordatoriosDeHabito', () => ({
  HAY_RECORDATORIOS: true,
  HAY_RECORDATORIOS_LOCALES: true,
  HAY_RECORDATORIOS_WEB: false,
  antelacionesDe: async () => [],
  sonidoDe: async () => 'sistema',
  programar: async () => true,
  programarConCambioDiferido: async () => true,
  prepararWebPush: async () => true,
}));
jest.mock('../../alarmas/pedirAlarmaExacta', () => ({
  hayQuePedirAlarmaExactaAlGuardar: async () => false,
  anotarQueSePidioAlarmaExacta: async () => undefined,
  hayQueRecordarAlarmaExacta: async () => false,
  abrirPermisoDeAlarmasExactas: async () => 'ninguna',
  TEXTO_PEDIDO_ALARMA_EXACTA: '',
  LINEA_ALARMA_EXACTA_PENDIENTE: '',
}));
jest.mock('../../habits/api/habitsApi', () => ({
  obtenerPreferencias: () => mockPreferencias(),
  obtenerPlanDesbloqueos: async () => ({ items: [] }),
  obtenerHorarioSemanal: () => mockSemana(),
  cambiarHorario: async () => ({ deferred: false }),
  fijarHorarioDelDia: async () => undefined,
  fijarAvisoDelDia: async () => undefined,
  fijarAlarmaGeneral: async () => undefined,
  fijarAlarmaDelDia: async () => undefined,
  quitarHorarioDelDia: async () => undefined,
  apagarDiaDeLaSemana: async () => undefined,
  agregarHabitoAlPlan: async () => undefined,
  cambiarEstadoHabito: async () => undefined,
}));

import { PlanificarDimensionModal } from '../components/PlanificarDimensionModal';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const habito = (id: string, title: string, systemKey: string | null): HabitItem => ({
  id: `track-${id}`, dimension: 'CUERPO', title, time: '06:00', tag: 'CUERPO', streak: 0, done: false,
  hasEvidence: false, tieneTrackHoy: true, habitoId: id, isDeactivatable: true, icon: 'salad', systemKey,
});
const AGUA = habito('h-agua', 'AGUA TIBIA CON LIMÓN', 'WARM_LEMON_WATER');
const JUGO = habito('h-jugo', 'JUGO VERDE', 'GREEN_JUICE');
const GIMNASIO = habito('h-gym', 'GIMNASIO', 'WORKOUT');

const preferencia = (habitId: string): PreferenciaHabitoApi => ({
  habitId, title: habitId, triggerTime: '06:00:00', limitTime: null, customized: true,
  reminderEnabled: true, reminderMinutesBefore: 10, reminderMinutesList: [10], pendingChange: null,
});
const NOMBRES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const semana = (): DiaDeLaSemanaApi[] => NOMBRES.map(weekday => ({
  weekday, triggerTime: '06:00:00', limitTime: null, custom: false, active: true,
  reminderEnabled: true, reminderMinutesList: [10], customReminder: false,
}));

async function esperar() {
  await act(async () => {
    await new Promise(r => setTimeout(r, 0));
  });
}

type Renombre = {
  titulos: Record<string, string>;
  renombrar: jest.Mock<(id: string, titulo: string, motivo: string) => Promise<void>>;
  quitarRenombre: jest.Mock<(id: string) => Promise<void>>;
};
const nuevoRenombre = (titulos: Record<string, string> = {}): Renombre => ({
  titulos,
  renombrar: jest.fn(async () => undefined),
  quitarRenombre: jest.fn(async () => undefined),
});

let raiz: ReactTestRenderer | null = null;

function elemento(habits: HabitItem[], renombre: Renombre | undefined, dimension = 'CUERPO') {
  return React.createElement(PlanificarDimensionModal, {
    visible: true, dimension, habits, renombre, onCerrar: () => undefined, onGuardado: () => undefined,
  });
}

async function montar(habits: HabitItem[], renombre?: Renombre, dimension = 'CUERPO'): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(elemento(habits, renombre, dimension));
  });
  await esperar();
  raiz = r;
  return r;
}

async function volverAMontar(r: ReactTestRenderer, habits: HabitItem[], renombre: Renombre) {
  await act(async () => {
    r.update(elemento(habits, renombre));
  });
  await esperar();
}

function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
}

/** La hoja grande de Planificar (la de «Pausar» y la de renombrar son otras). */
const hojaPlanificar = (r: ReactTestRenderer): ReactTestInstance =>
  r.root.findAll(n => n.props.etiquetaCerrar === 'Cerrar Planificar' && typeof n.props.alCerrar === 'function')[0];

async function abrirElHabito(r: ReactTestRenderer, etiqueta: string) {
  const fila = r.root.findAll(n => typeof n.props.onPress === 'function' && String(n.props.accessibilityLabel ?? '').startsWith(etiqueta))[0];
  await act(async () => {
    fila.props.onPress();
  });
  await esperar();
}

const botonCambiarNombre = (r: ReactTestRenderer): ReactTestInstance | undefined =>
  r.root.findAll(n => typeof n.props.onPress === 'function' && String(n.props.accessibilityLabel ?? '').startsWith('Cambiarle el nombre a'))[0];

beforeEach(() => {
  mockAlerta.mockClear();
  mockRenombrarHoja.mockClear();
  mockPreferencias.mockResolvedValue([preferencia('h-agua'), preferencia('h-jugo'), preferencia('h-gym')]);
  mockSemana.mockReset();
  mockSemana.mockResolvedValue(semana());
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('«Cambiar nombre» en el editor de Planificar (D-127)', () => {
  it('no está en la lista: solo dentro del editor', async () => {
    const r = await montar([AGUA, JUGO, GIMNASIO], nuevoRenombre());
    expect(textos(r)).toContain('Agua tibia con limón');
    expect(textos(r)).not.toContain('Cambiar nombre');
    expect(botonCambiarNombre(r)).toBeUndefined();
  });

  it('en Agua tibia con limón y en Jugo verde, arriba del editor: ícono de 18, texto de 16 y área de 48', async () => {
    for (const titulo of ['Agua tibia con limón', 'Jugo verde']) {
      const r = await montar([AGUA, JUGO, GIMNASIO], nuevoRenombre());
      await abrirElHabito(r, titulo);
      const boton = botonCambiarNombre(r)!;
      expect(boton).toBeDefined();
      expect(boton.props.accessibilityLabel).toBe(`Cambiarle el nombre a ${titulo}`);
      expect(boton.props.accessibilityRole).toBe('button');
      expect(textos(r)).toContain('Cambiar nombre');
      const icono = boton.findAll(n => n.props.name === 'pencil')[0];
      expect(icono.props.size).toBe(18);
      const texto = boton.findAll(n => (n.type as unknown) === 'Text')[0];
      expect(JSON.stringify(texto.props.style)).toContain('"fontSize":16');
      expect(JSON.stringify(boton.props.style)).toContain('"minHeight":48');
      act(() => r.unmount());
      raiz = null;
    }
  });

  it('en los demás hábitos no hay «Cambiar nombre»', async () => {
    const r = await montar([AGUA, JUGO, GIMNASIO], nuevoRenombre());
    await abrirElHabito(r, 'Gimnasio');
    expect(textos(r)).not.toContain('Cambiar nombre');
    expect(botonCambiarNombre(r)).toBeUndefined();
  });

  it('sin el renombre del teléfono (otra pantalla que monte la hoja) la hoja es la de siempre', async () => {
    const r = await montar([JUGO], undefined);
    await abrirElHabito(r, 'Jugo verde');
    expect(botonCambiarNombre(r)).toBeUndefined();
  });

  it('tocarlo abre la hoja de renombre de siempre, con el título del catálogo y sin «quitar» si nunca lo renombró', async () => {
    const renombre = nuevoRenombre();
    const r = await montar([AGUA, JUGO], renombre);
    await abrirElHabito(r, 'Jugo verde');
    expect(mockRenombrarHoja).not.toHaveBeenCalled();
    await act(async () => { botonCambiarNombre(r)!.props.onPress(); });
    const props = mockRenombrarHoja.mock.lastCall![0];
    expect(props).toMatchObject({ visible: true, tituloCatalogo: 'Jugo verde', tituloActual: null });
    expect(props.onQuitar).toBeUndefined();
  });

  it('guardar llama al mismo renombrar del servidor y el nombre nuevo se ve en el título del editor y en la lista, sin recargar', async () => {
    const renombre = nuevoRenombre();
    const r = await montar([AGUA, JUGO], renombre);
    await abrirElHabito(r, 'Jugo verde');
    await act(async () => { botonCambiarNombre(r)!.props.onPress(); });
    await act(async () => { await mockRenombrarHoja.mock.lastCall![0].onGuardar('Jugo de manzana', 'Me cae mal el verde'); });
    expect(renombre.renombrar).toHaveBeenCalledWith('h-jugo', 'Jugo de manzana', 'Me cae mal el verde');

    // El hook de Training entrega los títulos nuevos: la hoja los muestra sin releer nada.
    await volverAMontar(r, [AGUA, JUGO], nuevoRenombre({ 'h-jugo': 'Jugo de manzana' }));
    expect(hojaPlanificar(r).props.titulo).toBe('Jugo de manzana');
    expect(textos(r)).toContain('Cambiar o quitar el nombre');
    expect(botonCambiarNombre(r)!.props.accessibilityLabel).toBe('Cambiarle el nombre a Jugo de manzana');

    // Volver a la lista: la fila ya dice el nombre nuevo, y la otra bebida sigue con el suyo.
    await act(async () => { hojaPlanificar(r).props.alVolver(); });
    const t = textos(r);
    expect(t).toContain('Jugo de manzana');
    expect(t).not.toContain('Jugo verde');
    expect(t).toContain('Agua tibia con limón');
    expect(r.root.findAll(n => String(n.props.accessibilityLabel ?? '').startsWith('Jugo de manzana, a las')).length).toBeGreaterThan(0);
  });

  it('con nombre propio ofrece quitarlo, y quitarlo llama al mismo quitarRenombre', async () => {
    const renombre = nuevoRenombre({ 'h-agua': 'Té tibio' });
    const r = await montar([AGUA, JUGO], renombre);
    await abrirElHabito(r, 'Té tibio');
    await act(async () => { botonCambiarNombre(r)!.props.onPress(); });
    const props = mockRenombrarHoja.mock.lastCall![0];
    expect(props).toMatchObject({ tituloCatalogo: 'Agua tibia con limón', tituloActual: 'Té tibio' });
    await act(async () => { await props.onQuitar!(); });
    expect(renombre.quitarRenombre).toHaveBeenCalledWith('h-agua');
  });

  it('cerrar la hoja de renombre deja el editor como estaba', async () => {
    const r = await montar([JUGO], nuevoRenombre());
    await abrirElHabito(r, 'Jugo verde');
    await act(async () => { botonCambiarNombre(r)!.props.onPress(); });
    const antes = mockRenombrarHoja.mock.calls.length;
    await act(async () => { mockRenombrarHoja.mock.lastCall![0].onCerrar(); });
    await esperar();
    expect(mockRenombrarHoja.mock.calls.length).toBe(antes); // ya no se monta
    expect(hojaPlanificar(r).props.titulo).toBe('Jugo verde');
    expect(botonCambiarNombre(r)).toBeDefined();
  });
});

describe('La hoja abierta desde «Tus prácticas»', () => {
  it('abre en la lista y la ‹ del editor vuelve a la lista (ya no existe abrir directo en un hábito)', async () => {
    const r = await montar([AGUA, JUGO, GIMNASIO], nuevoRenombre());
    expect(hojaPlanificar(r).props.titulo).toBe('Planificar CUERPO');
    expect(hojaPlanificar(r).props.alVolver).toBeUndefined();
    await abrirElHabito(r, 'Gimnasio');
    expect(hojaPlanificar(r).props.titulo).toBe('Gimnasio');
    expect(hojaPlanificar(r).props.etiquetaVolver).toBe('Volver a la lista');
    await act(async () => { hojaPlanificar(r).props.alVolver(); });
    expect(hojaPlanificar(r).props.titulo).toBe('Planificar CUERPO');
    expect(hojaPlanificar(r).props.alVolver).toBeUndefined();
  });

  it('la prop abrirEnHabitoId y su maquinaria se borraron: nadie más la usaba', () => {
    const fuente = fs.readFileSync(path.resolve(__dirname, '..', 'components', 'PlanificarDimensionModal.tsx'), 'utf-8');
    for (const resto of ['abrirEnHabitoId', 'soloUnHabito', 'habitoDirectoNoEncontrado', 'editorDirectoAbierto', 'yaAbrioElHabito', 'cerrarElHabitoDirecto', 'cargaVigente']) {
      expect({ resto, aparece: fuente.includes(resto) }).toEqual({ resto, aparece: false });
    }
  });

  it('Vida y negocio no tiene hábitos de catálogo: la hoja manda a Plan y no ofrece crear', async () => {
    const r = await montar([], nuevoRenombre(), 'VIDA Y NEGOCIO');
    const t = textos(r);
    expect(t).toContain('Las acciones de tus objetivos se planifican en Plan, al agendarlas.');
    expect(t).not.toContain('Crear un hábito');
  });

  it('una dimensión de hábitos sin ninguno dice que todavía no hay y ofrece crear', async () => {
    const r = await montar([], nuevoRenombre(), 'MENTE');
    const t = textos(r);
    expect(t).toContain('Todavía no hay hábitos en esta dimensión.');
    expect(t).toContain('Crear un hábito');
  });
});
