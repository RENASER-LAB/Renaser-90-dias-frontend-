import { describe, expect, it, jest } from '@jest/globals';

import type { Asistencia, Evento, Ocurrencia } from '../../types/eventos.types';
import {
  agruparPorDia,
  agruparPorMes,
  diaElegidoAlAbrir,
  grillaDelMes,
  marcaDelDia,
  mesDeLaFecha,
  moverMes,
  nombreDelMes,
  proximasParaTarjetas,
  rangoDelPedido,
  soloLasQueVas,
} from '../calendarioDelMes';
import { rotuloDelTipo } from '../formularioDeEvento';
import { aVista, guardarVistaPreferida, leerVistaPreferida } from '../vistaPreferida';
import { fechaEnZona } from '../zonaHoraria';

// La vista preferida se guarda en AsyncStorage, que en Jest no tiene módulo nativo.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const LIMA = 'America/Lima';

function evento(id: string, zona: string | null = LIMA): Evento {
  return {
    id,
    titulo: `Evento ${id}`,
    descripcion: null,
    portadaUrl: null,
    iniciaEn: '2026-09-26T02:00:00Z',
    duracionMinutos: 60,
    zona,
    tipoUbicacion: 'MEET',
    valorUbicacion: 'https://meet.google.com/abc',
    tipoEvento: 'SESION_ESPECIAL',
    reglasDeAviso: null,
    notificarAlCrear: false,
    recurrente: false,
    creadoPor: null,
    audiencia: 'ALL_MEMBERS',
    rolesDestino: [],
  };
}

function oc(id: string, iniciaEn: string, asistencia: Asistencia = null, zona: string | null = LIMA): Ocurrencia {
  return {
    evento: { ...evento(id, zona), iniciaEn },
    inicioOcurrencia: iniciaEn,
    iniciaEn,
    duracionMinutos: 60,
    titulo: `Evento ${id}`,
    asistencia,
  };
}

describe('grillaDelMes', () => {
  it('septiembre de 2026 arranca el martes 1: la primera semana trae el lunes 31 de agosto', () => {
    const semanas = grillaDelMes({ anio: 2026, mes: 9 });
    expect(semanas[0][0]).toEqual({ fecha: '2026-08-31', dia: 31, delMes: false });
    expect(semanas[0][1]).toEqual({ fecha: '2026-09-01', dia: 1, delMes: true });
    // El 30 cae miércoles: la última semana se completa con el 1 al 4 de octubre.
    const ultima = semanas[semanas.length - 1];
    expect(ultima[2]).toEqual({ fecha: '2026-09-30', dia: 30, delMes: true });
    expect(ultima[6]).toEqual({ fecha: '2026-10-04', dia: 4, delMes: false });
    expect(semanas).toHaveLength(5);
  });

  it('siempre semanas completas de lunes a domingo, sin saltar ni repetir días', () => {
    for (let mes = 1; mes <= 12; mes++) {
      const semanas = grillaDelMes({ anio: 2027, mes });
      const fechas = semanas.flat().map(c => c.fecha);
      expect(semanas.every(s => s.length === 7)).toBe(true);
      expect(new Set(fechas).size).toBe(fechas.length);
      // El primero de la grilla es lunes.
      const [a, m, d] = fechas[0].split('-').map(Number);
      expect(new Date(Date.UTC(a, m - 1, d)).getUTCDay()).toBe(1);
      expect(semanas.flat().filter(c => c.delMes)).toHaveLength(new Date(Date.UTC(2027, mes, 0)).getUTCDate());
    }
  });

  it('un febrero que arranca en lunes y no es bisiesto entra justo en 4 semanas', () => {
    expect(grillaDelMes({ anio: 2027, mes: 2 })).toHaveLength(4);
  });

  it('un mes que arranca en domingo necesita 6 semanas', () => {
    // Noviembre de 2026 arranca en domingo.
    expect(grillaDelMes({ anio: 2026, mes: 11 })).toHaveLength(6);
  });
});

