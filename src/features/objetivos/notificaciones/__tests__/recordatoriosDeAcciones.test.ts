/**
 * Recordatorios de las acciones de los objetivos (decisión del dueño del 2026-09-26): el diario y el
 * aviso antes de cada acción con hora. Antes no existía ninguno: solo los hábitos tenían alarma.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Pedido = { identifier?: string; content: Record<string, unknown>; trigger: Record<string, unknown> };

/** El "sistema": lo programado, por id, como el store de la librería. */
const mockSistema = new Map<string, Pedido>();
const mockEstado = { siguienteId: 1, permiso: true };

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: mockEstado.permiso, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: mockEstado.permiso })),
  setNotificationChannelAsync: jest.fn(async () => null),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  scheduleNotificationAsync: jest.fn(async (pedido: Pedido) => {
    const id = pedido.identifier ?? `alarma-${mockEstado.siguienteId++}`;
    mockSistema.set(id, pedido);
    return id;
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockSistema.delete(id);
  }),
}));

import { guardarPreferenciasDeAlarmas } from '../../../alarmas/preferenciasDeAlarmas';
import { planDeRearmado, type AlarmaProgramada } from '../../../alarmas/rearmarAlarmas';
import type { RocaDiariaApi } from '../../types/objetivos.types';
import {
  alarmasDeseadas,
  cancelarRecordatorioDiario,
  cancelarTodasLasAlarmasDeAcciones,
  guardarPreferenciasDeAcciones,
  idsDeRecordatoriosDeAcciones,
  leerPreferenciasDeAcciones,
  planDeAlarmasDeAcciones,
  PREFERENCIAS_DE_ACCIONES_POR_DEFECTO,
  programarRecordatorioDiario,
  sincronizarAlarmasDeAcciones,
  TEXTO_DIARIO,
} from '../recordatoriosDeAcciones';

const USUARIO = 'u-1';
const LIMA = 'America/Lima';
const MIN = 60_000;

/**
 * 26/09 a las 03:00 UTC = 25/09 a las 22:00 en Lima: la madrugada UTC que cae en el día local
 * ANTERIOR (regla 02 del backend, E-91). Un fixture a las 10:00 UTC escondería el desfase.
 */
const MADRUGADA_UTC = Date.UTC(2026, 8, 26, 3, 0);

