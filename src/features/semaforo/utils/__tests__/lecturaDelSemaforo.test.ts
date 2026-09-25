import { describe, expect, it } from '@jest/globals';

import type { DiaDelSemaforo, SemanaCerrada } from '../../types/semaforo.types';
import {
  desgloseDelDia,
  dichoDeLaSemana,
  dichoDelDia,
  estadoDelDiaEnPalabras,
  fechaDeBarra,
  fechaLarga,
  formatearPorcentaje,
  hoyDeLaPersona,
  momentoDeCalculo,
  palabraDelSemaforo,
  porcentajeCompacto,
  primeraEnMayuscula,
  rangoDeFechas,
  rotuloDeSemana,
  sumarDias,
  textoDiasConDatos,
} from '../lecturaDelSemaforo';

/**
 * Cómo se DICE el semáforo. Cada texto se prueba acá y no en pantalla: la tarjeta, el detalle y los
 * gráficos se pueden reemplazar, y lo que no puede cambiar sin querer es lo que se le dice a la
 * persona — la palabra junto al color, el número con su denominador, la fecha correcta.
 */

const ESPACIO_DURO = ' ';

function dia(parcial: Partial<DiaDelSemaforo>): DiaDelSemaforo {
  return {
    fecha: '2026-09-18',
    estado: 'MEDIDO',
    porcentaje: 75,
    color: 'AMARILLO',
    habitos: { programados: 9, cumplidos: 7 },
    objetivos: { programados: 3, cumplidos: 2 },
    ...parcial,
  };
}

describe('la palabra va siempre con el color', () => {
  it('las cuatro palabras del contrato', () => {
    expect(palabraDelSemaforo('VERDE')).toBe('Al día');
    expect(palabraDelSemaforo('AMARILLO')).toBe('Requiere atención');
    expect(palabraDelSemaforo('ROJO')).toBe('Con problemas');
    expect(palabraDelSemaforo('SIN_DATOS')).toBe('Sin datos');
  });

  /* La app no se actualiza por aire: si el dueño cambia la redacción, llega desde el servidor. */
  it('gana la palabra del servidor', () => {
    expect(palabraDelSemaforo('ROJO', 'En riesgo')).toBe('En riesgo');
  });

  it('una palabra vacía no deja la etiqueta en blanco', () => {
    expect(palabraDelSemaforo('VERDE', '   ')).toBe('Al día');
    expect(palabraDelSemaforo('VERDE', null)).toBe('Al día');
  });
});

describe('porcentajes y denominadores', () => {
  it('escribe el porcentaje tal cual llega, con el % pegado', () => {
    expect(formatearPorcentaje(78.3)).toBe(`78.3${ESPACIO_DURO}%`);
    expect(formatearPorcentaje(82)).toBe(`82${ESPACIO_DURO}%`);
    expect(formatearPorcentaje(0)).toBe(`0${ESPACIO_DURO}%`);
  });

  /* Si se redondeara, «80 %» quedaría al lado de «Requiere atención». */
  it('no redondea: 79.9 no se convierte en 80', () => {
    expect(formatearPorcentaje(79.9)).toBe(`79.9${ESPACIO_DURO}%`);
  });

  it('compacto, para columnas angostas: la misma cifra, sin el espacio', () => {
    expect(porcentajeCompacto(71.4)).toBe('71.4%');
    expect(porcentajeCompacto(79.9)).toBe('79.9%');
  });

  it('los días con datos llevan su denominador', () => {
    expect(textoDiasConDatos(6)).toBe('6 de 7 días con datos');
    expect(textoDiasConDatos(0)).toBe('0 de 7 días con datos');
  });
});

