/**
 * Tres arreglos del recordatorio de hábitos (D-217 y D-218, 2026-09-28), probados contra la librería de
 * mentira. Las pruebas corren en `America/Lima` (jest.config.js) y varias fijan el reloj en la madrugada
 * UTC, que en Lima todavía es el día anterior (regla 02).
 *
 * Contra el código viejo fallan:
 * - el aviso no llevaba `data.route`, así que tocarlo no abría Training;
 * - `programarConCambioDiferido` no existía: la hoja movía la alarma DIARIA en el acto, y hoy sonaba a la
 *   hora nueva (que el servidor todavía no aplica) y no a la de hoy;
 * - `ajustarRecordatoriosAlServidor` no existía: en un teléfono nuevo el servidor decía «recordatorio
 *   activo» y el teléfono no tenía ninguna alarma («Jugo verde … tras reinstalar: 0»).
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Disparador =
  | { type: 'daily'; hour: number; minute: number; channelId: string }
  | { type: 'date'; date: Date; channelId: string };
type Programada = { id: string; content: { title: string; data?: { route?: string } }; trigger: Disparador };

const mockProgramadas: Programada[] = [];
const mockCanceladas: string[] = [];
const mockEstado = { siguienteId: 1, permiso: true };
const mockPedirPermiso = jest.fn(async () => ({ granted: true }));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: mockEstado.permiso, canAskAgain: true })),
  requestPermissionsAsync: (...a: unknown[]) => (mockPedirPermiso as (...x: unknown[]) => unknown)(...a),
  setNotificationChannelAsync: jest.fn(async () => null),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  scheduleNotificationAsync: jest.fn(async (pedido: Omit<Programada, 'id'>) => {
    const id = `alarma-${mockEstado.siguienteId++}`;
    mockProgramadas.push({ id, ...pedido });
    return id;
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockCanceladas.push(id);
  }),
}));

import * as recordatorios from '../recordatoriosDeHabito';
import type { PreferenciaHabitoApi } from '../../types/habits.types';

const USUARIO = 'u-1';
const JUGO = 'h-jugo';

/** `YYYY-MM-DD HH:mm` en la hora de Lima, para leer las pruebas sin hacer cuentas. */
function enLima(d: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

function resumen(): string[] {
  return mockProgramadas.map(p =>
    p.trigger.type === 'daily'
      ? `diaria ${String(p.trigger.hour).padStart(2, '0')}:${String(p.trigger.minute).padStart(2, '0')}`
      : `fecha ${enLima(p.trigger.date)}`,
  );
}

beforeEach(async () => {
  mockProgramadas.length = 0;
  mockCanceladas.length = 0;
  mockEstado.siguienteId = 1;
  mockEstado.permiso = true;
  mockPedirPermiso.mockClear();
  await AsyncStorage.clear();
});

describe('tocar el aviso abre el hábito (D-218)', () => {
  it('la alarma lleva la ruta del hábito con la categoría de su dimensión', async () => {
    await recordatorios.programar(USUARIO, JUGO, 'Jugo verde', '10:00', [0], { dimension: 'CUERPO' });
    expect(mockProgramadas[0].content.data?.route).toBe('/habitos/h-jugo?dimension=BODY');
  });

  it('sin dimensión conocida, la ruta lleva solo el hábito', async () => {
    await recordatorios.programar(USUARIO, JUGO, 'Jugo verde', '10:00', [0]);
    expect(mockProgramadas[0].content.data?.route).toBe('/habitos/h-jugo');
    expect(recordatorios.rutaDelAvisoDeHabito('h 1', 'ESPÍRITU')).toBe('/habitos/h%201?dimension=SPIRIT');
    expect(recordatorios.rutaDelAvisoDeHabito('h-1', 'VIDA Y NEGOCIO')).toBe('/habitos/h-1');
  });
});

describe('el cambio de hora que rige desde mañana (D-91) también en la alarma (D-217)', () => {
  it('a las 06:00 de Lima, 07:00 → 10:00 desde mañana: hoy suena a las 07:00 y la nueva recién mañana', async () => {
    const ahora = new Date('2026-09-28T11:00:00Z'); // 06:00 en Lima
    await recordatorios.programarConCambioDiferido(USUARIO, JUGO, 'Jugo verde',
      { horaDeHoy: '07:00', horaNueva: '10:00', desde: '2026-09-29' }, [0], { ahora, dimension: 'CUERPO' });
    // Ninguna diaria hoy: una diaria de las 10:00 programada a las 06:00 sonaría HOY a las 10:00.
    expect(resumen()).toEqual(['fecha 2026-09-28 07:00', 'fecha 2026-09-29 10:00']);
    expect(mockProgramadas.every(p => p.content.data?.route === '/habitos/h-jugo?dimension=BODY')).toBe(true);
  });

  it('madrugada UTC que en Lima es la noche anterior: 21:30 del 28, 20:00 → 07:00 desde el 29', async () => {
    const ahora = new Date('2026-09-29T02:30:00Z'); // 21:30 del 28 en Lima
    await recordatorios.programarConCambioDiferido(USUARIO, JUGO, 'Jugo verde',
      { horaDeHoy: '20:00', horaNueva: '07:00', desde: '2026-09-29' }, [0], { ahora });
    // La de hoy (20:00) ya pasó; la diaria de las 07:00 suena por primera vez el 29: se programa de una.
    expect(resumen()).toEqual(['diaria 07:00']);
  });

  it('madrugada UTC, 22:00 del 28 en Lima, 23:00 → 23:30 desde el 29: hoy a las 23:00, desde el 29 a las 23:30', async () => {
    const ahora = new Date('2026-09-29T03:00:00Z'); // 22:00 del 28 en Lima
    await recordatorios.programarConCambioDiferido(USUARIO, JUGO, 'Jugo verde',
      { horaDeHoy: '23:00', horaNueva: '23:30', desde: '2026-09-29' }, [0, 10], { ahora });
    expect(resumen()).toEqual([
      'fecha 2026-09-28 22:50',
      'fecha 2026-09-29 23:20',
      'fecha 2026-09-28 23:00',
      'fecha 2026-09-29 23:30',
    ]);

    // Esa misma noche la app se abre de nuevo: todavía no se puede convertir (sonaría hoy a las 23:30).
    expect(await recordatorios.completarCambiosDiferidos(USUARIO, new Date('2026-09-29T04:10:00Z'))).toBe(0);

    // Al otro día (05:00 del 29 en Lima): las de fecha pasan a ser la diaria, sin duplicar la del 29.
    mockProgramadas.length = 0;
    expect(await recordatorios.completarCambiosDiferidos(USUARIO, new Date('2026-09-29T10:00:00Z'))).toBe(2);
    expect(resumen()).toEqual(['diaria 23:20', 'diaria 23:30']);
    expect(mockCanceladas).toEqual(expect.arrayContaining(['alarma-2', 'alarma-4']));
    // Y ya no queda nada pendiente.
    expect(await recordatorios.completarCambiosDiferidos(USUARIO, new Date('2026-09-30T10:00:00Z'))).toBe(0);
  });

  it('cancelar el hábito quita también lo que esperaba su fecha', async () => {
    const ahora = new Date('2026-09-28T11:00:00Z');
    await recordatorios.programarConCambioDiferido(USUARIO, JUGO, 'Jugo verde',
      { horaDeHoy: '07:00', horaNueva: '10:00', desde: '2026-09-29' }, [0], { ahora });
    await recordatorios.cancelar(USUARIO, JUGO);
    expect(mockCanceladas).toEqual(['alarma-1', 'alarma-2']);
    mockProgramadas.length = 0;
    expect(await recordatorios.completarCambiosDiferidos(USUARIO, new Date('2026-09-30T11:00:00Z'))).toBe(0);
    expect(mockProgramadas).toHaveLength(0);
  });
});

describe('ponerse al día con el servidor (D-217)', () => {
  const preferencia = (p: Partial<PreferenciaHabitoApi> & { habitId: string }): PreferenciaHabitoApi => ({
    title: 'Jugo verde',
    triggerTime: '10:00:00',
    limitTime: null,
    customized: true,
    reminderEnabled: true,
    reminderMinutesBefore: 0,
    pendingChange: null,
    ...p,
  });

  it('el servidor dice recordatorio activo y el teléfono no tiene alarma: la arma', async () => {
    const armados = await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [
      preferencia({ habitId: JUGO, reminderMinutesBefore: 10 }),
    ], { dimensionDe: () => 'CUERPO' });
    expect(armados).toBe(1);
    expect(resumen()).toEqual(['diaria 09:50']);
    expect(mockProgramadas[0].content.data?.route).toBe('/habitos/h-jugo?dimension=BODY');
    expect(await recordatorios.antelacionesDe(USUARIO, JUGO)).toEqual([10]);
  });

  it('no toca el hábito que ya tiene alarma, ni el que tiene el recordatorio apagado o sin hora', async () => {
    await recordatorios.programar(USUARIO, JUGO, 'Jugo verde', '10:00', [0, 30]);
    mockProgramadas.length = 0;
    const armados = await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [
      // Sin conjunto en el servidor (antes de V81) y con el mismo aviso más temprano: se conservan los dos.
      preferencia({ habitId: JUGO, reminderMinutesBefore: 30 }),
      preferencia({ habitId: 'h-apagado', reminderEnabled: false }),
      preferencia({ habitId: 'h-sin-minutos', reminderMinutesBefore: null }),
      preferencia({ habitId: 'h-sin-hora', triggerTime: null }),
    ]);
    expect(armados).toBe(0);
    expect(mockProgramadas).toHaveLength(0);
  });

  it('sin permiso de avisos no arma nada y no lo pide: corre al abrir la app, no por un toque', async () => {
    mockEstado.permiso = false;
    const armados = await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia({ habitId: JUGO })]);
    expect(armados).toBe(0);
    expect(mockPedirPermiso).not.toHaveBeenCalled();
  });

  it('con un cambio pendiente, respeta su fecha', async () => {
    const armados = await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [
      preferencia({
        habitId: JUGO,
        triggerTime: '07:00:00',
        pendingChange: { triggerTime: '10:00:00', limitTime: null, effectiveDate: '2026-09-29' },
      }),
    ], { ahora: new Date('2026-09-28T11:00:00Z') });
    expect(armados).toBe(1);
    expect(resumen()).toEqual(['fecha 2026-09-28 07:00', 'fecha 2026-09-29 10:00']);
  });

  it('teléfono nuevo: reconstruye TODOS los avisos que el servidor guarda (V81), no solo uno', async () => {
    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [
      preferencia({ habitId: JUGO, reminderMinutesBefore: 30, reminderMinutesList: [30, 0] }),
    ]);
    expect(resumen()).toEqual(['diaria 09:30', 'diaria 10:00']);
  });

  it('apagado desde otro dispositivo: cancela la alarma de este teléfono', async () => {
    await recordatorios.programar(USUARIO, JUGO, 'Jugo verde', '10:00', [0]);
    const tocados = await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [
      preferencia({ habitId: JUGO, reminderEnabled: false, reminderMinutesBefore: null }),
    ]);
    expect(tocados).toBe(1);
    expect(mockCanceladas).toEqual(['alarma-1']);
    expect(await recordatorios.antelacionesDe(USUARIO, JUGO)).toEqual([]);
  });

  it('otra hora u otros avisos desde otro dispositivo: la ajusta', async () => {
    await recordatorios.programar(USUARIO, JUGO, 'Jugo verde', '10:00', [30, 0]);
    mockProgramadas.length = 0;
    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [
      preferencia({ habitId: JUGO, triggerTime: '11:00:00', reminderMinutesBefore: 30, reminderMinutesList: [30] }),
    ]);
    expect(resumen()).toEqual(['diaria 10:30']);
    expect(await recordatorios.antelacionesDe(USUARIO, JUGO)).toEqual([30]);
  });

  it('igual que el servidor: no reprograma nada', async () => {
    await recordatorios.programar(USUARIO, JUGO, 'Jugo verde', '10:00', [30, 0]);
    mockProgramadas.length = 0;
    const tocados = await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [
      preferencia({ habitId: JUGO, reminderMinutesBefore: 30, reminderMinutesList: [0, 30] }),
    ]);
    expect(tocados).toBe(0);
    expect(mockProgramadas).toHaveLength(0);
  });
});
