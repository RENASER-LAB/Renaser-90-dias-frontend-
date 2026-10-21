/**
 * Las alarmas de las acciones de los objetivos, por día de la semana (spec 010, T004 y T005).
 *
 * - El recordatorio diario sigue siendo UNA alarma diaria mientras ningún día sea distinto, con el mismo
 *   comportamiento y el mismo guardado de siempre; con algún día distinto pasa a una alarma semanal por día.
 * - El aviso antes de cada acción son alarmas de fecha, como hoy, pero con las antelaciones del día de SU fecha.
 * - Los identificadores son estables: programar de nuevo reemplaza, no duplica.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Pedido = { identifier?: string; content: Record<string, unknown>; trigger: Record<string, unknown> };

const mockSistema = new Map<string, Pedido>();
const mockEstado = { siguienteId: 1, permiso: true };

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
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {
    mockSistema.clear();
  }),
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockSistema.entries()].map(([identifier, p]) => ({ ...p, identifier }))),
}));

import { weekdayDeExpo, type DiaIso } from '../../../habits/notificaciones/utils/alarmasPorDia';
import { soltarAlarmasDeLaCuenta } from '../../../alarmas/alarmasDeLaCuenta';
import type { RocaDiariaApi } from '../../types/objetivos.types';
import {
  alarmasDeseadas,
  cancelarRecordatorioDiario,
  cancelarTodasLasAlarmasDeAcciones,
  guardarPreferenciasDeAcciones,
  idsDeRecordatoriosDeAcciones,
  ponerElRecordatorioDiario,
  preferenciasDeAcciones,
  PREFERENCIAS_DE_ACCIONES_POR_DEFECTO,
  programarRecordatorioDiario,
  sincronizarAlarmasDeAcciones,
} from '../recordatoriosDeAcciones';
import { antelacionesDeLaFecha, type PreferenciasDeAcciones } from '../preferenciasPorDia';
import { identificadorDelDiarioDelDia, planDelRecordatorioDiario } from '../planDelDiario';

const USUARIO = 'u-1';
const LIMA = 'America/Lima';
/** 26/09 a las 03:00 UTC = 25/09 (viernes) a las 22:00 en Lima. */
const MADRUGADA_UTC = Date.UTC(2026, 8, 26, 3, 0);

const BASE: PreferenciasDeAcciones = { ...PREFERENCIAS_DE_ACCIONES_POR_DEFECTO, diarioActivo: true, horaDiaria: '07:00' };
/** Sábado y domingo a las 09:00; lunes a viernes a las 07:00. */
const FIN_DE_SEMANA_A_LAS_NUEVE: PreferenciasDeAcciones = {
  ...BASE,
  dias: { 6: { horaDiaria: '09:00' }, 7: { horaDiaria: '09:00' } },
};

function roca(parcial: Partial<RocaDiariaApi> & { id: string }): RocaDiariaApi {
  return {
    fecha: '2026-09-26',
    posicion: 1,
    titulo: 'Llamar a tres clientes',
    descripcion: null,
    color: 'VERDE',
    puntajeImpacto: 5,
    esDelegable: false,
    eje: 'TRABAJO',
    rocaSemanalId: null,
    horaInicio: '07:00:00',
    horaFin: null,
    completada: false,
    completadaEn: null,
    puntosOtorgados: 0,
    bloqueada: false,
    acciones: [],
    ...parcial,
  };
}

const programadas = () => [...mockSistema.entries()];
const triggerDe = (id: string) => mockSistema.get(id)!.trigger as { type: string; weekday?: number; hour?: number; minute?: number; date?: Date };

beforeEach(async () => {
  mockSistema.clear();
  mockEstado.siguienteId = 1;
  mockEstado.permiso = true;
  await AsyncStorage.clear();
});

