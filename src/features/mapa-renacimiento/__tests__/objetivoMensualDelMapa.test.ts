import { describe, expect, it } from '@jest/globals';

import type { Magnitud } from '../../objetivos/utils/objetivoMensual';
import { cifraDelMes } from '../../objetivos/utils/objetivoMensual';
import {
  RESULTADOS_NEGOCIO,
  RESULTADOS_SALUD,
  formatoDelObjetivo,
  magnitudDeNegocio,
  magnitudDeSalud,
  magnitudDelObjetivo,
  objetivoMensualDelMapa,
} from '../reglas';
import type { ObjetivoNegocio, ObjetivoRelaciones, ObjetivoSalud, TipoResultadoSalud } from '../tipos';
import { objetivoNegocioVacio, objetivoRelacionesVacio, objetivoSaludVacio } from '../tipos';

function salud(parcial: Partial<ObjetivoSalud>): ObjetivoSalud {
  return { ...objetivoSaludVacio(), ...parcial };
}

function negocio(parcial: Partial<ObjetivoNegocio>): ObjetivoNegocio {
  return { ...objetivoNegocioVacio(), ...parcial };
}

function relaciones(parcial: Partial<ObjetivoRelaciones>): ObjetivoRelaciones {
  return { ...objetivoRelacionesVacio(), ...parcial };
}

/** El objetivo del ejemplo del dueño: 82 → 75 kg. */
const PESO = salud({ tipoResultado: 'peso', lineaBase: '82', resultadoDia90: '75', unidad: 'kg' });

describe('magnitudDelObjetivo · qué admite cuota mensual y qué no', () => {
  const ESPERADO: Record<TipoResultadoSalud, Magnitud> = {
    peso: 'nivel',
    medidas: 'nivel',
    fuerza: 'nivel',
    resistencia: 'nivel',
    sueno: 'nivel',
    energia: 'escala',
    condicion_clinica: 'clinico',
    otro: 'nivel',
  };

  it('cubre los ocho tipos de salud del formulario, sin dejar ninguno afuera', () => {
    // Si mañana el catálogo suma un tipo, esta prueba falla hasta que alguien decida qué es.
    for (const { clave } of RESULTADOS_SALUD) {
      expect(magnitudDeSalud(clave, 'kg')).toBe(ESPERADO[clave]);
    }
    expect(RESULTADOS_SALUD).toHaveLength(Object.keys(ESPERADO).length);
  });

  it('"otro" con unidad de escala se trata como escala, no como kilos', () => {
    expect(magnitudDeSalud('otro', '/10')).toBe('escala');
    expect(magnitudDeSalud('otro', 'puntos')).toBe('escala');
    expect(magnitudDeSalud('otro', 'libros leídos')).toBe('nivel');
  });

  it('sin tipo elegido no hay magnitud', () => {
    expect(magnitudDeSalud(null, 'kg')).toBeNull();
    expect(magnitudDeNegocio(null, 'mensual')).toBeNull();
  });

  it('en negocio manda el periodo, no el tipo: los ocho se comportan igual', () => {
    for (const { clave } of RESULTADOS_NEGOCIO) {
      expect(magnitudDeNegocio(clave, 'mensual')).toBe('nivel');
      expect(magnitudDeNegocio(clave, 'semanal')).toBe('nivel');
      expect(magnitudDeNegocio(clave, 'acumulado_dia_90')).toBe('acumulado');
      // El periodo es obligatorio en V04 y sin él no se sabe si es una tasa o una suma.
      expect(magnitudDeNegocio(clave, null)).toBeNull();
    }
  });

  it('relaciones siempre es escala: se mide del 1 al 10 y viaja sin meta cuantitativa', () => {
    expect(magnitudDelObjetivo(relaciones({ vinculo: 'pareja', situacionActual: 5, resultadoDia90: 8 })))
      .toBe('escala');
  });
});

describe('objetivoMensualDelMapa · el ejemplo del dueño', () => {
  it('82 → 75 kg da 79,7 kg el primer mes, sin que nadie escriba nada', () => {
    const r = objetivoMensualDelMapa(PESO, { mes: 1 });
    expect(r.estado).toBe('con_cifra');
    if (r.estado !== 'con_cifra') return;
    expect(r.paso).toBeCloseTo(2.33, 2);
    expect(cifraDelMes(r, formatoDelObjetivo(PESO))).toBe('79.7 kg');
  });

  it('el mes 2 se recalcula contra el peso real, no contra el tercio de la promesa', () => {
    const r = objetivoMensualDelMapa(PESO, { mes: 2, valorActual: 81 });
    if (r.estado !== 'con_cifra') throw new Error('debía haber cifra');
    expect(cifraDelMes(r, formatoDelObjetivo(PESO))).toBe('78 kg');
  });

  it('dos meses sin mover la aguja: el mes 3 no muestra número', () => {
    const r = objetivoMensualDelMapa(PESO, { mes: 3, valorActual: 82 });
    if (r.estado !== 'sin_cifra') throw new Error('7 kg en un mes no debían mostrarse');
    expect(r.motivo).toBe('ritmo_no_saludable');
    expect(cifraDelMes(r, formatoDelObjetivo(PESO))).toBeNull();
  });

  it('el tope del peso es el 4 % del peso de hoy, así que escala con la persona', () => {
    // Mismos 9 kg de diferencia y mismo mes, pero uno pesa 120 y el otro 60. Al de 120 le caben
    // 4,8 kg en el mes; al de 60, 2,4.
    const grande = salud({ tipoResultado: 'peso', lineaBase: '129', resultadoDia90: '120', unidad: 'kg' });
    const chico = salud({ tipoResultado: 'peso', lineaBase: '69', resultadoDia90: '60', unidad: 'kg' });
    expect(objetivoMensualDelMapa(grande, { mes: 3, valorActual: 124.5 }).estado).toBe('con_cifra');
    expect(objetivoMensualDelMapa(chico, { mes: 3, valorActual: 64.5 }).estado).toBe('sin_cifra');
  });

  it('los mismos números en otro tipo no tienen tope de salud y sí muestran cifra', () => {
    // 82 → 75 cm de cintura, dos meses parado: 7 cm en un mes es feo, pero el corte de cordura de
    // los tipos sin límite físico es 3× el plan, y 7 es exactamente 3 × 2,33.
    const medidas = salud({ tipoResultado: 'medidas', lineaBase: '82', resultadoDia90: '75', unidad: 'cm' });
    expect(objetivoMensualDelMapa(medidas, { mes: 3, valorActual: 82 }).estado).toBe('con_cifra');
  });
});

