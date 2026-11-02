import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { CambioDeFechaApi, FechaDelHabitoApi, PreferenciaHabitoApi, SemanaDelHabitoApi } from '../../../habits/types/habits.types';
import type { HabitItem } from '../../../../screens/TrainingScreen';
import { ApiError } from '../../../../services/http/apiClient';
import { fechasDeLaSemana } from '../../utils/semanasDelEditor';

/**
 * «Siempre | Por semana» del editor de Planificar (2026-11-02, pedido del dueño), montado de verdad: pasar de semana con las flechas
 * (`SelectorDeSemana`) hasta la última del programa, leer cada semana una sola vez, guardar SOLO la semana que se ve, lo guardado que sale
 * marcado al abrir (issue #95) y los párrafos de ayuda que ya no están. Hoy es miércoles 4 de noviembre de 2026 y la persona va por el
 * día 20 de 90: la última semana es la del lunes 11 de enero de 2027.
 */

const mockAlerta = jest.fn<(titulo: string, mensaje?: string) => void>();
const mockRueda = jest.fn<(props: { horaInicial: number; minutoInicial: number; onCambiar: (h: number, m: number) => void }) => void>();
const mockPreferencias = jest.fn<() => Promise<PreferenciaHabitoApi[]>>();
const mockSemana = jest.fn<(habitId: string, lunes: string) => Promise<SemanaDelHabitoApi>>();
const mockGuardarSemana = jest.fn<(habitId: string, lunes: string, dias: CambioDeFechaApi[]) => Promise<void>>();
const mockFijarHorarioDelDia = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockAjustarAlarmas = jest.fn<(userId: string, prefs: PreferenciaHabitoApi[], opciones: unknown) => Promise<number>>();
const mockTacto = jest.fn<() => void>();

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u-1' } }) }));
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: (titulo: string, mensaje?: string) => mockAlerta(titulo, mensaje) } }));
jest.mock('../../../../utils/tacto', () => {
  const real = jest.requireActual<typeof import('../../../../utils/tacto')>('../../../../utils/tacto');
  return { tacto: { ...real.tacto, seleccion: () => mockTacto() } };
});
jest.mock('../../../habits/components/RuedaHoraPicker', () => ({
  RuedaHoraPicker: (props: { horaInicial: number; minutoInicial: number; onCambiar: (h: number, m: number) => void }) => {
    mockRueda(props);
    return null;
  },
}));
const mockFilaDias = jest.fn<(props: Record<string, unknown>) => void>();
jest.mock('../../../habits/components/FilaDeDiasDelPlan', () => ({
  FilaDeDiasDelPlan: (props: Record<string, unknown>) => {
    mockFilaDias(props);
    return null;
  },
}));
/** Hoy es miércoles 4 de noviembre de 2026: en la semana en curso se pueden cambiar jueves a domingo. */
jest.mock('../../../habits/utils/semanaDelPlan', () => {
  const real = jest.requireActual<typeof import('../../../habits/utils/semanaDelPlan')>('../../../habits/utils/semanaDelPlan');
  const fechas = {
    LUN: '2026-11-02', MAR: '2026-11-03', 'MIÉ': '2026-11-04', JUE: '2026-11-05', VIE: '2026-11-06', 'SÁB': '2026-11-07', DOM: '2026-11-08',
  };
  return {
    ...real,
    INDICE_DE_HOY: 2,
    MOSTRAR_SEMANA_SIGUIENTE: false,
    esPlanificable: (dia: string) => real.DIAS_DEL_PLAN.indexOf(dia as never) > 2,
    fechasIsoDeLaSemana: () => fechas,
    diasDelMesDeLaSemana: () => ({ LUN: '02', MAR: '03', 'MIÉ': '04', JUE: '05', VIE: '06', 'SÁB': '07', DOM: '08' }),
  };
});
jest.mock('../../../habits/notificaciones/recordatoriosDeHabito', () => ({
  HAY_RECORDATORIOS: true,
  HAY_RECORDATORIOS_WEB: false,
  HAY_RECORDATORIOS_LOCALES: true,
  antelacionesDe: async () => [],
  sonidoDe: async () => 'sistema',
  programar: async () => true,
  programarConCambioDiferido: async () => true,
  prepararWebPush: async () => true,
  ajustarRecordatoriosAlServidor: (userId: string, prefs: PreferenciaHabitoApi[], opciones: unknown) => mockAjustarAlarmas(userId, prefs, opciones),
}));
jest.mock('../../../alarmas/pedirAlarmaExacta', () => ({
  hayQuePedirAlarmaExactaAlGuardar: async () => false,
  anotarQueSePidioAlarmaExacta: async () => undefined,
  hayQueRecordarAlarmaExacta: async () => false,
  abrirPermisoDeAlarmasExactas: async () => 'ninguna',
  TEXTO_PEDIDO_ALARMA_EXACTA: '',
  LINEA_ALARMA_EXACTA_PENDIENTE: '',
}));
jest.mock('../../../habits/api/habitsApi', () => ({
  obtenerPreferencias: () => mockPreferencias(),
  obtenerPlanDesbloqueos: async () => ({ items: [] }),
  obtenerHorarioSemanal: async () => [],
  obtenerSemanaDelHabito: (habitId: string, lunes: string) => mockSemana(habitId, lunes),
  guardarSemanaDelHabito: (habitId: string, lunes: string, dias: CambioDeFechaApi[]) => mockGuardarSemana(habitId, lunes, dias),
  volverAlPlanDeSiempreDelHabito: async () => undefined,
  cambiarHorario: async () => ({ deferred: false }),
  fijarHorarioDelDia: (...args: unknown[]) => mockFijarHorarioDelDia(...args),
  agregarHabitoAlPlan: async () => undefined,
  cambiarEstadoHabito: async () => undefined,
}));

