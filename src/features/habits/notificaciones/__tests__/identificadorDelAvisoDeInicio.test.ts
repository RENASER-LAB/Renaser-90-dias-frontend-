/**
 * La alarma local del aviso de inicio de un hábito comparte identidad con el push del servidor
 * (spec 007, FR-014, SC-005; research R7).
 *
 * **El cruce que cierra.** Un teléfono que no confirmó sus alarmas (versión vieja, más de un día sin abrir
 * la app, sin permiso de alarmas exactas) recibe además el push de respaldo del servidor para el aviso de
 * inicio. Si la alarma local y el push no tienen la misma identidad, la bandeja muestra DOS avisos del
 * mismo hábito y momento. El servidor manda `tag = habito-{habitoId}-inicio` (en Android,
 * `FirebaseMessagingDelegate` usa `data.tag` como identificador de la notificación) y `expo-notifications`
 * muestra la alarma local con su `identifier` como `tag`: el que llega segundo REEMPLAZA al primero.
 *
 * El servidor solo conoce UNA antelación por hábito (`minutos_recordatorio`, la más temprana: ver
 * `CLAVE_ANTELACIONES`), así que solo esa lleva el identificador fijo; las demás siguen con UUID, porque
 * los identificadores tienen que ser únicos por pedido.
 *
 * Contra el código anterior falla: ninguna alarma llevaba identificador y la librería les ponía un UUID.
 *
 * La librería de mentira hace lo que hace la de verdad en Android: programar con un id existente lo
 * REEMPLAZA, cancelar lo quita, y la lista sale con la forma de `getAllScheduledNotificationsAsync`.
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
type Salida = {
  identifier: string;
  content: { title: string | null; body: string | null; data?: Record<string, unknown>; sound: string | null };
  trigger: Record<string, unknown>;
};

/** El "sistema": las alarmas por identificador. */
const mockLista = new Map<string, Salida>();
/** Todos los pedidos que llegaron a `scheduleNotificationAsync`, en orden (con y sin identificador). */
const mockPedidos: Pedido[] = [];
const mockCanceladas: string[] = [];
const mockEstado = { siguiente: 1 };

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationChannelAsync: jest.fn(async () => null),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  scheduleNotificationAsync: jest.fn(async (p: Pedido) => {
    mockPedidos.push(p);
    // Sin identificador, la librería inventa uno (un UUID).
    const identifier = p.identifier ?? `uuid-${String(mockEstado.siguiente++).padStart(3, '0')}`;
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
    mockCanceladas.push(id);
    mockLista.delete(id);
  }),
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockLista.values()]),
}));

import * as recordatorios from '../recordatoriosDeHabito';
import { cambiarSonidoDeLosHabitos } from '../../../alarmas/cambioDeSonido';
import { rearmarAlarmasProgramadas, olvidarUltimaCorrida } from '../../../alarmas/rearmarAlarmas';

const USUARIO = 'u-1';
const AGUA = { id: '66507383-7219-43ab-aa42-2fbc76152b82', titulo: 'AGUA TIBIA CON LIMÓN' };
const JUGO = { id: '00006bd5-ab74-4317-b022-ae2e3a878d55', titulo: 'JUGO VERDE' };

const idDeInicio = (habitoId: string) => `habito-${habitoId}-inicio`;

beforeEach(async () => {
  mockLista.clear();
  mockPedidos.length = 0;
  mockCanceladas.length = 0;
  mockEstado.siguiente = 1;
  olvidarUltimaCorrida();
  await AsyncStorage.clear();
});

