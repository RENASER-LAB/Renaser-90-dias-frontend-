import { describe, expect, it } from '@jest/globals';

import type { EjeObjetivo } from '../../types/objetivos.types';
import { conPrincipalPrimero } from '../usePrioridadPrincipal';

const EJES: EjeObjetivo[] = ['CUERPO', 'TRABAJO', 'RELACIONES'];

describe('conPrincipalPrimero', () => {
  it('pone el principal adelante y conserva el orden de los otros dos', () => {
    expect(conPrincipalPrimero(EJES, 'RELACIONES')).toEqual(['RELACIONES', 'CUERPO', 'TRABAJO']);
    expect(conPrincipalPrimero(EJES, 'TRABAJO')).toEqual(['TRABAJO', 'CUERPO', 'RELACIONES']);
  });

  it('no cambia nada si el principal ya era el primero', () => {
    expect(conPrincipalPrimero(EJES, 'CUERPO')).toEqual(['CUERPO', 'TRABAJO', 'RELACIONES']);
  });

  it('sin prioridad guardada deja el orden de siempre — quien hizo el Mapa antes no ve nada raro', () => {
    expect(conPrincipalPrimero(EJES, null)).toEqual(['CUERPO', 'TRABAJO', 'RELACIONES']);
  });

  it('un eje que no está en la lista no descoloca nada', () => {
    expect(conPrincipalPrimero(['CUERPO', 'TRABAJO'], 'RELACIONES')).toEqual(['CUERPO', 'TRABAJO']);
  });

  it('no muta la lista que recibe', () => {
    const original: EjeObjetivo[] = ['CUERPO', 'TRABAJO', 'RELACIONES'];
    conPrincipalPrimero(original, 'RELACIONES');
    expect(original).toEqual(['CUERPO', 'TRABAJO', 'RELACIONES']);
  });
});

/**
 * El Mapa del Día 7 usa esta misma función, pero con sus **áreas** (`salud`, `negocio_dinero`,
 * `relaciones`), no con los ejes de Plan. Por eso se hizo genérica el 2026-09-23.
 *
 * El bug que cierra: los pasos 3, 4 y 5 del Mapa estaban fijos —siempre salud, luego negocio,
 * luego relaciones—, así que elegir "Negocio y dinero" como prioridad en el paso 2 y que el paso 3
 * pidiera *"un cambio concreto en tu cuerpo o salud"* era la respuesta normal del flujo. Se llenan
 * las tres igual; lo que cambia es cuál va primero.
 */
describe('conPrincipalPrimero con las areas del Mapa', () => {
  const AREAS = ['salud', 'negocio_dinero', 'relaciones'] as const;

  it('pone primero el area elegida como prioridad', () => {
    expect(conPrincipalPrimero(AREAS, 'negocio_dinero')).toEqual([
      'negocio_dinero', 'salud', 'relaciones',
    ]);
    expect(conPrincipalPrimero(AREAS, 'relaciones')).toEqual([
      'relaciones', 'salud', 'negocio_dinero',
    ]);
  });

  it('no pierde ninguna: siempre devuelve las tres', () => {
    for (const area of AREAS) {
      expect(conPrincipalPrimero(AREAS, area)).toHaveLength(3);
      expect(new Set(conPrincipalPrimero(AREAS, area))).toEqual(new Set(AREAS));
    }
  });

  it('sin prioridad elegida mantiene el orden original', () => {
    expect(conPrincipalPrimero(AREAS, null)).toEqual(['salud', 'negocio_dinero', 'relaciones']);
  });
});
