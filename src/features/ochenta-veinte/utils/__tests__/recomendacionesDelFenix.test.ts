import { describe, expect, it } from '@jest/globals';

import type { RocaDiariaApi } from '../../../objetivos/types/objetivos.types';
import type { AccionDelOchentaVeinte, VistaDelPeriodo } from '../../types/ochentaVeinte.types';
import {
  diaAnterior,
  mapaDeCalor,
  pesosDeHoy,
  porOrdenDeImpacto,
  proyeccionDelMes,
  recomendacionDeHoy,
  recomendacionDeLaPlanificacion,
  recomendacionDeLaSemana,
  recomendacionDelMes,
} from '../recomendacionesDelFenix';

/** Spec 058 FR-016 y FR-017: las recomendaciones del fénix son reglas fijas con los datos que ya llegan. */

const accion = (extra: Partial<RocaDiariaApi>): RocaDiariaApi => ({
  id: 'a', fecha: '2026-11-26', posicion: 1, titulo: 'Entrenar', descripcion: null, color: 'VERDE', puntajeImpacto: 5, esDelegable: false,
  eje: 'CUERPO', rocaSemanalId: 's', horaInicio: '07:00:00', horaFin: null, completada: false, completadaEn: null, puntosOtorgados: 0,
  bloqueada: false, acciones: [], ...extra,
});
const fue = (extra: Partial<AccionDelOchentaVeinte>): AccionDelOchentaVeinte => ({ eje: 'CUERPO', color: 'VERDE', impacto: 5, fecha: '2026-11-25', titulo: 'Entrenar', ...extra });
const vista = (cifras: Partial<VistaDelPeriodo['cifras']> = {}): VistaDelPeriodo => ({
  tipo: 'SEMANA', numero: 4, inicio: '2026-11-23', fin: '2026-11-29', cerrado: false, anterior: null, siguiente: null,
  cifras: {
    desde: '2026-11-23', hasta: '2026-11-29', planificadas: 8, cumplidas: 4, diasConAcciones: 4, porVenir: 2, impactoPlanificado: 30, impactoCumplido: 15,
    porcentajeCumplidas: 50, verdes: null, veintePorCiento: null,
    porEje: [
      { eje: 'CUERPO', planificadas: 4, cumplidas: 3, impactoCumplido: 10, porcentajeDelImpacto: 60 },
      { eje: 'TRABAJO', planificadas: 4, cumplidas: 1, impactoCumplido: 5, porcentajeDelImpacto: 20 },
      { eje: 'RELACIONES', planificadas: 1, cumplidas: 1, impactoCumplido: 2, porcentajeDelImpacto: 20 },
    ],
    lasQueMasMovieron: [], lasQueSeFueron: [], cumplioLoQueMenosMovia: false, cierre: null, ...cifras,
  },
  semanas: [], estado: 'EN_CURSO', falta: [], minimoDeAcciones: 5, codigoRenaser: null, analisis: null, generadoEn: null,
});