describe('cambio de mes', () => {
  it('avanza y retrocede cruzando el año', () => {
    expect(moverMes({ anio: 2026, mes: 12 }, 1)).toEqual({ anio: 2027, mes: 1 });
    expect(moverMes({ anio: 2026, mes: 1 }, -1)).toEqual({ anio: 2025, mes: 12 });
    expect(moverMes({ anio: 2026, mes: 9 }, 0)).toEqual({ anio: 2026, mes: 9 });
    expect(moverMes({ anio: 2026, mes: 9 }, -21)).toEqual({ anio: 2024, mes: 12 });
  });

  it('nombra el mes en palabras', () => {
    expect(nombreDelMes({ anio: 2026, mes: 9 })).toBe('Septiembre 2026');
    expect(mesDeLaFecha('2026-10-04')).toEqual({ anio: 2026, mes: 10 });
  });

  it('pide al backend la grilla visible entera, de medianoche a medianoche en Lima, con un día de margen', () => {
    const { desde, hasta } = rangoDelPedido({ anio: 2026, mes: 9 }, LIMA);
    // La grilla va del lunes 31/08 al domingo 04/10; con margen, del 30/08 a la medianoche del 06/10.
    expect(desde.toISOString()).toBe('2026-08-30T05:00:00.000Z');
    expect(hasta.toISOString()).toBe('2026-10-06T05:00:00.000Z');
  });
});

describe('agruparPorDia (días de Lima, no de UTC)', () => {
  it('una clase a las 21:00 de Lima es de ESE día aunque en UTC ya sea el siguiente', () => {
    // 21:00 del sábado 26 en Lima = 02:00 UTC del domingo 27.
    const porDia = agruparPorDia([oc('a', '2026-09-27T02:00:00Z')], LIMA);
    expect(Object.keys(porDia)).toEqual(['2026-09-26']);
  });

  it('con el reloj en la madrugada UTC (00:00–05:00), «hoy» en Lima sigue siendo el día anterior', () => {
    // 03:30 UTC del domingo 27 = 22:30 del sábado 26 en Lima.
    const ahora = Date.parse('2026-09-27T03:30:00Z');
    const hoy = fechaEnZona(ahora, LIMA);
    expect(hoy).toBe('2026-09-26');
    const porDia = agruparPorDia(
      [oc('esta-noche', '2026-09-27T04:00:00Z'), oc('manana', '2026-09-27T15:00:00Z')],
      LIMA,
    );
    expect(porDia[hoy].map(o => o.evento.id)).toEqual(['esta-noche']);
    expect(porDia['2026-09-27'].map(o => o.evento.id)).toEqual(['manana']);
    // Y el día elegido al abrir el mes es ese «hoy» de Lima, no el 27 de UTC.
    expect(diaElegidoAlAbrir({ anio: 2026, mes: 9 }, hoy, porDia)).toBe('2026-09-26');
  });

  it('el fin de mes también: el 30/09 a las 20:00 de Lima es de septiembre, no del 1 de octubre', () => {
    const porDia = agruparPorDia([oc('fin', '2026-10-01T01:00:00Z')], LIMA);
    expect(Object.keys(porDia)).toEqual(['2026-09-30']);
    expect(agruparPorMes([oc('fin', '2026-10-01T01:00:00Z')], LIMA)[0].mes).toEqual({ anio: 2026, mes: 9 });
  });

  it('usa la zona del evento; sin zona, la que se le pase', () => {
    const madrid = oc('m', '2026-09-26T23:30:00Z', null, 'Europe/Madrid'); // 01:30 del 27 en Madrid
    const sinZona = oc('s', '2026-09-26T23:30:00Z', null, null); // 18:30 del 26 en Lima
    const porDia = agruparPorDia([madrid, sinZona], LIMA);
    expect(porDia['2026-09-27'].map(o => o.evento.id)).toEqual(['m']);
    expect(porDia['2026-09-26'].map(o => o.evento.id)).toEqual(['s']);
  });

  it('ordena por hora dentro de cada día', () => {
    const porDia = agruparPorDia([oc('tarde', '2026-09-26T23:00:00Z'), oc('manana', '2026-09-26T14:00:00Z')], LIMA);
    expect(porDia['2026-09-26'].map(o => o.evento.id)).toEqual(['manana', 'tarde']);
  });
});

