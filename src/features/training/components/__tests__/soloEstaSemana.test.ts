import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { CambioDeFechaApi, PreferenciaHabitoApi, SemanaDelHabitoApi } from '../../../habits/types/habits.types';
import type { HabitItem } from '../../../../screens/TrainingScreen';
import { ApiError } from '../../../../services/http/apiClient';

/**
 * Spec 028 (decisión del dueño 028-1 A): el alcance «Solo esta semana» del editor de Planificar, montado de verdad. Hoy es un miércoles
 * (2 de noviembre de 2026 es lunes): se pueden cambiar jueves a domingo. El resto del editor es el de siempre (specs 008 a 011) y no
 * se prueba acá: lo que importa es que «Todas las semanas» sea IDÉNTICO a hoy y que «Solo esta semana» mande SOLO lo tocado, por fecha.
 */

const FECHAS = {
  LUN: '2026-11-02', MAR: '2026-11-03', 'MIÉ': '2026-11-04', JUE: '2026-11-05', VIE: '2026-11-06', 'SÁB': '2026-11-07', DOM: '2026-11-08',
};
const mockAlerta = jest.fn<(titulo: string, mensaje?: string) => void>();
const mockRueda = jest.fn<(props: { horaInicial: number; minutoInicial: number; onCambiar: (h: number, m: number) => void }) => void>();
const mockPreferencias = jest.fn<() => Promise<PreferenciaHabitoApi[]>>();
const mockSemana = jest.fn<(habitId: string, lunes: string) => Promise<SemanaDelHabitoApi>>();
const mockGuardarSemana = jest.fn<(habitId: string, lunes: string, dias: CambioDeFechaApi[]) => Promise<void>>();
const mockVolver = jest.fn<(habitId: string, lunes: string) => Promise<void>>();
const mockCambiarHorario = jest.fn<(...args: unknown[]) => Promise<{ deferred: boolean; deferredEffectiveDate?: string | null }>>();
const mockFijarHorarioDelDia = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockAjustarAlarmas = jest.fn<(userId: string, prefs: PreferenciaHabitoApi[], opciones: unknown) => Promise<number>>();

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u-1' } }) }));
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: (titulo: string, mensaje?: string) => mockAlerta(titulo, mensaje) } }));
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
/** Hoy es miércoles 4 de noviembre de 2026: se pueden cambiar jueves a domingo. */
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
  volverAlPlanDeSiempreDelHabito: (habitId: string, lunes: string) => mockVolver(habitId, lunes),
  cambiarHorario: (...args: unknown[]) => mockCambiarHorario(...args),
  fijarHorarioDelDia: (...args: unknown[]) => mockFijarHorarioDelDia(...args),
  agregarHabitoAlPlan: async () => undefined,
  cambiarEstadoHabito: async () => undefined,
}));

import { ControlSegmentado } from '../../../../components/ControlSegmentado';
import { PlanificarDimensionModal } from '../PlanificarDimensionModal';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const JUGO: HabitItem = {
  id: 'track-h-jugo', dimension: 'CUERPO', title: 'JUGO VERDE', time: '09:00', tag: 'CUERPO', streak: 0, done: false,
  hasEvidence: false, tieneTrackHoy: true, habitoId: 'h-jugo', isDeactivatable: true, icon: 'salad',
};
const OBLIGATORIO: HabitItem = { ...JUGO, id: 'track-h-clase', title: 'Clase diaria', habitoId: 'h-clase', isDeactivatable: false };

const preferencia = (habitId: string, extra: Partial<PreferenciaHabitoApi> = {}): PreferenciaHabitoApi => ({
  habitId, title: habitId, triggerTime: '09:00:00', limitTime: null, customized: true,
  reminderEnabled: false, reminderMinutesBefore: null, pendingChange: null, dateOverrides: [], ...extra,
});

const NOMBRES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const semana = (cambios: Record<string, Partial<SemanaDelHabitoApi['days'][number]>> = {}): SemanaDelHabitoApi => ({
  weekStart: '2026-11-02',
  weekEnd: '2026-11-08',
  days: NOMBRES.map((weekday, i) => ({
    weekday, date: `2026-11-0${2 + i}`, triggerTime: '09:00:00', limitTime: null, active: true,
    reminderEnabled: false, reminderMinutesList: [], customTime: false, customReminder: false,
    customAlarm: false, alarm: { sound: true, vibration: true, voice: false, repeat: false },
    customDate: false, editable: i > 2, ...(cambios[weekday] ?? {}),
  })),
});

