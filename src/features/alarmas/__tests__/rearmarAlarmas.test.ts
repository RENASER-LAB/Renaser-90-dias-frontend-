/**
 * Las alarmas programadas antes de dar el permiso de alarmas exactas se vuelven a armar, tal cual.
 *
 * **El bug (e2e en emulador, 26/09).** Con `SCHEDULE_EXACT_ALARM` ya concedido, `dumpsys alarm`
 * seguía mostrando los hábitos de las 06:47/06:50/06:52 con `window=+1h`: `expo-notifications` elige
 * exacta o inexacta al programar, y nadie volvía a programar las de antes del permiso. Contra el
 * código viejo este archivo falla: `rearmarAlarmas` no existía y nada re-armaba al abrir la app.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Pedido = { identifier: string; content: Record<string, unknown>; trigger: Record<string, unknown> };

/** El "sistema": las alarmas programadas por identificador, como el store de la librería. */
const mockSistema = new Map<string, { identifier: string; content: Record<string, unknown>; trigger: unknown }>();
const mockProgramadas: Pedido[] = [];
const mockAntesDeCadaLectura: { hacer: null | (() => void) } = { hacer: null };

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
  getAllScheduledNotificationsAsync: jest.fn(async () => {
    mockAntesDeCadaLectura.hacer?.();
    return [...mockSistema.values()];
  }),
  scheduleNotificationAsync: jest.fn(async (pedido: Pedido) => {
    mockProgramadas.push(pedido);
    // Mismo identificador = reemplaza, igual que `SharedPreferencesNotificationsStore`. Se guarda
    // como lo devuelve la librería: `date` pasa a `value`, y el sonido a 'default' | 'custom' | null.
    const { date, ...resto } = pedido.trigger as { date?: number };
    const trigger = date === undefined ? resto : { ...resto, value: date, repeats: false };
    const s = pedido.content.sound;
    const sound = s === true ? 'default' : typeof s === 'string' ? 'custom' : null;
    mockSistema.set(pedido.identifier, { identifier: pedido.identifier, content: { ...pedido.content, sound }, trigger });
    return pedido.identifier;
  }),
}));

import {
  INTERVALO_MINIMO_MS,
  olvidarUltimaCorrida,
  planDeRearmado,
  rearmarAlarmasProgramadas,
  tocaRearmar,
  type AlarmaProgramada,
} from '../rearmarAlarmas';

/** Sábado 26/09/2026, 10:00 hora del teléfono (sea cual sea la zona del que corre la prueba). */
const AHORA = new Date(2026, 8, 26, 10, 0, 0, 0).getTime();
const MIN = 60 * 1000;

function habito(id: string, hora: number, minuto: number, sonido: string | null = 'default'): AlarmaProgramada {
  return {
    identifier: id,
    content: { title: 'Despertar', body: `Te toca a las ${hora}:${minuto}.`, sound: sonido, data: null, autoDismiss: true, sticky: false },
    trigger: { type: 'daily', hour: hora, minute: minuto, channelId: 'recordatorios-habitos' },
  };
}

function evento(id: string, cuandoMs: number): AlarmaProgramada {
  return {
    identifier: id,
    content: { title: 'Clase en 30 min', body: 'Unirme', sound: 'custom', data: { route: '/eventos/ev-1' } },
    trigger: { type: 'date', value: cuandoMs, repeats: false, channelId: 'recordatorios-eventos-campana' },
  };
}

beforeEach(() => {
  mockSistema.clear();
  mockProgramadas.length = 0;
  mockAntesDeCadaLectura.hacer = null;
  olvidarUltimaCorrida();
});