describe('recomendaciones del fénix · Hoy', () => {
  // spec 058 FR-016
  it('el peso de cada color es su parte del impacto de hoy, y la lista va por orden de impacto', () => {
    const hoy = [
      accion({ id: 'v', color: 'VERDE', puntajeImpacto: 5 }),
      accion({ id: 'a', color: 'AMARILLA', puntajeImpacto: 3 }),
      accion({ id: 'r', color: 'ROJA', puntajeImpacto: 2 }),
    ];
    expect(pesosDeHoy(hoy)).toEqual({ VERDE: 50, AMARILLA: 30, ROJA: 20 });
    expect(pesosDeHoy([])).toEqual({ VERDE: 0, AMARILLA: 0, ROJA: 0 });
    expect(porOrdenDeImpacto([hoy[2], hoy[1], hoy[0]]).map(a => a.id)).toEqual(['v', 'a', 'r']);
  });

  // spec 058 FR-016
  it('recomienda la acción que más acerca ahora, con su hora, sin contar las que esperan a la verde', () => {
    const r = recomendacionDeHoy({
      deHoy: [
        accion({ id: 'v', completada: true }),
        accion({ id: 'a', titulo: 'Vender', color: 'AMARILLA', puntajeImpacto: 3, horaInicio: '13:00:00' }),
        accion({ id: 'r', titulo: 'Leer', color: 'ROJA', puntajeImpacto: 4, bloqueada: true }),
      ],
      seFueron: [], eje: 'CUERPO', hoyIso: '2026-11-26',
    });
    expect(r.tipo).toBe('siguiente');
    expect(r.texto).toBe('«Vender» a las 13:00');
  });

  // spec 058 FR-016
  it('si ya cumplió todo, da una devolución corta', () => {
    const r = recomendacionDeHoy({ deHoy: [accion({ completada: true })], seFueron: [], eje: 'CUERPO', hoyIso: '2026-11-26' });
    expect(r.tipo).toBe('todo-cumplido');
    expect(r.texto).toBe('Cumpliste todo en Cuerpo. Mañana repite lo que hoy te funcionó.');
  });

  // spec 058 FR-016
  it('si la verde de ayer no se cumplió, ofrece reagendarla (solo la de este eje y solo la de ayer)', () => {
    const hoy = [accion({ id: 'x' })];
    expect(diaAnterior('2026-12-01')).toBe('2026-11-30');
    const r = recomendacionDeHoy({ deHoy: hoy, seFueron: [fue({})], eje: 'CUERPO', hoyIso: '2026-11-26' });
    expect(r.tipo).toBe('reagendar');
    expect(recomendacionDeHoy({ deHoy: hoy, seFueron: [fue({ eje: 'TRABAJO' })], eje: 'CUERPO', hoyIso: '2026-11-26' }).tipo).toBe('siguiente');
    expect(recomendacionDeHoy({ deHoy: hoy, seFueron: [fue({ fecha: '2026-11-24' })], eje: 'CUERPO', hoyIso: '2026-11-26' }).tipo).toBe('siguiente');
    expect(recomendacionDeHoy({ deHoy: [], seFueron: [], eje: 'CUERPO', hoyIso: '2026-11-26' }).tipo).toBe('sin-acciones');
  });
});

describe('recomendaciones del fénix · Semana', () => {
  // spec 058 FR-016
  it('el mapa de calor tiene un cuadro por día y por eje, con lo que se sabe y «sin dato» donde no llega', () => {
    const v = vista({ lasQueMasMovieron: [fue({ fecha: '2026-11-23' })], lasQueSeFueron: [fue({ fecha: '2026-11-24', color: 'AMARILLA', eje: 'TRABAJO', titulo: 'Vender' })] });
    const mapa = mapaDeCalor(v, [accion({ fecha: '2026-11-27', completada: false })], '2026-11-26');
    expect(mapa.dias).toHaveLength(7);
    expect(mapa.dias[0]).toBe('2026-11-23');
    expect(mapa.filas.map(f => f.eje)).toEqual(['CUERPO', 'TRABAJO', 'RELACIONES']);
    expect(mapa.filas[0].celdas[0]).toBe('TODO');
    expect(mapa.filas[1].celdas[1]).toBe('NADA');
    expect(mapa.filas[0].celdas[4]).toBe('POR_VENIR');
    expect(mapa.filas[2].celdas[0]).toBe('SIN_DATO');
    expect(mapa.conDato).toBe(3);
  });

  // spec 058 FR-016
  it('recomienda primero el eje en blanco', () => {
    const v = vista({ porEje: [{ eje: 'CUERPO', planificadas: 4, cumplidas: 3, impactoCumplido: 1, porcentajeDelImpacto: 50 }, { eje: 'TRABAJO', planificadas: 2, cumplidas: 2, impactoCumplido: 1, porcentajeDelImpacto: 50 }] });
    const r = recomendacionDeLaSemana(v);
    expect(r.texto).toBe('Relaciones no tiene acciones esta semana. Agenda una verde para ese eje.');
    expect(r.ofreceAgendar).toBe(true);
  });

  // spec 058 FR-016
  it('luego la verde que más se repite entre las que se fueron, y luego el eje que más se queda atrás', () => {
    const v = vista({ lasQueSeFueron: [fue({ titulo: 'Trotar', fecha: '2026-11-24' }), fue({ titulo: 'Trotar', fecha: '2026-11-25' }), fue({ titulo: 'Leer' })] });
    expect(recomendacionDeLaSemana(v).texto).toBe('Tu verde «Trotar» se quedó el martes. Reagéndala para esta semana.');
    expect(recomendacionDeLaSemana(vista()).texto).toBe('Negocio va en 1 de 4. Reagenda su verde primero.');
    expect(recomendacionDeLaSemana(vista({ planificadas: 0, porEje: [] })).ofreceAgendar).toBe(true);
    const bien = vista({ porEje: [
      { eje: 'CUERPO', planificadas: 4, cumplidas: 4, impactoCumplido: 1, porcentajeDelImpacto: 40 },
      { eje: 'TRABAJO', planificadas: 4, cumplidas: 3, impactoCumplido: 1, porcentajeDelImpacto: 30 },
      { eje: 'RELACIONES', planificadas: 2, cumplidas: 2, impactoCumplido: 1, porcentajeDelImpacto: 30 },
    ] });
    expect(recomendacionDeLaSemana(bien)).toEqual({ texto: 'Vas muy bien. Sigue haciendo tu verde primero cada día.', ofreceAgendar: false });
  });
});

