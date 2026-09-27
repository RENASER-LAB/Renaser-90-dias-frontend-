/**
 * ADM-12 y ADM-14 del e2e del 2026-09-27 (E-373): el panel decía «No se pudo guardar el grupo.» o «Inténtalo
 * de nuevo en un momento.» aunque el servidor explicara el motivo (un nombre de más de 200 caracteres, el cupo
 * lleno). Ahora se muestra el motivo, salvo que no sirva para leerse. Fallan contra el código anterior, que
 * devolvía el genérico para todo error de la API que no fuera de red, 401 o 403.
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('../../../../services/storage/almacenamientoSeguro', () => ({
  almacenamientoSeguro: {
    guardarToken: jest.fn(async () => undefined),
    borrarToken: jest.fn(async () => undefined),
    leerToken: jest.fn(async () => null),
  },
}));

import { ApiError } from '../../../../services/http/apiClient';
import { mensajeDeFallo } from '../mensajes';

const GENERICO = 'No se pudo guardar el grupo.';

describe('mensajeDeFallo: el motivo que da el servidor', () => {
  it('un 400 con motivo: el motivo (ADM-12, nombre de 201 caracteres)', () => {
    const error = new ApiError(400, 'El nombre de la celula no puede pasar de 200 caracteres');

    expect(mensajeDeFallo(error, GENERICO)).toBe('El nombre de la celula no puede pasar de 200 caracteres');
  });

  it('un 409 con motivo: el motivo (ADM-14, cupo lleno)', () => {
    const error = new ApiError(409, 'El grupo Fenix no tiene cupo disponible');

    expect(mensajeDeFallo(error, 'Inténtalo de nuevo en un momento.')).toBe('El grupo Fenix no tiene cupo disponible');
  });

  it('también 413, 415 y 422, que el servidor explica', () => {
    for (const status of [413, 415, 422]) {
      expect(mensajeDeFallo(new ApiError(status, 'La foto pesa más de 2 MB'), GENERICO)).toBe('La foto pesa más de 2 MB');
    }
  });
});

describe('mensajeDeFallo: lo que no se muestra tal cual', () => {
  it('un mensaje interno (Clase.campo:) o el relleno «Error NNN» dejan el genérico', () => {
    expect(mensajeDeFallo(new ApiError(400, 'CrearCelulaCommand.nombre: no debe estar vacío'), GENERICO)).toBe(GENERICO);
    expect(mensajeDeFallo(new ApiError(409, 'Error 409'), GENERICO)).toBe(GENERICO);
    expect(mensajeDeFallo(new ApiError(400, ''), GENERICO)).toBe(GENERICO);
  });

  it('un 404 (trae ids) y un 5xx (no explica nada) siguen con el genérico', () => {
    expect(mensajeDeFallo(new ApiError(404, 'Celula no encontrada: 1b2c3d4e'), GENERICO)).toBe(GENERICO);
    expect(mensajeDeFallo(new ApiError(500, 'NullPointerException'), GENERICO)).toBe(GENERICO);
  });

  it('red, sesión vencida y permiso siguen como antes', () => {
    expect(mensajeDeFallo(new ApiError(0, 'sin red'), GENERICO)).toBe(
      'Sin conexión con el servidor. Revisa tu red y vuelve a intentar.'
    );
    expect(mensajeDeFallo(new ApiError(401, 'x', null, true), GENERICO)).toBe('Tu sesión venció. Vuelve a entrar.');
    expect(mensajeDeFallo(new ApiError(403, 'x'), GENERICO)).toBe('Tu cuenta no tiene permiso para esto.');
  });
});
