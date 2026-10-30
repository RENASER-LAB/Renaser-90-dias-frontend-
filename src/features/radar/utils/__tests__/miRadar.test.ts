import { describe, expect, it } from '@jest/globals';

import { CONFIG_RADAR, MI_RADAR } from '../../config/configRadar';
import { diaDePrueba, miRadarConHorario, miRadarConHoras, miRadarDePrueba } from '../../__tests__/fixturasDeMiRadar';
import type { MiRadarApi, RegistroRadarApi } from '../../types/radar.types';
import {
  claveDeMiRadar,
  diaDeHoyDeMiRadar,
  horasDeAviso,
  horasDelDia,
  limpiarHoras,
  miRadarCorresponde,
  lineaDeHoy,
  respondidasDeHoy,
  resumenDeMiRadarHoy,
  textoDeLaHoraDelRegistro,
  textoDeLasVeces,
  textoDeMiRadar,
  textoDeMiRadarEnLaFicha,
  textoDelHorario,
} from '../miRadar';
import { horasConSlot } from '../slotsDelRadar';

/**
 * Mi Radar (spec 012 rehecha por la 019), las decisiones puras. Las pruebas corren en America/Lima (jest.config.js): los instantes se
 * arman con `new Date(año, mes, día, hora)` para que "la hora local" sea esa en cualquier máquina.
 */


const DE_08_A_19 = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const DE_06_A_22 = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
const APAGADO = miRadarDePrueba(false);

describe('las perillas de Mi Radar', () => {
  it('empieza el día siguiente al último de la semana 1, de 03 a 23, y propone 6 veces al pasar a Personalizado', () => {
    expect(MI_RADAR.primerDia).toBe(CONFIG_RADAR.ultimoDia + 1);
    expect(MI_RADAR.primerDia).toBe(8);
    expect(MI_RADAR.primeraHora).toBe(3);
    expect(MI_RADAR.ultimaHora).toBe(23);
    expect(MI_RADAR.vecesPorDefecto).toBe(6);
    // Ya no hay tope de 12 ni horas sugeridas: las horas salen del Despertar y el Dormir.
    expect(Object.keys(MI_RADAR)).not.toContain('maximoDeHoras');
    expect(Object.keys(MI_RADAR)).not.toContain('horasSugeridas');
  });

  it('desde el día 8 corresponde; antes no (y con el Código Renaser apagado del todo, tampoco)', () => {
    expect(miRadarCorresponde(7)).toBe(false);
    expect(miRadarCorresponde(8)).toBe(true);
    expect(miRadarCorresponde(90)).toBe(true);
    expect(miRadarCorresponde(null)).toBe(false);
    expect(miRadarCorresponde(undefined)).toBe(false);
  });
});

describe('qué horas tiene cada día de la semana (las que calculó el servidor)', () => {
  it('cada día usa las suyas: un sábado con otro horario no tiene las del lunes', () => {
    const config = miRadarDePrueba(true, { 6: { despertar: '08:00', dormir: '23:00' } });
    expect(horasDelDia(config, 1)).toEqual(DE_06_A_22);
    expect(horasDelDia(config, 6)).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);
  });

  it('un día sin Despertar o sin Dormir no tiene ninguna, y un día «Sin Radar» tampoco', () => {
    const config = miRadarDePrueba(true, { 2: { despertar: null }, 3: { dormir: null }, 7: { sinRadar: true } });
    expect(horasDelDia(config, 2)).toEqual([]);
    expect(horasDelDia(config, 3)).toEqual([]);
    expect(horasDelDia(config, 7)).toEqual([]);
    expect(horasDelDia(config, 1)).toEqual(DE_06_A_22);
  });

  it('apagado, o sin saberlo (null): ninguna en ningún día', () => {
    for (const config of [APAGADO, null, undefined]) {
      for (const dia of [1, 4, 7]) expect(horasDelDia(config, dia)).toEqual([]);
    }
  });

  it('un día que la lectura no trae (las fichas traen solo hoy) no tiene horas', () => {
    expect(horasDelDia({ encendido: true, hoy: null, dias: [diaDePrueba(4)] }, 1)).toEqual([]);
    expect(horasDelDia({ encendido: true, hoy: null, dias: [diaDePrueba(4)] }, 4)).toEqual(DE_06_A_22);
  });

  it('nunca devuelve una hora fuera de 03:00 a 23:00, repetida ni desordenada', () => {
    expect(limpiarHoras([20, 9, 9, 2, 24, 14.5, -1, 3, 23])).toEqual([3, 9, 20, 23]);
    expect(limpiarHoras(null)).toEqual([]);
    expect(horasDelDia(miRadarConHoras([20, 9, 9, 2, 24]), 1)).toEqual([9, 20]);
  });

  it('la huella cambia con las horas de un día (modo, veces, Despertar, Dormir), no con leer lo mismo ni con la fecha de hoy', () => {
    const base = miRadarDePrueba(true);
    expect(claveDeMiRadar(base)).toBe(claveDeMiRadar(miRadarDePrueba(true, {}, '2026-10-29')));
    expect(claveDeMiRadar(base)).not.toBe(claveDeMiRadar(miRadarDePrueba(false)));
    expect(claveDeMiRadar(base)).not.toBe(claveDeMiRadar(miRadarDePrueba(true, { 6: { despertar: '08:00' } })));
    expect(claveDeMiRadar(base)).not.toBe(claveDeMiRadar(miRadarDePrueba(true, { 6: { horas: [6, 14, 22] } })));
    // Que un día pase a estar bloqueado (cambia el día) no es otra huella.
    expect(claveDeMiRadar(base)).toBe(claveDeMiRadar(miRadarDePrueba(true, { 1: { editable: false } })));
    expect(claveDeMiRadar(null)).toBe('');
  });
});

