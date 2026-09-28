/**
 * D-217 (2026-09-28): el teléfono le confirma al servidor que sus alarmas están vivas, y solo después de
 * dejarlas al día. Con la confirmación reciente el push de inicio va solo al navegador; sin ella, también
 * al teléfono (respaldo).
 *
 * Contra el código viejo falla: no existía ninguna confirmación (`confirmacionDeAlarmas.ts`,
 * `ponerAlDiaLasAlarmas.ts`), y el servidor no mandaba nunca el aviso de inicio al teléfono cuando el
 * hábito tenía recordatorio (D-184). Si la alarma se perdía, silencio.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
}));

import { confirmarAlarmasAlServidor, motivoParaNoConfirmar, type DependenciasDeConfirmacion } from '../confirmacionDeAlarmas';
import {
  olvidarUltimaPuestaAlDia,
  ponerAlDiaLasAlarmas,
  type DependenciasDePuestaAlDia,
} from '../ponerAlDiaLasAlarmas';
import { planDeRutasDeHabitos, type AlarmaProgramada } from '../rearmarAlarmas';
import { estadoDeAlarmaExacta, usarModuloDeAlarmas } from '../alarmaExactaNativa';

describe('cuándo se confirma', () => {
  it('con token, permiso de avisos y alarmas exactas (o sin saber, o sin hacer falta)', () => {
    for (const alarmaExacta of ['concedido', 'desconocido', 'no_hace_falta'] as const) {
      expect(motivoParaNoConfirmar({ token: 'ExponentPushToken[x]', permisoDeAvisos: true, alarmaExacta })).toBeNull();
    }
  });

  it('no, si las alarmas salen inexactas: mejor el push a la hora que la alarma 40 min tarde', () => {
    expect(motivoParaNoConfirmar({ token: 't', permisoDeAvisos: true, alarmaExacta: 'denegado' })).toBe('inexactas');
  });

  it('no, sin token (no hay a qué atarla) ni sin permiso de avisos', () => {
    expect(motivoParaNoConfirmar({ token: null, permisoDeAvisos: true, alarmaExacta: 'concedido' })).toBe('sin_token');
    expect(motivoParaNoConfirmar({ token: 't', permisoDeAvisos: false, alarmaExacta: 'concedido' })).toBe('sin_permiso');
  });

  it('manda el token de este teléfono; un 404 (backend anterior) no rompe nada', async () => {
    const enviar = jest.fn(async (_token: string) => {});
    const deps: DependenciasDeConfirmacion = {
      token: async () => 'ExponentPushToken[abc]',
      permisoDeAvisos: async () => true,
      alarmaExacta: () => 'concedido',
      enviar,
    };
    await expect(confirmarAlarmasAlServidor(deps)).resolves.toBe('confirmado');
    expect(enviar).toHaveBeenCalledWith('ExponentPushToken[abc]');
    enviar.mockImplementationOnce(async () => { throw new Error('404'); });
    await expect(confirmarAlarmasAlServidor(deps)).resolves.toBe('fallo');
  });
});

describe('el estado del permiso de alarmas exactas, leído del sistema', () => {
  it('con el módulo nativo: concedido o denegado', () => {
    usarModuloDeAlarmas({ puedeProgramarAlarmasExactas: () => false, abrirAjusteDeAlarmasExactas: () => true });
    expect(estadoDeAlarmaExacta('android', 34)).toBe('denegado');
    usarModuloDeAlarmas({ puedeProgramarAlarmasExactas: () => true, abrirAjusteDeAlarmasExactas: () => true });
    expect(estadoDeAlarmaExacta('android', 34)).toBe('concedido');
  });

  it('sin el módulo (un APK de antes): desconocido, como hasta ahora', () => {
    usarModuloDeAlarmas(null);
    expect(estadoDeAlarmaExacta('android', 34)).toBe('desconocido');
  });

  it('Android 11 o menos, iOS y web: no hace falta', () => {
    expect(estadoDeAlarmaExacta('android', 30)).toBe('no_hace_falta');
    expect(estadoDeAlarmaExacta('ios', '18.0')).toBe('no_hace_falta');
  });
});

describe('poner al día las alarmas y recién ahí confirmar', () => {
  beforeEach(() => olvidarUltimaPuestaAlDia());

  function dependencias(sobre: Partial<DependenciasDePuestaAlDia> = {}) {
    const orden: string[] = [];
    const deps: DependenciasDePuestaAlDia = {
      rearmar: async () => { orden.push('rearmar'); return 2; },
      completarDiferidos: async () => { orden.push('diferidos'); return 0; },
      preferencias: async () => { orden.push('servidor'); return []; },
      armarQueFaltan: async () => { orden.push('armar'); return 1; },
      agregarRutas: async () => { orden.push('rutas'); return 0; },
      confirmar: async () => { orden.push('confirmar'); return 'confirmado'; },
      ...sobre,
    };
    return { deps, orden };
  }

  it('confirma al final, después de armar lo que faltaba', async () => {
    const { deps, orden } = dependencias();
    const r = await ponerAlDiaLasAlarmas('u-1', Date.UTC(2026, 8, 29, 4, 0), deps);
    expect(orden).toEqual(['rearmar', 'diferidos', 'servidor', 'armar', 'rutas', 'confirmar']);
    expect(r?.confirmacion).toBe('confirmado');
  });

  it('si no pudo leer lo que sabe el servidor, no confirma: mejor un aviso de más que uno de menos', async () => {
    const { deps, orden } = dependencias({ preferencias: async () => { throw new Error('sin red'); } });
    const r = await ponerAlDiaLasAlarmas('u-1', Date.UTC(2026, 8, 29, 4, 0), deps);
    expect(orden).not.toContain('confirmar');
    expect(r?.confirmacion).toBe('sin_lectura_del_servidor');
  });

  it('sin sesión solo re-arma; al entrar alguien corre enseguida, sin esperar el intervalo', async () => {
    const { deps, orden } = dependencias();
    const ahora = Date.UTC(2026, 8, 29, 4, 0);
    await ponerAlDiaLasAlarmas(null, ahora, deps);
    expect(orden).toEqual(['rearmar']);
    await ponerAlDiaLasAlarmas('u-1', ahora + 1000, deps);
    expect(orden).toContain('confirmar');
    // Y la misma persona dentro de los 10 minutos no vuelve a correr.
    orden.length = 0;
    await expect(ponerAlDiaLasAlarmas('u-1', ahora + 60_000, deps)).resolves.toBeNull();
    expect(orden).toEqual([]);
  });
});

describe('las alarmas de hábitos de antes de D-218 reciben su ruta', () => {
  const diaria = (id: string, data?: Record<string, unknown>): AlarmaProgramada => ({
    identifier: id,
    content: { title: 'Jugo verde', body: 'Te toca a las 10:00.', sound: 'default', data: data ?? null },
    trigger: { type: 'daily', hour: 10, minute: 0, channelId: 'recordatorios-habitos' },
  });

  it('solo las de hábitos y solo las que no la tienen; mismo id y disparador', () => {
    const ahora = new Date(2026, 8, 28, 15, 0).getTime(); // 15:00 en Lima: las 10:00 fueron hace 5 h
    const plan = planDeRutasDeHabitos(
      [diaria('a-1'), diaria('a-2', { route: '/habitos/h-2' }), diaria('evento-1')],
      new Map([['h-jugo', ['a-1']], ['h-2', ['a-2']]]),
      ahora,
    );
    expect(plan).toHaveLength(1);
    expect(plan[0].identifier).toBe('a-1');
    expect(plan[0].content.data).toEqual({ route: '/habitos/h-jugo' });
    expect(plan[0].trigger).toMatchObject({ type: 'daily', hour: 10, minute: 0 });
  });
});
