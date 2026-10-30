import { describe, expect, it } from '@jest/globals';

import type { BloqueOcupado, DiaConHuecos, HuecoQueSeRepite } from '../../types/huecos.types';
import {
  acomodarEnCarriles,
  aMinutos,
  avisoDeHoraQueFalta,
  avisoDeLaSemanaSinHoras,
  conteosDelDia,
  deMinutosAHora,
  diaInicial,
  etiquetaDeLaColumna,
  etiquetaDeLosDias,
  filasQueSeRepiten,
  horasCortas,
  letraDelDia,
  marcasDeHora,
  momentoDelDia,
  nombreDelBloque,
  proporcionLibre,
  titularDelDia,
  totalLibreDeLaSemana,
} from '../agendaDelDia';

const VENTANA = { desde: '05:30', hasta: '22:30' };

function dia(fecha: string, extra: Partial<DiaConHuecos> = {}): DiaConHuecos {
  return {
    fecha,
    ventana: VENTANA,
    sinVentanaPor: null,
    minutosOcupados: 400,
    minutosLibres: 620,
    huecos: [],
    ocupados: [],
    cumplidosATiempo: 0,
    cumplidosTarde: 0,
    noCumplidos: 0,
    ...extra,
  };
}

function bloque(desde: string, hasta: string, titulo: string | null = 'Algo', tipo: BloqueOcupado['tipo'] = 'HABITO'): BloqueOcupado {
  return { desde, hasta, tipo, titulo };
}

describe('la barra de cada columna', () => {
  it('el dorado es la proporción libre de la ventana del día', () => {
    expect(proporcionLibre(dia('2026-10-26', { minutosLibres: 510 }))).toBe(0.5); // 510 de 1020
    expect(proporcionLibre(dia('2026-10-26', { minutosLibres: 1020 }))).toBe(1);
    expect(proporcionLibre(dia('2026-10-26', { minutosLibres: 0 }))).toBe(0);
    expect(proporcionLibre(dia('2026-10-26', { minutosLibres: 255 }))).toBeCloseTo(0.25);
  });

  it('nunca pasa de lleno ni baja de vacío, aunque el servidor se contradiga', () => {
    expect(proporcionLibre(dia('2026-10-26', { minutosLibres: 5000 }))).toBe(1);
    expect(proporcionLibre(dia('2026-10-26', { minutosLibres: -3 }))).toBe(0);
  });

  it('sin ventana, o sin los minutos libres, no hay proporción: no se inventa un cero', () => {
    expect(proporcionLibre(dia('2026-10-26', { ventana: null }))).toBeNull();
    expect(proporcionLibre(dia('2026-10-26', { minutosLibres: null }))).toBeNull();
    expect(proporcionLibre({ ventana: { desde: '10:00', hasta: '10:00' }, minutosLibres: 10 })).toBeNull();
  });

  it.each([
    [270, '4.5 h'],
    [240, '4 h'],
    [30, '0.5 h'],
    [20, '0.3 h'],
    [0, '0 h'],
    [599, '10 h'],
    [750, '13 h'],
    [1020, '17 h'],
    [null, '—'],
  ])('%j minutos → «%s»', (minutos, texto) => {
    expect(horasCortas(minutos)).toBe(texto);
  });

  it('la inicial de cada día sale de la fecha de calendario, no de la zona del teléfono', () => {
    const letras = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'].map(letraDelDia);
    expect(letras.join('')).toBe('LMMJVSD');
    expect(letraDelDia('no')).toBe('');
  });

  it('el lector de pantalla oye el nombre, lo libre y si es hoy', () => {
    expect(etiquetaDeLaColumna('Jueves 29', dia('2026-10-29', { minutosLibres: 270 }), 'hoy')).toBe('Jueves 29, 4 horas 30 minutos libres, hoy');
    expect(etiquetaDeLaColumna('Martes 27', dia('2026-10-27', { minutosLibres: 120 }), 'pasado')).toBe('Martes 27, 2 horas libres');
    expect(etiquetaDeLaColumna('Martes 27', dia('2026-10-27', { ventana: null }), 'pasado')).toBe('Martes 27, sin hora de Despertar o de Dormir');
    expect(etiquetaDeLaColumna('Martes 27', dia('2026-10-27', { minutosLibres: null }), 'pasado')).toBe('Martes 27');
  });
});

