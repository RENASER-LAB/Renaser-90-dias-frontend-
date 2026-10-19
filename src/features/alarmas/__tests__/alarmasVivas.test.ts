/**
 * Spec 007, refuerzos generales (T050, FR-020): al abrir la app, comprobar DIRECTAMENTE si las alarmas siguen
 * vivas, sin depender de que la marca del teléfono cuente bien por qué salió el proceso.
 *
 * Contra el código de antes falla: `alarmasVivas.ts` no existía. Honor y compañía borran las alarmas y algunas
 * versiones no dejan rastro en el historial de salidas; si la app tiene alarmas programadas a futuro y el
 * sistema no tiene ninguna «próxima alarma» de Renaser, el teléfono las borró.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockGetAllScheduled = jest.fn<() => Promise<unknown[]>>();
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getAllScheduledNotificationsAsync: () => mockGetAllScheduled(),
}));

import { usarModuloDeAlarmas, type EstadoDeAlarmaExacta, type ProximaAlarmaPropia } from '../alarmaExactaNativa';
import {
  comprobarAlarmasVivas,
  fotoDeLasAlarmasAlAbrir,
  hayAlarmasProgramadasAFuturo,
  olvidarLaFotoDeLasAlarmas,
  type DependenciasDeAlarmasVivas,
} from '../alarmasVivas';

/** 2026-10-19 10:00 en Lima (15:00 UTC). */
const AHORA = Date.UTC(2026, 9, 19, 15, 0, 0);
const HORA = 60 * 60 * 1000;

const diaria = { identifier: 'a', content: {}, trigger: { type: 'daily', hour: 7, minute: 0, channelId: 'recordatorios-habitos' } };
const semanal = { identifier: 'b', content: {}, trigger: { type: 'weekly', weekday: 2, hour: 20, minute: 0 } };
const deFecha = (ms: number) => ({ identifier: 'c', content: {}, trigger: { type: 'date', value: ms } });
const pruebaDeSonido = { identifier: 'p', content: {}, trigger: { type: 'timeInterval', seconds: 3, repeats: false } };

function dependencias(
  proxima: ProximaAlarmaPropia,
  programadas: unknown[],
  permiso: EstadoDeAlarmaExacta = 'concedido',
): DependenciasDeAlarmasVivas {
  return {
    permiso: () => permiso,
    proximaAlarmaPropia: () => proxima,
    programadas: async () => programadas,
    ahora: () => AHORA,
  };
}

beforeEach(() => {
  olvidarLaFotoDeLasAlarmas();
  usarModuloDeAlarmas(null);
  mockGetAllScheduled.mockReset();
});

describe('comprobarAlarmasVivas: lo que dice el sistema frente a lo que la app programó', () => {
  it('alarmas a futuro y ninguna «próxima alarma» de Renaser → borradas', async () => {
    expect(await comprobarAlarmasVivas(dependencias('ninguna', [diaria]))).toBe('borradas');
  });

  it('la próxima alarma del sistema es de Renaser → vivas', async () => {
    expect(await comprobarAlarmasVivas(dependencias('propia', [diaria]))).toBe('vivas');
  });

  it('la próxima alarma es de otra app (el reloj de la persona) → no se sabe', async () => {
    expect(await comprobarAlarmasVivas(dependencias('de_otra_app', [diaria]))).toBe('no_se_sabe');
  });

  it('un APK sin la función (o que no la pudo responder) → no se sabe', async () => {
    expect(await comprobarAlarmasVivas(dependencias('desconocido', [diaria]))).toBe('no_se_sabe');
  });

  it('sin alarmas programadas no hay nada que perder → vivas, diga lo que diga el sistema', async () => {
    for (const proxima of ['ninguna', 'propia', 'de_otra_app', 'desconocido'] as const) {
      expect(await comprobarAlarmasVivas(dependencias(proxima, []))).toBe('vivas');
    }
  });

  it('lee el sistema ANTES de esperar a la lista de alarmas programadas (el rearmado no puede adelantarse)', async () => {
    const orden: string[] = [];
    let soltarLista: (lista: unknown[]) => void = () => undefined;
    const deps: DependenciasDeAlarmasVivas = {
      permiso: () => 'concedido',
      proximaAlarmaPropia: () => {
        orden.push('sistema');
        return 'ninguna';
      },
      programadas: () =>
        new Promise<unknown[]>(resolver => {
          orden.push('lista pedida');
          soltarLista = resolver;
        }),
      ahora: () => AHORA,
    };
    const resultado = comprobarAlarmasVivas(deps);
    // Todo lo que corre antes del primer `await` ya ocurrió: la lectura del sistema es síncrona.
    expect(orden[0]).toBe('sistema');
    soltarLista([diaria]);
    expect(await resultado).toBe('borradas');
  });
});

