import { describe, expect, it } from '@jest/globals';

import type { RocaMaestraApi, RocaSemanalApi } from '../../types/objetivos.types';
import {
  DIAS_DEL_PROGRAMA,
  ETIQUETA_DEL_ESTADO,
  diaUnoDelPrograma,
  estadoDeLaSemana,
  fechaCorta,
  fechasDeLaSemanaDelPrograma,
  fechasDelMes,
  mesAlAbrir,
  rangoDeFechas,
  rangoDelMes,
  rocaDelEje,
  sePuedeOrganizar,
  semanasDeLaHoja,
  sumarDias,
} from '../mesDelPrograma';
import { semanaDe } from '../periodoDelPrograma';

/**
 * «Planificar mi mes» (spec 028): las semanas del programa con sus fechas reales y su estado. Tiene que dar lo mismo que la cuenta del
 * servidor (D-203, `periodoDelPrograma`): semanas de lunes a domingo, trece, la 1 desde el Día 1 y la 13 hasta el día 90.
 */

/** Lunes 7/09/2026, al mediodía. Los días siguientes dan los siete posibles días de inicio. */
const UN_LUNES = new Date(2026, 8, 7, 12, 0);
/** Cuándo empezó cada uno: 0 = lunes … 6 = domingo. */
const inicio = (offset: number) => sumarDias(UN_LUNES, offset);
/** «Hoy» para quien empezó en `diaUno` y va por el día `dia` del programa. */
const hoyEnElDia = (diaUno: Date, dia: number) => sumarDias(diaUno, dia - 1);
const iso = (d: Date | undefined) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null);
const fechasIso = (numero: number, diaUno: Date, dia = 1) => {
  const f = fechasDeLaSemanaDelPrograma(numero, dia, hoyEnElDia(diaUno, dia));
  return f ? { desde: iso(f.desde), hasta: iso(f.hasta) } : null;
};

