import { describe, expect, it } from '@jest/globals';

import { CONFIG_RADAR, MI_RADAR } from '../../config/configRadar';
import type { MiRadarApi, RegistroRadarApi } from '../../types/radar.types';
import {
  MENSAJE_DEMASIADAS_HORAS,
  MENSAJE_SIN_HORAS,
  alternarHora,
  claveDeMiRadar,
  diaSinRadar,
  diasConHorasPropias,
  elementosDeHoy,
  evitabaAlgo,
  hayDiasPropios,
  horasDeAviso,
  horasDelDia,
  horasElegibles,
  limpiarHoras,
  miRadarCorresponde,
  patronesDeMiRadar,
  textoDeEnergia,
  textoDeEvitar,
  textoDeLaHoraDelRegistro,
  textoDeLasHoras,
  textoDeLosDias,
  textoDeMiRadar,
  textoDeMiRadarEnLaFicha,
  textoSinPatrones,
  validarDias,
  validarHoras,
} from '../miRadar';
import { horasConSlot } from '../slotsDelRadar';

/**
 * Mi Radar (spec 012), las decisiones puras. Las pruebas corren en America/Lima (jest.config.js): los instantes se
 * arman con `new Date(año, mes, día, hora)` para que "la hora local" sea esa en cualquier máquina.
 */

const DE_08_A_19 = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const encendido = (...horas: number[]): MiRadarApi => ({ encendido: true, horas });
const APAGADO: MiRadarApi = { encendido: false, horas: [] as number[] };
/** Mi Radar encendido con 09, 14 y 20 para todos los días y estos días con horas propias (`[]` = sin Radar). */
const conDias = (...dias: Array<[number, number[]]>): MiRadarApi => ({
  encendido: true,
  horas: [9, 14, 20],
  dias: dias.map(([dia, horas]) => ({ dia, horas })),
});
/** Los avisos diarios: la misma hora todos los días. */
const diarios = (...horas: number[]) => horas.map(hora => ({ hora, dia: null }));

describe('las perillas de Mi Radar', () => {
  it('empieza el día siguiente al último de la semana 1, de 03 a 23, hasta 12, con 09, 14 y 20 sugeridas', () => {
    expect(MI_RADAR.primerDia).toBe(8);
    expect(MI_RADAR.primerDia).toBe(CONFIG_RADAR.ultimoDia + 1);
    expect(MI_RADAR.primeraHora).toBe(3);
    expect(MI_RADAR.ultimaHora).toBe(23);
    expect(MI_RADAR.maximoDeHoras).toBe(12);
    expect(MI_RADAR.horasSugeridas).toEqual([9, 14, 20]);
  });

  it('las horas elegibles son 21: de 03:00 a 23:00 del mismo día, ninguna después de la medianoche', () => {
    const horas = horasElegibles();
    expect(horas).toHaveLength(21);
    expect(horas[0]).toBe(3);
    expect(horas[horas.length - 1]).toBe(23);
    expect(horas).not.toContain(0);
    expect(horas).not.toContain(2);
  });

  it('desde el día 8 corresponde; antes no (y con el Código Renaser apagado del todo, tampoco)', () => {
    expect(miRadarCorresponde(null)).toBe(false);
    expect(miRadarCorresponde(0)).toBe(false);
    for (const dia of [1, 7]) expect(miRadarCorresponde(dia)).toBe(false);
    for (const dia of [8, 9, 90]) expect(miRadarCorresponde(dia)).toBe(true);
  });
});

