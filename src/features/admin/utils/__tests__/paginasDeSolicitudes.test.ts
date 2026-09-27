import { describe, expect, it } from '@jest/globals';

import { quedanPorTraer, sinLaDecidida, sumarPagina, textoVerMas } from '../paginasDeSolicitudes';

/** A-4 (26/09): Solicitudes cargaba solo la página 0 y la solicitud 21 no se podía aprobar. */
describe('«Ver más» en Solicitudes', () => {
  const pagina = (desde: number, cuantas: number) =>
    Array.from({ length: cuantas }, (_, i) => ({ id: `s${desde + i}` }));

  it('con 21 pendientes y 20 cargadas ofrece «Ver 1 más», y la 21 queda en la lista', () => {
    const primera = pagina(1, 20);
    expect(quedanPorTraer(primera.length, 21)).toBe(true);
    expect(textoVerMas(primera.length, 21)).toBe('Ver 1 más');
    const todas = sumarPagina(primera, pagina(21, 1));
    expect(todas.map(s => s.id)).toContain('s21');
    expect(quedanPorTraer(todas.length, 21)).toBe(false);
  });

  it('no repite una solicitud si la lista se corrió entre dos páginas', () => {
    const todas = sumarPagina(pagina(1, 20), [{ id: 's20' }, { id: 's21' }]);
    expect(todas).toHaveLength(21);
  });

  it('sin total conocido no inventa más páginas', () => {
    expect(quedanPorTraer(20, null)).toBe(false);
  });

  it('aprobar o rechazar saca solo esa y descuenta el total, sin volver a la página 0', () => {
    const { lista, total } = sinLaDecidida(pagina(1, 21), 21, 's21');
    expect(lista).toHaveLength(20);
    expect(lista.find(s => s.id === 's21')).toBeUndefined();
    expect(total).toBe(20);
    expect(textoVerMas(18, 21)).toBe('Ver 3 más');
  });
});
