/**
 * «Cómo suena» la alarma en el teléfono (spec 009): cada alarma del hábito sale por el canal de la combinación de SU
 * día —con o sin vibración, solo vibrar, con la voz del hábito— y conserva todo lo de la 007 y la 008: el identificador
 * del push de respaldo, la ruta de Training, el tipo despertador, el esquema diario idéntico y el rearmado.
 *
 * La librería de mentira hace lo que la de verdad en Android: programar con un identificador existente lo REEMPLAZA.
 * Las pruebas corren en `America/Lima` (jest.config.js).
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Pedido = {
  identifier?: string;
  content: { title?: string | null; body?: string | null; data?: Record<string, unknown>; sound?: unknown };
  trigger: Record<string, unknown>;
};

const mockLista = new Map<string, Pedido & { identifier: string }>();
const mockCanales: Array<{ id: string; name?: string; sound?: unknown; enableVibrate?: boolean }> = [];
const mockEstado = { siguiente: 1, permiso: true };

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: mockEstado.permiso, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: mockEstado.permiso })),
  setNotificationChannelAsync: jest.fn(async (id: string, canal: { name?: string; sound?: unknown; enableVibrate?: boolean }) => {
    mockCanales.push({ id, ...canal });
    return null;
  }),
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

import { cambiarSonidoDeLosHabitos } from '../../../alarmas/cambioDeSonido';
import { agruparAvisosQueCoinciden } from '../../../alarmas/avisosJuntos';
import { guardarPreferenciasDeAlarmas } from '../../../alarmas/preferenciasDeAlarmas';
import { planDeRearmado, type AlarmaProgramada } from '../../../alarmas/rearmarAlarmas';
import type { DiaDelHabitoApi, PreferenciaHabitoApi } from '../../types/habits.types';
import * as recordatorios from '../recordatoriosDeHabito';
import { diasPropiosDe } from '../utils/alarmasPorDia';
import type { CombinacionDeAlarma } from '../utils/combinacionDeAlarma';

const USUARIO = 'u-1';
const GYM = 'h-gym';
const TITULO = 'Gimnasio';
/** Despertar, del catálogo (V4 del backend): tiene voz propia. */
const DESPERTAR = '899a2151-e98c-4b61-a46c-b55134240d17';
const NOMBRES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const c = (sonido: boolean, vibracion: boolean, voz = false, repetir = false): CombinacionDeAlarma => ({
  sonido, vibracion, voz, repetir,
});

const semana = (cambios: Record<number, Partial<DiaDelHabitoApi>> = {}): DiaDelHabitoApi[] =>
  NOMBRES.map((weekday, i) => ({
    weekday, triggerTime: '07:00:00', active: true, reminderEnabled: true, reminderMinutesList: [10],
    customTime: false, customReminder: false, customAlarm: false,
    alarm: { sound: true, vibration: true, voice: false, repeat: false },
    ...cambios[i + 1],
  }));

const SABADO_SOLO_VIBRA = { 6: { customAlarm: true, alarm: { sound: false, vibration: true, voice: false, repeat: false } } };

const canalDe = (id: string) => (mockLista.get(id)!.trigger as { channelId: string }).channelId;
const canalesCreados = () => mockCanales.map(x => x.id);

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
  mockCanales.length = 0;
  mockEstado.siguiente = 1;
  mockEstado.permiso = true;
  await AsyncStorage.clear();
  // Los canales solo existen en Android: `asegurarCanal` no hace nada en otra plataforma.
  jest.replaceProperty(Platform, 'OS', 'android');
});

