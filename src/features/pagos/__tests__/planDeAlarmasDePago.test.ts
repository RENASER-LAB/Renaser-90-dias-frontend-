import { describe, expect, it, jest } from '@jest/globals';

import type { CuotaDePago } from '../api/pagosSchemas';
import { diasParaVencer, diferenciaDeAlarmas, MARGEN_MS, planDeAlarmasDePago } from '../notificaciones/planDeAlarmasDePago';
import { PREFERENCIAS_DE_PAGOS_POR_DEFECTO, type PreferenciasDePagos } from '../notificaciones/preferenciasDePagos';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const nb = (texto: string): string => texto.replace(/ /g, ' ');
const cuota = (id: string, venceEl: string, pagada = false, monto = 1000): CuotaDePago => ({ id, venceEl, monto, pagada, marcadaEn: null, marcadaPor: null });
/** 3 de noviembre de 2026, 10:00 en el teléfono (Lima en las pruebas). */
const AHORA = new Date(2026, 10, 3, 10, 0).getTime();
const a = (anio: number, mes: number, dia: number, h = 9, m = 0) => new Date(anio, mes - 1, dia, h, m).getTime();
const plan = (cuotas: CuotaDePago[], preferencias: PreferenciasDePagos = PREFERENCIAS_DE_PAGOS_POR_DEFECTO, ahoraMs = AHORA, moneda: string | null = 'PEN') =>
  planDeAlarmasDePago({ cuotas, moneda, preferencias, ahoraMs });

describe('qué alarmas de pago corresponden', () => {
  it('por defecto, 3 días antes y el mismo día a las 09:00 de cada cuota pendiente', () => {
    const alarmas = plan([cuota('a', '2026-11-15')]);

    expect(alarmas.map(x => x.cuandoMs)).toEqual([a(2026, 11, 12), a(2026, 11, 15)]);
    expect(alarmas[0].titulo).toBe('Tu cuota vence en 3 días');
    expect(alarmas[1].titulo).toBe('Tu cuota vence hoy');
    expect(alarmas[0].cuerpo).toBe(`${nb('S/ 1 000')} · 15 de noviembre de 2026. Toca para ver tu cronograma.`);
  });

  it('el aviso de 1 día antes dice «mañana»', () => {
    const alarmas = plan([cuota('a', '2026-11-15')], { activos: true, antelaciones: [1], hora: '09:00' });
    expect(alarmas).toHaveLength(1);
    expect(alarmas[0].cuandoMs).toBe(a(2026, 11, 14));
    expect(alarmas[0].titulo).toBe('Tu cuota vence mañana');
  });

  it('la hora elegida manda', () => {
    const alarmas = plan([cuota('a', '2026-11-15')], { activos: true, antelaciones: [0], hora: '18:30' });
    expect(alarmas[0].cuandoMs).toBe(a(2026, 11, 15, 18, 30));
  });

  it('una cuota pagada no tiene ninguna alarma', () => {
    expect(plan([cuota('a', '2026-11-15', true)])).toEqual([]);
    const mezcla = plan([cuota('a', '2026-11-15', true), cuota('b', '2026-12-15')]);
    expect(mezcla.map(x => x.cuandoMs)).toEqual([a(2026, 12, 12), a(2026, 12, 15)]);
  });

  it('solo lo que viene: un instante que ya pasó, o que pasa en menos de un minuto, no se programa', () => {
    // Hoy es 3 nov a las 10:00. Una cuota del 5 nov: «3 días antes» fue el 2 (pasó) y queda «el mismo día».
    expect(plan([cuota('a', '2026-11-05')]).map(x => x.cuandoMs)).toEqual([a(2026, 11, 5)]);
    // Una cuota de hoy, con el aviso a las 09:00 que ya pasó, no suena.
    expect(plan([cuota('a', '2026-11-03')])).toEqual([]);
    // Pendiente y vencida hace meses: ni reproche ni ruido.
    expect(plan([cuota('a', '2026-08-01')])).toEqual([]);
    // Por debajo del margen de un minuto tampoco.
    expect(plan([cuota('a', '2026-11-03')], { activos: true, antelaciones: [0], hora: '10:00' }, new Date(2026, 10, 3, 9, 59, 30).getTime())).toEqual([]);
    expect(MARGEN_MS).toBe(60_000);
  });

  it('apagado, o encendido sin ningún aviso elegido: ninguna', () => {
    expect(plan([cuota('a', '2026-11-15')], { ...PREFERENCIAS_DE_PAGOS_POR_DEFECTO, activos: false })).toEqual([]);
    expect(plan([cuota('a', '2026-11-15')], { ...PREFERENCIAS_DE_PAGOS_POR_DEFECTO, antelaciones: [] })).toEqual([]);
  });

  it('una fecha que no existe no rompe nada', () => {
    expect(plan([cuota('a', '2026-02-31'), cuota('b', 'sin fecha')])).toEqual([]);
  });

  it('dos avisos al mismo instante se juntan en uno: Android puede callar el sonido del segundo', () => {
    // La cuota del 15 avisa «3 días antes» el 12; la del 13 avisa «1 día antes» el 12 → a la misma hora.
    const alarmas = plan([cuota('a', '2026-11-15'), cuota('b', '2026-11-13', false, 500)], { activos: true, antelaciones: [3, 1], hora: '09:00' });
    const del12 = alarmas.find(x => x.cuandoMs === a(2026, 11, 12));
    expect(del12?.titulo).toBe('Tienes 2 cuotas por pagar');
    expect(del12?.cuerpo).toContain(nb('S/ 1 000') + ' el 15 nov');
    expect(del12?.cuerpo).toContain(nb('S/ 500') + ' el 13 nov');
    expect(new Set(alarmas.map(x => x.id)).size).toBe(alarmas.length);
  });

  it('el identificador es el instante: el mismo instante da el mismo id (programar lo REEMPLAZA)', () => {
    const una = plan([cuota('a', '2026-11-15')])[1];
    const otra = plan([cuota('a', '2026-11-15')])[1];
    expect(una.id).toBe(otra.id);
    expect(una.id).toBe(`pago-${a(2026, 11, 15)}`);
  });

  it('cuando una de dos cuotas del mismo día se paga, la alarma cambia de texto (queda la otra)', () => {
    const dos = plan([cuota('a', '2026-11-15'), cuota('b', '2026-11-15', false, 500)], { activos: true, antelaciones: [0], hora: '09:00' });
    const una = plan([cuota('a', '2026-11-15'), cuota('b', '2026-11-15', true, 500)], { activos: true, antelaciones: [0], hora: '09:00' });
    expect(dos[0].id).toBe(una[0].id);
    expect(dos[0].firma).not.toBe(una[0].firma);
    expect(dos[0].titulo).toBe('Tienes 2 cuotas por pagar');
    expect(una[0].titulo).toBe('Tu cuota vence hoy');
  });

  it('una cuota de un diplomado de un año, de otro año, dice la fecha completa', () => {
    const alarmas = plan([cuota('a', '2027-01-15')], { activos: true, antelaciones: [0], hora: '09:00' });
    expect(alarmas[0].cuerpo).toContain('15 de enero de 2027');
  });
});