describe('el total de la semana', () => {
  it('suma los días que tienen ventana', () => {
    const dias = [dia('2026-10-26', { minutosLibres: 300 }), dia('2026-10-27', { minutosLibres: 120 })];
    expect(totalLibreDeLaSemana(dias)).toBe(420);
  });

  it('un día sin ventana no suma: contaría el sueño como tiempo libre', () => {
    const dias = [dia('2026-10-26', { minutosLibres: 300 }), dia('2026-10-27', { ventana: null, minutosLibres: 1440 })];
    expect(totalLibreDeLaSemana(dias)).toBe(300);
  });

  it('si ningún día tiene ventana, el total es «no hay» (null), no cero', () => {
    expect(totalLibreDeLaSemana([dia('2026-10-26', { ventana: null, minutosLibres: 1440 })])).toBeNull();
    expect(totalLibreDeLaSemana([])).toBeNull();
    expect(totalLibreDeLaSemana([dia('2026-10-26', { minutosLibres: null })])).toBeNull();
  });
});

describe('hoy y los días que vienen', () => {
  it('lo dice el servidor con `hoy`', () => {
    expect(momentoDelDia('2026-10-28', '2026-10-29', false)).toBe('pasado');
    expect(momentoDelDia('2026-10-29', '2026-10-29', false)).toBe('hoy');
    expect(momentoDelDia('2026-10-30', '2026-10-29', false)).toBe('futuro');
  });

  it('sin `hoy`, una semana cerrada es toda pasada y la demás no se puede saber', () => {
    expect(momentoDelDia('2026-10-28', null, true)).toBe('pasado');
    expect(momentoDelDia('2026-10-28', null, false)).toBe('desconocido');
  });

  it('el día que se abre: hoy si cae en la semana; si no, el primero con ventana', () => {
    const dias = [dia('2026-10-26', { ventana: null }), dia('2026-10-27'), dia('2026-10-28')];
    expect(diaInicial({ dias, hoy: '2026-10-28' })).toBe('2026-10-28');
    expect(diaInicial({ dias, hoy: '2026-11-04' })).toBe('2026-10-27');
    expect(diaInicial({ dias, hoy: null })).toBe('2026-10-27');
    expect(diaInicial({ dias: [dia('2026-10-26', { ventana: null })], hoy: null })).toBe('2026-10-26');
    expect(diaInicial({ dias: [], hoy: '2026-10-28' })).toBeNull();
  });

  it('el titular agrega «· hoy» solo a hoy', () => {
    expect(titularDelDia('Jueves 29', 'hoy')).toBe('Jueves 29 · hoy');
    expect(titularDelDia('Jueves 29', 'pasado')).toBe('Jueves 29');
    expect(titularDelDia('Jueves 29', 'futuro')).toBe('Jueves 29');
  });
});

describe('lo cumplido del día', () => {
  it('tres números cuando hay algo que contar', () => {
    expect(conteosDelDia({ cumplidosATiempo: 5, cumplidosTarde: 1, noCumplidos: 2 })).toEqual({ aTiempo: 5, tarde: 1, sinCumplir: 2 });
  });

  it('tres ceros no son un resultado (un día que no llega, o sin registros)', () => {
    expect(conteosDelDia({ cumplidosATiempo: 0, cumplidosTarde: 0, noCumplidos: 0 })).toBeNull();
  });

  it('si el servidor no los dice (una semana cerrada), no hay nada que mostrar', () => {
    expect(conteosDelDia({ cumplidosATiempo: null, cumplidosTarde: null, noCumplidos: null })).toBeNull();
    expect(conteosDelDia({ cumplidosATiempo: 3, cumplidosTarde: null, noCumplidos: 1 })).toBeNull();
  });
});

describe('las marcas de hora', () => {
  it('una cada 2 horas redondas dentro de la ventana', () => {
    expect(marcasDeHora(VENTANA).map(deMinutosAHora)).toEqual([
      '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00',
    ]);
  });

  it('una marca justo en el borde de la ventana entra', () => {
    expect(marcasDeHora({ desde: '06:00', hasta: '22:00' }).map(deMinutosAHora)).toEqual(
      ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
    );
  });

  it('el día entero llega a las 24:00', () => {
    const marcas = marcasDeHora({ desde: '00:00', hasta: '24:00' });
    expect(marcas[0]).toBe(0);
    expect(deMinutosAHora(marcas[marcas.length - 1])).toBe('24:00');
  });

  it('las horas van y vienen en minutos', () => {
    expect(aMinutos('05:30')).toBe(330);
    expect(deMinutosAHora(330)).toBe('05:30');
    expect(deMinutosAHora(1440)).toBe('24:00');
  });
});