describe('el esquema diario: la combinación elige el canal y nada más cambia', () => {
  it('lo de siempre (sin combinación) queda IDÉNTICO: mismo identificador, mismo canal, y el aviso no lleva nada nuevo', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [30, 10], { dimension: 'CUERPO' });
    expect([...mockLista.keys()].sort()).toEqual(['habito-h-gym-inicio', 'uuid-001']);
    for (const a of mockLista.values()) {
      expect((a.trigger as { type: string }).type).toBe('daily');
      expect((a.trigger as { channelId: string }).channelId).toBe('recordatorios-habitos');
      // Sin `alarma`: el contenido es el de la 007 y la 008.
      expect(a.content.data).toEqual({ route: '/habitos/h-gym?dimension=BODY' });
    }
    // La combinación de siempre tampoco se recuerda: no hay nada que conservar.
    expect((await AsyncStorage.getAllKeys()).some(k => k.startsWith('renaser.habitos.combinacion.'))).toBe(false);
  });

  it('sin vibración: el canal «-sinvib» (creado con enableVibrate: false), con el mismo tono', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { alarma: c(true, false) });
    expect(canalDe('habito-h-gym-inicio')).toBe('recordatorios-habitos-sinvib');
    const creado = mockCanales.find(x => x.id === 'recordatorios-habitos-sinvib')!;
    expect(creado.enableVibrate).toBe(false);
    // El aviso lleva su combinación, para que el cambio de sonido y el aviso agrupado no la pierdan.
    expect(mockLista.get('habito-h-gym-inicio')!.content.data).toEqual({ route: '/habitos/h-gym', alarma: c(true, false) });
  });

  it('con un tono propio de Yo → Alarmas, el sin vibración es ESE canal más «-sinvib»', async () => {
    await guardarPreferenciasDeAlarmas(USUARIO, { eventosActivas: true, sonido: 'campana' });
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { alarma: c(true, false) });
    expect(canalDe('habito-h-gym-inicio')).toBe('recordatorios-habitos-campana-sinvib');
    expect(mockCanales.find(x => x.id === 'recordatorios-habitos-campana-sinvib')).toMatchObject({ sound: 'campana_renaser.wav', enableVibrate: false });
  });

  it('sin sonido: el canal «solo vibrar», que vibra', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { alarma: c(false, true) });
    expect(canalDe('habito-h-gym-inicio')).toBe('recordatorios-habitos-vibrar');
    expect(mockCanales.find(x => x.id === 'recordatorios-habitos-vibrar')).toMatchObject({ sound: null, enableVibrate: true });
    expect(mockLista.get('habito-h-gym-inicio')!.content.sound).toBe(false);
  });

  it('con voz: un hábito del catálogo sale por SU canal de voz; uno propio, por la frase general; con o sin vibración', async () => {
    await recordatorios.programar(USUARIO, DESPERTAR, 'DESPERTAR', '06:00', [0], { alarma: c(true, true, true) });
    expect(canalDe(`habito-${DESPERTAR}-inicio`)).toBe('recordatorios-habitos-voz-despertar');
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { alarma: c(true, false, true) });
    expect(canalDe('habito-h-gym-inicio')).toBe('recordatorios-habitos-voz-sinvib');
    expect(mockLista.get('habito-h-gym-inicio')!.content.sound).toBe('voz_habito.mp3');
  });

  it('«Yo → Alarmas = Voz» sigue diciendo el hábito aunque la combinación no pida voz (no se pierde la voz de quien ya la eligió)', async () => {
    await guardarPreferenciasDeAlarmas(USUARIO, { eventosActivas: true, sonido: 'voz' });
    await recordatorios.programar(USUARIO, DESPERTAR, 'DESPERTAR', '06:00', [0]);
    expect(canalDe(`habito-${DESPERTAR}-inicio`)).toBe('recordatorios-habitos-voz-despertar');
  });

  it('la combinación se conserva al reprogramar sin saber de «Cómo suena» (Plan cambia la hora)', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { alarma: c(true, false) });
    await recordatorios.reprogramarTrasCambioDeHora(USUARIO, GYM, TITULO, '08:00');
    expect(canalDe('habito-h-gym-inicio')).toBe('recordatorios-habitos-sinvib');
    expect(mockLista.get('habito-h-gym-inicio')!.content.body).toBe('Te toca a las 08:00.');
    // Y con `alarma: null` se vuelve a lo de siempre.
    await recordatorios.programar(USUARIO, GYM, TITULO, '08:00', [10], { alarma: null });
    expect(canalDe('habito-h-gym-inicio')).toBe('recordatorios-habitos');
    expect(mockLista.get('habito-h-gym-inicio')!.content.data).toEqual({ route: '/habitos/h-gym' });
  });

  it('el cambio de hora que rige desde mañana (D-91) también respeta la combinación', async () => {
    await recordatorios.programarConCambioDiferido(USUARIO, GYM, TITULO,
      { horaDeHoy: '07:00', horaNueva: '09:00', desde: '2099-01-02' }, [10], { alarma: c(true, false), ahora: new Date(2098, 11, 31, 6, 0) });
    expect(mockLista.size).toBeGreaterThan(0);
    for (const a of mockLista.values()) expect((a.trigger as { channelId: string }).channelId).toBe('recordatorios-habitos-sinvib');
  });
});