describe('cuántos días faltan', () => {
  it('cuenta días de calendario desde hoy', () => {
    expect(diasParaVencer('2026-11-15', AHORA)).toBe(12);
    expect(diasParaVencer('2026-11-03', AHORA)).toBe(0);
    expect(diasParaVencer('2026-11-01', AHORA)).toBe(-2);
    expect(diasParaVencer('no', AHORA)).toBeNull();
  });
});

describe('lo que hay que cambiar en el teléfono', () => {
  const alarmas = plan([cuota('a', '2026-11-15')]);
  const firmas = Object.fromEntries(alarmas.map(x => [x.id, x.firma]));
  const ids = new Set(alarmas.map(x => x.id));

  it('sin nada puesto, se programa todo; con todo puesto y al día, nada', () => {
    expect(diferenciaDeAlarmas(alarmas, {}, new Set()).programar).toHaveLength(2);
    expect(diferenciaDeAlarmas(alarmas, firmas, ids)).toEqual({ cancelar: [], programar: [] });
  });

  it('una alarma que el teléfono olvidó se vuelve a poner', () => {
    const faltaUna = new Set([alarmas[0].id]);
    expect(diferenciaDeAlarmas(alarmas, firmas, faltaUna).programar.map(x => x.id)).toEqual([alarmas[1].id]);
  });

  it('una que cambió de texto se vuelve a programar; una que ya no corresponde se cancela', () => {
    const vieja = { ...firmas, [alarmas[0].id]: 'otra-firma' };
    expect(diferenciaDeAlarmas(alarmas, vieja, ids).programar.map(x => x.id)).toEqual([alarmas[0].id]);
    const sobrante = { ...firmas, 'pago-123': 'x' };
    expect(diferenciaDeAlarmas(alarmas, sobrante, new Set([...ids, 'pago-123'])).cancelar).toEqual(['pago-123']);
  });

  it('cancela las que el sistema tiene con nuestro prefijo aunque el teléfono no las haya anotado, y no toca las ajenas', () => {
    const resultado = diferenciaDeAlarmas([], {}, new Set(['pago-999', 'habito-1-inicio', 'evento-3']));
    expect(resultado.cancelar).toEqual(['pago-999']);
  });
});
