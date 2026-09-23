import { describe, expect, it, jest } from '@jest/globals';

import type { VozSintetizada } from '../../api/renasiaVoz';
import { Locutor, type Parlantes } from '../locutor';

function parlantesDePrueba(voces: Record<string, VozSintetizada | Promise<VozSintetizada>>) {
  const dicho: string[] = [];
  const parlantes: Parlantes = {
    sintetizar: async texto => voces[texto] ?? { tipo: 'fallo' },
    reproducir: async uri => {
      dicho.push(`natural:${uri}`);
    },
    hablarConSistema: async texto => {
      dicho.push(`sistema:${texto}`);
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
      Dos: { tipo: 'audio', uri: 'dos', segundos: 1 },
    });
    const callado = jest.fn();
    const locutor = new Locutor(parlantes, callado);

    locutor.decir('Uno');
    locutor.decir('Dos');
    await esperarCola();
    expect(dicho).toEqual([]);

    soltarPrimera({ tipo: 'audio', uri: 'uno', segundos: 1 });
    await esperarCola();
    await esperarCola();
    expect(dicho).toEqual(['natural:uno', 'natural:dos']);
    expect(callado).toHaveBeenCalledTimes(1);
  });

  it('usa la voz del teléfono cuando el servidor no tiene voz o falla', async () => {
    const { parlantes, dicho } = parlantesDePrueba({ Hola: { tipo: 'sin-voz' } });
    const locutor = new Locutor(parlantes, jest.fn());

    locutor.decir('Hola');
    locutor.decir('Chau');
    await esperarCola();
    await esperarCola();

    expect(dicho).toEqual(['sistema:Hola', 'sistema:Chau']);
  });

  it('callado no dice lo pendiente ni lo que llegue después', async () => {
    const { parlantes, dicho } = parlantesDePrueba({ Uno: { tipo: 'audio', uri: 'uno', segundos: 1 } });
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