describe('qué avisos suenan en el teléfono', () => {
  it('días 1 a 7: las 12 de siempre, de 08:00 a 19:00, DIARIAS, tenga lo que tenga Mi Radar', () => {
    const doce = DE_08_A_19.map(hora => ({ hora, dia: null }));
    for (const dia of [1, 4, 7]) {
      expect(horasDeAviso(dia, null)).toEqual(doce);
      expect(horasDeAviso(dia, APAGADO)).toEqual(doce);
      expect(horasDeAviso(dia, miRadarConHoras([9, 14]))).toEqual(doce);
    }
    expect(horasConSlot()).toEqual(DE_08_A_19);
  });

  it('día 0 o sin día: ninguno', () => {
    expect(horasDeAviso(0, miRadarDePrueba())).toEqual([]);
    expect(horasDeAviso(null, miRadarDePrueba())).toEqual([]);
    expect(horasDeAviso(undefined, miRadarDePrueba())).toEqual([]);
  });

  it('desde el día 8 apagado: ninguno; sin saber qué tiene (null): ninguno', () => {
    for (const dia of [8, 9, 90]) {
      expect(horasDeAviso(dia, APAGADO)).toEqual([]);
      expect(horasDeAviso(dia, null)).toEqual([]);
    }
  });

  it('desde el día 8 encendido: una SEMANAL por día y por hora de ese día (nunca diaria: cada día tiene su horario)', () => {
    const avisos = horasDeAviso(10, miRadarDePrueba());
    expect(avisos).toHaveLength(7 * 17);
    expect(avisos.every(a => a.dia !== null)).toBe(true);
    expect(avisos.filter(a => a.dia === 1).map(a => a.hora)).toEqual(DE_06_A_22);
    expect(avisos.filter(a => a.dia === 7).map(a => a.hora)).toEqual(DE_06_A_22);
  });

  it('un día sin Radar (sin Despertar o «Sin Radar») no tiene ningún aviso y los demás siguen sonando', () => {
    const avisos = horasDeAviso(10, miRadarDePrueba(true, { 3: { despertar: null }, 6: { sinRadar: true } }));
    expect(avisos.filter(a => a.dia === 3 || a.dia === 6)).toEqual([]);
    expect(avisos.filter(a => a.dia === 4)).toHaveLength(17);
  });

  it('con el Radar al máximo (21 horas los siete días) son 147 alarmas: por debajo de las 500 de Android', () => {
    const avisos = horasDeAviso(10, miRadarConHorario('02:00', '23:30'));
    expect(avisos).toHaveLength(147);
    expect(avisos.length).toBeLessThan(500);
  });

  it('nunca un aviso fuera de 03 a 23', () => {
    const avisos = horasDeAviso(10, miRadarConHoras([1, 2, 3, 23, 24]));
    expect(avisos.every(a => a.hora >= 3 && a.hora <= 23)).toBe(true);
  });
});