import { ControlSegmentado } from '../../../../components/ControlSegmentado';
import { HojaDesdeAbajo } from '../../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { PlanificarDimensionModal } from '../PlanificarDimensionModal';
import { SelectorDeSemana } from '../SelectorDeSemana';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const JUGO: HabitItem = {
  id: 'track-h-jugo', dimension: 'CUERPO', title: 'JUGO VERDE', time: '09:00', tag: 'CUERPO', streak: 0, done: false,
  hasEvidence: false, tieneTrackHoy: true, habitoId: 'h-jugo', isDeactivatable: true, icon: 'salad',
};

const preferencia = (extra: Partial<PreferenciaHabitoApi> = {}): PreferenciaHabitoApi => ({
  habitId: 'h-jugo', title: 'h-jugo', triggerTime: '09:00:00', limitTime: null, customized: true,
  reminderEnabled: false, reminderMinutesBefore: null, pendingChange: null, dateOverrides: [], ...extra,
});

/** Una fecha con fila propia, como la manda `GET /habit-preferences` en `dateOverrides`. */
const fechaPropia = (date: string): FechaDelHabitoApi => ({
  date, weekday: 'SATURDAY', triggerTime: '10:00:00', active: true, reminderEnabled: false, reminderMinutesList: [],
  customTime: true, customReminder: false, customAlarm: false, customDate: true,
});

const NOMBRES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
/** La semana que empieza ese lunes, como la manda el servidor; `cambios` por día de la semana. */
function semanaDe(lunes: string, cambios: Partial<Record<(typeof NOMBRES)[number], Partial<FechaDelHabitoApi>>> = {}): SemanaDelHabitoApi {
  const fechas = Object.values(fechasDeLaSemana(lunes));
  return {
    weekStart: lunes,
    weekEnd: fechas[6],
    days: NOMBRES.map((weekday, i) => ({
      weekday, date: fechas[i], triggerTime: '09:00:00', limitTime: null, active: true,
      reminderEnabled: false, reminderMinutesList: [], customTime: false, customReminder: false,
      customAlarm: false, alarm: { sound: true, vibration: true, voice: false, repeat: false },
      customDate: false, editable: lunes !== '2026-11-02' || i > 2, ...(cambios[weekday] ?? {}),
    })),
  };
}

