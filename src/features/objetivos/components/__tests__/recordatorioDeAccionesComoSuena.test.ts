import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Platform } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { CombinacionDeAlarma } from '../../../habits/notificaciones/utils/combinacionDeAlarma';
import type { PreferenciasDeAcciones } from '../../notificaciones/preferenciasPorDia';

/**
 * «Cómo suena» en el control de las acciones de los objetivos, montado de verdad (spec 010, T008 y T009): las mismas cuatro
 * filas, reglas y medidas que en los hábitos (009), con el interruptor grande dorado, por día. Sin días marcados se guarda
 * en el acto; con días marcados, con el botón y solo lo tocado; los días que no coinciden muestran «Varía».
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Pedido = { identifier?: string; content: Record<string, unknown>; trigger: Record<string, unknown> };
const mockSistema = new Map<string, Pedido>();
const mockEstado = { siguienteId: 1, permiso: true };
const mockAlerta = jest.fn<(titulo: string, mensaje?: string) => void>();
const mockError = jest.fn();

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
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: jest.fn(), logro: jest.fn(), error: () => mockError() } }));
jest.mock('../../../habits/components/HoraPickerModal', () => ({ HoraPickerModal: () => null }));
jest.mock('../../../habits/utils/semanaDelPlan', () => {
  const real = jest.requireActual<typeof import('../../../habits/utils/semanaDelPlan')>('../../../habits/utils/semanaDelPlan');
  // Hoy es MIÉRCOLES: de jueves en adelante se pueden tocar los días.
  return { ...real, esPlanificable: (dia: string) => real.DIAS_DEL_PLAN.indexOf(dia as never) > 2 };
});
jest.mock('../../api/objetivosApi', () => ({
  obtenerRocasAgendadas: async () => ({ desde: '2026-09-23', hasta: '2026-09-27', rocas: [] }),
  obtenerRocasDeHoy: async () => [],
  obtenerRocasDeManana: async () => [],
}));

import { guardarPreferenciasDeAlarmas } from '../../../alarmas/preferenciasDeAlarmas';
import { guardarPreferenciasDeAcciones, preferenciasDeAcciones } from '../../notificaciones/recordatoriosDeAcciones';
import { RecordatorioDeAcciones } from '../RecordatorioDeAcciones';
import { BotonPrincipal } from '../../../../components/Legible';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const USUARIO = 'u-1';
const c = (sonido: boolean, vibracion: boolean, voz = false, repetir = false): CombinacionDeAlarma => ({ sonido, vibracion, voz, repetir });
/** Con recordatorio diario encendido: hay una alarma, así que «Cómo suena» se puede usar. */
const BASE: PreferenciasDeAcciones = { diarioActivo: true, horaDiaria: '07:00', antelaciones: [10] };
const programadas = () => [...mockSistema.entries()];

let raiz: ReactTestRenderer | null = null;

async function esperar() {
  await act(async () => {
    await new Promise(r => setTimeout(r, 0));
  });
}

async function montar(prefs: PreferenciasDeAcciones = BASE, extra: { tonoDeYo?: 'voz' | 'vibrar' } = {}): Promise<ReactTestRenderer> {
  await guardarPreferenciasDeAcciones(USUARIO, prefs);
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(RecordatorioDeAcciones, { userId: USUARIO, ...extra }));
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

type Clave = 'sonido' | 'vibracion' | 'voz' | 'repetir';
const fila = (r: ReactTestRenderer, clave: Clave): ReactTestInstance =>
  r.root.findAll(n => n.props.testID === `como-suena-${clave}` && typeof n.props.onPress === 'function')[0];
const estado = (r: ReactTestRenderer, clave: Clave): unknown => fila(r, clave).props.accessibilityState?.checked;
const deshabilitada = (r: ReactTestRenderer, clave: Clave): boolean => fila(r, clave).props.accessibilityState?.disabled === true;

async function tocarFila(r: ReactTestRenderer, clave: Clave) {
  await act(async () => {
    fila(r, clave).props.onPress();
  });
  await esperar();
}

const pastillaDelDia = (r: ReactTestRenderer, dia: string): ReactTestInstance =>
  r.root.findAll(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith(dia) && typeof n.props.onPress === 'function')[0];

