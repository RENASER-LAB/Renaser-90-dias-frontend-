import { describe, expect, it } from '@jest/globals';
import { posicionarPorEje } from '../useRocasDiarias';

describe('posicionarPorEje (#184)', () => {
  it('los pasos escritos al agendar viajan con la acción', () => { // spec 048 FR-019
    const [item] = posicionarPorEje([{ eje: 'CUERPO', titulo: 'Caminata', acciones: ['Calentar', 'Caminar 30 min'] }]);
    expect(item.acciones).toEqual(['Calentar', 'Caminar 30 min']);
  });

  it('sin pasos no manda el campo', () => {
    const [item] = posicionarPorEje([{ eje: 'CUERPO', titulo: 'Caminata' }]);
    expect(item).not.toHaveProperty('acciones');
  });
});
