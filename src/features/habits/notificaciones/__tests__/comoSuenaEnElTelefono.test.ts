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
  // Como la librería de verdad: una alarma de fecha vuelve con `value` en milisegundos.
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockLista.values()].map(a => {
    const t = a.trigger as { type?: string; date?: Date | number; channelId?: string };
    return t.type === 'date' && t.date !== undefined
      ? { ...a, trigger: { type: 'date', value: t.date instanceof Date ? t.date.getTime() : t.date, channelId: t.channelId } }
      : a;
  })),
}));

import * as Notificaciones from 'expo-notifications';

import {
  cambiarSonidoDeLosHabitos,
  esCanalAnteriorDeHabitos,
  ponerLasAlarmasDeHabitosEnSuCanal,
} from '../../../alarmas/cambioDeSonido';
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
  it('lo de siempre (sin combinación) queda IDÉNTICO —mismo identificador, mismo contenido más `vigenteMin` (issue #40)— y sale por el canal que vibra (E-641)', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [30, 10], { dimension: 'CUERPO' });
    expect([...mockLista.keys()].sort()).toEqual(['habito-h-gym-inicio', 'uuid-001']);
    for (const a of mockLista.values()) {
      expect((a.trigger as { type: string }).type).toBe('daily');
      // E-641: el canal base de hábitos no vibra; la vibración encendida (lo de siempre) va por `-vib`, creado a propósito.
      expect((a.trigger as { channelId: string }).channelId).toBe('recordatorios-habitos-vib');
      // Sin `alarma`: el contenido es el de la 007 y la 008. Issue #40: y hasta cuándo vale el aviso (su antelación + la gracia).
      const vigenteMin = a.content.title?.startsWith('En 30 min:') ? 32 : 12;
      expect(a.content.data).toEqual({ route: '/habitos/h-gym?dimension=BODY', vigenteMin });
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
    expect(mockLista.get('habito-h-gym-inicio')!.content.data).toEqual({ route: '/habitos/h-gym', alarma: c(true, false), vigenteMin: 12 });
  });

  it('con un tono propio de Yo → Alarmas, el sin vibración es ESE canal más «-sinvib»', async () => {
    await guardarPreferenciasDeAlarmas(USUARIO, { eventosActivas: true, sonido: 'campana' });
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { alarma: c(true, false) });
    expect(canalDe('habito-h-gym-inicio')).toBe('recordatorios-habitos-campana-sinvib');
    expect(mockCanales.find(x => x.id === 'recordatorios-habitos-campana-sinvib')).toMatchObject({ sound: 'campana_renaser.wav', enableVibrate: false });
  });

  it('sin sonido: el canal «solo vibrar», que vibra', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { alarma: c(false, true) });
    expect(canalDe('habito-h-gym-inicio')).toBe('recordatorios-habitos-vibrar-vib');
    expect(mockCanales.find(x => x.id === 'recordatorios-habitos-vibrar-vib')).toMatchObject({ sound: null, enableVibrate: true });
    expect(mockLista.get('habito-h-gym-inicio')!.content.sound).toBe(false);
  });

  it('con voz: un hábito del catálogo sale por SU canal de voz; uno propio, por la frase general; con o sin vibración', async () => {
    await recordatorios.programar(USUARIO, DESPERTAR, 'DESPERTAR', '06:00', [0], { alarma: c(true, true, true) });
    expect(canalDe(`habito-${DESPERTAR}-inicio`)).toBe('recordatorios-habitos-voz-despertar-vib');
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { alarma: c(true, false, true) });
    expect(canalDe('habito-h-gym-inicio')).toBe('recordatorios-habitos-voz-sinvib');
    expect(mockLista.get('habito-h-gym-inicio')!.content.sound).toBe('voz_habito.mp3');
  });

  it('«Yo → Alarmas = Voz» sigue diciendo el hábito aunque la combinación no pida voz (no se pierde la voz de quien ya la eligió)', async () => {
    await guardarPreferenciasDeAlarmas(USUARIO, { eventosActivas: true, sonido: 'voz' });
    await recordatorios.programar(USUARIO, DESPERTAR, 'DESPERTAR', '06:00', [0]);
    expect(canalDe(`habito-${DESPERTAR}-inicio`)).toBe('recordatorios-habitos-voz-despertar-vib');
  });

  it('la combinación se conserva al reprogramar sin saber de «Cómo suena» (Plan cambia la hora)', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { alarma: c(true, false) });
    await recordatorios.reprogramarTrasCambioDeHora(USUARIO, GYM, TITULO, '08:00');
    expect(canalDe('habito-h-gym-inicio')).toBe('recordatorios-habitos-sinvib');
    expect(mockLista.get('habito-h-gym-inicio')!.content.body).toBe('Te toca a las 08:00.');
    // Y con `alarma: null` se vuelve a lo de siempre.
    await recordatorios.programar(USUARIO, GYM, TITULO, '08:00', [10], { alarma: null });
    expect(canalDe('habito-h-gym-inicio')).toBe('recordatorios-habitos-vib');
    expect(mockLista.get('habito-h-gym-inicio')!.content.data).toEqual({ route: '/habitos/h-gym', vigenteMin: 12 });
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
    expect(canalDe('habito-h-gym-d6-0')).toBe('recordatorios-habitos-vibrar-vib');
    for (const iso of [1, 2, 3, 4, 5, 7]) expect(canalDe(`habito-h-gym-d${iso}-0`)).toBe('recordatorios-habitos-vib');
    // Solo el día propio lleva su combinación en el aviso.
    expect(mockLista.get('habito-h-gym-d6-0')!.content.data?.alarma).toEqual(c(false, true));
    expect(mockLista.get('habito-h-gym-d1-0')!.content.data).toEqual({ route: '/habitos/h-gym', vigenteMin: 12 });
    // Los canales que hacen falta existen: el de siempre y el de solo vibrar.
    expect(canalesCreados()).toEqual(expect.arrayContaining(['recordatorios-habitos-vib', 'recordatorios-habitos-vibrar-vib']));
  });

  it('un día propio sobre una general propia: gana el del día y los demás siguen a la general', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], {
      dias: diasPropiosDe(semana(SABADO_SOLO_VIBRA)), alarma: c(true, false),
    });
    expect(canalDe('habito-h-gym-d6-0')).toBe('recordatorios-habitos-vibrar-vib');
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
    expect(canalDe('habito-h-gym-inicio')).toBe('recordatorios-habitos-vib');
    const alCambiar = preferencia({ alarm: { sound: true, vibration: false, voice: false, repeat: false } });
    expect(await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [alCambiar])).toBe(1);
    expect(canalDe('habito-h-gym-inicio')).toBe('recordatorios-habitos-sinvib');
    expect(await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [alCambiar])).toBe(0);
  });

  it('un backend anterior (sin `alarm`) no reprograma ni cambia nada: la app sigue como siempre', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10]);
    expect(await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia()])).toBe(0);
    expect(canalDe('habito-h-gym-inicio')).toBe('recordatorios-habitos-vib');
  });

  it('con días: si cambia cómo suena un día, el plan por día se rehace; si no, no se toca', async () => {
    const dias = semana({ 4: { customTime: true, triggerTime: '09:00:00' } });
    await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia({ weekdays: dias })]);
    expect(canalDe('habito-h-gym-d6-0')).toBe('recordatorios-habitos-vib');
    expect(await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia({ weekdays: dias })])).toBe(0);
    const conSabado = semana({ 4: { customTime: true, triggerTime: '09:00:00' }, ...SABADO_SOLO_VIBRA });
    expect(await recordatorios.ajustarRecordatoriosAlServidor(USUARIO, [preferencia({ weekdays: conSabado })])).toBe(1);
    expect(canalDe('habito-h-gym-d6-0')).toBe('recordatorios-habitos-vibrar-vib');
    expect(canalDe('habito-h-gym-d4-0')).toBe('recordatorios-habitos-vib');
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
    expect(canalDe(`habito-${DESPERTAR}-inicio`)).toBe('recordatorios-habitos-vibrar-vib');
    expect(canalDe('habito-h-otro-inicio')).toBe('recordatorios-habitos-campana-vib');
    expect(canalesCreados()).toEqual(expect.arrayContaining(['recordatorios-habitos-campana-sinvib', 'recordatorios-habitos-campana-vib']));
  });

  it('dos hábitos a la misma hora suenan UNO que nombra a los dos; al quedar solo, cada uno vuelve a SU canal', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0], { alarma: c(true, false) });
    await recordatorios.programar(USUARIO, 'h-otro', 'Leer', '07:00', [0]);
    await agruparAvisosQueCoinciden(USUARIO);
    const canales = ['habito-h-gym-inicio', 'habito-h-otro-inicio'].map(canalDe).sort();
    // Uno lleva el aviso (suena y, como ALGUNO quiere vibrar, vibra) y el otro queda en silencio.
    expect(canales).toEqual(['avisos-juntos-sin-sonido', 'recordatorios-habitos-vib']);
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

