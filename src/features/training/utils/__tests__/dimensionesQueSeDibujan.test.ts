import { describe, expect, it } from '@jest/globals';

import { dimensionesQueSeDibujan } from '../dimensionesQueSeDibujan';

const D = (key: string) => ({ key });

describe('qué dimensiones dibuja «Tus prácticas» (spec 023, FR-009)', () => {
  it('una categoría sin hábitos que le toquen a la persona no se dibuja; «Vida y negocio» sí, siempre', () => {
    const dimensiones = [D('DIPLOMADO_ESTUDIO'), D('DIPLOMADO_PRACTICA'), D('VIDA Y NEGOCIO')];
    expect(dimensionesQueSeDibujan(dimensiones, [{ dimension: 'DIPLOMADO_ESTUDIO' }]).map(d => d.key)).toEqual([
      'DIPLOMADO_ESTUDIO',
      'VIDA Y NEGOCIO',
    ]);
  });

  it('respeta el orden de Administración, sin importar el orden de los hábitos', () => {
    const dimensiones = [D('A'), D('B'), D('C'), D('VIDA Y NEGOCIO')];
    const habitos = [{ dimension: 'C' }, { dimension: 'A' }, { dimension: 'B' }];
    expect(dimensionesQueSeDibujan(dimensiones, habitos).map(d => d.key)).toEqual(['A', 'B', 'C', 'VIDA Y NEGOCIO']);
  });

  it('sin ningún hábito solo queda «Vida y negocio» (y Training dice que la formación todavía no tiene hábitos)', () => {
    expect(dimensionesQueSeDibujan([D('A'), D('VIDA Y NEGOCIO')], []).map(d => d.key)).toEqual(['VIDA Y NEGOCIO']);
  });

  it('«Mis hábitos» aparece solo si hay hábitos propios en ella', () => {
    const dimensiones = [D('A'), D('MIS_HABITOS'), D('VIDA Y NEGOCIO')];
    expect(dimensionesQueSeDibujan(dimensiones, [{ dimension: 'A' }]).map(d => d.key)).toEqual(['A', 'VIDA Y NEGOCIO']);
    expect(dimensionesQueSeDibujan(dimensiones, [{ dimension: 'MIS_HABITOS' }]).map(d => d.key)).toEqual(['MIS_HABITOS', 'VIDA Y NEGOCIO']);
  });
});
