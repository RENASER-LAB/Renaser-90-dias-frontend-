/**
 * Las alarmas del teléfono por día de la semana, contra la librería de mentira (spec 008, E-640).
 *
 * **El bug.** `programar` ponía UNA alarma diaria a la hora GENERAL del hábito y se olvidaba de la hora propia
 * de cada día: si el jueves iba a las 09:00, el teléfono sonaba a las 07:00 igual. Contra el código anterior
 * estas pruebas fallan: todo salía `daily`, sin identificador por día.
 *
 * La librería de mentira hace lo que la de verdad en Android: programar con un identificador existente lo
 * REEMPLAZA, cancelar lo quita, y la lista sale con la forma de `getAllScheduledNotificationsAsync`.
 * Las pruebas corren en `America/Lima` (jest.config.js).
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
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
const mockPedidos: Pedido[] = [];
const mockCanceladas: string[] = [];
const mockEstado = { siguiente: 1, permiso: true };

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: mockEstado.permiso, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: mockEstado.permiso })),
  setNotificationChannelAsync: jest.fn(async () => null),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  scheduleNotificationAsync: jest.fn(async (p: Pedido) => {
    mockPedidos.push(p);
    const identifier = p.identifier ?? `uuid-${String(mockEstado.siguiente++).padStart(3, '0')}`;
    mockLista.set(identifier, { ...p, identifier });
    return identifier;
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockCanceladas.push(id);
    mockLista.delete(id);
  }),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {
    mockLista.clear();
  }),
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockLista.values()]),
}));

import * as recordatorios from '../recordatoriosDeHabito';
import { soltarAlarmasDeLaCuenta } from '../../../alarmas/alarmasDeLaCuenta';
import { canalDeAlarma, SONIDO_POR_DEFECTO } from '../../../alarmas/sonidoDeAlarma';
import type { DiaDelHabitoApi, PreferenciaHabitoApi } from '../../types/habits.types';
import { diasPropiosDe } from '../utils/alarmasPorDia';

const USUARIO = 'u-1';
const GYM = 'h-gym';
const TITULO = 'Gimnasio';
const NOMBRES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

/** Los siete días como los manda el servidor, sin nada propio, con los cambios que se pidan (clave: día ISO). */
function semana(cambios: Record<number, Partial<DiaDelHabitoApi>> = {}): DiaDelHabitoApi[] {
  return NOMBRES.map((weekday, i) => ({
    weekday,
    triggerTime: '07:00:00',
    active: true,
    reminderEnabled: true,
    reminderMinutesList: [10],
    customTime: false,
    customReminder: false,
    ...cambios[i + 1],
  }));
}

const JUEVES_A_LA_HORA = { 4: { customTime: true, triggerTime: '09:00:00', customReminder: true, reminderMinutesList: [0] } };

const dos = (n: unknown) => String(n).padStart(2, '0');

