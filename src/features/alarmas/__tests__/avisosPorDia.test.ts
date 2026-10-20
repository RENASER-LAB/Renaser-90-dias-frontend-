/**
 * Las alarmas por día de la semana (spec 008) frente al rearmado (spec 007) y al aviso agrupado (E-410).
 *
 * - **Rearmado**: `rearmarAlarmas` ya sabía de las semanales (el repaso de los domingos); acá se fija que también
 *   re-arma las de un hábito por día, con su identificador `habito-{id}-d{iso}-{n}`, y que respeta la del día de
 *   hoy recién vencida.
 * - **Agrupado**: dos semanales del MISMO día de la semana y la misma hora suenan como una sola que nombra a las
 *   dos; si una se va, la otra vuelve a su texto. Una semanal y una diaria a la misma hora NO se juntan (una
 *   diaria dice «2 hábitos» también los días en que la otra no suena): suenan por su lado, que es lo que pasaba
 *   antes de E-410 y no pierde ninguna.
 *
 * Contra el código anterior estas pruebas no se podían escribir: `programar` no ponía alarmas semanales.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Salida = {
  identifier: string;
  content: { title: string | null; body: string | null; data?: Record<string, unknown>; sound: string | null };
  trigger: Record<string, unknown>;
};

const mockLista = new Map<string, Salida>();
const mockEstado = { siguiente: 1 };

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationChannelAsync: jest.fn(async () => null),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  scheduleNotificationAsync: jest.fn(async (p: {
    identifier?: string;
    content: { title?: string | null; body?: string | null; data?: Record<string, unknown>; sound?: unknown };
    trigger: Record<string, unknown>;
  }) => {
    const identifier = p.identifier ?? `alarma-${String(mockEstado.siguiente++).padStart(3, '0')}`;
    mockLista.set(identifier, {
      identifier,
      content: {
        title: p.content.title ?? null,
        body: p.content.body ?? null,
        data: p.content.data,
        sound: p.content.sound === false ? null : typeof p.content.sound === 'string' ? 'custom' : 'default',
      },
      trigger: { ...p.trigger },
    });
    return identifier;
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockLista.delete(id);
  }),
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockLista.values()]),
}));

import * as recordatorios from '../../habits/notificaciones/recordatoriosDeHabito';
import type { DiaDelHabitoApi } from '../../habits/types/habits.types';
import { diasPropiosDe } from '../../habits/notificaciones/utils/alarmasPorDia';
import { CANAL_EN_SILENCIO } from '../avisosJuntos';
import { planDeRearmado, type AlarmaProgramada } from '../rearmarAlarmas';

const USUARIO = 'u-1';
const GYM = { id: 'h-gym', titulo: 'Gimnasio' };
const YOGA = { id: 'h-yoga', titulo: 'Yoga' };
const AGUA = { id: 'h-agua', titulo: 'Agua tibia' };
const NOMBRES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

function semana(cambios: Record<number, Partial<DiaDelHabitoApi>> = {}): DiaDelHabitoApi[] {
  return NOMBRES.map((weekday, i) => ({
    weekday, triggerTime: '07:00:00', active: true, reminderEnabled: true, reminderMinutesList: [10],
    customTime: false, customReminder: false, ...cambios[i + 1],
  }));
}
/** Un hábito distinto un día (el jueves a las 09:00, con el aviso general de 10 min): el resto, igual que el general. */
const CON_JUEVES_DISTINTO = diasPropiosDe(semana({ 4: { customTime: true, triggerTime: '09:00:00' } }));

const suena = (a: Salida) => a.trigger.channelId !== CANAL_EN_SILENCIO.id;
const delDia = (weekdayExpo: number, hora: number, minuto: number) =>
  [...mockLista.values()].filter(a => a.trigger.type === 'weekly' && a.trigger.weekday === weekdayExpo && a.trigger.hour === hora && a.trigger.minute === minuto);

beforeEach(async () => {
  mockLista.clear();
  mockEstado.siguiente = 1;
  await AsyncStorage.clear();
});

