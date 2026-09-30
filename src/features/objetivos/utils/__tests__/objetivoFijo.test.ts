import { describe, expect, it } from '@jest/globals';

import { ApiError, mensajeDeError } from '../../../../services/http/apiClient';
import type { RocaMaestraApi } from '../../types/objetivos.types';
import { definicionConAvance, esRocaMaestraFija } from '../objetivoFijo';

/**
 * D-234 del backend (2026-09-30): el objetivo de 90 días queda fijo una vez definido. Con la roca ya
 * guardada, el modal de Objetivos manda lo fijo tal cual y solo cambia el avance. No existía: el
 * modal mandaba lo que hubiera en los cuatro campos, y prellenaba el punto de partida con el avance
 * en las rocas viejas — con el backend nuevo eso rebotaba como un cambio (E-462).
 */

const ROCA_VIEJA_SIN_BASE: RocaMaestraApi = {
  id: 'r1',
  eje: 'TRABAJO',
  objetivo: 'Facturar 30.000 USD',
  meta: 30000,
  avance: 12000,
  unidad: 'USD',
  lineaBase: null,
  porcentaje: 40,
  creadoEn: '2026-09-07T10:00:00Z',
  actualizadoEn: '2026-09-07T10:00:00Z',
};

describe('definicionConAvance', () => {
  it('manda lo fijo idéntico a lo guardado y solo el avance nuevo', () => {
    const r = definicionConAvance({ ...ROCA_VIEJA_SIN_BASE, lineaBase: 5000 }, '19500');
    expect(r).toEqual({
      ok: true,
      definicion: { objetivo: 'Facturar 30.000 USD', meta: 30000, avance: 19500, unidad: 'USD', lineaBase: 5000 },
    });
  });

  it('una roca sin punto de partida sigue sin él: no se prellena con el avance', () => {
    const r = definicionConAvance(ROCA_VIEJA_SIN_BASE, '15000');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.definicion.lineaBase).toBeUndefined();
  });

  it('acepta coma decimal y rechaza vacío, texto o negativo', () => {
    const conComa = definicionConAvance(ROCA_VIEJA_SIN_BASE, '12,5');
    expect(conComa.ok && conComa.definicion.avance).toBe(12.5);
    expect(definicionConAvance(ROCA_VIEJA_SIN_BASE, '').ok).toBe(false);
    expect(definicionConAvance(ROCA_VIEJA_SIN_BASE, 'mucho').ok).toBe(false);
    expect(definicionConAvance(ROCA_VIEJA_SIN_BASE, '-1').ok).toBe(false);
  });

  it('un objetivo sin número no tiene avance que anotar', () => {
    const r = definicionConAvance({ ...ROCA_VIEJA_SIN_BASE, meta: null, avance: null, unidad: null }, '3');
    expect(r.ok).toBe(false);
  });
});

describe('esRocaMaestraFija', () => {
  const MENSAJE =
    'Tu objetivo de 90 días quedó fijo en tu Mapa de Renacimiento y no se cambia. Lo que sí puedes ajustar son tus objetivos semanales y tus acciones diarias.';
  const fija = new ApiError(409, MENSAJE, { codigo: 'ROCA_MAESTRA_FIJA', message: MENSAJE });

  it('reconoce el 409 ROCA_MAESTRA_FIJA y no otro 409 ni otro código', () => {
    expect(esRocaMaestraFija(fija)).toBe(true);
    expect(esRocaMaestraFija(new ApiError(409, 'ALREADY_PLANNED: ya existe', { message: 'x' }))).toBe(false);
    expect(esRocaMaestraFija(new ApiError(400, MENSAJE, { codigo: 'ROCA_MAESTRA_FIJA' }))).toBe(false);
    expect(esRocaMaestraFija(new Error(MENSAJE))).toBe(false);
  });

  it('el mensaje del servidor llega tal cual a la persona', () => {
    expect(mensajeDeError(fija, 'No pudimos guardar tu objetivo.')).toBe(MENSAJE);
  });
});
