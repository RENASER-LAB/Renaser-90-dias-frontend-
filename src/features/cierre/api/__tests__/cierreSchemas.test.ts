import { describe, expect, it } from '@jest/globals';

import { leerCierreDelDia, leerCierresDeLaSemana } from '../cierreSchemas';

/**
 * Los esquemas de «Cierra tu día» (spec 017) son TOLERANTES: un campo que falta o no se entiende se pierde él, no la
 * lectura; y una respuesta que no es un cierre se rechaza para que Training no dibuje la fila.
 */

const ACCION_CUMPLIDA = {
  id: 'a-1',
  titulo: 'Enviar la propuesta al cliente',
  horaInicio: '10:00:00',
  cumplida: true,
  cumplidaEn: '2026-10-29T15:20:00Z',
  cierre: null,
};
const ACCION_PENDIENTE = {
  id: 'a-2',
  titulo: 'Revisar las facturas',
  horaInicio: '20:30:00',
  cumplida: false,
  cumplidaEn: null,
  cierre: { motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA', nota: 'Se alargó la reunión' },
};

const DIA = {
  fecha: '2026-10-29',
  estado: 'ABIERTO',
  puedeCerrar: true,
  cerradoEn: null,
  nota: null,
  acciones: [ACCION_CUMPLIDA, ACCION_PENDIENTE],
  semana: { cumplidas: 7, planificadas: 12 },
};

describe('el cierre de un día', () => {
  it('lee el contrato tal cual, con la hora de Jackson (HH:mm:ss) recortada a HH:mm', () => {
    const d = leerCierreDelDia(DIA, 'prueba');
    expect(d).toMatchObject({
      fecha: '2026-10-29',
      estado: 'ABIERTO',
      puedeCerrar: true,
      cerradoEn: null,
      nota: null,
      semana: { cumplidas: 7, planificadas: 12 },
    });
    expect(d.acciones.map(a => [a.id, a.horaInicio, a.cumplida])).toEqual([
      ['a-1', '10:00', true],
      ['a-2', '20:30', false],
    ]);
    expect(d.acciones[1].cierre).toEqual({ motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA', nota: 'Se alargó la reunión' });
  });

  it('acepta la hora sin segundos y no inventa una cuando no es una hora', () => {
    const d = leerCierreDelDia({ ...DIA, acciones: [{ ...ACCION_CUMPLIDA, horaInicio: '09:05' }, { ...ACCION_PENDIENTE, horaInicio: 'tarde' }] }, 'p');
    expect(d.acciones.map(a => a.horaInicio)).toEqual(['09:05', null]);
  });

  it('respeta el orden que mandó el servidor (no reordena)', () => {
    const d = leerCierreDelDia({ ...DIA, acciones: [ACCION_PENDIENTE, ACCION_CUMPLIDA] }, 'p');
    expect(d.acciones.map(a => a.id)).toEqual(['a-2', 'a-1']);
  });

  it('un campo nuevo del servidor no la rompe (passthrough)', () => {
    expect(() => leerCierreDelDia({ ...DIA, algoNuevo: 1, acciones: [{ ...ACCION_CUMPLIDA, extra: true }] }, 'p')).not.toThrow();
  });

  it('una acción que no se entiende se pierde ELLA, no el día', () => {
    const d = leerCierreDelDia(
      { ...DIA, acciones: [ACCION_CUMPLIDA, { id: '', titulo: 'sin id' }, { id: 'x' }, 42, null, { ...ACCION_PENDIENTE, id: 'a-1' }] },
      'p',
    );
    expect(d.acciones.map(a => a.id)).toEqual(['a-1']);
  });

  it('una respuesta de cierre rota se pierde sola: la acción sigue a la vista', () => {
    const d = leerCierreDelDia({ ...DIA, acciones: [{ ...ACCION_PENDIENTE, cierre: 'raro' }] }, 'p');
    expect(d.acciones[0].cierre).toBeNull();
  });

  it('un motivo o un plan desconocidos se conservan como texto: no se eligen pero tampoco rompen', () => {
    const d = leerCierreDelDia({ ...DIA, acciones: [{ ...ACCION_PENDIENTE, cierre: { motivo: 'NUEVO', manana: null, nota: '  ' } }] }, 'p');
    expect(d.acciones[0].cierre).toEqual({ motivo: 'NUEVO', manana: null, nota: null });
  });

  it('un estado desconocido sale null (no se afirma qué es), o CERRADO si hay hora de cierre', () => {
    expect(leerCierreDelDia({ ...DIA, estado: 'RARO' }, 'p').estado).toBeNull();
    expect(leerCierreDelDia({ ...DIA, estado: 'RARO', cerradoEn: '2026-10-29T22:00:00Z' }, 'p').estado).toBe('CERRADO');
    expect(leerCierreDelDia({ ...DIA, estado: undefined }, 'p').estado).toBeNull();
  });

  it('la semana mal formada o a medias es null: la hoja no dibuja la línea (nunca «0 de 0»)', () => {
    expect(leerCierreDelDia({ ...DIA, semana: null }, 'p').semana).toBeNull();
    expect(leerCierreDelDia({ ...DIA, semana: { cumplidas: 3 } }, 'p').semana).toBeNull();
    expect(leerCierreDelDia({ ...DIA, semana: 'x' }, 'p').semana).toBeNull();
    expect(leerCierreDelDia({ ...DIA, semana: undefined }, 'p').semana).toBeNull();
  });

  it('sin acciones, sin puedeCerrar o sin nota: valores sin sorpresas', () => {
    const d = leerCierreDelDia({ fecha: '2026-10-29' }, 'p');
    expect(d).toMatchObject({ acciones: [], puedeCerrar: false, nota: null, cerradoEn: null, semana: null });
  });

  it.each([
    ['una lista vacía (un backend que no conoce la ruta)', []],
    ['texto', 'hola'],
    ['null', null],
    ['un objeto sin fecha', { acciones: [] }],
    ['una fecha que no existe', { fecha: '2026-02-31' }],
    ['una fecha con otro formato', { fecha: '29/10/2026' }],
  ])('%s no es un cierre: error, para que Training no dibuje la fila', (_nombre, entrada) => {
    expect(() => leerCierreDelDia(entrada, 'GET /rocks/day-closure')).toThrow(/Respuesta inesperada de GET \/rocks\/day-closure/);
  });
});

const SEMANA = {
  semana: '2026-10-26',
  primeraSemana: '2026-10-12',
  dias: [
    { fecha: '2026-10-29', estado: 'ABIERTO', cerradoEn: null, nota: null, acciones: [] },
    { fecha: '2026-10-28', estado: 'CERRADO', cerradoEn: '2026-10-29T03:02:00Z', nota: null, acciones: [ACCION_PENDIENTE] },
  ],
  resumen: { cerrados: 1, sinCerrar: 0, motivos: [{ motivo: 'SIN_TIEMPO', veces: 1 }] },
};

describe('la semana de cierres de una persona', () => {
  it('lee el contrato y ordena los días por fecha', () => {
    const s = leerCierresDeLaSemana(SEMANA, 'p');
    expect(s.semana).toBe('2026-10-26');
    expect(s.primeraSemana).toBe('2026-10-12');
    expect(s.dias.map(d => [d.fecha, d.estado])).toEqual([
      ['2026-10-28', 'CERRADO'],
      ['2026-10-29', 'ABIERTO'],
    ]);
    expect(s.resumen).toEqual({ cerrados: 1, sinCerrar: 0, motivos: [{ motivo: 'SIN_TIEMPO', veces: 1 }] });
  });

  it('lo único indispensable es el lunes', () => {
    expect(() => leerCierresDeLaSemana({ dias: [] }, 'p')).toThrow(/Respuesta inesperada/);
    expect(() => leerCierresDeLaSemana([], 'p')).toThrow(/Respuesta inesperada/);
    const s = leerCierresDeLaSemana({ semana: '2026-10-26' }, 'p');
    expect(s).toEqual({ semana: '2026-10-26', primeraSemana: null, dias: [], resumen: null });
  });

  it('un día, un motivo o el resumen que no se entienden se pierden ELLOS, no la sección', () => {
    const s = leerCierresDeLaSemana(
      { ...SEMANA, dias: [...SEMANA.dias, { fecha: 'no' }, 7, { fecha: '2026-10-28' }], resumen: { cerrados: 'x', motivos: [{ motivo: '' }, { motivo: 'SIN_ENERGIA', veces: 2 }, 5] } },
      'p',
    );
    expect(s.dias.map(d => d.fecha)).toEqual(['2026-10-28', '2026-10-29']);
    expect(s.resumen).toEqual({ cerrados: null, sinCerrar: null, motivos: [{ motivo: 'SIN_ENERGIA', veces: 2 }] });
    expect(leerCierresDeLaSemana({ ...SEMANA, resumen: 'roto' }, 'p').resumen).toBeNull();
  });

  it('una primera semana que no es una fecha es null: ‹ queda apagado, no se inventa un tope', () => {
    expect(leerCierresDeLaSemana({ ...SEMANA, primeraSemana: 'ayer' }, 'p').primeraSemana).toBeNull();
  });
});