describe('rearmar las alarmas de un hábito por día (spec 007 + 008)', () => {
  // Sábado 24/10/2026, 10:00 hora del teléfono.
  const AHORA = new Date(2026, 9, 24, 10, 0, 0, 0).getTime();

  it('las semanales de un hábito por día se re-arman con el mismo identificador y el mismo disparador', async () => {
    await recordatorios.programar(USUARIO, GYM.id, GYM.titulo, '07:00', [10], { dias: CON_JUEVES_DISTINTO });
    const programadas = [...mockLista.values()] as unknown as AlarmaProgramada[];
    const plan = planDeRearmado(programadas, AHORA);
    // El sábado de hoy a las 06:50 ya pasó hace más de 2 h; el resto se re-arma tal cual.
    expect(plan.map(p => p.identifier).sort()).toEqual([
      'habito-h-gym-d1-0', 'habito-h-gym-d2-0', 'habito-h-gym-d3-0', 'habito-h-gym-d4-0', 'habito-h-gym-d5-0', 'habito-h-gym-d6-0', 'habito-h-gym-d7-0',
    ]);
    const jueves = plan.find(p => p.identifier === 'habito-h-gym-d4-0')!;
    expect(jueves.trigger).toEqual(expect.objectContaining({ type: 'weekly', weekday: 5, hour: 8, minute: 50 }));
    // Re-programar lo mismo REEMPLAZA: no hay duplicados.
    for (const pedido of plan) await (jest.requireMock('expo-notifications') as { scheduleNotificationAsync: (p: unknown) => Promise<string> }).scheduleNotificationAsync(pedido);
    expect(mockLista.size).toBe(7);
  });

  it('con alarmas exactas, una semanal de hoy que ya pasó hace más de 30 s se re-arma; la de hoy recién vencida (inexacta) no', async () => {
    await recordatorios.programar(USUARIO, GYM.id, GYM.titulo, '07:00', [10], { dias: CON_JUEVES_DISTINTO });
    const programadas = [...mockLista.values()] as unknown as AlarmaProgramada[];
    // Sábado 06:55 = 5 minutos después de la del sábado (06:50): inexacta, todavía puede estar por sonar.
    const justoDespues = new Date(2026, 9, 24, 6, 55, 0, 0).getTime();
    expect(planDeRearmado(programadas, justoDespues).map(p => p.identifier)).not.toContain('habito-h-gym-d6-0');
    // Con alarmas exactas (margen de 30 s), ya sonó o el teléfono la borró: se re-arma para el sábado que viene.
    expect(planDeRearmado(programadas, justoDespues, 30_000).map(p => p.identifier)).toContain('habito-h-gym-d6-0');
  });
});

describe('agrupar avisos que coinciden (E-410) con alarmas por día', () => {
  it('dos hábitos por día, el mismo día y la misma hora: suena uno que nombra a los dos', async () => {
    await recordatorios.programar(USUARIO, GYM.id, GYM.titulo, '07:00', [10], { dias: CON_JUEVES_DISTINTO });
    await recordatorios.programar(USUARIO, YOGA.id, YOGA.titulo, '07:00', [10], { dias: CON_JUEVES_DISTINTO });

    // De lunes a viernes menos el jueves, a las 06:50; el lunes es expo 2.
    const lunes = delDia(2, 6, 50);
    expect(lunes).toHaveLength(2);
    expect(lunes.filter(suena)).toHaveLength(1);
    const [lleva] = lunes.filter(suena);
    expect(lleva.content.title).toBe('2 hábitos a las 06:50');
    expect((lleva.content.body ?? '').split(' · ').sort()).toEqual(['En 10 min: Gimnasio', 'En 10 min: Yoga']);
    // El jueves (expo 5) también, a las 08:50 de los dos (09:00 con 10 min antes).
    expect(delDia(5, 8, 50).filter(suena)).toHaveLength(1);
  });

  it('si uno de los dos se va, el que queda solo vuelve a su texto', async () => {
    await recordatorios.programar(USUARIO, GYM.id, GYM.titulo, '07:00', [10], { dias: CON_JUEVES_DISTINTO });
    await recordatorios.programar(USUARIO, YOGA.id, YOGA.titulo, '07:00', [10], { dias: CON_JUEVES_DISTINTO });
    await recordatorios.cancelar(USUARIO, YOGA.id);
    const lunes = delDia(2, 6, 50);
    expect(lunes).toHaveLength(1);
    expect(lunes[0].content.title).toBe('En 10 min: Gimnasio');
    expect(suena(lunes[0])).toBe(true);
  });

  it('el mismo hábito en días distintos a la misma hora no se junta: son días distintos', async () => {
    await recordatorios.programar(USUARIO, GYM.id, GYM.titulo, '07:00', [10], { dias: CON_JUEVES_DISTINTO });
    for (const a of mockLista.values()) {
      expect(a.content.title).toBe('En 10 min: Gimnasio');
      expect(suena(a)).toBe(true);
    }
  });

  it('una semanal y una diaria a la misma hora no se juntan: suenan las dos por su lado, sin perder ninguna', async () => {
    await recordatorios.programar(USUARIO, GYM.id, GYM.titulo, '07:00', [10], { dias: CON_JUEVES_DISTINTO });
    await recordatorios.programar(USUARIO, AGUA.id, AGUA.titulo, '07:00', [10]); // diaria a las 06:50
    const diaria = mockLista.get('habito-h-agua-inicio')!;
    expect(diaria.trigger.type).toBe('daily');
    expect(diaria.content.title).toBe('En 10 min: Agua tibia');
    expect(suena(diaria)).toBe(true);
    const lunes = delDia(2, 6, 50)[0];
    expect(lunes.content.title).toBe('En 10 min: Gimnasio');
    expect(suena(lunes)).toBe(true);
  });
});
