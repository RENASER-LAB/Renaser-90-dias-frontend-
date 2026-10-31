import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Presionable } from '../../../components/Presionable';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { DiaDeLaSemanaApi, PreferenciaHabitoApi } from '../../habits/types/habits.types';
import type { HabitItem } from '../../../screens/TrainingScreen';

/**
 * «Otra» en la hoja «PLANIFICAR» de Training, montada de verdad (spec 011). Tocar «Otra» SUMA un aviso nuevo (15, o el
 * siguiente libre) y lo marca —los que había quedan— y, DENTRO de lo que se desliza y debajo de las opciones, abre la
 * fila «−  15 min antes  +», que mueve SOLO ese aviso por múltiplos de 5 entre 5 y 60, saltando los que ya existen. Antes era una
 * rueda fuera del desplazamiento con un botón «Añadir», que se montaba encima del contenido.
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
    if (/^(\d+ min antes|\d+ h antes|A la hora exacta)/.test(etiqueta)) nombres.add(etiqueta.replace(', activado', ''));
    else if (n.findAll(x => (x.type as unknown) === 'Text' && x.props.children === 'Sin aviso').length > 0) nombres.add('Sin aviso');
  }
  return [...nombres];
}

const FILA = 'fila-otra-antelacion';
const filaDeOtra = (r: ReactTestRenderer): ReactTestInstance | undefined =>
  r.root.findAll(n => n.props.testID === FILA)[0];
const textoDeLaFila = (r: ReactTestRenderer): string => {
  const fila = filaDeOtra(r);
  if (!fila) return '';
  return fila
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).join(''))
    .join(' | ');
};
const botonDeLaFila = (r: ReactTestRenderer, etiqueta: string): ReactTestInstance =>
  filaDeOtra(r)!.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === etiqueta)[0];
const apagado = (b: ReactTestInstance) => b.props.accessibilityState?.disabled === true;

async function pulsar(r: ReactTestRenderer, etiqueta: string) {
  await act(async () => {
    botonDeLaFila(r, etiqueta).props.onPress();
  });
}
async function tocarSinAviso(r: ReactTestRenderer) {
  const [sinAviso] = r.root.findAll(n => typeof n.props.onPress === 'function'
    && n.findAll(x => (x.type as unknown) === 'Text' && x.props.children === 'Sin aviso').length > 0);
  await act(async () => { sinAviso.props.onPress(); });
}
const tocarOtra = (r: ReactTestRenderer) => tocar(r, 'Otra antelación');

beforeEach(() => {
  for (const m of [mockAlerta, mockRueda, mockPreferencias, mockSemana, mockFijarHora, mockFijarAviso, mockQuitarDia, mockCambiarHorario, mockProgramar, mockProgramarDiferido, mockFilaDias]) {
    m.mockClear();
  }
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

/** Los avisos del hábito abierto, tal como los trae el servidor (la lista general). */
function conAvisosGenerales(avisos: number[]) {
  mockPreferencias.mockResolvedValue([preferencia({
    reminderEnabled: avisos.length > 0,
    reminderMinutesBefore: avisos.length > 0 ? Math.max(...avisos) : null,
    reminderMinutesList: avisos,
  })]);
  mockSemana.mockResolvedValue(semana({
    MONDAY: { reminderMinutesList: avisos, reminderEnabled: avisos.length > 0 },
    TUESDAY: { reminderMinutesList: avisos, reminderEnabled: avisos.length > 0 },
    WEDNESDAY: { reminderMinutesList: avisos, reminderEnabled: avisos.length > 0 },
    THURSDAY: { reminderMinutesList: avisos, reminderEnabled: avisos.length > 0 },
    FRIDAY: { reminderMinutesList: avisos, reminderEnabled: avisos.length > 0 },
    SATURDAY: { reminderMinutesList: avisos, reminderEnabled: avisos.length > 0 },
    SUNDAY: { reminderMinutesList: avisos, reminderEnabled: avisos.length > 0 },
  }));
}
const ordenadas = (r: ReactTestRenderer): string[] => elegidas(r).sort();

