import { describe, expect, it } from '@jest/globals';

import {
  primerViernesDelPrograma,
  puedeIrALaAnterior,
  rotuloDeLaSemana,
  semanaAnteriorDe,
  semanaSiguienteDe,
} from '../navegacionDeLaSemana';

/**
 * Moverse entre las semanas de una persona (spec 005, FR-010): de sábado a viernes, hacia atrás hasta el
 * inicio de su programa, sin semanas futuras. Todo con fechas del servidor y aritmética de calendario con UTC:
 * nunca el reloj del teléfono.
 *
 * Calendario de las pruebas (2026): sábado 17 oct, viernes 23 oct. El programa de Ana empezó la semana del
 * sábado 29 de agosto.
 */

describe('la primera semana del programa', () => {
  it('un sábado (así lo manda el contrato) cierra su viernes seis días después', () => {
    expect(primerViernesDelPrograma('2026-08-29')).toBe('2026-09-04');
  });

  it('un viernes ya es su propio cierre; cualquier día de la semana cae en el viernes siguiente', () => {
    expect(primerViernesDelPrograma('2026-09-04')).toBe('2026-09-04');
    expect(primerViernesDelPrograma('2026-08-31')).toBe('2026-09-04');
  });

  it('una fecha ilegible no inventa un tope', () => {
    expect(primerViernesDelPrograma('mañana')).toBeNull();
    expect(primerViernesDelPrograma(null)).toBeNull();
  });
});

describe('la semana anterior', () => {
  it('siempre a siete días del viernes que se mira', () => {
    expect(semanaAnteriorDe('2026-10-23', '2026-08-29')).toBe('2026-10-16');
  });

  it('se puede llegar a la primera semana del programa, pero no pasarla', () => {
    expect(semanaAnteriorDe('2026-09-11', '2026-08-29')).toBe('2026-09-04');
    expect(semanaAnteriorDe('2026-09-04', '2026-08-29')).toBeNull();
    expect(puedeIrALaAnterior('2026-09-04', '2026-08-29')).toBe(false);
    expect(puedeIrALaAnterior('2026-09-11', '2026-08-29')).toBe(true);
  });

  it('sin saber cuándo empezó (backend sin `primeraSemana`) no se inventa un tope: lo contesta el servidor', () => {
    expect(semanaAnteriorDe('2026-10-23', null)).toBe('2026-10-16');
  });

  it('cruza el cambio de mes y de año', () => {
    expect(semanaAnteriorDe('2026-01-02', null)).toBe('2025-12-26');
  });
});

describe('la semana siguiente', () => {
  it('desde una semana pasada, siete días más', () => {
    expect(semanaSiguienteDe({ hasta: '2026-10-16', semanaEnCurso: false })).toBe('2026-10-23');
  });

  it('desde la semana en curso no hay siguiente: el futuro no se mide', () => {
    expect(semanaSiguienteDe({ hasta: '2026-10-23', semanaEnCurso: true })).toBeNull();
  });
});

describe('cómo se rotula', () => {
  it('la semana en curso y las pasadas, con el rango siempre a la vista', () => {
    expect(rotuloDeLaSemana({ desde: '2026-10-17', hasta: '2026-10-23', semanaEnCurso: true })).toEqual({
      titulo: 'Esta semana',
      rango: 'Del sábado 17 al viernes 23 de octubre',
    });
    expect(rotuloDeLaSemana({ desde: '2026-10-10', hasta: '2026-10-16', semanaEnCurso: false })).toEqual({
      titulo: 'Semana cerrada',
      rango: 'Del sábado 10 al viernes 16 de octubre',
    });
  });

  it('cuando cruza de mes dice los dos', () => {
    expect(rotuloDeLaSemana({ desde: '2026-09-26', hasta: '2026-10-02', semanaEnCurso: false }).rango).toBe(
      'Del sábado 26 de septiembre al viernes 2 de octubre',
    );
  });

  it('mientras llega la respuesta, el rango sale del viernes que se pidió', () => {
    expect(rotuloDeLaSemana({ hasta: '2026-10-16' })).toEqual({
      titulo: 'Semana',
      rango: 'Del sábado 10 al viernes 16 de octubre',
    });
  });

  it('sin saber qué semana es, no escribe un rango', () => {
    expect(rotuloDeLaSemana({ hasta: null })).toEqual({ titulo: 'Semana', rango: null });
  });
});