describe('validar las horas (las mismas reglas que el servidor)', () => {
  it('acepta de 1 a 12 horas en punto entre 03 y 23, y las devuelve ordenadas', () => {
    expect(validarHoras([20, 9, 14])).toEqual({ ok: true, horas: [9, 14, 20] });
    expect(validarHoras([3])).toEqual({ ok: true, horas: [3] });
    expect(validarHoras([23])).toEqual({ ok: true, horas: [23] });
    expect(validarHoras(horasElegibles().slice(0, 12))).toMatchObject({ ok: true });
  });

  it('ninguna: «Elige al menos una hora»', () => {
    expect(validarHoras([])).toEqual({ ok: false, error: MENSAJE_SIN_HORAS });
    expect(MENSAJE_SIN_HORAS).toBe('Elige al menos una hora');
  });

  it('más de 12: «Puedes elegir hasta 12»', () => {
    expect(validarHoras(horasElegibles().slice(0, 13))).toEqual({ ok: false, error: MENSAJE_DEMASIADAS_HORAS });
    expect(MENSAJE_DEMASIADAS_HORAS).toBe('Puedes elegir hasta 12');
  });

  it('rechaza lo que no está entre 03:00 y 23:00 o no es una hora en punto', () => {
    for (const mala of [0, 1, 2, 24, -1, 9.5, Number.NaN]) {
      expect(validarHoras([9, mala])).toMatchObject({ ok: false });
    }
  });

  it('rechaza una hora repetida', () => {
    expect(validarHoras([9, 14, 9])).toEqual({ ok: false, error: 'Hay una hora repetida' });
  });

  it('alternar marca y desmarca, ordenadas, y con 12 ya marcadas no suma una más', () => {
    expect(alternarHora([14, 20], 9)).toEqual([9, 14, 20]);
    expect(alternarHora([9, 14, 20], 14)).toEqual([9, 20]);
    const doce = horasElegibles().slice(0, 12);
    expect(alternarHora(doce, 23)).toEqual(doce);
    expect(alternarHora(doce, 3)).toEqual(doce.slice(1));
  });
});

describe('qué horas tiene cada día de la semana', () => {
  it('sin días propios (o sin el campo, como un backend anterior) todos los días siguen las de todos', () => {
    for (const dia of [1, 2, 3, 4, 5, 6, 7]) {
      expect(horasDelDia(encendido(9, 14, 20), dia)).toEqual([9, 14, 20]);
      expect(horasDelDia({ encendido: true, horas: [9, 14, 20], dias: [] }, dia)).toEqual([9, 14, 20]);
    }
  });

  it('un día con horas propias usa esas, y los demás siguen las de todos', () => {
    const c = conDias([6, [11]], [7, [8, 21]]);
    expect(horasDelDia(c, 6)).toEqual([11]);
    expect(horasDelDia(c, 7)).toEqual([8, 21]);
    expect(horasDelDia(c, 1)).toEqual([9, 14, 20]);
    expect(horasDelDia(c, 5)).toEqual([9, 14, 20]);
  });

  it('`horas: []` es «Sin Radar ese día»: ninguna, y solo ese día', () => {
    const c = conDias([7, []]);
    expect(horasDelDia(c, 7)).toEqual([]);
    expect(diaSinRadar(c, 7)).toBe(true);
    expect(horasDelDia(c, 6)).toEqual([9, 14, 20]);
    expect(diaSinRadar(c, 6)).toBe(false);
  });

  it('apagado, o sin saberlo (null): ninguna en ningún día, y ningún día va «sin Radar»', () => {
    for (const dia of [1, 4, 7]) {
      expect(horasDelDia(APAGADO, dia)).toEqual([]);
      expect(horasDelDia(null, dia)).toEqual([]);
      expect(horasDelDia(undefined, dia)).toEqual([]);
      expect(diaSinRadar(APAGADO, dia)).toBe(false);
      expect(diaSinRadar(null, dia)).toBe(false);
    }
    // Aunque traiga días propios: apagado manda.
    expect(horasDelDia({ encendido: false, horas: [], dias: [{ dia: 6, horas: [11] }] }, 6)).toEqual([]);
  });

  it('nunca devuelve una hora fuera de 03:00 a 23:00, repetida ni desordenada', () => {
    expect(limpiarHoras([20, 9, 9, 2, 24, 14.5, 3, 23])).toEqual([3, 9, 20, 23]);
    expect(horasDelDia(conDias([6, [11, 2, 11, 24]]), 6)).toEqual([11]);
    expect(horasDelDia({ encendido: true, horas: [20, 9, 0], dias: [] }, 2)).toEqual([9, 20]);
  });

  it('qué días suenan distinto: solo los que de verdad cambian algo', () => {
    expect(hayDiasPropios(encendido(9, 14, 20))).toBe(false);
    expect(hayDiasPropios(APAGADO)).toBe(false);
    // Una entrada con las mismas horas que todos no cuenta: ese día suena igual que los demás.
    expect(hayDiasPropios(conDias([3, [20, 14, 9]]))).toBe(false);
    expect(diasConHorasPropias(conDias([3, [9, 14, 20]]))).toEqual([]);
    expect(hayDiasPropios(conDias([6, [11]]))).toBe(true);
    expect(diasConHorasPropias(conDias([7, []], [6, [11]]))).toEqual([
      { dia: 6, horas: [11] },
      { dia: 7, horas: [] },
    ]);
  });

  it('la huella de lo guardado cambia con los días propios, no con leer lo mismo', () => {
    expect(claveDeMiRadar(null)).toBe('');
    expect(claveDeMiRadar(encendido(9, 14))).toBe(claveDeMiRadar({ encendido: true, horas: [9, 14], dias: [] }));
    expect(claveDeMiRadar(conDias([6, [11]]))).not.toBe(claveDeMiRadar(conDias()));
    expect(claveDeMiRadar(conDias([6, [11]]))).not.toBe(claveDeMiRadar(conDias([6, [12]])));
    expect(claveDeMiRadar(conDias([6, [11]]))).toBe(claveDeMiRadar(conDias([6, [11]])));
  });
});