describe('el recordatorio diario: qué alarmas hacen falta (puro)', () => {
  it('sin días distintos es UNA alarma diaria a la hora general, como hoy', () => {
    expect(planDelRecordatorioDiario(BASE)).toMatchObject({ esquema: 'diario', hora: '07:00' });
    // Un aviso propio de un día no vuelve distinto al recordatorio diario.
    expect(planDelRecordatorioDiario({ ...BASE, dias: { 6: { antelaciones: [30] } } })).toMatchObject({ esquema: 'diario' });
  });

  it('apagado en general y sin días que lo enciendan no hay ninguna', () => {
    expect(planDelRecordatorioDiario({ ...BASE, diarioActivo: false })).toEqual({ esquema: 'ninguno' });
  });

  it('con días distintos es una alarma SEMANAL por cada día encendido, a la hora de ese día', () => {
    const plan = planDelRecordatorioDiario(FIN_DE_SEMANA_A_LAS_NUEVE);
    if (plan.esquema !== 'porDia') throw new Error('se esperaba el esquema por día');
    expect(plan.pedidos).toHaveLength(7);
    const porDia = Object.fromEntries(plan.pedidos.map(p => [p.diaIso, p]));
    for (const iso of [1, 2, 3, 4, 5] as DiaIso[]) {
      expect(porDia[iso]).toMatchObject({ hora: 7, minuto: 0, weekday: weekdayDeExpo(iso), identificador: identificadorDelDiarioDelDia(iso) });
    }
    // En `expo-notifications` el domingo es 1 y el sábado 7.
    expect(porDia[6]).toMatchObject({ hora: 9, minuto: 0, weekday: 7 });
    expect(porDia[7]).toMatchObject({ hora: 9, minuto: 0, weekday: 1 });
  });

  it('un día apagado no tiene alarma', () => {
    const plan = planDelRecordatorioDiario({ ...BASE, dias: { 7: { diarioActivo: false } } });
    if (plan.esquema !== 'porDia') throw new Error('se esperaba el esquema por día');
    expect(plan.pedidos.map(p => p.diaIso)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('apagado en general pero encendido un día: solo ese día', () => {
    const plan = planDelRecordatorioDiario({ ...BASE, diarioActivo: false, dias: { 6: { diarioActivo: true, horaDiaria: '10:30' } } });
    if (plan.esquema !== 'porDia') throw new Error('se esperaba el esquema por día');
    expect(plan.pedidos.map(p => [p.diaIso, p.hora, p.minuto])).toEqual([[6, 10, 30]]);
  });

  it('los identificadores de cada día son estables', () => {
    expect(identificadorDelDiarioDelDia(1)).toBe('acciones-diario-d1');
    expect(identificadorDelDiarioDelDia(7)).toBe('acciones-diario-d7');
  });
});

describe('el recordatorio diario en el teléfono', () => {
  it('sin días distintos queda como siempre: una alarma DIARIA y su id guardado suelto', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, BASE);
    expect(await ponerElRecordatorioDiario(USUARIO)).toBe(true);
    expect(programadas()).toHaveLength(1);
    const [id, pedido] = programadas()[0];
    expect(pedido.trigger).toMatchObject({ type: 'daily', hour: 7, minute: 0 });
    // El mismo formato de guardado de siempre: el id solo, sin lista.
    expect(await AsyncStorage.getItem(`renaser.objetivos.recordatorios.diario.${USUARIO}`)).toBe(id);
  });

  it('marcar sábado y domingo a las 09:00: esos días suena a las 09:00 y los demás a las 07:00', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, FIN_DE_SEMANA_A_LAS_NUEVE);
    expect(await ponerElRecordatorioDiario(USUARIO)).toBe(true);
    expect(programadas()).toHaveLength(7);
    expect(programadas().every(([, p]) => p.trigger.type === 'weekly')).toBe(true);
    expect(triggerDe('acciones-diario-d6')).toMatchObject({ weekday: 7, hour: 9, minute: 0 });
    expect(triggerDe('acciones-diario-d7')).toMatchObject({ weekday: 1, hour: 9, minute: 0 });
    expect(triggerDe('acciones-diario-d1')).toMatchObject({ weekday: 2, hour: 7, minute: 0 });
    expect(triggerDe('acciones-diario-d5')).toMatchObject({ weekday: 6, hour: 7, minute: 0 });
    // El texto de siempre, en las siete.
    expect(new Set(programadas().map(([, p]) => p.content.body))).toEqual(new Set(['Revisa las acciones de tus objetivos de hoy.']));
  });

  it('programarlo de nuevo no duplica: reemplaza (mismos ids), y volver a «igual todos los días» deja UNA diaria', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, FIN_DE_SEMANA_A_LAS_NUEVE);
    await ponerElRecordatorioDiario(USUARIO);
    await ponerElRecordatorioDiario(USUARIO);
    expect(programadas()).toHaveLength(7);

    await guardarPreferenciasDeAcciones(USUARIO, BASE);
    await ponerElRecordatorioDiario(USUARIO);
    expect(programadas()).toHaveLength(1);
    expect(programadas()[0][1].trigger).toMatchObject({ type: 'daily', hour: 7 });
  });

  it('apagar un día quita solo su alarma', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, { ...BASE, dias: { 7: { diarioActivo: false } } });
    await ponerElRecordatorioDiario(USUARIO);
    expect(programadas()).toHaveLength(6);
    expect(mockSistema.has('acciones-diario-d7')).toBe(false);
  });

  it('todos los ids se pueden cancelar: «Recordarme» apagado quita las siete', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, FIN_DE_SEMANA_A_LAS_NUEVE);
    await ponerElRecordatorioDiario(USUARIO);
    expect((await idsDeRecordatoriosDeAcciones(USUARIO)).sort()).toEqual([1, 2, 3, 4, 5, 6, 7].map(i => `acciones-diario-d${i}`).sort());
    await cancelarRecordatorioDiario(USUARIO);
    expect(programadas()).toEqual([]);
    expect(await idsDeRecordatoriosDeAcciones(USUARIO)).toEqual([]);
  });

  it('`programarRecordatorioDiario(usuario, hora)` de antes sigue valiendo: la hora es la general', async () => {
    expect(await programarRecordatorioDiario(USUARIO, '07:45')).toBe(true);
    expect(programadas()).toHaveLength(1);
    expect(programadas()[0][1].trigger).toMatchObject({ type: 'daily', hour: 7, minute: 45 });
  });

  it('sin permiso devuelve false y no programa', async () => {
    mockEstado.permiso = false;
    await guardarPreferenciasDeAcciones(USUARIO, FIN_DE_SEMANA_A_LAS_NUEVE);
    expect(await ponerElRecordatorioDiario(USUARIO)).toBe(false);
    expect(programadas()).toEqual([]);
  });

  it('cerrar sesión borra todo: las siete alarmas y lo que el teléfono guardó de ellas', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, FIN_DE_SEMANA_A_LAS_NUEVE);
    await ponerElRecordatorioDiario(USUARIO);
    await sincronizarAlarmasDeAcciones(USUARIO, [roca({ id: 'r1' })], { ahoraMs: MADRUGADA_UTC, zona: LIMA });
    await soltarAlarmasDeLaCuenta();
    expect(programadas()).toEqual([]);
    expect(await idsDeRecordatoriosDeAcciones(USUARIO)).toEqual([]);
    // Las preferencias son de la persona y se quedan.
    expect((await preferenciasDeAcciones(USUARIO)).dias).toEqual(FIN_DE_SEMANA_A_LAS_NUEVE.dias);
  });
});