async function tocarDia(r: ReactTestRenderer, ...dias: string[]) {
  for (const dia of dias) {
    await act(async () => {
      pastillaDelDia(r, dia).props.onPress();
    });
  }
}

const botonDeGuardar = (r: ReactTestRenderer): ReactTestInstance | undefined =>
  r.root.findAll(n => (n.type as unknown) === BotonPrincipal).find(b => String(b.props.etiqueta).startsWith('Guardar'));

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
  mockError.mockClear();
  await AsyncStorage.clear();
  jest.replaceProperty(Platform, 'OS', 'android');
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('las cuatro filas, con las reglas y las medidas de los hábitos', () => {
  it('Sonido, Vibración, Voz y Repetir si no la atiendo, con su explicación y el interruptor grande', async () => {
    const r = await montar();
    const t = textos(r);
    expect(t).toContain('Cómo suena');
    for (const rotulo of ['Sonido', 'Vibración', 'Voz', 'Repetir si no la atiendo']) expect(t).toContain(rotulo);
    expect(t).toContain('Suena el tono que elegiste en Yo → Alarmas');
    expect(t).toContain('El teléfono vibra');
    // La voz de las acciones es la de objetivos que ya existe: no se graba nada.
    expect(t).toContain('Una voz dice: «Tienes acciones de tus objetivos por hacer»');
    expect(t).toContain('Vuelve a sonar a los 5 y a los 10 minutos');
    // Rol `switch`, como el `InterruptorGrande` de los hábitos.
    for (const clave of ['sonido', 'vibracion', 'voz', 'repetir'] as Clave[]) expect(fila(r, clave).props.accessibilityRole).toBe('switch');
    // Lo de siempre: sonido y vibración encendidos, voz y repetir apagados.
    expect([estado(r, 'sonido'), estado(r, 'vibracion'), estado(r, 'voz'), estado(r, 'repetir')]).toEqual([true, true, false, false]);
  });

  it('el orden de lectura: la fila de días, el recordatorio, el aviso y por último «Cómo suena»', async () => {
    const r = await montar();
    const t = textos(r);
    expect(t.indexOf('Todos los días')).toBeLessThan(t.indexOf('Recordarme mis acciones del día'));
    expect(t.indexOf('Recordarme mis acciones del día')).toBeLessThan(t.indexOf('Aviso antes de cada acción con hora'));
    expect(t.indexOf('Aviso antes de cada acción con hora')).toBeLessThan(t.indexOf('Cómo suena'));
  });

  it('sin recordatorio ni aviso no hay alarma que decidir: se ve atenuada y dice por qué', async () => {
    const r = await montar({ diarioActivo: false, horaDiaria: '07:00', antelaciones: [] });
    expect(textos(r)).toContain('Todavía no tienes recordatorio ni aviso');
    expect(textos(r)).toContain('Enciende el recordatorio o elige un aviso para elegir cómo suena.');
    for (const clave of ['sonido', 'vibracion', 'voz', 'repetir'] as Clave[]) expect(deshabilitada(r, clave)).toBe(true);
  });

  it('con solo el aviso (sin recordatorio diario) también se puede elegir', async () => {
    const r = await montar({ diarioActivo: false, horaDiaria: '07:00', antelaciones: [10] });
    expect(deshabilitada(r, 'sonido')).toBe(false);
  });
});