describe('identificador del aviso de inicio (FR-014)', () => {
  it('con antelaciones [10, 0], la de 10 min lleva el identificador fijo y la de la hora no', async () => {
    expect(recordatorios.HAY_RECORDATORIOS_LOCALES).toBe(true);
    await recordatorios.programar(USUARIO, AGUA.id, AGUA.titulo, '07:00', [10, 0]);

    expect(mockPedidos).toHaveLength(2);
    const [temprana, aLaHora] = mockPedidos;
    expect(temprana.content.title).toBe(`En 10 min: ${AGUA.titulo}`);
    expect(temprana.identifier).toBe(idDeInicio(AGUA.id));
    expect(aLaHora.content.title).toBe(AGUA.titulo);
    expect(aLaHora.identifier).toBeUndefined();
  });

  it('la más temprana es la de más minutos, en el orden que lleguen las antelaciones', async () => {
    await recordatorios.programar(USUARIO, AGUA.id, AGUA.titulo, '07:00', [0, 30, 10]);
    expect(mockPedidos.map(p => [p.content.title, p.identifier])).toEqual([
      [`En 30 min: ${AGUA.titulo}`, idDeInicio(AGUA.id)],
      [`En 10 min: ${AGUA.titulo}`, undefined],
      [AGUA.titulo, undefined],
    ]);
  });

  it('con una sola antelación (a la hora), esa es la más temprana y lleva el identificador', async () => {
    await recordatorios.programar(USUARIO, AGUA.id, AGUA.titulo, '07:00', [0]);
    expect(mockPedidos.map(p => p.identifier)).toEqual([idDeInicio(AGUA.id)]);
  });

  it('una antelación repetida no repite el identificador (el segundo pedido lo reemplazaría)', async () => {
    await recordatorios.programar(USUARIO, AGUA.id, AGUA.titulo, '07:00', [10, 10]);
    // Los dos primeros pedidos son los de `programar`; después el agrupador (E-410) reordena los que coinciden.
    expect(mockPedidos.slice(0, 2).map(p => p.identifier)).toEqual([idDeInicio(AGUA.id), undefined]);
  });

  it('guarda los ids tal como los devuelve la librería, para poder cancelarlos', async () => {
    await recordatorios.programar(USUARIO, AGUA.id, AGUA.titulo, '07:00', [10, 0]);
    const guardados = (await recordatorios.recordatoriosPorHabito(USUARIO)).get(AGUA.id) ?? [];
    expect(guardados).toHaveLength(2);
    expect(guardados).toContain(idDeInicio(AGUA.id));
    expect(new Set(guardados).size).toBe(2);
  });

  it('el identificador es el del hábito: dos hábitos no se pisan', async () => {
    await recordatorios.programar(USUARIO, AGUA.id, AGUA.titulo, '07:00', [10, 0]);
    await recordatorios.programar(USUARIO, JUGO.id, JUGO.titulo, '09:00', [10, 0]);
    expect(mockLista.has(idDeInicio(AGUA.id))).toBe(true);
    expect(mockLista.has(idDeInicio(JUGO.id))).toBe(true);
    expect(mockLista.size).toBe(4);
  });
});

describe('con identificador fijo, cancelar y reprogramar siguen funcionando', () => {
  it('programar otra vez el mismo hábito reemplaza: no queda ninguna alarma de la hora vieja ni duplicada', async () => {
    await recordatorios.programar(USUARIO, AGUA.id, AGUA.titulo, '07:00', [10, 0]);
    await recordatorios.programar(USUARIO, AGUA.id, AGUA.titulo, '08:00', [10, 0]);

    expect(mockLista.size).toBe(2);
    const horas = [...mockLista.values()].map(a => `${a.trigger.hour}:${String(a.trigger.minute).padStart(2, '0')}`).sort();
    expect(horas).toEqual(['7:50', '8:00']);
    // La del identificador fijo sigue siendo la de 10 min antes: ahora las 07:50.
    expect(mockLista.get(idDeInicio(AGUA.id))?.trigger).toMatchObject({ hour: 7, minute: 50 });
  });

  it('cambiar la hora desde Plan/Training (reprogramarTrasCambioDeHora) mantiene el identificador y mueve la hora', async () => {
    await recordatorios.programar(USUARIO, AGUA.id, AGUA.titulo, '07:00', [10, 0]);
    const resultado = await recordatorios.reprogramarTrasCambioDeHora(USUARIO, AGUA.id, AGUA.titulo, '05:30');

    expect(resultado).toBe(true);
    expect(mockLista.size).toBe(2);
    expect(mockLista.get(idDeInicio(AGUA.id))?.trigger).toMatchObject({ type: 'daily', hour: 5, minute: 20 });
    expect(await recordatorios.antelacionesDe(USUARIO, AGUA.id)).toEqual([10, 0]);
  });

  it('quitar una antelación deja solo la que queda, y la más temprana nueva toma el identificador', async () => {
    await recordatorios.programar(USUARIO, AGUA.id, AGUA.titulo, '07:00', [30, 10, 0]);
    await recordatorios.programar(USUARIO, AGUA.id, AGUA.titulo, '07:00', [10, 0]);

    expect(mockLista.size).toBe(2);
    expect(mockLista.get(idDeInicio(AGUA.id))?.content.title).toBe(`En 10 min: ${AGUA.titulo}`);
  });

  it('cancelar el hábito quita también la del identificador fijo', async () => {
    await recordatorios.programar(USUARIO, AGUA.id, AGUA.titulo, '07:00', [10, 0]);
    await recordatorios.cancelar(USUARIO, AGUA.id);

    expect(mockLista.size).toBe(0);
    expect(mockCanceladas).toContain(idDeInicio(AGUA.id));
    expect((await recordatorios.recordatoriosPorHabito(USUARIO)).has(AGUA.id)).toBe(false);
  });

  it('sin antelaciones no queda nada programado', async () => {
    await recordatorios.programar(USUARIO, AGUA.id, AGUA.titulo, '07:00', [10, 0]);
    await recordatorios.programar(USUARIO, AGUA.id, AGUA.titulo, '07:00', []);
    expect(mockLista.size).toBe(0);
  });
});

