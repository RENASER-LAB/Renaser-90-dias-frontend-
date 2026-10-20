import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { DiaDeLaSemanaApi, PreferenciaHabitoApi } from '../../habits/types/habits.types';
import type { HabitItem } from '../../../screens/TrainingScreen';

/**
 * El recordatorio de cada día en la hoja «PLANIFICAR» de Training, montada de verdad (spec 008, D-282).
 *
 * Reglas del dueño (2026-10-20): con días marcados se elige el aviso; avisos distintos → ninguno elegido y
 * «Estos días tienen avisos distintos»; se guarda solo lo tocado («Guardar aviso · sáb, dom»); contra un backend
 * anterior, la pantalla es la de siempre. Contra el código anterior fallan: con días marcados no había
 * recordatorio, y guardar días nunca tocaba la alarma del teléfono.
 */

const mockAlerta = jest.fn<(titulo: string, mensaje?: string) => void>();
const mockRueda = jest.fn<(props: { horaInicial: number; minutoInicial: number; onCambiar: (h: number, m: number) => void }) => void>();
const mockPreferencias = jest.fn<() => Promise<PreferenciaHabitoApi[]>>();
const mockSemana = jest.fn<() => Promise<DiaDeLaSemanaApi[]>>();
const mockFijarHora = jest.fn<(...args: unknown[]) => Promise<void>>(async () => undefined);
const mockFijarAviso = jest.fn<(...args: unknown[]) => Promise<void>>(async () => undefined);
const mockQuitarDia = jest.fn<(...args: unknown[]) => Promise<void>>(async () => undefined);
const mockCambiarHorario = jest.fn<(...args: unknown[]) => Promise<{ deferred: boolean; deferredEffectiveDate?: string | null }>>();
const mockProgramar = jest.fn<(...args: unknown[]) => Promise<boolean>>(async () => true);
const mockProgramarDiferido = jest.fn<(...args: unknown[]) => Promise<boolean>>(async () => true);
const mockFilaDias = jest.fn<(props: FilaProps) => void>();

type FilaProps = {
  onAlternarDia: (dia: string) => void;
  enEdicion: string[];
  avisoDelDia?: (dia: string) => { largo: string; sinAviso: boolean } | null;
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
jest.mock('../../habits/components/RuedaHoraPicker', () => ({
  RuedaHoraPicker: (props: { horaInicial: number; minutoInicial: number; onCambiar: (h: number, m: number) => void }) => {
    mockRueda(props);
    return null;
  },
}));
jest.mock('../../habits/components/RuedaAntelacionPicker', () => ({ RuedaAntelacionPicker: () => null }));
jest.mock('../../habits/components/FilaDeDiasDelPlan', () => ({
  FilaDeDiasDelPlan: (props: FilaProps) => {
    mockFilaDias(props);
    return null;
  },
}));
jest.mock('../../habits/notificaciones/recordatoriosDeHabito', () => ({
  HAY_RECORDATORIOS: true,
  HAY_RECORDATORIOS_LOCALES: true,
  HAY_RECORDATORIOS_WEB: false,
  antelacionesDe: async () => [],
  programar: (...args: unknown[]) => mockProgramar(...args),
  programarConCambioDiferido: (...args: unknown[]) => mockProgramarDiferido(...args),
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
jest.mock('../../alarmas/guiaPreventiva', () => ({ ofrecerLaGuiaPreventiva: async () => false }));
jest.mock('../../habits/api/habitsApi', () => ({
  obtenerPreferencias: () => mockPreferencias(),
  obtenerPlanDesbloqueos: async () => ({ items: [] }),
  obtenerHorarioSemanal: () => mockSemana(),
  cambiarHorario: (...args: unknown[]) => mockCambiarHorario(...args),
  fijarHorarioDelDia: (...args: unknown[]) => mockFijarHora(...args),
  fijarAvisoDelDia: (...args: unknown[]) => mockFijarAviso(...args),
  quitarHorarioDelDia: (...args: unknown[]) => mockQuitarDia(...args),
  apagarDiaDeLaSemana: async () => undefined,
  agregarHabitoAlPlan: async () => undefined,
  cambiarEstadoHabito: async () => undefined,
}));

import { PlanificarDimensionModal } from '../components/PlanificarDimensionModal';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const JUGO: HabitItem = {
  id: 'track-h-jugo', dimension: 'CUERPO', title: 'JUGO VERDE', time: '07:00', tag: 'CUERPO', streak: 0, done: false,
  hasEvidence: false, tieneTrackHoy: true, habitoId: 'h-jugo', isDeactivatable: true, icon: 'salad',
};

const preferencia = (extra: Partial<PreferenciaHabitoApi> = {}): PreferenciaHabitoApi => ({
  habitId: 'h-jugo', title: 'h-jugo', triggerTime: '07:00:00', limitTime: null, customized: true,
  reminderEnabled: true, reminderMinutesBefore: 10, reminderMinutesList: [10], pendingChange: null, ...extra,
});

const NOMBRES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
/** Los siete días como los manda un backend CON la spec 008. */
function semana(cambios: Record<string, Partial<DiaDeLaSemanaApi>> = {}): DiaDeLaSemanaApi[] {
  return NOMBRES.map(weekday => ({
    weekday, triggerTime: '07:00:00', limitTime: null, custom: false, active: true,
    reminderEnabled: true, reminderMinutesList: [10], customReminder: false,
    ...cambios[weekday],
  }));
}
const conAviso = (aviso: number[]): Partial<DiaDeLaSemanaApi> =>
  ({ customReminder: true, reminderEnabled: aviso.length > 0, reminderMinutesList: aviso });

async function esperar() {
  await act(async () => {
    await new Promise(r => setTimeout(r, 0));
  });
}

let raiz: ReactTestRenderer | null = null;

async function montar(): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(
      React.createElement(PlanificarDimensionModal, {
        visible: true, dimension: 'CUERPO', habits: [JUGO], onCerrar: () => undefined, onGuardado: () => undefined,
      }),
    );
  });
  await esperar();
  raiz = r;
  return r;
}

function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
}