async function esperar() {
  await act(async () => { await new Promise(r => setTimeout(r, 0)); });
}
async function montar(habits: HabitItem[] = [JUGO]): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(PlanificarDimensionModal, {
      visible: true, dimension: 'CUERPO', habits, onCerrar: () => undefined, onGuardado: () => undefined,
    }));
  });
  await esperar();
  return r;
}
const textoDe = (n: ReactTestInstance) => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join('');
const textos = (r: ReactTestRenderer) => r.root.findAll(n => (n.type as unknown) === 'Text').map(textoDe).join(' | ');
async function abrir(r: ReactTestRenderer, titulo: string) {
  const filas = r.root.findAll(n => typeof n.props.onPress === 'function' && n.findAll(h => (h.type as unknown) === 'Text' && h.props.children === titulo).length > 0);
  await act(async () => { filas[filas.length - 1].props.onPress(); });
  await esperar();
}
const control = (r: ReactTestRenderer) => r.root.findAll(n => n.type === ControlSegmentado);
const cambiarAlcance = async (r: ReactTestRenderer, valor: 'siempre' | 'semana') => {
  await act(async () => { control(r)[0].props.onCambiar(valor); });
  await esperar();
};
const filaDeDias = () => mockFilaDias.mock.lastCall![0] as {
  enEdicion: string[]; corre: Record<string, boolean>; horarios: Record<string, unknown>;
  onAlternarDia: (d: string) => void; marcaDelDia?: (d: string) => { largo: string } | null;
};
const botonGuardar = (r: ReactTestRenderer) => r.root.findAll(n => typeof n.props.label === 'string' && n.props.label.startsWith('Guardar'))[0];
const guardar = async (r: ReactTestRenderer) => { await act(async () => { botonGuardar(r).props.onPress(); }); await esperar(); };
const botonPorTexto = (r: ReactTestRenderer, texto: string) => {
  const c = r.root.findAll(n => typeof n.props.onPress === 'function' && n.findAll(h => (h.type as unknown) === 'Text' && textoDe(h).startsWith(texto)).length > 0);
  expect(c.length).toBeGreaterThan(0);
  return c[c.length - 1];
};

