/**
 * Qué dice la fila compacta del programa propio (2026-11-01, pedido del dueño). Pura: una sola función para Hoy y Plan.
 */
import { describe, expect, it } from '@jest/globals';

import { entradaAlProgramaPropio } from '../entradaAlProgramaPropio';
import { vistaDeLaFilaDelPrograma } from '../filaDelPrograma';

describe('vistaDeLaFilaDelPrograma', () => {
  it('sin fila en el programa: «Haz tu programa de 90 días · Elige tu Día 1», con «Ahora no» y abriendo el selector', () => {
    const v = vistaDeLaFilaDelPrograma({ entrada: 'EMPEZAR', plazo: '90 días' });
    expect(v).toEqual({
      tipo: 'empezar',
      titulo: 'Haz tu programa de 90 días',
      linea: 'Elige tu Día 1',
      abreElSelector: true,
      conAhoraNo: true,
      etiquetaAccesible: 'Haz tu programa de 90 días. Elige tu Día 1.',
    });
  });

  it('el plazo es el de SU programa: 90 días, 3 meses o 1 año', () => {
    expect(vistaDeLaFilaDelPrograma({ entrada: 'EMPEZAR', plazo: '3 meses' })?.titulo).toBe('Haz tu programa de 3 meses');
    expect(vistaDeLaFilaDelPrograma({ entrada: 'EMPEZAR', plazo: '1 año' })?.titulo).toBe('Haz tu programa de 1 año');
  });

  it('con la fila sin Día 1: «Todavía no elegiste tu Día 1 · Elige cuándo empiezas», sin «Ahora no»', () => {
    const v = vistaDeLaFilaDelPrograma({ entrada: 'ELEGIR_DIA_UNO', plazo: '90 días' });
    expect(v).toMatchObject({
      tipo: 'elegir',
      titulo: 'Todavía no elegiste tu Día 1',
      linea: 'Elige cuándo empiezas',
      abreElSelector: true,
      conAhoraNo: false,
    });
  });

  it('sin nada que ofrecer no hay fila', () => {
    expect(vistaDeLaFilaDelPrograma({ entrada: null, plazo: '90 días' })).toBeNull();
  });

  it('menos texto: nada del párrafo de antes', () => {
    for (const entrada of ['EMPEZAR', 'ELEGIR_DIA_UNO'] as const) {
      const v = vistaDeLaFilaDelPrograma({ entrada, plazo: '90 días' })!;
      const todo = `${v.titulo} ${v.linea ?? ''}`;
      expect(todo).not.toContain('Puedes recorrerlo');
      expect(todo).not.toContain('No cambia');
      expect(v.titulo.length + (v.linea?.length ?? 0)).toBeLessThan(60);
    }
  });
});

describe('quien ya eligió su Día 1 y espera (issue #72)', () => {
  it('dice cuándo empieza, con la fecha en español: «Tu programa empieza el martes 3 de noviembre»', () => {
    const v = vistaDeLaFilaDelPrograma({ entrada: 'ESPERANDO_INICIO', plazo: '90 días', fechaInicio: '2026-11-03' });
    expect(v).toEqual({
      tipo: 'esperando',
      titulo: 'Tu programa empieza el martes 3 de noviembre',
      linea: null,
      // No lleva a nada: sin chevron ni selector, y sin «Ahora no» (no hay nada que posponer).
      abreElSelector: false,
      conAhoraNo: false,
      etiquetaAccesible: 'Tu programa empieza el martes 3 de noviembre',
    });
  });

  it('el día de la semana sale bien en cualquier mes y año (lunes 2 de noviembre de 2026, miércoles 1 de enero de 2031)', () => {
    expect(vistaDeLaFilaDelPrograma({ entrada: 'ESPERANDO_INICIO', plazo: '90 días', fechaInicio: '2026-11-02' })?.titulo).toBe(
      'Tu programa empieza el lunes 2 de noviembre',
    );
    expect(vistaDeLaFilaDelPrograma({ entrada: 'ESPERANDO_INICIO', plazo: '90 días', fechaInicio: '2031-01-01' })?.titulo).toBe(
      'Tu programa empieza el miércoles 1 de enero',
    );
  });

  it('sin fecha no se inventa ninguna: «Tu programa empieza pronto»', () => {
    for (const fechaInicio of [null, undefined, '']) {
      expect(vistaDeLaFilaDelPrograma({ entrada: 'ESPERANDO_INICIO', plazo: '90 días', fechaInicio })?.titulo).toBe('Tu programa empieza pronto');
    }
  });

  it('el plazo no cambia lo que se dice: la fecha es la misma en cualquier formación', () => {
    for (const plazo of ['90 días', '3 meses', '1 año']) {
      expect(vistaDeLaFilaDelPrograma({ entrada: 'ESPERANDO_INICIO', plazo, fechaInicio: '2026-11-03' })?.titulo).toBe(
        'Tu programa empieza el martes 3 de noviembre',
      );
    }
  });
});

describe('entradaAlProgramaPropio: cuál manda', () => {
  it('sin Día 1 elegido manda sobre esperar, y esperar sobre empezar', () => {
    expect(entradaAlProgramaPropio({ diaUnoPorElegir: true, puedeEmpezar: true, esperandoInicio: true })).toBe('ELEGIR_DIA_UNO');
    expect(entradaAlProgramaPropio({ diaUnoPorElegir: false, puedeEmpezar: true, esperandoInicio: true })).toBe('ESPERANDO_INICIO');
    expect(entradaAlProgramaPropio({ diaUnoPorElegir: false, puedeEmpezar: true, esperandoInicio: false })).toBe('EMPEZAR');
    expect(entradaAlProgramaPropio({ diaUnoPorElegir: false, puedeEmpezar: false })).toBeNull();
  });
});