describe('qué se re-arma', () => {
  it('hábitos diarios, el repaso semanal y los «Voy» futuros, con el mismo id, contenido y disparador', () => {
    const plan = planDeRearmado(
      [
        habito('h-0647', 6, 47),
        {
          identifier: 'repaso',
          content: { title: 'Arma tu semana', body: 'Revisa…', sound: 'default' },
          trigger: { type: 'weekly', weekday: 1, hour: 19, minute: 0, channelId: 'recordatorios-habitos' },
        },
        evento('ev-1-30', AHORA + 5 * 60 * MIN),
      ],
      AHORA,
    );
    expect(plan).toEqual([
      {
        identifier: 'h-0647',
        content: { title: 'Despertar', body: 'Te toca a las 6:47.', sound: true, autoDismiss: true, sticky: false },
        trigger: { type: 'daily', hour: 6, minute: 47, channelId: 'recordatorios-habitos' },
      },
      {
        identifier: 'repaso',
        content: { title: 'Arma tu semana', body: 'Revisa…', sound: true },
        trigger: { type: 'weekly', weekday: 1, hour: 19, minute: 0, channelId: 'recordatorios-habitos' },
      },
      {
        identifier: 'ev-1-30',
        content: { title: 'Clase en 30 min', body: 'Unirme', sound: 'campana_renaser.wav', data: { route: '/eventos/ev-1' } },
        trigger: { type: 'date', date: AHORA + 5 * 60 * MIN, channelId: 'recordatorios-eventos-campana' },
      },
    ]);
  });

  it('el sonido: «default» → el del sistema, sin sonido → false (solo vibrar)', () => {
    const [vibrar] = planDeRearmado([habito('h', 6, 0, null)], AHORA);
    expect(vibrar.content.sound).toBe(false);
  });

  it('no toca una de fecha ya pasada, ni la prueba de sonido (intervalo), ni disparadores desconocidos', () => {
    const plan = planDeRearmado(
      [
        evento('pasada', AHORA - MIN),
        { identifier: 'prueba', content: { title: 'Así suena' }, trigger: { type: 'timeInterval', seconds: 3, repeats: false } },
        { identifier: 'raro', content: { title: 'x' }, trigger: { type: 'monthly', day: 1, hour: 8, minute: 0 } },
        { identifier: 'nulo', content: { title: 'x' }, trigger: null },
      ],
      AHORA,
    );
    expect(plan).toEqual([]);
  });

  it('no mueve una diaria cuya hora pasó hace menos de 2 h: inexacta, puede estar todavía por sonar', () => {
    const plan = planDeRearmado([habito('recien', 8, 30), habito('hace-tres-horas', 7, 0), habito('mas-tarde', 11, 0)], AHORA);
    expect(plan.map(p => p.identifier)).toEqual(['hace-tres-horas', 'mas-tarde']);
  });

  it('lo mismo con una semanal del día de hoy (sábado = 7 en expo)', () => {
    const semanal = (id: string, weekday: number, hour: number): AlarmaProgramada => ({
      identifier: id,
      content: { title: 'x' },
      trigger: { type: 'weekly', weekday, hour, minute: 0 },
    });
    const plan = planDeRearmado([semanal('hoy-recien', 7, 9), semanal('hoy-temprano', 7, 6), semanal('domingo', 1, 9)], AHORA);
    expect(plan.map(p => p.identifier)).toEqual(['hoy-temprano', 'domingo']);
  });

  it('un id repetido se re-arma una sola vez', () => {
    expect(planDeRearmado([habito('h', 6, 0), habito('h', 6, 0)], AHORA)).toHaveLength(1);
  });
});

describe('al abrir y al volver a primer plano', () => {
  it('re-arma lo que había, sin duplicar: mismas alarmas y mismos ids después de dos corridas', async () => {
    for (const a of [habito('h-0647', 6, 47), habito('h-0650', 6, 50), evento('ev', AHORA + 60 * MIN)]) {
      mockSistema.set(a.identifier, a);
    }
    expect(await rearmarAlarmasProgramadas(AHORA, 'android')).toBe(3);
    expect(await rearmarAlarmasProgramadas(AHORA + INTERVALO_MINIMO_MS, 'android')).toBe(3);
    expect([...mockSistema.keys()].sort()).toEqual(['ev', 'h-0647', 'h-0650']);
    expect(mockProgramadas.map(p => p.identifier)).toEqual(['h-0647', 'h-0650', 'ev', 'h-0647', 'h-0650', 'ev']);
    // Ida y vuelta por la librería sin perder nada: la segunda corrida pide exactamente lo mismo.
    expect(mockProgramadas.slice(3)).toEqual(mockProgramadas.slice(0, 3));
  });

  it('respeta el intervalo mínimo entre corridas (la primera, al abrir, corre siempre)', async () => {
    mockSistema.set('h', habito('h', 6, 0));
    expect(await rearmarAlarmasProgramadas(AHORA, 'android')).toBe(1);
    expect(await rearmarAlarmasProgramadas(AHORA + INTERVALO_MINIMO_MS - 1, 'android')).toBeNull();
    expect(mockProgramadas).toHaveLength(1);
    expect(tocaRearmar(null, AHORA)).toBe(true);
    expect(tocaRearmar(AHORA, AHORA + 9 * MIN)).toBe(false);
    expect(tocaRearmar(AHORA, AHORA + 10 * MIN)).toBe(true);
  });

  it('no inventa alarmas: sin nada programado, no programa nada', async () => {
    expect(await rearmarAlarmasProgramadas(AHORA, 'android')).toBe(0);
    expect(mockProgramadas).toHaveLength(0);
  });

  it('no resucita una alarma que se canceló mientras corría (p. ej. «No voy» o cambio de hora)', async () => {
    mockSistema.set('a', habito('a', 6, 0));
    mockSistema.set('b', habito('b', 6, 5));
    let lecturas = 0;
    mockAntesDeCadaLectura.hacer = () => {
      lecturas++;
      if (lecturas === 2) mockSistema.delete('b'); // entre el plan y el re-armado
    };
    expect(await rearmarAlarmasProgramadas(AHORA, 'android')).toBe(1);
    expect(mockProgramadas.map(p => p.identifier)).toEqual(['a']);
    expect(mockSistema.has('b')).toBe(false);
  });

  it('fuera de Android no hace nada', async () => {
    mockSistema.set('h', habito('h', 6, 0));
    expect(await rearmarAlarmasProgramadas(AHORA, 'ios')).toBeNull();
    expect(mockProgramadas).toHaveLength(0);
  });
});