async function abrirElHabito(r: ReactTestRenderer) {
  const filas = r.root.findAll(n => typeof n.props.onPress === 'function'
    && n.findAll(x => (x.type as unknown) === 'Text' && x.props.children === 'JUGO VERDE').length > 0);
  await act(async () => {
    filas[filas.length - 1].props.onPress();
  });
  await esperar();
}

async function marcar(...dias: string[]) {
  for (const dia of dias) {
    await act(async () => {
      mockFilaDias.mock.lastCall![0].onAlternarDia(dia);
    });
  }
}

const boton = (r: ReactTestRenderer, etiqueta: string): ReactTestInstance[] =>
  r.root.findAll(n => typeof n.props.onPress === 'function' && typeof n.props.accessibilityLabel === 'string'
    && n.props.accessibilityLabel.startsWith(etiqueta));

async function tocar(r: ReactTestRenderer, etiqueta: string) {
  const [b] = boton(r, etiqueta);
  expect(b).toBeDefined();
  await act(async () => {
    b.props.onPress();
  });
}

/** El botón de guardar del pie. */
const guardar = (r: ReactTestRenderer): ReactTestInstance =>
  r.root.findAll(n => typeof n.props.label === 'string' && n.props.label.startsWith('Guardar'))[0]
    ?? r.root.findAll(n => typeof n.props.label === 'string' && n.props.label.startsWith('Guardando'))[0];

async function pulsarGuardar(r: ReactTestRenderer) {
  await act(async () => {
    guardar(r).props.onPress();
  });
  await esperar();
}

/** Las pastillas del recordatorio que están elegidas, por su nombre y sin repetir (cada una es un `Presionable` con su `Pressable`). */
function elegidas(r: ReactTestRenderer): string[] {
  const nombres = new Set<string>();
  for (const n of r.root.findAll(x => typeof x.props.onPress === 'function' && x.props.accessibilityState?.selected === true)) {
    const etiqueta = String(n.props.accessibilityLabel ?? '');
    if (/^(\d+ min antes|A la hora exacta)/.test(etiqueta)) nombres.add(etiqueta.replace(', activado', ''));
    else if (n.findAll(x => (x.type as unknown) === 'Text' && x.props.children === 'Sin aviso').length > 0) nombres.add('Sin aviso');
  }
  return [...nombres];
}

