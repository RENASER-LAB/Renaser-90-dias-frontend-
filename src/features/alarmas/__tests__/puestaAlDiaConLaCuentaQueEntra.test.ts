/**
 * La puesta al día de las alarmas (`ponerAlDiaLasAlarmas`) cuando entra una cuenta mientras corre la del arranque sin
 * sesión, y cuando un paso falla. Estas pruebas vivían junto a `esperarLaPuestaAlDia` (spec 007, historia 2), que
 * existía solo para la hoja «Tu teléfono cerró Renaser» y se retiró el 2026-10-31 (alarmas silenciosas): el
 * comportamiento de la puesta al día no cambia.
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
  olvidarUltimaPuestaAlDia,
  ponerAlDiaLasAlarmas,
  type DependenciasDePuestaAlDia,
} from '../ponerAlDiaLasAlarmas';

beforeEach(() => olvidarUltimaPuestaAlDia());

const AHORA = Date.UTC(2026, 9, 19, 12, 0);

/** Da vueltas a la cola de promesas para que terminen los `await` encadenados de la puesta al día. */
async function vaciar() {
  for (let i = 0; i < 12; i++) await Promise.resolve();
}

describe('ponerAlDiaLasAlarmas con una cuenta que entra o un paso que falla', () => {
  it('si entra una cuenta mientras corre la del arranque sin sesión, corre una segunda vuelta al terminar', async () => {
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
    const sinSesion = ponerAlDiaLasAlarmas(null, AHORA, deps);
    // Entra la cuenta mientras corre la primera: esa llamada no corre nada, queda en espera de una segunda vuelta.
    await expect(ponerAlDiaLasAlarmas('u-1', AHORA + 1000, deps)).resolves.toBeNull();
    expect(resolvedores).toHaveLength(1);

    resolvedores[0]();
    await sinSesion;
    await vaciar();
    expect(resolvedores).toHaveLength(2); // arrancó la segunda, ahora con la cuenta

    resolvedores[1]();
    await vaciar();
  });

  it('si un paso falla, la corrida termina igual y la siguiente cuenta no queda bloqueada', async () => {
    const fallando: DependenciasDePuestaAlDia = {
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
    await expect(ponerAlDiaLasAlarmas('u-1', AHORA, fallando)).resolves.toMatchObject({
      rearmadas: null,
      armadas: null,
      confirmacion: 'sin_lectura_del_servidor',
    });

    const rearmar = jest.fn(async () => 2);
    const sana: DependenciasDePuestaAlDia = { ...fallando, rearmar, completarDiferidos: async () => 0, preferencias: async () => [] };
    await expect(ponerAlDiaLasAlarmas('u-2', AHORA + 1000, sana)).resolves.toMatchObject({ rearmadas: 2 });
    expect(rearmar).toHaveBeenCalledTimes(1);
  });
});
