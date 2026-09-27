import { jest } from '@jest/globals';

/**
 * El reloj fijo de las pruebas del planificador de acciones.
 *
 * **Se fija ANTES de cargar los módulos.** El día de hoy (`INDICE_DE_HOY`) y la semana que se dibuja
 * (`MOSTRAR_SEMANA_SIGUIENTE`) se calculan una sola vez, al importar `semanaDelPlan`: con el reloj
 * fijado después, la prueba mediría el día en que corre y no el que dice. Por eso cada llamada carga
 * los módulos de nuevo (`jest.isolateModules`).
 *
 * **Los instantes van en UTC a propósito** (regla 02 del backend, E-91): los de la noche caen en el
 * día SIGUIENTE en UTC, que es donde se esconde un error de zona. `jest.config.js` corre todo en
 * `America/Lima`. Quien llama a `conElRelojEn` vuelve al reloj real con `jest.useRealTimers()`.
 */

/** Semana del incidente: lunes 21/09/2026 a domingo 27/09/2026. Lima es UTC−5, sin horario de verano. */
export const MIERCOLES_10_LIMA = '2026-09-23T15:00:00Z';
export const MIERCOLES_22_LIMA = '2026-09-24T03:00:00Z'; // en UTC ya es jueves
export const SABADO_22_LIMA = '2026-09-27T03:00:00Z'; // en UTC ya es domingo
export const SABADO_2359_LIMA = '2026-09-27T04:59:00Z'; // en UTC ya es domingo
export const DOMINGO_0030_LIMA = '2026-09-27T05:30:00Z';
export const DOMINGO_10_LIMA = '2026-09-27T15:00:00Z';
export const DOMINGO_22_LIMA = '2026-09-28T03:00:00Z'; // en UTC ya es lunes
export const DOMINGO_2330_LIMA = '2026-09-28T04:30:00Z'; // en UTC ya es lunes

type Ventanas = typeof import('../ventanasDePlanificacion');
type Semana = typeof import('../../../habits/utils/semanaDelPlan');
export type ModulosDelPlanificador = Ventanas & Semana;

/** Carga `ventanasDePlanificacion` y `semanaDelPlan` con el reloj parado en `instante`. */
export function conElRelojEn(instante: string): ModulosDelPlanificador {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(instante));
  let modulos: ModulosDelPlanificador | undefined;
  jest.isolateModules(() => {
    const ventanas = require('../ventanasDePlanificacion') as Ventanas;
    const semana = require('../../../habits/utils/semanaDelPlan') as Semana;
    modulos = { ...semana, ...ventanas };
  });
  if (!modulos) throw new Error('No se cargaron los módulos');
  return modulos;
}
