import { describe, expect, it } from '@jest/globals';
import { pedirPestanaAlMontar, tomarPestanaAlMontar } from '../pestanaAlMontar';

describe('pestaña pedida para cuando se vuelvan a armar las pestañas', () => {
  it('se toma una sola vez', () => {
    pedirPestanaAlMontar({ nombre: 'Yo', params: { abrirSoporteTi: true } });
    expect(tomarPestanaAlMontar()).toEqual({ nombre: 'Yo', params: { abrirSoporteTi: true } });
    expect(tomarPestanaAlMontar()).toBeNull();
  });

  it('sin pedido, las pestañas arrancan como siempre', () => {
    expect(tomarPestanaAlMontar()).toBeNull();
  });
});
