/**
 * Los pasos de hoy en Training (spec 037, D-310): cuándo se lee Health Connect y cuándo no, cómo se conecta, y el registro con un toque
 * (relee, comprueba la meta, envía una sola vez y no reasigna un día que cambió).
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Alert } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { ApiError } from '../../../../services/http/apiClient';
import { DiaDeHabitosCambiadoError } from '../../../habits/api/registroVigente';
import { registrarKilometrosAutomaticos } from '../../api/pasosApi';
import { borrarLaConexion, guardarLaConexion, leerLaConexion } from '../../services/conexionDeLosPasos';
import {
  abrirHealthConnect,
  leerLosPasosDelDia,
  pedirPermisosDeSalud,
  permisosDeSalud,
  soporteDeSalud,
} from '../../services/saludConectada';
import type { LecturaCrudaDelDia } from '../../types/pasos.types';
import { horaDeConexionDeHoy, inicioDelDia, usePasosDelDia, type HabitoDeKilometros, type PasosEnTraining } from '../usePasosDelDia';

jest.mock('../../services/saludConectada', () => ({
  soporteDeSalud: jest.fn(),
  permisosDeSalud: jest.fn(),
  pedirPermisosDeSalud: jest.fn(),
  leerLosPasosDelDia: jest.fn(),
  abrirHealthConnect: jest.fn(),
}));
jest.mock('../../services/conexionDeLosPasos', () => ({
  leerLaConexion: jest.fn(),
  guardarLaConexion: jest.fn(),
  borrarLaConexion: jest.fn(),
}));
jest.mock('../../api/pasosApi', () => ({ registrarKilometrosAutomaticos: jest.fn() }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const soporte = soporteDeSalud as jest.MockedFunction<typeof soporteDeSalud>;
const permisos = permisosDeSalud as jest.MockedFunction<typeof permisosDeSalud>;
const pedirPermisos = pedirPermisosDeSalud as jest.MockedFunction<typeof pedirPermisosDeSalud>;
const leer = leerLosPasosDelDia as jest.MockedFunction<typeof leerLosPasosDelDia>;
const leerConexion = leerLaConexion as jest.MockedFunction<typeof leerLaConexion>;
const guardarConexion = guardarLaConexion as jest.MockedFunction<typeof guardarLaConexion>;
const borrarConexion = borrarLaConexion as jest.MockedFunction<typeof borrarLaConexion>;
const registrarApi = registrarKilometrosAutomaticos as jest.MockedFunction<typeof registrarKilometrosAutomaticos>;

const TELEFONO = 'com.android.healthconnect.phone.abc';
/** Lo que Health Connect devuelve: 3,2 km hoy desde el teléfono. */
const crudaDe = (distanciaM: number, pasos = 4200): LecturaCrudaDelDia => ({
  pasos,
  distanciaM,
  origenesUsados: [TELEFONO],
  registros: [{ origen: TELEFONO, metodo: 2 }],
});

const habito = (extra: Partial<HabitoDeKilometros> = {}): HabitoDeKilometros => ({
  id: 'r-km',
  fechaEjecucion: '2026-11-04',
  done: false,
  medicion: { meta: 5, valorDelDia: null },
  ...extra,
});

let resultado: PasosEnTraining;
let raiz: ReactTestRenderer | null = null;
const alRegistrado = jest.fn();
const alCambiarElDia = jest.fn();

type Opciones = { habito?: HabitoDeKilometros | null; activo?: boolean; cuentaId?: string | null };

function Arnes({ habito: h, activo, cuentaId }: Required<Opciones>) {
  resultado = usePasosDelDia({ cuentaId, habito: h, activo, alRegistrado, alCambiarElDia });
  return null;
}

async function montar({ habito: h = habito(), activo = true, cuentaId = 'ana' }: Opciones = {}) {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Arnes, { habito: h, activo, cuentaId }));
  });
  await vaciar();
}

