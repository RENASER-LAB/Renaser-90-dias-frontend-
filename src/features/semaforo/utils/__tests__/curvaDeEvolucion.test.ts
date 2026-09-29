import { describe, expect, it } from '@jest/globals';

import type { DiaDelSemaforo } from '../../types/semaforo.types';
import { curvaDeEvolucion } from '../curvaDeEvolucion';

/**
 * La curva de «Tu Evolución» en Yo (2026-09-29). Antes eran coordenadas fijas: la misma subida
 * para todo el mundo. Ahora sale del porcentaje diario del semáforo.
 */

const medido = (fecha: string, porcentaje: number): DiaDelSemaforo => ({
  fecha, estado: 'MEDIDO', porcentaje, color: 'VERDE', habitos: null, objetivos: null,
});
const sinMedir = (fecha: string): DiaDelSemaforo => ({
  fecha, estado: 'SIN_DATOS', porcentaje: null, color: 'SIN_DATOS', habitos: null, objetivos: null,
});
const lienzo = { ancho: 106, alto: 106, margen: 3 };

describe('curvaDeEvolucion', () => {
  it('pone cada día medido a la altura de su porcentaje, en su lugar del eje X', () => {
    const curva = curvaDeEvolucion([medido('2026-09-22', 0), medido('2026-09-23', 50), medido('2026-09-24', 100)], lienzo);
    expect(curva).toEqual({
      trazo: 'M3 103 L53 53 L103 3',
      puntos: [
        { clave: '2026-09-22', x: 3, y: 103 },
        { clave: '2026-09-23', x: 53, y: 53 },
        { clave: '2026-09-24', x: 103, y: 3 },
      ],
    });
  });

  it('un día sin medir no es un cero: no lleva punto y corta la línea', () => {
    const curva = curvaDeEvolucion(
      [medido('2026-09-22', 100), sinMedir('2026-09-23'), medido('2026-09-24', 0), medido('2026-09-25', 100)],
      { ancho: 96, alto: 106, margen: 3 },
    );
    expect(curva?.puntos.map(p => p.clave)).toEqual(['2026-09-22', '2026-09-24', '2026-09-25']);
    expect(curva?.trazo).toBe('M3 3 M63 103 L93 3');
  });

  it('con menos de dos días medidos no hay curva', () => {
    expect(curvaDeEvolucion([])).toBeNull();
    expect(curvaDeEvolucion([medido('2026-09-24', 80), sinMedir('2026-09-25')])).toBeNull();
  });

  it('dos curvas con datos distintos no se dibujan igual (el dibujo fijo sí)', () => {
    const a = curvaDeEvolucion([medido('2026-09-24', 10), medido('2026-09-25', 90)]);
    const b = curvaDeEvolucion([medido('2026-09-24', 90), medido('2026-09-25', 10)]);
    expect(a?.trazo).not.toBe(b?.trazo);
  });
});
