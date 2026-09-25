import { describe, expect, it } from '@jest/globals';

import {
  SEMANAS_HACIA_ATRAS,
  VIGENTE,
  claveDePosicion,
  esViernes,
  primerViernesCerrado,
  rangoDePosicion,
  semanaAnterior,
  semanaSiguiente,
  viernesHasta,
  type PosicionSemanal,
} from '../semanasDelSemaforo';

/**
 * Moverse entre semanas del semáforo (sábado→viernes) a partir del `hasta` de la ventana vigente,
 * que es AYER en la zona de la persona. Fechas reales de 2026: el viernes 25 de septiembre la
 * ventana vigente va del viernes 18 al jueves 24, y la última semana cerrada es la del sábado 12 al
 * viernes 18 — la misma que trae el ejemplo del contrato (§4.1, `semanas`).
 *
 * El `semanaHasta` que se pide TIENE que ser viernes: si no, el servidor responde 400.
 */

const semana = (semanaHasta: string): PosicionSemanal => ({ modo: 'semana', semanaHasta });

describe('los viernes', () => {
  it('reconoce el viernes', () => {
    expect(esViernes('2026-09-18')).toBe(true);
    expect(esViernes('2026-09-24')).toBe(false);
    expect(esViernes('18/09/2026')).toBe(false);
  });

  it('el viernes más reciente que no pasa de una fecha', () => {
    expect(viernesHasta('2026-09-24')).toBe('2026-09-18'); // jueves
    expect(viernesHasta('2026-09-25')).toBe('2026-09-25'); // viernes: el mismo día
    expect(viernesHasta('2026-09-26')).toBe('2026-09-25'); // sábado
    expect(viernesHasta('2026-09-27')).toBe('2026-09-25'); // domingo
    expect(viernesHasta('2026-10-07')).toBe('2026-10-02'); // cruza de mes
    expect(viernesHasta('no-es-fecha')).toBeNull();
  });
});

describe('la primera semana cerrada, desde la ventana vigente', () => {
  /* Es `SemanaDelSemaforo.ultimaCerradaAl(hoy)` del backend con hoy = hasta + 1. */
  it('un viernes (vigente hasta el jueves): la del viernes anterior', () => {
    expect(primerViernesCerrado('2026-09-24')).toBe('2026-09-18');
  });

  it('un domingo (vigente hasta el sábado): la que cerró el viernes', () => {
    expect(primerViernesCerrado('2026-09-26')).toBe('2026-09-25');
  });

  /* Un sábado la vigente ES la semana que acaba de cerrar: "anterior" no puede mostrar lo mismo. */
  it('un sábado (vigente hasta el viernes): se salta la que coincide con la vigente', () => {
    expect(primerViernesCerrado('2026-09-25')).toBe('2026-09-18');
  });
});

describe('anterior y siguiente', () => {
  const hasta = '2026-09-24';

  it('desde la vigente, la última semana cerrada', () => {
    expect(semanaAnterior(VIGENTE, hasta)).toEqual(semana('2026-09-18'));
  });

  it('de una semana a la anterior, de a siete días', () => {
    expect(semanaAnterior(semana('2026-09-18'), hasta)).toEqual(semana('2026-09-11'));
  });

  it('sin el ancla del servidor no hay "anterior": no se adivina con el reloj del teléfono', () => {
    expect(semanaAnterior(VIGENTE, null)).toBeNull();
  });

  it('desde la vigente no hay "siguiente": el futuro no se mide', () => {
    expect(semanaSiguiente(VIGENTE, hasta)).toBeNull();
  });

  it('de una semana a la siguiente, y de la más nueva de vuelta a la vigente', () => {
    expect(semanaSiguiente(semana('2026-09-11'), hasta)).toEqual(semana('2026-09-18'));
    expect(semanaSiguiente(semana('2026-09-18'), hasta)).toEqual(VIGENTE);
  });

  it('sin ancla, "siguiente" vuelve a la vigente, que siempre existe', () => {
    expect(semanaSiguiente(semana('2026-09-11'), null)).toEqual(VIGENTE);
  });

  it(`hacia atrás llega hasta ${SEMANAS_HACIA_ATRAS} semanas cerradas, no más`, () => {
    let posicion: PosicionSemanal | null = VIGENTE;
    const visitadas: string[] = [];
    for (let i = 0; i < 40 && posicion; i++) {
      posicion = semanaAnterior(posicion, hasta);
      if (posicion?.modo === 'semana') visitadas.push(posicion.semanaHasta);
    }
    expect(visitadas).toHaveLength(SEMANAS_HACIA_ATRAS);
    expect(visitadas[0]).toBe('2026-09-18');
    expect(visitadas[visitadas.length - 1]).toBe('2026-06-26');
    /* Todo lo que se pide es viernes: si no, el servidor responde 400. */
    expect(visitadas.every(esViernes)).toBe(true);
  });

  it('ida y vuelta vuelve al mismo lugar', () => {
    let posicion: PosicionSemanal = VIGENTE;
    for (let i = 0; i < 3; i++) posicion = semanaAnterior(posicion, hasta) ?? posicion;
    expect(posicion).toEqual(semana('2026-09-04'));
    for (let i = 0; i < 3; i++) posicion = semanaSiguiente(posicion, hasta) ?? posicion;
    expect(posicion).toEqual(VIGENTE);
  });

  it('un sábado, "anterior" no repite la semana que coincide con la vigente', () => {
    expect(semanaAnterior(VIGENTE, '2026-09-25')).toEqual(semana('2026-09-18'));
    expect(semanaSiguiente(semana('2026-09-18'), '2026-09-25')).toEqual(VIGENTE);
  });
});

describe('qué días cubre cada posición, antes de que llegue la respuesta', () => {
  it('una semana: de sábado a viernes', () => {
    expect(rangoDePosicion(semana('2026-09-18'), '2026-09-24')).toEqual({ desde: '2026-09-12', hasta: '2026-09-18' });
  });

  it('la vigente: los siete días que terminan en su `hasta`', () => {
    expect(rangoDePosicion(VIGENTE, '2026-09-24')).toEqual({ desde: '2026-09-18', hasta: '2026-09-24' });
  });

  it('la vigente sin ancla todavía: no se sabe, no se inventa', () => {
    expect(rangoDePosicion(VIGENTE, null)).toBeNull();
  });

  it('una clave por posición, para no repetir una lectura', () => {
    expect(claveDePosicion(VIGENTE)).toBe('vigente');
    expect(claveDePosicion(semana('2026-09-18'))).toBe('2026-09-18');
  });
});
