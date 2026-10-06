import { describe, expect, it } from '@jest/globals';

import {
  COLA_VACIA,
  esFalloDeRed,
  esperaParaReintentar,
  hayPendientes,
  llegadaVisible,
  marcaConfirmada,
  marcaDescartada,
  marcaFallida,
  pedirMarca,
} from '../colaDeMarcas';

describe('la cola de marcas de «Pasar lista»', () => {
  it('la fila muestra al instante lo que se tocó, antes de que responda el servidor', () => {
    const cola = pedirMarca(COLA_VACIA, 'ana', 'A_TIEMPO');
    expect(llegadaVisible(cola, 'ana', null)).toBe('A_TIEMPO');
    expect(llegadaVisible(cola, 'beto', 'TARDE')).toBe('TARDE');
    expect(hayPendientes(cola)).toBe(true);
  });

  it('si se tocó otra vez mientras viajaba la primera, la confirmación vieja no la saca de la cola', () => {
    let cola = pedirMarca(COLA_VACIA, 'ana', 'A_TIEMPO');
    cola = pedirMarca(cola, 'ana', 'TARDE');
    cola = marcaConfirmada(cola, 'ana', 'A_TIEMPO');
    expect(llegadaVisible(cola, 'ana', 'A_TIEMPO')).toBe('TARDE');
    cola = marcaConfirmada(cola, 'ana', 'TARDE');
    expect(hayPendientes(cola)).toBe(false);
  });

  it('un fallo de red se reintenta con esperas crecientes que se quedan en 20 s', () => {
    let cola = pedirMarca(COLA_VACIA, 'ana', null);
    cola = marcaFallida(cola, 'ana', null);
    expect(cola.ana.fallos).toBe(1);
    expect(esperaParaReintentar(1)).toBe(1500);
    expect(esperaParaReintentar(2)).toBe(3000);
    expect(esperaParaReintentar(99)).toBe(20000);
  });

  it('un rechazo del servidor (409, 403, 400) no se reintenta; la red caída o un 5xx sí', () => {
    expect(esFalloDeRed(0)).toBe(true);
    expect(esFalloDeRed(null)).toBe(true);
    expect(esFalloDeRed(503)).toBe(true);
    expect(esFalloDeRed(409)).toBe(false);
    expect(esFalloDeRed(403)).toBe(false);
    expect(hayPendientes(marcaDescartada(pedirMarca(COLA_VACIA, 'ana', 'TARDE'), 'ana'))).toBe(false);
  });
});