describe('tocar «Otra»', () => {
  it('SUMA un aviso nuevo: con 10 min antes ya marcado queda el 10 y se agrega 15', async () => {
    const r = await montar();
    await abrirElHabito(r);
    expect(elegidas(r)).toEqual(['10 min antes']);
    await tocarOtra(r);
    expect(ordenadas(r)).toEqual(['10 min antes', '15 min antes']);
    expect(filaDeOtra(r)).toBeDefined();
    expect(textoDeLaFila(r)).toContain('15 min antes');
    // Los botones se anuncian con su acción, no con el signo.
    expect(botonDeLaFila(r, 'Cinco minutos menos')).toBeDefined();
    expect(botonDeLaFila(r, 'Cinco minutos más')).toBeDefined();
  });

  it('sin avisos: agrega y marca 15 min antes (y «Sin aviso» deja de estar marcado)', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await tocarSinAviso(r);
    expect(elegidas(r)).toEqual(['Sin aviso']);
    expect(filaDeOtra(r)).toBeUndefined();
    await tocarOtra(r);
    expect(elegidas(r)).toEqual(['15 min antes']);
    expect(textoDeLaFila(r)).toContain('15 min antes');
  });

  it('con 30 min antes y a la hora marcados: suma 15 y quedan los tres', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await tocarSinAviso(r);
    await tocar(r, '30 min antes');
    await tocar(r, 'A la hora exacta');
    expect(ordenadas(r)).toEqual(['30 min antes', 'A la hora exacta']);
    await tocarOtra(r);
    expect(ordenadas(r)).toEqual(['15 min antes', '30 min antes', 'A la hora exacta']);
    expect(textoDeLaFila(r)).toContain('15 min antes');
  });

  it('con 15 ya existente arranca en 20 y deja el 15', async () => {
    conAvisosGenerales([15]);
    const r = await montar();
    await abrirElHabito(r);
    expect(elegidas(r)).toEqual(['15 min antes']);
    await tocarOtra(r);
    expect(ordenadas(r)).toEqual(['15 min antes', '20 min antes']);
    expect(textoDeLaFila(r)).toContain('20 min antes');
  });

  it('volver a tocar «Otra» solo cierra la fila y el aviso queda; otro toque la abre sin sumar otro', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await tocarOtra(r);
    expect(filaDeOtra(r)).toBeDefined();
    await tocarOtra(r);
    expect(filaDeOtra(r)).toBeUndefined();
    expect(ordenadas(r)).toEqual(['10 min antes', '15 min antes']);
    await tocarOtra(r);
    expect(filaDeOtra(r)).toBeDefined();
    expect(textoDeLaFila(r)).toContain('15 min antes');
    expect(ordenadas(r)).toEqual(['10 min antes', '15 min antes']);
  });

  it('sin ningún valor libre no suma nada y no abre la fila', async () => {
    conAvisosGenerales([60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5]);
    const r = await montar();
    await abrirElHabito(r);
    const antes = ordenadas(r);
    expect(antes).toHaveLength(12);
    await tocarOtra(r);
    expect(filaDeOtra(r)).toBeUndefined();
    expect(ordenadas(r)).toEqual(antes);
  });

  it('la fila vive DENTRO de lo que se desliza y no hay rueda ni «Añadir» por encima de nada', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await tocarOtra(r);
    const desplazables = r.root.findAll(n => (n.type as unknown) === ScrollView);
    expect(desplazables.some(s => s.findAll(n => n.props.testID === FILA).length > 0)).toBe(true);
    expect(textos(r)).not.toMatch(/Añadir/);
    expect(r.root.findAll(n => n.props.accessibilityLabel === 'Minutos de antelación')).toHaveLength(0);
  });

  it('va debajo de las opciones del recordatorio: después de «Otra» en el orden de la pantalla', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await tocarOtra(r);
    const todo = textos(r);
    expect(todo.indexOf('A la hora')).toBeLessThan(todo.indexOf('Otra'));
    expect(todo.lastIndexOf('15 min antes')).toBeGreaterThan(todo.indexOf('Otra'));
  });
});