describe('las fechas de cada semana del programa', () => {
  it('empezando un lunes: la 1 va de lunes a domingo y la 13 termina el día 90 (6 días: lunes a sábado)', () => {
    const diaUno = inicio(0); // lunes 7 sep
    expect(fechasIso(1, diaUno)).toEqual({ desde: '2026-09-07', hasta: '2026-09-13' });
    expect(fechasIso(2, diaUno)).toEqual({ desde: '2026-09-14', hasta: '2026-09-20' });
    expect(fechasIso(12, diaUno)).toEqual({ desde: '2026-11-23', hasta: '2026-11-29' });
    expect(fechasIso(13, diaUno)).toEqual({ desde: '2026-11-30', hasta: '2026-12-05' });
    expect(iso(sumarDias(diaUno, DIAS_DEL_PROGRAMA - 1))).toBe('2026-12-05'); // el día 90
  });

  it('empezando un martes: la 1 es corta (martes a domingo) y desde la 2 todo es lunes a domingo', () => {
    const diaUno = inicio(1);
    expect(fechasIso(1, diaUno)).toEqual({ desde: '2026-09-08', hasta: '2026-09-13' });
    expect(fechasIso(2, diaUno)).toEqual({ desde: '2026-09-14', hasta: '2026-09-20' });
    expect(fechasIso(13, diaUno)).toEqual({ desde: '2026-11-30', hasta: '2026-12-06' }); // el día 90 es el domingo
  });

  it('empezando un domingo: la 1 es de un solo día', () => {
    const diaUno = inicio(6);
    expect(fechasIso(1, diaUno)).toEqual({ desde: '2026-09-13', hasta: '2026-09-13' });
    expect(fechasIso(2, diaUno)).toEqual({ desde: '2026-09-14', hasta: '2026-09-20' });
  });

  it('empezando un miércoles: el día 90 cae en lunes y se suma a la 13 (nunca hay 14)', () => {
    const diaUno = inicio(2); // miércoles 9 sep → día 90 = lunes 7 dic
    expect(fechasIso(13, diaUno)).toEqual({ desde: '2026-11-30', hasta: '2026-12-07' });
    expect(fechasDeLaSemanaDelPrograma(14, 1, diaUno)).toBeNull();
    expect(fechasDeLaSemanaDelPrograma(0, 1, diaUno)).toBeNull();
  });

  it.each([0, 1, 2, 3, 4, 5, 6])(
    'las trece semanas cubren los días 1 a 90 sin huecos ni solapes, y la de hoy es la que cuenta `semanaDe` (inicio +%i)',
    offset => {
      const diaUno = inicio(offset);
      const semanas = Array.from({ length: 13 }, (_, i) => fechasDeLaSemanaDelPrograma(i + 1, 1, diaUno)!);
      expect(iso(semanas[0].desde)).toBe(iso(diaUno));
      expect(iso(semanas[12].hasta)).toBe(iso(sumarDias(diaUno, DIAS_DEL_PROGRAMA - 1)));
      for (let i = 1; i < semanas.length; i++) {
        expect(iso(semanas[i].desde)).toBe(iso(sumarDias(semanas[i - 1].hasta, 1)));
      }
      for (let dia = 1; dia <= DIAS_DEL_PROGRAMA; dia++) {
        const hoy = hoyEnElDia(diaUno, dia);
        const contenedora = semanas.findIndex(s => iso(s.desde)! <= iso(hoy)! && iso(hoy)! <= iso(s.hasta)!) + 1;
        expect({ dia, semana: contenedora }).toEqual({ dia, semana: semanaDe(dia, hoy) });
      }
    },
  );

  it('el Día 1 sale de restarle a hoy los días que van, y sin programa en marcha (día 0) no hay fechas', () => {
    expect(iso(diaUnoDelPrograma(8, new Date(2026, 8, 14, 23, 50))!)).toBe('2026-09-07');
    expect(diaUnoDelPrograma(0, UN_LUNES)).toBeNull();
    expect(diaUnoDelPrograma(Number.NaN, UN_LUNES)).toBeNull();
    expect(fechasDeLaSemanaDelPrograma(1, 0, UN_LUNES)).toBeNull();
    expect(fechasDelMes(1, 0, UN_LUNES)).toBeNull();
    expect(rangoDelMes(1, 0, UN_LUNES)).toBeNull();
  });

  it('cuenta en la hora local aunque sea de noche (el instante en UTC ya es otro día)', () => {
    // Domingo 13/09 a las 23:30 en Lima = lunes 14/09 04:30 UTC.
    const tarde = new Date('2026-09-14T04:30:00Z');
    const f = fechasDeLaSemanaDelPrograma(2, 8, tarde)!; // día 8 → el Día 1 fue el domingo 6/09
    expect(iso(f.desde)).toBe('2026-09-07');
    expect(iso(f.hasta)).toBe('2026-09-13');
  });
});

describe('los textos de las fechas', () => {
  it('«3 nov» y rangos que no repiten el mes cuando es el mismo', () => {
    expect(fechaCorta(new Date(2026, 10, 3))).toBe('3 nov');
    expect(rangoDeFechas({ desde: new Date(2026, 10, 3), hasta: new Date(2026, 10, 9) })).toBe('3 a 9 nov');
    expect(rangoDeFechas({ desde: new Date(2026, 9, 26), hasta: new Date(2026, 10, 1) })).toBe('26 oct a 1 nov');
    expect(rangoDeFechas({ desde: new Date(2026, 11, 28), hasta: new Date(2027, 0, 3) })).toBe('28 dic a 3 ene');
  });

  it('el rango del mes va de la primera semana a la última', () => {
    const diaUno = inicio(0);
    expect(rangoDelMes(1, 1, diaUno)).toBe('7 sep a 4 oct');
    expect(rangoDelMes(2, 1, diaUno)).toBe('5 oct a 1 nov');
    expect(rangoDelMes(3, 1, diaUno)).toBe('2 nov a 5 dic'); // el 3 se lleva la semana 13 (hasta el día 90)
  });
});