describe('el desglose de un día', () => {
  it('el ejemplo del contrato: 7 de 9 hábitos · 2 de 3 objetivos · 75 %', () => {
    expect(desgloseDelDia(dia({}))).toBe(`7 de 9 hábitos · 2 de 3 objetivos · 75${ESPACIO_DURO}%`);
  });

  it('en singular cuando el denominador es 1', () => {
    expect(
      desgloseDelDia(dia({ habitos: { programados: 1, cumplidos: 1 }, objetivos: { programados: 1, cumplidos: 0 }, porcentaje: 50, color: 'ROJO' })),
    ).toBe(`1 de 1 hábito · 0 de 1 objetivo · 50${ESPACIO_DURO}%`);
  });

  it('omite lo que no tenía nada programado', () => {
    expect(desgloseDelDia(dia({ objetivos: { programados: 0, cumplidos: 0 }, porcentaje: 78 }))).toBe(
      `7 de 9 hábitos · 78${ESPACIO_DURO}%`,
    );
    expect(desgloseDelDia(dia({ habitos: null, porcentaje: 67 }))).toBe(`2 de 3 objetivos · 67${ESPACIO_DURO}%`);
  });

  it('un día sin medir dice por qué, sin porcentaje', () => {
    const sinPorcentaje = { porcentaje: null, color: 'SIN_DATOS' as const };
    expect(desgloseDelDia(dia({ estado: 'SIN_DATOS', ...sinPorcentaje }))).toBe('Nada programado');
    expect(desgloseDelDia(dia({ estado: 'PAUSADO', ...sinPorcentaje }))).toBe('En pausa');
    expect(desgloseDelDia(dia({ estado: 'PENDIENTE', ...sinPorcentaje }))).toBe('Todavía sin calcular');
    expect(desgloseDelDia(dia({ estado: 'FUERA_DEL_PROGRAMA', ...sinPorcentaje }))).toBe('Fuera del programa');
    expect(desgloseDelDia(dia({ estado: 'DESCONOCIDO', ...sinPorcentaje }))).toBe('Sin datos');
  });

  it('solo un día medido no tiene explicación de estado', () => {
    expect(estadoDelDiaEnPalabras('MEDIDO')).toBeNull();
  });
});

describe('fechas, leídas como días de calendario y no como instantes', () => {
  it('fecha larga', () => {
    expect(fechaLarga('2026-09-18')).toBe('viernes 18 de septiembre');
    expect(fechaLarga('2026-09-24')).toBe('jueves 24 de septiembre');
  });

  it('rótulo corto de una barra', () => {
    expect(fechaDeBarra('2026-09-24')).toEqual({ dia: 'Jue', numero: '24' });
    expect(fechaDeBarra('2026-09-19')).toEqual({ dia: 'Sáb', numero: '19' });
  });

  it('el rango no repite el mes cuando es el mismo', () => {
    expect(rangoDeFechas('2026-09-18', '2026-09-24')).toBe('del viernes 18 al jueves 24 de septiembre');
    expect(rangoDeFechas('2026-09-26', '2026-10-02')).toBe('del sábado 26 de septiembre al viernes 2 de octubre');
  });

  it('el rótulo de una semana cerrada entra en dos renglones cortos', () => {
    expect(rotuloDeSemana('2026-09-12', '2026-09-18')).toEqual(['12–18', 'sep']);
  });

  /* «26–2 / sep–oct» se leía como del 26 al 2 de septiembre, y en 360 px se cortaba. */
  it('si cruza de mes, cada número va con su mes', () => {
    expect(rotuloDeSemana('2026-09-26', '2026-10-02')).toEqual(['26 sep', '2 oct']);
    expect(rotuloDeSemana('2026-12-26', '2027-01-01')).toEqual(['26 dic', '1 ene']);
  });

  it('suma días cruzando mes, año y un 29 de febrero', () => {
    expect(sumarDias('2026-09-24', 1)).toBe('2026-09-25');
    expect(sumarDias('2026-09-30', 1)).toBe('2026-10-01');
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2028-02-28', 1)).toBe('2028-02-29');
    expect(sumarDias('2026-09-25', 6)).toBe('2026-10-01');
  });

  it('una fecha ilegible se devuelve tal cual en vez de romper', () => {
    expect(fechaLarga('mañana')).toBe('mañana');
    expect(sumarDias('mañana', 1)).toBe('mañana');
    expect(fechaDeBarra('mañana')).toEqual({ dia: '', numero: 'mañana' });
  });

  it('primera letra en mayúscula para empezar un renglón', () => {
    expect(primeraEnMayuscula('jueves 24 de septiembre')).toBe('Jueves 24 de septiembre');
    expect(primeraEnMayuscula('')).toBe('');
  });
});