describe('objetivoMensualDelMapa · los tipos que no admiten cálculo', () => {
  it('energía del 1 al 10: no hay cuota mensual de una percepción', () => {
    const energia = salud({ tipoResultado: 'energia', lineaBase: '4', resultadoDia90: '8', unidad: '/10' });
    const r = objetivoMensualDelMapa(energia, { mes: 1 });
    if (r.estado !== 'sin_cifra') throw new Error('una escala no debía dar cifra');
    expect(r.motivo).toBe('escala_subjetiva');
  });

  it('condición clínica: el ritmo lo define quien te atiende', () => {
    const clinico = salud({
      tipoResultado: 'condicion_clinica', lineaBase: '140', resultadoDia90: '120', unidad: 'mg/dL',
    });
    const r = objetivoMensualDelMapa(clinico, { mes: 1 });
    if (r.estado !== 'sin_cifra') throw new Error('lo clínico no debía dar cifra');
    expect(r.motivo).toBe('acompanamiento_clinico');
  });

  it('relaciones tampoco, ni con las dos puntas de la escala llenas', () => {
    const vinculo = relaciones({ vinculo: 'pareja', situacionActual: 5, resultadoDia90: 8 });
    const r = objetivoMensualDelMapa(vinculo, { mes: 2 });
    if (r.estado !== 'sin_cifra') throw new Error('relaciones no debía dar cifra');
    expect(r.motivo).toBe('escala_subjetiva');
  });

  it('negocio sin periodo: falta saber si es una tasa o una suma', () => {
    const sinPeriodo = negocio({ tipoResultado: 'facturacion', lineaBase: '5000', resultadoDia90: '15000' });
    const r = objetivoMensualDelMapa(sinPeriodo, { mes: 1 });
    if (r.estado !== 'sin_cifra') throw new Error('sin periodo no debía dar cifra');
    expect(r.motivo).toBe('sin_tipo');
  });
});

describe('objetivoMensualDelMapa · negocio y dinero', () => {
  const FACTURACION = negocio({
    tipoResultado: 'facturacion', lineaBase: '5000', resultadoDia90: '15000', moneda: 'S/', periodo: 'mensual',
  });

  it('una tasa mensual se lee como nivel y lleva su periodo pegado', () => {
    const r = objetivoMensualDelMapa(FACTURACION, { mes: 1 });
    if (r.estado !== 'con_cifra') throw new Error('debía haber cifra');
    expect(r.lectura).toBe('nivel');
    expect(cifraDelMes(r, formatoDelObjetivo(FACTURACION))).toBe('S/ 8\u00a0333 mensuales');
  });

  it('una meta acumulada al Día 90 se lee como tramo del mes y NO lleva periodo', () => {
    const ventas = negocio({
      tipoResultado: 'ventas', lineaBase: '0', resultadoDia90: '9000', moneda: 'S/', periodo: 'acumulado_dia_90',
    });
    const r = objetivoMensualDelMapa(ventas, { mes: 2, valorActual: 2000 });
    if (r.estado !== 'con_cifra') throw new Error('debía haber cifra');
    expect(r.lectura).toBe('acumulado');
    // "S/ 3 500 acumulados al Día 90" sería mentira: son 3 500 de este mes.
    expect(cifraDelMes(r, formatoDelObjetivo(ventas))).toBe('S/ 3\u00a0500');
  });

  it('una deuda baja y se reparte igual', () => {
    const deuda = negocio({
      tipoResultado: 'deuda', lineaBase: '9000', resultadoDia90: '0', moneda: 'S/', periodo: 'mensual',
    });
    const r = objetivoMensualDelMapa(deuda, { mes: 1 });
    if (r.estado !== 'con_cifra') throw new Error('debía haber cifra');
    expect(r.direccion).toBe('baja');
    expect(r.valor).toBe(6000);
  });

  it('facturar mucho menos que al empezar deja el último mes sin cifra', () => {
    const r = objetivoMensualDelMapa(FACTURACION, { mes: 3, valorActual: 3000 });
    if (r.estado !== 'sin_cifra') throw new Error('12 000 en un mes no debían mostrarse');
    expect(r.motivo).toBe('fuera_de_alcance');
  });
});

describe('formatoDelObjetivo', () => {
  it('la unidad de salud va detrás y la moneda delante', () => {
    expect(formatoDelObjetivo(PESO)).toEqual({ unidad: 'kg', unidadAdelante: false });
    expect(
      formatoDelObjetivo(negocio({ tipoResultado: 'ahorro', moneda: 'USD', periodo: 'semanal' }))
    ).toEqual({ unidad: 'USD', unidadAdelante: true, periodo: 'semanales' });
  });

  it('relaciones no tiene unidad que escribir', () => {
    expect(formatoDelObjetivo(relaciones({ vinculo: 'hijos' }))).toEqual({ unidad: '' });
  });
});