beforeEach(() => {
  for (const m of [mockAlerta, mockRueda, mockPreferencias, mockSemana, mockFijarHora, mockFijarAviso, mockQuitarDia, mockCambiarHorario, mockProgramar, mockProgramarDiferido, mockFilaDias]) {
    m.mockClear();
  }
  mockPreferencias.mockResolvedValue([preferencia()]);
  mockSemana.mockReset();
  mockSemana.mockResolvedValue(semana());
  mockProgramar.mockResolvedValue(true);
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('FR-002: con días marcados se elige el aviso', () => {
  it('aparece el recordatorio de esos días y ya no la línea «se elige sin días marcados»', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await marcar('SÁB', 'DOM');
    const todo = textos(r);
    expect(todo).not.toContain('El recordatorio se elige sin días marcados');
    expect(todo).toContain('Recordatorio de sáb, dom');
    expect(boton(r, 'A la hora exacta').length).toBeGreaterThan(0);
    // Los tres bloques, cada uno con su rótulo, en este orden: hora, días y recordatorio.
    expect(todo.indexOf('Hora')).toBeLessThan(todo.indexOf('Solo sáb, dom'));
    expect(todo.indexOf('Solo sáb, dom')).toBeLessThan(todo.indexOf('Recordatorio de'));
    // Y el espacio para los futuros tipos de alarma, vacío, debajo del recordatorio.
    const [espacio] = r.root.findAll(n => n.props.testID === 'espacio-para-tipos-de-alarma');
    expect(espacio).toBeDefined();
    expect(React.Children.count(espacio.props.children)).toBe(0);
  });

  it('muestra el aviso que los días marcados tienen en común', async () => {
    mockSemana.mockResolvedValue(semana({ SATURDAY: conAviso([30]), SUNDAY: conAviso([30]) }));
    const r = await montar();
    await abrirElHabito(r);
    await marcar('SÁB');
    expect(elegidas(r)).toEqual(['30 min antes']);
    await marcar('DOM');
    expect(elegidas(r)).toEqual(['30 min antes']);
    expect(textos(r)).not.toContain('Estos días tienen avisos distintos');
  });

  it('avisos distintos: ninguno elegido (tampoco «Sin aviso») y lo dice; al elegir uno, la línea se va', async () => {
    mockSemana.mockResolvedValue(semana({ FRIDAY: conAviso([30]), SATURDAY: conAviso([]) }));
    const r = await montar();
    await abrirElHabito(r);
    await marcar('VIE', 'SÁB');
    expect(textos(r)).toContain('Estos días tienen avisos distintos');
    expect(elegidas(r)).toEqual([]);
    await tocar(r, 'A la hora exacta');
    expect(textos(r)).not.toContain('Estos días tienen avisos distintos');
    expect(elegidas(r)).toEqual(['A la hora exacta']);
  });

  it('sin días marcados es el recordatorio general, como siempre', async () => {
    const r = await montar();
    await abrirElHabito(r);
    expect(textos(r)).toContain('Recordatorio');
    expect(textos(r)).not.toContain('Recordatorio de');
    expect(elegidas(r)).toEqual(['10 min antes']);
  });
});

describe('guardar solo lo que se tocó', () => {
  it('marcar sáb y dom y elegir 30 min sin mover la rueda: solo el aviso, a los dos días, sin tocar la hora', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await marcar('SÁB', 'DOM');
    await tocar(r, '30 min antes');
    await tocar(r, '10 min antes'); // lo desmarca: el aviso de los días queda en 30
    expect(guardar(r).props.label).toBe('Guardar aviso · sáb, dom');
    await pulsarGuardar(r);

    expect(mockFijarAviso).toHaveBeenCalledTimes(2);
    expect(mockFijarAviso).toHaveBeenCalledWith('h-jugo', 'SATURDAY', true, [30]);
    expect(mockFijarAviso).toHaveBeenCalledWith('h-jugo', 'SUNDAY', true, [30]);
    expect(mockFijarHora).not.toHaveBeenCalled();
    expect(mockCambiarHorario).not.toHaveBeenCalled();
    expect(textos(r)).toContain('Queda con aviso 30 min antes los sáb, dom.');
  });

  it('«Sin aviso» para un día: se guarda apagado (lista vacía)', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await marcar('DOM');
    const [sinAviso] = r.root.findAll(n => typeof n.props.onPress === 'function'
      && n.findAll(x => (x.type as unknown) === 'Text' && x.props.children === 'Sin aviso').length > 0);
    await act(async () => { sinAviso.props.onPress(); });
    await pulsarGuardar(r);
    expect(mockFijarAviso).toHaveBeenCalledWith('h-jugo', 'SUNDAY', false, []);
    expect(mockFijarHora).not.toHaveBeenCalled();
    expect(textos(r)).toContain('Queda sin aviso los dom.');
  });

  it('moviendo la rueda y cambiando el aviso: guarda la hora y el aviso', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await marcar('MAR', 'MIÉ');
    await act(async () => { mockRueda.mock.lastCall![0].onCambiar(8, 15); });
    await tocar(r, 'A la hora exacta');
    expect(guardar(r).props.label).toBe('Guardar hora y aviso · mar, mié');
    await pulsarGuardar(r);
    expect(mockFijarHora).toHaveBeenCalledTimes(2);
    expect(mockFijarHora).toHaveBeenCalledWith('h-jugo', 'TUESDAY', '08:15:00', null);
    expect(mockFijarAviso).toHaveBeenCalledWith('h-jugo', 'TUESDAY', true, [10, 0]);
    expect(mockFijarAviso).toHaveBeenCalledTimes(2);
  });

  it('moviendo solo la rueda: la hora y nada más (lo de siempre)', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await marcar('VIE');
    await act(async () => { mockRueda.mock.lastCall![0].onCambiar(9, 0); });
    expect(guardar(r).props.label).toBe('Guardar 09:00 · vie');
    await pulsarGuardar(r);
    expect(mockFijarHora).toHaveBeenCalledWith('h-jugo', 'FRIDAY', '09:00:00', null);
    expect(mockFijarAviso).not.toHaveBeenCalled();
  });

  it('sin tocar nada, el botón sigue siendo el de la hora de siempre', async () => {
    const r = await montar();
    await abrirElHabito(r);
    expect(guardar(r).props.label).toBe('Guardar 07:00 · todos los días');
    await marcar('VIE');
    expect(guardar(r).props.label).toBe('Guardar 07:00 · vie');
  });
});

