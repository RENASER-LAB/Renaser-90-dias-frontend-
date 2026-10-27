/**
 * Issue #33 (2026-10-27): un hábito cumplido hoy no suena más en el resto del día, y mañana suena normal.
 *
 * ## El bug
 *
 * Despertar cumplido a las 06:00 y la alarma de las 06:30 sonaba igual; con avisos de 30, 10 min y a la hora, cumplir
 * tras el primero no apagaba los que faltaban. Las alarmas del hábito se repiten solas (`DAILY`, o `WEEKLY` por día) y
 * una alarma que se repite no deja saltar un día: cancelarla borra las de mañana. Lo único que se cancelaba al cumplir
 * eran las repeticiones +5/+10 (spec 009).
 *
 * ## El arreglo
 *
 * Al cumplir, si a hoy todavía le queda algún aviso, las alarmas que se repiten se reemplazan por un PUENTE de alarmas
 * de fecha que empieza mañana; la puesta al día que corre al abrir la app vuelve al esquema normal cuando el puente ya
 * no corresponde. Contra el código anterior estas pruebas fallan: después de cumplir seguían las alarmas `daily` /
 * `weekly` que iban a sonar hoy.
 *
 * La librería de mentira hace lo que la de verdad en Android: programar con un identificador existente lo reemplaza,
 * cancelar lo quita y la lista sale con la forma de `getAllScheduledNotificationsAsync` (`value` en las de fecha).
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
type Programada = Pedido & { identifier: string };

const mockLista = new Map<string, Programada>();
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
    const t = p.trigger;
    // Como la librería de verdad: una alarma de fecha vuelve con su instante en `value`.
    const trigger = t.type === 'date'
      ? { type: 'date', value: t.date instanceof Date ? t.date.getTime() : t.date, channelId: t.channelId }
      : { ...t };
    mockLista.set(identifier, { ...p, identifier, trigger });
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

import * as habitsApi from '../../api/habitsApi';

import { soltarAlarmasDeLaCuenta } from '../../../alarmas/alarmasDeLaCuenta';
import { cambiarSonidoDeLosHabitos } from '../../../alarmas/cambioDeSonido';
import { planDeRearmado, type AlarmaProgramada } from '../../../alarmas/rearmarAlarmas';
import type { DiaDelHabitoApi, PreferenciaHabitoApi } from '../../types/habits.types';
import { leerNotaDeCumplido, PREFIJO_DE_CUMPLIDOS } from '../cumplidoDeHoy';
import * as recordatorios from '../recordatoriosDeHabito';
import * as repeticiones from '../repeticiones';
import { avisarHabitoCumplido } from '../../eventos/habitoCumplido';
import { diasPropiosDe } from '../utils/alarmasPorDia';

const USUARIO = 'u-1';
const HABITO = 'h-despertar';
const OTRO = 'h-agua';
const TITULO = 'Despertar';
const NOMBRES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const fecha = (y: number, m: number, d: number, h = 0, mi = 0) => new Date(y, m - 1, d, h, mi, 0, 0);
const MARTES_5AM = fecha(2026, 10, 20, 5, 0);
const MARTES_6_05 = fecha(2026, 10, 20, 6, 5);

/** Solo se finge `Date` (los temporizadores siguen siendo los reales: las promesas de AsyncStorage no los usan). */
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

const SEMANA = (cambios: Record<number, Partial<DiaDelHabitoApi>> = {}): DiaDelHabitoApi[] =>
  NOMBRES.map((weekday, i) => ({
    weekday, triggerTime: '06:30:00', active: true, reminderEnabled: true, reminderMinutesList: [30, 10, 0],
    customTime: false, customReminder: false, customAlarm: false,
    alarm: { sound: true, vibration: true, voice: false, repeat: false },
    ...cambios[i + 1],
  }));

const preferencia = (p: Partial<PreferenciaHabitoApi> = {}): PreferenciaHabitoApi => ({
  habitId: HABITO,
  title: TITULO,
  triggerTime: '06:30:00',
  limitTime: null,
  customized: true,
  reminderEnabled: true,
  reminderMinutesBefore: 30,
  reminderMinutesList: [30, 10, 0],
  pendingChange: null,
  alarm: { sound: true, vibration: true, voice: false, repeat: false },
  ...p,
});

