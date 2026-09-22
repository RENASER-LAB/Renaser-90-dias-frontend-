import { describe, expect, it } from '@jest/globals';

import type { Area } from '../tipos';
import { EJE_POR_AREA, areaDelEje } from '../tipos';

/**
 * La traducción de vuelta entre los dos vocabularios que conviven en la app: el Mapa habla de
 * ÁREAS (`salud`, `negocio_dinero`, `relaciones`) y Rocas habla de EJES (`CUERPO`, `TRABAJO`,
 * `RELACIONES`).
 *
 * Se prueba porque el error que puede cometer es silencioso: devolver el área equivocada pinta la
 * cifra de otro eje —el número de tu negocio debajo de tu objetivo de peso— sin que nada reviente.
 */
describe('areaDelEje', () => {
  it('es el inverso exacto de EJE_POR_AREA, para las tres áreas', () => {
    (Object.keys(EJE_POR_AREA) as Area[]).forEach(area => {
      expect(areaDelEje(EJE_POR_AREA[area])).toBe(area);
    });
  });

  it('traduce los tres ejes a su área', () => {
    expect(areaDelEje('CUERPO')).toBe('salud');
    expect(areaDelEje('TRABAJO')).toBe('negocio_dinero');
    expect(areaDelEje('RELACIONES')).toBe('relaciones');
  });

  /* Si mañana aparece un eje sin área —o alguien renombra uno de los tres— la respuesta honesta es
     `null`, y el hook no muestra cifra. Inventar un área por defecto pondría la cuenta de otro eje
     debajo de este objetivo, que es peor que no mostrar nada. */
  it('devuelve null para un eje que no tiene área', () => {
    expect(areaDelEje('INEXISTENTE' as never)).toBeNull();
  });
});
