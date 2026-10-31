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
  const NBSP = '\u00A0';
  it('«Inicio 82 · Actual 81 · Meta 80 kg»', () => {
    expect(lineaDelObjetivo({ lineaBase: 82, avance: 81, meta: 80, unidad: 'kg' })).toBe(
      `Inicio${NBSP}82 · Actual${NBSP}81 · Meta${NBSP}80${NBSP}kg`,
    );
    expect(lineaDelObjetivo({ lineaBase: 0, avance: 1, meta: 3, unidad: null })).toBe(`Inicio${NBSP}0 · Actual${NBSP}1 · Meta${NBSP}3`);
  });
  it('sin punto de partida, sin «Inicio»; sin meta medible, no hay línea', () => {
    expect(lineaDelObjetivo({ lineaBase: null, avance: 4, meta: 10, unidad: 'USD' })).toBe(`Actual${NBSP}4 · Meta${NBSP}10${NBSP}USD`);
    expect(lineaDelObjetivo({ lineaBase: null, avance: null, meta: null, unidad: null })).toBeNull();
  });
  it('los miles se separan como en el resto de la app («30 000», con espacio duro) y la unidad va pegada a la cifra', () => {
    const linea = lineaDelObjetivo({ lineaBase: 10000, avance: 14000, meta: 30000, unidad: 'S/' }) as string;
    expect(linea).toBe(`Inicio${NBSP}10${NBSP}000 · Actual${NBSP}14${NBSP}000 · Meta${NBSP}30${NBSP}000${NBSP}S/`);
    expect(linea).not.toContain('30000');
  });
  it('si el renglón se parte, es entre partes (en « · »): ningún espacio normal queda dentro de una cifra ni antes de la unidad', () => {
    const linea = lineaDelObjetivo({ lineaBase: 1500000, avance: 14000.5, meta: 30000, unidad: 'S/' }) as string;
    // Lo único que puede partirse son los espacios normales, y todos están pegados a un «·».
    const espaciosNormales = linea.split('').flatMap((ch, i) => (ch === ' ' ? [i] : []));
    for (const i of espaciosNormales) expect(linea[i - 1] === '·' || linea[i + 1] === '·').toBe(true);
    expect(linea).toContain(`1${NBSP}500${NBSP}000`);
    expect(linea).toContain(`14${NBSP}000.5`);
  });
});

describe('colorDePareto', () => {
  it('verde, ámbar del dorado y rojo del tema', () => {
    expect(colorDePareto('VERDE', light)).toBe(light.success);
    expect(colorDePareto('AMARILLA', light)).toBe(light.goldGrad[0]);
    expect(colorDePareto('ROJA', light)).toBe(light.danger);
  });
});
