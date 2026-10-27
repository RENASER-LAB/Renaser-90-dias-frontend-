import { describe, expect, it } from '@jest/globals';

import {
  AVISO_SI_NO_SE_ABREN_SUS_DIAS,
  destinoDeLaPersonaDelSemaforo,
  fichaOfreceSusDias,
  grupoParaVerSusDias,
} from '../susDiasYEvidencias';

/**
 * Qué abre Administración al tocar a una persona (2026-10-27). El servidor solo abre sus días a quien está en un
 * grupo regular con mentor; fuera de eso responde 404, y la ficha es la única vista que sirve a cualquiera.
 */
describe('tocar a una persona del semáforo de un grupo', () => {
  it('con grupo que se puede abrir (tiene mentor), va a sus días y evidencias, como el líder', () => {
    expect(destinoDeLaPersonaDelSemaforo({ puedeAbrirse: true })).toBe('dias-y-evidencias');
  });

  it('con un grupo sin mentor (o un backend anterior, sin el campo), va a su ficha como siempre', () => {
    expect(destinoDeLaPersonaDelSemaforo({ puedeAbrirse: false })).toBe('ficha');
  });
});

describe('«Ver sus días y evidencias» en la ficha', () => {
  it('pide los días con el grupo de la persona', () => {
    expect(grupoParaVerSusDias({ cellId: 'g-7' })).toBe('g-7');
  });

  it('sin grupo (esperando que alguien la ubique, o no se sabe) no hay nada que pedir', () => {
    expect(grupoParaVerSusDias({ cellId: null })).toBeNull();
    expect(grupoParaVerSusDias({ cellId: undefined })).toBeNull();
    expect(grupoParaVerSusDias({ cellId: '  ' })).toBeNull();
  });

  it('se ofrece desde Personas, desde el semáforo sin mentor y desde la info de un chat con grupo', () => {
    expect(fichaOfreceSusDias({ id: 'a-1', cellId: 'g-7' }, { nombre: 'personas' })).toBe(true);
    expect(fichaOfreceSusDias({ id: 'a-1', cellId: 'g-7' }, { nombre: 'semaforo-grupo' })).toBe(true);
    expect(fichaOfreceSusDias({ id: 'a-1', cellId: 'g-7' }, undefined)).toBe(true);
  });

  it('no se ofrece sin grupo', () => {
    expect(fichaOfreceSusDias({ id: 'a-1', cellId: null }, { nombre: 'personas' })).toBe(false);
  });

  it('no se ofrece si la ficha se abrió desde los días de esa misma persona: sería un círculo', () => {
    const anterior = { nombre: 'persona-semaforo', aprendiz: { id: 'a-1' } };
    expect(fichaOfreceSusDias({ id: 'a-1', cellId: 'g-7' }, anterior)).toBe(false);
    // Otra persona debajo no cuenta.
    expect(fichaOfreceSusDias({ id: 'a-2', cellId: 'g-7' }, anterior)).toBe(true);
  });
});

describe('cuando el servidor no abre a la persona (404)', () => {
  it('el aviso dice por qué y dónde sí se ven sus evidencias, sin prometer que aparecerán solas', () => {
    expect(AVISO_SI_NO_SE_ABREN_SUS_DIAS).toContain('todavía no tiene mentor');
    expect(AVISO_SI_NO_SE_ABREN_SUS_DIAS).toContain('su ficha');
    expect(AVISO_SI_NO_SE_ABREN_SUS_DIAS).not.toMatch(/vas a ver|sin hacer nada/i);
  });

  it('está en tuteo de Perú, sin voseo', () => {
    expect(AVISO_SI_NO_SE_ABREN_SUS_DIAS).not.toMatch(/\b(tenés|podés|querés|vos)\b/i);
  });
});