describe('«+» y «−»', () => {
  it('«+» sube de 5 en 5 SOLO el aviso de «Otra»: el 10 queda y el 15 pasa a 20', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await tocarOtra(r);
    await pulsar(r, 'Cinco minutos más');
    expect(textoDeLaFila(r)).toContain('20 min antes');
    expect(ordenadas(r)).toEqual(['10 min antes', '20 min antes']);
    await pulsar(r, 'Cinco minutos más');
    expect(ordenadas(r)).toEqual(['10 min antes', '25 min antes']);
  });

  it('«−» baja de 5 en 5 y SALTA el 10 que ya existe: del 15 va al 5 (el piso)', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await tocarOtra(r);
    await pulsar(r, 'Cinco minutos menos');
    expect(textoDeLaFila(r)).toContain('5 min antes');
    expect(ordenadas(r)).toEqual(['10 min antes', '5 min antes']);
    // Y desde el piso, «−» está apagado: el 10 sigue marcado y nada se pisa.
    expect(apagado(botonDeLaFila(r, 'Cinco minutos menos'))).toBe(true);
  });

  it('«+» desde 25 con 30 existente salta a 35 y el 30 queda marcado', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await tocarSinAviso(r);
    await tocar(r, '30 min antes');
    await tocarOtra(r); // 15
    await pulsar(r, 'Cinco minutos más'); // 20
    await pulsar(r, 'Cinco minutos más'); // 25
    expect(ordenadas(r)).toEqual(['25 min antes', '30 min antes']);
    await pulsar(r, 'Cinco minutos más'); // salta el 30
    expect(textoDeLaFila(r)).toContain('35 min antes');
    expect(ordenadas(r)).toEqual(['30 min antes', '35 min antes']);
  });

  it('tope en 60: «+» se apaga y no pasa de ahí', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await tocarSinAviso(r);
    await tocarOtra(r);
    for (let i = 0; i < 12; i += 1) await pulsar(r, 'Cinco minutos más');
    expect(textoDeLaFila(r)).toContain('1 h antes');
    expect(elegidas(r)).toEqual(['1 h antes']);
    expect(apagado(botonDeLaFila(r, 'Cinco minutos más'))).toBe(true);
    expect(apagado(botonDeLaFila(r, 'Cinco minutos menos'))).toBe(false);
  });

  it('tope en 5: «−» se apaga en 5 y no baja a 1; «+» vuelve a andar', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await tocarSinAviso(r);
    await tocarOtra(r); // 15
    await pulsar(r, 'Cinco minutos menos'); // 10
    expect(apagado(botonDeLaFila(r, 'Cinco minutos menos'))).toBe(false);
    await pulsar(r, 'Cinco minutos menos'); // 5
    expect(textoDeLaFila(r)).toContain('5 min antes');
    expect(elegidas(r)).toEqual(['5 min antes']);
    expect(apagado(botonDeLaFila(r, 'Cinco minutos menos'))).toBe(true);
    expect(apagado(botonDeLaFila(r, 'Cinco minutos más'))).toBe(false);
    // Aunque se insista, no baja a 1.
    await pulsar(r, 'Cinco minutos menos');
    expect(textoDeLaFila(r)).toContain('5 min antes');
    expect(elegidas(r)).toEqual(['5 min antes']);
    await pulsar(r, 'Cinco minutos más');
    expect(textoDeLaFila(r)).toContain('10 min antes');
  });

  it('sin un valor libre en esa dirección el botón queda apagado (arriba ocupado: 60 y 55)', async () => {
    conAvisosGenerales([60, 55]);
    const r = await montar();
    await abrirElHabito(r);
    await tocarOtra(r); // 15
    for (let i = 0; i < 7; i += 1) await pulsar(r, 'Cinco minutos más'); // … hasta 50
    expect(textoDeLaFila(r)).toContain('50 min antes');
    expect(ordenadas(r)).toEqual(['1 h antes', '50 min antes', '55 min antes']);
    expect(apagado(botonDeLaFila(r, 'Cinco minutos más'))).toBe(true);
    expect(apagado(botonDeLaFila(r, 'Cinco minutos menos'))).toBe(false);
  });

  it('no toca «A la hora» ni los otros avisos', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await tocarSinAviso(r);
    await tocar(r, 'A la hora exacta');
    await tocar(r, '30 min antes');
    await tocarOtra(r); // 15
    await pulsar(r, 'Cinco minutos más'); // 20
    expect(ordenadas(r)).toEqual(['20 min antes', '30 min antes', 'A la hora exacta']);
    await pulsar(r, 'Cinco minutos menos'); // 15
    expect(ordenadas(r)).toEqual(['15 min antes', '30 min antes', 'A la hora exacta']);
  });
});

