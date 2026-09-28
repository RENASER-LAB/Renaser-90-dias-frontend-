/**
 * Varios avisos a la misma hora (E-410) y el cambio de sonido que no toca horas (E-412), 28/09.
 *
 * En el emulador, cuatro hábitos a las 12:00 con «Voz»: llegaron las cuatro notificaciones, pero sonó
 * solo «Agua tibia». Android calló a las otras tres (`Muting recently noisy`). Y cambiar el sonido en
 * Yo → Alarmas dejó Despertar a las 06:00 todos los días, aunque desde mañana tocaba a las 12:00.
 *
 * Contra el código anterior fallan: las cuatro salían cada una por su canal con sonido, y Despertar
 * perdía su cambio de hora.
 *
 * La librería de mentira hace lo que hace la de verdad en Android: programar con un id existente lo
 * reemplaza, cancelar lo quita, y la lista sale con la forma de `getAllScheduledNotificationsAsync`.
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
const mockCanales = new Map<string, { sound?: string | null }>();
const mockEstado = { siguiente: 1 };

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationChannelAsync: jest.fn(async (id: string, c: { sound?: string | null }) => {
    mockCanales.set(id, c);
    return null;
  }),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  scheduleNotificationAsync: jest.fn(async (p: {
    identifier?: string;
    content: { title?: string | null; body?: string | null; data?: Record<string, unknown>; sound?: unknown };
    trigger: Record<string, unknown>;
  }) => {
    const identifier = p.identifier ?? `alarma-${String(mockEstado.siguiente++).padStart(3, '0')}`;
    const t = p.trigger;
    const trigger = t.type === 'date'
      ? { type: 'date', value: t.date instanceof Date ? t.date.getTime() : t.date, channelId: t.channelId }
      : { ...t };
    mockLista.set(identifier, {
      identifier,
      content: {
        title: p.content.title ?? null,
        body: p.content.body ?? null,
        data: p.content.data,
        sound: p.content.sound === false ? null : typeof p.content.sound === 'string' ? 'custom' : 'default',
      },
      trigger,
    });
    return identifier;
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockLista.delete(id);
  }),
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockLista.values()]),
}));

import * as recordatorios from '../../habits/notificaciones/recordatoriosDeHabito';
import { guardarPreferenciasDeAlarmas, PREFERENCIAS_POR_DEFECTO } from '../preferenciasDeAlarmas';
import { pasarAlarmasAlSonido } from '../cambioDeSonido';
import { CANAL_EN_SILENCIO, planDeAvisosJuntos } from '../avisosJuntos';
import { cancelarRecordatorioDiario, programarRecordatorioDiario } from '../../objetivos/notificaciones/recordatoriosDeAcciones';

const USUARIO = 'u-1';
// Ids reales del catálogo: con «Voz» cada uno tiene su propia voz (vocesDeLasAlarmas.json).
const AGUA = { id: '66507383-7219-43ab-aa42-2fbc76152b82', titulo: 'AGUA TIBIA CON LIMÓN' };
const JUGO = { id: '00006bd5-ab74-4317-b022-ae2e3a878d55', titulo: 'JUGO VERDE' };
const PRIMERA = { id: '5449b2b9-a5b4-441f-8304-2c37c425a114', titulo: 'PRIMERA COMIDA (ROMPO EL AYUNO)' };
const ULTIMA = { id: '3a8a82a0-787d-46bc-a69e-b29c110a37bc', titulo: 'ÚLTIMA COMIDA DEL DÍA' };
const DESPERTAR = { id: '899a2151-e98c-4b61-a46c-b55134240d17', titulo: 'DESPERTAR' };

/**
 * Suena todo canal menos el de los que van callados y el de «solo vibrar». (`asegurarCanal` no crea
 * canales fuera de Android y jest corre como iOS, así que se mira el id.)
 */
function suena(canalId: unknown): boolean {
  return canalId !== CANAL_EN_SILENCIO.id && !String(canalId).endsWith('-vibrar');
}