function roca(parcial: Partial<RocaDiariaApi> & { id: string }): RocaDiariaApi {
  return {
    fecha: '2026-09-26',
    posicion: 1,
    titulo: 'Llamar a tres clientes',
    descripcion: null,
    color: 'VERDE',
    puntajeImpacto: 5,
    esDelegable: false,
    eje: 'NEGOCIO' as RocaDiariaApi['eje'],
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

beforeEach(async () => {
  mockSistema.clear();
  mockEstado.siguienteId = 1;
  mockEstado.permiso = true;
  await AsyncStorage.clear();
});

describe('preferencias (en el teléfono)', () => {
  it('por defecto todo apagado: nadie recibe una alarma que no pidió', () => {
    expect(PREFERENCIAS_DE_ACCIONES_POR_DEFECTO).toMatchObject({ diarioActivo: false, antelaciones: [] });
  });

  it('lo guardado raro cae al valor por defecto, campo por campo', () => {
    expect(leerPreferenciasDeAcciones(null)).toEqual(PREFERENCIAS_DE_ACCIONES_POR_DEFECTO);
    expect(leerPreferenciasDeAcciones('{roto')).toEqual(PREFERENCIAS_DE_ACCIONES_POR_DEFECTO);
    expect(leerPreferenciasDeAcciones('{"diarioActivo":true,"horaDiaria":"25:99","antelaciones":[30,"x",30,-5,0]}')).toEqual({
      diarioActivo: true,
      horaDiaria: '08:00',
      antelaciones: [30, 0],
    });
  });
});

describe('la hora de cada acción, en la zona (Lima) aunque el reloj esté en la madrugada UTC', () => {
  it('07:00 del 26/09 en Lima es 12:00 UTC; con 30 y 0 min salen dos alarmas, la más temprana primero', () => {
    const deseadas = alarmasDeseadas([roca({ id: 'r1' })], [0, 30], MADRUGADA_UTC, LIMA);
    expect(deseadas.map(d => d.instanteMs)).toEqual([Date.UTC(2026, 8, 26, 11, 30), Date.UTC(2026, 8, 26, 12, 0)]);
    expect(deseadas[0]).toMatchObject({ titulo: 'En 30 min: Llamar a tres clientes', cuerpo: 'Te toca a las 07:00.' });
    expect(deseadas[1].titulo).toBe('Llamar a tres clientes');
  });

  it('una acción a las 22:30 de HOY en Lima (03:30 UTC del día siguiente) todavía no pasó', () => {
    const tarde = roca({ id: 'r2', fecha: '2026-09-25', horaInicio: '22:30:00' });
    expect(alarmasDeseadas([tarde], [0], MADRUGADA_UTC, LIMA).map(d => d.instanteMs)).toEqual([Date.UTC(2026, 8, 26, 3, 30)]);
    // Y 30 min antes (22:00 Lima) es justo ahora: ya pasó, no se programa.
    expect(alarmasDeseadas([tarde], [30], MADRUGADA_UTC, LIMA)).toEqual([]);
  });

  it('sin hora, cumplida o con la hora pasada: sin aviso por acción', () => {
    const rocas = [
      roca({ id: 'sin-hora', horaInicio: null }),
      roca({ id: 'cumplida', completada: true }),
      roca({ id: 'pasada', fecha: '2026-09-25', horaInicio: '08:00:00' }),
    ];
    expect(alarmasDeseadas(rocas, [30, 10, 0], MADRUGADA_UTC, LIMA)).toEqual([]);
  });

  it('una bloqueada (espera la VERDE de su eje) sí lleva aviso', () => {
    expect(alarmasDeseadas([roca({ id: 'r', bloqueada: true })], [0], MADRUGADA_UTC, LIMA)).toHaveLength(1);
  });
});

describe('plan de sincronización', () => {
  const g = (fecha: string, instanteMs: number) => ({ id: 'x', fecha, instanteMs });

  it('solo cancela lo que la lista puede desmentir: días que trae, o alarmas ya pasadas', () => {
    const plan = planDeAlarmasDeAcciones({
      guardadas: {
        'vieja|1': g('2026-09-26', Date.UTC(2026, 8, 26, 12)),
        'viernes|2': g('2026-10-02', Date.UTC(2026, 9, 2, 12)),
        'pasada|3': g('2026-09-20', Date.UTC(2026, 8, 20, 12)),
      },
      deseadas: [],
      fechas: new Set(['2026-09-26']),
      ahoraMs: MADRUGADA_UTC,
    });
    expect(plan.cancelar.sort()).toEqual(['pasada|3', 'vieja|1']);
  });
});

describe('sincronizar con el teléfono', () => {
  const opciones = { ahoraMs: MADRUGADA_UTC, zona: LIMA };

  it('programa una alarma de FECHA por aviso, por el canal de objetivos; repetir no duplica', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, { ...PREFERENCIAS_DE_ACCIONES_POR_DEFECTO, antelaciones: [10] });
    await sincronizarAlarmasDeAcciones(USUARIO, [roca({ id: 'r1' })], opciones);
    await sincronizarAlarmasDeAcciones(USUARIO, [roca({ id: 'r1' })], opciones);
    expect(programadas()).toHaveLength(1);
    const [, pedido] = programadas()[0];
    expect(pedido.trigger).toMatchObject({ type: 'date', channelId: 'recordatorios-objetivos' });
    expect((pedido.trigger.date as Date).getTime()).toBe(Date.UTC(2026, 8, 26, 11, 50));
  });

  it('dos sincronizaciones a la vez (Plan y el arranque) no dejan alarmas duplicadas', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, { ...PREFERENCIAS_DE_ACCIONES_POR_DEFECTO, antelaciones: [0] });
    await Promise.all([
      sincronizarAlarmasDeAcciones(USUARIO, [roca({ id: 'r1' })], opciones),
      sincronizarAlarmasDeAcciones(USUARIO, [roca({ id: 'r1' })], opciones),
    ]);
    expect(programadas()).toHaveLength(1);
    expect(await idsDeRecordatoriosDeAcciones(USUARIO)).toEqual([programadas()[0][0]]);
  });

  it('cumplir la acción, o moverla de hora, quita la alarma vieja', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, { ...PREFERENCIAS_DE_ACCIONES_POR_DEFECTO, antelaciones: [0] });
    await sincronizarAlarmasDeAcciones(USUARIO, [roca({ id: 'r1' })], opciones);
    await sincronizarAlarmasDeAcciones(USUARIO, [roca({ id: 'r1', horaInicio: '09:00:00' })], opciones);
    expect(programadas().map(([, p]) => (p.trigger.date as Date).getTime())).toEqual([Date.UTC(2026, 8, 26, 14)]);
    await sincronizarAlarmasDeAcciones(USUARIO, [roca({ id: 'r1', horaInicio: '09:00:00', completada: true })], opciones);
    expect(programadas()).toEqual([]);
  });

  it('con «Voz» sale por el canal de voz de objetivos, con su propia frase', async () => {
    await guardarPreferenciasDeAlarmas(USUARIO, { eventosActivas: true, sonido: 'voz' });
    await guardarPreferenciasDeAcciones(USUARIO, { ...PREFERENCIAS_DE_ACCIONES_POR_DEFECTO, antelaciones: [0] });
    await sincronizarAlarmasDeAcciones(USUARIO, [roca({ id: 'r1' })], opciones);
    const [, pedido] = programadas()[0];
    expect(pedido.content.sound).toBe('voz_objetivos.wav');
    expect(pedido.trigger.channelId).toBe('recordatorios-objetivos-voz');
  });

  it('sin permiso no programa nada (no lo pide: corre al abrir, no por un toque)', async () => {
    mockEstado.permiso = false;
    await guardarPreferenciasDeAcciones(USUARIO, { ...PREFERENCIAS_DE_ACCIONES_POR_DEFECTO, antelaciones: [0] });
    await sincronizarAlarmasDeAcciones(USUARIO, [roca({ id: 'r1' })], opciones);
    expect(programadas()).toEqual([]);
  });

  it('apagar el aviso quita todas', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, { ...PREFERENCIAS_DE_ACCIONES_POR_DEFECTO, antelaciones: [30, 0] });
    await sincronizarAlarmasDeAcciones(USUARIO, [roca({ id: 'r1' }), roca({ id: 'r2', horaInicio: '10:00:00' })], opciones);
    expect(programadas()).toHaveLength(4);
    await cancelarTodasLasAlarmasDeAcciones(USUARIO);
    expect(programadas()).toEqual([]);
    expect(await idsDeRecordatoriosDeAcciones(USUARIO)).toEqual([]);
  });
});