describe('el chip de cada día', () => {
  it('muestra el aviso solo de los días cuyo aviso difiere del general', async () => {
    mockSemana.mockResolvedValue(semana({
      SATURDAY: conAviso([30]),
      SUNDAY: conAviso([]),
      FRIDAY: conAviso([10]), // el mismo que el general: no se ve como propio
    }));
    const r = await montar();
    await abrirElHabito(r);
    const { avisoDelDia } = mockFilaDias.mock.lastCall![0];
    expect(avisoDelDia).toBeDefined();
    expect(avisoDelDia!('SÁB')).toEqual({ largo: 'Aviso 30 minutos antes', sinAviso: false });
    expect(avisoDelDia!('DOM')).toEqual({ largo: 'Sin aviso', sinAviso: true });
    expect(avisoDelDia!('VIE')).toBeNull();
    expect(avisoDelDia!('LUN')).toBeNull();
  });
});

describe('FR-009 / E-640: tras guardar, las alarmas del teléfono se rehacen con lo propio de cada día', () => {
  it('lee los días otra vez y reprograma con el aviso de sáb y dom', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await marcar('SÁB', 'DOM');
    await tocar(r, '30 min antes');
    await tocar(r, '10 min antes');
    // El servidor, ya con el aviso nuevo.
    mockSemana.mockResolvedValue(semana({ SATURDAY: conAviso([30]), SUNDAY: conAviso([30]) }));
    await pulsarGuardar(r);

    expect(mockProgramar).toHaveBeenCalledTimes(1);
    const [usuario, habito, titulo, hora, generales, opciones] = mockProgramar.mock.calls[0] as [string, string, string, string, number[], { dias: Array<{ iso: number; avisos: number[] | null; hora: string | null; activo: boolean }> }];
    expect([usuario, habito, titulo, hora, generales]).toEqual(['u-1', 'h-jugo', 'JUGO VERDE', '07:00', [10]]);
    expect(opciones.dias.find(d => d.iso === 6)).toEqual({ iso: 6, activo: true, hora: null, horaResuelta: '07:00', avisos: [30] });
    expect(opciones.dias.find(d => d.iso === 7)).toEqual({ iso: 7, activo: true, hora: null, horaResuelta: '07:00', avisos: [30] });
    expect(opciones.dias.find(d => d.iso === 1)).toEqual({ iso: 1, activo: true, hora: null, horaResuelta: '07:00', avisos: null });
  });

  it('guardar la hora general sin días marcados conserva lo propio de cada día (E8)', async () => {
    mockSemana.mockResolvedValue(semana({ SATURDAY: conAviso([30]), THURSDAY: { custom: true, triggerTime: '09:00:00' } }));
    mockCambiarHorario.mockResolvedValue({ deferred: true, deferredEffectiveDate: '2026-10-21' });
    const r = await montar();
    await abrirElHabito(r);
    await tocar(r, 'A la hora exacta');
    await pulsarGuardar(r);
    // El cambio general rige desde mañana (D-91): la alarma lo respeta, y no se pierden los días.
    expect(mockCambiarHorario).toHaveBeenCalledWith('h-jugo', '07:00:00', null, expect.objectContaining({ activo: true, lista: [10, 0] }));
    expect(mockProgramarDiferido).toHaveBeenCalledTimes(1);
    const [, , , cambio, avisos, opciones] = mockProgramarDiferido.mock.calls[0] as [string, string, string, { horaNueva: string; desde: string }, number[], { dias: Array<{ iso: number; avisos: number[] | null; hora: string | null }> }];
    expect(cambio).toMatchObject({ horaNueva: '07:00', desde: '2026-10-21' });
    expect(avisos).toEqual([10, 0]);
    expect(opciones.dias.find(d => d.iso === 6)).toMatchObject({ avisos: [30] });
    expect(opciones.dias.find(d => d.iso === 4)).toMatchObject({ hora: '09:00' });
  });
});

