import { describe, expect, it, jest } from '@jest/globals';

import { aceptarUnaPorUna, textoDelResultado } from '../aceptarVarias';

const ana = { id: 's-1', nombre: 'Ana' };
const beto = { id: 's-2', nombre: 'Beto' };
const caro = { id: 's-3', nombre: 'Caro' };

describe('aceptar varias, una por una (025-3 C)', () => {
  it('las hace en orden y avisa el avance', async () => {
    const orden: string[] = [];
    const avances: Array<[number, number]> = [];
    const resultado = await aceptarUnaPorUna(
      [ana, beto, caro],
      async persona => {
        orden.push(persona.id);
      },
      (hechas, total) => avances.push([hechas, total]),
    );
    expect(orden).toEqual(['s-1', 's-2', 's-3']);
    expect(avances).toEqual([[0, 3], [1, 3], [2, 3]]);
    expect(resultado.aceptadas).toHaveLength(3);
    expect(resultado.fallidas).toEqual([]);
    expect(textoDelResultado(resultado, 3)).toBe('Aceptaste a las 3 personas.');
  });

  it('una que falla no deshace ni detiene a las demás, y queda dicha con su motivo', async () => {
    const aceptar = jest.fn(async (persona: { id: string }) => {
      if (persona.id === 's-2') throw new Error('Esa solicitud ya la decidió otra persona.');
    });
    const resultado = await aceptarUnaPorUna([ana, beto, caro], aceptar);
    expect(aceptar).toHaveBeenCalledTimes(3);
    expect(resultado.aceptadas.map(p => p.id)).toEqual(['s-1', 's-3']);
    expect(resultado.fallidas).toEqual([{ persona: beto, motivo: 'Esa solicitud ya la decidió otra persona.' }]);
    expect(textoDelResultado(resultado, 3)).toBe('Aceptaste a 2 de 3. No se pudo aceptar a Beto: Esa solicitud ya la decidió otra persona.');
  });

  it('con una sola persona que falla, dice solo el motivo', async () => {
    const resultado = await aceptarUnaPorUna([ana], async () => {
      throw new Error('Elige la duración.');
    });
    expect(textoDelResultado(resultado, 1)).toBe('No se pudo aceptar a Ana: Elige la duración.');
  });
});
