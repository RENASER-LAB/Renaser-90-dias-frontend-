/**
 * Sellar una acción corta sus repeticiones («Repetir si no la atiendo», spec 010, SC-002): cumplir la acción es atenderla,
 * así que la alarma que vuelve a sonar a los 5 y a los 10 minutos deja de sonar en el mismo momento, sin esperar a que la
 * app lea la lista. Pasan por `sellarRocaDiaria` todos los cierres de una acción (Training, el registro con foto, SER).
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Pedido = { identifier?: string; content: Record<string, unknown>; trigger: Record<string, unknown> };
const mockLista = new Map<string, Pedido & { identifier: string }>();
// Un contador y no `mockLista.size + 1`: con alarmas canceladas de por medio el tamaño baja y el identificador se repetiría.
let mockSiguiente = 1;

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationChannelAsync: jest.fn(async () => null),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  scheduleNotificationAsync: jest.fn(async (p: Pedido) => {
    const identifier = p.identifier ?? `uuid-${mockSiguiente++}`;
    mockLista.set(identifier, { ...p, identifier });
    return identifier;
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockLista.delete(id);
  }),
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockLista.values()].map(a => {
    const t = a.trigger as { type?: string; date?: Date; channelId?: string };
    return t.type === 'date' && t.date instanceof Date ? { ...a, trigger: { type: 'date', value: t.date.getTime(), channelId: t.channelId } } : a;
  })),
}));

const mockRegistrar = jest.fn<(id: string) => Promise<{ puntosOtorgados: number }>>(async () => ({ puntosOtorgados: 8 }));
jest.mock('../../api/objetivosApi', () => ({
  registrarEvidenciaRoca: (id: string) => mockRegistrar(id),
  solicitarUrlSubidaEvidenciaRoca: jest.fn(),
}));
jest.mock('../../../habits/api/evidenciaHabitoApi', () => ({
  ALMACENAMIENTO_SIN_CONFIGURAR: 'x',
  almacenamientoSinConfigurar: () => false,
  subirArchivoAS3: jest.fn(),
}));

import {
  guardarPreferenciasDeAcciones,
  ponerElRecordatorioDiario,
  sincronizarAlarmasDeAcciones,
} from '../../notificaciones/recordatoriosDeAcciones';
import type { RocaDiariaApi } from '../../types/objetivos.types';
import { sellarRocaDiaria } from '../sellarRocaDiaria';

const USUARIO = 'u-1';
const MADRUGADA_UTC = Date.UTC(2026, 8, 26, 3, 0);
const SABADO: RocaDiariaApi = {
  id: 'sab', fecha: '2026-09-26', posicion: 1, titulo: 'Llamar', descripcion: null, color: 'VERDE', puntajeImpacto: 5,
  esDelegable: false, eje: 'TRABAJO', rocaSemanalId: null, horaInicio: '07:00:00', horaFin: null, completada: false,
  completadaEn: null, puntosOtorgados: 0, bloqueada: false, acciones: [],
};
const repeticiones = () => [...mockLista.keys()].filter(id => id.includes('-rep-')).sort();
/** Los avisos «antes de la acción» de una acción (no sus repeticiones ni el recordatorio diario), por título. */
const avisosDe = (titulo: string) => [...mockLista.values()]
  .filter(a => !a.identifier.includes('-rep-') && (a.content.title === titulo || a.content.title === `En 30 min: ${titulo}`));
const OTRA: RocaDiariaApi = { ...SABADO, id: 'otra', titulo: 'Escribir', horaInicio: '09:00:00' };

beforeEach(async () => {
  mockLista.clear();
  mockSiguiente = 1;
  mockRegistrar.mockClear();
  await AsyncStorage.clear();
  jest.replaceProperty(Platform, 'OS', 'android');
});

