/** Spec 048 (FR-007, FR-009, D8, D15): una cola por cuenta, en orden, que se envía sola y nunca con la sesión de otra cuenta. */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import { leerAvisos } from '../avisosDeLoNoAplicado';
import {
  _reiniciarCola,
  agregarEnvio,
  desenlaceDe,
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

  it('al volver la señal, dos disparos juntos no mandan el mismo envío dos veces (E2E 09/11)', async () => { // spec 048 FR-008
    let enviados = 0;
    let soltar!: () => void;
    registrarManejador('completarHabito', () => {
      enviados++;
      return new Promise<void>(r => {
        soltar = r;
      });
    });
    ponerCuentaActual('ana');
    await agregarEnvio('ana', 'completarHabito', { registroId: 'r1' }, HORA);

    const primero = procesarCola('ana', Date.now(), { adelantar: true });
    await new Promise(r => setTimeout(r, 0));
    const segundo = procesarCola('ana', Date.now(), { adelantar: true });
    soltar();
    await Promise.all([primero, segundo]);
    await procesarCola('ana', Date.now(), { adelantar: true });

    expect(enviados).toBe(1);
    expect(await leerCola('ana')).toHaveLength(0);
  });

  // --- Fase 3 (FR-016, FR-019, D13): un 4xx es final y no queda mudo ---

  it('un 409 con codigo de «no se aplicó» sale de la cola, avisa con lo que escribió y la cola sigue', async () => { // spec 048 FR-019
    const enviados: string[] = [];
    registrarManejador('escritura', async e => {
      if (e.datos.ruta === '/uno') throw Object.assign(error(409, 'El servidor se quedó con lo más nuevo.'), { codigo: 'CAMBIO_MAS_NUEVO_EN_EL_SERVIDOR' });
      enviados.push(String(e.datos.ruta));
    });
    ponerCuentaActual('ana');
    await agregarEnvio('ana', 'escritura', { area: 'cierre', etiqueta: 'Tu cierre del día', ruta: '/uno', resumen: 'Avancé con la propuesta' }, HORA);
    await agregarEnvio('ana', 'escritura', { area: 'cierre', etiqueta: 'Otro', ruta: '/dos' }, HORA);

    expect(await procesarCola('ana')).toBe(0);
    expect(enviados).toEqual(['/dos']);
    expect(await leerAvisos('ana')).toEqual([
      expect.objectContaining({
        tipo: 'no-aplicado',
        etiqueta: 'Tu cierre del día',
        codigo: 'CAMBIO_MAS_NUEVO_EN_EL_SERVIDOR',
        motivo: 'El servidor se quedó con lo más nuevo.',
        texto: 'Avancé con la propuesta',
      }),
    ]);
  });

  it('cualquier otro 4xx (antes quedaba «bloqueado» en silencio, #180) también termina en aviso', async () => { // spec 048 FR-016
    registrarManejador('publicarMuro', async () => {
      throw error(403, 'Tu cuenta está suspendida.');
    });
    ponerCuentaActual('ana');
    await agregarEnvio('ana', 'publicarMuro', { texto: 'Mi publicación', fotos: [] }, HORA);

    expect(await procesarCola('ana')).toBe(0);
    const [aviso] = await leerAvisos('ana');
    expect(aviso).toMatchObject({ tipo: 'no-se-pudo', etiqueta: 'Tu publicación del Muro', motivo: 'Tu cuenta está suspendida.', texto: 'Mi publicación' });
  });

  it('un 403 de sesión vencida espera a que vuelva a entrar la misma cuenta, no se pierde', async () => { // spec 048 FR-003
    registrarManejador('escritura', async () => {
      throw Object.assign(error(403, 'Forbidden'), { sesionVencida: true });
    });
    ponerCuentaActual('ana');
    await agregarEnvio('ana', 'escritura', { area: 'plan', etiqueta: 'x', ruta: '/x' }, HORA);

    expect(await procesarCola('ana')).toBe(1);
    expect(await leerAvisos('ana')).toEqual([]);
  });

  it('un 409 sin codigo (un negocio de siempre) es final, no un «no se aplicó» con código', () => { // spec 048 FR-019
    expect(desenlaceDe(error(409, 'Esta semana ya reacomodaste 3 hábitos.'))).toEqual({
      final: { tipo: 'no-se-pudo', codigo: null, motivo: 'Esta semana ya reacomodaste 3 hábitos.' },
    });
    expect(desenlaceDe(error(404))).toBe('reintentar');
    expect(desenlaceDe(error(503))).toBe('reintentar');
    expect(desenlaceDe(error(0))).toBe('reintentar');
  });

  it('lo que se escribe mientras la cola está enviando no se pierde y sale enseguida', async () => { // spec 048 FR-007
    const enviados: string[] = [];
    let soltar!: () => void;
    registrarManejador('escritura', e => {
      enviados.push(String(e.datos.ruta));
      if (e.datos.ruta !== '/primero') return Promise.resolve();
      return new Promise<void>(r => {
        soltar = r;
      });
    });
    ponerCuentaActual('ana');
    await agregarEnvio('ana', 'escritura', { area: 'plan', etiqueta: 'a', ruta: '/primero' }, HORA);

    const enCurso = procesarCola('ana');
    await new Promise(r => setTimeout(r, 0));
    await agregarEnvio('ana', 'escritura', { area: 'plan', etiqueta: 'b', ruta: '/segundo' }, HORA);
    soltar();
    await enCurso;
    await new Promise(r => setTimeout(r, 20));

    expect(enviados).toEqual(['/primero', '/segundo']);
    expect(await leerCola('ana')).toHaveLength(0);
  });
});
