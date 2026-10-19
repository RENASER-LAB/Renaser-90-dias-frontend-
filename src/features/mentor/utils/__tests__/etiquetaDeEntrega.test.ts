import { describe, expect, it } from '@jest/globals';

import { etiquetaDeEntrega } from '../etiquetaDeEntrega';

/*
 * E2E de la spec 005 (E-629 (c)): en la ficha del mentor, el post diario cumplido al publicar en el Muro decía «Evidencia
 * entregada · pendiente de revisión»: su entrega es la publicación, que no tiene revisión, y el mentor creía que le
 * tocaba revisar algo.
 */
describe('etiquetaDeEntrega (ficha del mentor)', () => {
  it('sin entrega, lo dice', () => {
    expect(etiquetaDeEntrega('SIN_ENTREGA', null, null)).toBe('Evidencia sin entregar');
  });

  it('con archivo, cuenta la revisión', () => {
    expect(etiquetaDeEntrega('ENTREGADA', 'VALIDA', null)).toBe('Evidencia entregada · verificada');
    expect(etiquetaDeEntrega('ENTREGADA', 'RECHAZADA', null)).toBe('Evidencia entregada · rechazada');
    expect(etiquetaDeEntrega('ENTREGADA', 'REVISION_MANUAL', null)).toBe('Evidencia entregada · en revisión');
    expect(etiquetaDeEntrega('ENTREGADA', 'PENDIENTE', null)).toBe('Evidencia entregada · pendiente de revisión');
  });

  it('el post diario se entrega con una publicación: no tiene revisión pendiente', () => {
    expect(etiquetaDeEntrega('ENTREGADA', null, 'pub-1')).toBe('Publicado en el Muro');
  });

  it('una publicación con archivo y revisión conserva su revisión', () => {
    expect(etiquetaDeEntrega('ENTREGADA', 'VALIDA', 'pub-1')).toBe('Evidencia entregada · verificada');
  });
});
