import { describe, expect, it } from '@jest/globals';
import { segmentosDeLaRuta } from '../segmentosDeLaRuta';

const p = (n: number, corte?: 'pausa' | 'hueco') => ({ lat: n, lng: n, t: n, ...(corte ? { corte } : {}) });

describe('segmentosDeLaRuta', () => {
  // spec 042 FR-037
  it('sin cortes (estado viejo) es un solo segmento y ningún conector', () => {
    const r = segmentosDeLaRuta([p(1), p(2), p(3)]);
    expect(r.segmentos).toHaveLength(1);
    expect(r.segmentos[0]).toHaveLength(3);
    expect(r.conectores).toEqual([]);
  });

  // spec 042 FR-037
  it("un corte 'pausa' parte en dos segmentos y no dibuja conector", () => {
    const r = segmentosDeLaRuta([p(1), p(2), p(3, 'pausa'), p(4)]);
    expect(r.segmentos.map(s => s.length)).toEqual([2, 2]);
    expect(r.conectores).toEqual([]);
  });

  // spec 042 FR-037
  it("un corte 'hueco' parte en dos segmentos y deja un conector entre el último y el primero", () => {
    const r = segmentosDeLaRuta([p(1), p(2), p(3, 'hueco'), p(4)]);
    expect(r.segmentos.map(s => s.length)).toEqual([2, 2]);
    expect(r.conectores).toEqual([[{ latitude: 2, longitude: 2 }, { latitude: 3, longitude: 3 }]]);
  });

  // spec 042 FR-037
  it('un segmento de un solo punto no se dibuja como línea', () => {
    const r = segmentosDeLaRuta([p(1), p(2), p(3, 'pausa')]);
    expect(r.segmentos.map(s => s.length)).toEqual([2]);
  });
});
