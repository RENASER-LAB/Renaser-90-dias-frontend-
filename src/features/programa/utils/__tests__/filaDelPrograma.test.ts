/**
 * Qué dice la fila compacta del programa propio (2026-11-01, pedido del dueño). Pura: una sola función para Hoy y Plan.
 */
import { describe, expect, it } from '@jest/globals';

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