describe('el aviso antes de cada acción: las antelaciones del día de SU fecha', () => {
  const opciones = { ahoraMs: MADRUGADA_UTC, zona: LIMA };
  /** Lunes a viernes y domingo: 10 min. El sábado: 30 min. */
  const SABADO_30: PreferenciasDeAcciones = { ...PREFERENCIAS_DE_ACCIONES_POR_DEFECTO, antelaciones: [10], dias: { 6: { antelaciones: [30] } } };
  const delSabado = roca({ id: 'sab', fecha: '2026-09-26', horaInicio: '07:00:00' });
  const delDomingo = roca({ id: 'dom', fecha: '2026-09-27', horaInicio: '07:00:00' });

  it('el sábado avisa 30 min antes y el domingo 10 min antes', () => {
    const deseadas = alarmasDeseadas([delSabado, delDomingo], f => antelacionesDeLaFecha(SABADO_30, f), MADRUGADA_UTC, LIMA);
    expect(deseadas.map(d => [d.fecha, d.instanteMs])).toEqual([
      ['2026-09-26', Date.UTC(2026, 8, 26, 11, 30)], // 06:30 en Lima
      ['2026-09-27', Date.UTC(2026, 8, 27, 11, 50)], // 06:50 en Lima
    ]);
  });

  it('una lista fija de antelaciones sigue valiendo para todos los días (así se llamaba antes)', () => {
    const deseadas = alarmasDeseadas([delSabado, delDomingo], [10], MADRUGADA_UTC, LIMA);
    expect(deseadas.map(d => d.instanteMs)).toEqual([Date.UTC(2026, 8, 26, 11, 50), Date.UTC(2026, 8, 27, 11, 50)]);
  });

  it('un día «sin aviso» no tiene alarmas aunque la general sí', () => {
    const sinAvisoElSabado: PreferenciasDeAcciones = { ...SABADO_30, dias: { 6: { antelaciones: [] } } };
    const deseadas = alarmasDeseadas([delSabado, delDomingo], f => antelacionesDeLaFecha(sinAvisoElSabado, f), MADRUGADA_UTC, LIMA);
    expect(deseadas.map(d => d.fecha)).toEqual(['2026-09-27']);
  });

  it('en el teléfono: una alarma de FECHA por aviso, con las antelaciones del día, y repetir la sincronización no duplica', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, SABADO_30);
    await sincronizarAlarmasDeAcciones(USUARIO, [delSabado, delDomingo], opciones);
    await sincronizarAlarmasDeAcciones(USUARIO, [delSabado, delDomingo], opciones);
    const instantes = programadas().map(([, p]) => (p.trigger.date as Date).getTime()).sort();
    expect(instantes).toEqual([Date.UTC(2026, 8, 26, 11, 30), Date.UTC(2026, 8, 27, 11, 50)]);
    expect(programadas().every(([, p]) => p.trigger.type === 'date')).toBe(true);
  });

  it('cambiar el aviso de un día cambia solo las alarmas de ese día', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, SABADO_30);
    await sincronizarAlarmasDeAcciones(USUARIO, [delSabado, delDomingo], opciones);
    await cancelarTodasLasAlarmasDeAcciones(USUARIO);
    await guardarPreferenciasDeAcciones(USUARIO, { ...SABADO_30, dias: { 6: { antelaciones: [30, 0] } } });
    await sincronizarAlarmasDeAcciones(USUARIO, [delSabado, delDomingo], opciones);
    const instantes = programadas().map(([, p]) => (p.trigger.date as Date).getTime()).sort();
    expect(instantes).toEqual([
      Date.UTC(2026, 8, 26, 11, 30),
      Date.UTC(2026, 8, 26, 12, 0),
      Date.UTC(2026, 8, 27, 11, 50),
    ]);
  });

  it('lo que había antes (una sola antelación general, sin días) suena igual que antes', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, { ...PREFERENCIAS_DE_ACCIONES_POR_DEFECTO, antelaciones: [10] });
    await sincronizarAlarmasDeAcciones(USUARIO, [delSabado, delDomingo], opciones);
    expect(programadas().map(([, p]) => (p.trigger.date as Date).getTime()).sort()).toEqual([
      Date.UTC(2026, 8, 26, 11, 50),
      Date.UTC(2026, 8, 27, 11, 50),
    ]);
  });
});
