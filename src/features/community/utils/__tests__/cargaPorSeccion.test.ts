import { describe, expect, it } from '@jest/globals';

import {
  acumularRecursos,
  NINGUN_RECURSO,
  recursosQueNecesita,
  type ContextoComunidad,
} from '../cargaPorSeccion';

const enSeccion = (seccion: ContextoComunidad['seccion']): ContextoComunidad => ({
  seccion,
  componiendo: false,
  compartiendo: false,
});

/**
 * V-3 (retroalimentación del 26/09/2026): Comunidad pedía ~11 + N recursos al abrir, todos
 * compitiendo con el Muro. Ahora cada uno se pide al abrir su sección.
 */
describe('recursosQueNecesita', () => {
  /* Corregido 2026-09-28. Decía «al abrir sale únicamente `/wall` (y `/home`)» y esperaba `[]`. Desde
     que la ⓘ de la cabecera abre la info de tu grupo, cada sección pide también `/me/cells`: sin ella
     no se sabe si hay grupo, y sin grupo la ⓘ no se dibuja (E-409). */
  it('el Muro solo necesita tus grupos (la ⓘ de la cabecera): al abrir salen `/wall`, `/home` y `/me/cells`', () => {
    expect(recursosQueNecesita(enSeccion('muro'))).toEqual(['grupos']);
    expect(recursosQueNecesita(enSeccion('testimonios'))).toEqual(['grupos']);
  });

  it('cada sección pide lo suyo', () => {
    expect(recursosQueNecesita(enSeccion('classroom'))).toEqual(['grupos', 'cursos']);
    expect(recursosQueNecesita(enSeccion('ranking'))).toEqual(['grupos', 'ranking', 'celula']);
    expect(recursosQueNecesita(enSeccion('tribu'))).toEqual(
      expect.arrayContaining(['celula', 'grupos', 'conversaciones', 'grupoQueAcompano']),
    );
  });

  it('el compositor pide las categorías y el grupo (la firma), sin salir del Muro', () => {
    expect(recursosQueNecesita({ seccion: 'muro', componiendo: true, compartiendo: false })).toEqual(
      expect.arrayContaining(['categorias', 'celula']),
    );
  });

  it('compartir una publicación pide las conversaciones, sin salir del Muro', () => {
    expect(recursosQueNecesita({ seccion: 'muro', componiendo: false, compartiendo: true })).toEqual(
      expect.arrayContaining(['conversaciones', 'celula']),
    );
  });
});

describe('acumularRecursos', () => {
  it('sin nada nuevo devuelve el MISMO objeto (la pantalla no se re-renderiza por nada)', () => {
    expect(acumularRecursos(NINGUN_RECURSO, [])).toBe(NINGUN_RECURSO);
    const conCursos = acumularRecursos(NINGUN_RECURSO, ['cursos']);
    expect(acumularRecursos(conCursos, ['cursos'])).toBe(conCursos);
  });

  it('lo pedido queda pedido: volver al Muro no apaga los cursos', () => {
    const conCursos = acumularRecursos(NINGUN_RECURSO, recursosQueNecesita(enSeccion('classroom')));
    const deVueltaEnElMuro = acumularRecursos(conCursos, recursosQueNecesita(enSeccion('muro')));
    expect(deVueltaEnElMuro.cursos).toBe(true);
    expect(deVueltaEnElMuro.ranking).toBe(false);
  });
});