describe('«Vas»', () => {
  const lista = [
    oc('va', '2026-09-26T23:00:00Z', 'GOING'),
    oc('no-va', '2026-09-26T14:00:00Z', 'NOT_GOING'),
    oc('sin-responder', '2026-09-28T14:00:00Z', null),
    oc('quizas', '2026-09-28T16:00:00Z', 'MAYBE'),
  ];

  it('el filtro deja solo aquellos a los que dijo «Voy»', () => {
    expect(soloLasQueVas(lista).map(o => o.evento.id)).toEqual(['va']);
  });

  it('un día con un «Voy» se marca distinto que un día que solo tiene eventos', () => {
    const porDia = agruparPorDia(lista, LIMA);
    expect(marcaDelDia(porDia['2026-09-26'])).toBe('vas');
    expect(marcaDelDia(porDia['2026-09-28'])).toBe('hay');
    expect(marcaDelDia(porDia['2026-09-29'])).toBeNull();
    expect(marcaDelDia([])).toBeNull();
  });

  it('con el filtro puesto, los días sin «Voy» quedan sin marca', () => {
    const porDia = agruparPorDia(soloLasQueVas(lista), LIMA);
    expect(marcaDelDia(porDia['2026-09-28'])).toBeNull();
    expect(marcaDelDia(porDia['2026-09-26'])).toBe('vas');
  });
});

describe('diaElegidoAlAbrir', () => {
  const porDia = agruparPorDia([oc('x', '2026-10-15T15:00:00Z'), oc('y', '2026-10-03T15:00:00Z')], LIMA);

  it('un mes que no es el de hoy abre en su primer día con eventos', () => {
    expect(diaElegidoAlAbrir({ anio: 2026, mes: 10 }, '2026-09-26', porDia)).toBe('2026-10-03');
  });

  it('sin eventos en el mes, ninguno', () => {
    expect(diaElegidoAlAbrir({ anio: 2026, mes: 11 }, '2026-09-26', porDia)).toBeNull();
  });
});

describe('proximasParaTarjetas', () => {
  it('deja fuera lo que ya terminó y conserva lo que empezó hace un rato', () => {
    const ahora = Date.parse('2026-09-26T15:30:00Z');
    const lista = [
      oc('despues', '2026-09-28T15:00:00Z'),
      oc('terminado', '2026-09-26T13:00:00Z'), // 13:00–14:00
      oc('en-curso', '2026-09-26T15:00:00Z'), // 15:00–16:00
    ];
    expect(proximasParaTarjetas(lista, ahora).map(o => o.evento.id)).toEqual(['en-curso', 'despues']);
  });

  it('se agrupan por mes en el orden en que llegan', () => {
    const grupos = agruparPorMes([oc('a', '2026-09-28T15:00:00Z'), oc('b', '2026-10-02T15:00:00Z')], LIMA);
    expect(grupos.map(g => g.mes.mes)).toEqual([9, 10]);
  });
});

describe('rótulo y vista preferida', () => {
  it('el rótulo de la tarjeta es el tipo en palabras, en mayúsculas; uno desconocido dice EVENTO', () => {
    expect(rotuloDelTipo('SESION_ESPECIAL')).toBe('SESIÓN ESPECIAL');
    expect(rotuloDelTipo('MENTORIA_ALQUIMISTA')).toBe('MENTORÍA DEL ALQUIMISTA');
    expect(rotuloDelTipo('TIPO_NUEVO')).toBe('EVENTO');
    expect(rotuloDelTipo(null)).toBe('EVENTO');
  });

  it('sin preferencia guardada (o con basura) la vista es «Calendario»', () => {
    expect(aVista(null)).toBe('calendario');
    expect(aVista('lista')).toBe('calendario');
    expect(aVista('tarjetas')).toBe('tarjetas');
  });

  it('la vista elegida se recuerda por persona', async () => {
    await guardarVistaPreferida('ana', 'tarjetas');
    expect(await leerVistaPreferida('ana')).toBe('tarjetas');
    expect(await leerVistaPreferida('beto')).toBe('calendario');
  });
});