let raiz: ReactTestRenderer | null = null;
beforeEach(() => {
  [mockAlerta, mockRueda, mockPreferencias, mockSemana, mockGuardarSemana, mockVolver, mockCambiarHorario, mockFijarHorarioDelDia, mockFilaDias, mockAjustarAlarmas]
    .forEach(m => m.mockReset());
  mockPreferencias.mockResolvedValue([preferencia('h-jugo'), preferencia('h-clase')]);
  mockSemana.mockResolvedValue(semana());
  mockGuardarSemana.mockResolvedValue(undefined);
  mockVolver.mockResolvedValue(undefined);
  mockCambiarHorario.mockResolvedValue({ deferred: true, deferredEffectiveDate: '2026-11-05' });
  mockAjustarAlarmas.mockResolvedValue(1);
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('FR-021: contra un servidor anterior la hoja es la de siempre', () => {
  it('sin dateOverrides no se ofrece el alcance y no se pide nada de la semana', async () => {
    mockPreferencias.mockResolvedValue([{ ...preferencia('h-jugo'), dateOverrides: undefined }]);
    raiz = await montar();
    await abrir(raiz, 'Jugo verde');
    expect(control(raiz)).toHaveLength(0);
    expect(mockSemana).not.toHaveBeenCalled();
  });
});

describe('«Todas las semanas» es IDÉNTICO a hoy (SC-007)', () => {
  it('arranca en «Todas las semanas», sin pedir la semana, con los textos de siempre', async () => {
    raiz = await montar();
    await abrir(raiz, 'Jugo verde');
    expect(control(raiz)).toHaveLength(1);
    expect(control(raiz)[0].props.valor).toBe('siempre');
    expect(control(raiz)[0].props.opciones.map((o: { etiqueta: string }) => o.etiqueta)).toEqual(['Todas las semanas', 'Solo esta semana']);
    expect(mockSemana).not.toHaveBeenCalled();
    expect(textos(raiz)).toContain('Todos los días');
    expect(filaDeDias().enEdicion).toEqual([]);
    expect(filaDeDias().marcaDelDia).toBeUndefined();
  });

  it('guardar la hora hace exactamente lo de siempre: cambiarHorario, y nada de la semana', async () => {
    raiz = await montar();
    await abrir(raiz, 'Jugo verde');
    await act(async () => { mockRueda.mock.lastCall![0].onCambiar(9, 30); });
    await guardar(raiz);
    expect(mockCambiarHorario).toHaveBeenCalledTimes(1);
    expect(mockCambiarHorario.mock.calls[0].slice(0, 3)).toEqual(['h-jugo', '09:30:00', null]);
    expect(mockGuardarSemana).not.toHaveBeenCalled();
    expect(mockVolver).not.toHaveBeenCalled();
  });

  it('con días marcados sigue guardando por día de la semana (todas las semanas)', async () => {
    raiz = await montar();
    await abrir(raiz, 'Jugo verde');
    await act(async () => { filaDeDias().onAlternarDia('VIE'); });
    await act(async () => { mockRueda.mock.lastCall![0].onCambiar(9, 30); });
    await guardar(raiz);
    expect(mockFijarHorarioDelDia).toHaveBeenCalledWith('h-jugo', 'FRIDAY', '09:30:00', null);
    expect(mockGuardarSemana).not.toHaveBeenCalled();
  });
});

describe('«Solo esta semana»: los días', () => {
  it('lee la semana del editor, marca los días que faltan y no deja marcar hoy ni lo pasado', async () => {
    raiz = await montar();
    await abrir(raiz, 'Jugo verde');
    await cambiarAlcance(raiz, 'semana');

    expect(mockSemana).toHaveBeenCalledWith('h-jugo', '2026-11-02');
    expect(filaDeDias().enEdicion).toEqual(['JUE', 'VIE', 'SÁB', 'DOM']);
    const todo = textos(raiz);
    expect(todo).toContain('Toda esta semana');
    expect(todo).toContain('Solo esta semana: los días que faltan. Tu plan de siempre no cambia.');
    // Hoy y lo pasado no se marcan.
    await act(async () => { filaDeDias().onAlternarDia('LUN'); });
    expect(filaDeDias().enEdicion).toEqual(['JUE', 'VIE', 'SÁB', 'DOM']);
  });

  it('tocar una pastilla la quita y la pone; el último marcado no se puede quitar (nunca queda en «general»)', async () => {
    raiz = await montar();
    await abrir(raiz, 'Jugo verde');
    await cambiarAlcance(raiz, 'semana');
    await act(async () => { filaDeDias().onAlternarDia('JUE'); });
    expect(filaDeDias().enEdicion).toEqual(['VIE', 'SÁB', 'DOM']);
    expect(textos(raiz)).toContain('Solo vie, sáb, dom');
    await act(async () => { filaDeDias().onAlternarDia('VIE'); filaDeDias().onAlternarDia('SÁB'); });
    await act(async () => { filaDeDias().onAlternarDia('DOM'); });
    expect(filaDeDias().enEdicion).toEqual(['DOM']);
  });

  it('el día que ya tiene cambio solo esta semana se distingue, y se dice en una línea', async () => {
    mockSemana.mockResolvedValue(semana({ SATURDAY: { customDate: true, customTime: true, triggerTime: '10:00:00' } }));
    raiz = await montar();
    await abrir(raiz, 'Jugo verde');
    await cambiarAlcance(raiz, 'semana');
    const { marcaDelDia } = filaDeDias();
    expect(marcaDelDia!('SÁB')).toEqual({ largo: 'Cambiado solo esta semana' });
    expect(marcaDelDia!('VIE')).toBeNull();
    expect(textos(raiz)).toContain('Cambiado solo esta semana: sáb');
  });

  it('un día que el plan de siempre apaga no corre ni se puede marcar', async () => {
    mockSemana.mockResolvedValue(semana({ SUNDAY: { active: false } }));
    raiz = await montar();
    await abrir(raiz, 'Jugo verde');
    await cambiarAlcance(raiz, 'semana');
    expect(filaDeDias().enEdicion).toEqual(['JUE', 'VIE', 'SÁB']);
    expect(filaDeDias().corre.DOM).toBe(false);
  });

  it('si no se puede leer la semana se vuelve a «Todas las semanas» y se dice', async () => {
    mockSemana.mockRejectedValue(new ApiError(500, 'se cayó'));
    raiz = await montar();
    await abrir(raiz, 'Jugo verde');
    await cambiarAlcance(raiz, 'semana');
    expect(mockAlerta).toHaveBeenCalledWith('No pudimos cargar esta semana', expect.any(String));
    expect(control(raiz)[0].props.valor).toBe('siempre');
    expect(textos(raiz)).toContain('Todos los días');
  });

  it('volver a «Todas las semanas» deja el editor como estaba', async () => {
    raiz = await montar();
    await abrir(raiz, 'Jugo verde');
    await cambiarAlcance(raiz, 'semana');
    await cambiarAlcance(raiz, 'siempre');
    expect(filaDeDias().enEdicion).toEqual([]);
    expect(textos(raiz)).toContain('Todos los días');
    expect(filaDeDias().marcaDelDia).toBeUndefined();
  });
});

describe('«Solo esta semana»: guardar SOLO lo tocado, por fecha', () => {
  it('sin tocar nada no hay nada que guardar: el botón está apagado y dice el alcance', async () => {
    raiz = await montar();
    await abrir(raiz, 'Jugo verde');
    await cambiarAlcance(raiz, 'semana');
    const boton = botonGuardar(raiz);
    expect(boton.props.label).toBe('Guardar 09:00 · solo esta semana');
    expect(boton.props.disabled).toBe(true);
    await guardar(raiz);
    expect(mockGuardarSemana).not.toHaveBeenCalled();
  });

  it('moviendo la rueda: la hora de los días que faltan, y nada de aviso ni alarma', async () => {
    raiz = await montar();
    await abrir(raiz, 'Jugo verde');
    await cambiarAlcance(raiz, 'semana');
    await act(async () => { mockRueda.mock.lastCall![0].onCambiar(9, 30); });
    expect(botonGuardar(raiz).props.label).toBe('Guardar 09:30 · solo esta semana');
    await guardar(raiz);

    expect(mockGuardarSemana).toHaveBeenCalledTimes(1);
    expect(mockGuardarSemana).toHaveBeenCalledWith('h-jugo', '2026-11-02', [
      { date: '2026-11-05', triggerTime: '09:30:00', limitTime: null },
      { date: '2026-11-06', triggerTime: '09:30:00', limitTime: null },
      { date: '2026-11-07', triggerTime: '09:30:00', limitTime: null },
      { date: '2026-11-08', triggerTime: '09:30:00', limitTime: null },
    ]);
    // Lo de siempre NO se toca.
    expect(mockCambiarHorario).not.toHaveBeenCalled();
    expect(mockFijarHorarioDelDia).not.toHaveBeenCalled();
    expect(textos(raiz)).toContain('Queda a las 09:30 los jue, vie, sáb, dom, solo esta semana. Tu plan de siempre no cambia.');
  });

  it('con dos días marcados solo van esos dos', async () => {
    raiz = await montar();
    await abrir(raiz, 'Jugo verde');
    await cambiarAlcance(raiz, 'semana');
    await act(async () => { filaDeDias().onAlternarDia('JUE'); filaDeDias().onAlternarDia('VIE'); });
    await act(async () => { mockRueda.mock.lastCall![0].onCambiar(8, 0); });
    await guardar(raiz);
    expect(mockGuardarSemana.mock.calls[0][2].map(d => d.date)).toEqual(['2026-11-07', '2026-11-08']);
  });

  it('tocando solo el aviso: el aviso y nada de hora', async () => {
    raiz = await montar();
    await abrir(raiz, 'Jugo verde');
    await cambiarAlcance(raiz, 'semana');
    const [aLaHora] = raiz.root.findAll(n => typeof n.props.onPress === 'function'
      && typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('A la hora exacta'));
    await act(async () => { aLaHora.props.onPress(); });
    expect(botonGuardar(raiz).props.label).toBe('Guardar aviso · solo esta semana');
    await guardar(raiz);
    const dias = mockGuardarSemana.mock.calls[0][2];
    expect(dias).toHaveLength(4);
    for (const d of dias) {
      expect(d).toEqual({ date: expect.any(String), reminderEnabled: true, reminderMinutesList: [0] });
    }
  });

  it('tras guardar relee la semana y las preferencias, y pone al día las alarmas de ese hábito', async () => {
    raiz = await montar();
    await abrir(raiz, 'Jugo verde');
    await cambiarAlcance(raiz, 'semana');
    mockSemana.mockClear();
    mockPreferencias.mockClear();
    await act(async () => { mockRueda.mock.lastCall![0].onCambiar(9, 30); });
    await guardar(raiz);

    expect(mockSemana).toHaveBeenCalledTimes(1);
    expect(mockPreferencias).toHaveBeenCalled();
    expect(mockAjustarAlarmas).toHaveBeenCalledTimes(1);
    const [usuario, prefs] = mockAjustarAlarmas.mock.calls[0];
    expect(usuario).toBe('u-1');
    expect(prefs.map(p => p.habitId)).toEqual(['h-jugo']);
  });

  it('un rechazo del servidor se dice con su mensaje y no cambia nada de la pantalla', async () => {
    mockGuardarSemana.mockRejectedValue(new ApiError(400, 'La hora no cabe en el día'));
    raiz = await montar();
    await abrir(raiz, 'Jugo verde');
    await cambiarAlcance(raiz, 'semana');
    await act(async () => { mockRueda.mock.lastCall![0].onCambiar(9, 30); });
    await guardar(raiz);
    expect(mockAlerta).toHaveBeenCalledWith('No pudimos guardar esta semana', expect.any(String));
    expect(mockAjustarAlarmas).not.toHaveBeenCalled();
    expect(botonGuardar(raiz).props.label).toBe('Guardar 09:30 · solo esta semana');
  });
});

describe('«Solo esta semana»: apagar y volver al plan de siempre', () => {
  it('«No hacerlo» apaga esas fechas; en un obligatorio del programa no se ofrece', async () => {
    raiz = await montar([JUGO, OBLIGATORIO]);
    await abrir(raiz, 'Jugo verde');
    await cambiarAlcance(raiz, 'semana');
    await act(async () => { filaDeDias().onAlternarDia('JUE'); filaDeDias().onAlternarDia('VIE'); filaDeDias().onAlternarDia('SÁB'); });
    await act(async () => { botonPorTexto(raiz!, 'No hacerlo los dom').props.onPress(); });
    await esperar();
    expect(mockGuardarSemana).toHaveBeenCalledWith('h-jugo', '2026-11-02', [{ date: '2026-11-08', active: false }]);
  });

  it('el 409 de un obligatorio se dice con el mensaje de la hoja', async () => {
    mockGuardarSemana.mockRejectedValue(new ApiError(409, 'Este habito es obligatorio y no se puede apagar'));
    raiz = await montar();
    await abrir(raiz, 'Jugo verde');
    await cambiarAlcance(raiz, 'semana');
    await act(async () => { botonPorTexto(raiz!, 'No hacerlo los jue').props.onPress(); });
    await esperar();
    expect(mockAlerta).toHaveBeenCalledWith('No pudimos guardar esta semana', expect.stringContaining('obligatorio'));
  });

  it('«Volver al plan de siempre» con todos los días con cambio usa el borrado de la semana del hábito', async () => {
    mockSemana.mockResolvedValue(semana({ SATURDAY: { customDate: true, customTime: true, triggerTime: '10:00:00' } }));
    raiz = await montar();
    await abrir(raiz, 'Jugo verde');
    await cambiarAlcance(raiz, 'semana');
    await act(async () => { botonPorTexto(raiz!, 'Volver al plan de siempre los sáb').props.onPress(); });
    await esperar();
    expect(mockVolver).toHaveBeenCalledWith('h-jugo', '2026-11-02');
    expect(mockGuardarSemana).not.toHaveBeenCalled();
    expect(mockAjustarAlarmas).toHaveBeenCalledTimes(1);
    expect(textos(raiz)).toContain('Vuelve al plan de siempre los sáb de esta semana.');
  });

  it('con otros días con cambio sin marcar, solo se devuelven los marcados (reset por fecha)', async () => {
    mockSemana.mockResolvedValue(semana({
      SATURDAY: { customDate: true, customTime: true, triggerTime: '10:00:00' },
      SUNDAY: { customDate: true, customTime: true, triggerTime: '11:00:00' },
    }));
    raiz = await montar();
    await abrir(raiz, 'Jugo verde');
    await cambiarAlcance(raiz, 'semana');
    await act(async () => { filaDeDias().onAlternarDia('JUE'); filaDeDias().onAlternarDia('VIE'); filaDeDias().onAlternarDia('DOM'); });
    await act(async () => { botonPorTexto(raiz!, 'Volver al plan de siempre los sáb').props.onPress(); });
    await esperar();
    expect(mockGuardarSemana).toHaveBeenCalledWith('h-jugo', '2026-11-02', [{ date: '2026-11-07', reset: true }]);
    expect(mockVolver).not.toHaveBeenCalled();
  });
});