describe('las reglas de siempre', () => {
  it('tocar la pastilla del aviso de «Otra» lo desmarca y cierra la fila; los demás quedan', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await tocarOtra(r);
    await tocar(r, '15 min antes');
    expect(filaDeOtra(r)).toBeUndefined();
    expect(elegidas(r)).toEqual(['10 min antes']);
  });

  it('después de desmarcarlo, «Otra» suma uno nuevo (15 vuelve a estar libre)', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await tocarOtra(r);
    await tocar(r, '15 min antes');
    await tocarOtra(r);
    expect(ordenadas(r)).toEqual(['10 min antes', '15 min antes']);
    expect(filaDeOtra(r)).toBeDefined();
  });

  it('«Sin aviso» es exclusivo: vacía los avisos y cierra la fila', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await tocarOtra(r);
    await tocar(r, 'A la hora exacta');
    expect(ordenadas(r)).toEqual(['10 min antes', '15 min antes', 'A la hora exacta']);
    await tocarSinAviso(r);
    expect(elegidas(r)).toEqual(['Sin aviso']);
    expect(filaDeOtra(r)).toBeUndefined();
  });

  it('con días marcados el aviso va a ESOS días y se guarda solo el aviso (suma, no reemplaza)', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await marcar('SÁB', 'DOM');
    expect(elegidas(r)).toEqual(['10 min antes']);
    await tocarOtra(r); // suma 15
    await pulsar(r, 'Cinco minutos más'); // 20
    expect(ordenadas(r)).toEqual(['10 min antes', '20 min antes']);
    expect(guardar(r).props.label).toBe('Guardar aviso · sáb, dom');
    await pulsarGuardar(r);
    expect(mockFijarAviso).toHaveBeenCalledWith('h-jugo', 'SATURDAY', true, [20, 10]);
    expect(mockFijarAviso).toHaveBeenCalledWith('h-jugo', 'SUNDAY', true, [20, 10]);
    expect(mockFijarHora).not.toHaveBeenCalled();
  });

  it('con días de avisos distintos «Otra» pone el aviso a todos los marcados, como cualquier pastilla', async () => {
    mockSemana.mockResolvedValue(semana({ FRIDAY: conAviso([30]), SATURDAY: conAviso([]) }));
    const r = await montar();
    await abrirElHabito(r);
    await marcar('VIE', 'SÁB');
    expect(elegidas(r)).toEqual([]);
    await tocarOtra(r);
    expect(textos(r)).not.toContain('Estos días tienen avisos distintos');
    expect(elegidas(r)).toEqual(['15 min antes']);
    expect(filaDeOtra(r)).toBeDefined();
  });

  it('cambiar entre todos los días y días marcados cierra la fila y suelta el aviso: «Otra» vuelve a sumar uno nuevo', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await tocarOtra(r);
    expect(filaDeOtra(r)).toBeDefined();
    await marcar('SÁB');
    expect(filaDeOtra(r)).toBeUndefined();
    await marcar('SÁB'); // vuelve a todos los días
    expect(filaDeOtra(r)).toBeUndefined();
    // El 15 de antes sigue en el general; «Otra» ya no lo considera suyo: suma uno nuevo.
    expect(ordenadas(r)).toEqual(['10 min antes', '15 min antes']);
    await tocarOtra(r);
    expect(ordenadas(r)).toEqual(['10 min antes', '15 min antes', '20 min antes']);
    expect(textoDeLaFila(r)).toContain('20 min antes');
  });

  it('lo que se guarda sin días marcados son los avisos que dejó la fila, con el que ya había', async () => {
    const r = await montar();
    await abrirElHabito(r);
    await tocarOtra(r);
    await pulsar(r, 'Cinco minutos más');
    await pulsarGuardar(r);
    expect(mockCambiarHorario).toHaveBeenCalledTimes(1);
    expect(mockCambiarHorario.mock.calls[0][3]).toEqual({ activo: true, minutosAntes: 20, lista: [20, 10] });
    expect(mockProgramar).toHaveBeenCalledTimes(1);
    expect(mockProgramar.mock.calls[0][4]).toEqual([20, 10]);
  });
});

describe('el editor ocupa toda la pantalla (spec 011)', () => {
  it('la hoja de Planificar es `completa` en la lista y en el editor de un hábito', async () => {
    const r = await montar();
    const hoja = () => r.root.findAll(n => (n.type as unknown) === HojaDesdeAbajo)[0];
    expect(hoja().props.tamano).toBe('completa');
    await abrirElHabito(r);
    expect(hoja().props.tamano).toBe('completa');
  });

  it('al final de lo que se desliza queda aire de sobra para que «Cómo suena» se lea entero sobre el botón fijo', async () => {
    const r = await montar();
    await abrirElHabito(r);
    const desplazableDelEditor = r.root.findAll(n => (n.type as unknown) === ScrollView && n.props.persistentScrollbar === true)[0];
    expect(desplazableDelEditor).toBeDefined();
    const contenido = StyleSheet.flatten(desplazableDelEditor.props.contentContainerStyle) as { paddingBottom?: number };
    expect(contenido.paddingBottom ?? 0).toBeGreaterThanOrEqual(24);
    // El botón de guardar no va dentro de lo que se desliza: es el pie fijo de la hoja.
    expect(desplazableDelEditor.findAll(n => typeof n.props.label === 'string' && n.props.label.startsWith('Guardar'))).toHaveLength(0);
    expect(guardar(r)).toBeDefined();
  });
});
