import { describe, expect, it } from '@jest/globals';

import type { ColorSemaforo } from '../../../semaforo/types/semaforo.types';
import { ordenDeAprendices } from '../ordenDeAprendices';

const a = (nombre: string, color: ColorSemaforo, porcentaje: number | null) => ({ nombre, color, porcentaje });

describe('el orden de «Mi grupo»', () => {
  it('rojo, luego ámbar, luego verde y al final los sin datos', () => { // spec 055 FR-004
    const orden = ordenDeAprendices([
      a('Zoe', 'SIN_DATOS', null),
      a('Ana', 'VERDE', 92),
      a('Beto', 'ROJO', 20),
      a('Carla', 'AMARILLO', 65),
    ]).map(x => x.nombre);
    expect(orden).toEqual(['Beto', 'Carla', 'Ana', 'Zoe']);
  });

  it('dentro de un mismo color, del que menos cumplió al que más', () => { // spec 055 FR-004
    const orden = ordenDeAprendices([a('Ana', 'ROJO', 40), a('Beto', 'ROJO', 10), a('Carla', 'ROJO', 25)]).map(x => x.nombre);
    expect(orden).toEqual(['Beto', 'Carla', 'Ana']);
  });

  it('a igualdad de porcentaje, por nombre (sin distinguir tildes ni mayúsculas)', () => { // spec 055 FR-004
    const orden = ordenDeAprendices([a('Óscar', 'VERDE', 90), a('ana', 'VERDE', 90), a('Beto', 'VERDE', 90)]).map(x => x.nombre);
    expect(orden).toEqual(['ana', 'Beto', 'Óscar']);
  });

  it('no pierde a nadie ni cambia la lista que recibe', () => { // spec 055 FR-004
    const original = [a('Zoe', 'VERDE', 90), a('Ana', 'ROJO', 10)];
    const orden = ordenDeAprendices(original);
    expect(orden).toHaveLength(2);
    expect(original.map(x => x.nombre)).toEqual(['Zoe', 'Ana']);
  });
});