/** Lo que el servidor devuelve de las preferencias: una promesa que no sale a la red. */
const delServidor = (...p: PreferenciaHabitoApi[]) => async () => p;

/**
 * Las alarmas del hábito: las de identificador propio (`habito-{id}-…`) y las que la librería nombró con un UUID, que el
 * teléfono recuerda por hábito (los ids guardados). Hay que leer las dos: en el esquema diario solo la primera lleva el
 * identificador del push de respaldo.
 */
async function delHabito(habitoId = HABITO): Promise<Programada[]> {
  const guardados = (await recordatorios.recordatoriosPorHabito(USUARIO)).get(habitoId) ?? [];
  const propias = [...mockLista.values()].filter(a => a.identifier.startsWith(`habito-${habitoId}-`));
  return [...new Map([...propias, ...guardados.map(id => mockLista.get(id)).filter((a): a is Programada => !!a)]
    .map(a => [a.identifier, a])).values()];
}
const instante = (a: Programada) => a.trigger.value as number;
const tipo = (a: Programada) => a.trigger.type as string;
const programar = () => Notificaciones.scheduleNotificationAsync as unknown as jest.Mock;

/** `true` si alguna alarma del hábito sonaría hoy (martes 20) después de `desde`. */
async function algunaSuenaHoyDespuesDe(desde: Date, habitoId = HABITO): Promise<boolean> {
  const finDelDia = fecha(2026, 10, 21, 0, 0).getTime();
  return (await delHabito(habitoId)).some(a => {
    if (tipo(a) === 'daily') return true; // una diaria suena todos los días, hoy incluido, si su hora no pasó
    if (tipo(a) === 'weekly') return false;
    return instante(a) > desde.getTime() && instante(a) < finDelDia;
  });
}

beforeEach(async () => {
  mockLista.clear();
  mockEstado.siguiente = 1;
  mockEstado.permiso = true;
  programar().mockClear();
  await AsyncStorage.clear();
  ponerElReloj(MARTES_5AM);
});

afterEach(() => {
  jest.useRealTimers();
});

/** Programa Despertar a las 06:30 con los avisos de 30, 10 min y a la hora (06:00, 06:20 y 06:30), como en Training. */
async function programarDespertar(avisos = [30, 10, 0]): Promise<void> {
  await recordatorios.programar(USUARIO, HABITO, TITULO, '06:30', avisos, { dimension: 'CUERPO' });
}

