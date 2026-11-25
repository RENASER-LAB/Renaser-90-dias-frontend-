import { describe, expect, it } from '@jest/globals';

import {
  debeHacerLaCascada,
  DURACION_DE_CADA_NIVEL_EN_LA_CASCADA_MS,
  DURACION_TOTAL_DE_LA_CASCADA_MS,
  efectosQueSeDisparan,
  respiraElSiguiente,
  retrasoDeLaCascada,
  SIN_EFECTOS,
  type FotoDeLaRuta,
} from '../efectosDeLaRuta';

const foto = (extra: Partial<FotoDeLaRuta> = {}): FotoDeLaRuta => ({
  cumplidos: ['a'], siguiente: 'b', cumplidas: 1, total: 4, cofreAbierto: false, eje: 'CUERPO', cargada: true, ...extra,
});

describe('cuándo se dispara cada efecto de la ruta', () => {
  // spec 058 FR-014
  it('al cumplirse una acción: pop de ese nivel, salto del fénix al nuevo siguiente y la cuenta sube', () => {
    const e = efectosQueSeDisparan(foto(), foto({ cumplidos: ['a', 'b'], siguiente: 'c', cumplidas: 2 }));
    expect(e.popDe).toEqual(['b']);
    expect(e.saltoDelFenix).toEqual({ desde: 'b', hasta: 'c' });
    expect(e.cuentaSubio).toBe(true);
    expect(e.cofreSeAbrio).toBe(false);
  });

  // spec 058 FR-014
  it('con la misma foto no sale nada: una lectura repetida nunca vuelve a disparar un efecto', () => {
    const f = foto({ cumplidos: ['a', 'b'], siguiente: 'c', cumplidas: 2 });
    expect(efectosQueSeDisparan(f, { ...f })).toBe(SIN_EFECTOS);
  });

  // spec 058 FR-014
  it('la primera lectura, una sin cargar y el cambio de eje no celebran nada', () => {
    const despues = foto({ cumplidos: ['a', 'b'], cumplidas: 2, siguiente: 'c' });
    expect(efectosQueSeDisparan(null, despues)).toBe(SIN_EFECTOS);
    expect(efectosQueSeDisparan(foto({ cargada: false }), despues)).toBe(SIN_EFECTOS);
    expect(efectosQueSeDisparan(foto({ eje: 'TRABAJO' }), despues)).toBe(SIN_EFECTOS);
  });

  // spec 058 FR-014
  it('si no queda siguiente (la última acción) hay pop y cuenta, pero no salto', () => {
    const e = efectosQueSeDisparan(foto({ siguiente: 'b' }), foto({ cumplidos: ['a', 'b'], siguiente: null, cumplidas: 2 }));
    expect(e.popDe).toEqual(['b']);
    expect(e.saltoDelFenix).toBeNull();
  });

  // spec 058 FR-014
  it('el cofre se abre una sola vez: al pasar de cerrado a abierto, y no al seguir abierto', () => {
    const cerrada = foto({ cofreAbierto: false });
    const abierta = foto({ cofreAbierto: true });
    expect(efectosQueSeDisparan(cerrada, abierta).cofreSeAbrio).toBe(true);
    expect(efectosQueSeDisparan(abierta, { ...abierta }).cofreSeAbrio).toBe(false);
  });

  // spec 058 FR-014
  it('perder un cumplido (otra lectura) no dispara nada', () => {
    expect(efectosQueSeDisparan(foto({ cumplidos: ['a', 'b'], cumplidas: 2 }), foto())).toBe(SIN_EFECTOS);
  });

  // spec 058 FR-014
  it('la cascada de entrada dura menos de 300 ms en total, con pocos o muchos niveles', () => {
    for (const cantidad of [1, 2, 6, 12, 40]) {
      const ultimo = retrasoDeLaCascada(cantidad - 1, cantidad) + DURACION_DE_CADA_NIVEL_EN_LA_CASCADA_MS;
      expect(ultimo).toBeLessThan(300);
      expect(ultimo).toBeLessThanOrEqual(DURACION_TOTAL_DE_LA_CASCADA_MS);
    }
    expect(retrasoDeLaCascada(0, 8)).toBe(0);
    expect(retrasoDeLaCascada(3, 8)).toBeLessThan(retrasoDeLaCascada(4, 8));
  });

  // spec 058 FR-014
  it('la cascada sale solo la primera vez en la sesión y solo si hay niveles', () => {
    expect(debeHacerLaCascada(false, true)).toBe(true);
    expect(debeHacerLaCascada(true, true)).toBe(false);
    expect(debeHacerLaCascada(false, false)).toBe(false);
  });

  // spec 058 FR-014
  it('el siguiente respira hasta que la persona lo toca', () => {
    expect(respiraElSiguiente('b', 'b', null)).toBe(true);
    expect(respiraElSiguiente('b', 'b', 'b')).toBe(false);
    expect(respiraElSiguiente('c', 'b', null)).toBe(false);
    expect(respiraElSiguiente('b', null, null)).toBe(false);
  });
});