async function esperar() {
  await act(async () => { await new Promise(r => setTimeout(r, 0)); });
}
async function montar(props: { diaPrograma?: number | null; duracionDias?: number | null } = { diaPrograma: 20, duracionDias: 90 }): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(PlanificarDimensionModal, {
      visible: true, dimension: 'CUERPO', habits: [JUGO], onCerrar: () => undefined, onGuardado: () => undefined, ...props,
    }));
  });
  await esperar();
  return r;
}
const textoDe = (n: ReactTestInstance) => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join('');
const textos = (r: ReactTestRenderer) => r.root.findAll(n => (n.type as unknown) === 'Text').map(textoDe).join(' | ');
async function abrir(r: ReactTestRenderer) {
  const filas = r.root.findAll(n => typeof n.props.onPress === 'function' && n.findAll(h => (h.type as unknown) === 'Text' && h.props.children === 'Jugo verde').length > 0);
  await act(async () => { filas[filas.length - 1].props.onPress(); });
  await esperar();
}
const control = (r: ReactTestRenderer) => r.root.findAll(n => n.type === ControlSegmentado);
const selector = (r: ReactTestRenderer) => r.root.findAll(n => n.type === SelectorDeSemana)[0];
const alcance = async (r: ReactTestRenderer, valor: 'siempre' | 'semana') => {
  await act(async () => { control(r)[0].props.onCambiar(valor); });
  await esperar();
};
/** Pasa de semana como lo hacen las flechas y el deslizamiento: por `alCambiar` del selector. */
const irA = async (r: ReactTestRenderer, cambio: 'anterior' | 'siguiente') => {
  await act(async () => { selector(r).props.alCambiar(cambio); });
  await esperar();
};
const filaDeDias = () => mockFilaDias.mock.lastCall![0] as {
  enEdicion: string[]; corre: Record<string, boolean>; diasDelMes?: Record<string, string>; planificable?: (d: string) => boolean;
  marcaDelDia?: (d: string) => { largo: string } | null; onAlternarDia: (d: string) => void;
};
const botonGuardar = (r: ReactTestRenderer) => r.root.findAll(n => typeof n.props.label === 'string' && n.props.label.startsWith('Guardar'))[0];
const guardar = async (r: ReactTestRenderer) => { await act(async () => { botonGuardar(r).props.onPress(); }); await esperar(); };