describe('los bloques en carriles', () => {
  it('los que no se cruzan ocupan todo el ancho', () => {
    const r = acomodarEnCarriles([bloque('06:00', '06:30'), bloque('07:00', '07:30')], VENTANA);
    expect(r.map(b => [b.carril, b.carriles])).toEqual([[0, 1], [0, 1]]);
  });

  it('los que se tocan justo (uno termina cuando empieza el otro) no se cruzan', () => {
    const r = acomodarEnCarriles([bloque('07:00', '07:30'), bloque('07:30', '08:00')], VENTANA);
    expect(r.map(b => [b.carril, b.carriles])).toEqual([[0, 1], [0, 1]]);
  });

  it('los que se cruzan se reparten en columnas: se ven los dos', () => {
    const r = acomodarEnCarriles([bloque('09:00', '10:30', 'Reunión'), bloque('10:00', '10:30', 'Propuesta')], VENTANA);
    expect(r.map(b => [b.bloque.titulo, b.carril, b.carriles])).toEqual([['Reunión', 0, 2], ['Propuesta', 1, 2]]);
  });

  it('tres a la misma hora son tres columnas; el siguiente grupo vuelve al ancho entero', () => {
    const r = acomodarEnCarriles(
      [bloque('06:00', '06:30', 'A'), bloque('06:00', '06:30', 'B'), bloque('06:00', '06:30', 'C'), bloque('08:00', '08:30', 'D')],
      VENTANA,
    );
    expect(r.map(b => [b.bloque.titulo, b.carril, b.carriles])).toEqual([['A', 0, 3], ['B', 1, 3], ['C', 2, 3], ['D', 0, 1]]);
  });

  it('un bloque largo reserva su carril: el que llega después de otro corto reusa el que quedó libre', () => {
    const r = acomodarEnCarriles(
      [bloque('09:00', '13:00', 'Trabajo'), bloque('10:00', '10:30', 'Llamada'), bloque('11:00', '11:30', 'Café')],
      VENTANA,
    );
    expect(r.map(b => [b.bloque.titulo, b.carril, b.carriles])).toEqual([['Trabajo', 0, 2], ['Llamada', 1, 2], ['Café', 1, 2]]);
  });

  it('recorta a la ventana y descarta lo que cae afuera', () => {
    const r = acomodarEnCarriles(
      [bloque('05:00', '06:00', 'Antes'), bloque('22:00', '23:00', 'Después'), bloque('23:00', '24:00', 'Noche'), bloque('02:00', '03:00', 'Madrugada')],
      VENTANA,
    );
    expect(r.map(b => [b.bloque.titulo, b.desde, b.hasta])).toEqual([['Antes', 330, 360], ['Después', 1320, 1350]]);
  });

  it('no depende del orden en que llegan', () => {
    const lista = [bloque('10:00', '11:00', 'B'), bloque('06:00', '07:00', 'A'), bloque('10:30', '12:00', 'C'), bloque('06:30', '07:30', 'D')];
    const normal = acomodarEnCarriles(lista, VENTANA).map(b => [b.bloque.titulo, b.carril, b.carriles]);
    const alReves = acomodarEnCarriles([...lista].reverse(), VENTANA).map(b => [b.bloque.titulo, b.carril, b.carriles]);
    expect(alReves).toEqual(normal);
  });

  it('un día sin nada planificado no tiene bloques', () => {
    expect(acomodarEnCarriles([], VENTANA)).toEqual([]);
  });

  it('el nombre del bloque: el suyo, o «Ocupado» en la agenda personal', () => {
    expect(nombreDelBloque(bloque('10:00', '11:00', 'Reunión'))).toBe('Reunión');
    expect(nombreDelBloque(bloque('10:00', '11:00', null, 'AGENDA'))).toBe('Ocupado');
  });
});