describe('el estado de cada semana', () => {
  // Empezó un lunes (7 sep). Día 38 = miércoles 14 oct → semana 6.
  const diaUno = inicio(0);
  const miercoles = hoyEnElDia(diaUno, 38);
  const domingo = hoyEnElDia(diaUno, 42); // domingo 18 oct: arma la 7
  const roca = (autoevaluacionFin: number | null = null) => ({ titulo: 'Llegar a 83,5 kg', autoevaluacionFin });

  it('la semana de ahora es «esta semana» y, si ya se revisó, «revisada»', () => {
    expect(estadoDeLaSemana(6, 38, miercoles, roca())).toBe('esta-semana');
    expect(estadoDeLaSemana(6, 38, miercoles, undefined)).toBe('esta-semana');
    expect(estadoDeLaSemana(6, 38, miercoles, null)).toBe('esta-semana');
    expect(estadoDeLaSemana(6, 38, miercoles, roca(7))).toBe('revisada');
  });

  it('la que viene se arma el domingo; las demás todavía no llegan', () => {
    expect(estadoDeLaSemana(7, 38, miercoles)).toBe('se-arma-el-domingo');
    expect(estadoDeLaSemana(8, 38, miercoles)).toBe('no-llega');
    expect(estadoDeLaSemana(13, 38, miercoles)).toBe('no-llega');
    // Aunque el servidor tuviera algo para una semana que no llegó, el estado no cambia.
    expect(estadoDeLaSemana(8, 38, miercoles, roca())).toBe('no-llega');
  });

  it('las pasadas: revisada, sin objetivo, o «terminó» (con objetivo sin revisar o todavía sin leer)', () => {
    expect(estadoDeLaSemana(5, 38, miercoles, roca(8))).toBe('revisada');
    expect(estadoDeLaSemana(5, 38, miercoles, null)).toBe('pasada-sin-objetivo');
    expect(estadoDeLaSemana(5, 38, miercoles, roca())).toBe('pasada');
    expect(estadoDeLaSemana(5, 38, miercoles, undefined)).toBe('pasada');
  });

  it('el domingo se arma la que empieza: «se arma hoy», o «ya armada» si ya tiene objetivo; la de ahora sigue siendo esta semana', () => {
    expect(estadoDeLaSemana(7, 42, domingo)).toBe('se-arma-hoy');
    expect(estadoDeLaSemana(7, 42, domingo, null)).toBe('se-arma-hoy');
    expect(estadoDeLaSemana(7, 42, domingo, roca())).toBe('armada');
    expect(estadoDeLaSemana(6, 42, domingo, roca())).toBe('esta-semana');
    expect(estadoDeLaSemana(8, 42, domingo)).toBe('no-llega');
  });

  it('el domingo de la semana 13 no hay una 14: la 13 sigue siendo la de ahora', () => {
    const dia88 = hoyEnElDia(diaUno, 90); // sábado 5 dic
    expect(estadoDeLaSemana(13, 90, dia88, roca())).toBe('esta-semana');
    expect(estadoDeLaSemana(12, 90, dia88, roca(6))).toBe('revisada');
  });

  it('sin programa en marcha (día 0) la semana 1 es la de ahora', () => {
    expect(estadoDeLaSemana(1, 0, UN_LUNES)).toBe('esta-semana');
    expect(estadoDeLaSemana(2, 0, UN_LUNES)).toBe('se-arma-el-domingo');
  });

  it('cada estado tiene su texto, en tipo oración', () => {
    expect(ETIQUETA_DEL_ESTADO).toEqual({
      revisada: 'Revisada',
      'esta-semana': 'Esta semana',
      'se-arma-hoy': 'Se arma hoy',
      armada: 'Ya armada',
      'se-arma-el-domingo': 'Se arma el domingo',
      'no-llega': 'Todavía no llega',
      'pasada-sin-objetivo': 'Sin objetivo',
      pasada: 'Terminó',
    });
  });

  it('solo se organiza la semana de ahora y la que se arma hoy; nunca una que no llegó', () => {
    expect(sePuedeOrganizar(6, 38, miercoles)).toBe(true);
    expect(sePuedeOrganizar(7, 38, miercoles)).toBe(false);
    expect(sePuedeOrganizar(5, 38, miercoles)).toBe(false);
    expect(sePuedeOrganizar(6, 42, domingo)).toBe(true);
    expect(sePuedeOrganizar(7, 42, domingo)).toBe(true);
    expect(sePuedeOrganizar(8, 42, domingo)).toBe(false);
  });
});