/** Deja correr las promesas pendientes (lecturas del almacenamiento y de Health Connect). */
async function vaciar() {
  for (let vuelta = 0; vuelta < 3; vuelta += 1) {
    await act(async () => {
      await new Promise<void>(resolver => setTimeout(resolver, 0));
    });
  }
}

/** `YYYY-MM-DD` de hoy en la hora del teléfono: el día del registro cuando la prueba necesita que sea hoy. */
function hoyLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

beforeEach(() => {
  soporte.mockResolvedValue('disponible');
  permisos.mockResolvedValue('otorgados');
  pedirPermisos.mockResolvedValue(true);
  leer.mockResolvedValue(crudaDe(3200));
  leerConexion.mockResolvedValue({ conectadoEn: '2026-11-04T19:05:00.000Z' });
  guardarConexion.mockResolvedValue(undefined);
  borrarConexion.mockResolvedValue(undefined);
  registrarApi.mockResolvedValue({ id: 'r-km', estado: 'COMPLETADO', puntosOtorgados: 8 });
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.restoreAllMocks();
  for (const doble of [soporte, permisos, pedirPermisos, leer, leerConexion, guardarConexion, borrarConexion, registrarApi, alRegistrado, alCambiarElDia]) {
    doble.mockReset();
  }
  (abrirHealthConnect as jest.Mock).mockReset();
});

describe('cuándo lee', () => {
  it('conectado, con permiso y con Training a la vista: lee el día de hoy desde la medianoche y muestra el avance', async () => {
    await montar();

    expect(leer).toHaveBeenCalledTimes(1);
    const [desde, hasta] = leer.mock.calls[0];
    expect(desde.getFullYear()).toBe(2026);
    expect([desde.getMonth(), desde.getDate(), desde.getHours(), desde.getMinutes()]).toEqual([10, 4, 0, 0]);
    expect(hasta).toBeInstanceOf(Date);
    expect(resultado.vista).toMatchObject({ modo: 'avance', km: 3.2, meta: 5, metaLista: false });
    expect(resultado.registroId).toBe('r-km');
  });

  it('sin conectar no lee nada y ofrece «Cuenta tus pasos solo»', async () => {
    leerConexion.mockResolvedValue({ conectadoEn: null });
    await montar();
    expect(leer).not.toHaveBeenCalled();
    expect(resultado.vista).toEqual({ modo: 'ofrecer', soporte: 'disponible' });
  });

  it('con Training fuera de vista no lee (y al volver, sí)', async () => {
    await montar({ activo: false });
    expect(leer).not.toHaveBeenCalled();

    await act(async () => {
      raiz!.update(React.createElement(Arnes, { habito: habito(), activo: true, cuentaId: 'ana' }));
    });
    await vaciar();
    expect(leer).toHaveBeenCalledTimes(1);
  });

  it('con el hábito ya cumplido no lee y dice cuánto fue', async () => {
    await montar({ habito: habito({ done: true, medicion: { meta: 5, valorDelDia: 5.4, origenDelDia: 'HEALTH_CONNECT', fuenteDelDia: 'Galaxy Watch' } }) });
    expect(leer).not.toHaveBeenCalled();
    expect(resultado.vista).toEqual({ modo: 'cumplido', km: 5.4, origen: 'HEALTH_CONNECT', fuente: 'Galaxy Watch' });
  });

  it('en un teléfono sin soporte (Android menor a 14, sin Health Connect, web) no lee y se queda con la captura', async () => {
    soporte.mockResolvedValue('no-disponible');
    await montar();
    expect(leer).not.toHaveBeenCalled();
    expect(permisos).not.toHaveBeenCalled();
    expect(resultado.vista).toEqual({ modo: 'ofrecer', soporte: 'no-disponible' });
  });

  it('sin permiso no lee: «Perdimos tus pasos»', async () => {
    permisos.mockResolvedValue('faltan');
    await montar();
    expect(leer).not.toHaveBeenCalled();
    expect(resultado.vista).toEqual({ modo: 'sin-permiso' });
  });

  it('sin meta en la agenda (backend anterior) no lee ni ofrece nada', async () => {
    await montar({ habito: habito({ medicion: null }) });
    expect(leer).not.toHaveBeenCalled();
    expect(resultado.vista).toEqual({ modo: 'captura' });
  });

  it('sin hábito de kilómetros hoy no hay nada que leer', async () => {
    await montar({ habito: null });
    expect(leer).not.toHaveBeenCalled();
    expect(resultado.registroId).toBeNull();
  });

  it('«Actualizar» lee siempre, aunque la lectura automática esté enfriándose (30 s)', async () => {
    await montar();
    expect(leer).toHaveBeenCalledTimes(1);

    await act(async () => {
      await resultado.actualizar();
    });
    expect(leer).toHaveBeenCalledTimes(2);
  });

  it('si la lectura falla: «Todavía no vemos pasos», no un error técnico', async () => {
    leer.mockRejectedValue(new Error('Health Connect no responde'));
    await montar();
    expect(resultado.vista).toEqual({ modo: 'sin-datos', hayManuales: false });
  });

  it('con pasos escritos a mano solamente: sin datos, y lo dice', async () => {
    leer.mockResolvedValue({ pasos: null, distanciaM: null, origenesUsados: [], registros: [{ origen: 'com.mala.app', metodo: 3 }] });
    await montar();
    expect(resultado.vista).toEqual({ modo: 'sin-datos', hayManuales: true });
  });
});

