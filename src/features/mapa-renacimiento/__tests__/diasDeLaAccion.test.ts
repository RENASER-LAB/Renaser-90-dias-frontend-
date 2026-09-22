import { describe, expect, it } from '@jest/globals';

import { INDICE_DE_HOY } from '../../habits/utils/semanaDelPlan';
import { diasEscritos, tocaHoy } from '../hooks/useAccionesDelMapa';

const accion = (dias: number[]) => ({ texto: 'Caminar 40 minutos', dias, frecuenciaSemanal: dias.length });

/**
 * Los días que la persona le puso a cada acción en el Mapa, usados para saber qué toca hoy — igual
 * que Training sabe qué hábitos van hoy.
 *
 * **El día de hoy sale de `INDICE_DE_HOY`, el de `semanaDelPlan`, y no de una cuenta propia.** La
 * primera versión calculaba el día por su cuenta y eso son dos definiciones de "hoy" en la misma
 * app: si una se corre un día, las acciones se marcan en la casilla equivocada y las dos partes
 * "funcionan". Este test se ata al mismo valor a propósito.
 */
describe('los días de una acción del Mapa', () => {
  it('toca hoy cuando el día de hoy está entre los suyos', () => {
    // INDICE_DE_HOY va de 0 (lunes) a 6; los días del Mapa van de 1 a 7.
    expect(tocaHoy(accion([INDICE_DE_HOY + 1]))).toBe(true);
  });

  it('no toca hoy cuando no está', () => {
    const otros = [1, 2, 3, 4, 5, 6, 7].filter(d => d !== INDICE_DE_HOY + 1);
    expect(tocaHoy(accion(otros.slice(0, 2)))).toBe(false);
  });

  it('una acción sin días no toca nunca sola', () => {
    // Son las de planes semanales viejos, que se escribían sin días. Se pueden elegir a mano.
    expect(tocaHoy(accion([]))).toBe(false);
  });

  it('escribe los días con las mismas etiquetas que Training', () => {
    expect(diasEscritos([1, 3, 5])).toBe('LUN · MIÉ · VIE');
    expect(diasEscritos([7])).toBe('DOM');
  });

  it('los ordena y descarta lo que no es un día', () => {
    expect(diasEscritos([5, 1, 3])).toBe('LUN · MIÉ · VIE');
    expect(diasEscritos([0, 8, 2])).toBe('MAR');
    expect(diasEscritos([])).toBe('');
  });
});