describe('E-641: los canales de hábitos vibran de verdad (decisión del dueño: vibrar por defecto)', () => {
  it('lo de siempre sale por un canal NUEVO `-vib`, creado con enableVibrate: true; el canal base no se crea', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10]);
    expect(canalDe('habito-h-gym-inicio')).toBe('recordatorios-habitos-vib');
    expect(mockCanales.find(x => x.id === 'recordatorios-habitos-vib')).toMatchObject({ enableVibrate: true });
    // El canal viejo existe en los teléfonos sin vibración y no se puede cambiar: no se vuelve a tocar.
    expect(canalesCreados()).not.toContain('recordatorios-habitos');
  });

  it('cada tono sale por su canal `-vib`, con el mismo archivo y la vibración explícita', async () => {
    for (const [sonido, esperado, archivo] of [
      ['campana', 'recordatorios-habitos-campana-vib', 'campana_renaser.wav'],
      ['alertar-marimba', 'recordatorios-habitos-alertar-marimba-vib', 'alertar_marimba.mp3'],
      ['relajar-lluvia', 'recordatorios-habitos-relajar-lluvia-vib', 'relajar_lluvia.mp3'],
    ] as const) {
      mockLista.clear();
      mockCanales.length = 0;
      await guardarPreferenciasDeAlarmas(USUARIO, { eventosActivas: true, sonido });
      await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10]);
      expect(canalDe('habito-h-gym-inicio')).toBe(esperado);
      expect(mockCanales.find(x => x.id === esperado)).toMatchObject({ sound: archivo, enableVibrate: true });
    }
  });

  it('la voz de un hábito del catálogo vibra también: `…-voz-despertar-vib`', async () => {
    await recordatorios.programar(USUARIO, DESPERTAR, 'DESPERTAR', '06:00', [0], { alarma: c(true, true, true) });
    expect(canalDe(`habito-${DESPERTAR}-inicio`)).toBe('recordatorios-habitos-voz-despertar-vib');
    expect(mockCanales.find(x => x.id === 'recordatorios-habitos-voz-despertar-vib')).toMatchObject({ sound: 'voz_habito_despertar.mp3', enableVibrate: true });
  });

  it('sin vibración no vibra: `-sinvib`, creado con enableVibrate: false (tampoco depende del valor por defecto de Android)', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { alarma: c(true, false) });
    expect(mockCanales.find(x => x.id === 'recordatorios-habitos-sinvib')).toMatchObject({ enableVibrate: false });
    expect(canalesCreados().every(id => id.endsWith('-vib') || id.endsWith('-sinvib'))).toBe(true);
  });

  it('«solo vibrar» vibra: el canal sin sonido y con enableVibrate: true', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { alarma: c(false, true) });
    expect(mockCanales.find(x => x.id === 'recordatorios-habitos-vibrar-vib')).toMatchObject({ sound: null, enableVibrate: true });
  });

  it('el esquema por día también: cada día sale por un canal que dice si vibra', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { dias: diasPropiosDe(semana(SABADO_SOLO_VIBRA)) });
    expect(canalesCreados().sort()).toEqual(['recordatorios-habitos-vib', 'recordatorios-habitos-vibrar-vib']);
    expect(mockCanales.every(x => x.enableVibrate === true)).toBe(true);
  });

  it('esCanalAnteriorDeHabitos: los de antes de E-641 sí; los nuevos, los de eventos y objetivos y el de avisos juntos, no', () => {
    for (const id of ['recordatorios-habitos', 'recordatorios-habitos-campana', 'recordatorios-habitos-voz', 'recordatorios-habitos-voz-despertar',
      'recordatorios-habitos-vibrar', 'recordatorios-habitos-relajar-lluvia']) {
      expect(esCanalAnteriorDeHabitos(id)).toBe(true);
    }
    for (const id of ['recordatorios-habitos-vib', 'recordatorios-habitos-sinvib', 'recordatorios-habitos-vibrar-vib', 'recordatorios-eventos',
      'recordatorios-objetivos-vibrar', 'avisos-juntos-sin-sonido', undefined, null]) {
      expect(esCanalAnteriorDeHabitos(id)).toBe(false);
    }
  });
});

