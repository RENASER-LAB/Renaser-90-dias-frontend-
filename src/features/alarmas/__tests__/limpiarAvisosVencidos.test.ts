/**
 * Issue #40 (2026-10-31): al abrir la app o volver al frente se quitan de la bandeja los avisos de inicio de un hábito que
 * ya no sirven: «Te toca a las 07:00.» a las 08:58, o el de un hábito que ya se cumplió. Lo demás de la bandeja no se toca.
 *
 * Contra el código anterior no existía nada que limpiara la bandeja. Las pruebas corren en `America/Lima` (jest.config.js).
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPresentedNotificationsAsync: jest.fn(async () => []),
  dismissNotificationAsync: jest.fn(async () => undefined),
}));

import type { NotaDeCumplido } from '../../habits/notificaciones/cumplidoDeHoy';
import {
  avisosParaQuitar,
  limpiarAvisosVencidos,
  type DependenciasDeLaLimpieza,
  type NotificacionEnLaBandeja,
} from '../limpiarAvisosVencidos';

const hora = (d: number, h: number, m: number, s = 0) => new Date(2026, 9, d, h, m, s, 0).getTime();

function aviso(id: string, publicadoMs: number, extra: Partial<NotificacionEnLaBandeja['request']['content']> = {}): NotificacionEnLaBandeja {
  return {
    date: publicadoMs,
    request: {
      identifier: id,
      content: {
        title: 'En 30 min: GIMNASIO',
        body: 'Te toca a las 07:00.',
        data: { route: '/habitos/h-gym?dimension=BODY', vigenteMin: 32 },
        ...extra,
      },
    },
  };
}

describe('qué avisos de la bandeja sobran', () => {
  it('el de las 07:00 mostrado a las 06:30 vale hasta las 07:02; después, vencido', () => {
    const bandeja = [aviso('habito-h-gym-inicio', hora(21, 6, 30))];
    expect(avisosParaQuitar(bandeja, hora(21, 6, 45))).toEqual([]);
    expect(avisosParaQuitar(bandeja, hora(21, 7, 2))).toEqual([]);
    expect(avisosParaQuitar(bandeja, hora(21, 7, 3))).toEqual([{ identifier: 'habito-h-gym-inicio', motivo: 'vencido' }]);
  });

  it('el de la issue: llegó a las 08:58 diciendo «a las 07:00» y se quita al abrir la app', () => {
    const bandeja = [aviso('uuid-1', hora(21, 8, 58))];
    expect(avisosParaQuitar(bandeja, hora(21, 9, 0))).toEqual([{ identifier: 'uuid-1', motivo: 'vencido' }]);
  });

  it('lo hace sin depender de `vigenteMin`: alcanza al aviso que mostró una versión anterior', () => {
    const viejo = aviso('uuid-2', hora(21, 6, 30), { data: { route: '/habitos/h-gym' } });
    expect(avisosParaQuitar([viejo], hora(21, 9, 0))).toEqual([{ identifier: 'uuid-2', motivo: 'vencido' }]);
  });

  it('el aviso de un grupo de hábitos se examina por el texto original de cada uno', () => {
    const agrupado = aviso('uuid-3', hora(21, 6, 30), {
      title: '2 hábitos a las 07:00',
      body: 'GIMNASIO · Agua',
      data: { route: '/habitos/h-gym', avisoOriginal: { title: 'En 30 min: GIMNASIO', body: 'Te toca a las 07:00.' } },
    });
    expect(avisosParaQuitar([agrupado], hora(21, 6, 45))).toEqual([]);
    expect(avisosParaQuitar([agrupado], hora(21, 8, 0))).toEqual([{ identifier: 'uuid-3', motivo: 'vencido' }]);
  });

  it('el aviso de un hábito pasada la medianoche vale hasta después de las 00:12 del día siguiente', () => {
    const noche = aviso('uuid-4', hora(21, 23, 40), { title: 'En 30 min: DORMIR', body: 'Te toca a las 00:10.', data: { route: '/habitos/h-dormir' } });
    expect(avisosParaQuitar([noche], hora(21, 23, 55))).toEqual([]);
    expect(avisosParaQuitar([noche], hora(22, 0, 11))).toEqual([]);
    expect(avisosParaQuitar([noche], hora(22, 0, 13))).toEqual([{ identifier: 'uuid-4', motivo: 'vencido' }]);
  });

  describe('el hábito ya se cumplió', () => {
    const nota = (dia: string): NotaDeCumplido => ({ dia, puenteDe: null });

    it('se quita el aviso del día en que se cumplió, aunque todavía no haya vencido', () => {
      const bandeja = [aviso('habito-h-gym-inicio', hora(21, 6, 30))];
      const notas = new Map([['h-gym', nota('20261021')]]);
      expect(avisosParaQuitar(bandeja, hora(21, 6, 45), notas)).toEqual([{ identifier: 'habito-h-gym-inicio', motivo: 'cumplido' }]);
    });

    it('no se quita el de otro día: cumplir ayer no apaga el de hoy', () => {
      const bandeja = [aviso('habito-h-gym-inicio', hora(21, 6, 30))];
      const notas = new Map([['h-gym', nota('20261020')]]);
      expect(avisosParaQuitar(bandeja, hora(21, 6, 45), notas)).toEqual([]);
    });

    it('no se quita el de otro hábito', () => {
      const bandeja = [aviso('habito-h-gym-inicio', hora(21, 6, 30))];
      const notas = new Map([['h-agua', nota('20261021')]]);
      expect(avisosParaQuitar(bandeja, hora(21, 6, 45), notas)).toEqual([]);
    });

    it('el de un hábito pasada la medianoche (día del hábito distinto del día del reloj) solo se quita cuando vence', () => {
      const noche = aviso('uuid-4', hora(21, 23, 40), { title: 'En 30 min: DORMIR', body: 'Te toca a las 00:10.', data: { route: '/habitos/h-dormir' } });
      // Dormir a las 00:40 se registra con el día ANTERIOR (21): no es la fecha de las 00:10 del 22.
      const notas = new Map([['h-dormir', nota('20261021')]]);
      expect(avisosParaQuitar([noche], hora(21, 23, 50), notas)).toEqual([]);
    });

    it('un vencido se quita como vencido, no como cumplido', () => {
      const bandeja = [aviso('uuid-1', hora(21, 6, 30))];
      const notas = new Map([['h-gym', nota('20261021')]]);
      expect(avisosParaQuitar(bandeja, hora(21, 9, 0), notas)).toEqual([{ identifier: 'uuid-1', motivo: 'vencido' }]);
    });
  });

  it('lo que no es un aviso de inicio no se toca: repeticiones, acciones, eventos, mensajes, avisos del servidor', () => {
    const bandeja: NotificacionEnLaBandeja[] = [
      aviso('habito-h-gym-rep-20261021-5', hora(21, 7, 5), { title: 'GIMNASIO', body: 'Te tocaba a las 07:00.' }),
      aviso('accion-1', hora(21, 6, 30), { data: { route: '/objetivos' } }),
      aviso('evento-1', hora(21, 6, 30), { title: 'Mentoría', body: 'Empieza a las 07:00.', data: { route: '/eventos/e-1' } }),
      aviso('chat-1', hora(21, 6, 30), { title: 'Marta', body: 'Hola', data: { route: '/chat/c-1' } }),
      aviso('push-1', hora(21, 6, 45), { title: 'Tu hábito está por empezar', body: 'GIMNASIO: te toca a las 07:00. En juego: 8 puntos.', data: { route: '/habitos/h-gym' } }),
    ];
    expect(avisosParaQuitar(bandeja, hora(21, 12, 0), new Map([['h-gym', { dia: '20261021', puenteDe: null }]]))).toEqual([]);
  });

  it('una entrada rota (sin contenido, sin fecha) se salta y no rompe a las demás', () => {
    const rota = { date: Number.NaN, request: { identifier: 'x', content: { title: 'a', body: 'Te toca a las 07:00.', data: { route: '/habitos/h' } } } };
    const sinContenido = { date: 1, request: { identifier: 'y' } } as unknown as NotificacionEnLaBandeja;
    const buena = aviso('ok', hora(21, 6, 30));
    expect(avisosParaQuitar([rota, sinContenido, buena], hora(21, 9, 0))).toEqual([{ identifier: 'ok', motivo: 'vencido' }]);
  });
});

describe('limpiar la bandeja', () => {
  const quitados: string[] = [];
  let bandeja: NotificacionEnLaBandeja[] | null;
  let notas: Record<string, NotaDeCumplido | null>;
  let deps: DependenciasDeLaLimpieza;

  beforeEach(() => {
    quitados.length = 0;
    bandeja = [];
    notas = {};
    deps = {
      bandeja: async () => bandeja,
      quitar: async id => {
        quitados.push(id);
      },
      nota: async (_userId, habitoId) => notas[habitoId] ?? null,
    };
  });

  it('quita los vencidos y deja los vigentes; devuelve cuántos quitó', async () => {
    bandeja = [aviso('viejo', hora(21, 6, 30)), aviso('nuevo', hora(21, 8, 40), { body: 'Te toca a las 09:00.', title: 'En 20 min: Agua', data: { route: '/habitos/h-agua' } })];
    expect(await limpiarAvisosVencidos('u-1', hora(21, 8, 50), deps)).toBe(1);
    expect(quitados).toEqual(['viejo']);
  });

  it('quita el de un hábito cumplido hoy leyendo su nota', async () => {
    bandeja = [aviso('habito-h-gym-inicio', hora(21, 6, 30))];
    notas = { 'h-gym': { dia: '20261021', puenteDe: null } };
    expect(await limpiarAvisosVencidos('u-1', hora(21, 6, 40), deps)).toBe(1);
    expect(quitados).toEqual(['habito-h-gym-inicio']);
  });

  it('sin sesión solo quita los vencidos: no hay notas de nadie', async () => {
    bandeja = [aviso('a', hora(21, 6, 30)), aviso('b', hora(21, 6, 31))];
    notas = { 'h-gym': { dia: '20261021', puenteDe: null } };
    expect(await limpiarAvisosVencidos(null, hora(21, 6, 40), deps)).toBe(0);
    expect(await limpiarAvisosVencidos(null, hora(21, 9, 0), deps)).toBe(2);
  });

  it('una nota de cumplido que no se pudo leer no impide quitar los vencidos', async () => {
    bandeja = [aviso('a', hora(21, 6, 30))];
    deps.nota = async () => {
      throw new Error('storage roto');
    };
    expect(await limpiarAvisosVencidos('u-1', hora(21, 9, 0), deps)).toBe(1);
  });

  it('un aviso que no se deja quitar no impide los demás', async () => {
    bandeja = [aviso('a', hora(21, 6, 30)), aviso('b', hora(21, 6, 31))];
    deps.quitar = async id => {
      if (id === 'a') throw new Error('no se pudo');
      quitados.push(id);
    };
    expect(await limpiarAvisosVencidos('u-1', hora(21, 9, 0), deps)).toBe(1);
    expect(quitados).toEqual(['b']);
  });

  it('sin acceso a la bandeja (web, Expo Go) o con la bandeja vacía no hace nada ni lanza', async () => {
    bandeja = null;
    expect(await limpiarAvisosVencidos('u-1', hora(21, 9, 0), deps)).toBe(0);
    bandeja = [];
    expect(await limpiarAvisosVencidos('u-1', hora(21, 9, 0), deps)).toBe(0);
    deps.bandeja = async () => {
      throw new Error('boom');
    };
    expect(await limpiarAvisosVencidos('u-1', hora(21, 9, 0), deps)).toBe(0);
    expect(quitados).toEqual([]);
  });
});

describe('con la librería de verdad (el doble de expo-notifications)', () => {
  it('lee la bandeja con getPresentedNotificationsAsync y quita lo vencido con dismissNotificationAsync', async () => {
    const N = jest.requireMock('expo-notifications') as {
      getPresentedNotificationsAsync: jest.Mock<() => Promise<unknown[]>>;
      dismissNotificationAsync: jest.Mock<(id: string) => Promise<void>>;
    };
    N.getPresentedNotificationsAsync.mockResolvedValueOnce([
      aviso('viejo', hora(21, 6, 30)),
      aviso('otro-tipo', hora(21, 6, 30), { data: { route: '/eventos/e-1' } }),
    ]);
    expect(await limpiarAvisosVencidos(null, hora(21, 9, 0))).toBe(1);
    expect(N.dismissNotificationAsync).toHaveBeenCalledTimes(1);
    expect(N.dismissNotificationAsync).toHaveBeenCalledWith('viejo');
  });
});

describe('cuándo corre', () => {
  it('el rearmador la llama al abrir y cada vez que la app vuelve al frente, sin el intervalo de 10 minutos', () => {
    const fuente = fs.readFileSync(path.resolve(__dirname, '../components/RearmadorDeAlarmas.tsx'), 'utf8');
    // Al abrir (o al entrar una cuenta) y en el regreso al frente; ambas antes de la puesta al día, que sí tiene intervalo.
    expect(fuente.match(/void limpiarAvisosVencidos\(userId\)\.catch\(\(\) => \{\}\);/g)).toHaveLength(2);
    expect(fuente).toMatch(/if \(estado !== 'active'\) return;\s+void limpiarAvisosVencidos\(userId\)/);
  });
});