describe('el esquema por día: cada día suena a su manera', () => {
  it('el sábado solo vibra; de lunes a viernes y el domingo siguen con el canal de siempre', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { dias: diasPropiosDe(semana(SABADO_SOLO_VIBRA)) });
    expect(mockLista.size).toBe(7);
    expect(canalDe('habito-h-gym-d6-0')).toBe('recordatorios-habitos-vibrar');
    for (const iso of [1, 2, 3, 4, 5, 7]) expect(canalDe(`habito-h-gym-d${iso}-0`)).toBe('recordatorios-habitos');
    // Solo el día propio lleva su combinación en el aviso.
    expect(mockLista.get('habito-h-gym-d6-0')!.content.data?.alarma).toEqual(c(false, true));
    expect(mockLista.get('habito-h-gym-d1-0')!.content.data).toEqual({ route: '/habitos/h-gym' });
    // Los canales que hacen falta existen: el de siempre y el de solo vibrar.
    expect(canalesCreados()).toEqual(expect.arrayContaining(['recordatorios-habitos', 'recordatorios-habitos-vibrar']));
  });

  it('un día propio sobre una general propia: gana el del día y los demás siguen a la general', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], {
      dias: diasPropiosDe(semana(SABADO_SOLO_VIBRA)), alarma: c(true, false),
    });
    expect(canalDe('habito-h-gym-d6-0')).toBe('recordatorios-habitos-vibrar');
    for (const iso of [1, 2, 3, 4, 5, 7]) expect(canalDe(`habito-h-gym-d${iso}-0`)).toBe('recordatorios-habitos-sinvib');
  });

  it('un día con «cómo suena» propio y nada más pasa al esquema por día (la misma regla del servidor)', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { dias: diasPropiosDe(semana(SABADO_SOLO_VIBRA)) });
    expect(mockLista.has('habito-h-gym-inicio')).toBe(false);
    expect(mockLista.has('habito-h-gym-d6-0')).toBe(true);
  });
});

describe('la puesta al día con lo que dice el servidor', () => {
  it('si el servidor cambió cómo suena (otro teléfono), este teléfono reprograma al canal nuevo; si no cambió, no toca nada', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10]);
    expect(canalDe('habito-h-gym-inicio')).toBe('recordatorios-habitos');
    const alCambiar = preferencia({ alarm: { sound: true, vibration: false, voice: false, repeat: false } });
    expect(await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [alCambiar])).toBe(1);
    expect(canalDe('habito-h-gym-inicio')).toBe('recordatorios-habitos-sinvib');
    expect(await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [alCambiar])).toBe(0);
  });

  it('un backend anterior (sin `alarm`) no reprograma ni cambia nada: la app sigue como siempre', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10]);
    expect(await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia()])).toBe(0);
    expect(canalDe('habito-h-gym-inicio')).toBe('recordatorios-habitos');
  });

  it('con días: si cambia cómo suena un día, el plan por día se rehace; si no, no se toca', async () => {
    const dias = semana({ 4: { customTime: true, triggerTime: '09:00:00' } });
    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia({ weekdays: dias })]);
    expect(canalDe('habito-h-gym-d6-0')).toBe('recordatorios-habitos');
    expect(await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia({ weekdays: dias })])).toBe(0);
    const conSabado = semana({ 4: { customTime: true, triggerTime: '09:00:00' }, ...SABADO_SOLO_VIBRA });
    expect(await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia({ weekdays: conSabado })])).toBe(1);
    expect(canalDe('habito-h-gym-d6-0')).toBe('recordatorios-habitos-vibrar');
    expect(canalDe('habito-h-gym-d4-0')).toBe('recordatorios-habitos');
  });
});