describe('cómo se dice', () => {
  it('las veces y el horario', () => {
    expect(textoDeLasVeces(1)).toBe('1 vez');
    expect(textoDeLasVeces(17)).toBe('17 veces');
    expect(textoDelHorario(diaDePrueba(1))).toBe('05:30 a 22:30');
    expect(textoDelHorario(diaDePrueba(1, { despertar: null }))).toBeNull();
  });

  it('el día de hoy de la lectura: el que dice el servidor con `hoy`, o el del teléfono', () => {
    const config: MiRadarApi = { encendido: true, hoy: '2026-10-29', dias: [diaDePrueba(3, { fecha: '2026-10-28' }), diaDePrueba(4, { fecha: '2026-10-29' })] };
    expect(diaDeHoyDeMiRadar(config)?.dia).toBe(4);
    // Sin `hoy` manda el teléfono: 20/10/2026 es martes.
    expect(diaDeHoyDeMiRadar(miRadarDePrueba(true), new Date(2026, 9, 20, 10))?.dia).toBe(2);
    expect(diaDeHoyDeMiRadar(null)).toBeUndefined();
  });

  it('la fila de Yo: «Apagado», o encendido con el horario y las veces de hoy', () => {
    const hoy = new Date(2026, 9, 29, 10);
    expect(textoDeMiRadar(APAGADO, hoy)).toBe('Apagado');
    expect(textoDeMiRadar(miRadarDePrueba(true), hoy)).toBe('Encendido · 05:30 a 22:30 · 17 veces');
    expect(textoDeMiRadar(miRadarDePrueba(true, { 4: { horas: [6], despertar: '06:00', dormir: '07:30' } }), hoy)).toBe(
      'Encendido · 06:00 a 07:30 · 1 vez',
    );
  });

  it('si hoy no tiene Radar (sin Despertar o «Sin Radar») la fila lo dice, y la lectura sin hoy dice solo «Encendido»', () => {
    const hoy = new Date(2026, 9, 29, 10);
    expect(textoDeMiRadar(miRadarDePrueba(true, { 4: { despertar: null } }), hoy)).toBe('Encendido · hoy sin Radar');
    expect(textoDeMiRadar(miRadarDePrueba(true, { 4: { sinRadar: true } }), hoy)).toBe('Encendido · hoy sin Radar');
    expect(textoDeMiRadar({ encendido: true, hoy: null, dias: [] }, hoy)).toBe('Encendido');
  });

  it('la línea de la ficha: «Mi Radar: encendido · 05:30 a 22:30 · 17 veces», «… · hoy no tiene Radar» o «apagado»', () => {
    const hoy = new Date(2026, 9, 29, 10);
    expect(textoDeMiRadarEnLaFicha(miRadarDePrueba(true), hoy)).toBe('Mi Radar: encendido · 05:30 a 22:30 · 17 veces');
    expect(textoDeMiRadarEnLaFicha(miRadarDePrueba(true, { 4: { despertar: null } }), hoy)).toBe('Mi Radar: encendido · hoy no tiene Radar');
    expect(textoDeMiRadarEnLaFicha(APAGADO, hoy)).toBe('Mi Radar: apagado');
  });

  it('la hora de un registro: prevista y respondida, o solo la hora', () => {
    expect(textoDeLaHoraDelRegistro('14:06', 14)).toBe('Prevista 14:00 · respondida 14:06');
    expect(textoDeLaHoraDelRegistro('14:06', null)).toBe('14:06');
    expect(textoDeLaHoraDelRegistro('14:06', undefined)).toBe('14:06');
    expect(textoDeLaHoraDelRegistro(null, undefined)).toBe('—');
  });
});

describe('lo de hoy, de una sola cuenta', () => {
  it('con Mi Radar encendido y horas hoy: hoyTieneRadar, y la hora en curso pendiente si es una de las de hoy', () => {
    const config = miRadarConHoras([9, 14, 20]);
    const r = resumenDeMiRadarHoy(config, [], new Date(2026, 9, 29, 14, 10));
    expect(r.hoyTieneRadar).toBe(true);
    expect(r.horasDeHoy).toEqual([9, 14, 20]);
    expect(r.horaEnCursoPendiente).toBe(true);
    expect(r.dentroDelHorario).toBe(true);
  });

  it('un día sin Radar no tiene hoyTieneRadar ni hora pendiente; de madrugada no está dentro del horario', () => {
    const sin = resumenDeMiRadarHoy(miRadarDePrueba(true, { 4: { despertar: null } }), [], new Date(2026, 9, 29, 14, 10));
    expect(sin.hoyTieneRadar).toBe(false);
    expect(sin.horaEnCursoPendiente).toBe(false);
    expect(resumenDeMiRadarHoy(miRadarDePrueba(true), [], new Date(2026, 9, 29, 1, 30)).dentroDelHorario).toBe(false);
  });
});