describe('lo demás que usa los ids de las alarmas no se entera', () => {
  it('el rearmado al abrir la app conserva el identificador, el contenido y el disparador', async () => {
    await recordatorios.programar(USUARIO, AGUA.id, AGUA.titulo, '21:30', [10, 0]);
    const antes = JSON.stringify([...mockLista.values()].sort((a, b) => a.identifier.localeCompare(b.identifier)));
    mockPedidos.length = 0;

    // 10:00 del teléfono: ninguna de las dos (21:20 y 21:30) está recién vencida.
    const ahora = new Date(2026, 9, 19, 10, 0, 0, 0).getTime();
    expect(await rearmarAlarmasProgramadas(ahora, 'android')).toBe(2);

    expect(mockPedidos.map(p => p.identifier).sort()).toEqual([...mockLista.keys()].sort());
    expect(mockPedidos.every(p => typeof p.identifier === 'string')).toBe(true);
    expect(mockLista.size).toBe(2);
    expect(mockLista.has(idDeInicio(AGUA.id))).toBe(true);
    const despues = JSON.stringify([...mockLista.values()].sort((a, b) => a.identifier.localeCompare(b.identifier)));
    expect(despues).toBe(antes);
  });

  it('dos hábitos a la misma hora siguen sonando como UNO que nombra a los dos (E-410)', async () => {
    await recordatorios.programar(USUARIO, AGUA.id, AGUA.titulo, '12:00', [0]);
    await recordatorios.programar(USUARIO, JUGO.id, JUGO.titulo, '12:00', [0]);

    const aLasDoce = [...mockLista.values()].filter(a => a.trigger.type === 'daily' && a.trigger.hour === 12);
    expect(aLasDoce).toHaveLength(2);
    const quienSuena = aLasDoce.filter(a => a.content.title === '2 hábitos a las 12:00');
    expect(quienSuena).toHaveLength(1);
    expect(quienSuena[0].content.body).toContain(AGUA.titulo);
    expect(quienSuena[0].content.body).toContain(JUGO.titulo);

    // Si uno se va a otra hora, el que queda solo vuelve a su texto de siempre.
    await recordatorios.programar(USUARIO, AGUA.id, AGUA.titulo, '07:00', [0]);
    expect(mockLista.get(idDeInicio(JUGO.id))?.content.title).toBe(JUGO.titulo);
    expect(mockLista.get(idDeInicio(AGUA.id))?.content.title).toBe(AGUA.titulo);
  });

  it('cambiar el sonido (Yo → Alarmas) pasa la alarma de identificador fijo a su canal nuevo, sin duplicarla', async () => {
    await recordatorios.programar(USUARIO, AGUA.id, AGUA.titulo, '21:30', [10, 0]);
    const cambiadas = await cambiarSonidoDeLosHabitos(USUARIO, 'relajar-cuenco', new Date(2026, 9, 19, 10, 0, 0, 0).getTime());

    expect(cambiadas).toBe(2);
    expect(mockLista.size).toBe(2);
    expect(mockLista.get(idDeInicio(AGUA.id))?.trigger.channelId).toBe('recordatorios-habitos-relajar-cuenco-vib');
  });
});
