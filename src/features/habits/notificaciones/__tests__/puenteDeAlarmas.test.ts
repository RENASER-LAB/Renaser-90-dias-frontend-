/**
 * El puente de un hábito cumplido (issue #33): qué alarmas de FECHA reemplazan a las que se repiten mientras el resto de
 * hoy no debe sonar. Es lo puro: no toca la librería ni el almacenamiento.
 *
 * Las pruebas corren en `America/Lima` (jest.config.js) y con el reloj en el martes 20/10/2026.
 */
import { describe, expect, it } from '@jest/globals';

import type { CombinacionDeAlarma } from '../utils/combinacionDeAlarma';
import type { DiaPropio } from '../utils/alarmasPorDia';
import {
  DIAS_DEL_PUENTE,
  identificadorDelPuente,
  planDelPuente,
  puenteQueCorresponde,
} from '../utils/puenteDeAlarmas';
import type { EntradaDeRepeticiones } from '../utils/repeticionesDeAlarma';

const HABITO = 'h-despertar';

const c = (sonido: boolean, vibracion: boolean, voz = false, repetir = false): CombinacionDeAlarma => ({
  sonido, vibracion, voz, repetir,
});

const fecha = (y: number, m: number, d: number, h = 0, mi = 0) => new Date(y, m - 1, d, h, mi, 0, 0);

const entrada = (cambios: Partial<EntradaDeRepeticiones> = {}): EntradaDeRepeticiones => ({
  habitoId: HABITO,
  horaGeneral: '06:30',
  avisosGenerales: [30, 10, 0],
  dias: null,
  alarmaGeneral: null,
  ...cambios,
});

const dia = (iso: DiaPropio['iso'], cambios: Partial<DiaPropio> = {}): DiaPropio => ({
  iso, activo: true, hora: null, avisos: null, ...cambios,
});

/** Martes 20/10/2026. */
const hoyA = (h: number, mi = 0) => fecha(2026, 10, 20, h, mi);

describe('qué le queda a hoy', () => {
  it('cumplido tras el primer aviso (30 min antes), quedan el de 10 y el de la hora', () => {
    const plan = planDelPuente(entrada(), hoyA(6, 5));
    expect(plan.quedanHoy).toBe(2);
  });

  it('cumplido a las 06:00 de un hábito de las 06:30, con aviso a la hora, queda 1 (la de las 06:30)', () => {
    expect(planDelPuente(entrada({ avisosGenerales: [0] }), hoyA(6, 0)).quedanHoy).toBe(1);
  });

  it('con todos los avisos ya sonados no queda ninguno: no hace falta puente', () => {
    expect(planDelPuente(entrada(), hoyA(6, 31)).quedanHoy).toBe(0);
    expect(puenteQueCorresponde('20261020', entrada(), hoyA(6, 31))).toBeNull();
  });

  it('un aviso que suena justo ahora ya no cuenta como por venir', () => {
    expect(planDelPuente(entrada({ avisosGenerales: [0] }), hoyA(6, 30)).quedanHoy).toBe(0);
  });

  it('sin aviso, o con el día de hoy apagado, no queda nada', () => {
    expect(planDelPuente(entrada({ avisosGenerales: [] }), hoyA(5, 0)).quedanHoy).toBe(0);
    expect(planDelPuente(entrada({ dias: [dia(2, { activo: false })] }), hoyA(5, 0)).quedanHoy).toBe(0);
  });

  it('un día con aviso propio cuenta el suyo: hoy sin aviso, aunque el general tenga', () => {
    expect(planDelPuente(entrada({ dias: [dia(2, { avisos: [] })] }), hoyA(5, 0)).quedanHoy).toBe(0);
    expect(planDelPuente(entrada({ dias: [dia(2, { avisos: [0] })] }), hoyA(5, 0)).quedanHoy).toBe(1);
  });

  it('un día con hora propia cuenta SU hora', () => {
    // El martes va a las 09:00: a las 08:00 todavía le queda el aviso de la hora.
    const dias = [dia(2, { hora: '09:00' })];
    expect(planDelPuente(entrada({ avisosGenerales: [0], dias }), hoyA(8, 0)).quedanHoy).toBe(1);
    expect(planDelPuente(entrada({ avisosGenerales: [0], dias }), hoyA(9, 1)).quedanHoy).toBe(0);
  });
});