describe('qué día es hoy para la persona', () => {
  /* La ventana vigente termina AYER en su zona: hoy es el día siguiente, diga lo que diga el
     reloj del teléfono. */
  it('sale de la ventana que mandó el servidor', () => {
    const telefonoCorrido = new Date(2026, 0, 1, 12, 0);
    expect(hoyDeLaPersona({ vigente: { hasta: '2026-09-24' } as never }, telefonoCorrido)).toBe('2026-09-25');
    expect(hoyDeLaPersona({ vigente: { hasta: '2026-09-30' } as never }, telefonoCorrido)).toBe('2026-10-01');
  });

  it('sin ventana, usa el día del teléfono', () => {
    expect(hoyDeLaPersona({ vigente: null }, new Date(2026, 8, 25, 23, 59))).toBe('2026-09-25');
    expect(hoyDeLaPersona({ vigente: null }, new Date(2026, 8, 5, 0, 1))).toBe('2026-09-05');
  });
});

describe('cuándo se calculó', () => {
  it('en la hora del teléfono, con el día escrito', () => {
    /* Se arma en hora local a propósito: la prueba no depende del huso de la máquina que la corre. */
    const instante = new Date(2026, 8, 25, 0, 25, 3).toISOString();
    expect(momentoDeCalculo(instante)).toBe('viernes 25 de septiembre a las 00:25');
  });

  it('sin instante o ilegible, no inventa uno', () => {
    expect(momentoDeCalculo(null)).toBeNull();
    expect(momentoDeCalculo('ayer')).toBeNull();
  });
});

describe('lo que oye quien no ve el gráfico', () => {
  it('un día medido: fecha, palabra y desglose', () => {
    expect(dichoDelDia(dia({ fecha: '2026-09-24' }))).toBe(
      `Jueves 24 de septiembre: Requiere atención, 7 de 9 hábitos · 2 de 3 objetivos · 75${ESPACIO_DURO}%`,
    );
  });

  it('un día sin medir: fecha y por qué', () => {
    expect(dichoDelDia(dia({ fecha: '2026-09-20', estado: 'SIN_DATOS', porcentaje: null, color: 'SIN_DATOS' }))).toBe(
      'Domingo 20 de septiembre: Nada programado',
    );
  });

  it('una semana cerrada: rango, palabra, número y días con datos', () => {
    const semana: SemanaCerrada = {
      desde: '2026-09-12',
      hasta: '2026-09-18',
      porcentaje: 82,
      color: 'VERDE',
      etiqueta: 'Al día',
      diasConDatos: 7,
      cerradaEn: '2026-09-19T05:25:03Z',
    };
    expect(dichoDeLaSemana(semana)).toBe(
      `Semana del sábado 12 al viernes 18 de septiembre: Al día, 82${ESPACIO_DURO}%, 7 de 7 días con datos`,
    );
  });

  it('una semana sin datos no dice ningún número', () => {
    const semana: SemanaCerrada = {
      desde: '2026-08-15',
      hasta: '2026-08-21',
      porcentaje: null,
      color: 'SIN_DATOS',
      etiqueta: null,
      diasConDatos: null,
      cerradaEn: null,
    };
    expect(dichoDeLaSemana(semana)).toBe('Semana del sábado 15 al viernes 21 de agosto: Sin datos');
  });
});
