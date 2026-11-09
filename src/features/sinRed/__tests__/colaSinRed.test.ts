/** Spec 048 (FR-007, FR-009, D8, D15): una cola por cuenta, en orden, que se envía sola y nunca con la sesión de otra cuenta. */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import {
  _reiniciarCola,
  agregarEnvio,
  leerCola,
  ponerCuentaActual,
  procesarCola,
  registrarManejador,
  type EnvioSinRed,
} from '../colaSinRed';

const HORA = { instante: new Date('2026-11-09T21:10:00Z'), origen: 'RELOJ_DEL_SISTEMA' as const };
const error = (status: number, m = 'x') => Object.assign(new Error(m), { status });

beforeEach(async () => {
  await AsyncStorage.clear();
  _reiniciarCola();
});

describe('cola sin red (spec 048)', () => {
  it('envía en el orden en que se hizo y vacía la cola', async () => { // spec 048 FR-007
    const enviados: string[] = [];
    registrarManejador('completarHabito', async (e: EnvioSinRed) => void enviados.push(String(e.datos.registroId)));
    ponerCuentaActual('ana');
    await agregarEnvio('ana', 'completarHabito', { registroId: 'r1' }, HORA);
    await agregarEnvio('ana', 'completarHabito', { registroId: 'r2' }, HORA);

    expect(await procesarCola('ana')).toBe(0);
    expect(enviados).toEqual(['r1', 'r2']);
  });

  it('cada envío lleva su id y la hora real en que se hizo', async () => { // spec 048 FR-007
    const e = await agregarEnvio('ana', 'completarHabito', { registroId: 'r1' }, HORA);
    expect(e.idCliente).toMatch(/^[0-9a-f-]{36}$/);
    expect(e.hechoEn).toBe('2026-11-09T21:10:00.000Z');
    expect(e.origenDeLaHora).toBe('RELOJ_DEL_SISTEMA');
  });

  it('sin señal se reintenta después, y lo siguiente espera para no cambiar el orden', async () => {
    const enviados: string[] = [];
    registrarManejador('completarHabito', async e => {
      if (e.datos.registroId === 'r1') throw error(0);
      enviados.push(String(e.datos.registroId));
    });
    ponerCuentaActual('ana');
    await agregarEnvio('ana', 'completarHabito', { registroId: 'r1' }, HORA, 1000);
    await agregarEnvio('ana', 'completarHabito', { registroId: 'r2' }, HORA, 1000);

    expect(await procesarCola('ana', 1000)).toBe(2);
    expect(enviados).toEqual([]);
    const [primero] = await leerCola('ana');
    expect(primero.intentos).toBe(1);
    expect(primero.proximoIntentoMs).toBeGreaterThan(1000);
  });

  it('con la sesión vencida (401) la cola espera intacta a que vuelva a entrar la misma cuenta', async () => { // spec 048 FR-003
    registrarManejador('completarHabito', async () => {
      throw error(401);
    });
    ponerCuentaActual('ana');
    await agregarEnvio('ana', 'completarHabito', { registroId: 'r1' }, HORA);

    expect(await procesarCola('ana')).toBe(1);
    expect((await leerCola('ana'))[0].intentos).toBe(0);
  });

  it('lo de una cuenta nunca sale con la sesión de otra', async () => { // spec 048 FR-009
    const enviados: string[] = [];
    registrarManejador('completarHabito', async e => void enviados.push(e.cuentaId));
    await agregarEnvio('ana', 'completarHabito', { registroId: 'r1' }, HORA);
    ponerCuentaActual('luis');

    await procesarCola('ana');

    expect(enviados).toEqual([]);
    expect(await leerCola('ana')).toHaveLength(1);
  });
});
