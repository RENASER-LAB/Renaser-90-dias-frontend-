import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { RocaDiariaApi } from '../../types/objetivos.types';
import type { PreferenciasDeAcciones } from '../../notificaciones/preferenciasPorDia';

/**
 * El control de los recordatorios de las acciones, por día, montado de verdad (spec 010, T008).
 *
 * Reglas (spec y respuestas del dueño, 2026-10-20): la fila de días de los hábitos con hoy y lo pasado con candado;
 * «Estos días tienen avisos distintos» sin ninguna opción marcada; con días marcados se guarda SOLO lo tocado y con un
 * botón (sin días marcados, en el acto, como siempre); y todo vive en el teléfono, sin servidor.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Pedido = { identifier?: string; content: Record<string, unknown>; trigger: Record<string, unknown> };
const mockSistema = new Map<string, Pedido>();
const mockEstado = { siguienteId: 1, permiso: true };
const mockAlerta = jest.fn<(titulo: string, mensaje?: string) => void>();
const mockHora = jest.fn<(props: { visible: boolean; horaInicial: string; onConfirmar: (h: string) => void }) => void>();

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: mockEstado.permiso, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: mockEstado.permiso })),
  setNotificationChannelAsync: jest.fn(async () => null),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  scheduleNotificationAsync: jest.fn(async (pedido: Pedido) => {
    const id = pedido.identifier ?? `alarma-${mockEstado.siguienteId++}`;
    mockSistema.set(id, pedido);
    return id;
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockSistema.delete(id);
  }),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => mockSistema.clear()),
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockSistema.entries()].map(([identifier, p]) => ({ ...p, identifier }))),
}));

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../../../../components/Alerta', () => ({
  Alert: { alert: (titulo: string, mensaje?: string) => mockAlerta(titulo, mensaje) },
}));
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: jest.fn(), logro: jest.fn(), error: jest.fn() } }));
jest.mock('../../../habits/components/HoraPickerModal', () => ({
  HoraPickerModal: (props: { visible: boolean; horaInicial: string; onConfirmar: (h: string) => void }) => {
    mockHora(props);
    return null;
  },
}));
// Hoy es MIÉRCOLES: lunes, martes y miércoles van con candado; de jueves en adelante se pueden tocar. La regla es la
// de los hábitos (`esPlanificable`); acá solo se fija qué día es hoy.
jest.mock('../../../habits/utils/semanaDelPlan', () => {
  const real = jest.requireActual<typeof import('../../../habits/utils/semanaDelPlan')>('../../../habits/utils/semanaDelPlan');
  return { ...real, esPlanificable: (dia: string) => real.DIAS_DEL_PLAN.indexOf(dia as never) > 2 };
});
const mockAgendadas = jest.fn<() => Promise<{ desde: string; hasta: string; rocas: RocaDiariaApi[] }>>();
jest.mock('../../api/objetivosApi', () => ({
  obtenerRocasAgendadas: () => mockAgendadas(),
  obtenerRocasDeHoy: async () => [],
  obtenerRocasDeManana: async () => [],
}));

import { Interruptor } from '../../../../components/Interruptor';
import { BotonPrincipal } from '../../../../components/Legible';
import { guardarPreferenciasDeAcciones, preferenciasDeAcciones } from '../../notificaciones/recordatoriosDeAcciones';
import { RecordatorioDeAcciones } from '../RecordatorioDeAcciones';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const USUARIO = 'u-1';
const BASE: PreferenciasDeAcciones = { diarioActivo: true, horaDiaria: '07:00', antelaciones: [10] };
const programadas = () => [...mockSistema.entries()];

let raiz: ReactTestRenderer | null = null;

async function esperar() {
  await act(async () => {
    await new Promise(r => setTimeout(r, 0));
  });
}

async function montar(prefs: PreferenciasDeAcciones | null = BASE, rocas?: RocaDiariaApi[]): Promise<ReactTestRenderer> {
  if (prefs) await guardarPreferenciasDeAcciones(USUARIO, prefs);
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(RecordatorioDeAcciones, { userId: USUARIO, rocas }));
  });
  await esperar();
  raiz = r;
  return r;
}

const textos = (r: ReactTestRenderer): string =>
  r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');

/** La pastilla de un día de la fila: el nodo con la etiqueta «Sábado 26, …». */
const pastillaDelDia = (r: ReactTestRenderer, dia: string): ReactTestInstance =>
  r.root.findAll(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith(dia) && typeof n.props.onPress === 'function')[0];

async function tocarDia(r: ReactTestRenderer, ...dias: string[]) {
  for (const dia of dias) {
    await act(async () => {
      pastillaDelDia(r, dia).props.onPress();
    });
  }
}