describe('qué cuenta como «alarma programada a futuro»', () => {
  it('cuentan las diarias, las semanales y las de fecha que todavía no llegan', () => {
    expect(hayAlarmasProgramadasAFuturo([diaria], AHORA)).toBe(true);
    expect(hayAlarmasProgramadasAFuturo([semanal], AHORA)).toBe(true);
    expect(hayAlarmasProgramadasAFuturo([deFecha(AHORA + HORA)], AHORA)).toBe(true);
  });

  it('una de fecha que ya pasó no cuenta', () => {
    expect(hayAlarmasProgramadasAFuturo([deFecha(AHORA - HORA)], AHORA)).toBe(false);
    expect(hayAlarmasProgramadasAFuturo([deFecha(AHORA)], AHORA)).toBe(false);
  });

  it('la prueba de sonido (intervalo de 3 s) no cuenta: no es alarma del despertador', () => {
    expect(hayAlarmasProgramadasAFuturo([pruebaDeSonido], AHORA)).toBe(false);
    expect(hayAlarmasProgramadasAFuturo([pruebaDeSonido, diaria], AHORA)).toBe(true);
  });

  it('lo que no se entiende (sin disparador, tipo raro, basura) no cuenta ni lanza', () => {
    for (const raro of [null, undefined, 3, 'x', {}, { trigger: null }, { trigger: { type: 'otro' } }, { trigger: { type: 'date', value: 'ayer' } }]) {
      expect(hayAlarmasProgramadasAFuturo([raro as never], AHORA)).toBe(false);
    }
  });
});

describe('cuándo NO hay forma de saberlo', () => {
  it('sin el permiso «Alarmas y recordatorios» las alarmas no son de despertador y no aparecen como próxima: no se sabe', async () => {
    expect(await comprobarAlarmasVivas(dependencias('ninguna', [diaria], 'denegado'))).toBe('no_se_sabe');
    expect(await comprobarAlarmasVivas(dependencias('ninguna', [diaria], 'desconocido'))).toBe('no_se_sabe');
  });

  it('en Android 11 o menos no hace falta el permiso y se puede comprobar', async () => {
    expect(await comprobarAlarmasVivas(dependencias('ninguna', [diaria], 'no_hace_falta'))).toBe('borradas');
  });

  it('si leer las alarmas programadas lanza, no se sabe (y no lanza)', async () => {
    const deps: DependenciasDeAlarmasVivas = {
      ...dependencias('ninguna', []),
      programadas: async () => {
        throw new Error('boom');
      },
    };
    await expect(comprobarAlarmasVivas(deps)).resolves.toBe('no_se_sabe');
  });

  it('si el sistema lanza al preguntar la próxima alarma, no se sabe', async () => {
    const deps: DependenciasDeAlarmasVivas = {
      ...dependencias('ninguna', [diaria]),
      proximaAlarmaPropia: () => {
        throw new Error('boom');
      },
    };
    await expect(comprobarAlarmasVivas(deps)).resolves.toBe('no_se_sabe');
  });
});

describe('con lo real: módulo nativo y expo-notifications simulados', () => {
  const base = { puedeProgramarAlarmasExactas: () => true, abrirAjusteDeAlarmasExactas: () => true };

  // Un Android 14: ahí el permiso «Alarmas y recordatorios» existe y el módulo dice si está dado.
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.spyOn(Platform, 'Version', 'get').mockReturnValue(34);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lee getAllScheduledNotificationsAsync y la función nativa proximaAlarmaPropia', async () => {
    mockGetAllScheduled.mockResolvedValue([diaria]);
    usarModuloDeAlarmas({ ...base, proximaAlarmaPropia: () => 'ninguna' });
    expect(await comprobarAlarmasVivas()).toBe('borradas');
    usarModuloDeAlarmas({ ...base, proximaAlarmaPropia: () => 'propia' });
    expect(await comprobarAlarmasVivas()).toBe('vivas');
  });

  it('un APK con el módulo viejo (sin la función) → no se sabe', async () => {
    mockGetAllScheduled.mockResolvedValue([diaria]);
    usarModuloDeAlarmas(base);
    expect(await comprobarAlarmasVivas()).toBe('no_se_sabe');
  });

  it('sin módulo nativo → no se sabe', async () => {
    mockGetAllScheduled.mockResolvedValue([diaria]);
    usarModuloDeAlarmas(null);
    expect(await comprobarAlarmasVivas()).toBe('no_se_sabe');
  });

  it('sin el permiso de alarmas exactas (el módulo dice que no) → no se sabe', async () => {
    mockGetAllScheduled.mockResolvedValue([diaria]);
    usarModuloDeAlarmas({ puedeProgramarAlarmasExactas: () => false, abrirAjusteDeAlarmasExactas: () => true, proximaAlarmaPropia: () => 'ninguna' });
    expect(await comprobarAlarmasVivas()).toBe('no_se_sabe');
  });
});

describe('la foto de las alarmas al abrir la app (una por proceso, antes de rearmar)', () => {
  it('se toma una sola vez: la segunda llamada devuelve la misma, aunque el sistema ya haya cambiado', async () => {
    let proxima: ProximaAlarmaPropia = 'ninguna';
    const deps: DependenciasDeAlarmasVivas = { ...dependencias('ninguna', [diaria]), proximaAlarmaPropia: () => proxima };
    const primera = fotoDeLasAlarmasAlAbrir(deps);
    // El rearmado deja las alarmas puestas: lo que se lea después diría «vivas», pero la foto ya se tomó.
    proxima = 'propia';
    expect(await fotoDeLasAlarmasAlAbrir(deps)).toBe('borradas');
    expect(await primera).toBe('borradas');
  });

  it('olvidarLaFotoDeLasAlarmas deja tomar otra (solo para las pruebas)', async () => {
    expect(await fotoDeLasAlarmasAlAbrir(dependencias('ninguna', [diaria]))).toBe('borradas');
    olvidarLaFotoDeLasAlarmas();
    expect(await fotoDeLasAlarmasAlAbrir(dependencias('propia', [diaria]))).toBe('vivas');
  });
});