describe('conectar y desconectar', () => {
  it('«Conectar» pide el permiso, guarda la conexión y empieza a leer', async () => {
    leerConexion.mockResolvedValue({ conectadoEn: null });
    // El registro es de HOY: así la hoja puede decir desde qué hora se cuenta.
    await montar({ habito: habito({ fechaEjecucion: hoyLocal() }) });
    expect(resultado.vista).toEqual({ modo: 'ofrecer', soporte: 'disponible' });

    let ok = false;
    await act(async () => {
      ok = await resultado.conectar();
    });
    await vaciar();

    expect(ok).toBe(true);
    expect(pedirPermisos).toHaveBeenCalledTimes(1);
    expect(guardarConexion).toHaveBeenCalledWith('ana', expect.any(Date));
    expect(leer).toHaveBeenCalledTimes(1);
    expect(resultado.vista.modo).toBe('avance');
    // Se conectó hoy: el primer día cuenta desde esa hora.
    expect(resultado.conectadoHoyA).toMatch(/^\d{2}:\d{2}$/);
  });

  it('si la persona no deja el permiso, no queda conectada y sigue ofreciéndose', async () => {
    leerConexion.mockResolvedValue({ conectadoEn: null });
    pedirPermisos.mockResolvedValue(false);
    await montar();

    let ok = true;
    await act(async () => {
      ok = await resultado.conectar();
    });

    expect(ok).toBe(false);
    expect(guardarConexion).not.toHaveBeenCalled();
    expect(leer).not.toHaveBeenCalled();
    expect(resultado.vista).toEqual({ modo: 'ofrecer', soporte: 'disponible' });
  });

  it('«Desconectar» olvida la conexión de este teléfono y abre Health Connect para quitar el permiso', async () => {
    await montar();
    expect(resultado.vista.modo).toBe('avance');

    await act(async () => {
      resultado.desconectar();
    });

    expect(borrarConexion).toHaveBeenCalledWith('ana');
    expect(abrirHealthConnect).toHaveBeenCalledTimes(1);
    expect(resultado.vista).toEqual({ modo: 'ofrecer', soporte: 'disponible' });
  });
});

