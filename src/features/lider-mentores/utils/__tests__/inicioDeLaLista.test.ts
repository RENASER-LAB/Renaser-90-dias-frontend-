import { describe, expect, it } from '@jest/globals';

import { VIGENTE } from '../../../semaforo/utils/semanasDelSemaforo';
import { inicioDeLaListaDelLider, viernesParaLaFicha } from '../inicioDeLaLista';

/**
 * De qué semana arranca la lista de un grupo para el líder (spec 005). Sin `semanaHasta`, el servidor da la
 * ÚLTIMA SEMANA CERRADA (sábado→viernes), no «los últimos 7 días» del resumen por grupos: la lista tiene que
 * aprender ese ancla para que «anterior» y «siguiente» no repitan una semana.
 *
 * Calendario de 2026: hoy lunes 19 de octubre. El resumen por grupos mira los 7 días que terminan ayer
 * (domingo 18) y la última semana cerrada es la que terminó el viernes 16.
 */

describe('la lista abre en la misma semana que se miraba, con el ancla de la lista', () => {
  it('desde «últimos 7 días» pide sin fecha (el servidor da la última cerrada) y aprende su viernes', () => {
    expect(inicioDeLaListaDelLider({ posicion: VIGENTE, hastaVigente: '2026-10-18' })).toEqual({
      posicion: VIGENTE,
      hastaVigente: '2026-10-16',
    });
  });

  it('desde una semana anterior sigue en esa semana', () => {
    expect(
      inicioDeLaListaDelLider({ posicion: { modo: 'semana', semanaHasta: '2026-10-09' }, hastaVigente: '2026-10-18' }),
    ).toEqual({ posicion: { modo: 'semana', semanaHasta: '2026-10-09' }, hastaVigente: '2026-10-16' });
  });

  it('la última semana cerrada ES la posición por defecto de la lista: no se pide dos veces con otro nombre', () => {
    expect(
      inicioDeLaListaDelLider({ posicion: { modo: 'semana', semanaHasta: '2026-10-16' }, hastaVigente: '2026-10-18' }),
    ).toEqual({ posicion: VIGENTE, hastaVigente: '2026-10-16' });
  });

  it('un sábado el resumen termina el viernes de ayer: su ancla ya es la última cerrada', () => {
    expect(inicioDeLaListaDelLider({ posicion: VIGENTE, hastaVigente: '2026-10-16' })).toEqual({
      posicion: VIGENTE,
      hastaVigente: '2026-10-16',
    });
  });

  it('sin ancla (el resumen no llegó a leerse) no inventa nada: la lista aprenderá la suya', () => {
    const inicio = { posicion: VIGENTE, hastaVigente: null };
    expect(inicioDeLaListaDelLider(inicio)).toEqual(inicio);
  });
});

describe('qué viernes se le pasa a la ficha de una persona', () => {
  it('el `hasta` de la lista, siempre: las dos hablan de los mismos días', () => {
    expect(viernesParaLaFicha('2026-10-16')).toBe('2026-10-16');
  });

  it('si el `hasta` no fuera viernes (un backend con otra ventana) no se manda: el servidor respondería 400', () => {
    expect(viernesParaLaFicha('2026-10-18')).toBeNull();
    expect(viernesParaLaFicha('mañana')).toBeNull();
    expect(viernesParaLaFicha(null)).toBeNull();
    expect(viernesParaLaFicha(undefined)).toBeNull();
  });
});
