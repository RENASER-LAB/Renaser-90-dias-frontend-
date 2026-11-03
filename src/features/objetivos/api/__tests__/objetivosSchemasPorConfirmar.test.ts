import { describe, expect, it } from '@jest/globals';

import { objetivosSchemas, validarRespuesta } from '../objetivosSchemas';
import type { RocaMaestraApi } from '../../types/objetivos.types';

/**
 * `GET /rocks/master` suma `origin` y `confirmed` por fila (spec 026). Se leen con tolerancia: un servidor anterior no los
 * manda, y un valor desconocido no rompe la lista (AGENTS.md: un APK publicado no se rompe).
 */
const base = {
  id: 'm1', eje: 'CUERPO', objetivo: 'Bajar de peso', meta: null, avance: null, unidad: null, lineaBase: null, porcentaje: null,
  creadoEn: '2026-11-02T10:00:00Z', actualizadoEn: '2026-11-02T10:00:00Z',
};
const leer = (fila: Record<string, unknown>) =>
  validarRespuesta<RocaMaestraApi[]>(objetivosSchemas.rocasMaestras, [fila], 'GET /api/v1/rocks/master')[0];

describe('origin y confirmed de una roca maestra', () => {
  it('un objetivo del diagnóstico sin confirmar llega tal cual', () => {
    const r = leer({ ...base, origin: 'DIAGNOSTICO', confirmed: false });
    expect(r.origin).toBe('DIAGNOSTICO');
    expect(r.confirmed).toBe(false);
  });

  it('un servidor anterior no manda los campos: se leen como `PLAN` y confirmado', () => {
    const r = leer(base);
    expect(r.origin).toBe('PLAN');
    expect(r.confirmed).toBe(true);
  });

  it('un origen que esta versión no conoce, o un `confirmed` nulo, no rompe la lista', () => {
    const r = leer({ ...base, origin: 'OTRO_ORIGEN_NUEVO', confirmed: null });
    expect(r.origin).toBe('PLAN');
    expect(r.confirmed).toBe(true);
  });

  it('las filas del Mapa o del Plan confirmadas se leen igual que siempre', () => {
    expect(leer({ ...base, origin: 'MAPA', confirmed: true })).toMatchObject({ origin: 'MAPA', confirmed: true });
    expect(leer({ ...base, origin: 'PLAN', confirmed: true })).toMatchObject({ origin: 'PLAN', confirmed: true });
  });

  it('un campo nuevo que no conocemos se conserva sin romper (passthrough)', () => {
    expect((leer({ ...base, algoNuevo: 7 }) as unknown as { algoNuevo: number }).algoNuevo).toBe(7);
  });
});
