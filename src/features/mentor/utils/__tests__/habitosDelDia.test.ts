import { describe, expect, it } from '@jest/globals';

import type { ObligacionDeLaPersona, PilarDelHabito } from '../../../lider-mentores/types/cumplimientoDelLider.types';
import { agruparPorPilar, estadoDelHabito, habitoDelDia } from '../habitosDelDia';
import { diasDeLaSemana, limitesDelMes, sePuedeElegir, tituloDelDia, viernesDeLaSemana } from '../fechasDeLaFicha';

const o = (registroId: string, estado: string, pilar: PilarDelHabito | null, extra: Partial<ObligacionDeLaPersona> = {}): ObligacionDeLaPersona => ({
  registroId,
  titulo: `Hábito ${registroId}`,
  estado,
  requiereEvidencia: false,
  entrega: null,
  entregadaEn: null,
  revision: null,
  evidenciaId: null,
  respuestaTexto: null,
  evidencias: [],
  publicacionId: null,
  pilar,
  medicion: null,
  ...extra,
});

describe('el estado de un hábito', () => {
  it('COMPLETADO es cumplido; FALLIDO y EXPIRADO, vencido; PENDIENTE y EN_CURSO, pendiente', () => { // spec 055 FR-014
    expect(estadoDelHabito('COMPLETADO')).toBe('cumplido');
    expect(estadoDelHabito('FALLIDO')).toBe('vencido');
    expect(estadoDelHabito('EXPIRADO')).toBe('vencido');
    expect(estadoDelHabito('PENDIENTE')).toBe('pendiente');
    expect(estadoDelHabito('EN_CURSO')).toBe('pendiente');
    expect(estadoDelHabito('algo nuevo')).toBe('pendiente');
  });

  it('la hora de un cumplido es la de su entrega en la zona del APRENDIZ, no la del teléfono', () => { // spec 055 FR-014
    const lima = habitoDelDia(o('1', 'COMPLETADO', 'CUERPO', { entregadaEn: '2026-11-12T13:30:00Z' }), 'America/Lima');
    const madrid = habitoDelDia(o('1', 'COMPLETADO', 'CUERPO', { entregadaEn: '2026-11-12T13:30:00Z' }), 'Europe/Madrid');
    expect(lima.hora).toBe('08:30');
    expect(madrid.hora).toBe('14:30');
  });

  it('un cumplido sin entrega va sin hora, y un pendiente nunca lleva hora ni ojo', () => { // spec 055 FR-014
    expect(habitoDelDia(o('1', 'COMPLETADO', null), 'America/Lima').hora).toBeNull();
    const pendiente = habitoDelDia(o('2', 'PENDIENTE', null, { entregadaEn: '2026-11-12T13:30:00Z', evidencias: [{ id: 'e', tipo: 'FOTO', subidaEn: null }] }), 'America/Lima');
    expect(pendiente.hora).toBeNull();
    expect(pendiente.conEvidencia).toBe(false);
  });
});

describe('los hábitos agrupados por pilar', () => {
  const dia = [
    o('e1', 'COMPLETADO', 'ESPIRITU'),
    o('c1', 'COMPLETADO', 'CUERPO'),
    o('m1', 'PENDIENTE', 'MENTE'),
    o('c2', 'FALLIDO', 'CUERPO'),
    o('x1', 'COMPLETADO', null),
  ];

  it('van en el orden Cuerpo, Mente, Espíritu, Emociones y los sin pilar al final', () => { // spec 055 FR-013
    expect(agruparPorPilar(dia, 'America/Lima').map(p => p.titulo)).toEqual(['Cuerpo', 'Mente', 'Espíritu', 'Otros hábitos']);
  });

  it('cada pilar cuenta «N de M» con los cumplidos', () => { // spec 055 FR-013
    const cuerpo = agruparPorPilar(dia, 'America/Lima')[0];
    expect([cuerpo.cumplidos, cuerpo.total]).toEqual([1, 2]);
  });

  it('se abre solo el primer pilar con pendientes o vencidos', () => { // spec 055 FR-013
    const abiertos = agruparPorPilar(dia, 'America/Lima').map(p => p.abiertoAlEmpezar);
    expect(abiertos).toEqual([true, false, false, false]);
    const sinCuerpoPendiente = agruparPorPilar([o('c1', 'COMPLETADO', 'CUERPO'), o('m1', 'PENDIENTE', 'MENTE')], null);
    expect(sinCuerpoPendiente.map(p => p.abiertoAlEmpezar)).toEqual([false, true]);
  });

  it('CONSCIENCIA es «Emociones» y una clave de otra formación va después con su nombre legible', () => { // spec 055 FR-013
    const titulos = agruparPorPilar([o('x', 'PENDIENTE', 'DIPLOMADO_ESTUDIO'), o('e', 'PENDIENTE', 'CONSCIENCIA'), o('m', 'PENDIENTE', 'MENTE'), o('n', 'PENDIENTE', null)], null).map(p => p.titulo);
    expect(titulos).toEqual(['Mente', 'Emociones', 'Diplomado estudio', 'Otros hábitos']);
  });

  it('un día sin hábitos no tiene pilares', () => { // spec 055 FR-013
    expect(agruparPorPilar([], null)).toEqual([]);
  });
});

describe('las fechas de la ficha', () => {
  it('la semana va de sábado a viernes y el viernes la cierra', () => { // spec 055 FR-011
    expect(viernesDeLaSemana('2026-11-14')).toBe('2026-11-20'); // sábado
    expect(viernesDeLaSemana('2026-11-17')).toBe('2026-11-20'); // martes
    expect(viernesDeLaSemana('2026-11-20')).toBe('2026-11-20'); // viernes
    const dias = diasDeLaSemana('2026-11-20');
    expect(dias[0]).toBe('2026-11-14');
    expect(dias[6]).toBe('2026-11-20');
    expect(dias).toHaveLength(7);
  });

  it('solo se eligen días desde el Día 1 hasta hoy', () => { // spec 055 FR-015
    expect(sePuedeElegir('2026-11-10', '2026-11-10', '2026-11-17')).toBe(true);
    expect(sePuedeElegir('2026-11-09', '2026-11-10', '2026-11-17')).toBe(false);
    expect(sePuedeElegir('2026-11-18', '2026-11-10', '2026-11-17')).toBe(false);
    expect(sePuedeElegir('2026-11-12', null, '2026-11-17')).toBe(false);
  });

  it('el mes se pide de una sola vez y el título del día sale de la fecha, no del reloj', () => { // spec 055 FR-015
    expect(limitesDelMes('2026-02-11')).toEqual({ desde: '2026-02-01', hasta: '2026-02-28', clave: '2026-02' });
    expect(tituloDelDia('2026-11-12')).toBe('Jueves 12 de noviembre');
  });
});