describe('cumplir el hábito apaga el resto de hoy', () => {
  it('con avisos de 30, 10 y a la hora, cumplir tras el primero deja sin sonar el de 10 y el de la hora (esquema diario)', async () => {
    await programarDespertar();
    // Antes de cumplir: tres alarmas diarias, la de las 06:00 con la etiqueta del push de respaldo.
    expect((await delHabito()).map(tipo)).toEqual(['daily', 'daily', 'daily']);
    expect(mockLista.has('habito-h-despertar-inicio')).toBe(true);

    ponerElReloj(MARTES_6_05); // ya sonó el de las 06:00 y la persona cumple el hábito
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, { ahora: MARTES_6_05, preferencias: delServidor(preferencia()) });

    expect(await algunaSuenaHoyDespuesDe(MARTES_6_05)).toBe(false);
    // Sin ninguna que se repita, y las de mañana en adelante siguen: 3 avisos × 7 días.
    const alarmas = await delHabito();
    expect(alarmas).toHaveLength(21);
    expect(alarmas.every(a => tipo(a) === 'date')).toBe(true);
    expect(Math.min(...alarmas.map(instante))).toBe(fecha(2026, 10, 21, 6, 0).getTime());
    expect(Math.max(...alarmas.map(instante))).toBe(fecha(2026, 10, 27, 6, 30).getTime());
  });

  it('el primer aviso de mañana conserva `habito-{id}-inicio` (la etiqueta del push de respaldo) y el texto y la ruta de siempre', async () => {
    await programarDespertar();
    ponerElReloj(MARTES_6_05);
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, { ahora: MARTES_6_05, preferencias: delServidor(preferencia()) });
    const inicio = mockLista.get('habito-h-despertar-inicio')!;
    expect(tipo(inicio)).toBe('date');
    expect(instante(inicio)).toBe(fecha(2026, 10, 21, 6, 0).getTime());
    expect(inicio.content.title).toBe('En 30 min: Despertar');
    expect(inicio.content.body).toBe('Te toca a las 06:30.');
    expect(inicio.content.data?.route).toBe('/habitos/h-despertar');
    expect((inicio.trigger as { channelId: string }).channelId).toBe('recordatorios-habitos-vib');
    const dellaHora = mockLista.get('habito-h-despertar-pte-20261021-2')!;
    expect(dellaHora.content.title).toBe('Despertar');
    expect(instante(dellaHora)).toBe(fecha(2026, 10, 21, 6, 30).getTime());
  });

  it('el caso del dueño: Despertar cumplido a las 06:00 no suena a las 06:30 (aviso a la hora)', async () => {
    await programarDespertar([0]);
    ponerElReloj(fecha(2026, 10, 20, 6, 0));
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, {
      ahora: fecha(2026, 10, 20, 6, 0),
      preferencias: delServidor(preferencia({ reminderMinutesBefore: 0, reminderMinutesList: [0] })),
    });
    expect(await algunaSuenaHoyDespuesDe(fecha(2026, 10, 20, 6, 0))).toBe(false);
    expect(await delHabito()).toHaveLength(7);
    expect(Math.min(...(await delHabito()).map(instante))).toBe(fecha(2026, 10, 21, 6, 30).getTime());
  });

  it('por el aviso `habitoCumplido` de `completarRegistro` (con el hábito y la cuenta)', async () => {
    await programarDespertar();
    ponerElReloj(MARTES_6_05);
    // Las preferencias salen del servidor: acá se leen de un doble, como las lee la puesta al día.
    const leer = jest.spyOn(habitsApi, 'obtenerPreferencias').mockResolvedValue([preferencia()]);
    const dejarDeEscuchar = repeticiones.atenderAlCumplirUnHabito(USUARIO);
    try {
      avisarHabitoCumplido({ registroId: 'r-1', puntosOtorgados: 8, habitoId: HABITO, fecha: '2026-10-20' });
      await new Promise(resolver => setTimeout(resolver, 50));
    } finally {
      dejarDeEscuchar();
      leer.mockRestore();
    }
    expect((await leerNotaDeCumplido(USUARIO, HABITO))?.dia).toBe('20261020');
    expect(await algunaSuenaHoyDespuesDe(MARTES_6_05)).toBe(false);
    expect(await delHabito()).toHaveLength(21);
  });

  it('un cierre que no dice de qué hábito es no apaga nada', async () => {
    await programarDespertar();
    ponerElReloj(MARTES_6_05);
    const leer = jest.spyOn(habitsApi, 'obtenerPreferencias').mockResolvedValue([preferencia()]);
    const dejarDeEscuchar = repeticiones.atenderAlCumplirUnHabito(USUARIO);
    try {
      avisarHabitoCumplido({ registroId: 'r-1', puntosOtorgados: 8 });
      await new Promise(resolver => setTimeout(resolver, 50));
    } finally {
      dejarDeEscuchar();
      leer.mockRestore();
    }
    expect((await delHabito()).map(tipo)).toEqual(['daily', 'daily', 'daily']);
  });

  it('la Pastilla y la Clase diaria (que cierran por su propio endpoint) llaman a la función directamente', async () => {
    await programarDespertar();
    ponerElReloj(MARTES_6_05);
    // Es lo que hacen `handleEntregarPastilla` y `handleEnviarResumen` de Training al confirmar el servidor.
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, { ahora: MARTES_6_05, preferencias: delServidor(preferencia()) });
    expect(await algunaSuenaHoyDespuesDe(MARTES_6_05)).toBe(false);
  });

  it('esquema por día (alarmas semanales): también quedan sin sonar hoy, y cada día conserva el identificador del suyo', async () => {
    const semana = SEMANA({ 2: { customTime: true, triggerTime: '09:00:00' } });
    const dias = diasPropiosDe(semana)!;
    await recordatorios.programar(USUARIO, HABITO, TITULO, '06:30', [0], { dias });
    expect((await delHabito()).every(a => tipo(a) === 'weekly')).toBe(true);

    ponerElReloj(fecha(2026, 10, 20, 6, 0)); // el martes va a las 09:00: todavía le queda el aviso de la hora
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, {
      ahora: fecha(2026, 10, 20, 6, 0),
      preferencias: delServidor(preferencia({ reminderMinutesList: [0], reminderMinutesBefore: 0, weekdays: semana })),
    });
    const alarmas = await delHabito();
    expect(alarmas.every(a => tipo(a) === 'date')).toBe(true);
    expect(alarmas.map(a => a.identifier).sort()).toEqual([
      'habito-h-despertar-d1-0', 'habito-h-despertar-d2-0', 'habito-h-despertar-d3-0', 'habito-h-despertar-d4-0',
      'habito-h-despertar-d5-0', 'habito-h-despertar-d6-0', 'habito-h-despertar-d7-0',
    ]);
    // Nada hoy; el martes siguiente va a SU hora propia.
    expect(await algunaSuenaHoyDespuesDe(fecha(2026, 10, 20, 6, 0))).toBe(false);
    expect(instante(mockLista.get('habito-h-despertar-d2-0')!)).toBe(fecha(2026, 10, 27, 9, 0).getTime());
    expect(instante(mockLista.get('habito-h-despertar-d3-0')!)).toBe(fecha(2026, 10, 21, 6, 30).getTime());
  });

  it('con todos los avisos de hoy ya sonados no se gasta el puente: las alarmas quedan como estaban', async () => {
    await programarDespertar();
    ponerElReloj(fecha(2026, 10, 20, 6, 35));
    const antes = programar().mock.calls.length;
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, {
      ahora: fecha(2026, 10, 20, 6, 35), preferencias: delServidor(preferencia()),
    });
    expect(programar().mock.calls.length).toBe(antes);
    expect((await delHabito()).map(tipo)).toEqual(['daily', 'daily', 'daily']);
    // La nota sí quedó: si lo reprograman hoy, no suena.
    expect(await leerNotaDeCumplido(USUARIO, HABITO)).toEqual({ dia: '20261020', puenteDe: null });
  });

  it('un hábito sin alarmas en el teléfono no hace ningún pedido al servidor', async () => {
    const preferencias = jest.fn(async () => [preferencia()]);
    await repeticiones.alCumplirElHabito(USUARIO, OTRO, { ahora: MARTES_6_05, preferencias });
    expect(preferencias).not.toHaveBeenCalled();
    expect(mockLista.size).toBe(0);
    expect((await leerNotaDeCumplido(USUARIO, OTRO))?.dia).toBe('20261020');
  });

  it('Dormir cumplido pasada la medianoche es del día ANTERIOR: no apaga lo que le queda al de hoy', async () => {
    // «A dormir» a las 22:00, con avisos a las 21:30 y a la hora. Se cumple el miércoles a las 00:40: el registro es del martes.
    await recordatorios.programar(USUARIO, HABITO, 'Dormir', '22:00', [30, 0]);
    const dormir = preferencia({ title: 'Dormir', triggerTime: '22:00:00', reminderMinutesList: [30, 0] });
    const miercoles = fecha(2026, 10, 21, 0, 40);
    ponerElReloj(miercoles);
    const antes = programar().mock.calls.length;
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, {
      ahora: miercoles, fecha: '2026-10-20', preferencias: delServidor(dormir),
    });
    // Los avisos del martes ya sonaron todos: no hay nada que silenciar y el de las 21:30 de hoy sigue en pie.
    expect(programar().mock.calls.length).toBe(antes);
    expect((await delHabito()).map(tipo)).toEqual(['daily', 'daily']);
    // La nota es de ayer y no armó ningún puente: no sirve para nada y se limpia sola.
    expect(await leerNotaDeCumplido(USUARIO, HABITO)).toBeNull();
    // Reprogramarlo hoy (miércoles) es lo de siempre.
    await recordatorios.programar(USUARIO, HABITO, 'Dormir', '22:00', [30, 0]);
    expect((await delHabito()).map(tipo)).toEqual(['daily', 'daily']);
  });

  it('con el día del hábito igual al de hoy se apaga lo que queda (la fecha del registro manda)', async () => {
    await programarDespertar();
    ponerElReloj(MARTES_6_05);
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, {
      ahora: MARTES_6_05, fecha: '2026-10-20', preferencias: delServidor(preferencia()),
    });
    expect(await algunaSuenaHoyDespuesDe(MARTES_6_05)).toBe(false);
    expect(await delHabito()).toHaveLength(21);
  });

  it('cumplir un hábito no apaga los de los demás', async () => {
    await programarDespertar();
    await recordatorios.programar(USUARIO, OTRO, 'Agua', '12:00', [0]);
    ponerElReloj(MARTES_6_05);
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, { ahora: MARTES_6_05, preferencias: delServidor(preferencia()) });
    expect((await delHabito(OTRO)).map(tipo)).toEqual(['daily']);
  });

  it('cumplirlo dos veces (dos avisos seguidos) deja lo mismo y no vuelve a poner nada', async () => {
    await programarDespertar();
    ponerElReloj(MARTES_6_05);
    const opciones = { ahora: MARTES_6_05, preferencias: delServidor(preferencia()) };
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, opciones);
    const antes = programar().mock.calls.length;
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, opciones);
    expect(programar().mock.calls.length).toBe(antes);
    expect(await delHabito()).toHaveLength(21);
  });

  it('si el servidor no contesta las preferencias, la nota queda y la próxima puesta al día lo apaga', async () => {
    await programarDespertar();
    ponerElReloj(MARTES_6_05);
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, {
      ahora: MARTES_6_05,
      preferencias: async () => {
        throw new Error('sin red');
      },
    });
    expect((await delHabito()).map(tipo)).toEqual(['daily', 'daily', 'daily']);
    expect((await leerNotaDeCumplido(USUARIO, HABITO))?.puenteDe).toBeNull();
    // Se vuelve a abrir la app (o a primer plano) minutos después, con el servidor ya disponible.
    ponerElReloj(fecha(2026, 10, 20, 6, 10));
    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia()]);
    expect(await algunaSuenaHoyDespuesDe(fecha(2026, 10, 20, 6, 10))).toBe(false);
    expect(await delHabito()).toHaveLength(21);
  });
});