describe('E-642: las alarmas por día usan la hora de cada día', () => {
  it('guardar la hora general (sin diferir) pasa a la hora nueva los días sin hora propia; el que tiene la suya no se mueve', async () => {
    mockSemana.mockResolvedValue(semana({ THURSDAY: { custom: true, triggerTime: '09:00:00' } }));
    mockCambiarHorario.mockResolvedValue({ deferred: false });
    const r = await montar();
    await abrirElHabito(r);
    await act(async () => { mockRueda.mock.lastCall![0].onCambiar(8, 15); });
    await pulsarGuardar(r);
    expect(mockProgramar).toHaveBeenCalledTimes(1);
    const [, , , hora, , opciones] = mockProgramar.mock.calls[0] as [string, string, string, string, number[], { dias: Array<{ iso: number; hora: string | null; horaResuelta?: string }> }];
    expect(hora).toBe('08:15');
    // Los que la siguen, a la nueva (no a la que traían resuelta de antes del cambio); el jueves, a la suya.
    expect(opciones.dias.filter(d => d.iso !== 4).every(d => d.hora === null && d.horaResuelta === '08:15')).toBe(true);
    expect(opciones.dias.find(d => d.iso === 4)).toMatchObject({ hora: '09:00', horaResuelta: '09:00' });
  });
});

describe('FR-014: un backend anterior (sin avisos por día)', () => {
  const sinAvisos = (): DiaDeLaSemanaApi[] => NOMBRES.map(weekday => ({
    weekday, triggerTime: '07:00:00', limitTime: null, custom: false, active: true,
  }));

  it('con días marcados no se ofrece el recordatorio y queda la línea de siempre', async () => {
    mockSemana.mockResolvedValue(sinAvisos());
    const r = await montar();
    await abrirElHabito(r);
    await marcar('VIE');
    expect(textos(r)).toContain('El recordatorio se elige sin días marcados.');
    expect(boton(r, 'A la hora exacta')).toHaveLength(0);
    expect(mockFilaDias.mock.lastCall![0].avisoDelDia).toBeUndefined();
  });

  it('guardar días es lo de siempre: la hora, y ningún pedido del aviso', async () => {
    mockSemana.mockResolvedValue(sinAvisos());
    const r = await montar();
    await abrirElHabito(r);
    await marcar('VIE');
    await pulsarGuardar(r);
    expect(mockFijarHora).toHaveBeenCalledWith('h-jugo', 'FRIDAY', '07:00:00', null);
    expect(mockFijarAviso).not.toHaveBeenCalled();
    // Las alarmas del teléfono siguen siendo diarias: no se reprograma con días.
    expect(mockProgramar).not.toHaveBeenCalled();
  });
});

describe('FR-006: devolver un día a «como los demás»', () => {
  it('quita la hora y el aviso propios y rehace las alarmas', async () => {
    mockSemana.mockResolvedValue(semana({ SATURDAY: { ...conAviso([30]), custom: true, triggerTime: '09:00:00' } }));
    const r = await montar();
    await abrirElHabito(r);
    await marcar('SÁB');
    mockSemana.mockResolvedValue(semana());
    const [quitar] = r.root.findAll(n => typeof n.props.onPress === 'function'
      && n.findAll(x => (x.type as unknown) === 'Text' && String(x.props.children).startsWith('Dejar sáb como los demás días')).length > 0);
    expect(quitar).toBeDefined();
    await act(async () => { quitar.props.onPress(); });
    await esperar();
    expect(mockQuitarDia).toHaveBeenCalledWith('h-jugo', 'SATURDAY');
    expect(mockProgramar).toHaveBeenCalled();
    const opciones = mockProgramar.mock.calls.at(-1)![5] as { dias: Array<{ iso: number; avisos: number[] | null; hora: string | null }> };
    expect(opciones.dias.every(d => d.hora === null && d.avisos === null)).toBe(true);
  });
});
