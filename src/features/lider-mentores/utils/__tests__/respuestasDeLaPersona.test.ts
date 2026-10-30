import { describe, expect, it } from '@jest/globals';

import type {
  DiaDeLaPersona,
  ObligacionDeLaPersona,
  ProgramacionDeLaPersona,
} from '../../types/cumplimientoDelLider.types';
import { evidenciasDeLosDias, respuestaDeEvidencias, respuestaDeProgramacion } from '../respuestasDeLaPersona';

/** Spec 018, FR-006 a FR-010: las dos respuestas de arriba de la ficha, dichas en palabras. */

function programacion(cambios: Partial<ProgramacionDeLaPersona> = {}): ProgramacionDeLaPersona {
  return { habitosConHora: 5, habitosTotal: 17, accionesConHora: 0, accionesTotal: 2, programo: false, ...cambios };
}

function obligacion(cambios: Partial<ObligacionDeLaPersona> = {}): ObligacionDeLaPersona {
  return {
    registroId: Math.random().toString(36),
    titulo: 'Caminar',
    estado: 'COMPLETADO',
    requiereEvidencia: true,
    entrega: 'SIN_ENTREGA',
    entregadaEn: null,
    revision: null,
    evidenciaId: null,
    respuestaTexto: null,
    evidencias: [],
    publicacionId: null,
    ...cambios,
  };
}

function dia(obligaciones: ObligacionDeLaPersona[], motivo: string | null = null): DiaDeLaPersona {
  return { fecha: '2026-10-14', diaDePrograma: 20, motivo, obligaciones, acciones: [] };
}

const ENTREGADA = { entrega: 'ENTREGADA' };
const CON_FOTO = { entrega: 'ENTREGADA', evidencias: [{ id: 'e1', tipo: 'FOTO', subidaEn: null }] };

describe('«¿Programó?»', () => {
  it('dice Sí o No como lo decide el servidor, con los hábitos con su hora y las acciones agendadas', () => {
    const no = respuestaDeProgramacion(programacion());
    expect(no).toMatchObject({ pregunta: '¿Programó?', valor: 'No', tono: 'mal' });
    expect(no?.detalle).toBe('5 de 17 hábitos con su hora · 0 de 2 acciones agendadas');

    const si = respuestaDeProgramacion(programacion({ habitosConHora: 12, accionesConHora: 2, programo: true }));
    expect(si).toMatchObject({ valor: 'Sí', tono: 'bien' });
    expect(si?.detalle).toBe('12 de 17 hábitos con su hora · 2 de 2 acciones agendadas');
  });

  it('la app no recalcula: el «Sí» es del servidor aunque las cuentas dijeran otra cosa', () => {
    expect(respuestaDeProgramacion(programacion({ habitosConHora: 0, programo: true }))?.valor).toBe('Sí');
    expect(respuestaDeProgramacion(programacion({ habitosConHora: 17, accionesConHora: 2, programo: false }))?.valor).toBe('No');
  });

  it('en singular cuando es uno, y «sin acciones hoy» cuando no hay ninguna', () => {
    const una = respuestaDeProgramacion(programacion({ habitosConHora: 1, habitosTotal: 1, accionesConHora: 1, accionesTotal: 1, programo: true }));
    expect(una?.detalle).toBe('1 de 1 hábito con su hora · 1 de 1 acción agendada');
    const ninguna = respuestaDeProgramacion(programacion({ accionesConHora: 0, accionesTotal: 0 }));
    expect(ninguna?.detalle).toBe('5 de 17 hábitos con su hora · sin acciones hoy');
  });

  it('sin programación (un servidor anterior, o nada que programar hoy) no hay tarjeta', () => {
    expect(respuestaDeProgramacion(null)).toBeNull();
    expect(respuestaDeProgramacion(undefined)).toBeNull();
  });

  it('se lee de corrido para quien no ve la tarjeta', () => {
    expect(respuestaDeProgramacion(programacion())?.dicho).toBe(
      '¿Programó? No. 5 de 17 hábitos con su hora · 0 de 2 acciones agendadas.',
    );
  });
});

describe('«¿Subió evidencias?»', () => {
  it('cuenta, de los hábitos que piden evidencia, cuántos la tienen: «4 de 12»', () => {
    const dias = [
      dia([obligacion(ENTREGADA), obligacion(CON_FOTO), obligacion(), obligacion()]),
      dia([obligacion(ENTREGADA), obligacion({ publicacionId: 'p1' }), obligacion(), obligacion(), obligacion(), obligacion(), obligacion(), obligacion()]),
    ];
    const r = respuestaDeEvidencias(dias);
    expect(r).toMatchObject({ pregunta: '¿Subió evidencias?', valor: '4 de 12', detalle: 'Estos 7 días', tono: 'neutro' });
    expect(r?.dicho).toBe('¿Subió evidencias? 4 de 12. Estos 7 días.');
  });

  it('los hábitos que no piden evidencia no entran ni al total ni a lo cumplido', () => {
    const dias = [dia([obligacion({ requiereEvidencia: false }), obligacion({ requiereEvidencia: false, evidencias: CON_FOTO.evidencias }), obligacion(ENTREGADA)])];
    expect(evidenciasDeLosDias(dias)).toEqual({ conEvidencia: 1, total: 1 });
  });

  it('una evidencia subida o la publicación del Muro cuentan aunque la entrega no lo diga', () => {
    const dias = [dia([obligacion({ evidencias: CON_FOTO.evidencias }), obligacion({ publicacionId: 'p9' }), obligacion()])];
    expect(evidenciasDeLosDias(dias)).toEqual({ conEvidencia: 2, total: 3 });
  });

  it('hoy y los días que no llegaron no cuentan: lo que aún se puede entregar no es una falta', () => {
    const dias = [dia([obligacion(), obligacion()], 'EN_CURSO'), dia([obligacion()], 'FUTURO'), dia([obligacion(ENTREGADA)])];
    expect(evidenciasDeLosDias(dias)).toEqual({ conEvidencia: 1, total: 1 });
  });

  it('sin ningún hábito que pida evidencia no hay tarjeta: nunca un «0 de 0»', () => {
    expect(respuestaDeEvidencias([])).toBeNull();
    expect(respuestaDeEvidencias([dia([obligacion({ requiereEvidencia: false })])])).toBeNull();
  });

  it('pedirlas y no tener ninguna es «0 de N», que es una respuesta', () => {
    expect(respuestaDeEvidencias([dia([obligacion(), obligacion()])])?.valor).toBe('0 de 2');
  });
});