describe('mañana suena normal', () => {
  it('la puesta al día del día siguiente vuelve al esquema que se repite, con los mismos identificadores (sin duplicar)', async () => {
    await programarDespertar();
    ponerElReloj(MARTES_6_05);
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, { ahora: MARTES_6_05, preferencias: delServidor(preferencia()) });
    expect(await delHabito()).toHaveLength(21);

    ponerElReloj(fecha(2026, 10, 21, 5, 0)); // el miércoles temprano: la app se abre
    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia()]);
    const alarmas = await delHabito();
    expect(alarmas.map(tipo)).toEqual(['daily', 'daily', 'daily']);
    expect(alarmas.some(a => a.identifier.includes('-pte-'))).toBe(false);
    expect(mockLista.has('habito-h-despertar-inicio')).toBe(true);
    // La nota ya no marca puente, y se limpió al día siguiente o queda sin puente.
    const nota = await leerNotaDeCumplido(USUARIO, HABITO);
    expect(nota === null || nota.puenteDe === null).toBe(true);
  });

  it('el MISMO día, cuando ya sonaron todos los avisos, la puesta al día también vuelve al esquema normal', async () => {
    await programarDespertar();
    ponerElReloj(MARTES_6_05);
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, { ahora: MARTES_6_05, preferencias: delServidor(preferencia()) });
    ponerElReloj(fecha(2026, 10, 20, 14, 0));
    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia()]);
    expect((await delHabito()).map(tipo)).toEqual(['daily', 'daily', 'daily']);
  });

  it('el mismo día, con avisos todavía por venir, la puesta al día NO resucita los de hoy ni vuelve a tocar nada', async () => {
    await programarDespertar();
    ponerElReloj(MARTES_6_05);
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, { ahora: MARTES_6_05, preferencias: delServidor(preferencia()) });
    const antes = programar().mock.calls.length;
    ponerElReloj(fecha(2026, 10, 20, 6, 10));
    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia()]);
    expect(programar().mock.calls.length).toBe(antes); // no vuelve a cancelar y poner cada vez que se abre la app
    expect(await algunaSuenaHoyDespuesDe(fecha(2026, 10, 20, 6, 10))).toBe(false);
    expect(await delHabito()).toHaveLength(21);
  });

  it('esquema por día: el día siguiente vuelve a las semanales', async () => {
    const semana = SEMANA({ 2: { customTime: true, triggerTime: '09:00:00' } });
    const dias = diasPropiosDe(semana)!;
    const p = preferencia({ reminderMinutesList: [0], reminderMinutesBefore: 0, weekdays: semana });
    await recordatorios.programar(USUARIO, HABITO, TITULO, '06:30', [0], { dias });
    ponerElReloj(fecha(2026, 10, 20, 6, 0));
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, { ahora: fecha(2026, 10, 20, 6, 0), preferencias: delServidor(p) });
    expect((await delHabito()).every(a => tipo(a) === 'date')).toBe(true);
    ponerElReloj(fecha(2026, 10, 21, 5, 0));
    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [p]);
    expect((await delHabito()).every(a => tipo(a) === 'weekly')).toBe(true);
    expect(await delHabito()).toHaveLength(7);
  });

  it('después de varios días sin abrir la app, la primera apertura revierte el puente y lo deja como estaba', async () => {
    await programarDespertar();
    ponerElReloj(MARTES_6_05);
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, { ahora: MARTES_6_05, preferencias: delServidor(preferencia()) });
    ponerElReloj(fecha(2026, 10, 24, 8, 0)); // el sábado
    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia()]);
    expect((await delHabito()).map(tipo)).toEqual(['daily', 'daily', 'daily']);
  });
});