describe('recomendaciones del fénix · Mes y planificación', () => {
  // spec 058 FR-016
  it('proyecta en línea recta con inicio, actual, meta del mes y días transcurridos (baja o sube)', () => {
    const baja = proyeccionDelMes({ inicio: 82, actual: 80.5, metaDelMes: 79, diaPrograma: 23, diaEnQueTerminaElMes: 30 });
    expect(baja?.proyectado).toBeCloseTo(82 - (1.5 / 23) * 30, 5);
    expect(baja?.llega).toBe(false);
    expect(baja?.faltaria).toBeCloseTo(baja!.proyectado - 79, 5);
    const sube = proyeccionDelMes({ inicio: 0, actual: 5000, metaDelMes: 6000, diaPrograma: 10, diaEnQueTerminaElMes: 30 });
    expect(sube?.llega).toBe(true);
    expect(sube?.faltaria).toBe(0);
    expect(proyeccionDelMes({ inicio: 5, actual: 5, metaDelMes: 5, diaPrograma: 10, diaEnQueTerminaElMes: 30 })).toBeNull();
    expect(proyeccionDelMes({ inicio: 5, actual: 6, metaDelMes: 9, diaPrograma: 0, diaEnQueTerminaElMes: 30 })).toBeNull();
  });

  // spec 058 FR-016
  it('la recomendación del mes depende de si llegas; sin objetivo numérico usa las acciones', () => {
    expect(recomendacionDelMes({ llega: true, eje: 'CUERPO', vista: null })).toBe('Vas por buen camino. Sigue con tu verde primero cada día.');
    expect(recomendacionDelMes({ llega: false, eje: 'CUERPO', vista: null })).toBe('Para llegar, haz primero tu verde de Cuerpo cada día.');
    expect(recomendacionDelMes({ llega: null, eje: 'CUERPO', vista: vista() })).toBe('Negocio va en 1 de 4. Reagenda su verde primero.');
  });

  // spec 058 FR-017
  it('«Planifica tus objetivos»: primero la semana por armar, luego los días vacíos y al final un cierre', () => {
    expect(recomendacionDeLaPlanificacion({ ejesSinSemana: ['RELACIONES'], diasSinAccionesPorVenir: 3 })).toBe('Te falta armar tu semana de Relaciones.');
    expect(recomendacionDeLaPlanificacion({ ejesSinSemana: ['CUERPO', 'RELACIONES'], diasSinAccionesPorVenir: 0 })).toBe('Te falta armar tu semana de Cuerpo y Relaciones.');
    expect(recomendacionDeLaPlanificacion({ ejesSinSemana: [], diasSinAccionesPorVenir: 1 })).toBe('Te queda 1 día sin acciones. Agenda una verde y lo cierras.');
    expect(recomendacionDeLaPlanificacion({ ejesSinSemana: [], diasSinAccionesPorVenir: 4 })).toBe('Te quedan 4 días sin acciones. Agenda una verde para el próximo.');
    expect(recomendacionDeLaPlanificacion({ ejesSinSemana: [], diasSinAccionesPorVenir: 0 })).toBe('Tu semana está armada y tu agenda va completa. Ahora toca hacerla.');
  });
});