describe('registrar', () => {
  it('relee, ve que llegó a la meta y envía los km, los pasos y la fuente UNA vez; después avisa con los puntos del servidor', async () => {
    await montar();
    leer.mockResolvedValue(crudaDe(5400, 7120));

    await act(async () => {
      await resultado.registrar();
    });

    expect(registrarApi).toHaveBeenCalledTimes(1);
    const [id, cuerpo] = registrarApi.mock.calls[0];
    expect(id).toBe('r-km');
    expect(cuerpo).toMatchObject({ kilometros: 5.4, pasos: 7120, fuente: 'Tu teléfono', dispositivo: 'TELEFONO' });
    expect(typeof cuerpo.leidoEn).toBe('string');
    expect(alRegistrado).toHaveBeenCalledWith('r-km', { puntosOtorgados: 8, km: 5.4 });
    expect(resultado.registrando).toBe(false);
  });

  it('un doble toque manda UN solo pedido', async () => {
    await montar();
    leer.mockResolvedValue(crudaDe(5400, 7120));
    let liberar: (valor: { id: string; estado: string; puntosOtorgados: number }) => void = () => undefined;
    registrarApi.mockReturnValue(new Promise(resolver => (liberar = resolver)));

    await act(async () => {
      void resultado.registrar();
      void resultado.registrar();
      await Promise.resolve();
    });
    await vaciar();
    await act(async () => {
      liberar({ id: 'r-km', estado: 'COMPLETADO', puntosOtorgados: 8 });
    });
    await vaciar();

    expect(registrarApi).toHaveBeenCalledTimes(1);
    expect(alRegistrado).toHaveBeenCalledTimes(1);
  });

  it('si al releer ya no llega a la meta, no envía nada y avisa', async () => {
    await montar();
    leer.mockResolvedValue(crudaDe(4200, 5600));

    await act(async () => {
      await resultado.registrar();
    });

    expect(registrarApi).not.toHaveBeenCalled();
    expect(alRegistrado).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });

  it('si el día cambió con la pantalla abierta, no reasigna el intento: avisa y recarga', async () => {
    await montar();
    leer.mockResolvedValue(crudaDe(5400, 7120));
    registrarApi.mockRejectedValue(new DiaDeHabitosCambiadoError());

    await act(async () => {
      await resultado.registrar();
    });

    expect(alCambiarElDia).toHaveBeenCalledTimes(1);
    expect(alRegistrado).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('Tu día cambió', expect.stringContaining('Tu día cambió'));
  });

  it('un rechazo del servidor se dice con su mensaje, sin anunciar puntos', async () => {
    await montar();
    leer.mockResolvedValue(crudaDe(5400, 7120));
    registrarApi.mockRejectedValue(new ApiError(409, 'Ya registraste este hábito con tu captura.'));

    await act(async () => {
      await resultado.registrar();
    });

    expect(alRegistrado).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('No pudimos registrar tus km', 'Ya registraste este hábito con tu captura.');
    expect(resultado.registrando).toBe(false);
  });
});

describe('las funciones puras', () => {
  it('inicioDelDia: la medianoche local del día del registro, sin pasar por UTC', () => {
    const inicio = inicioDelDia('2026-11-04', new Date('2026-11-05T03:00:00Z'));
    expect([inicio.getFullYear(), inicio.getMonth(), inicio.getDate(), inicio.getHours()]).toEqual([2026, 10, 4, 0]);
    const sinFecha = inicioDelDia(null, new Date(2026, 10, 7, 15, 30));
    expect([sinFecha.getDate(), sinFecha.getHours(), sinFecha.getMinutes()]).toEqual([7, 0, 0]);
  });

  it('horaDeConexionDeHoy: la hora solo si se conectó el mismo día del registro', () => {
    const conectadoEn = new Date(2026, 10, 4, 14, 5).toISOString();
    expect(horaDeConexionDeHoy(conectadoEn, '2026-11-04')).toBe('14:05');
    expect(horaDeConexionDeHoy(conectadoEn, '2026-11-05')).toBeNull();
    expect(horaDeConexionDeHoy(null, '2026-11-04')).toBeNull();
    expect(horaDeConexionDeHoy('basura', '2026-11-04')).toBeNull();
    expect(horaDeConexionDeHoy(conectadoEn, null)).toBeNull();
  });
});
