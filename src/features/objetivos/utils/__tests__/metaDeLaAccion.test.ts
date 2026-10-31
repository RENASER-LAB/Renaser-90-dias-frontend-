import { describe, expect, it } from '@jest/globals';

import { metaDeLaAccion } from '../metaDeLaAccion';

/** La «Meta» de la acción que sigue hoy (tarjeta de Hoy, 2026-10-31): la semana de su eje o, si no hay, el objetivo de 90 días. */

const maestras = [
  { id: 'm-cuerpo', eje: 'CUERPO' as const, objetivo: 'Al Día 90 bajaré de 86 a 80 kg, caminando cada mañana' },
  { id: 'm-trabajo', eje: 'TRABAJO' as const, objetivo: 'Facturar 30000 USD' },
];
const semanales = [
  { id: 's-cuerpo', rocaMaestraId: 'm-cuerpo', titulo: 'Esta semana: caminar 5 días' },
  { id: 's-trabajo', rocaMaestraId: 'm-trabajo', titulo: '  ' },
];

describe('metaDeLaAccion', () => {
  it('prefiere el objetivo de la semana que enlaza la acción', () => {
    expect(metaDeLaAccion({ eje: 'CUERPO', rocaSemanalId: 's-cuerpo' }, semanales, maestras)).toBe('Esta semana: caminar 5 días');
  });

  it('si la acción no trae su semana, usa la semanal de su eje', () => {
    expect(metaDeLaAccion({ eje: 'CUERPO', rocaSemanalId: null }, semanales, maestras)).toBe('Esta semana: caminar 5 días');
  });

  it('sin semana (o con el título en blanco) cae a la primera cláusula del objetivo de 90 días', () => {
    expect(metaDeLaAccion({ eje: 'CUERPO', rocaSemanalId: null }, [], maestras)).toBe('Al Día 90 bajaré de 86 a 80 kg');
    expect(metaDeLaAccion({ eje: 'TRABAJO', rocaSemanalId: 's-trabajo' }, semanales, maestras)).toBe('Facturar 30000 USD');
  });

  it('una semana que no es de esa acción no se le presta', () => {
    expect(metaDeLaAccion({ eje: 'TRABAJO', rocaSemanalId: 's-otra' }, [semanales[0]], maestras)).toBe('Facturar 30000 USD');
  });

  it('sin semana ni objetivo, no hay meta: la línea no se dibuja', () => {
    expect(metaDeLaAccion({ eje: 'RELACIONES', rocaSemanalId: null }, semanales, maestras)).toBeNull();
    expect(metaDeLaAccion({ eje: 'CUERPO', rocaSemanalId: null }, [], [])).toBeNull();
  });

  it('limpia los espacios del texto', () => {
    expect(metaDeLaAccion({ eje: 'CUERPO', rocaSemanalId: 's' }, [{ id: 's', rocaMaestraId: 'x', titulo: '  Una   meta \n clara ' }], [])).toBe('Una meta clara');
  });
});