describe('reprogramar el hábito el mismo día en que ya se cumplió', () => {
  it('Plan mueve la hora (de 06:30 a 08:00): hoy sigue sin sonar y mañana suena a la hora nueva', async () => {
    await programarDespertar();
    ponerElReloj(MARTES_6_05);
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, { ahora: MARTES_6_05, preferencias: delServidor(preferencia()) });

    ponerElReloj(fecha(2026, 10, 20, 6, 10));
    const r = await recordatorios.reprogramarTrasCambioDeHora(USUARIO, HABITO, TITULO, '08:00');
    expect(r).toBe(true);
    expect(await algunaSuenaHoyDespuesDe(fecha(2026, 10, 20, 6, 10))).toBe(false);
    expect(Math.min(...(await delHabito()).map(instante))).toBe(fecha(2026, 10, 21, 7, 30).getTime());
    expect(mockLista.get('habito-h-despertar-inicio')?.content.body).toBe('Te toca a las 08:00.');
  });

  it('Training guarda el editor otra vez (`programar`) con el hábito ya cumplido: hoy tampoco suena', async () => {
    await programarDespertar();
    ponerElReloj(MARTES_6_05);
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, { ahora: MARTES_6_05, preferencias: delServidor(preferencia()) });
    ponerElReloj(fecha(2026, 10, 20, 6, 10));
    // La persona cambia los avisos a «a la hora» y el hábito a las 10:00: ni siquiera esa hora de hoy debe sonar.
    await recordatorios.programar(USUARIO, HABITO, TITULO, '10:00', [0], { dimension: 'CUERPO' });
    expect(await algunaSuenaHoyDespuesDe(fecha(2026, 10, 20, 6, 10))).toBe(false);
    expect(await delHabito()).toHaveLength(7);
    expect(Math.min(...(await delHabito()).map(instante))).toBe(fecha(2026, 10, 21, 10, 0).getTime());
  });

  it('reprogramarlo al día siguiente es lo de siempre', async () => {
    await programarDespertar();
    ponerElReloj(MARTES_6_05);
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, { ahora: MARTES_6_05, preferencias: delServidor(preferencia()) });
    ponerElReloj(fecha(2026, 10, 21, 5, 0));
    await recordatorios.programar(USUARIO, HABITO, TITULO, '06:30', [30, 10, 0]);
    expect((await delHabito()).map(tipo)).toEqual(['daily', 'daily', 'daily']);
  });

  it('apagar el aviso y volver a encenderlo el mismo día no hace sonar hoy', async () => {
    await programarDespertar();
    ponerElReloj(MARTES_6_05);
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, { ahora: MARTES_6_05, preferencias: delServidor(preferencia()) });
    await recordatorios.cancelar(USUARIO, HABITO);
    expect(mockLista.size).toBe(0);
    expect(await leerNotaDeCumplido(USUARIO, HABITO)).toEqual({ dia: '20261020', puenteDe: null });
    await recordatorios.programar(USUARIO, HABITO, TITULO, '06:30', [30, 10, 0]);
    expect(await algunaSuenaHoyDespuesDe(MARTES_6_05)).toBe(false);
    expect(await delHabito()).toHaveLength(21);
  });

  it('un cambio de hora que rige desde mañana (D-91) respeta el cumplido de hoy y la hora de cada día', async () => {
    const p = preferencia({
      reminderMinutesBefore: 0,
      reminderMinutesList: [0],
      pendingChange: { triggerTime: '10:00:00', effectiveDate: '2026-10-22' } as PreferenciaHabitoApi['pendingChange'],
    });
    await recordatorios.programarConCambioDiferido(USUARIO, HABITO, TITULO, { horaDeHoy: '06:30', horaNueva: '10:00', desde: '2026-10-22' }, [0]);
    ponerElReloj(fecha(2026, 10, 20, 6, 0));
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, { ahora: fecha(2026, 10, 20, 6, 0), preferencias: delServidor(p) });
    expect(await algunaSuenaHoyDespuesDe(fecha(2026, 10, 20, 6, 0))).toBe(false);
    const horas = (await delHabito()).map(instante).sort((a, b) => a - b);
    // Mañana todavía a la hora vieja; desde el jueves, a la nueva.
    expect(horas[0]).toBe(fecha(2026, 10, 21, 6, 30).getTime());
    expect(horas[1]).toBe(fecha(2026, 10, 22, 10, 0).getTime());
  });
});