describe('sin días marcados: en el acto, como lo demás', () => {
  it('apagar la vibración se guarda y el recordatorio sale por el canal «sin vibración»', async () => {
    const r = await montar();
    await tocarFila(r, 'vibracion');
    expect((await preferenciasDeAcciones(USUARIO)).alarma).toEqual(c(true, false));
    expect(estado(r, 'vibracion')).toBe(false);
    expect(programadas()).toHaveLength(1);
    expect(programadas()[0][1].trigger).toMatchObject({ type: 'daily', channelId: 'recordatorios-objetivos-sinvib' });
  });

  it('sonido y vibración no pueden quedar los dos apagados: la regla se dice en línea y no se guarda', async () => {
    const r = await montar();
    await tocarFila(r, 'sonido'); // sin sonido, vibra: se guarda
    expect((await preferenciasDeAcciones(USUARIO)).alarma).toEqual(c(false, true));
    await tocarFila(r, 'vibracion'); // los dos apagados: no
    expect(textos(r)).toContain('Deja encendido el sonido o la vibración. Si no quieres alarma, elige «Sin aviso» en Recordatorio.');
    expect((await preferenciasDeAcciones(USUARIO)).alarma).toEqual(c(false, true));
    // Volver a encender uno lo arregla y se guarda; el que se había apagado sigue apagado (es lo que se tocó).
    await tocarFila(r, 'sonido');
    expect(textos(r)).not.toContain('Deja encendido el sonido o la vibración');
    expect((await preferenciasDeAcciones(USUARIO)).alarma).toEqual(c(true, false));
  });

  it('la voz necesita el sonido: sin sonido se apaga y se deshabilita; encender la voz enciende el sonido', async () => {
    const r = await montar({ ...BASE, alarma: c(true, true, true) });
    expect(estado(r, 'voz')).toBe(true);
    await tocarFila(r, 'sonido');
    expect(estado(r, 'voz')).toBe(false);
    expect(deshabilitada(r, 'voz')).toBe(true);
    expect(textos(r)).toContain('La voz necesita el sonido');
    expect((await preferenciasDeAcciones(USUARIO)).alarma).toEqual(c(false, true));
    await tocarFila(r, 'sonido');
    await tocarFila(r, 'voz');
    expect(estado(r, 'sonido')).toBe(true);
    expect(estado(r, 'voz')).toBe(true);
  });

  it('encender «Repetir» se guarda y programa las repeticiones del recordatorio diario', async () => {
    const r = await montar();
    await tocarFila(r, 'repetir');
    expect((await preferenciasDeAcciones(USUARIO)).alarma).toEqual(c(true, true, false, true));
    const repeticiones = programadas().filter(([id]) => id.startsWith('acciones-diario-rep-'));
    expect(repeticiones.length).toBeGreaterThanOrEqual(10);
  });

  it('dos toques seguidos no se pisan: el segundo parte de lo que dejó el primero y no queda una alarma de más', async () => {
    const r = await montar();
    await act(async () => {
      fila(r, 'vibracion').props.onPress();
      fila(r, 'repetir').props.onPress();
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    await esperar();
    expect((await preferenciasDeAcciones(USUARIO)).alarma).toEqual(c(true, false, false, true));
    // Una sola alarma diaria del recordatorio (más sus repeticiones), no dos.
    expect(programadas().filter(([, p]) => p.trigger.type === 'daily')).toHaveLength(1);
  });

  it('si el tono de Yo → Alarmas es «Voz», la voz ya habla y no se cambia desde acá', async () => {
    await guardarPreferenciasDeAlarmas(USUARIO, { eventosActivas: true, sonido: 'voz' });
    const r = await montar();
    expect(estado(r, 'voz')).toBe(true);
    expect(deshabilitada(r, 'voz')).toBe(true);
    expect(textos(r)).toContain('Ya habla porque tu tono en Yo → Alarmas es «Voz»');
  });

  it('el tono que llega de Yo → Alarmas (la pantalla ya lo tiene) manda sobre lo guardado', async () => {
    const r = await montar(BASE, { tonoDeYo: 'vibrar' });
    expect(textos(r)).toContain('Tu tono en Yo → Alarmas es «Solo vibrar»: elige otro para que suene');
  });
});

describe('con días marcados: por día, con «Varía» y solo lo tocado', () => {
  it('tocar un interruptor queda en el borrador y se guarda con el botón; la fila del día lo dice', async () => {
    const r = await montar();
    await tocarDia(r, 'Sábado');
    expect(textos(r)).toContain('Cómo suena de sáb');
    await tocarFila(r, 'vibracion');
    expect(estado(r, 'vibracion')).toBe(false);
    expect((await preferenciasDeAcciones(USUARIO)).dias).toBeUndefined();
    expect(botonDeGuardar(r)?.props.etiqueta).toBe('Guardar cambios · sáb');

    await guardarLosDias(r);
    expect((await preferenciasDeAcciones(USUARIO)).dias).toEqual({ 6: { alarma: c(true, false) } });
    // El día queda con la alarma propia y el lector de pantalla lo dice.
    expect(pastillaDelDia(r, 'Sábado').props.accessibilityLabel).toContain('alarma propia: con sonido, no vibra');
    // El recordatorio del sábado sale por su canal; los demás días, como siempre.
    expect(programadas()).toHaveLength(7);
    const canal = (id: string) => (programadas().find(([i]) => i === id)![1].trigger as { channelId: string }).channelId;
    expect(canal('acciones-diario-d6')).toBe('recordatorios-objetivos-sinvib');
    expect(canal('acciones-diario-d1')).toBe('recordatorios-objetivos-vib');
  });

  it('«Varía»: los días marcados que no coinciden; tocarlo lo enciende para todos', async () => {
    const r = await montar({ ...BASE, dias: { 6: { alarma: c(true, false, false, true) } } });
    await tocarDia(r, 'Sábado', 'Domingo');
    // El sábado no vibra y repite; el domingo es lo de siempre.
    expect(estado(r, 'vibracion')).toBe('mixed');
    expect(estado(r, 'repetir')).toBe('mixed');
    expect(estado(r, 'sonido')).toBe(true);
    expect(estado(r, 'voz')).toBe(false);
    expect(fila(r, 'vibracion').props.accessibilityValue).toEqual({ text: 'Varía según el día' });
    await tocarFila(r, 'vibracion');
    expect(estado(r, 'vibracion')).toBe(true);
    await guardarLosDias(r);
    // El sábado conserva su «Repetir» (no se tocó) y los dos vibran.
    expect((await preferenciasDeAcciones(USUARIO)).dias).toEqual({ 6: { alarma: c(true, true, false, true) } });
  });

  it('se guarda solo lo tocado: la hora y el aviso propios de cada día no se tocan', async () => {
    const r = await montar({
      ...BASE,
      dias: { 6: { horaDiaria: '09:00', antelaciones: [30] }, 7: { horaDiaria: '10:00' } },
    });
    await tocarDia(r, 'Sábado', 'Domingo');
    await tocarFila(r, 'repetir');
    await guardarLosDias(r);
    expect((await preferenciasDeAcciones(USUARIO)).dias).toEqual({
      6: { horaDiaria: '09:00', antelaciones: [30], alarma: c(true, true, false, true) },
      7: { horaDiaria: '10:00', alarma: c(true, true, false, true) },
    });
  });

  it('con días marcados la regla de sonido y vibración también bloquea el guardado, con una vibración de error', async () => {
    const r = await montar();
    await tocarDia(r, 'Sábado');
    await tocarFila(r, 'sonido');
    await tocarFila(r, 'vibracion');
    expect(textos(r)).toContain('Deja encendido el sonido o la vibración');
    await act(async () => {
      botonDeGuardar(r)!.props.onPress();
    });
    await esperar();
    expect(mockError).toHaveBeenCalled();
    expect((await preferenciasDeAcciones(USUARIO)).dias).toBeUndefined();
  });

  it('un día sin aviso ni recordatorio ese día: la sección se atenúa y lo explica', async () => {
    const r = await montar({ ...BASE, dias: { 6: { diarioActivo: false, antelaciones: [] } } });
    await tocarDia(r, 'Sábado');
    expect(textos(r)).toContain('Este día no tiene recordatorio ni aviso');
    expect(deshabilitada(r, 'sonido')).toBe(true);
    await tocarDia(r, 'Domingo');
    // Con un día que sí tiene alarmas, la sección se puede usar.
    expect(deshabilitada(r, 'sonido')).toBe(false);
  });

  it('«Dejar sáb como los demás días» quita también cómo suena', async () => {
    const r = await montar({ ...BASE, dias: { 6: { alarma: c(false, true) } } });
    await tocarDia(r, 'Sábado');
    const enlace = r.root.findAll(n => typeof n.props.onPress === 'function'
      && n.findAll(x => (x.type as unknown) === 'Text' && String(x.props.children).includes('como los demás días')).length > 0);
    await act(async () => {
      enlace[enlace.length - 1].props.onPress();
    });
    await esperar();
    expect((await preferenciasDeAcciones(USUARIO)).dias).toBeUndefined();
  });
});
