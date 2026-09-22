import { describe, expect, it } from '@jest/globals';

import { MONEDAS, PERIODOS, RESULTADOS_NEGOCIO, RESULTADOS_SALUD, VINCULOS } from '../reglas';

/**
 * **Las opciones que el Mapa ofrece están fijadas acá a propósito.**
 *
 * No es un test de la lista: es un **candado**. El objetivo del mes y el de la semana los calcula el
 * backend, y para hacerlo traduce estos mismos valores en `rocks.domain.rocamensual.Magnitud`. Una
 * opción que exista acá y no esté traducida allá cae en *"todavía no eligió qué mide"*, y la persona
 * se queda sin cifra **sin que nada falle y sin saber por qué** — el peor tipo de error, porque no
 * hay nada que buscar en los logs.
 *
 * Por eso este test enumera los valores uno por uno en vez de contar. Si agregas una opción, se
 * pone rojo y el mensaje te manda a los dos archivos que hay que tocar del otro lado:
 *
 * - `Magnitud.java` — cómo se comporta el número (nivel, acumulado, escala o clínico).
 * - una migración Flyway que la siembre en `opciones_pregunta_onboarding`, como la V41.
 *
 * El espejo de esto en el backend es `TodasLasOpcionesDelMapaTest`, que recorre las mismas
 * combinaciones y verifica qué cifra sale de cada una.
 */
describe('las opciones del Mapa de Renacimiento', () => {
  it('salud ofrece exactamente estos ocho resultados', () => {
    expect(RESULTADOS_SALUD.map(r => r.clave)).toEqual([
      'peso',
      'medidas',
      'energia',
      'fuerza',
      'resistencia',
      'sueno',
      'condicion_clinica',
      'otro',
    ]);
  });

  it('negocio ofrece exactamente estos ocho', () => {
    expect(RESULTADOS_NEGOCIO.map(r => r.clave)).toEqual([
      'facturacion',
      'utilidad',
      'ventas',
      'clientes',
      'ahorro',
      'deuda',
      'ingreso_personal',
      'otro',
    ]);
  });

  it('y tres periodos, que son los que deciden si la meta es un nivel o una suma', () => {
    expect(PERIODOS.map(p => p.clave)).toEqual(['semanal', 'mensual', 'acumulado_dia_90']);
  });

  it('relaciones ofrece ocho vínculos; ninguno cambia el cálculo, que siempre es la escala 1-10', () => {
    expect(VINCULOS.map(v => v.clave)).toEqual([
      'pareja',
      'hijos',
      'padres',
      'familia',
      'socios',
      'equipo',
      'amistades',
      'otro',
    ]);
  });

  it('las monedas entran en los 20 caracteres de `unidad` del backend', () => {
    expect(MONEDAS).toEqual(['S/', 'USD', 'EUR', 'MXN', 'COP', 'CLP', 'ARS']);
    for (const moneda of MONEDAS) expect(moneda.length).toBeLessThanOrEqual(20);
  });

  it('cada resultado de salud trae su unidad sugerida, y la de energía delata una escala', () => {
    // `energia` y `otro` con "/10" son los dos caminos por los que el backend detecta una escala:
    // si esta unidad cambiara, "8/10 de energía" empezaría a tratarse como si fueran kilos.
    expect(RESULTADOS_SALUD.find(r => r.clave === 'energia')?.unidadSugerida).toBe('/10');
    expect(RESULTADOS_SALUD.find(r => r.clave === 'peso')?.unidadSugerida).toBe('kg');
  });
});
