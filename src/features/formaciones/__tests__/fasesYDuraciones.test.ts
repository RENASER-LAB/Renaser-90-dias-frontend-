import { describe, expect, it } from '@jest/globals';

import { faseEnCurso, fasesEnOrden } from '../../home/utils/faseEnCurso';
import { diasQueQuedan, diasQueQuedanSiSeSabe } from '../../home/utils/diasQueQuedan';
import { FASES_EN_ORDEN } from '../../home/hooks/useResumenHome';
import { etiquetaDeDuracion } from '../utils/etiquetaDeDuracion';
import { fasesDeLaDuracion, finDeFase, inicioDeFase } from '../utils/fasesDeLaDuracion';

/** Las fases por duración (spec 022): la misma cuenta que hace el servidor (`CortesDeFase`). */
describe('fasesDeLaDuracion', () => {
  it('con 90 días son las de siempre: 1, 8, 35 y 65', () => {
    expect(fasesDeLaDuracion(90)).toEqual([
      { numero: 1, primerDia: 1, ultimoDia: 7 },
      { numero: 2, primerDia: 8, ultimoDia: 34 },
      { numero: 3, primerDia: 35, ultimoDia: 64 },
      { numero: 4, primerDia: 65, ultimoDia: 90 },
    ]);
  });

  it('con 365 días las fases se estiran: 1, 29, 138 y 260, sin huecos hasta el día 365', () => {
    expect(fasesDeLaDuracion(365)).toEqual([
      { numero: 1, primerDia: 1, ultimoDia: 28 },
      { numero: 2, primerDia: 29, ultimoDia: 137 },
      { numero: 3, primerDia: 138, ultimoDia: 259 },
      { numero: 4, primerDia: 260, ultimoDia: 365 },
    ]);
    for (let fase = 2; fase <= 4; fase += 1) {
      expect(inicioDeFase(fase, 365)).toBe(finDeFase(fase - 1, 365) + 1);
    }
  });

  it('una duración que no sirve cae en la de siempre y una fase fuera de 1 a 4 se rechaza', () => {
    expect(fasesDeLaDuracion(0)).toEqual(fasesDeLaDuracion(90));
    expect(fasesDeLaDuracion(Number.NaN)).toEqual(fasesDeLaDuracion(90));
    expect(() => inicioDeFase(5, 90)).toThrow(RangeError);
  });

  it('coincide con la tabla de fases de la app en los 90 días', () => {
    expect(FASES_EN_ORDEN.map(f => [f.primerDia, f.ultimoDia])).toEqual(fasesDeLaDuracion(90).map(f => [f.primerDia, f.ultimoDia]));
  });
});

describe('faseEnCurso por duración', () => {
  it('sin duración (o con 90) es la fase de siempre', () => {
    expect(faseEnCurso('PHASE_2_DEVELOPMENT', 20)?.rango).toBe('Días 8–34');
    expect(faseEnCurso('PHASE_2_DEVELOPMENT', 20, 90)?.rango).toBe('Días 8–34');
    expect(fasesEnOrden(90)).toBe(FASES_EN_ORDEN);
    expect(fasesEnOrden(null)).toBe(FASES_EN_ORDEN);
  });

  it('en un año la Fase II va del 29 al 137 y los días dentro de la fase se cuentan con ese rango', () => {
    const fase = faseEnCurso('PHASE_2_DEVELOPMENT', 90, 365);
    expect(fase?.rango).toBe('Días 29–137');
    expect(fase?.nombre).toBe('El Ciclo Alquímico');
    expect(fase?.diasDeLaFase).toEqual({ dia: 62, total: 109 });
  });

  it('una fase que la app no conoce no inventa nada', () => {
    expect(faseEnCurso('PHASE_9_NUEVA', 5, 365)).toBeNull();
  });
});

describe('días que quedan por duración', () => {
  it('sin duración son los 90 de siempre', () => {
    expect(diasQueQuedan(15)).toBe(75);
    expect(diasQueQuedan(15, null)).toBe(75);
    expect(diasQueQuedan(15, 0)).toBe(75);
  });

  it('con 365 se cuentan sobre el año', () => {
    expect(diasQueQuedan(15, 365)).toBe(350);
    expect(diasQueQuedan(365, 365)).toBe(1);
    expect(diasQueQuedanSiSeSabe({ diaPrograma: 100, inscrito: true, cargando: false, duracionDias: 365 })).toBe(265);
    expect(diasQueQuedanSiSeSabe({ diaPrograma: 100, inscrito: true, cargando: true, duracionDias: 365 })).toBeNull();
  });
});

describe('etiquetaDeDuracion', () => {
  it('dice «3 meses», «1 año» o los días', () => {
    expect(etiquetaDeDuracion(90)).toBe('3 meses');
    expect(etiquetaDeDuracion(365)).toBe('1 año');
    expect(etiquetaDeDuracion(730)).toBe('2 años');
    expect(etiquetaDeDuracion(100)).toBe('100 días');
  });
});
