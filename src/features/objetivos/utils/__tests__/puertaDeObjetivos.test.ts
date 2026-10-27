/**
 * Plan → Objetivos espera al Mapa de Renacimiento (issue #37, 2026-10-27): la decisión pura. Sin Mapa activo no se
 * ofrece definir ni editar el objetivo de 90 días; mientras no se sabe, ni formularios ni promesas.
 */
import { describe, expect, it } from '@jest/globals';

import type { EstadoMapa } from '../../../mapa-renacimiento/tipos';
import { type LecturaDelMapa, puertaDeObjetivos } from '../puertaDeObjetivos';

const confirmada = (estado: EstadoMapa): LecturaDelMapa => ({ fase: 'confirmada', estado });
const sinConfirmar = (estado: EstadoMapa): LecturaDelMapa => ({ fase: 'sin-confirmar', estado });

describe('puertaDeObjetivos', () => {
  it('con el Mapa activo los objetivos son los de siempre', () => {
    expect(puertaDeObjetivos(true, confirmada('activo'))).toBe('abierta');
  });

  it.each<EstadoMapa>(['no_iniciado', 'en_progreso', 'listo_para_revision'])(
    'con el Mapa en «%s» y confirmado, los objetivos esperan al Mapa',
    estado => {
      expect(puertaDeObjetivos(true, confirmada(estado))).toBe('espera-al-mapa');
    },
  );

  it('mientras no se sabe, se comprueba: ni se abre ni se bloquea', () => {
    expect(puertaDeObjetivos(true, { fase: 'cargando' })).toBe('comprobando');
  });

  it.each<EstadoMapa>(['no_iniciado', 'en_progreso', 'listo_para_revision'])(
    'sin respuesta del servidor y con el Mapa en «%s» en el teléfono, se pide reintentar',
    estado => {
      expect(puertaDeObjetivos(true, sinConfirmar(estado))).toBe('sin-comprobar');
    },
  );

  it('«activo» en el teléfono alcanza aunque el servidor no conteste', () => {
    expect(puertaDeObjetivos(true, sinConfirmar('activo'))).toBe('abierta');
  });

  it('en un build sin el Mapa no se bloquea nada, sepa lo que sepa', () => {
    const lecturas: LecturaDelMapa[] = [
      { fase: 'cargando' },
      confirmada('no_iniciado'),
      confirmada('activo'),
      sinConfirmar('en_progreso'),
    ];
    for (const lectura of lecturas) {
      expect(puertaDeObjetivos(false, lectura)).toBe('abierta');
    }
  });
});