function aLas(hora: number, minuto: number): Salida[] {
  return [...mockLista.values()].filter(a => a.trigger.type === 'daily' && a.trigger.hour === hora && a.trigger.minute === minuto);
}

async function elegirSonido(sonido: 'voz' | 'sistema' | 'relajar-cuenco'): Promise<void> {
  await guardarPreferenciasDeAlarmas(USUARIO, { ...PREFERENCIAS_POR_DEFECTO, sonido });
}

beforeEach(async () => {
  mockLista.clear();
  mockCanales.clear();
  mockEstado.siguiente = 1;
  await AsyncStorage.clear();
});

describe('cuatro hábitos a las 12:00 (E-410)', () => {
  it('suena uno solo, y nombra a los cuatro', async () => {
    await elegirSonido('voz');
    for (const h of [AGUA, JUGO, PRIMERA, ULTIMA]) {
      await recordatorios.programar(USUARIO, h.id, h.titulo, '12:00', [0]);
    }

    const doce = aLas(12, 0);
    expect(doce).toHaveLength(4); // las cuatro siguen en la bandeja
    const conSonido = doce.filter(a => suena(a.trigger.channelId));
    expect(conSonido).toHaveLength(1);
    expect(conSonido[0].content.title).toBe('4 hábitos a las 12:00');
    expect(conSonido[0].content.body).toBe('AGUA TIBIA CON LIMÓN · JUGO VERDE · PRIMERA COMIDA (ROMPO EL AYUNO) · ÚLTIMA COMIDA DEL DÍA');
    // Con «Voz», la frase genérica: la voz de un hábito solo sabe decir su nombre.
    expect(conSonido[0].trigger.channelId).toBe('recordatorios-habitos-voz');
    expect(doce.filter(a => a.trigger.channelId === CANAL_EN_SILENCIO.id)).toHaveLength(3);
  });

  it('si uno deja esa hora, el otro que queda solo vuelve a su voz y a su texto', async () => {
    await elegirSonido('voz');
    await recordatorios.programar(USUARIO, AGUA.id, AGUA.titulo, '12:00', [0]);
    await recordatorios.programar(USUARIO, JUGO.id, JUGO.titulo, '12:00', [0]);
    await recordatorios.programar(USUARIO, AGUA.id, AGUA.titulo, '07:00', [0]);

    const [jugo] = aLas(12, 0);
    expect(jugo.content.title).toBe('JUGO VERDE');
    expect(jugo.trigger.channelId).toBe('recordatorios-habitos-voz-jugo_verde');
    const [agua] = aLas(7, 0);
    expect(agua.content.title).toBe('AGUA TIBIA CON LIMÓN');
    expect(agua.trigger.channelId).toBe('recordatorios-habitos-voz-agua_tibia');
  });

  it('con dos sonidos distintos también suena uno', async () => {
    await elegirSonido('relajar-cuenco');
    await recordatorios.programar(USUARIO, AGUA.id, AGUA.titulo, '12:00', [0]);
    await recordatorios.fijarSonido(USUARIO, JUGO.id, 'campana');
    await recordatorios.programar(USUARIO, JUGO.id, JUGO.titulo, '12:00', [0]);

    const conSonido = aLas(12, 0).filter(a => suena(a.trigger.channelId));
    expect(conSonido).toHaveLength(1);
    expect(conSonido[0].trigger.channelId).toBe('recordatorios-habitos-relajar-cuenco');
  });

  it('acciones de objetivos a la misma hora: una sola suena', () => {
    const instante = new Date(2026, 8, 29, 12, 0).getTime();
    const programadas = ['a1', 'a2', 'a3'].map((id, i) => ({
      identifier: id,
      content: { title: `Acción ${i + 1}`, body: 'Te toca a las 12:00.', sound: 'default' },
      trigger: { type: 'date', value: instante, channelId: 'recordatorios-objetivos' },
    }));
    const canalNormal = { id: 'recordatorios-objetivos', nombre: 'x', sonidoDelCanal: undefined, sonidoDelAviso: true };
    const miembros = new Map(programadas.map(p => [p.identifier, { tipo: 'objetivos' as const, canalNormal }]));

    const { pedidos } = planDeAvisosJuntos(programadas, miembros, 'sistema', instante - 3_600_000);

    expect(pedidos.map(p => [p.content.title, (p.trigger as { channelId: string }).channelId])).toEqual([
      ['3 acciones a las 12:00', 'recordatorios-objetivos'],
      ['Acción 2', CANAL_EN_SILENCIO.id],
      ['Acción 3', CANAL_EN_SILENCIO.id],
    ]);
  });

  it('ordenarlo dos veces no cambia nada', async () => {
    await elegirSonido('voz');
    await recordatorios.programar(USUARIO, AGUA.id, AGUA.titulo, '12:00', [0]);
    await recordatorios.programar(USUARIO, JUGO.id, JUGO.titulo, '12:00', [0]);
    const antes = JSON.stringify([...mockLista.values()]);
    await pasarAlarmasAlSonido(USUARIO, 'voz', null);
    expect(JSON.stringify([...mockLista.values()])).toBe(antes);
  });
});