describe('E-641: las alarmas ya programadas pasan al canal que vibra (misma hora, mismo id)', () => {
  /** Deja las alarmas del hábito como estaban en un teléfono de antes: por el canal base, que no vibra. */
  function comoEnUnTelefonoDeAntes(canalPorId: Record<string, string>) {
    for (const [id, canal] of Object.entries(canalPorId)) {
      const alarma = mockLista.get(id)!;
      mockLista.set(id, { ...alarma, trigger: { ...alarma.trigger, channelId: canal } });
    }
    mockCanales.length = 0;
  }
  const horaDe = (id: string) => {
    const t = mockLista.get(id)!.trigger as { hour?: number; minute?: number; weekday?: number };
    return [t.weekday, t.hour, t.minute];
  };
  const programadas = () => Notificaciones.scheduleNotificationAsync as unknown as jest.Mock;

  it('una alarma diaria del canal base pasa a `-vib` con el mismo identificador, la misma hora y el mismo texto', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [30, 10], { dimension: 'CUERPO' });
    const antes = [...mockLista.values()].map(a => ({ id: a.identifier, hora: horaDe(a.identifier), content: a.content }));
    comoEnUnTelefonoDeAntes(Object.fromEntries([...mockLista.keys()].map(id => [id, 'recordatorios-habitos'])));
    expect(await ponerLasAlarmasDeHabitosEnSuCanal(USUARIO)).toBe(2);
    expect([...mockLista.values()].map(a => (a.trigger as { channelId: string }).channelId)).toEqual(['recordatorios-habitos-vib', 'recordatorios-habitos-vib']);
    // Ni hora, ni id, ni texto: es el mismo pedido con otro canal.
    expect([...mockLista.values()].map(a => ({ id: a.identifier, hora: horaDe(a.identifier), content: a.content }))).toEqual(antes);
    expect(mockLista.size).toBe(2);
    expect(mockCanales.find(x => x.id === 'recordatorios-habitos-vib')).toMatchObject({ enableVibrate: true });
  });

  it('es idempotente y barata: con todo ya migrado no programa nada', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10]);
    comoEnUnTelefonoDeAntes({ 'habito-h-gym-inicio': 'recordatorios-habitos' });
    expect(await ponerLasAlarmasDeHabitosEnSuCanal(USUARIO)).toBe(1);
    programadas().mockClear();
    expect(await ponerLasAlarmasDeHabitosEnSuCanal(USUARIO)).toBe(0);
    expect(programadas()).not.toHaveBeenCalled();
  });

  it('cada hábito conserva SU tono: Despertar (campana fijada) a `campana-vib`, otro (tono de Yo, voz) a su voz `-vib`', async () => {
    await guardarPreferenciasDeAlarmas(USUARIO, { eventosActivas: true, sonido: 'voz' });
    await recordatorios.fijarSonido(USUARIO, DESPERTAR, 'campana');
    await recordatorios.programar(USUARIO, DESPERTAR, 'DESPERTAR', '06:00', [0]);
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0]);
    comoEnUnTelefonoDeAntes({
      [`habito-${DESPERTAR}-inicio`]: 'recordatorios-habitos-campana',
      'habito-h-gym-inicio': 'recordatorios-habitos-voz',
    });
    expect(await ponerLasAlarmasDeHabitosEnSuCanal(USUARIO)).toBe(2);
    expect(canalDe(`habito-${DESPERTAR}-inicio`)).toBe('recordatorios-habitos-campana-vib');
    expect(canalDe('habito-h-gym-inicio')).toBe('recordatorios-habitos-voz-vib');
  });

  it('respeta cómo suena cada alarma: la que lleva «sin vibración» va a `-sinvib`, la de solo vibrar a `-vibrar-vib`', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { alarma: c(true, false) });
    await recordatorios.programar(USUARIO, DESPERTAR, 'DESPERTAR', '06:00', [0], { alarma: c(false, true) });
    comoEnUnTelefonoDeAntes({
      'habito-h-gym-inicio': 'recordatorios-habitos',
      [`habito-${DESPERTAR}-inicio`]: 'recordatorios-habitos-vibrar',
    });
    await ponerLasAlarmasDeHabitosEnSuCanal(USUARIO);
    expect(canalDe('habito-h-gym-inicio')).toBe('recordatorios-habitos-sinvib');
    expect(canalDe(`habito-${DESPERTAR}-inicio`)).toBe('recordatorios-habitos-vibrar-vib');
  });

  it('las alarmas por día pasan una por una, cada una a su canal, sin cambiar ids ni horas', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10], { dias: diasPropiosDe(semana(SABADO_SOLO_VIBRA)) });
    const horas = Object.fromEntries([...mockLista.keys()].map(id => [id, horaDe(id)]));
    comoEnUnTelefonoDeAntes(Object.fromEntries([...mockLista.keys()].map(id => [id, id.includes('-d6-') ? 'recordatorios-habitos-vibrar' : 'recordatorios-habitos'])));
    expect(await ponerLasAlarmasDeHabitosEnSuCanal(USUARIO)).toBe(7);
    expect(canalDe('habito-h-gym-d6-0')).toBe('recordatorios-habitos-vibrar-vib');
    for (const iso of [1, 2, 3, 4, 5, 7]) expect(canalDe(`habito-h-gym-d${iso}-0`)).toBe('recordatorios-habitos-vib');
    expect(Object.fromEntries([...mockLista.keys()].map(id => [id, horaDe(id)]))).toEqual(horas);
  });

  it('las repeticiones también pasan al canal nuevo', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0], { alarma: c(true, true, false, true) });
    const reps = [...mockLista.keys()].filter(id => id.includes('-rep-'));
    expect(reps.length).toBeGreaterThan(0);
    comoEnUnTelefonoDeAntes(Object.fromEntries([...mockLista.keys()].map(id => [id, 'recordatorios-habitos'])));
    await ponerLasAlarmasDeHabitosEnSuCanal(USUARIO);
    for (const id of reps) expect(canalDe(id)).toBe('recordatorios-habitos-vib');
    expect(mockLista.size).toBe(1 + reps.length);
  });

  it('no toca lo que no es de hábitos: eventos, objetivos y alarmas ajenas siguen por su canal', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [10]);
    comoEnUnTelefonoDeAntes({ 'habito-h-gym-inicio': 'recordatorios-habitos' });
    mockLista.set('evento-1', { identifier: 'evento-1', content: { title: 'Clase' }, trigger: { type: 'date', value: Date.now() + 3_600_000, channelId: 'recordatorios-eventos' } });
    mockLista.set('accion-1', { identifier: 'accion-1', content: { title: 'Acción' }, trigger: { type: 'daily', hour: 9, minute: 0, channelId: 'recordatorios-objetivos' } });
    mockLista.set('huérfana', { identifier: 'huérfana', content: { title: 'Otra' }, trigger: { type: 'daily', hour: 9, minute: 0, channelId: 'recordatorios-habitos' } });
    expect(await ponerLasAlarmasDeHabitosEnSuCanal(USUARIO)).toBe(1);
    expect(canalDe('evento-1')).toBe('recordatorios-eventos');
    expect(canalDe('accion-1')).toBe('recordatorios-objetivos');
    // Una que la app no reconoce como de un hábito (no está en lo guardado) tampoco se mueve.
    expect(canalDe('huérfana')).toBe('recordatorios-habitos');
  });

  it('un aviso que lleva a un grupo sigue su camino: se pasa con el nombre original y luego se vuelve a ordenar', async () => {
    await recordatorios.programar(USUARIO, GYM, TITULO, '07:00', [0]);
    await recordatorios.programar(USUARIO, 'h-otro', 'Leer', '07:00', [0]);
    await agruparAvisosQueCoinciden(USUARIO);
    // Como estaban en un teléfono de antes: el que lleva el aviso en el canal base, el otro en silencio.
    const lleva = [...mockLista.values()].find(a => (a.trigger as { channelId: string }).channelId !== 'avisos-juntos-sin-sonido')!;
    comoEnUnTelefonoDeAntes({ [lleva.identifier]: 'recordatorios-habitos' });
    await ponerLasAlarmasDeHabitosEnSuCanal(USUARIO);
    await agruparAvisosQueCoinciden(USUARIO);
    const canales = ['habito-h-gym-inicio', 'habito-h-otro-inicio'].map(canalDe).sort();
    expect(canales).toEqual(['avisos-juntos-sin-sonido', 'recordatorios-habitos-vib']);
  });
});
