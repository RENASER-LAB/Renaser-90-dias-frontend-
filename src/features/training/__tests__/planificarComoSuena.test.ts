import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { DiaDeLaSemanaApi, PreferenciaHabitoApi } from '../../habits/types/habits.types';
import type { HabitItem } from '../../../screens/TrainingScreen';

/**
 * «Cómo suena» en la hoja «PLANIFICAR» de Training, montada de verdad (spec 009).
 *
 * Reglas del dueño (2026-10-20): cuatro interruptores grandes —Sonido, Vibración, Voz que dice el hábito y Repetir si
 * no la atiendo— debajo del recordatorio, por día igual que la hora y el aviso (008); sonido y vibración no pueden
 * quedar los dos apagados; la voz necesita el sonido; «Varía» cuando los días marcados no coinciden; sin aviso la
 * sección se atenúa; se guarda solo lo tocado («Guardar alarma · sáb»). Contra un backend anterior (sin `alarm`) la
 * hoja es la de la 008.
 */

const mockAlerta = jest.fn<(titulo: string, mensaje?: string) => void>();
const mockRueda = jest.fn<(props: { horaInicial: number; minutoInicial: number; onCambiar: (h: number, m: number) => void }) => void>();
const mockPreferencias = jest.fn<() => Promise<PreferenciaHabitoApi[]>>();
const mockSemana = jest.fn<() => Promise<DiaDeLaSemanaApi[]>>();
const mockFijarHora = jest.fn<(...args: unknown[]) => Promise<void>>(async () => undefined);
const mockFijarAviso = jest.fn<(...args: unknown[]) => Promise<void>>(async () => undefined);
const mockFijarAlarmaGeneral = jest.fn<(...args: unknown[]) => Promise<void>>(async () => undefined);
const mockFijarAlarmaDia = jest.fn<(...args: unknown[]) => Promise<void>>(async () => undefined);
const mockQuitarDia = jest.fn<(...args: unknown[]) => Promise<void>>(async () => undefined);
const mockCambiarHorario = jest.fn<(...args: unknown[]) => Promise<{ deferred: boolean; deferredEffectiveDate?: string | null }>>();
const mockProgramar = jest.fn<(...args: unknown[]) => Promise<boolean>>(async () => true);
const mockProgramarDiferido = jest.fn<(...args: unknown[]) => Promise<boolean>>(async () => true);
const mockFilaDias = jest.fn<(props: FilaProps) => void>();
const mockTono = { actual: 'sistema' };
const mockEnOrden: string[] = [];