let raiz: ReactTestRenderer | null = null;
beforeEach(() => {
  [mockAlerta, mockRueda, mockPreferencias, mockSemana, mockGuardarSemana, mockFijarHorarioDelDia, mockFilaDias, mockAjustarAlarmas, mockTacto]
    .forEach(m => m.mockReset());
  mockPreferencias.mockResolvedValue([preferencia()]);
  mockSemana.mockImplementation(async (_h, lunes) => semanaDe(lunes));
  mockGuardarSemana.mockResolvedValue(undefined);
  mockAjustarAlarmas.mockResolvedValue(1);
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('«Siempre | Por semana»', () => {
  it('el control se llama así, arranca en «Siempre» y no pide ninguna semana', async () => {
    raiz = await montar();
    await abrir(raiz);
    expect(control(raiz)[0].props.opciones.map((o: { etiqueta: string }) => o.etiqueta)).toEqual(['Siempre', 'Por semana']);
    expect(control(raiz)[0].props.valor).toBe('siempre');
    expect(mockSemana).not.toHaveBeenCalled();
    expect(raiz.root.findAll(n => n.type === SelectorDeSemana)).toHaveLength(0);
    expect(textos(raiz)).toContain('Todos los días');
  });
});

describe('pasar de semana', () => {
  it('«Por semana» abre en la semana en curso, con las flechas: la anterior apagada y la siguiente encendida', async () => {
    raiz = await montar();
    await abrir(raiz);
    await alcance(raiz, 'semana');
    expect(mockSemana).toHaveBeenCalledTimes(1);
    expect(mockSemana).toHaveBeenCalledWith('h-jugo', '2026-11-02');
    expect(selector(raiz).props).toEqual(expect.objectContaining({
      rotulo: 'Semana del 2 al 8 nov', puedeAnterior: false, puedeSiguiente: true, ocupado: false,
    }));
    // Hoy y lo pasado van con candado en esta semana.
    expect(filaDeDias().enEdicion).toEqual(['JUE', 'VIE', 'SÁB', 'DOM']);
    expect(filaDeDias().planificable!('MAR')).toBe(false);
    expect(filaDeDias().planificable!('JUE')).toBe(true);
  });

  it('la semana siguiente se lee al llegar, con sus fechas y sin candado: todos sus días se pueden marcar', async () => {
    raiz = await montar();
    await abrir(raiz);
    await alcance(raiz, 'semana');
    await irA(raiz, 'siguiente');
    expect(mockSemana).toHaveBeenLastCalledWith('h-jugo', '2026-11-09');
    expect(selector(raiz).props.rotulo).toBe('Semana del 9 al 15 nov');
    expect(selector(raiz).props.puedeAnterior).toBe(true);
    expect(filaDeDias().enEdicion).toEqual(['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']);
    expect(filaDeDias().diasDelMes).toEqual({ LUN: '09', MAR: '10', 'MIÉ': '11', JUE: '12', VIE: '13', 'SÁB': '14', DOM: '15' });
    expect(filaDeDias().planificable!('LUN')).toBe(true);
    expect(mockTacto).toHaveBeenCalled();
  });

  it('cada semana se lee UNA sola vez: ir y volver no repite el pedido', async () => {
    raiz = await montar();
    await abrir(raiz);
    await alcance(raiz, 'semana');
    await irA(raiz, 'siguiente');
    await irA(raiz, 'siguiente');
    await irA(raiz, 'anterior');
    await irA(raiz, 'anterior');
    await irA(raiz, 'siguiente');
    expect(mockSemana.mock.calls.map(c => c[1])).toEqual(['2026-11-02', '2026-11-09', '2026-11-16']);
  });

  it('llega hasta la última semana del programa y ahí la flecha de adelante se apaga', async () => {
    raiz = await montar();
    await abrir(raiz);
    await alcance(raiz, 'semana');
    for (let i = 0; i < 10; i++) await irA(raiz, 'siguiente');
    expect(selector(raiz).props.rotulo).toBe('Semana del 11 al 17 ene');
    expect(selector(raiz).props.puedeSiguiente).toBe(false);
    await irA(raiz, 'siguiente');
    expect(mockSemana).toHaveBeenCalledTimes(11);
    expect(selector(raiz).props.rotulo).toBe('Semana del 11 al 17 ene');
  });

  it('con un programa de un año llega mucho más lejos', async () => {
    raiz = await montar({ diaPrograma: 20, duracionDias: 365 });
    await abrir(raiz);
    await alcance(raiz, 'semana');
    for (let i = 0; i < 30; i++) await irA(raiz, 'siguiente');
    expect(selector(raiz).props.puedeSiguiente).toBe(true);
    expect(selector(raiz).props.rotulo).toBe('Semana del 31 may al 6 jun');
  });

  it('sin saber el día del programa solo se ve la primera semana', async () => {
    raiz = await montar({});
    await abrir(raiz);
    await alcance(raiz, 'semana');
    expect(selector(raiz).props.puedeAnterior).toBe(false);
    expect(selector(raiz).props.puedeSiguiente).toBe(false);
    await irA(raiz, 'siguiente');
    expect(mockSemana).toHaveBeenCalledTimes(1);
  });

  it('el último día del programa solo queda la semana en curso', async () => {
    raiz = await montar({ diaPrograma: 90, duracionDias: 90 });
    await abrir(raiz);
    // Hoy es el último día: la semana en curso todavía tiene un día de programa, pero no una semana por venir.
    expect(control(raiz)).toHaveLength(1);
    await alcance(raiz, 'semana');
    expect(selector(raiz).props.puedeSiguiente).toBe(false);
  });

  it('si la semana a la que se pasa no se puede leer, se vuelve a la anterior y se dice', async () => {
    raiz = await montar();
    await abrir(raiz);
    await alcance(raiz, 'semana');
    mockSemana.mockRejectedValueOnce(new ApiError(500, 'se cayó'));
    await irA(raiz, 'siguiente');
    expect(mockAlerta).toHaveBeenCalledWith('No pudimos cargar esta semana', expect.any(String));
    expect(selector(raiz).props.rotulo).toBe('Semana del 2 al 8 nov');
    expect(filaDeDias().enEdicion).toEqual(['JUE', 'VIE', 'SÁB', 'DOM']);
    // Y se puede volver a intentar: esa semana no quedó marcada como leída.
    await irA(raiz, 'siguiente');
    expect(selector(raiz).props.rotulo).toBe('Semana del 9 al 15 nov');
  });

  it('mientras se lee una semana la fila se ve atenuada y no se pasa a otra', async () => {
    raiz = await montar();
    await abrir(raiz);
    await alcance(raiz, 'semana');
    let responder!: (s: SemanaDelHabitoApi) => void;
    mockSemana.mockImplementationOnce(() => new Promise(r => { responder = r; }));
    await irA(raiz, 'siguiente');
    expect(selector(raiz).props.ocupado).toBe(true);
    await irA(raiz, 'siguiente');
    expect(selector(raiz).props.rotulo).toBe('Semana del 9 al 15 nov');
    await act(async () => { responder(semanaDe('2026-11-09')); });
    expect(selector(raiz).props.ocupado).toBe(false);
    expect(mockSemana).toHaveBeenCalledTimes(2);
  });
});

describe('guardar vale SOLO para la semana que se ve', () => {
  it('en una semana que viene: sus fechas, solo lo tocado, y el botón dice cuál es', async () => {
    raiz = await montar();
    await abrir(raiz);
    await alcance(raiz, 'semana');
    await irA(raiz, 'siguiente');
    await act(async () => { mockRueda.mock.lastCall![0].onCambiar(21, 30); });
    expect(botonGuardar(raiz).props.label).toBe('Guardar 21:30 · semana 9–15 nov');
    await guardar(raiz);

    expect(mockGuardarSemana).toHaveBeenCalledTimes(1);
    expect(mockGuardarSemana.mock.calls[0][1]).toBe('2026-11-09');
    expect(mockGuardarSemana.mock.calls[0][2].map(d => d.date)).toEqual([
      '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15',
    ]);
    for (const d of mockGuardarSemana.mock.calls[0][2]) expect(d).toEqual({ date: d.date, triggerTime: '21:30:00', limitTime: null });
    // Lo de siempre y las demás semanas NO se tocan.
    expect(mockFijarHorarioDelDia).not.toHaveBeenCalled();
    expect(textos(raiz)).toContain('Queda a las 21:30 todos los días de la semana 9–15 nov.');
  });

  it('con dos días marcados, solo esos', async () => {
    raiz = await montar();
    await abrir(raiz);
    await alcance(raiz, 'semana');
    await irA(raiz, 'siguiente');
    await act(async () => { for (const d of ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE']) filaDeDias().onAlternarDia(d); });
    expect(filaDeDias().enEdicion).toEqual(['SÁB', 'DOM']);
    await act(async () => { mockRueda.mock.lastCall![0].onCambiar(8, 0); });
    expect(botonGuardar(raiz).props.label).toBe('Guardar 08:00 · sáb, dom · semana 9–15 nov');
    await guardar(raiz);
    expect(mockGuardarSemana.mock.calls[0][2].map(d => d.date)).toEqual(['2026-11-14', '2026-11-15']);
  });

  it('tras guardar se vuelve a leer ESA semana (y las demás siguen guardadas), y el botón vuelve a apagarse', async () => {
    raiz = await montar();
    await abrir(raiz);
    await alcance(raiz, 'semana');
    await irA(raiz, 'siguiente');
    mockSemana.mockClear();
    mockSemana.mockImplementation(async (_h, lunes) => semanaDe(lunes, { SATURDAY: { customDate: true, customTime: true, triggerTime: '21:30:00' } }));
    await act(async () => { mockRueda.mock.lastCall![0].onCambiar(21, 30); });
    await guardar(raiz);

    expect(mockSemana.mock.calls.map(c => c[1])).toEqual(['2026-11-09']);
    expect(mockAjustarAlarmas).toHaveBeenCalledTimes(1);
    // El día guardado sale marcado con el punto.
    expect(filaDeDias().marcaDelDia!('SÁB')).toEqual({ largo: 'Cambiado solo esta semana' });
    expect(filaDeDias().marcaDelDia!('VIE')).toBeNull();
    expect(botonGuardar(raiz).props.disabled).toBe(true);
    // Volver a la semana de antes y regresar no repite el pedido.
    mockSemana.mockClear();
    await irA(raiz, 'anterior');
    await irA(raiz, 'siguiente');
    expect(mockSemana.mock.calls.map(c => c[1])).toEqual([]);
  });

  it('lo tocado en una semana no se lleva a la otra: la rueda vuelve a donde estaba y no hay nada que guardar', async () => {
    raiz = await montar();
    await abrir(raiz);
    await alcance(raiz, 'semana');
    await act(async () => { mockRueda.mock.lastCall![0].onCambiar(21, 30); });
    expect(botonGuardar(raiz).props.disabled).toBe(false);
    await irA(raiz, 'siguiente');
    expect(mockRueda.mock.lastCall![0]).toEqual(expect.objectContaining({ horaInicial: 9, minutoInicial: 0 }));
    expect(botonGuardar(raiz).props.label).toBe('Guardar 09:00 · semana 9–15 nov');
    expect(botonGuardar(raiz).props.disabled).toBe(true);
  });

  it('cambiar el plan de siempre vacía lo leído por semana: al volver a «Por semana» se lee otra vez', async () => {
    raiz = await montar();
    await abrir(raiz);
    await alcance(raiz, 'semana');
    await irA(raiz, 'siguiente');
    await alcance(raiz, 'siempre');
    await act(async () => { filaDeDias().onAlternarDia('VIE'); });
    await act(async () => { mockRueda.mock.lastCall![0].onCambiar(10, 0); });
    await guardar(raiz);
    expect(mockFijarHorarioDelDia).toHaveBeenCalledTimes(1);
    mockSemana.mockClear();
    await alcance(raiz, 'semana');
    expect(mockSemana).toHaveBeenCalledWith('h-jugo', '2026-11-02');
  });
});

describe('lo guardado por semana sale marcado (issue #95)', () => {
  it('con un cambio propio en la semana en curso, el hábito abre en «Por semana», con sus días marcados y sus valores', async () => {
    mockPreferencias.mockResolvedValue([preferencia({ dateOverrides: [fechaPropia('2026-11-07')] })]);
    mockSemana.mockImplementation(async (_h, lunes) => semanaDe(lunes, { SATURDAY: { customDate: true, customTime: true, triggerTime: '10:00:00' } }));
    raiz = await montar();
    await abrir(raiz);

    expect(control(raiz)[0].props.valor).toBe('semana');
    expect(mockSemana).toHaveBeenCalledTimes(1);
    expect(mockSemana).toHaveBeenCalledWith('h-jugo', '2026-11-02');
    expect(selector(raiz).props.rotulo).toBe('Semana del 2 al 8 nov');
    expect(filaDeDias().marcaDelDia!('SÁB')).toEqual({ largo: 'Cambiado solo esta semana' });
    expect(filaDeDias().marcaDelDia!('DOM')).toBeNull();
    expect(filaDeDias().enEdicion).toEqual(['JUE', 'VIE', 'SÁB', 'DOM']);
  });

  it('con el cambio en una semana que viene, abre en ESA semana (no se pierde de vista)', async () => {
    mockPreferencias.mockResolvedValue([preferencia({ dateOverrides: [fechaPropia('2026-11-21')] })]);
    raiz = await montar();
    await abrir(raiz);
    expect(control(raiz)[0].props.valor).toBe('semana');
    expect(mockSemana).toHaveBeenCalledWith('h-jugo', '2026-11-16');
    expect(selector(raiz).props.rotulo).toBe('Semana del 16 al 22 nov');
    expect(selector(raiz).props.puedeAnterior).toBe(true);
  });

  it('sin cambios propios abre en «Siempre» y no pide la semana', async () => {
    raiz = await montar();
    await abrir(raiz);
    expect(control(raiz)[0].props.valor).toBe('siempre');
    expect(mockSemana).not.toHaveBeenCalled();
  });

  it('un cambio de hoy o de un día que ya pasó no cuenta: abre en «Siempre»', async () => {
    mockPreferencias.mockResolvedValue([preferencia({ dateOverrides: [fechaPropia('2026-11-04')] })]);
    raiz = await montar();
    await abrir(raiz);
    expect(control(raiz)[0].props.valor).toBe('siempre');
  });

  it('si no se puede leer la semana al abrir, queda en «Siempre» sin diálogo', async () => {
    mockPreferencias.mockResolvedValue([preferencia({ dateOverrides: [fechaPropia('2026-11-07')] })]);
    mockSemana.mockRejectedValue(new ApiError(500, 'se cayó'));
    raiz = await montar();
    await abrir(raiz);
    expect(control(raiz)[0].props.valor).toBe('siempre');
    expect(mockAlerta).not.toHaveBeenCalled();
    expect(raiz.root.findAll(n => n.type === SelectorDeSemana)).toHaveLength(0);
  });

  it('un servidor anterior (sin dateOverrides) no ofrece nada y abre como siempre', async () => {
    mockPreferencias.mockResolvedValue([{ ...preferencia(), dateOverrides: undefined }]);
    raiz = await montar();
    await abrir(raiz);
    expect(control(raiz)).toHaveLength(0);
    expect(mockSemana).not.toHaveBeenCalled();
  });

  it('al abrir otro hábito después, se parte limpio: lo leído del anterior no se mezcla', async () => {
    mockPreferencias.mockResolvedValue([preferencia({ dateOverrides: [fechaPropia('2026-11-07')] })]);
    raiz = await montar();
    await abrir(raiz);
    expect(control(raiz)[0].props.valor).toBe('semana');
    const hoja = raiz.root.findAll(n => n.type === HojaDesdeAbajo)[0];
    await act(async () => { hoja.props.alVolver(); });
    mockPreferencias.mockResolvedValue([preferencia()]);
    mockSemana.mockClear();
    await abrir(raiz);
    // El mismo hábito vuelve a abrir en «Por semana» y vuelve a leer la semana (la memoria es de cada apertura).
    expect(mockSemana).toHaveBeenCalledTimes(1);
  });
});

describe('menos texto: ya no hay párrafos de ayuda', () => {
  it('«Siempre» no lleva «Toca un día para darle su propia hora…» ni «Solo sáb, todas las semanas…»', async () => {
    raiz = await montar();
    await abrir(raiz);
    expect(textos(raiz)).not.toContain('Toca un día');
    expect(textos(raiz)).not.toContain('Hoy y lo pasado van con candado');
    await act(async () => { filaDeDias().onAlternarDia('VIE'); });
    expect(textos(raiz)).toContain('Solo vie');
    expect(textos(raiz)).not.toContain('todas las semanas');
    expect(textos(raiz)).not.toContain('Hoy no cambia');
  });

  it('«Por semana» no lleva «Solo esta semana: los días que faltan…» ni «Cambiado solo esta semana: sáb»', async () => {
    mockSemana.mockImplementation(async (_h, lunes) => semanaDe(lunes, { SATURDAY: { customDate: true, customTime: true, triggerTime: '10:00:00' } }));
    raiz = await montar();
    await abrir(raiz);
    await alcance(raiz, 'semana');
    const todo = textos(raiz);
    expect(todo).toContain('Semana del 2 al 8 nov');
    expect(todo).not.toContain('Tu plan de siempre no cambia');
    expect(todo).not.toContain('los días que faltan');
    expect(todo).not.toContain('Cambiado solo esta semana:');
    expect(todo).not.toContain('Toda esta semana');
    expect(todo).not.toContain('Cargando esta semana');
  });
});
