import { describe, expect, it } from '@jest/globals';

import type { RocaDiariaApi } from '../../types/objetivos.types';
import { light } from '../../../../theme/tokens';
import { accionesDelEje, agendadasDeDiasQueVienen, avanceDeLasAcciones, colorDePareto, etiquetaDeLaAccion, lineaDelObjetivo, partesDelObjetivo, unirAcciones } from '../planPrincipal';

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

describe('agendadasDeDiasQueVienen (#185)', () => {
  it('deja lo que el servidor ya tiene en los días que todavía no empezaron', () => {
    const manana = roca({ fecha: '2026-10-28' });
    const viernes = roca({ fecha: '2026-10-30' });
    expect(agendadasDeDiasQueVienen([manana, viernes], [], '2026-10-27').map(x => x.id)).toEqual([manana.id, viernes.id]);
  });

  it('el día en curso queda fuera: el servidor no deja rehacerlo (409), sea por /today o por la fecha de hoy', () => {
    const deHoy = roca({ fecha: '2026-10-27' });
    const mismoDiaDeLaSemana = roca({ fecha: '2026-10-27', eje: 'TRABAJO' });
    const manana = roca({ fecha: '2026-10-28' });
    expect(agendadasDeDiasQueVienen([deHoy, mismoDiaDeLaSemana, manana], [deHoy], '2026-10-27').map(x => x.id)).toEqual([manana.id]);
    // Sin /today (hoy todavía no tiene nada) pero con la fecha de hoy conocida: tampoco entra lo de hoy ni de antes.
    expect(agendadasDeDiasQueVienen([mismoDiaDeLaSemana, manana, roca({ fecha: '2026-10-26' })], [], '2026-10-27').map(x => x.id)).toEqual([manana.id]);
  });

  it('sin saber qué día es hoy en el servidor, se deja todo menos lo que /today dice que es de hoy', () => {
    const deHoy = roca({ fecha: '2026-10-27' });
    const manana = roca({ fecha: '2026-10-28' });
    expect(agendadasDeDiasQueVienen([deHoy, manana], [deHoy], null).map(x => x.id)).toEqual([manana.id]);
  });

  it('lo que espera señal no entra: la hoja lo trae aparte', () => {
    const esperando = roca({ fecha: '2026-10-28', pendienteDeEnvio: true });
    const confirmada = roca({ fecha: '2026-10-28' });
    expect(agendadasDeDiasQueVienen([esperando, confirmada], [], '2026-10-27').map(x => x.id)).toEqual([confirmada.id]);
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

describe('partesDelObjetivo y lineaDelObjetivo', () => {
  const NBSP = '\u00A0';
  it('las cifras son piezas enteras: «Inicio 82», «Actual 81», «Meta 80 kg» (sin «·», que quedaba colgado al partirse: E2E 03/11, #115)', () => {
    expect(partesDelObjetivo({ lineaBase: 82, avance: 81, meta: 80, unidad: 'kg' })).toEqual([`Inicio${NBSP}82`, `Actual${NBSP}81`, `Meta${NBSP}80${NBSP}kg`]);
    expect(partesDelObjetivo({ lineaBase: null, avance: 4, meta: 10, unidad: 'USD' })).toEqual([`Actual${NBSP}4`, `Meta${NBSP}10${NBSP}USD`]);
    expect(partesDelObjetivo({ lineaBase: null, avance: null, meta: null, unidad: null })).toBeNull();
  });
  it('ninguna pieza tiene un espacio normal: no se parte por dentro (miles con espacio duro, unidad pegada)', () => {
    for (const parte of partesDelObjetivo({ lineaBase: 1500000, avance: 14000.5, meta: 30000, unidad: 'S/' }) ?? []) expect(parte).not.toContain(' ');
    expect(partesDelObjetivo({ lineaBase: 10000, avance: 14000, meta: 30000, unidad: 'S/' })).toEqual([
      `Inicio${NBSP}10${NBSP}000`, `Actual${NBSP}14${NBSP}000`, `Meta${NBSP}30${NBSP}000${NBSP}S/`,
    ]);
  });
  it('issue #115 (2): una unidad que empieza con «/» va pegada a la cifra: «Meta 8/10»', () => {
    expect(partesDelObjetivo({ lineaBase: 5, avance: 5, meta: 8, unidad: '/10' })).toContain(`Meta${NBSP}8/10`);
    expect(partesDelObjetivo({ lineaBase: 5, avance: 5, meta: 8, unidad: ' /10 ' })).toContain(`Meta${NBSP}8/10`);
  });
  it('lineaDelObjetivo es la frase entera para el lector de pantalla: «Inicio 82 · Actual 81 · Meta 80 kg»', () => {
    expect(lineaDelObjetivo({ lineaBase: 82, avance: 81, meta: 80, unidad: 'kg' })).toBe(`Inicio${NBSP}82 · Actual${NBSP}81 · Meta${NBSP}80${NBSP}kg`);
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
