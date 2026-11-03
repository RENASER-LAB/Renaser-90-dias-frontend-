import { describe, expect, it } from '@jest/globals';

import { ApiError } from '../../../../services/http/apiClient';
import { MENSAJE_DE_OBJETIVOS_SIN_PROGRAMA, esFaltaDeProgramaAndando, mensajeDeObjetivos } from '../mensajeDeObjetivos';

/**
 * E2E de las formaciones (01/11/2026, issues #81 y #83): el personal sin programa andando veía en rojo el texto del servidor —con el id de la persona o
 * hablando de «aprendices»— en el objetivo, en «Esta semana» y en las acciones. Esos dos rechazos se dicen con palabras de la persona.
 */
describe('la falta de programa se dice con palabras de la persona', () => {
  const sinFila = new ApiError(404, 'Participante no encontrado: 119883a7-7bfe-457c-a267-f8012586e9ad');
  const personalSinDiaUno = new ApiError(403, 'Solo un aprendiz opera sus propias rocas');

  it('reconoce los dos rechazos del servidor y nada más', () => {
    expect(esFaltaDeProgramaAndando(sinFila)).toBe(true);
    expect(esFaltaDeProgramaAndando(personalSinDiaUno)).toBe(true);
    expect(esFaltaDeProgramaAndando(new ApiError(404, 'No se encontró lo que buscas.'))).toBe(false);
    expect(esFaltaDeProgramaAndando(new ApiError(403, 'Cuenta suspendida'))).toBe(false);
    expect(esFaltaDeProgramaAndando(new ApiError(500, 'Participante no encontrado: x'))).toBe(false);
    expect(esFaltaDeProgramaAndando(new Error('Solo un aprendiz opera sus propias rocas'))).toBe(false);
    expect(esFaltaDeProgramaAndando(null)).toBe(false);
    expect(esFaltaDeProgramaAndando('Participante no encontrado')).toBe(false);
  });

  it('el mensaje no lleva el id ni el texto del servidor', () => {
    for (const error of [sinFila, personalSinDiaUno]) {
      const mensaje = mensajeDeObjetivos(error, 'No pudimos cargar tu objetivo de 90 días.');
      expect(mensaje).toBe(MENSAJE_DE_OBJETIVOS_SIN_PROGRAMA);
      expect(mensaje).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/);
      expect(mensaje).not.toContain('aprendiz');
    }
  });

  it('cualquier otro error sigue diciéndose como siempre', () => {
    expect(mensajeDeObjetivos(new Error('boom'), 'No pudimos cargar tu objetivo de 90 días.')).toBe('No pudimos cargar tu objetivo de 90 días.');
    expect(mensajeDeObjetivos(new ApiError(409, 'Ese objetivo ya quedó fijo.'), 'No pudimos guardar tu objetivo.')).toBe('Ese objetivo ya quedó fijo.');
  });
});