describe('lo que reprograma una alarma ya puesta no le quita su combinación', () => {
  it('el rearmado conserva el canal «-sinvib», el de voz y los datos, con su archivo', async () => {
    await recordatorios.programar(USUARIO, DESPERTAR, 'DESPERTAR', '06:00', [0], { alarma: c(true, false, true) });
    const ahora = Date.now();
    const programadas = [...mockLista.values()].map(a => ({
      ...a,
      content: { ...a.content, sound: 'custom' },
      trigger: { type: 'daily', hour: 6, minute: 0, channelId: (a.trigger as { channelId: string }).channelId },
    })) as unknown as AlarmaProgramada[];
    const [pedido] = planDeRearmado(programadas, ahora, 0);
    expect(pedido.trigger).toMatchObject({ channelId: 'recordatorios-habitos-voz-despertar-sinvib' });
    // El archivo que suena sale del canal «-sinvib» (iOS y Android viejos lo toman del aviso).
    expect(pedido.content.sound).toBe('voz_habito_despertar.mp3');
    expect(pedido.content.data).toMatchObject({ alarma: c(true, false, true) });
  });

  it('cambiar el tono en Yo → Alarmas cambia el sonido pero no si vibra, habla o solo vibra', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { alarma: c(true, false) });
    await recordatorios.programar(USUARIO, DESPERTAR, 'DESPERTAR', '06:00', [0], { alarma: c(false, true) });
    await recordatorios.programar(USUARIO, 'h-otro', 'Leer', '20:00', [0]);
    await cambiarSonidoDeLosHabitos(USUARIO, 'campana');
    expect(canalDe('habito-h-gym-inicio')).toBe('recordatorios-habitos-campana-sinvib');
    expect(canalDe(`habito-${DESPERTAR}-inicio`)).toBe('recordatorios-habitos-vibrar');
    expect(canalDe('habito-h-otro-inicio')).toBe('recordatorios-habitos-campana');
    expect(canalesCreados()).toEqual(expect.arrayContaining(['recordatorios-habitos-campana-sinvib', 'recordatorios-habitos-campana']));
  });

  it('dos hábitos a la misma hora suenan UNO que nombra a los dos; al quedar solo, cada uno vuelve a SU canal', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0], { alarma: c(true, false) });
    await recordatorios.programar(USUARIO, 'h-otro', 'Leer', '07:00', [0]);
    await agruparAvisosQueCoinciden(USUARIO);
    const canales = ['habito-h-gym-inicio', 'habito-h-otro-inicio'].map(canalDe).sort();
    // Uno lleva el aviso (suena y, como ALGUNO quiere vibrar, vibra) y el otro queda en silencio.
    expect(canales).toEqual(['avisos-juntos-sin-sonido', 'recordatorios-habitos']);
    // Solo del gimnasio: vuelve a su canal sin vibración.
    await recordatorios.cancelar(USUARIO, 'h-otro');
    await agruparAvisosQueCoinciden(USUARIO);
    expect(canalDe('habito-h-gym-inicio')).toBe('recordatorios-habitos-sinvib');
    expect(mockLista.get('habito-h-gym-inicio')!.content.title).toBe('Gimnasio');
  });

  it('dos hábitos juntos donde ninguno quiere vibrar: el grupo tampoco vibra', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0], { alarma: c(true, false) });
    await recordatorios.programar(USUARIO, 'h-otro', 'Leer', '07:00', [0], { alarma: c(true, false) });
    await agruparAvisosQueCoinciden(USUARIO);
    expect(['habito-h-gym-inicio', 'habito-h-otro-inicio'].map(canalDe).sort()).toEqual(['avisos-juntos-sin-sonido', 'recordatorios-habitos-sinvib']);
  });
});
