import { beforeEach, describe, expect, it } from '@jest/globals';
import { pedirPestanaAlMontar, tomarPestanaAlMontar, verPestanaAlMontar } from '../pestanaAlMontar';

describe('pestaña pedida para cuando se vuelvan a armar las pestañas', () => {
  beforeEach(() => pedirPestanaAlMontar(null));

  it('se toma una sola vez', () => {
    pedirPestanaAlMontar({ nombre: 'Yo', params: { abrirSoporteTi: true } });
    expect(tomarPestanaAlMontar()).toEqual({ nombre: 'Yo', params: { abrirSoporteTi: true } });
    expect(tomarPestanaAlMontar()).toBeNull();
  });

  it('verla no la consume: se puede mirar las veces que haga falta y después tomarla', () => {
    pedirPestanaAlMontar({ nombre: 'Yo', params: { abrirSoporteTi: true } });
    expect(verPestanaAlMontar()).toEqual({ nombre: 'Yo', params: { abrirSoporteTi: true } });
    expect(verPestanaAlMontar()).toEqual({ nombre: 'Yo', params: { abrirSoporteTi: true } });
    expect(tomarPestanaAlMontar()).toEqual({ nombre: 'Yo', params: { abrirSoporteTi: true } });
    expect(verPestanaAlMontar()).toBeNull();
  });

  it('sin pedido, las pestañas arrancan como siempre', () => {
    expect(verPestanaAlMontar()).toBeNull();
    expect(tomarPestanaAlMontar()).toBeNull();
  });
});
