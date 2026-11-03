/**
 * Spec 023, FR-018: tras un traslado de formación, la puesta al día RETIRA las alarmas de los hábitos que el servidor ya no lista (los de la
 * formación anterior). Solo con la lista COMPLETA y leída bien; las alarmas de eventos, acciones de los objetivos, Código Renaser y el repaso
 * de los domingos no son de hábitos y no se tocan. Se prueba contra la librería de mentira, que hace lo que la de verdad en Android.
 *
 * Las pruebas corren en `America/Lima` (jest.config.js) y con el reloj en el martes 20/10/2026.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Pedido = {
  identifier?: string;
  content: { title?: string | null; body?: string | null; data?: Record<string, unknown>; sound?: unknown };
  trigger: Record<string, unknown>;
};

const mockLista = new Map<string, Pedido & { identifier: string }>();
const mockEstado = { siguiente: 1, permiso: true };

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: mockEstado.permiso, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: mockEstado.permiso })),
  setNotificationChannelAsync: jest.fn(async () => null),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  scheduleNotificationAsync: jest.fn(async (p: Pedido) => {
    const identifier = p.identifier ?? `uuid-${String(mockEstado.siguiente++).padStart(3, '0')}`;
    mockLista.set(identifier, { ...p, identifier });
    return identifier;
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockLista.delete(id);
  }),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {
    mockLista.clear();
  }),
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockLista.values()]),
}));

import * as Notificaciones from 'expo-notifications';
import * as fs from 'fs';
import * as path from 'path';

import { ponerAlDiaLasAlarmas, olvidarUltimaPuestaAlDia, type DependenciasDePuestaAlDia } from '../../../alarmas/ponerAlDiaLasAlarmas';
import type { PreferenciaHabitoApi } from '../../types/habits.types';
import * as recordatorios from '../recordatoriosDeHabito';
import * as repeticiones from '../repeticiones';
import type { CombinacionDeAlarma } from '../utils/combinacionDeAlarma';
import { repeticionDe } from '../utils/repeticionesDeAlarma';

const USUARIO = 'u-1';
const ESCUELA = 'h-agua-de-la-escuela';
const DIPLOMADO = 'h-estudio-del-diplomado';
const REPITE: CombinacionDeAlarma = { sonido: true, vibracion: true, voz: false, repetir: true };
const MARTES_6AM = new Date(2026, 9, 20, 6, 0, 0, 0);

const preferencia = (habitId: string, titulo: string): PreferenciaHabitoApi => ({
  habitId, title: titulo, triggerTime: '07:00:00', limitTime: null, customized: true, reminderEnabled: true,
  reminderMinutesBefore: 0, pendingChange: null, alarm: { sound: true, vibration: true, voice: false, repeat: true },
});

const delHabito = (habitoId: string) => [...mockLista.keys()].filter(k => k.startsWith(`habito-${habitoId}-`));
const repeticionesDe = (habitoId: string) => delHabito(habitoId).filter(k => repeticionDe(k));

function ponerElReloj(ahora: Date) {
  jest.useFakeTimers({
    now: ahora,
    doNotFake: [
      'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate',
      'nextTick', 'queueMicrotask', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame',
      'requestIdleCallback', 'cancelIdleCallback', 'hrtime',
    ],
  });
}

/** Alarmas que NO son de hábitos: un evento, el recordatorio de las acciones, un aviso del Código Renaser y el repaso de los domingos. */
async function ponerLasQueNoSonDeHabitos() {
  const fecha = new Date(2026, 9, 21, 9, 0, 0, 0);
  for (const identifier of ['evento-e1-hora', 'acciones-diario', 'acciones-diario-d1', 'accion-r1-rep-20261021-5', 'renaser.radar.slot.d2.09']) {
    await Notificaciones.scheduleNotificationAsync({ identifier, content: { title: identifier }, trigger: { type: 'date', date: fecha } as never });
  }
}
const lasQueNoSonDeHabitos = ['evento-e1-hora', 'acciones-diario', 'acciones-diario-d1', 'accion-r1-rep-20261021-5', 'renaser.radar.slot.d2.09'];

beforeEach(async () => {
  mockLista.clear();
  mockEstado.siguiente = 1;
  mockEstado.permiso = true;
  await AsyncStorage.clear();
  olvidarUltimaPuestaAlDia();
  ponerElReloj(MARTES_6AM);
});
afterEach(() => {
  jest.useRealTimers();
});

async function conDosHabitos() {
  await recordatorios.programar(USUARIO, ESCUELA, 'Agua de la Escuela', '07:00', [0], { alarma: REPITE });
  await recordatorios.programar(USUARIO, DIPLOMADO, 'Estudio del Diplomado', '07:00', [0], { alarma: REPITE });
}