describe('validar los días propios (las mismas reglas que el servidor)', () => {
  it('acepta días de 1 a 7 una sola vez, con horas válidas o «Sin Radar» (`[]`), ordenados por día', () => {
    expect(validarDias([])).toEqual({ ok: true, dias: [] });
    expect(validarDias([{ dia: 7, horas: [] }, { dia: 6, horas: [14, 11] }])).toEqual({
      ok: true,
      dias: [{ dia: 6, horas: [11, 14] }, { dia: 7, horas: [] }],
    });
  });

  it('rechaza un día que no existe o repetido', () => {
    for (const dia of [0, 8, -1, 2.5]) {
      expect(validarDias([{ dia, horas: [9] }])).toEqual({ ok: false, error: 'Hay un día que no existe' });
    }
    expect(validarDias([{ dia: 6, horas: [9] }, { dia: 6, horas: [] }])).toEqual({ ok: false, error: 'Hay un día repetido' });
  });

  it('las horas propias de un día valen lo mismo que las generales: hasta 12, entre 03 y 23, sin repetir', () => {
    expect(validarDias([{ dia: 6, horas: [2] }])).toMatchObject({ ok: false });
    expect(validarDias([{ dia: 6, horas: [9, 9] }])).toEqual({ ok: false, error: 'Hay una hora repetida' });
    expect(validarDias([{ dia: 6, horas: horasElegibles().slice(0, 13) }])).toEqual({ ok: false, error: MENSAJE_DEMASIADAS_HORAS });
    expect(validarDias([{ dia: 6, horas: horasElegibles().slice(0, 12) }])).toMatchObject({ ok: true });
  });
});