describe('sellar una acción', () => {
  it('sus repeticiones dejan de sonar ya, y la lectura de la lista de después no las vuelve a poner', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, {
      diarioActivo: false, horaDiaria: '08:00', antelaciones: [0], alarma: { sonido: true, vibracion: true, voz: false, repetir: true },
    });
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], { ahoraMs: MADRUGADA_UTC, zona: 'America/Lima' });
    expect(repeticiones()).toEqual(['accion-sab-rep-20260926-10', 'accion-sab-rep-20260926-5']);

    // Sellar con texto: llega el servidor y devuelve los puntos de siempre.
    expect(await sellarRocaDiaria('sab', { archivo: null, texto: 'Lo hice' })).toBe(8);
    expect(repeticiones()).toEqual([]);

    // La lista todavía la trae sin cumplir (Plan no la releyó): igual no se resucitan.
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], { ahoraMs: MADRUGADA_UTC, zona: 'America/Lima' });
    expect(repeticiones()).toEqual([]);
  });

  it('si el servidor rechaza el sello, las repeticiones siguen (la acción no se cumplió)', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, {
      diarioActivo: false, horaDiaria: '08:00', antelaciones: [0], alarma: { sonido: true, vibracion: true, voz: false, repetir: true },
    });
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], { ahoraMs: MADRUGADA_UTC, zona: 'America/Lima' });
    mockRegistrar.mockRejectedValueOnce(new Error('409'));
    await expect(sellarRocaDiaria('sab', { archivo: null, texto: 'Lo hice' })).rejects.toThrow('409');
    expect(repeticiones()).toHaveLength(2);
  });

  it('issue #33: su aviso «antes de la acción» que todavía no sonó también se cancela, y la lista vieja no lo resucita', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, {
      diarioActivo: false, horaDiaria: '08:00', antelaciones: [30, 0], alarma: { sonido: true, vibracion: true, voz: false, repetir: false },
    });
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO, OTRA], { ahoraMs: MADRUGADA_UTC, zona: 'America/Lima' });
    expect(avisosDe('Llamar')).toHaveLength(2); // 06:30 y 07:00
    expect(avisosDe('Escribir')).toHaveLength(2);

    await sellarRocaDiaria('sab', { archivo: null, texto: 'Lo hice' });
    expect(avisosDe('Llamar')).toEqual([]);
    // La de otra acción sigue en pie.
    expect(avisosDe('Escribir')).toHaveLength(2);

    // La lista todavía la trae sin cumplir (Plan no la releyó): el aviso no vuelve.
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO, OTRA], { ahoraMs: MADRUGADA_UTC, zona: 'America/Lima' });
    expect(avisosDe('Llamar')).toEqual([]);
    expect(avisosDe('Escribir')).toHaveLength(2);

    // La lectura que ya la trae cumplida deja todo limpio, y una acción nueva con el mismo título sí vuelve a avisar.
    await sincronizarAlarmasDeAcciones(USUARIO, [{ ...SABADO, completada: true }, OTRA], { ahoraMs: MADRUGADA_UTC, zona: 'America/Lima' });
    expect(avisosDe('Llamar')).toEqual([]);
    await sincronizarAlarmasDeAcciones(USUARIO, [{ ...SABADO, id: 'sab-2' }, OTRA], { ahoraMs: MADRUGADA_UTC, zona: 'America/Lima' });
    expect(avisosDe('Llamar')).toHaveLength(2);
  });

  it('sellar una acción no toca el recordatorio diario general', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, {
      diarioActivo: true, horaDiaria: '08:00', antelaciones: [0], alarma: { sonido: true, vibracion: true, voz: false, repetir: false },
    });
    await ponerElRecordatorioDiario(USUARIO);
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], { ahoraMs: MADRUGADA_UTC, zona: 'America/Lima' });
    const diarias = () => [...mockLista.values()].filter(a => (a.trigger as { type?: string }).type === 'daily');
    expect(diarias()).toHaveLength(1);
    await sellarRocaDiaria('sab', { archivo: null, texto: 'Lo hice' });
    expect(diarias()).toHaveLength(1);
    expect(avisosDe('Llamar')).toEqual([]);
  });

  it('si el servidor rechaza el sello, el aviso sigue (la acción no se cumplió)', async () => {
    await guardarPreferenciasDeAcciones(USUARIO, {
      diarioActivo: false, horaDiaria: '08:00', antelaciones: [0], alarma: { sonido: true, vibracion: true, voz: false, repetir: false },
    });
    await sincronizarAlarmasDeAcciones(USUARIO, [SABADO], { ahoraMs: MADRUGADA_UTC, zona: 'America/Lima' });
    mockRegistrar.mockRejectedValueOnce(new Error('409'));
    await expect(sellarRocaDiaria('sab', { archivo: null, texto: 'Lo hice' })).rejects.toThrow('409');
    expect(avisosDe('Llamar')).toHaveLength(1);
  });

  it('sin alarmas locales (o con la librería caída) sellar funciona igual', async () => {
    expect(await sellarRocaDiaria('otra', { archivo: null, texto: 'ok' })).toBe(8);
  });
});