describe('«Recordarme mis acciones del día»', () => {
  it('una alarma DIARIA a la hora elegida con texto fijo; programarla dos veces deja una', async () => {
    expect(await programarRecordatorioDiario(USUARIO, '07:45')).toBe(true);
    expect(await programarRecordatorioDiario(USUARIO, '08:15')).toBe(true);
    expect(programadas()).toHaveLength(1);
    const [id, pedido] = programadas()[0];
    expect(pedido.trigger).toMatchObject({ type: 'daily', hour: 8, minute: 15, channelId: 'recordatorios-objetivos' });
    expect(pedido.content).toMatchObject({ title: TEXTO_DIARIO.titulo, body: 'Revisa las acciones de tus objetivos de hoy.' });
    expect(await idsDeRecordatoriosDeAcciones(USUARIO)).toEqual([id]);
  });

  it('apagarlo la quita, y apagarlo de nuevo no rompe nada', async () => {
    await programarRecordatorioDiario(USUARIO, '07:45');
    await cancelarRecordatorioDiario(USUARIO);
    await cancelarRecordatorioDiario(USUARIO);
    expect(programadas()).toEqual([]);
  });

  it('sin permiso o con una hora inválida devuelve false y no programa', async () => {
    expect(await programarRecordatorioDiario(USUARIO, '7:5')).toBe(false);
    mockEstado.permiso = false;
    expect(await programarRecordatorioDiario(USUARIO, '07:45')).toBe(false);
    expect(programadas()).toEqual([]);
  });
});

describe('el rearmado (permiso de alarmas exactas) cubre estas alarmas', () => {
  it('la diaria y la de fecha se vuelven a armar tal cual, con su canal', async () => {
    const ahora = Date.now();
    const lista: AlarmaProgramada[] = [
      {
        identifier: 'diario',
        content: { title: TEXTO_DIARIO.titulo, body: TEXTO_DIARIO.cuerpo, sound: 'custom' },
        trigger: { type: 'daily', hour: (new Date(ahora).getHours() + 12) % 24, minute: 0, channelId: 'recordatorios-objetivos-voz' },
      },
      {
        identifier: 'accion',
        content: { title: 'Llamar', body: 'Te toca a las 07:00.', sound: 'default' },
        trigger: { type: 'date', value: ahora + 60 * MIN, channelId: 'recordatorios-objetivos' },
      },
    ];
    const plan = planDeRearmado(lista, ahora);
    expect(plan.map(p => p.identifier)).toEqual(['diario', 'accion']);
    expect(plan[0].content.sound).toBe('voz_objetivos.wav');
    expect(plan[1].trigger).toMatchObject({ type: 'date', channelId: 'recordatorios-objetivos' });
  });
});