const pastilla = (r: ReactTestRenderer, etiqueta: string): ReactTestInstance =>
  r.root.findAll(n => n.props.accessibilityRole === 'checkbox' && n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function')[0];
const marcada = (r: ReactTestRenderer, etiqueta: string): boolean => pastilla(r, etiqueta).props.accessibilityState?.checked === true;

async function tocarPastilla(r: ReactTestRenderer, etiqueta: string) {
  await act(async () => {
    pastilla(r, etiqueta).props.onPress();
  });
  await esperar();
}

const interruptor = (r: ReactTestRenderer): ReactTestInstance => r.root.findAll(n => (n.type as unknown) === Interruptor)[0];
const botonDeGuardar = (r: ReactTestRenderer): ReactTestInstance | undefined =>
  r.root.findAll(n => (n.type as unknown) === BotonPrincipal).find(b => String(b.props.etiqueta).startsWith('Guardar'));

async function tocarElInterruptor(r: ReactTestRenderer, valor: boolean) {
  await act(async () => {
    interruptor(r).props.onCambiar(valor);
  });
  await esperar();
}

async function elegirHora(hora: string) {
  await act(async () => {
    mockHora.mock.lastCall![0].onConfirmar(hora);
  });
  await esperar();
}

async function guardarLosDias(r: ReactTestRenderer) {
  await act(async () => {
    botonDeGuardar(r)!.props.onPress();
  });
  await esperar();
}

beforeEach(async () => {
  mockSistema.clear();
  mockEstado.siguienteId = 1;
  mockEstado.permiso = true;
  mockAlerta.mockClear();
  mockHora.mockClear();
  mockAgendadas.mockReset();
  mockAgendadas.mockResolvedValue({ desde: '2026-09-23', hasta: '2026-09-27', rocas: [] });
  await AsyncStorage.clear();
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('la fila de los siete días (la de los hábitos)', () => {
  it('hoy y lo pasado van con candado; de mañana en adelante se puede tocar', async () => {
    const r = await montar();
    for (const bloqueado of ['Lunes', 'Martes', 'Miércoles']) {
      expect(pastillaDelDia(r, bloqueado).props.accessibilityState).toMatchObject({ disabled: true });
      expect(pastillaDelDia(r, bloqueado).props.accessibilityLabel).toContain('ya no se puede cambiar');
    }
    for (const libre of ['Jueves', 'Viernes', 'Sábado', 'Domingo']) {
      expect(pastillaDelDia(r, libre).props.accessibilityState).toMatchObject({ disabled: false });
    }
  });

  it('cada día muestra la hora de su recordatorio diario, y el aviso propio solo si difiere del general', async () => {
    const r = await montar({ ...BASE, dias: { 6: { horaDiaria: '09:00', antelaciones: [30] }, 7: { diarioActivo: false } } });
    const t = textos(r);
    expect(t).toContain('09:00');
    // El chip no escribe los minutos del aviso (spec 011): solo la campana; el lector de pantalla los oye completos.
    expect(t).not.toContain('30′');
    // Los días como el general muestran la general.
    expect(t).toContain('07:00');
    // Y el sábado lo dice completo para el lector de pantalla.
    expect(pastillaDelDia(r, 'Sábado').props.accessibilityLabel).toContain('aviso 30 minutos antes');
  });
});

describe('sin días marcados: la general, en el acto, como siempre', () => {
  it('la línea dice lo mismo de antes: «Todos los días a las 07:00.»', async () => {
    const r = await montar();
    expect(textos(r)).toContain('Todos los días a las 07:00.');
    expect(textos(r)).toContain('Todos los días');
    expect(interruptor(r).props.valor).toBe(true);
    expect(marcada(r, '10 min antes')).toBe(true);
    expect(botonDeGuardar(r)).toBeUndefined();
  });

  it('encender el recordatorio programa una alarma diaria y lo guarda', async () => {
    const r = await montar({ ...BASE, diarioActivo: false });
    expect(textos(r)).toContain('Apagado en este teléfono.');
    await tocarElInterruptor(r, true);
    expect(programadas()).toHaveLength(1);
    expect(programadas()[0][1].trigger).toMatchObject({ type: 'daily', hour: 7, minute: 0 });
    expect((await preferenciasDeAcciones(USUARIO)).diarioActivo).toBe(true);
  });

  it('sin permiso no lo enciende y lo dice', async () => {
    const r = await montar({ ...BASE, diarioActivo: false });
    mockEstado.permiso = false;
    await tocarElInterruptor(r, true);
    expect(mockAlerta).toHaveBeenCalledWith('Falta el permiso', expect.stringContaining('permiso'));
    expect(programadas()).toEqual([]);
    expect((await preferenciasDeAcciones(USUARIO)).diarioActivo).toBe(false);
  });

  it('cambiar la hora la guarda y mueve la alarma', async () => {
    const r = await montar();
    await tocarElInterruptor(r, true); // ya estaba encendido: sin cambios
    await elegirHora('08:15');
    expect((await preferenciasDeAcciones(USUARIO)).horaDiaria).toBe('08:15');
    expect(programadas()).toHaveLength(1);
    expect(programadas()[0][1].trigger).toMatchObject({ type: 'daily', hour: 8, minute: 15 });
  });

  it('elegir un aviso se guarda en el acto y rehace las alarmas de las acciones de la semana', async () => {
    const accion: RocaDiariaApi = {
      id: 'sab', fecha: '2999-01-02', posicion: 1, titulo: 'Llamar', descripcion: null, color: 'VERDE', puntajeImpacto: 5,
      esDelegable: false, eje: 'TRABAJO', rocaSemanalId: null, horaInicio: '07:00:00', horaFin: null, completada: false,
      completadaEn: null, puntosOtorgados: 0, bloqueada: false, acciones: [],
    };
    mockAgendadas.mockResolvedValue({ desde: '2999-01-01', hasta: '2999-01-07', rocas: [accion] });
    const r = await montar({ ...BASE, antelaciones: [] });
    expect(marcada(r, 'Sin aviso')).toBe(true);
    await tocarPastilla(r, '30 min antes');
    expect(marcada(r, '30 min antes')).toBe(true);
    expect(marcada(r, 'Sin aviso')).toBe(false);
    expect((await preferenciasDeAcciones(USUARIO)).antelaciones).toEqual([30]);
    const alarmasDeAccion = programadas().filter(([, p]) => p.trigger.type === 'date');
    expect(alarmasDeAccion).toHaveLength(1);
    // «Sin aviso» no deja ninguna sonando.
    await tocarPastilla(r, 'Sin aviso');
    expect(programadas().filter(([, p]) => p.trigger.type === 'date')).toEqual([]);
  });
});

describe('con días marcados: se guarda con un botón, y solo lo tocado', () => {
  it('marcar sábado y domingo cambia el alcance, y nada se guarda hasta tocar «Guardar»', async () => {
    const r = await montar();
    await tocarDia(r, 'Sábado', 'Domingo');
    expect(textos(r)).toContain('Solo sáb, dom');
    expect(textos(r)).toContain('Solo sáb, dom, todas las semanas. Hoy no cambia.');
    expect(botonDeGuardar(r)).toBeUndefined();

    await elegirHora('09:00');
    expect(textos(r)).toContain('Sáb, dom: a las 09:00.');
    // Lo tocado está en el borrador: ni se guardó ni se programó nada.
    expect((await preferenciasDeAcciones(USUARIO)).dias).toBeUndefined();
    expect(programadas()).toEqual([]);
    expect(botonDeGuardar(r)?.props.etiqueta).toBe('Guardar cambios · sáb, dom');
  });

  it('«Guardar»: esos días suenan a las 09:00 y los demás a las 07:00; la fila vuelve a «todos los días»', async () => {
    const r = await montar();
    await tocarDia(r, 'Sábado', 'Domingo');
    await elegirHora('09:00');
    await guardarLosDias(r);

    expect((await preferenciasDeAcciones(USUARIO)).dias).toEqual({ 6: { horaDiaria: '09:00' }, 7: { horaDiaria: '09:00' } });
    expect(programadas()).toHaveLength(7);
    const hora = (id: string) => (mockSistema.get(id)!.trigger as { hour: number }).hour;
    expect(hora('acciones-diario-d6')).toBe(9);
    expect(hora('acciones-diario-d7')).toBe(9);
    expect(hora('acciones-diario-d1')).toBe(7);
    expect(textos(r)).toContain('Guardado para sáb, dom.');
    expect(textos(r)).toContain('Todos los días');
    expect(botonDeGuardar(r)).toBeUndefined();
    expect(textos(r)).toContain('Todos los días a las 07:00. Algunos días tienen el suyo.');
  });

  it('«Estos días tienen avisos distintos»: ninguna opción marcada, y al elegir una se pone a todos', async () => {
    const r = await montar({ ...BASE, dias: { 6: { antelaciones: [30] }, 7: { antelaciones: [] } } });
    await tocarDia(r, 'Sábado', 'Domingo');
    expect(textos(r)).toContain('Estos días tienen avisos distintos');
    for (const etiqueta of ['Sin aviso', '30 min antes', '10 min antes', 'A la hora']) expect(marcada(r, etiqueta)).toBe(false);

    await tocarPastilla(r, 'A la hora');
    expect(textos(r)).not.toContain('Estos días tienen avisos distintos');
    expect(marcada(r, 'A la hora')).toBe(true);
    await guardarLosDias(r);
    const dias = (await preferenciasDeAcciones(USUARIO)).dias;
    expect(dias).toEqual({ 6: { antelaciones: [0] }, 7: { antelaciones: [0] } });
  });

  it('solo el aviso: cada día conserva su hora; solo la hora: cada día conserva su aviso', async () => {
    const inicial: PreferenciasDeAcciones = {
      ...BASE,
      dias: { 6: { horaDiaria: '09:00', antelaciones: [30] }, 7: { horaDiaria: '10:00' } },
    };
    const r = await montar(inicial);
    await tocarDia(r, 'Sábado', 'Domingo');
    await tocarPastilla(r, '30 min antes'); // desde «distintos» ([30] y [10]) parte de ninguno: queda [30]
    await guardarLosDias(r);
    expect((await preferenciasDeAcciones(USUARIO)).dias).toEqual({
      6: { horaDiaria: '09:00', antelaciones: [30] },
      7: { horaDiaria: '10:00', antelaciones: [30] },
    });

    await tocarDia(r, 'Sábado', 'Domingo');
    await elegirHora('11:00');
    await guardarLosDias(r);
    expect((await preferenciasDeAcciones(USUARIO)).dias).toEqual({
      6: { horaDiaria: '11:00', antelaciones: [30] },
      7: { horaDiaria: '11:00', antelaciones: [30] },
    });
  });

  it('el recordatorio diario apagado un día: ese día no suena', async () => {
    const r = await montar();
    await tocarDia(r, 'Domingo');
    await tocarElInterruptor(r, false);
    expect(interruptor(r).props.valor).toBe(false);
    expect(textos(r)).toContain('Dom: apagado.');
    await guardarLosDias(r);
    expect((await preferenciasDeAcciones(USUARIO)).dias).toEqual({ 7: { diarioActivo: false } });
    expect(programadas()).toHaveLength(6);
    expect(mockSistema.has('acciones-diario-d7')).toBe(false);
  });

  it('tocar y dejarlo como estaba no ofrece guardar', async () => {
    const r = await montar();
    await tocarDia(r, 'Sábado');
    await elegirHora('07:00');
    expect(botonDeGuardar(r)).toBeUndefined();
  });

  it('«Todos» vuelve a la general y descarta lo que no se guardó', async () => {
    const r = await montar();
    await tocarDia(r, 'Sábado');
    await elegirHora('09:00');
    expect(botonDeGuardar(r)).toBeDefined();
    const todos = r.root.findAll(n => n.props.accessibilityLabel === 'Volver a todos los días' && typeof n.props.onPress === 'function')[0];
    await act(async () => {
      todos.props.onPress();
    });
    expect(textos(r)).toContain('Todos los días a las 07:00.');
    expect(botonDeGuardar(r)).toBeUndefined();
    expect((await preferenciasDeAcciones(USUARIO)).dias).toBeUndefined();
  });

  it('«Dejar sáb como los demás días» devuelve el día a la general, en el acto', async () => {
    const r = await montar({ ...BASE, dias: { 6: { horaDiaria: '09:00', antelaciones: [30] } } });
    await tocarDia(r, 'Sábado');
    const enlace = r.root.findAll(n => typeof n.props.onPress === 'function'
      && n.findAll(x => (x.type as unknown) === 'Text' && String(x.props.children).includes('como los demás días')).length > 0);
    expect(enlace.length).toBeGreaterThan(0);
    await act(async () => {
      enlace[enlace.length - 1].props.onPress();
    });
    await esperar();
    expect((await preferenciasDeAcciones(USUARIO)).dias).toBeUndefined();
    expect(programadas()).toHaveLength(1);
    expect(programadas()[0][1].trigger).toMatchObject({ type: 'daily', hour: 7 });
  });

  it('el enlace de «como los demás días» no aparece si los días marcados no tienen nada propio', async () => {
    const r = await montar();
    await tocarDia(r, 'Sábado');
    expect(textos(r)).not.toContain('como los demás días');
  });

  it('sin permiso, guardar no cambia nada y lo dice', async () => {
    const r = await montar();
    await tocarDia(r, 'Sábado');
    await elegirHora('09:00');
    mockEstado.permiso = false;
    await guardarLosDias(r);
    expect(mockAlerta).toHaveBeenCalledWith('Falta el permiso', expect.any(String));
    expect((await preferenciasDeAcciones(USUARIO)).dias).toBeUndefined();
    // El borrador sigue ahí para reintentar.
    expect(botonDeGuardar(r)).toBeDefined();
  });
});

describe('todo en el teléfono: sin servidor', () => {
  it('guardar solo escribe preferencias locales y lee las acciones agendadas, nada más', async () => {
    const r = await montar();
    await tocarDia(r, 'Sábado');
    await elegirHora('09:00');
    await guardarLosDias(r);
    // El único pedido de red posible es la lectura de las acciones agendadas, para rehacer sus avisos (aquí, ninguno).
    expect(mockAgendadas.mock.calls.length).toBeLessThanOrEqual(1);
  });
});
