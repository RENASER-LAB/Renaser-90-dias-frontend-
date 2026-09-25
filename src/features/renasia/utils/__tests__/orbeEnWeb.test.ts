import { describe, expect, it } from '@jest/globals';

import { cargarOrbes } from '../orbes';

/**
 * E-255: en web el orbe animado dejaba Hoy en blanco (`reading 'Paint'`: Skia sin CanvasKit). El
 * `require` del paquete funciona en web, así que protegerse con el try/catch no alcanzaba: hay que
 * no cargarlo.
 */
describe('cargarOrbes', () => {
  it('en web no carga el orbe animado: va el simple', () => {
    expect(cargarOrbes('web')).toBeNull();
  });
});