describe('FR-018: la puesta al día retira lo que el servidor ya no lista', () => {
  it('un hábito con alarma que ya no está en la lista se cancela ENTERO (alarma, repeticiones y notas); el que sigue queda intacto', async () => {
    await conDosHabitos();
    expect(delHabito(ESCUELA).length).toBeGreaterThan(14);
    const intactas = delHabito(DIPLOMADO).sort();

    // Tras el traslado, el servidor solo lista el hábito del Diplomado.
    const retirados = await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia(DIPLOMADO, 'Estudio del Diplomado')], {
      retirarLosQueYaNoEstan: true,
    });

    expect(retirados).toBe(1);
    expect(delHabito(ESCUELA)).toEqual([]);
    expect(repeticionesDe(ESCUELA)).toEqual([]);
    expect(delHabito(DIPLOMADO).sort()).toEqual(intactas);
    expect(await AsyncStorage.getItem(`renaser.habitos.recordatorio.${USUARIO}.${ESCUELA}`)).toBeNull();
    expect(await AsyncStorage.getItem(`renaser.habitos.antelaciones.${USUARIO}.${ESCUELA}`)).toBeNull();
    expect(await AsyncStorage.getItem(`renaser.habitos.recordatorio.${USUARIO}.${DIPLOMADO}`)).not.toBeNull();
  });

  it('el puente de un hábito cumplido hoy también se retira', async () => {
    await recordatorios.programar(USUARIO, ESCUELA, 'Agua de la Escuela', '06:30', [30, 0], { alarma: REPITE });
    ponerElReloj(new Date(2026, 9, 20, 6, 5, 0, 0));
    await repeticiones.alCumplirElHabito(USUARIO, ESCUELA, {
      ahora: new Date(2026, 9, 20, 6, 5, 0, 0),
      preferencias: async () => [{ ...preferencia(ESCUELA, 'Agua de la Escuela'), triggerTime: '06:30:00', reminderMinutesBefore: 30, reminderMinutesList: [30, 0] }],
    });
    expect(delHabito(ESCUELA).some(k => k.includes('-pte-'))).toBe(true);

    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [], { retirarLosQueYaNoEstan: true });

    expect(delHabito(ESCUELA)).toEqual([]);
  });

  it('una lista VACÍA legítima (la formación nueva todavía no tiene hábitos) retira todas las de hábitos', async () => {
    await conDosHabitos();
    const retirados = await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [], { retirarLosQueYaNoEstan: true });
    expect(retirados).toBe(2);
    expect([...mockLista.keys()].filter(k => k.startsWith('habito-'))).toEqual([]);
  });

  it('las alarmas que no son de hábitos (eventos, acciones, Código Renaser) no se tocan, ni con la lista vacía', async () => {
    await conDosHabitos();
    await ponerLasQueNoSonDeHabitos();
    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [], { retirarLosQueYaNoEstan: true });
    for (const id of lasQueNoSonDeHabitos) expect(mockLista.has(id)).toBe(true);
  });

  it('una repetición suelta (sin la clave de su alarma) de un hábito que ya no está también se retira', async () => {
    await Notificaciones.scheduleNotificationAsync({
      identifier: `habito-${ESCUELA}-rep-20261021-5`,
      content: { title: 'Agua de la Escuela', data: { route: `/habitos/${ESCUELA}` } },
      trigger: { type: 'date', date: new Date(2026, 9, 21, 7, 5, 0, 0) } as never,
    });
    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [], { retirarLosQueYaNoEstan: true });
    expect(repeticionesDe(ESCUELA)).toEqual([]);
  });

  it('SIN la opción (quien ajusta UN solo hábito, como al cumplirlo) no retira nada de los demás', async () => {
    await conDosHabitos();
    const antes = [...mockLista.keys()].sort();
    const tocados = await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia(DIPLOMADO, 'Estudio del Diplomado')]);
    expect(tocados).toBe(0);
    expect([...mockLista.keys()].sort()).toEqual(antes);
  });

  it('un hábito que sigue en la lista, aunque el servidor ya no pida aviso, se maneja como siempre (se cancela por reminderEnabled=false)', async () => {
    await conDosHabitos();
    await recordatorios.ajustarRecordatoriosAlServidor(
      USUARIO,
      [preferencia(ESCUELA, 'Agua de la Escuela'), { ...preferencia(DIPLOMADO, 'Estudio del Diplomado'), reminderEnabled: false }],
      { retirarLosQueYaNoEstan: true },
    );
    expect(delHabito(ESCUELA).length).toBeGreaterThan(0);
    expect(delHabito(DIPLOMADO)).toEqual([]);
  });
});

describe('FR-018: la puesta al día de la app lo pide, y solo con la lista leída bien', () => {
  const deps = (preferencias: DependenciasDePuestaAlDia['preferencias']): DependenciasDePuestaAlDia => ({
    rearmar: async () => 0,
    completarDiferidos: async () => 0,
    preferencias,
    armarQueFaltan: jest.fn(async () => 0),
    agregarRutas: async () => 0,
    confirmar: async () => 'confirmadas' as never,
  });

  it('si la lectura de las preferencias falla, no se llama a armar ni a retirar: no se borra nada por no saber', async () => {
    const d = deps(async () => {
      throw new Error('sin red');
    });
    await conDosHabitos();
    const antes = [...mockLista.keys()].sort();
    const resultado = await ponerAlDiaLasAlarmas(USUARIO, Date.now(), d);
    expect(d.armarQueFaltan).not.toHaveBeenCalled();
    expect(resultado?.armadas).toBeNull();
    expect([...mockLista.keys()].sort()).toEqual(antes);
  });

  it('la puesta al día por defecto pide retirar los que el servidor ya no lista; quien ajusta un hábito suelto, no', () => {
    const raiz = path.resolve(__dirname, '../../../..');
    const puesta = fs.readFileSync(path.join(raiz, 'features/alarmas/ponerAlDiaLasAlarmas.ts'), 'utf-8');
    expect(puesta).toContain('ajustarRecordatoriosAlServidor(userId, preferencias, { retirarLosQueYaNoEstan: true })');
    const cumplido = fs.readFileSync(path.join(raiz, 'features/habits/notificaciones/repeticiones.ts'), 'utf-8');
    expect(cumplido).toContain('ajustarRecordatoriosAlServidor(userId, [propia], { ahora })');
    expect(cumplido).not.toContain('retirarLosQueYaNoEstan');
  });
});
