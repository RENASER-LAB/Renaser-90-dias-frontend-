/**
 * Los recordatorios de pago en el teléfono (spec 032): una alarma por cuota pendiente y aviso, su propio canal con vibración, tocar abre «Mi ingreso»,
 * una cuota que se pagó deja de recordarse en la siguiente lectura, y poner al día no toca lo que ya está bien.
 *
 * La librería de mentira hace lo que hace la de verdad en Android: programar con un id existente lo reemplaza, cancelar lo quita, y la lista sale con la
 * forma de `getAllScheduledNotificationsAsync` (misma que usa `avisosALaMismaHora.test.ts`).
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Salida = {
  identifier: string;
  content: { title: string | null; body: string | null; data?: Record<string, unknown> };
  trigger: Record<string, unknown>;
};

const mockLista = new Map<string, Salida>();
const mockCanales = new Map<string, { sound?: string | null; enableVibrate?: boolean; name?: string }>();
const mockPermiso = { dado: true, puedePreguntar: true, pedidos: 0 };

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: mockPermiso.dado, canAskAgain: mockPermiso.puedePreguntar })),
  requestPermissionsAsync: jest.fn(async () => {
    mockPermiso.pedidos += 1;
    return { granted: mockPermiso.dado };
  }),
  setNotificationChannelAsync: jest.fn(async (id: string, c: { sound?: string | null; enableVibrate?: boolean; name?: string }) => {
    mockCanales.set(id, c);
    return null;
  }),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  scheduleNotificationAsync: jest.fn(async (p: {
    identifier?: string;
    content: { title?: string | null; body?: string | null; data?: Record<string, unknown> };
    trigger: Record<string, unknown>;
  }) => {
    const identifier = p.identifier ?? 'sin-id';
    const t = p.trigger;
    mockLista.set(identifier, {
      identifier,
      content: { title: p.content.title ?? null, body: p.content.body ?? null, data: p.content.data },
      trigger: { type: 'date', value: t.date instanceof Date ? t.date.getTime() : t.date, channelId: t.channelId },
    });
    return identifier;
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockLista.delete(id);
  }),
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockLista.values()]),
}));

import * as Notificaciones from 'expo-notifications';

import type { CuotaDePago, PagosDeLaPersona } from '../api/pagosSchemas';
import { cancelarLosRecordatoriosDePago, CANAL_DE_PAGOS, ponerAlDiaLosRecordatoriosDePago, RUTA_DEL_AVISO_DE_PAGO } from '../notificaciones/alarmasDePagos';
import { PREFERENCIAS_DE_PAGOS_POR_DEFECTO } from '../notificaciones/preferenciasDePagos';

const AHORA = new Date(2026, 10, 3, 10, 0).getTime();
const a = (anio: number, mes: number, dia: number, h = 9) => new Date(anio, mes - 1, dia, h, 0).getTime();
const cuota = (id: string, venceEl: string, pagada = false): CuotaDePago => ({ id, venceEl, monto: 1000, pagada, marcadaEn: null, marcadaPor: null });
const pagos = (...cuotas: CuotaDePago[]): PagosDeLaPersona => ({
  modo: 'CON_CRONOGRAMA', moneda: 'USD', cuotas, confirmacion: { estado: 'SIN_CONFIRMAR', confirmadaEn: null, nombre: null },
});
const alarmasPuestas = () => [...mockLista.values()].sort((x, y) => Number(x.trigger.value) - Number(y.trigger.value));

beforeEach(async () => {
  mockLista.clear();
  mockCanales.clear();
  mockPermiso.dado = true;
  mockPermiso.puedePreguntar = true;
  mockPermiso.pedidos = 0;
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('poner las alarmas de pago', () => {
  it('programa una por cuota pendiente y aviso, con la ruta de «Mi ingreso» y su canal propio con vibración', async () => {
    const resultado = await ponerAlDiaLosRecordatoriosDePago('u1', pagos(cuota('a', '2026-11-15'), cuota('b', '2026-12-15')), { ahoraMs: AHORA });

    expect(resultado).toBe('puestas');
    expect(alarmasPuestas().map(x => x.trigger.value)).toEqual([a(2026, 11, 12), a(2026, 11, 15), a(2026, 12, 12), a(2026, 12, 15)]);
    for (const alarma of alarmasPuestas()) {
      expect(alarma.identifier).toMatch(/^pago-\d+$/);
      expect(alarma.content.data).toEqual({ route: RUTA_DEL_AVISO_DE_PAGO });
      expect(alarma.trigger.channelId).toBe('recordatorios-pagos-vib');
    }
    expect(RUTA_DEL_AVISO_DE_PAGO).toBe('/mi-ingreso');
    expect(CANAL_DE_PAGOS).toMatchObject({ id: 'recordatorios-pagos-vib', vibra: true });
  });

  it('el canal se crea con la vibración dicha de forma explícita (E-641) y el sonido del teléfono', async () => {
    const plataforma = jest.requireActual<typeof import('react-native')>('react-native').Platform as { OS: string };
    const antes = plataforma.OS;
    plataforma.OS = 'android';
    try {
      await ponerAlDiaLosRecordatoriosDePago('u1', pagos(cuota('a', '2026-11-15')), { ahoraMs: AHORA });
    } finally {
      plataforma.OS = antes;
    }
    expect(mockCanales.get('recordatorios-pagos-vib')).toMatchObject({ enableVibrate: true, name: 'Recordatorios de pago' });
    expect(mockCanales.get('recordatorios-pagos-vib')?.sound).toBeUndefined();
  });

  it('poner al día otra vez, sin cambios, no cancela ni vuelve a programar nada', async () => {
    const lectura = pagos(cuota('a', '2026-11-15'));
    await ponerAlDiaLosRecordatoriosDePago('u1', lectura, { ahoraMs: AHORA });
    jest.clearAllMocks();

    await ponerAlDiaLosRecordatoriosDePago('u1', lectura, { ahoraMs: AHORA });

    expect(Notificaciones.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(Notificaciones.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    expect(alarmasPuestas()).toHaveLength(2);
  });

  it('al marcarse pagada una cuota, sus alarmas se cancelan en la siguiente lectura y las de las demás se quedan', async () => {
    await ponerAlDiaLosRecordatoriosDePago('u1', pagos(cuota('a', '2026-11-15'), cuota('b', '2026-12-15')), { ahoraMs: AHORA });
    expect(alarmasPuestas()).toHaveLength(4);

    await ponerAlDiaLosRecordatoriosDePago('u1', pagos(cuota('a', '2026-11-15', true), cuota('b', '2026-12-15')), { ahoraMs: AHORA });

    expect(alarmasPuestas().map(x => x.trigger.value)).toEqual([a(2026, 12, 12), a(2026, 12, 15)]);
  });

  it('con todas las cuotas pagadas, o sin cronograma, o sin nada anotado, no queda ninguna', async () => {
    const pendientes = pagos(cuota('a', '2026-11-15'));
    await ponerAlDiaLosRecordatoriosDePago('u1', pendientes, { ahoraMs: AHORA });
    await ponerAlDiaLosRecordatoriosDePago('u1', pagos(cuota('a', '2026-11-15', true)), { ahoraMs: AHORA });
    expect(alarmasPuestas()).toEqual([]);

    await ponerAlDiaLosRecordatoriosDePago('u1', pendientes, { ahoraMs: AHORA });
    await ponerAlDiaLosRecordatoriosDePago('u1', { modo: 'SIN_CRONOGRAMA', moneda: null, cuotas: [], confirmacion: null }, { ahoraMs: AHORA });
    expect(alarmasPuestas()).toEqual([]);

    await ponerAlDiaLosRecordatoriosDePago('u1', pendientes, { ahoraMs: AHORA });
    await ponerAlDiaLosRecordatoriosDePago('u1', null, { ahoraMs: AHORA });
    expect(alarmasPuestas()).toEqual([]);
  });

  it('cambiar la fecha de una cuota (Administración la movió) mueve sus alarmas sin dejar las viejas', async () => {
    await ponerAlDiaLosRecordatoriosDePago('u1', pagos(cuota('a', '2026-11-15')), { ahoraMs: AHORA });
    await ponerAlDiaLosRecordatoriosDePago('u1', pagos(cuota('a', '2026-11-20')), { ahoraMs: AHORA });
    expect(alarmasPuestas().map(x => x.trigger.value)).toEqual([a(2026, 11, 17), a(2026, 11, 20)]);
  });

  it('apagar los recordatorios las quita todas; encender las vuelve a poner', async () => {
    const lectura = pagos(cuota('a', '2026-11-15'));
    await ponerAlDiaLosRecordatoriosDePago('u1', lectura, { ahoraMs: AHORA });
    await ponerAlDiaLosRecordatoriosDePago('u1', lectura, { ahoraMs: AHORA, preferencias: { ...PREFERENCIAS_DE_PAGOS_POR_DEFECTO, activos: false } });
    expect(alarmasPuestas()).toEqual([]);
    await ponerAlDiaLosRecordatoriosDePago('u1', lectura, { ahoraMs: AHORA, preferencias: PREFERENCIAS_DE_PAGOS_POR_DEFECTO });
    expect(alarmasPuestas()).toHaveLength(2);
  });

  it('una alarma que el teléfono olvidó se vuelve a poner', async () => {
    const lectura = pagos(cuota('a', '2026-11-15'));
    await ponerAlDiaLosRecordatoriosDePago('u1', lectura, { ahoraMs: AHORA });
    mockLista.clear();
    await ponerAlDiaLosRecordatoriosDePago('u1', lectura, { ahoraMs: AHORA });
    expect(alarmasPuestas()).toHaveLength(2);
  });

  it('sin permiso de avisos no programa nada y lo dice; al abrir la app no abre el diálogo del sistema, y con un toque de la persona sí', async () => {
    mockPermiso.dado = false;
    expect(await ponerAlDiaLosRecordatoriosDePago('u1', pagos(cuota('a', '2026-11-15')), { ahoraMs: AHORA })).toBe('sin_permiso');
    expect(mockPermiso.pedidos).toBe(0);
    expect(alarmasPuestas()).toEqual([]);

    expect(await ponerAlDiaLosRecordatoriosDePago('u1', pagos(cuota('a', '2026-11-15')), { ahoraMs: AHORA, pedirElPermiso: true })).toBe('sin_permiso');
    expect(mockPermiso.pedidos).toBe(1);
  });

  it('lo que no es de pagos no se toca', async () => {
    mockLista.set('habito-1-inicio', { identifier: 'habito-1-inicio', content: { title: 'x', body: 'y' }, trigger: { type: 'daily' } });
    await ponerAlDiaLosRecordatoriosDePago('u1', pagos(cuota('a', '2026-11-15')), { ahoraMs: AHORA });
    await ponerAlDiaLosRecordatoriosDePago('u1', null, { ahoraMs: AHORA });
    expect(mockLista.has('habito-1-inicio')).toBe(true);
  });
});

describe('cancelar todo', () => {
  it('quita todas las de pago de esta persona y deja lo demás', async () => {
    mockLista.set('evento-9', { identifier: 'evento-9', content: { title: 'x', body: 'y' }, trigger: { type: 'date' } });
    await ponerAlDiaLosRecordatoriosDePago('u1', pagos(cuota('a', '2026-11-15')), { ahoraMs: AHORA });
    expect(alarmasPuestas().filter(x => x.identifier.startsWith('pago-'))).toHaveLength(2);

    await cancelarLosRecordatoriosDePago('u1');

    expect([...mockLista.keys()]).toEqual(['evento-9']);
  });
});
