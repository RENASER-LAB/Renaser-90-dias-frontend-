import { describe, expect, it, jest } from '@jest/globals';

import type { VozSintetizada } from '../../api/renasiaVoz';
import { Locutor, type Parlantes } from '../locutor';

function parlantesDePrueba(voces: Record<string, VozSintetizada | Promise<VozSintetizada>>) {
  const dicho: string[] = [];
  const parlantes: Parlantes = {
    sintetizar: async texto => voces[texto] ?? { tipo: 'fallo' },
    reproducir: async voz => {
      if (voz.uri === 'rota') return false;
      dicho.push(`natural:${voz.uri}`);
      return true;
    },
    detener: jest.fn(),
  };
  return { parlantes, dicho };
}

const esperarCola = () => new Promise(resolver => setTimeout(resolver, 0));

describe('Locutor', () => {
  it('dice en el orden de llegada aunque el audio de la primera tarde más', async () => {
    let soltarPrimera!: (voz: VozSintetizada) => void;
    const primera = new Promise<VozSintetizada>(resolver => (soltarPrimera = resolver));
    const { parlantes, dicho } = parlantesDePrueba({
      Uno: primera,
      Dos: { tipo: 'audio', uri: 'dos', headers: {} },
    });
    const callado = jest.fn();
    const locutor = new Locutor(parlantes, callado);

    locutor.decir('Uno');
    locutor.decir('Dos');
    await esperarCola();
    expect(dicho).toEqual([]);

    soltarPrimera({ tipo: 'audio', uri: 'uno', headers: {} });
    await esperarCola();
    await esperarCola();
    expect(dicho).toEqual(['natural:uno', 'natural:dos']);
    expect(callado).toHaveBeenCalledTimes(1);
  });

  it('sin voz del servidor no habla nada y avisa UNA sola vez: la respuesta queda escrita (D-164)', async () => {
    const { parlantes, dicho } = parlantesDePrueba({ Hola: { tipo: 'sin-voz' } });
    const alFaltarLaVoz = jest.fn();
    const callado = jest.fn();
    const locutor = new Locutor(parlantes, callado, alFaltarLaVoz);

    locutor.decir('Hola');
    locutor.decir('Chau');
    await esperarCola();
    await esperarCola();

    expect(dicho).toEqual([]);
    expect(alFaltarLaVoz).toHaveBeenCalledTimes(1);
    expect(callado).toHaveBeenCalledTimes(1);
  });

  it('si un audio no se puede reproducir, avisa y sigue con la siguiente oración', async () => {
    const { parlantes, dicho } = parlantesDePrueba({
      Uno: { tipo: 'audio', uri: 'rota', headers: {} },
      Dos: { tipo: 'audio', uri: 'dos', headers: {} },
    });
    const locutor = new Locutor(parlantes, jest.fn());

    locutor.decir('Uno');
    locutor.decir('Dos');
    await esperarCola();
    await esperarCola();

    expect(dicho).toEqual(['natural:dos']);
  });

  it('callado no dice lo pendiente ni lo que llegue después', async () => {
    const { parlantes, dicho } = parlantesDePrueba({ Uno: { tipo: 'audio', uri: 'uno', headers: {} } });
    const locutor = new Locutor(parlantes, jest.fn());

    locutor.decir('Uno');
    locutor.callar();
    locutor.decir('Dos');
    await esperarCola();

    expect(dicho).toEqual([]);
    expect(parlantes.detener).toHaveBeenCalled();
    expect(locutor.hablando).toBe(false);
  });
});