describe('qué avisos suenan en el teléfono', () => {
  it('días 1 a 7: las 12 de siempre, de 08:00 a 19:00, DIARIAS, tenga lo que tenga Mi Radar', () => {
    for (const dia of [1, 2, 3, 4, 5, 6, 7]) {
      expect(horasDeAviso(dia, null)).toEqual(diarios(...DE_08_A_19));
      expect(horasDeAviso(dia, APAGADO)).toEqual(diarios(...DE_08_A_19));
      expect(horasDeAviso(dia, encendido(9, 14))).toEqual(diarios(...DE_08_A_19));
      // Ni siquiera con días propios (no debería existir antes del día 8): la semana 1 no cambia.
      expect(horasDeAviso(dia, conDias([6, [11]], [7, []]))).toEqual(diarios(...DE_08_A_19));
    }
    // Y son exactamente las franjas del Código Renaser de la semana 1.
    expect(horasDeAviso(3, null).map(a => a.hora)).toEqual(horasConSlot());
    expect(horasDeAviso(3, null).every(a => a.dia === null)).toBe(true);
  });

  it('día 0 o sin día: ninguno', () => {
    expect(horasDeAviso(0, encendido(9))).toEqual([]);
    expect(horasDeAviso(null, encendido(9))).toEqual([]);
    expect(horasDeAviso(undefined, null)).toEqual([]);
  });

  it('desde el día 8 apagado: ninguno; sin saber qué tiene (null): ninguno', () => {
    for (const dia of [8, 9, 30, 90, 120]) {
      expect(horasDeAviso(dia, APAGADO)).toEqual([]);
      expect(horasDeAviso(dia, null)).toEqual([]);
    }
  });

  it('desde el día 8 encendido y SIN días distintos: una DIARIA por hora, como en la semana 1', () => {
    expect(horasDeAviso(8, encendido(20, 9, 14))).toEqual(diarios(9, 14, 20));
    expect(horasDeAviso(90, encendido(3, 23))).toEqual(diarios(3, 23));
    expect(horasDeAviso(10, encendido(0, 2, 9, 24))).toEqual(diarios(9));
    // Un día con las mismas horas que todos no cuenta como distinto: sigue el esquema diario.
    expect(horasDeAviso(10, conDias([3, [9, 14, 20]]))).toEqual(diarios(9, 14, 20));
    expect(horasDeAviso(10, { encendido: true, horas: [9, 14], dias: [] })).toEqual(diarios(9, 14));
  });

  it('desde el día 8 con algún día distinto: una SEMANAL por día y por hora de ese día', () => {
    const c: MiRadarApi = { encendido: true, horas: [9, 14], dias: [{ dia: 6, horas: [11] }] };
    const avisos = horasDeAviso(10, c);
    // 6 días con 9 y 14, y el sábado con 11: 13 avisos, ninguno diario.
    expect(avisos).toHaveLength(13);
    expect(avisos.every(a => a.dia !== null)).toBe(true);
    expect(avisos.filter(a => a.dia === 6)).toEqual([{ hora: 11, dia: 6 }]);
    expect(avisos.filter(a => a.dia === 1)).toEqual([{ hora: 9, dia: 1 }, { hora: 14, dia: 1 }]);
    expect(avisos.filter(a => a.dia === 7)).toEqual([{ hora: 9, dia: 7 }, { hora: 14, dia: 7 }]);
    // En orden de día y, dentro del día, de hora.
    expect(avisos.map(a => `${a.dia}-${a.hora}`)).toEqual([
      '1-9', '1-14', '2-9', '2-14', '3-9', '3-14', '4-9', '4-14', '5-9', '5-14', '6-11', '7-9', '7-14',
    ]);
  });

  it('un día «Sin Radar» no tiene ningún aviso, y los demás siguen sonando', () => {
    const avisos = horasDeAviso(12, conDias([7, []]));
    expect(avisos.filter(a => a.dia === 7)).toEqual([]);
    expect(avisos).toHaveLength(6 * 3);
    expect(avisos.every(a => a.dia !== null && a.dia >= 1 && a.dia <= 6)).toBe(true);
  });

  it('con 12 horas y los siete días distintos llega a 84: más que el tope de 64 de iOS (que hoy no cuenta: solo Android)', () => {
    const doce = horasElegibles().slice(0, 12);
    const c: MiRadarApi = { encendido: true, horas: [9], dias: [1, 2, 3, 4, 5, 6, 7].map(dia => ({ dia, horas: doce })) };
    expect(horasDeAviso(20, c)).toHaveLength(84);
  });

  it('nunca un aviso fuera de 03 a 23, ni de un día propio', () => {
    const avisos = horasDeAviso(15, conDias([6, [11, 2, 24]], [7, [0]]));
    expect(avisos.every(a => a.hora >= 3 && a.hora <= 23)).toBe(true);
    expect(avisos.filter(a => a.dia === 6)).toEqual([{ hora: 11, dia: 6 }]);
    expect(avisos.filter(a => a.dia === 7)).toEqual([]);
  });
});