/** Un registro hecho a esa hora local del 20/10/2026. */
function registro(
  id: string,
  hora: number,
  extra: Partial<RegistroRadarApi> & { dia?: number; minuto?: number } = {},
): RegistroRadarApi {
  const { dia = 20, minuto = 6, ...resto } = extra;
  return {
    id,
    whatAmIDoing: `haciendo ${id}`,
    whatAmIThinking: `pensando ${id}`,
    whatAmIFeeling: `sintiendo ${id}`,
    energyLevel: 5,
    whatAmIAvoiding: `evitando ${id}`,
    createdAt: new Date(2026, 9, dia, hora, minuto).toISOString(),
    ...resto,
  };
}

describe('«Hoy: 4 de 6»: las veces que respondió hoy de las que le tocaban', () => {
  const a_las_15_30 = new Date(2026, 9, 20, 15, 30);

  it('cuenta las horas de hoy con su respuesta: un registro responde a su hora prevista, no a cuándo se hizo', () => {
    const horas = [9, 12, 15, 18];
    expect(respondidasDeHoy(horas, [], a_las_15_30)).toBe(0);
    expect(respondidasDeHoy(horas, [registro('a', 9, { horaPrevista: 9 }), registro('b', 12, { horaPrevista: 12 })], a_las_15_30)).toBe(2);
    // Hecho a las 10:40 sin hora prevista (un registro libre): no responde a ninguna de las horas.
    expect(respondidasDeHoy(horas, [registro('libre', 10, { minuto: 40 })], a_las_15_30)).toBe(0);
  });

  it('en la hora en curso vale cualquier registro de esa hora; los de otros días no cuentan', () => {
    const horas = [9, 15];
    expect(respondidasDeHoy(horas, [registro('ahora', 15, { minuto: 5 })], a_las_15_30)).toBe(1);
    expect(respondidasDeHoy(horas, [registro('ayer', 9, { dia: 19, horaPrevista: 9 })], a_las_15_30)).toBe(0);
  });

  it('una hora respondida dos veces cuenta una sola', () => {
    expect(respondidasDeHoy([9], [registro('a', 9, { horaPrevista: 9 }), registro('b', 9, { minuto: 30, horaPrevista: 9 })], a_las_15_30)).toBe(1);
  });

  it('la línea: «Hoy: 4 de 6» y lo que dice el lector de pantalla', () => {
    const config = miRadarConHoras([6, 9, 12, 15, 18, 21]);
    const registros = [6, 9, 12, 15].map(h => registro(`r${h}`, h, { horaPrevista: h }));
    expect(lineaDeHoy(config, registros, a_las_15_30)).toEqual({ texto: 'Hoy: 4 de 6', lectorDePantalla: 'Hoy respondiste 4 de 6 veces' });
  });

  it('0 de N también se dice; y con una sola vez, «de 1 vez»', () => {
    expect(lineaDeHoy(miRadarConHoras([6, 9, 12]), [], a_las_15_30)).toEqual({
      texto: 'Hoy: 0 de 3',
      lectorDePantalla: 'Hoy respondiste 0 de 3 veces',
    });
    expect(lineaDeHoy(miRadarConHoras([9]), [], a_las_15_30)?.lectorDePantalla).toBe('Hoy respondiste 0 de 1 vez');
  });

  it('sin Radar hoy (sin Despertar o «Sin Radar»), apagado, sin saberlo o con 0 que tocan: no se muestra', () => {
    const martes = 2;
    expect(lineaDeHoy(miRadarDePrueba(true, { [martes]: { despertar: null } }), [], a_las_15_30)).toBeNull();
    expect(lineaDeHoy(miRadarDePrueba(true, { [martes]: { sinRadar: true } }), [], a_las_15_30)).toBeNull();
    expect(lineaDeHoy(miRadarDePrueba(false), [], a_las_15_30)).toBeNull();
    expect(lineaDeHoy(null, [], a_las_15_30)).toBeNull();
    expect(lineaDeHoy(miRadarConHoras([]), [], a_las_15_30)).toBeNull();
  });

  it('el resumen de hoy trae las respondidas; apagado, 0', () => {
    expect(resumenDeMiRadarHoy(miRadarConHoras([9, 15]), [registro('a', 9, { horaPrevista: 9 })], a_las_15_30).respondidasHoy).toBe(1);
    expect(resumenDeMiRadarHoy(miRadarConHoras([9, 15], false), [registro('a', 9, { horaPrevista: 9 })], a_las_15_30).respondidasHoy).toBe(0);
  });
});
