/**
 * Registro con foto de una ACCIÓN DEL DÍA pedido por el acompañante (D-178 del backend, decisión del
 * dueño 2026-09-26): mismo flujo que un hábito, pero contra `/rocks/{id}/...`.
 */
import { describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '../../../../services/http/apiClient';
import { RechazoParaMostrar } from '../../../habits/utils/destinoDeFoto';
import type { RocaDiariaApi } from '../../types/objetivos.types';
import {
  estadoDeAccionParaFoto,
  reglasDeAccion,
  registrarAccionConFoto,
  type DependenciasDeLaAccion,
} from '../registroDeAccionConFoto';

jest.mock('../../api/objetivosApi', () => ({ obtenerRocasDeHoy: jest.fn() }));
jest.mock('../sellarRocaDiaria', () => ({ sellarRocaDiaria: jest.fn() }));

function roca(extra: Partial<RocaDiariaApi> = {}): RocaDiariaApi {
  return {
    id: 'verde-1',
    fecha: '2026-09-25',
    posicion: 1,
    titulo: 'Llamar a 3 clientes',
    descripcion: null,
    color: 'VERDE',
    puntajeImpacto: 8,
    esDelegable: false,
    eje: 'TRABAJO',
    rocaSemanalId: null,
    horaInicio: null,
    horaFin: null,
    completada: false,
    completadaEn: null,
    puntosOtorgados: 0,
    bloqueada: false,
    acciones: [],
    ...extra,
  };
}

const VERDE = roca();
const AMARILLA = roca({ id: 'amarilla-2', posicion: 2, color: 'AMARILLA', titulo: 'Enviar 2 propuestas', bloqueada: true });
const FOTO = { uri: 'file:///foto.jpg', mimeType: 'image/jpeg', tipo: 'FOTO' as const, tomadaEn: '2026-09-26T03:00:00.000Z' };
const ENTRADA = { registroId: 'verde-1', archivo: FOTO, respuesta: '', conPregunta: false, evidenciaYaSubida: false };

function deps(extra: Partial<DependenciasDeLaAccion> = {}): DependenciasDeLaAccion {
  return {
    sellar: jest.fn(async () => 20) as unknown as DependenciasDeLaAccion['sellar'],
    rocasDeHoy: jest.fn(async () => [VERDE, AMARILLA]),
    ...extra,
  };
}

describe('estadoDeAccionParaFoto', () => {
  it('pendiente y desbloqueada: se abre la cámara', () => {
    expect(estadoDeAccionParaFoto([VERDE, AMARILLA], 'verde-1')).toEqual({ tipo: 'disponible', evidenciaYaSubida: false });
  });

  it('Pareto: bloqueada, con el título de la verde de su eje', () => {
    expect(estadoDeAccionParaFoto([VERDE, AMARILLA], 'amarilla-2')).toEqual({
      tipo: 'bloqueada',
      primero: 'Llamar a 3 clientes',
    });
  });

  it('ya completada, o que no está entre las de hoy', () => {
    expect(estadoDeAccionParaFoto([{ ...VERDE, completada: true }], 'verde-1')).toEqual({ tipo: 'completado' });
    expect(estadoDeAccionParaFoto([VERDE], 'de-ayer')).toEqual({ tipo: 'no-es-de-hoy' });
  });
});

describe('registrarAccionConFoto', () => {
  it('sube por el camino de las rocas, con el instante de la foto, y devuelve los puntos del servidor', async () => {
    const d = deps();
    await expect(registrarAccionConFoto(ENTRADA, d)).resolves.toEqual({ puntosOtorgados: 20, yaEstabaCompletado: false });
    expect(d.sellar).toHaveBeenCalledWith('verde-1', { archivo: FOTO, texto: '' });
  });

  it('409 y ya figura completada (otro toque, otro teléfono): se da por bueno', async () => {
    const d = deps({
      sellar: jest.fn(async () => {
        throw new ApiError(409, 'ALREADY_COMPLETED: esta roca ya tiene evidencia');
      }) as unknown as DependenciasDeLaAccion['sellar'],
      rocasDeHoy: jest.fn(async () => [{ ...VERDE, completada: true, puntosOtorgados: 20 }]),
    });
    await expect(registrarAccionConFoto(ENTRADA, d)).resolves.toEqual({ puntosOtorgados: 20, yaEstabaCompletado: true });
  });

  it('403 GREEN_NOT_EVIDENCED: rechazo legible que nombra la verde', async () => {
    const d = deps({
      sellar: jest.fn(async () => {
        throw new ApiError(403, 'GREEN_NOT_EVIDENCED: primero hay que completar la roca VERDE de este eje');
      }) as unknown as DependenciasDeLaAccion['sellar'],
    });
    const intento = registrarAccionConFoto({ ...ENTRADA, registroId: 'amarilla-2' }, d);
    await expect(intento).rejects.toBeInstanceOf(RechazoParaMostrar);
    await expect(registrarAccionConFoto({ ...ENTRADA, registroId: 'amarilla-2' }, d)).rejects.toThrow(
      '«Llamar a 3 clientes»'
    );
  });

  it('400 EXIF_MISMATCH: pide sacarla de nuevo', async () => {
    const d = deps({
      sellar: jest.fn(async () => {
        throw new ApiError(400, 'EXIF_MISMATCH: el timestamp de la foto difiere mas de 15 minutos');
      }) as unknown as DependenciasDeLaAccion['sellar'],
    });
    await expect(registrarAccionConFoto(ENTRADA, d)).rejects.toThrow('Tomar otra');
  });

  it('otro error del servidor sale tal cual (el hook lo muestra con su mensaje)', async () => {
    const error = new ApiError(500, 'Error interno');
    const d = deps({
      sellar: jest.fn(async () => {
        throw error;
      }) as unknown as DependenciasDeLaAccion['sellar'],
    });
    await expect(registrarAccionConFoto(ENTRADA, d)).rejects.toBe(error);
  });

  it('sin foto no sube nada', async () => {
    const d = deps();
    await expect(registrarAccionConFoto({ ...ENTRADA, archivo: null }, d)).rejects.toBeInstanceOf(RechazoParaMostrar);
    expect(d.sellar).not.toHaveBeenCalled();
  });
});

describe('reglasDeAccion', () => {
  it('lee el estado de GET /rocks/today y nunca llama a alConfirmarEvidencia (se sube y cierra en una llamada)', async () => {
    const d = deps();
    const reglas = reglasDeAccion(d);
    const alConfirmar = jest.fn();
    await expect(reglas.estadoFresco('amarilla-2')).resolves.toMatchObject({ tipo: 'bloqueada' });
    await expect(reglas.registrar(ENTRADA, alConfirmar)).resolves.toMatchObject({ puntosOtorgados: 20 });
    expect(alConfirmar).not.toHaveBeenCalled();
  });
});