describe('cómo se dice', () => {
  it('las horas: una, dos o varias', () => {
    expect(textoDeLasHoras([9])).toBe('09:00');
    expect(textoDeLasHoras([9, 14])).toBe('09:00 y 14:00');
    expect(textoDeLasHoras([9, 14, 20])).toBe('09:00, 14:00 y 20:00');
  });

  it('la fila de Yo y la línea de la ficha', () => {
    expect(textoDeMiRadar(encendido(9, 14, 20))).toBe('Encendido · 09:00, 14:00 y 20:00');
    expect(textoDeMiRadar(APAGADO)).toBe('Apagado');
    expect(textoDeMiRadarEnLaFicha(encendido(9, 14, 20))).toBe('Mi Radar: encendido · 09:00, 14:00 y 20:00');
    expect(textoDeMiRadarEnLaFicha(APAGADO)).toBe('Mi Radar: apagado');
  });

  it('los días: uno, dos o varios', () => {
    expect(textoDeLosDias([6])).toBe('sáb');
    expect(textoDeLosDias([6, 7])).toBe('sáb y dom');
    expect(textoDeLosDias([1, 3, 5])).toBe('lun, mié y vie');
  });

  it('el resumen cuando todos los días son iguales es el de siempre, con `dias` ausente, vacío o igual a todos', () => {
    expect(textoDeMiRadar({ encendido: true, horas: [9, 14, 20], dias: [] })).toBe('Encendido · 09:00, 14:00 y 20:00');
    expect(textoDeMiRadar(conDias([2, [9, 14, 20]]))).toBe('Encendido · 09:00, 14:00 y 20:00');
    expect(textoDeMiRadar({ encendido: false, horas: [], dias: [{ dia: 6, horas: [11] }] })).toBe('Apagado');
  });

  it('el resumen con días distintos: las de todos y, después, cada día (o grupo de días) que cambia', () => {
    expect(textoDeMiRadar(conDias([6, [11]], [7, []]))).toBe('Encendido · 09:00, 14:00 y 20:00 · sáb 11:00 · dom sin Radar');
    expect(textoDeMiRadarEnLaFicha(conDias([6, [11]], [7, []]))).toBe(
      'Mi Radar: encendido · 09:00, 14:00 y 20:00 · sáb 11:00 · dom sin Radar',
    );
  });

  it('los días que quedan igual van juntos, en orden de día, y varias horas se dicen como siempre', () => {
    expect(textoDeMiRadar(conDias([7, [11]], [6, [11]]))).toBe('Encendido · 09:00, 14:00 y 20:00 · sáb y dom 11:00');
    expect(textoDeMiRadar(conDias([5, []], [1, []], [3, []]))).toBe(
      'Encendido · 09:00, 14:00 y 20:00 · lun, mié y vie sin Radar',
    );
    expect(textoDeMiRadar(conDias([6, [10, 15]], [1, [8]]))).toBe(
      'Encendido · 09:00, 14:00 y 20:00 · lun 08:00 · sáb 10:00 y 15:00',
    );
  });

  it('la hora de un registro: prevista y respondida, o solo la hora', () => {
    expect(textoDeLaHoraDelRegistro('14:06', 14)).toBe('Prevista 14:00 · respondida 14:06');
    expect(textoDeLaHoraDelRegistro('14:06', null)).toBe('14:06');
    expect(textoDeLaHoraDelRegistro('14:06', undefined)).toBe('14:06');
    expect(textoDeLaHoraDelRegistro(null, undefined)).toBe('—');
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

describe('Hoy', () => {
  const a_las_15_30 = new Date(2026, 9, 20, 15, 30);

  it('una hora elegida que ya pasó sin respuesta es «Sin registro»; la que tiene registro, el registro', () => {
    const r = registro('a', 9, { horaPrevista: 9 });
    const elementos = elementosDeHoy([9, 14, 20], [r], a_las_15_30);
    expect(elementos).toEqual([{ tipo: 'registro', registro: r }, { tipo: 'sin-registro', hora: 14 }]);
  });

  it('una hora elegida que todavía no llega no aparece, ni la que está en curso sin responder', () => {
    expect(elementosDeHoy([15, 16, 20], [], a_las_15_30)).toEqual([]);
  });

  it('un registro libre de hoy aparece, y los de otros días no', () => {
    const libre = registro('libre', 11);
    const ayer = registro('ayer', 9, { dia: 19, horaPrevista: 9 });
    expect(elementosDeHoy([9], [libre, ayer], a_las_15_30)).toEqual([
      { tipo: 'sin-registro', hora: 9 },
      { tipo: 'registro', registro: libre },
    ]);
  });

  it('en orden de hora, del más temprano al más tarde: los registros y los «Sin registro» juntos', () => {
    const tarde = registro('tarde', 14, { horaPrevista: 14 });
    const temprano = registro('temprano', 9, { horaPrevista: 9 });
    const elementos = elementosDeHoy([9, 11, 14], [tarde, temprano], a_las_15_30);
    expect(elementos.map(e => (e.tipo === 'registro' ? e.registro.id : `sin-${e.hora}`))).toEqual([
      'temprano',
      'sin-11',
      'tarde',
    ]);
  });

  it('el orden no depende de cómo llegan los registros, y un registro libre entra por la hora en que se respondió', () => {
    const libre = registro('libre', 12, { minuto: 40 });
    const sin = elementosDeHoy([8, 10, 13], [libre], a_las_15_30);
    expect(sin.map(e => (e.tipo === 'registro' ? e.registro.id : `sin-${e.hora}`))).toEqual(['sin-8', 'sin-10', 'libre', 'sin-13']);
    const otro = registro('otro', 7, { minuto: 5 });
    const ordenadas = elementosDeHoy([8, 10], [libre, otro], a_las_15_30).map(e => (e.tipo === 'registro' ? e.registro.id : `sin-${e.hora}`));
    const alReves = elementosDeHoy([8, 10], [otro, libre], a_las_15_30).map(e => (e.tipo === 'registro' ? e.registro.id : `sin-${e.hora}`));
    expect(ordenadas).toEqual(['otro', 'sin-8', 'sin-10', 'libre']);
    expect(alReves).toEqual(ordenadas);
  });

  it('con las horas de un día sin Radar («ninguna») solo quedan los registros que ya había', () => {
    const r = registro('a', 9, { horaPrevista: 9 });
    expect(elementosDeHoy([], [], a_las_15_30)).toEqual([]);
    expect(elementosDeHoy([], [r], a_las_15_30)).toEqual([{ tipo: 'registro', registro: r }]);
  });
});

describe('Patrones', () => {
  it('con menos de 3 registros no hay ninguno, y se dice cuántos hay', () => {
    expect(patronesDeMiRadar([])).toMatchObject({ hayPatrones: false, registros: 0, masEnergia: null, evitando: null });
    const dos = patronesDeMiRadar([registro('a', 9), registro('b', 10)]);
    expect(dos).toMatchObject({ hayPatrones: false, registros: 2, masEnergia: null, menosEnergia: null, evitando: null });
    expect(textoSinPatrones(2)).toBe('Con 2 registros todavía no hay patrones. Aparecen desde 3.');
    expect(textoSinPatrones(1)).toBe('Con 1 registro todavía no hay patrones. Aparecen desde 3.');
  });

  it('desde 3: la hora con más y con menos energía promedio, cada una con sus registros', () => {
    const registros = [
      registro('a', 9, { dia: 20, energyLevel: 8 }),
      registro('b', 9, { dia: 21, energyLevel: 9 }),
      registro('c', 15, { dia: 20, energyLevel: 3 }),
      registro('d', 15, { dia: 21, energyLevel: 4 }),
      registro('e', 15, { dia: 22, energyLevel: 3 }),
    ];
    const p = patronesDeMiRadar(registros);
    expect(p.hayPatrones).toBe(true);
    expect(p.masEnergia).toEqual({ hora: 9, promedio: 8.5, registros: 2 });
    expect(p.menosEnergia).toEqual({ hora: 15, promedio: 3.3, registros: 3 });
    expect(textoDeEnergia('mas', p.masEnergia!)).toBe('Más energía a las 09:00 · promedio 8.5, en 2 registros');
    expect(textoDeEnergia('menos', p.menosEnergia!)).toBe('Menos energía a las 15:00 · promedio 3.3, en 3 registros');
  });

  it('las horas con un solo registro no cuentan para la energía', () => {
    const p = patronesDeMiRadar([
      registro('a', 9, { energyLevel: 9 }),
      registro('b', 12, { energyLevel: 1 }),
      registro('c', 15, { energyLevel: 5, dia: 21 }),
      registro('d', 15, { energyLevel: 7, dia: 22 }),
    ]);
    // Solo las 15:00 tiene dos registros: «más» y «menos» serían la misma hora, así que no se muestra ninguna.
    expect(p.hayPatrones).toBe(true);
    expect(p.masEnergia).toBeNull();
    expect(p.menosEnergia).toBeNull();
  });

  it('si todas las horas promedian igual, no hay más ni menos', () => {
    const p = patronesDeMiRadar([
      registro('a', 9, { energyLevel: 5, dia: 20 }),
      registro('b', 9, { energyLevel: 5, dia: 21 }),
      registro('c', 15, { energyLevel: 5, dia: 20 }),
      registro('d', 15, { energyLevel: 5, dia: 21 }),
    ]);
    expect(p.masEnergia).toBeNull();
    expect(p.menosEnergia).toBeNull();
  });

  it('«Dijiste que evitabas algo en N de M registros» con el último ejemplo', () => {
    const p = patronesDeMiRadar([
      registro('a', 9, { dia: 20, whatAmIAvoiding: 'Responder a mi jefe' }),
      registro('b', 10, { dia: 21, whatAmIAvoiding: 'Nada' }),
      registro('c', 11, { dia: 22, whatAmIAvoiding: 'Llamar a mi mamá' }),
      registro('d', 12, { dia: 19, whatAmIAvoiding: 'No evito nada.' }),
    ]);
    expect(p.evitando).toEqual({ cuantos: 2, de: 4, ejemplo: 'Llamar a mi mamá' });
    expect(textoDeEvitar(p.evitando!)).toBe('Dijiste que evitabas algo en 2 de 4 registros');
  });

  it('si nunca evitó nada, no hay esa línea; un ejemplo largo se acorta', () => {
    const nada = patronesDeMiRadar([registro('a', 9, { whatAmIAvoiding: 'nada' }), registro('b', 10, { whatAmIAvoiding: 'Ninguna' }), registro('c', 11, { whatAmIAvoiding: 'no' })]);
    expect(nada.evitando).toBeNull();
    const largo = patronesDeMiRadar([
      registro('a', 9, { dia: 22, whatAmIAvoiding: 'x'.repeat(500) }),
      registro('b', 10),
      registro('c', 11),
    ]);
    expect(largo.evitando!.ejemplo.length).toBeLessThanOrEqual(121);
    expect(largo.evitando!.ejemplo.endsWith('…')).toBe(true);
  });

  it('qué cuenta como «no evitaba nada»', () => {
    for (const no of ['nada', 'Nada.', 'NINGUNO', 'ninguna', 'No', 'nada en particular', 'No evito nada', '  nada  ']) {
      expect(evitabaAlgo(no)).toBe(false);
    }
    for (const si of ['Responder correos', 'nada que me guste hacer', 'la reunión', 'no quiero llamar']) {
      expect(evitabaAlgo(si)).toBe(true);
    }
    expect(evitabaAlgo('   ')).toBe(false);
  });
});
