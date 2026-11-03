import { describe, expect, it } from '@jest/globals';

import type { FormacionDeLaSesion } from '../types/formaciones.types';
import { programaEnOtraFormacion, textoDelProgramaEnOtraFormacion } from '../utils/programaEnOtraFormacion';

const sesion = (extra: Partial<FormacionDeLaSesion> = {}): FormacionDeLaSesion => ({
  activa: { codigo: 'ESCUELA', nombre: 'Escuela Renaser' },
  disponibles: [
    { codigo: 'ESCUELA', nombre: 'Escuela Renaser' },
    { codigo: 'DIPLOMADO', nombre: 'Diplomado Renaser' },
  ],
  puedeElegir: true,
  veTodas: false,
  sinFormacion: false,
  duracionDias: 90,
  fases: [],
  ...extra,
});

describe('«Mi programa» del personal con varias formaciones (spec 023, FR-030a)', () => {
  it('con otra formación activa que la de su programa dice dónde está, con el nombre del servidor', () => {
    expect(programaEnOtraFormacion(sesion(), 'DIPLOMADO')).toEqual({ codigo: 'DIPLOMADO', nombre: 'Diplomado Renaser' });
  });

  it('la línea es una sola y en tuteo', () => {
    expect(textoDelProgramaEnOtraFormacion('Diplomado Renaser')).toBe(
      'Tu programa propio está en Diplomado Renaser. Cámbiate a ella para verlo.',
    );
  });

  it('con su programa en la formación activa no hay aviso', () => {
    expect(programaEnOtraFormacion(sesion(), 'ESCUELA')).toBeNull();
  });

  it('quien tiene UNA sola formación (no puede elegir) nunca ve el aviso', () => {
    expect(programaEnOtraFormacion(sesion({ puedeElegir: false }), 'DIPLOMADO')).toBeNull();
  });

  it('Administración (ve todas) y quien no tiene formación asignada tampoco', () => {
    expect(programaEnOtraFormacion(sesion({ veTodas: true, activa: null }), 'DIPLOMADO')).toBeNull();
    expect(programaEnOtraFormacion(sesion({ sinFormacion: true, activa: null }), 'DIPLOMADO')).toBeNull();
  });

  it('sin saber la formación del programa, o sin sesión (backend anterior), no hay aviso', () => {
    expect(programaEnOtraFormacion(sesion(), null)).toBeNull();
    expect(programaEnOtraFormacion(sesion(), undefined)).toBeNull();
    expect(programaEnOtraFormacion(null, 'DIPLOMADO')).toBeNull();
  });

  it('si el servidor no la lista, se nombra con el nombre de fábrica', () => {
    expect(programaEnOtraFormacion(sesion(), 'CERTIFICACION')).toEqual({ codigo: 'CERTIFICACION', nombre: 'Certificación Renaser' });
  });
});