describe('cambiar el sonido en Yo → Alarmas no toca horas (E-412)', () => {
  it('Despertar con «12:00 desde mañana» sigue así después de elegir «Voz» y «Cuenco»', async () => {
    const ahora = new Date(2026, 8, 28, 11, 40);
    await recordatorios.programarConCambioDiferido(USUARIO, DESPERTAR.id, DESPERTAR.titulo,
      { horaDeHoy: '06:00', horaNueva: '12:00', desde: '2026-09-29' }, [0], { ahora });
    const despertar = { habitoId: DESPERTAR.id, titulo: DESPERTAR.titulo, hora: '06:00', alarmaPuesta: true };

    for (const sonido of ['voz', 'relajar-cuenco'] as const) {
      await elegirSonido(sonido);
      await pasarAlarmasAlSonido(USUARIO, sonido, despertar);

      const suyas = [...mockLista.values()].filter(a => (a.content.data?.route as string | undefined)?.includes(DESPERTAR.id));
      expect(suyas).toHaveLength(1);
      expect(aLas(6, 0)).toHaveLength(0);
      expect(suyas[0].trigger).toMatchObject({ type: 'date', value: new Date(2026, 8, 29, 12, 0).getTime() });
    }
    const [suya] = mockLista.values();
    expect(suya.trigger.channelId).toBe('recordatorios-habitos-relajar-cuenco');
  });
});

describe('Yo → Alarmas: el aviso diario de objetivos y la antelación (E-410)', () => {
  it('el diario de objetivos a la misma hora que un hábito también suena una sola vez', async () => {
    await elegirSonido('voz');
    await recordatorios.programar(USUARIO, JUGO.id, JUGO.titulo, '08:00', [0]);
    await programarRecordatorioDiario(USUARIO, '08:00');

    const ocho = aLas(8, 0);
    expect(ocho).toHaveLength(2);
    const conSonido = ocho.filter(a => suena(a.trigger.channelId));
    expect(conSonido).toHaveLength(1);
    expect(conSonido[0].content.title).toBe('2 avisos a las 08:00');
  });

  it('apagar el diario deja al hábito que quedó solo con su voz', async () => {
    await elegirSonido('voz');
    await recordatorios.programar(USUARIO, JUGO.id, JUGO.titulo, '08:00', [0]);
    await programarRecordatorioDiario(USUARIO, '08:00');
    await cancelarRecordatorioDiario(USUARIO);

    const [jugo] = aLas(8, 0);
    expect(jugo.content.title).toBe('JUGO VERDE');
    expect(jugo.trigger.channelId).toBe('recordatorios-habitos-voz-jugo_verde');
  });
});