describe('lo que ya existía sigue funcionando con el puente', () => {
  it('las repeticiones de hoy se cancelan y las de mañana siguen', async () => {
    await recordatorios.programar(USUARIO, HABITO, TITULO, '06:30', [0], {
      alarma: { sonido: true, vibracion: true, voz: false, repetir: true },
    });
    ponerElReloj(fecha(2026, 10, 20, 6, 0));
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, {
      ahora: fecha(2026, 10, 20, 6, 0),
      preferencias: delServidor(preferencia({
        reminderMinutesBefore: 0, reminderMinutesList: [0], alarm: { sound: true, vibration: true, voice: false, repeat: true },
      })),
    });
    const ids = (await delHabito()).map(a => a.identifier);
    expect(ids.filter(i => i.includes('-rep-20261020-'))).toEqual([]);
    expect(ids.filter(i => i.includes('-rep-20261021-'))).toHaveLength(2);
  });

  it('cambiar el sonido en Yo → Alarmas pasa también las alarmas del puente a su canal nuevo, con la misma hora', async () => {
    await programarDespertar();
    ponerElReloj(MARTES_6_05);
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, { ahora: MARTES_6_05, preferencias: delServidor(preferencia()) });
    const horasAntes = (await delHabito()).map(instante).sort((a, b) => a - b);
    await cambiarSonidoDeLosHabitos(USUARIO, 'campana');
    const alarmas = await delHabito();
    expect(alarmas).toHaveLength(21);
    expect(alarmas.every(a => tipo(a) === 'date')).toBe(true);
    expect(alarmas.map(instante).sort((a, b) => a - b)).toEqual(horasAntes);
    const canales = new Set(alarmas.map(a => (a.trigger as { channelId: string }).channelId));
    expect([...canales]).toEqual(['recordatorios-habitos-campana-vib']);
  });

  it('el rearmado de la spec 007 conserva las alarmas del puente (misma id, mismo texto, mismo canal)', async () => {
    await programarDespertar();
    ponerElReloj(MARTES_6_05);
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, { ahora: MARTES_6_05, preferencias: delServidor(preferencia()) });
    const plan = planDeRearmado([...mockLista.values()] as unknown as AlarmaProgramada[], MARTES_6_05.getTime());
    const ids = plan.map(p => p.identifier).filter(i => i.startsWith('habito-h-despertar-'));
    expect(ids.sort()).toEqual((await delHabito()).map(a => a.identifier).sort());
    const inicio = plan.find(p => p.identifier === 'habito-h-despertar-inicio')!;
    expect(inicio.content.title).toBe('En 30 min: Despertar');
    expect((inicio.trigger as { channelId: string }).channelId).toBe('recordatorios-habitos-vib');
  });

  it('dos hábitos cumplidos a la misma hora siguen juntos en un solo aviso (E-410)', async () => {
    await recordatorios.programar(USUARIO, HABITO, TITULO, '06:30', [0]);
    await recordatorios.programar(USUARIO, OTRO, 'Agua', '06:30', [0]);
    ponerElReloj(fecha(2026, 10, 20, 6, 0));
    const ahora = fecha(2026, 10, 20, 6, 0);
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, {
      ahora, preferencias: delServidor(preferencia({ reminderMinutesBefore: 0, reminderMinutesList: [0] })),
    });
    await repeticiones.alCumplirElHabito(USUARIO, OTRO, {
      ahora, preferencias: delServidor(preferencia({ habitId: OTRO, title: 'Agua', reminderMinutesBefore: 0, reminderMinutesList: [0] })),
    });
    const manana = [...mockLista.values()].filter(a => instante(a) === fecha(2026, 10, 21, 6, 30).getTime());
    expect(manana).toHaveLength(2);
    expect(manana.some(a => a.content.title === '2 hábitos a las 06:30')).toBe(true);
  });

  it('cerrar sesión borra el puente, sus alarmas y la nota de cumplido', async () => {
    await programarDespertar();
    ponerElReloj(MARTES_6_05);
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, { ahora: MARTES_6_05, preferencias: delServidor(preferencia()) });
    expect((await AsyncStorage.getAllKeys()).some(k => k.startsWith(PREFIJO_DE_CUMPLIDOS))).toBe(true);
    await soltarAlarmasDeLaCuenta();
    expect(mockLista.size).toBe(0);
    // Queda el aviso general que eligió la persona (`antelaciones`: es una preferencia suya, no de las alarmas).
    expect((await AsyncStorage.getAllKeys()).filter(k => k.startsWith('renaser.habitos.') && !k.startsWith('renaser.habitos.antelaciones.'))).toEqual([]);
  });

  it('el prefijo de la nota es el mismo que borra el cierre de sesión', () => {
    expect(PREFIJO_DE_CUMPLIDOS).toBe('renaser.habitos.cumplido.');
  });

  it('sin permiso de avisos, cumplir no arma nada ni pide el permiso', async () => {
    await programarDespertar();
    mockEstado.permiso = false;
    ponerElReloj(MARTES_6_05);
    const antes = programar().mock.calls.length;
    await repeticiones.alCumplirElHabito(USUARIO, HABITO, { ahora: MARTES_6_05, preferencias: delServidor(preferencia()) });
    expect(programar().mock.calls.length).toBe(antes);
  });
});
