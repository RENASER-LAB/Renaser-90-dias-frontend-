/**
 * El rechazo `MAPA_PENDIENTE` del servidor (issue #37 / backend #20, 2026-10-27). El código y el estado HTTP no están
 * confirmados (409 o 403), así que solo se reconoce el código, y cualquier otro rechazo sigue por su camino de siempre.
 */
import { describe, expect, it } from '@jest/globals';

import { ApiError, mensajeDeError } from '../../../../services/http/apiClient';
import { esMapaPendiente } from '../mapaPendiente';

const MENSAJE = 'Primero completa tu Mapa de Renacimiento: de ahí sale tu objetivo de 90 días.';

describe('esMapaPendiente', () => {
  it('reconoce el código en un 409 y en un 403', () => {
    expect(esMapaPendiente(new ApiError(409, MENSAJE, { codigo: 'MAPA_PENDIENTE', message: MENSAJE }))).toBe(true);
    expect(esMapaPendiente(new ApiError(403, MENSAJE, { codigo: 'MAPA_PENDIENTE', message: MENSAJE }))).toBe(true);
  });

  it('no confunde otros rechazos de las rocas', () => {
    expect(esMapaPendiente(new ApiError(409, 'fijo', { codigo: 'ROCA_MAESTRA_FIJA' }))).toBe(false);
    expect(esMapaPendiente(new ApiError(403, 'bloqueada', { codigo: 'ROCKS_LOCKED' }))).toBe(false);
    expect(esMapaPendiente(new ApiError(409, 'ya existe', { message: 'ALREADY_PLANNED' }))).toBe(false);
    expect(esMapaPendiente(new ApiError(409, 'sin cuerpo'))).toBe(false);
  });

  it('no lo reconoce en otro estado ni en un error que no es del servidor', () => {
    expect(esMapaPendiente(new ApiError(400, MENSAJE, { codigo: 'MAPA_PENDIENTE' }))).toBe(false);
    expect(esMapaPendiente(new ApiError(500, MENSAJE, { codigo: 'MAPA_PENDIENTE' }))).toBe(false);
    expect(esMapaPendiente(new Error(MENSAJE))).toBe(false);
    expect(esMapaPendiente(null)).toBe(false);
  });

  it('el mensaje del servidor llega tal cual a la persona', () => {
    const error = new ApiError(409, MENSAJE, { codigo: 'MAPA_PENDIENTE', message: MENSAJE });
    expect(mensajeDeError(error, 'No pudimos guardar tu objetivo.')).toBe(MENSAJE);
  });
});