describe('las semanas de la hoja', () => {
  const diaUno = inicio(0);
  const miercoles = hoyEnElDia(diaUno, 38); // semana 6, mes 2 (semanas 5 a 8)
  const domingo = hoyEnElDia(diaUno, 42);

  it('el mes 2 trae sus cuatro semanas con fechas; solo se leen las que pasaron y la de ahora', () => {
    const semanas = semanasDeLaHoja(2, 38, miercoles);
    expect(semanas.map(s => [s.numero, s.rango, s.esLaDeAhora, s.seLee])).toEqual([
      [5, '5 a 11 oct', false, true],
      [6, '12 a 18 oct', true, true],
      [7, '19 a 25 oct', false, false],
      [8, '26 oct a 1 nov', false, false],
    ]);
  });

  it('el domingo también se lee la que se arma hoy', () => {
    expect(semanasDeLaHoja(2, 42, domingo).map(s => [s.numero, s.seLee])).toEqual([
      [5, true],
      [6, true],
      [7, true],
      [8, false],
    ]);
  });

  it('el mes 3 trae cinco semanas (la 9 a la 13) y la última termina el día 90', () => {
    const semanas = semanasDeLaHoja(3, 38, miercoles);
    expect(semanas.map(s => s.numero)).toEqual([9, 10, 11, 12, 13]);
    expect(semanas[4].rango).toBe('30 nov a 5 dic');
  });

  it('sin Día 1 las semanas se listan sin fechas', () => {
    expect(semanasDeLaHoja(1, 0, UN_LUNES).map(s => [s.numero, s.rango, s.esLaDeAhora])).toEqual([
      [1, null, true],
      [2, null, false],
      [3, null, false],
      [4, null, false],
    ]);
  });

  it('el mes que se abre es el de hoy', () => {
    expect(mesAlAbrir(38, miercoles)).toBe(2);
    expect(mesAlAbrir(2, hoyEnElDia(diaUno, 2))).toBe(1);
    expect(mesAlAbrir(0, UN_LUNES)).toBe(1);
    expect(mesAlAbrir(90, hoyEnElDia(diaUno, 90))).toBe(3);
  });
});

describe('el objetivo semanal del eje', () => {
  const maestras = [
    { id: 'm-cuerpo', eje: 'CUERPO' },
    { id: 'm-trabajo', eje: 'TRABAJO' },
  ] as unknown as RocaMaestraApi[];
  const semanal = (rocaMaestraId: string, titulo: string) => ({ rocaMaestraId, titulo }) as unknown as RocaSemanalApi;

  it('resuelve el eje por la roca maestra (las semanales no traen el eje)', () => {
    const rocas = [semanal('m-trabajo', 'Cerrar 3 ventas'), semanal('m-cuerpo', 'Llegar a 83,5 kg')];
    expect(rocaDelEje(rocas, maestras, 'CUERPO')?.titulo).toBe('Llegar a 83,5 kg');
    expect(rocaDelEje(rocas, maestras, 'TRABAJO')?.titulo).toBe('Cerrar 3 ventas');
  });

  it('sin objetivo en ese eje, o sin la maestra del eje, es null', () => {
    expect(rocaDelEje([semanal('m-trabajo', 'x')], maestras, 'CUERPO')).toBeNull();
    expect(rocaDelEje([semanal('m-cuerpo', 'x')], maestras, 'RELACIONES')).toBeNull();
    expect(rocaDelEje([], maestras, 'CUERPO')).toBeNull();
  });
});
