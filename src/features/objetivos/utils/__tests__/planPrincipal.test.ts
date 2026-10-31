import { describe, expect, it } from '@jest/globals';

import type { RocaDiariaApi } from '../../types/objetivos.types';
import { light } from '../../../../theme/tokens';
import { accionesDelEje, avanceDeLasAcciones, colorDePareto, etiquetaDeLaAccion, lineaDelObjetivo, unirAcciones } from '../planPrincipal';

let n = 0;
function roca(extra: Partial<RocaDiariaApi> = {}): RocaDiariaApi {
  n += 1;
  return {
    id: `r${n}`, fecha: '2026-10-27', posicion: 1, titulo: `Acción ${n}`, descripcion: null, color: 'VERDE', puntajeImpacto: 5, esDelegable: false,
    eje: 'CUERPO', rocaSemanalId: null, horaInicio: '09:00:00', horaFin: null, completada: false, completadaEn: null, puntosOtorgados: 0,
    bloqueada: false, acciones: [], ...extra,
  };
}

describe('accionesDelEje', () => {
  it('solo las del eje, por fecha, hora (sin hora al final del día) y posición', () => {
    const a = roca({ fecha: '2026-10-28', horaInicio: '08:00:00' });
    const b = roca({ fecha: '2026-10-27', horaInicio: null });
    const c = roca({ fecha: '2026-10-27', horaInicio: '16:00:00' });
    const d = roca({ fecha: '2026-10-27', horaInicio: '07:00:00', posicion: 2 });
    const e = roca({ fecha: '2026-10-27', horaInicio: '07:00:00', posicion: 1 });
    const otro = roca({ eje: 'TRABAJO' });
    expect(accionesDelEje([a, b, c, d, e, otro], 'CUERPO').map(x => x.id)).toEqual([e.id, d.id, c.id, b.id, a.id]);
  });

  it('no repite una acción que vino en dos lecturas', () => {
    const a = roca();
    expect(accionesDelEje([a, a, { ...a }], 'CUERPO')).toHaveLength(1);
  });
});

describe('unirAcciones', () => {
  it('gana la primera lectura de cada id (la de hoy es la que tiene el estado al día)', () => {
    const deHoy = roca({ id: 'x', completada: true });
    const delPlan = roca({ id: 'x', completada: false });
    const manana = roca({ id: 'y' });
    expect(unirAcciones([deHoy], [manana], [delPlan])).toEqual([deHoy, manana]);
  });
});

describe('avanceDeLasAcciones', () => {
  it('cuenta de hoy en adelante: «2 de 6»', () => {
    const rocas = [
      roca({ fecha: '2026-10-26', completada: true }),
      roca({ fecha: '2026-10-27', completada: true }),
      roca({ fecha: '2026-10-27', completada: true }),
      roca({ fecha: '2026-10-27' }),
      roca({ fecha: '2026-10-28' }),
      roca({ fecha: '2026-10-29' }),
      roca({ fecha: '2026-10-30' }),
      roca({ fecha: '2026-10-31' }),
    ];
    expect(avanceDeLasAcciones(rocas, '2026-10-27')).toEqual({ cumplidas: 2, total: 7 });
    expect(avanceDeLasAcciones([], '2026-10-27')).toEqual({ cumplidas: 0, total: 0 });
  });

  it('sin el día de hoy del servidor cuenta todo lo que hay', () => {
    expect(avanceDeLasAcciones([roca({ completada: true }), roca()], null)).toEqual({ cumplidas: 1, total: 2 });
  });
});

describe('etiquetaDeLaAccion', () => {
  it('«Mar 27 oct · 09:00»', () => {
    expect(etiquetaDeLaAccion({ fecha: '2026-10-27', horaInicio: '09:00:00' })).toBe('Mar 27 oct · 09:00');
    expect(etiquetaDeLaAccion({ fecha: '2026-11-01', horaInicio: '18:30:00' })).toBe('Dom 1 nov · 18:30');
  });
  it('sin hora, solo el día', () => {
    expect(etiquetaDeLaAccion({ fecha: '2026-10-28', horaInicio: null })).toBe('Mié 28 oct');
  });
});

describe('lineaDelObjetivo', () => {
  it('«Inicio 82 · Actual 81 · Meta 80 kg»', () => {
    expect(lineaDelObjetivo({ lineaBase: 82, avance: 81, meta: 80, unidad: 'kg' })).toBe('Inicio 82 · Actual 81 · Meta 80 kg');
    expect(lineaDelObjetivo({ lineaBase: 0, avance: 1, meta: 3, unidad: null })).toBe('Inicio 0 · Actual 1 · Meta 3');
  });
  it('sin punto de partida, sin «Inicio»; sin meta medible, no hay línea', () => {
    expect(lineaDelObjetivo({ lineaBase: null, avance: 4, meta: 10, unidad: 'USD' })).toBe('Actual 4 · Meta 10 USD');
    expect(lineaDelObjetivo({ lineaBase: null, avance: null, meta: null, unidad: null })).toBeNull();
  });
});

describe('colorDePareto', () => {
  it('verde, ámbar del dorado y rojo del tema', () => {
    expect(colorDePareto('VERDE', light)).toBe(light.success);
    expect(colorDePareto('AMARILLA', light)).toBe(light.goldGrad[0]);
    expect(colorDePareto('ROJA', light)).toBe(light.danger);
  });
});