describe('el puente: mañana en adelante, nunca hoy', () => {
  it('es una alarma de fecha por aviso y por día de los 7 siguientes, sin ninguna de hoy', () => {
    const { pedidos } = planDelPuente(entrada(), hoyA(6, 5));
    expect(pedidos).toHaveLength(DIAS_DEL_PUENTE * 3);
    expect(pedidos.some(p => p.fecha === '20261020')).toBe(false);
    expect(pedidos[0].fecha).toBe('20261021');
    expect(pedidos.at(-1)?.fecha).toBe('20261027');
    // Mañana, en orden: el aviso de 30 min, el de 10 y el de la hora.
    expect(pedidos.slice(0, 3).map(p => p.instanteMs)).toEqual([
      fecha(2026, 10, 21, 6, 0).getTime(),
      fecha(2026, 10, 21, 6, 20).getTime(),
      fecha(2026, 10, 21, 6, 30).getTime(),
    ]);
    expect(pedidos.slice(0, 3).map(p => p.minutosAntes)).toEqual([30, 10, 0]);
    expect(pedidos[0].horaDelDia).toBe('06:30');
  });

  it('sin avisos que sonar hoy igual arma el plan, pero el llamador no lo usa (quedanHoy = 0)', () => {
    const plan = planDelPuente(entrada(), hoyA(7, 0));
    expect(plan.quedanHoy).toBe(0);
    expect(plan.pedidos).toHaveLength(21);
  });

  it('esquema diario: el primer aviso lleva `habito-{id}-inicio` (la etiqueta del push de respaldo) y los demás, el del puente', () => {
    const { pedidos } = planDelPuente(entrada(), hoyA(6, 5));
    expect(pedidos[0].identificador).toBe('habito-h-despertar-inicio');
    expect(pedidos[1].identificador).toBe('habito-h-despertar-pte-20261021-1');
    expect(pedidos[2].identificador).toBe('habito-h-despertar-pte-20261021-2');
    expect(pedidos[3].identificador).toBe('habito-h-despertar-pte-20261022-0');
    // Ninguno se repite: dos alarmas con el mismo identificador se reemplazarían.
    expect(new Set(pedidos.map(p => p.identificador)).size).toBe(pedidos.length);
    expect(pedidos.filter(p => p.identificador.endsWith('-inicio'))).toHaveLength(1);
    expect(identificadorDelPuente('h-1', '20261021', 2)).toBe('habito-h-1-pte-20261021-2');
  });

  it('esquema por día: cada alarma lleva el identificador del día (`habito-{id}-d{iso}-{n}`), uno por día de la semana', () => {
    const dias = [dia(2, { hora: '09:00' })];
    const { pedidos } = planDelPuente(entrada({ avisosGenerales: [0], dias }), hoyA(6, 0));
    // Mañana es miércoles (3) y el último día de la ventana, el martes siguiente (2).
    expect(pedidos.map(p => p.identificador)).toEqual([
      'habito-h-despertar-d3-0', 'habito-h-despertar-d4-0', 'habito-h-despertar-d5-0', 'habito-h-despertar-d6-0',
      'habito-h-despertar-d7-0', 'habito-h-despertar-d1-0', 'habito-h-despertar-d2-0',
    ]);
    // El martes siguiente va a SU hora propia (09:00), no a la general.
    expect(pedidos.at(-1)?.instanteMs).toBe(fecha(2026, 10, 27, 9, 0).getTime());
    expect(pedidos[0].instanteMs).toBe(fecha(2026, 10, 21, 6, 30).getTime());
  });

  it('un día apagado o sin aviso no entra al puente', () => {
    const dias = [dia(3, { activo: false }), dia(4, { avisos: [] })];
    const { pedidos } = planDelPuente(entrada({ avisosGenerales: [0], dias }), hoyA(6, 0));
    expect(pedidos.map(p => p.fecha)).not.toContain('20261021');
    expect(pedidos.map(p => p.fecha)).not.toContain('20261022');
    expect(pedidos).toHaveLength(5);
  });

  it('cada día suena como dice SU combinación', () => {
    const dias = [dia(3, { alarma: c(false, true) })];
    const { pedidos } = planDelPuente(entrada({ avisosGenerales: [0], alarmaGeneral: c(true, true), dias }), hoyA(6, 0));
    expect(pedidos[0].alarma).toEqual(c(false, true));
    expect(pedidos[1].alarma).toEqual(c(true, true));
  });

  it('con un cambio de hora pendiente, cada día usa la hora que rige en SU fecha (D-91)', () => {
    const cambio = { horaDeHoy: '06:30', horaNueva: '10:00', desde: '2026-10-22' };
    const { pedidos } = planDelPuente(entrada({ avisosGenerales: [0], cambio }), hoyA(6, 0));
    const hora = (f: string) => pedidos.find(p => p.fecha === f)?.horaDelDia;
    expect(hora('20261021')).toBe('06:30');
    expect(hora('20261022')).toBe('10:00');
    expect(hora('20261027')).toBe('10:00');
  });

  it('cruce de medianoche: el aviso de las 23:40 de esta noche es el de MAÑANA y el puente lo conserva', () => {
    // Un hábito a las 00:10 con aviso 30 min antes suena a las 23:40 del día anterior.
    const e = entrada({ horaGeneral: '00:10', avisosGenerales: [30, 0] });
    // A las 22:00 del martes: hoy ya sonó todo lo del hábito de hoy (23:40 del lunes y 00:10 del martes).
    const plan = planDelPuente(e, hoyA(22, 0));
    expect(plan.quedanHoy).toBe(0);
    const primero = plan.pedidos[0];
    expect(primero.fecha).toBe('20261021'); // es del hábito de mañana…
    expect(primero.instanteMs).toBe(fecha(2026, 10, 20, 23, 40).getTime()); // …y suena esta noche
    expect(primero.horaDelDia).toBe('00:10');
  });

  it('si el aviso de mañana que cae esta noche ya pasó, no se pone', () => {
    const e = entrada({ horaGeneral: '00:10', avisosGenerales: [30, 0] });
    const { pedidos } = planDelPuente(e, hoyA(23, 50));
    expect(pedidos[0].instanteMs).toBe(fecha(2026, 10, 21, 0, 10).getTime());
    expect(pedidos[0].minutosAntes).toBe(0);
    expect(pedidos[0].n).toBe(1);
  });
});

describe('cuándo corresponde un puente armado', () => {
  it('cumplido hoy y con avisos por venir: hoy; si no, ninguno', () => {
    expect(puenteQueCorresponde('20261020', entrada(), hoyA(6, 5))).toBe('20261020');
    // Cumplido AYER: hoy el hábito se vive normal.
    expect(puenteQueCorresponde('20261019', entrada(), hoyA(6, 5))).toBeNull();
    // Sin nota.
    expect(puenteQueCorresponde(null, entrada(), hoyA(6, 5))).toBeNull();
    expect(puenteQueCorresponde(undefined, entrada(), hoyA(6, 5))).toBeNull();
  });
});
