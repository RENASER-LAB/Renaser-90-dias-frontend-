import { describe, expect, it } from '@jest/globals';

import { ApiError, mensajeDeError } from '../apiClient';

const err = (message: string) => new ApiError(400, message);

/**
 * Salió esto en un diálogo de la app, tal cual:
 *
 *     CrearPlanDiarioCommand.rocas: el tamaño debe estar entre 3 y 9
 *
 * El nombre de una clase Java y el de un campo, en la cara de un aprendiz. La causa se arregló en
 * el servidor (E-207); esto verifica el cinturón de este lado.
 */
describe('mensajeDeError · mensajes internos', () => {
  it('no muestra un mensaje con forma de Clase.campo:', () => {
    expect(mensajeDeError(err('CrearPlanDiarioCommand.rocas: el tamaño debe estar entre 3 y 9'), 'Algo falló.'))
      .toBe('Algo falló.');
    expect(mensajeDeError(err('CrearPlanSemanalCommand.rocas: no puede estar vacío'), 'Algo falló.'))
      .toBe('Algo falló.');
  });

  it('SÍ muestra los mensajes escritos para leerse', () => {
    expect(mensajeDeError(err('Antes de definir un objetivo mensual hay que definir el de 90 días'), 'x'))
      .toBe('Antes de definir un objetivo mensual hay que definir el de 90 días');
    expect(mensajeDeError(err('Esta roca ya tiene evidencia registrada'), 'x'))
      .toBe('Esta roca ya tiene evidencia registrada');
  });

  it('no se confunde con una frase que empieza en mayúscula y tiene dos puntos', () => {
    // El descarte es estrecho a propósito: sin el punto entre palabras, no es un path interno.
    expect(mensajeDeError(err('Atención: tu semana ya estaba planificada'), 'x'))
      .toBe('Atención: tu semana ya estaba planificada');
  });
});