type FilaProps = {
  onAlternarDia: (dia: string) => void;
  enEdicion: string[];
  avisoDelDia?: (dia: string) => unknown;
  alarmaDelDia?: (dia: string) => { largo: string } | null;
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
jest.mock('../../habits/components/RuedaHoraPicker', () => ({
  RuedaHoraPicker: (props: { horaInicial: number; minutoInicial: number; onCambiar: (h: number, m: number) => void }) => {
    mockRueda(props);
    return null;
  },
}));
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
  sonidoDe: async () => mockTono.actual,
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
jest.mock('../../habits/api/habitsApi', () => ({
  obtenerPreferencias: () => mockPreferencias(),
  obtenerPlanDesbloqueos: async () => ({ items: [] }),
  obtenerHorarioSemanal: () => mockSemana(),
  cambiarHorario: (...args: unknown[]) => { mockEnOrden.push('cambiarHorario'); return mockCambiarHorario(...args); },
  fijarHorarioDelDia: (...args: unknown[]) => mockFijarHora(...args),
  fijarAvisoDelDia: (...args: unknown[]) => mockFijarAviso(...args),
  fijarAlarmaGeneral: (...args: unknown[]) => { mockEnOrden.push('fijarAlarmaGeneral'); return mockFijarAlarmaGeneral(...args); },
  fijarAlarmaDelDia: (...args: unknown[]) => mockFijarAlarmaDia(...args),
  quitarHorarioDelDia: (...args: unknown[]) => mockQuitarDia(...args),
  apagarDiaDeLaSemana: async () => undefined,
  agregarHabitoAlPlan: async () => undefined,
  cambiarEstadoHabito: async () => undefined,
}));

import { tacto } from '../../../utils/tacto';
import { PlanificarDimensionModal } from '../components/PlanificarDimensionModal';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const JUGO: HabitItem = {
  id: 'track-h-jugo', dimension: 'CUERPO', title: 'JUGO VERDE', time: '07:00', tag: 'CUERPO', streak: 0, done: false,
  hasEvidence: false, tieneTrackHoy: true, habitoId: 'h-jugo', isDeactivatable: true, icon: 'salad',
};

/** GIMNASIO del catálogo (`V99` del backend): tiene voz propia si conserva su id y su título. */
const GIMNASIO_ID = 'ec0f2b08-3a18-4ff4-8e2b-243e5220d211';
const gimnasio = (title: string): HabitItem => ({ ...JUGO, id: 'track-gym', title, habitoId: GIMNASIO_ID, icon: 'dumbbell' as HabitItem['icon'] });

type Alarma = { sound: boolean; vibration: boolean; voice: boolean; repeat: boolean };
const DE_SIEMPRE: Alarma = { sound: true, vibration: true, voice: false, repeat: false };

/** Un hábito con la spec 009: la lista trae la combinación general. */
const preferencia = (alarm: Alarma | null = DE_SIEMPRE, extra: Partial<PreferenciaHabitoApi> = {}): PreferenciaHabitoApi => ({
  habitId: 'h-jugo', title: 'h-jugo', triggerTime: '07:00:00', limitTime: null, customized: true,
  reminderEnabled: true, reminderMinutesBefore: 10, reminderMinutesList: [10], pendingChange: null,
  ...(alarm ? { alarm } : {}), ...extra,
});

const NOMBRES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
/** Los siete días como los manda un backend CON la spec 009. */
function semana(cambios: Record<string, Partial<DiaDeLaSemanaApi>> = {}): DiaDeLaSemanaApi[] {
  return NOMBRES.map(weekday => ({
    weekday, triggerTime: '07:00:00', limitTime: null, custom: false, active: true,
    reminderEnabled: true, reminderMinutesList: [10], customReminder: false,
    alarm: DE_SIEMPRE, customAlarm: false,
    ...cambios[weekday],
  }));
}
const propia = (alarm: Alarma): Partial<DiaDeLaSemanaApi> => ({ customAlarm: true, alarm });

async function esperar() {
  await act(async () => {
    await new Promise(r => setTimeout(r, 0));
  });
}

let raiz: ReactTestRenderer | null = null;

async function montar(habito: HabitItem = JUGO): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(
      React.createElement(PlanificarDimensionModal, {
        visible: true, dimension: 'CUERPO', habits: [habito], onCerrar: () => undefined, onGuardado: () => undefined,
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

async function abrirElHabito(r: ReactTestRenderer, titulo = 'Jugo verde') {
  const filas = r.root.findAll(n => typeof n.props.onPress === 'function'
    && n.findAll(x => (x.type as unknown) === 'Text' && x.props.children === titulo).length > 0);
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

type Clave = 'sonido' | 'vibracion' | 'voz' | 'repetir';
const fila = (r: ReactTestRenderer, clave: Clave): ReactTestInstance =>
  r.root.findAll(n => n.props.testID === `como-suena-${clave}` && typeof n.props.onPress === 'function')[0];
const estado = (r: ReactTestRenderer, clave: Clave): unknown => fila(r, clave).props.accessibilityState?.checked;
const estaDeshabilitada = (r: ReactTestRenderer, clave: Clave): boolean => fila(r, clave).props.accessibilityState?.disabled === true;

async function tocarFila(r: ReactTestRenderer, clave: Clave) {
  await act(async () => {
    fila(r, clave).props.onPress();
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

async function elegirSinAviso(r: ReactTestRenderer) {
  const [sinAviso] = r.root.findAll(n => typeof n.props.onPress === 'function'
    && n.findAll(x => (x.type as unknown) === 'Text' && x.props.children === 'Sin aviso').length > 0);
  await act(async () => { sinAviso.props.onPress(); });
}

beforeEach(() => {
  for (const m of [mockAlerta, mockRueda, mockPreferencias, mockSemana, mockFijarHora, mockFijarAviso, mockFijarAlarmaGeneral, mockFijarAlarmaDia,
    mockQuitarDia, mockCambiarHorario, mockProgramar, mockProgramarDiferido, mockFilaDias]) {
    m.mockClear();
  }
  mockEnOrden.length = 0;
  mockTono.actual = 'sistema';
  mockPreferencias.mockResolvedValue([preferencia()]);
  mockSemana.mockReset();
  mockSemana.mockResolvedValue(semana());
  mockProgramar.mockResolvedValue(true);
  mockCambiarHorario.mockResolvedValue({ deferred: false });
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('la sección «Cómo suena»', () => {
  it('aparece debajo del recordatorio con las cuatro filas, y el orden es hora → días → recordatorio → cómo suena', async () => {
    const r = await montar();
    await abrirElHabito(r);
    const todo = textos(r);
    for (const rotulo of ['Sonido', 'Vibración', 'Voz que dice el hábito', 'Repetir si no la atiendo']) expect(todo).toContain(rotulo);
    // JUGO (`h-jugo`) no es un hábito del catálogo: no tiene voz propia y su fila de voz dice la frase general.
    for (const explicacion of ['Suena el tono que elegiste en Yo → Alarmas', 'El teléfono vibra', 'Este hábito dice la frase general: «Tu hábito está por empezar»', 'Vuelve a sonar a los 5 y a los 10 minutos']) {
      expect(todo).toContain(explicacion);
    }
    expect(todo).not.toContain('Una voz dice el nombre del hábito');
    expect(todo.indexOf('Hora')).toBeLessThan(todo.indexOf('Todos los días'));
    expect(todo.indexOf('Todos los días')).toBeLessThan(todo.indexOf('Recordatorio'));
    expect(todo.indexOf('Recordatorio')).toBeLessThan(todo.indexOf('Cómo suena'));
    expect(todo.indexOf('Cómo suena')).toBeLessThan(todo.indexOf('Sonido'));
    // Va en el lugar que dejó la 008, y es lo último de lo que se desliza.
    const [espacio] = r.root.findAll(n => n.props.testID === 'espacio-para-tipos-de-alarma');
    expect(React.Children.count(espacio.props.children)).toBe(1);
  });

  it('un hábito del catálogo con voz propia dice que la voz dice su nombre; renombrado, dice la frase general', async () => {
    mockPreferencias.mockResolvedValue([preferencia(DE_SIEMPRE, { habitId: GIMNASIO_ID })]);
    const delCatalogo = await montar(gimnasio('GIMNASIO'));
    await abrirElHabito(delCatalogo, 'Gimnasio');
    expect(textos(delCatalogo)).toContain('Una voz dice el nombre del hábito');
    expect(textos(delCatalogo)).not.toContain('frase general');
    act(() => delCatalogo.unmount());

    // El mismo hábito con otro nombre ya no es el del catálogo: la alarma dice la frase general y la fila lo avisa.
    const renombrado = await montar(gimnasio('Mi gimnasio'));
    await abrirElHabito(renombrado, 'Mi gimnasio');
    const todo = textos(renombrado);
    expect(todo).toContain('Este hábito dice la frase general: «Tu hábito está por empezar»');
    expect(todo).not.toContain('Una voz dice el nombre del hábito');
    // Las otras tres filas no cambian.
    for (const explicacion of ['Suena el tono que elegiste en Yo → Alarmas', 'El teléfono vibra', 'Vuelve a sonar a los 5 y a los 10 minutos']) {
      expect(todo).toContain(explicacion);
    }
  });

  it('cada fila es un interruptor con su estado: lo de siempre es sonido y vibración encendidos, voz y repetir apagados', async () => {
    const r = await montar();
    await abrirElHabito(r);
    expect(['sonido', 'vibracion', 'voz', 'repetir'].map(c => estado(r, c as Clave))).toEqual([true, true, false, false]);
    for (const clave of ['sonido', 'vibracion', 'voz', 'repetir'] as const) {
      expect(fila(r, clave).props.accessibilityRole).toBe('switch');
    }
  });

  it('con la combinación guardada de otro teléfono, los interruptores la muestran', async () => {
    mockPreferencias.mockResolvedValue([preferencia({ sound: true, vibration: false, voice: true, repeat: true })]);
    const r = await montar();
    await abrirElHabito(r);
    expect(['sonido', 'vibracion', 'voz', 'repetir'].map(c => estado(r, c as Clave))).toEqual([true, false, true, true]);
  });

  it('contra un backend anterior (sin `alarm`) no se muestra: la hoja es la de la 008', async () => {
    mockPreferencias.mockResolvedValue([preferencia(null)]);
    mockSemana.mockResolvedValue(semana().map(({ alarm: _a, customAlarm: _c, ...resto }) => resto) as DiaDeLaSemanaApi[]);
    const r = await montar();
    await abrirElHabito(r);
    expect(textos(r)).not.toContain('Cómo suena');
    expect(fila(r, 'sonido')).toBeUndefined();
    await marcar('SÁB');
    expect(textos(r)).not.toContain('Cómo suena');
    const [espacio] = r.root.findAll(n => n.props.testID === 'espacio-para-tipos-de-alarma');
    expect(React.Children.count(espacio.props.children)).toBe(0);
  });
});

describe('las reglas, en línea', () => {
  it('apagar el sonido apaga la voz y la deshabilita con «La voz necesita el sonido»', async () => {
    mockPreferencias.mockResolvedValue([preferencia({ sound: true, vibration: true, voice: true, repeat: false })]);
    const r = await montar();
    await abrirElHabito(r);
    expect(estado(r, 'voz')).toBe(true);
    await tocarFila(r, 'sonido');
    expect(estado(r, 'sonido')).toBe(false);
    expect(estado(r, 'voz')).toBe(false);
    expect(estaDeshabilitada(r, 'voz')).toBe(true);
    expect(textos(r)).toContain('La voz necesita el sonido');
  });

  it('encender la voz enciende el sonido', async () => {
    mockPreferencias.mockResolvedValue([preferencia({ sound: false, vibration: true, voice: false, repeat: false })]);
    const r = await montar();
    await abrirElHabito(r);
    expect(estaDeshabilitada(r, 'voz')).toBe(true);
    await tocarFila(r, 'sonido');
    expect(estaDeshabilitada(r, 'voz')).toBe(false);
    await tocarFila(r, 'voz');
    expect(estado(r, 'sonido')).toBe(true);
    expect(estado(r, 'voz')).toBe(true);
  });

  it('sonido y vibración apagados: lo dice en línea, no guarda nada y da el «tic» de error', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await tocarFila(r, 'sonido');
    await tocarFila(r, 'vibracion');
    expect(textos(r)).toContain('Deja encendido el sonido o la vibración. Si no quieres alarma, elige «Sin aviso» en Recordatorio.');
    await pulsarGuardar(r);
    expect(tacto.error).toHaveBeenCalled();
    expect(mockFijarAlarmaGeneral).not.toHaveBeenCalled();
    expect(mockCambiarHorario).not.toHaveBeenCalled();
    // Al encender uno, la línea se va.
    await tocarFila(r, 'vibracion');
    expect(textos(r)).not.toContain('Deja encendido el sonido o la vibración');
  });

  it('el tono de Yo → Alarmas en «Voz»: la voz ya viene de ahí y no se cambia desde acá', async () => {
    mockTono.actual = 'voz';
    const r = await montar();
    await abrirElHabito(r);
    expect(estado(r, 'voz')).toBe(true);
    expect(estaDeshabilitada(r, 'voz')).toBe(true);
    expect(textos(r)).toContain('Ya habla porque tu tono en Yo → Alarmas es «Voz»');
  });
});

describe('sin días marcados: «Cómo suena» del hábito entero', () => {
  it('si solo se tocó «Cómo suena»: «Guardar alarma · todos los días», sin mandar la hora ni el aviso', async () => {
    const r = await montar();
    await abrirElHabito(r);
    expect(guardar(r).props.label).toBe('Guardar 07:00 · todos los días');
    await tocarFila(r, 'repetir');
    expect(guardar(r).props.label).toBe('Guardar alarma · todos los días');
    mockSemana.mockResolvedValue(semana({}));
    await pulsarGuardar(r);

    expect(mockFijarAlarmaGeneral).toHaveBeenCalledWith('h-jugo', { sonido: true, vibracion: true, voz: false, repetir: true });
    expect(mockCambiarHorario).not.toHaveBeenCalled();
    // Las alarmas del teléfono se rehacen con la combinación nueva.
    expect(mockProgramar).toHaveBeenCalledTimes(1);
    const opciones = mockProgramar.mock.calls[0][5] as { alarma?: unknown };
    expect(opciones.alarma).toEqual({ sonido: true, vibracion: true, voz: false, repetir: true });
    expect(textos(r)).toContain('«Jugo verde» suena así: con sonido, vibra, se repite.');
  });

  it('tocar y volver a dejarlo igual no es un cambio: el botón es el de siempre', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await tocarFila(r, 'repetir');
    await tocarFila(r, 'repetir');
    expect(guardar(r).props.label).toBe('Guardar 07:00 · todos los días');
  });

  it('con la hora también cambiada: guarda «cómo suena» PRIMERO y después la hora, y programa con la combinación nueva', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await act(async () => { mockRueda.mock.lastCall![0].onCambiar(8, 30); });
    await tocarFila(r, 'vibracion');
    expect(guardar(r).props.label).toBe('Guardar 08:30 · todos los días');
    await pulsarGuardar(r);

    expect(mockEnOrden).toEqual(['fijarAlarmaGeneral', 'cambiarHorario']);
    expect(mockFijarAlarmaGeneral).toHaveBeenCalledWith('h-jugo', { sonido: true, vibracion: false, voz: false, repetir: false });
    expect(mockProgramar).toHaveBeenCalledTimes(1);
    expect((mockProgramar.mock.calls[0][5] as { alarma?: unknown }).alarma).toEqual({ sonido: true, vibracion: false, voz: false, repetir: false });
  });

  it('si el servidor rechaza «cómo suena» no se cambia nada más y se avisa', async () => {
    mockFijarAlarmaGeneral.mockRejectedValueOnce(new Error('400'));
    const r = await montar();
    await abrirElHabito(r);
    await act(async () => { mockRueda.mock.lastCall![0].onCambiar(8, 30); });
    await tocarFila(r, 'repetir');
    await pulsarGuardar(r);
    expect(mockCambiarHorario).not.toHaveBeenCalled();
    expect(mockProgramar).not.toHaveBeenCalled();
    expect(mockAlerta).toHaveBeenCalled();
  });

  it('un hábito sin ningún aviso: la sección se atenúa, no se puede tocar y dice por qué', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await elegirSinAviso(r);
    expect(textos(r)).toContain('Este hábito no tiene aviso');
    for (const clave of ['sonido', 'vibracion', 'voz', 'repetir'] as const) expect(estaDeshabilitada(r, clave)).toBe(true);
  });
});

describe('con días marcados: «Cómo suena» de esos días', () => {
  it('el rótulo dice de qué días es y solo se guarda «Cómo suena»: «Guardar alarma · sáb»', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await marcar('SÁB');
    expect(textos(r)).toContain('Cómo suena de sáb');
    await tocarFila(r, 'sonido');
    expect(estado(r, 'sonido')).toBe(false);
    expect(guardar(r).props.label).toBe('Guardar alarma · sáb');
    mockSemana.mockResolvedValue(semana({ SATURDAY: propia({ sound: false, vibration: true, voice: false, repeat: false }) }));
    await pulsarGuardar(r);

    expect(mockFijarAlarmaDia).toHaveBeenCalledTimes(1);
    expect(mockFijarAlarmaDia).toHaveBeenCalledWith('h-jugo', 'SATURDAY', { sonido: false, vibracion: true, voz: false, repetir: false });
    // «Solo lo que toqué»: ni la hora ni el aviso de ningún día, y sin tocar el cupo semanal.
    expect(mockFijarHora).not.toHaveBeenCalled();
    expect(mockFijarAviso).not.toHaveBeenCalled();
    expect(textos(r)).toContain('Cómo suena quedó guardado los sáb.');
    // Las alarmas del teléfono se rehacen: el sábado con su combinación y los demás días sin la suya.
    expect(mockProgramar).toHaveBeenCalledTimes(1);
    const opciones = mockProgramar.mock.calls[0][5] as { dias: Array<{ iso: number; alarma?: unknown }>; alarma?: unknown };
    expect(opciones.dias.find(d => d.iso === 6)?.alarma).toEqual({ sonido: false, vibracion: true, voz: false, repetir: false });
    expect(opciones.dias.filter(d => d.iso !== 6).every(d => d.alarma === undefined)).toBe(true);
    expect(opciones.alarma).toEqual({ sonido: true, vibracion: true, voz: false, repetir: false });
  });

  it('junto con la hora y el aviso: se guardan los tres, cada uno en su pedido', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await marcar('SÁB', 'DOM');
    await act(async () => { mockRueda.mock.lastCall![0].onCambiar(9, 0); });
    await tocarFila(r, 'repetir');
    expect(guardar(r).props.label).toBe('Guardar hora y alarma · sáb, dom');
    await pulsarGuardar(r);
    expect(mockFijarHora).toHaveBeenCalledTimes(2);
    expect(mockFijarAlarmaDia).toHaveBeenCalledTimes(2);
    expect(mockFijarAlarmaDia).toHaveBeenCalledWith('h-jugo', 'SUNDAY', { sonido: true, vibracion: true, voz: false, repetir: true });
    expect(mockFijarAviso).not.toHaveBeenCalled();
  });

  it('días con combinaciones distintas: cada interruptor que difiere dice «Varía»; al tocarlo pasa a encendido para todos', async () => {
    mockSemana.mockResolvedValue(semana({
      FRIDAY: propia({ sound: true, vibration: true, voice: false, repeat: true }),
      SATURDAY: propia({ sound: false, vibration: true, voice: false, repeat: false }),
    }));
    const r = await montar();
    await abrirElHabito(r);
    await marcar('VIE', 'SÁB');
    expect(estado(r, 'sonido')).toBe('mixed');
    expect(estado(r, 'repetir')).toBe('mixed');
    expect(estado(r, 'vibracion')).toBe(true);
    expect(textos(r)).toContain('Varía');
    await tocarFila(r, 'repetir');
    expect(estado(r, 'repetir')).toBe(true);
    await pulsarGuardar(r);
    // Cada día conserva lo suyo en lo que no se tocó: el viernes sigue con sonido, el sábado sin él.
    expect(mockFijarAlarmaDia).toHaveBeenCalledWith('h-jugo', 'FRIDAY', { sonido: true, vibracion: true, voz: false, repetir: true });
    expect(mockFijarAlarmaDia).toHaveBeenCalledWith('h-jugo', 'SATURDAY', { sonido: false, vibracion: true, voz: false, repetir: true });
  });

  it('apagar la vibración con el sonido en «Varía» dejaría mudo al día sin sonido: no se guarda', async () => {
    mockSemana.mockResolvedValue(semana({ SATURDAY: propia({ sound: false, vibration: true, voice: false, repeat: false }) }));
    const r = await montar();
    await abrirElHabito(r);
    await marcar('VIE', 'SÁB');
    await tocarFila(r, 'vibracion');
    expect(textos(r)).toContain('Deja encendido el sonido o la vibración. Si no quieres alarma, elige «Sin aviso» en Recordatorio.');
    await pulsarGuardar(r);
    expect(mockFijarAlarmaDia).not.toHaveBeenCalled();
  });

  it('un día sin aviso: la sección se atenúa con «Este día no tiene aviso»', async () => {
    mockSemana.mockResolvedValue(semana({ SATURDAY: { customReminder: true, reminderEnabled: false, reminderMinutesList: [] } }));
    const r = await montar();
    await abrirElHabito(r);
    await marcar('SÁB');
    expect(textos(r)).toContain('Este día no tiene aviso');
    expect(estaDeshabilitada(r, 'sonido')).toBe(true);
  });

  it('el chip de un día con combinación propia lleva el reloj de alarma; los demás, nada', async () => {
    mockSemana.mockResolvedValue(semana({ SATURDAY: propia({ sound: false, vibration: true, voice: false, repeat: true }) }));
    const r = await montar();
    await abrirElHabito(r);
    const { alarmaDelDia } = mockFilaDias.mock.lastCall![0];
    expect(alarmaDelDia).toBeDefined();
    expect(alarmaDelDia!('SÁB')).toEqual({ largo: 'Alarma propia: sin sonido, vibra, se repite' });
    expect(alarmaDelDia!('LUN')).toBeNull();
  });

  it('«Dejar sáb como los demás días» se ofrece para un día con solo «cómo suena» propio y vuelve a la general', async () => {
    mockSemana.mockResolvedValue(semana({ SATURDAY: propia({ sound: false, vibration: true, voice: false, repeat: false }) }));
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
    // Las alarmas se rehacen sin la combinación propia de ese día.
    const opciones = mockProgramar.mock.calls.at(-1)![5] as { dias: Array<{ alarma?: unknown }> };
    expect(opciones.dias.every(d => d.alarma === undefined)).toBe(true);
  });
});
