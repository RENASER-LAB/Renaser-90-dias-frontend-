/**
 * Spec 007, historia 2 (T029): el aviso de «tu teléfono cerró Renaser… ya las volvimos a poner» solo puede
 * decirlo cuando las alarmas ya se volvieron a poner. `RearmadorDeAlarmas` ya arrancó su puesta al día, y
 * una segunda llamada a `ponerAlDiaLasAlarmas` vuelve de inmediato (hay una corriendo): hace falta poder
 * esperar a la que está en curso.
 *
 * Contra el código de antes falla: `esperarLaPuestaAlDia` no existía.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
}));

import {
  esperarLaPuestaAlDia,
  olvidarUltimaPuestaAlDia,
  ponerAlDiaLasAlarmas,
  type DependenciasDePuestaAlDia,
} from '../ponerAlDiaLasAlarmas';

beforeEach(() => olvidarUltimaPuestaAlDia());

function dependenciasQueEsperan(liberar: { rearmado: () => void }): DependenciasDePuestaAlDia {
  return {
    rearmar: () =>
      new Promise<number>(resolver => {
        liberar.rearmado = () => resolver(3);
      }),
    completarDiferidos: async () => 0,
    preferencias: async () => [],
    armarQueFaltan: async () => 0,
    agregarRutas: async () => 0,
    confirmar: async () => 'confirmado',
  };
}

describe('esperarLaPuestaAlDia', () => {
  it('sin una corrida en curso, vuelve al instante', async () => {
    await expect(esperarLaPuestaAlDia()).resolves.toBeUndefined();
  });

  it('con una corrida en curso, espera a que termine', async () => {
    const liberar = { rearmado: () => undefined as void };
    const deps = dependenciasQueEsperan(liberar);
    const primera = ponerAlDiaLasAlarmas('u-1', Date.UTC(2026, 9, 19, 12, 0), deps);

    // Una segunda llamada (la del aviso) vuelve de inmediato porque ya hay una corriendo…
    await expect(ponerAlDiaLasAlarmas('u-1', Date.UTC(2026, 9, 19, 12, 0, 1), deps)).resolves.toBeNull();

    // …pero se puede esperar a la que está en curso.
    let termino = false;
    const espera = esperarLaPuestaAlDia().then(() => {
      termino = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(termino).toBe(false);

    liberar.rearmado();
    await primera;
    await espera;
    expect(termino).toBe(true);
  });

  it('si al terminar la del arranque sin sesión arranca la de la cuenta que entró, espera también a esa', async () => {
    const resolvedores: (() => void)[] = [];
    const deps: DependenciasDePuestaAlDia = {
      rearmar: () =>
        new Promise<number>(resolver => {
          resolvedores.push(() => resolver(1));
        }),
      completarDiferidos: async () => 0,
      preferencias: async () => [],
      armarQueFaltan: async () => 0,
      agregarRutas: async () => 0,
      confirmar: async () => 'confirmado',
    };
    const vacio = async () => {
      for (let i = 0; i < 12; i++) await Promise.resolve();
    };
    const sinSesion = ponerAlDiaLasAlarmas(null, Date.UTC(2026, 9, 19, 12, 0), deps);
    // Entra la cuenta mientras corre la primera: queda en espera de una segunda vuelta.
    await expect(ponerAlDiaLasAlarmas('u-1', Date.UTC(2026, 9, 19, 12, 0, 1), deps)).resolves.toBeNull();

    let termino = false;
    const espera = esperarLaPuestaAlDia().then(() => {
      termino = true;
    });
    resolvedores[0]();
    await sinSesion;
    await vacio();
    expect(resolvedores).toHaveLength(2); // arrancó la segunda
    expect(termino).toBe(false);

    resolvedores[1]();
    await vacio();
    await espera;
    expect(termino).toBe(true);
  });

  it('si la corrida falla, también termina de esperar', async () => {
    const deps: DependenciasDePuestaAlDia = {
      rearmar: async () => {
        throw new Error('sin permiso');
      },
      completarDiferidos: async () => {
        throw new Error('x');
      },
      preferencias: async () => {
        throw new Error('sin red');
      },
      armarQueFaltan: async () => 0,
      agregarRutas: async () => 0,
      confirmar: async () => 'confirmado',
    };
    await ponerAlDiaLasAlarmas('u-1', Date.UTC(2026, 9, 19, 12, 0), deps);
    await expect(esperarLaPuestaAlDia()).resolves.toBeUndefined();
  });
});

describe('la foto de las alarmas vivas (spec 007, FR-020)', () => {
  it('se toma ANTES de rearmar: el rearmado deja las alarmas puestas y borraría la prueba de que no estaban', async () => {
    const orden: string[] = [];
    const deps: DependenciasDePuestaAlDia = {
      fotoDeLasAlarmas: () => {
        orden.push('foto');
      },
      rearmar: async () => {
        orden.push('rearmar');
        return 2;
      },
      completarDiferidos: async () => 0,
      preferencias: async () => [],
      armarQueFaltan: async () => 0,
      agregarRutas: async () => 0,
      confirmar: async () => 'confirmado',
    };
    await ponerAlDiaLasAlarmas(null, Date.UTC(2026, 9, 19, 12, 0), deps);
    expect(orden).toEqual(['foto', 'rearmar']);
  });

  it('también cuando no corresponde correr (intervalo mínimo): pedirla es barato y siempre antes', async () => {
    const foto = jest.fn();
    const deps: DependenciasDePuestaAlDia = {
      fotoDeLasAlarmas: foto,
      rearmar: async () => 0,
      completarDiferidos: async () => 0,
      preferencias: async () => [],
      armarQueFaltan: async () => 0,
      agregarRutas: async () => 0,
      confirmar: async () => 'confirmado',
    };
    await ponerAlDiaLasAlarmas('u-1', Date.UTC(2026, 9, 19, 12, 0), deps);
    await ponerAlDiaLasAlarmas('u-1', Date.UTC(2026, 9, 19, 12, 1), deps);
    expect(foto).toHaveBeenCalledTimes(2);
  });

  it('si pedir la foto falla, la puesta al día sigue', async () => {
    const deps: DependenciasDePuestaAlDia = {
      fotoDeLasAlarmas: () => {
        throw new Error('boom');
      },
      rearmar: async () => 1,
      completarDiferidos: async () => 0,
      preferencias: async () => [],
      armarQueFaltan: async () => 0,
      agregarRutas: async () => 0,
      confirmar: async () => 'confirmado',
    };
    await expect(ponerAlDiaLasAlarmas(null, Date.UTC(2026, 9, 19, 12, 0), deps)).resolves.toMatchObject({ rearmadas: 1 });
  });
});
