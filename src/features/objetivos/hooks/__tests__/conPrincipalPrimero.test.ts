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
 * La función es genérica (se hizo así el 2026-09-23 para el Mapa, que ya no existe): ordena cualquier lista con el elemento
 * elegido primero, sea de ejes de Plan o de otras claves.
 */
describe('conPrincipalPrimero con otras claves', () => {
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