/** Lo programado, ordenado por identificador, legible: «habito-h-gym-d4-0 weekly expo5 09:00». */
function resumen(): string[] {
  return [...mockLista.values()]
    .map(a => {
      const t = a.trigger as { type: string; weekday?: number; hour?: number; minute?: number; date?: Date };
      if (t.type === 'weekly') return `${a.identifier} weekly expo${t.weekday} ${dos(t.hour)}:${dos(t.minute)}`;
      if (t.type === 'daily') return `${a.identifier} daily ${dos(t.hour)}:${dos(t.minute)}`;
      const d = new Date(t.date as Date);
      return `${a.identifier} date ${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
    })
    .sort();
}

const preferencia = (p: Partial<PreferenciaHabitoApi> = {}): PreferenciaHabitoApi => ({
  habitId: GYM,
  title: TITULO,
  triggerTime: '07:00:00',
  limitTime: null,
  customized: true,
  reminderEnabled: true,
  reminderMinutesBefore: 10,
  pendingChange: null,
  ...p,
});

beforeEach(async () => {
  mockLista.clear();
  mockPedidos.length = 0;
  mockCanceladas.length = 0;
  mockEstado.siguiente = 1;
  mockEstado.permiso = true;
  await AsyncStorage.clear();
});

describe('FR-008: la alarma suena a la hora de cada día', () => {
  it('el jueves a las 09:00 «a la hora» y el resto a las 07:00 con 10 min: el jueves suena una sola vez, a las 09:00', async () => {
    const ok = await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { dias: diasPropiosDe(semana(JUEVES_A_LA_HORA)) });
    expect(ok).toBe(true);
    expect(resumen()).toEqual([
      'habito-h-gym-d1-0 weekly expo2 06:50',
      'habito-h-gym-d2-0 weekly expo3 06:50',
      'habito-h-gym-d3-0 weekly expo4 06:50',
      'habito-h-gym-d4-0 weekly expo5 09:00',
      'habito-h-gym-d5-0 weekly expo6 06:50',
      'habito-h-gym-d6-0 weekly expo7 06:50',
      'habito-h-gym-d7-0 weekly expo1 06:50',
    ]);
  });

  it('cada alarma lleva el canal del hábito (voz Dora), la ruta de Training y la hora de SU día en el cuerpo', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], {
      dimension: 'CUERPO', dias: diasPropiosDe(semana(JUEVES_A_LA_HORA)),
    });
    const canal = canalDeAlarma('habitos', SONIDO_POR_DEFECTO, { id: GYM, titulo: TITULO });
    for (const a of mockLista.values()) {
      expect((a.trigger as { channelId: string }).channelId).toBe(canal.id);
      expect(a.content.data?.route).toBe('/habitos/h-gym?dimension=BODY');
    }
    expect(mockLista.get('habito-h-gym-d4-0')!.content).toMatchObject({ title: 'Gimnasio', body: 'Te toca a las 09:00.' });
    expect(mockLista.get('habito-h-gym-d2-0')!.content).toMatchObject({ title: 'En 10 min: Gimnasio', body: 'Te toca a las 07:00.' });
  });

  it('un día apagado y un día «sin aviso» no suenan', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], {
      dias: diasPropiosDe(semana({ 7: { active: false }, 6: { customReminder: true, reminderEnabled: false, reminderMinutesList: [] } })),
    });
    expect(resumen().map(l => l.split(' ')[0])).toEqual([
      'habito-h-gym-d1-0', 'habito-h-gym-d2-0', 'habito-h-gym-d3-0', 'habito-h-gym-d4-0', 'habito-h-gym-d5-0',
    ]);
  });

  it('con el aviso general apagado, solo suenan los días con aviso propio', async () => {
    const ok = await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [], {
      dias: diasPropiosDe(semana({ 6: { customReminder: true, reminderMinutesList: [30] } })),
    });
    expect(ok).toBe(true);
    expect(resumen()).toEqual(['habito-h-gym-d6-0 weekly expo7 06:30']);
  });

  it('el cruce de medianoche: 00:10 con 30 min antes suena a las 23:40 del día anterior', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '00:10', [30], {
      dias: diasPropiosDe(semana({ 7: { active: false } })),
    });
    // El jueves (4) suena el miércoles (expo 4) y sigue identificándose como del jueves.
    expect(resumen()).toContain('habito-h-gym-d4-0 weekly expo4 23:40');
  });

  it('sin permiso de avisos no programa nada y lo dice', async () => {
    mockEstado.permiso = false;
    const ok = await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { dias: diasPropiosDe(semana(JUEVES_A_LA_HORA)) });
    expect(ok).toBe(false);
    expect(mockLista.size).toBe(0);
  });
});

describe('FR-009: cambiar un día reprograma solo ese día, sin duplicar ni dejar viejas', () => {
  it('cambiar el aviso del sábado deja las alarmas de los demás días con los mismos identificadores', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { dias: diasPropiosDe(semana(JUEVES_A_LA_HORA)) });
    const antes = resumen();
    expect(antes).toHaveLength(7);

    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], {
      dias: diasPropiosDe(semana({ ...JUEVES_A_LA_HORA, 6: { customReminder: true, reminderMinutesList: [30] } })),
    });
    const despues = resumen();
    expect(despues).toHaveLength(7); // ni duplicadas ni viejas
    expect(despues.filter(l => !l.startsWith('habito-h-gym-d6-'))).toEqual(antes.filter(l => !l.startsWith('habito-h-gym-d6-')));
    expect(despues.find(l => l.startsWith('habito-h-gym-d6-'))).toBe('habito-h-gym-d6-0 weekly expo7 06:30');
  });

  it('pasar a dos avisos en un día suma una alarma de ese día (-1) y no deja ninguna vieja', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { dias: diasPropiosDe(semana(JUEVES_A_LA_HORA)) });
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], {
      dias: diasPropiosDe(semana({ 4: { customTime: true, triggerTime: '09:00:00', customReminder: true, reminderMinutesList: [30, 0] } })),
    });
    expect(resumen().filter(l => l.startsWith('habito-h-gym-d4-'))).toEqual([
      'habito-h-gym-d4-0 weekly expo5 08:30',
      'habito-h-gym-d4-1 weekly expo5 09:00',
    ]);
    expect(mockLista.size).toBe(8);
  });

  it('`recordatoriosPorHabito` guarda los identificadores nuevos y no los viejos', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { dias: diasPropiosDe(semana(JUEVES_A_LA_HORA)) });
    expect((await recordatorios.recordatoriosPorHabito(USUARIO)).get(GYM)?.slice().sort()).toEqual([
      'habito-h-gym-d1-0', 'habito-h-gym-d2-0', 'habito-h-gym-d3-0', 'habito-h-gym-d4-0',
      'habito-h-gym-d5-0', 'habito-h-gym-d6-0', 'habito-h-gym-d7-0',
    ]);
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { dias: diasPropiosDe(semana({ 7: { active: false } })) });
    expect((await recordatorios.recordatoriosPorHabito(USUARIO)).get(GYM)).toHaveLength(6);
    expect(mockLista.has('habito-h-gym-d7-0')).toBe(false);
  });

  it('quitar el último día distinto devuelve el hábito al esquema diario, con `habito-{id}-inicio`', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { dias: diasPropiosDe(semana(JUEVES_A_LA_HORA)) });
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { dias: diasPropiosDe(semana()) });
    expect(resumen()).toEqual(['habito-h-gym-inicio daily 06:50']);
  });
});

describe('el esquema diario no cambia', () => {
  it('sin días: una alarma diaria por antelación y `habito-{id}-inicio` en la más temprana, como hoy', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10, 30]);
    expect(resumen().map(l => l.replace(/uuid-\d+/, 'uuid'))).toEqual(['habito-h-gym-inicio daily 06:30', 'uuid daily 06:50']);
  });

  it('con todos los días iguales tampoco cambia', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { dias: diasPropiosDe(semana()) });
    expect(resumen()).toEqual(['habito-h-gym-inicio daily 06:50']);
  });
});

describe('cancelar y cerrar sesión', () => {
  it('`cancelar` quita también las alarmas semanales y lo que se recordaba de ellas', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { dias: diasPropiosDe(semana(JUEVES_A_LA_HORA)) });
    await recordatorios.cancelar(USUARIO, GYM);
    expect(mockLista.size).toBe(0);
    expect(mockCanceladas).toHaveLength(7);
    expect(await AsyncStorage.getAllKeys()).not.toEqual(expect.arrayContaining([expect.stringContaining('renaser.habitos.esquema.')]));
  });

  it('cerrar sesión (`soltarAlarmasDeLaCuenta`) cancela todo y borra lo recordado del esquema por día', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { dias: diasPropiosDe(semana(JUEVES_A_LA_HORA)) });
    expect((await AsyncStorage.getAllKeys()).some(k => k.startsWith('renaser.habitos.esquema.'))).toBe(true);
    await soltarAlarmasDeLaCuenta();
    expect(mockLista.size).toBe(0);
    // Quedan las preferencias (las antelaciones elegidas); no lo que solo existe mientras la alarma existe.
    const claves = await AsyncStorage.getAllKeys();
    for (const prefijo of ['recordatorio.', 'hora.', 'esquema.', 'diferido.']) {
      expect(claves.some(k => k.startsWith(`renaser.habitos.${prefijo}`))).toBe(false);
    }
  });
});

describe('quien cambia la hora general sin saber de días (Plan) no deshace los días', () => {
  it('con la hora general nueva, los días sin hora propia la siguen y el que tiene hora propia no se mueve', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { dias: diasPropiosDe(semana(JUEVES_A_LA_HORA)) });
    const ok = await recordatorios.reprogramarTrasCambioDeHora(USUARIO, GYM, TITULO, '08:00', 'CUERPO');
    expect(ok).toBe(true);
    const lineas = resumen();
    expect(lineas).toContain('habito-h-gym-d1-0 weekly expo2 07:50');
    expect(lineas).toContain('habito-h-gym-d4-0 weekly expo5 09:00');
    expect(lineas).toHaveLength(7);
  });

  it('un hábito sin días distintos sigue reprogramándose como siempre', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10]);
    await recordatorios.reprogramarTrasCambioDeHora(USUARIO, GYM, TITULO, '08:00');
    expect(resumen()).toEqual(['habito-h-gym-inicio daily 07:50']);
  });
});

describe('ponerse al día con el servidor (D-217) con los días de la lista', () => {
  it('teléfono nuevo: arma las alarmas de cada día con su hora y su aviso', async () => {
    const armados = await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [
      preferencia({ weekdays: semana(JUEVES_A_LA_HORA) }),
    ]);
    expect(armados).toBe(1);
    expect(resumen()).toContain('habito-h-gym-d4-0 weekly expo5 09:00');
    expect(resumen()).toHaveLength(7);
  });

  it('igual que lo ya programado: no toca la librería', async () => {
    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia({ weekdays: semana(JUEVES_A_LA_HORA) })]);
    mockPedidos.length = 0;
    mockCanceladas.length = 0;
    const armados = await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia({ weekdays: semana(JUEVES_A_LA_HORA) })]);
    expect(armados).toBe(0);
    expect(mockPedidos).toHaveLength(0);
    expect(mockCanceladas).toHaveLength(0);
  });

  it('un cambio hecho en otro dispositivo (el aviso del sábado) reprograma el hábito', async () => {
    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia({ weekdays: semana(JUEVES_A_LA_HORA) })]);
    const armados = await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [
      preferencia({ weekdays: semana({ ...JUEVES_A_LA_HORA, 6: { customReminder: true, reminderMinutesList: [30] } }) }),
    ]);
    expect(armados).toBe(1);
    expect(resumen()).toContain('habito-h-gym-d6-0 weekly expo7 06:30');
    expect(resumen()).toHaveLength(7);
  });

  it('el aviso general apagado pero un día con aviso propio: suena solo ese día y no se cancela', async () => {
    const armados = await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [
      preferencia({
        reminderEnabled: false,
        reminderMinutesBefore: null,
        weekdays: semana({ 6: { customReminder: true, reminderMinutesList: [30] } }).map(d => d.weekday === 'SATURDAY' ? d : { ...d, reminderEnabled: false, reminderMinutesList: [] }),
      }),
    ]);
    expect(armados).toBe(1);
    expect(resumen()).toEqual(['habito-h-gym-d6-0 weekly expo7 06:30']);
  });

  it('todos los días distintos quedaron sin aviso: cancela lo que hubiera', async () => {
    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia({ weekdays: semana(JUEVES_A_LA_HORA) })]);
    const todosApagados = semana().map(d => ({ ...d, active: false }));
    const tocados = await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia({ weekdays: todosApagados })]);
    expect(tocados).toBe(1);
    expect(mockLista.size).toBe(0);
  });

  it('un backend anterior no manda los días: esquema diario, como hoy', async () => {
    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia()]);
    expect(resumen()).toEqual(['habito-h-gym-inicio daily 06:50']);
  });

  it('venía por día y los días vuelven a ser iguales: se rehace como diaria aunque coincida el aviso', async () => {
    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia({ weekdays: semana(JUEVES_A_LA_HORA) })]);
    const tocados = await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia({ weekdays: semana() })]);
    expect(tocados).toBe(1);
    expect(resumen()).toEqual(['habito-h-gym-inicio daily 06:50']);
  });

  it('sin permiso de avisos no arma nada y no lo pide', async () => {
    mockEstado.permiso = false;
    const armados = await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia({ weekdays: semana(JUEVES_A_LA_HORA) })]);
    expect(armados).toBe(0);
    expect(mockLista.size).toBe(0);
  });

  it('un hábito sin hora general no tiene recordatorio, tampoco por día', async () => {
    const armados = await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [
      preferencia({ triggerTime: null, weekdays: semana(JUEVES_A_LA_HORA) }),
    ]);
    expect(armados).toBe(0);
    expect(mockLista.size).toBe(0);
  });
});

describe('el cambio de hora que rige desde mañana (D-91) con alarmas por día', () => {
  // Martes 20/10/2026, 06:00 en Lima.
  const ahora = new Date(2026, 9, 20, 6, 0, 0, 0);

  it('los días que siguen la hora general esperan su fecha con una alarma de fecha; el de hora propia sigue semanal', async () => {
    const ok = await recordatorios.programarConCambioDiferido(
      USUARIO, GYM, TITULO,
      { horaDeHoy: '07:00', horaNueva: '08:00', desde: '2026-10-21' },
      [0],
      { ahora, dias: diasPropiosDe(semana({ 4: { customTime: true, triggerTime: '09:00:00' } })) },
    );
    expect(ok).toBe(true);
    const lineas = resumen();
    expect(lineas).toContain('habito-h-gym-d2-0 date 2026-10-20 07:00'); // hoy, a la hora de hoy
    expect(lineas).toContain('habito-h-gym-d3-0 date 2026-10-21 08:00'); // desde mañana, la nueva
    expect(lineas).toContain('habito-h-gym-d4-0 weekly expo5 09:00'); // hora propia: no la toca el cambio general
    expect(lineas).toHaveLength(7);
  });

  it('al abrir la app con el cambio ya vigente, las de fecha pasan a ser semanales', async () => {
    await recordatorios.programarConCambioDiferido(
      USUARIO, GYM, TITULO,
      { horaDeHoy: '07:00', horaNueva: '08:00', desde: '2026-10-21' },
      [0],
      { ahora, dias: diasPropiosDe(semana({ 4: { customTime: true, triggerTime: '09:00:00' } })) },
    );
    // El servidor ya no tiene cambio pendiente y su hora general es la nueva.
    const tocados = await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [
      preferencia({ triggerTime: '08:00:00', reminderMinutesBefore: 0, weekdays: semana({ 4: { customTime: true, triggerTime: '09:00:00' } }).map(d => d.weekday === 'THURSDAY' ? d : { ...d, triggerTime: '08:00:00', reminderMinutesList: [0] }) }),
    ], { ahora: new Date(2026, 9, 21, 7, 0, 0, 0) });
    expect(tocados).toBe(1);
    expect(resumen().every(l => l.includes(' weekly '))).toBe(true);
    expect(resumen()).toContain('habito-h-gym-d3-0 weekly expo4 08:00');
  });
});