describe('cuando falta una hora', () => {
  it('cada motivo dice cuál falta y dónde se elige', () => {
    expect(avisoDeHoraQueFalta('SIN_DESPERTAR').titulo).toBe('Falta su hora de Despertar');
    expect(avisoDeHoraQueFalta('SIN_DORMIR').titulo).toBe('Falta su hora de Dormir');
    expect(avisoDeHoraQueFalta('SIN_DESPERTAR_NI_DORMIR').titulo).toBe('Faltan sus horas de Despertar y de Dormir');
    expect(avisoDeHoraQueFalta('DORMIR_ANTES_DE_DESPERTAR').titulo).toBe('Su hora de Dormir va antes que la de Despertar');
    for (const m of ['SIN_DESPERTAR', 'SIN_DORMIR', 'SIN_DESPERTAR_NI_DORMIR', 'DORMIR_ANTES_DE_DESPERTAR'] as const) {
      expect(avisoDeHoraQueFalta(m).detalle).toContain('Training → Planificar');
      expect(avisoDeHoraQueFalta(m).detalle).toContain('no se calcula su tiempo libre');
    }
  });

  it('sin saber el motivo (semana cerrada) se nombran las dos', () => {
    expect(avisoDeHoraQueFalta(null).titulo).toBe('Falta su hora de Despertar o de Dormir');
  });

  it('la semana sin ninguna ventana junta lo que falta en los siete días', () => {
    const sin = (m: DiaConHuecos['sinVentanaPor']) => dia('2026-10-26', { ventana: null, sinVentanaPor: m });
    expect(avisoDeLaSemanaSinHoras([sin('SIN_DESPERTAR'), sin('SIN_DESPERTAR')])?.titulo).toBe('Falta su hora de Despertar');
    expect(avisoDeLaSemanaSinHoras([sin('SIN_DORMIR')])?.titulo).toBe('Falta su hora de Dormir');
    expect(avisoDeLaSemanaSinHoras([sin('SIN_DESPERTAR'), sin('SIN_DORMIR')])?.titulo).toBe('Faltan sus horas de Despertar y de Dormir');
    expect(avisoDeLaSemanaSinHoras([sin('DORMIR_ANTES_DE_DESPERTAR')])?.titulo).toBe('Su hora de Dormir va antes que la de Despertar');
    expect(avisoDeLaSemanaSinHoras([sin('SIN_DESPERTAR'), sin(null)])?.titulo).toBe('Falta su hora de Despertar o de Dormir');
  });

  it('si algún día sí tiene ventana, no hay aviso de toda la semana (va en el día)', () => {
    expect(avisoDeLaSemanaSinHoras([dia('2026-10-26'), dia('2026-10-27', { ventana: null })])).toBeNull();
    expect(avisoDeLaSemanaSinHoras([])).toBeNull();
  });
});

describe('«Se repite»', () => {
  it.each([
    [[1, 2, 3, 4, 5, 6, 7], 'Todos los días'],
    [[1, 2, 3, 4, 5, 6], 'Casi todos los días'],
    [[2, 3, 4, 5, 6, 7], 'Casi todos los días'],
    [[1, 2, 3, 4, 5], 'Lunes a viernes'],
    [[6, 7], 'Fin de semana'],
    [[1, 3, 4], 'Lun, mié y jue'],
    [[4, 3, 1, 1], 'Lun, mié y jue'],
  ])('%j → «%s»', (dias, texto) => {
    expect(etiquetaDeLosDias(dias)).toBe(texto);
  });

  it('caben tres filas como máximo: las que se apoyan en más días, y a igual, la más temprana', () => {
    const lista: HuecoQueSeRepite[] = [
      { desde: '16:00', hasta: '17:00', dias: [1, 2, 3] },
      { desde: '08:00', hasta: '09:00', dias: [1, 2, 3, 4, 5] },
      { desde: '14:00', hasta: '16:00', dias: [6, 7] },
      { desde: '13:30', hasta: '14:30', dias: [1, 2, 3, 4, 5, 6] },
      { desde: '11:00', hasta: '12:00', dias: [1, 2, 3] },
    ];
    expect(filasQueSeRepiten(lista).map(f => f.desde)).toEqual(['13:30', '08:00', '11:00']);
  });

  it('con menos de tres, las que hay; sin ninguna, nada', () => {
    expect(filasQueSeRepiten([{ desde: '15:00', hasta: '17:00', dias: [1, 3, 4] }])).toHaveLength(1);
    expect(filasQueSeRepiten([])).toEqual([]);
  });
});
