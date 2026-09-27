import { describe, expect, it } from '@jest/globals';

import { ApiError } from '../../../../services/http/apiClient';
import {
  acotarDia,
  cuerpoDelCambioDeDia,
  detalleDelCambioDeDia,
  disponibilidadDelCambio,
  leerDiaEscrito,
  leerUltimoAjuste,
  mensajeDelErrorDeCambio,
  moverDia,
  nombreDeQuienAjusto,
  preguntaDelCambioDeDia,
  textoDelUltimoAjuste,
  validarCambioDeDia,
} from '../diaDelPrograma';

/**
 * Cambiar el día del programa desde Administración (26/09, backend D-82:
 * `PUT /api/v1/admin/trainees/{id}/program-day` con `{ programDay: 1..89, motivo ≤ 280 }`).
 */
describe('rango y deltas', () => {
  it('acota al rango 1..89: ni 0 ni 90 desde esta herramienta (decisión del dueño, 26/09)', () => {
    expect(acotarDia(-3)).toBe(1);
    expect(acotarDia(0)).toBe(1);
    expect(acotarDia(45)).toBe(45);
    expect(acotarDia(90)).toBe(89);
    expect(acotarDia(91)).toBe(89);
    expect(acotarDia(Number.NaN)).toBe(1);
  });

  it('los botones y atajos mueven de a uno sin salir del rango', () => {
    expect(moverDia(34, 1)).toBe(35);
    expect(moverDia(34, -1)).toBe(33);
    expect(moverDia(1, -1)).toBe(1);
    expect(moverDia(89, 1)).toBe(89);
  });

  it('lee solo enteros escritos, sin acotar en silencio', () => {
    expect(leerDiaEscrito('34')).toBe(34);
    expect(leerDiaEscrito(' 7 ')).toBe(7);
    expect(leerDiaEscrito('95')).toBe(95); // se rechaza al validar, no se convierte en 90
    expect(leerDiaEscrito('')).toBeNull();
    expect(leerDiaEscrito('3.5')).toBeNull();
    expect(leerDiaEscrito('-2')).toBeNull();
    expect(leerDiaEscrito('abc')).toBeNull();
  });
});

describe('validarCambioDeDia', () => {
  it('arma el cuerpo exacto del PUT con el motivo recortado', () => {
    expect(validarCambioDeDia({ diaActual: 40, diaNuevo: 34, motivo: '  Viajó y pidió volver al día 34 ' })).toEqual({
      ok: true,
      cuerpo: { programDay: 34, motivo: 'Viajó y pidió volver al día 34' },
    });
    expect(cuerpoDelCambioDeDia(1, ' x ')).toEqual({ programDay: 1, motivo: 'x' });
  });

  it('acepta los extremos 1 y 89 y rechaza 0 y 90', () => {
    expect(validarCambioDeDia({ diaActual: 10, diaNuevo: 1, motivo: 'm' }).ok).toBe(true);
    expect(validarCambioDeDia({ diaActual: 10, diaNuevo: 89, motivo: 'm' }).ok).toBe(true);
    expect(validarCambioDeDia({ diaActual: 10, diaNuevo: 0, motivo: 'm' }).ok).toBe(false);
    expect(validarCambioDeDia({ diaActual: 10, diaNuevo: 90, motivo: 'm' }).ok).toBe(false);
  });

  it('rechaza fuera de rango, vacío o igual al actual', () => {
    expect(validarCambioDeDia({ diaActual: 10, diaNuevo: 91, motivo: 'm' })).toEqual({
      ok: false,
      error: 'Escribe un día entre 1 y 89.',
    });
    expect(validarCambioDeDia({ diaActual: 10, diaNuevo: -1, motivo: 'm' }).ok).toBe(false);
    expect(validarCambioDeDia({ diaActual: 10, diaNuevo: null, motivo: 'm' }).ok).toBe(false);
    const igual = validarCambioDeDia({ diaActual: 10, diaNuevo: 10, motivo: 'm' });
    expect(igual.ok).toBe(false);
    if (!igual.ok) expect(igual.error).toContain('Ya está en el día 10');
  });

  it('exige motivo aunque el backend lo acepte vacío, y respeta los 280', () => {
    const sinMotivo = validarCambioDeDia({ diaActual: 10, diaNuevo: 11, motivo: '   ' });
    expect(sinMotivo.ok).toBe(false);
    if (!sinMotivo.ok) expect(sinMotivo.error).toContain('motivo');
    expect(validarCambioDeDia({ diaActual: 10, diaNuevo: 11, motivo: 'a'.repeat(280) }).ok).toBe(true);
    expect(validarCambioDeDia({ diaActual: 10, diaNuevo: 11, motivo: 'a'.repeat(281) }).ok).toBe(false);
  });
});

describe('confirmación', () => {
  it('nombra a la persona y los dos días', () => {
    expect(preguntaDelCambioDeDia('Ana Pérez', 40, 34)).toBe('¿Pasar a Ana Pérez del día 40 al día 34?');
    expect(preguntaDelCambioDeDia('  ', 1, 2)).toBe('¿Pasar a esta persona del día 1 al día 2?');
  });

  it('dice si adelanta o retrocede y cuánto', () => {
    expect(detalleDelCambioDeDia(40, 34)).toMatch(/^Retrocede 6 días\./);
    expect(detalleDelCambioDeDia(10, 11)).toMatch(/^Adelanta 1 día\./);
  });
});

describe('errores del PUT', () => {
  it('traduce cada código a un texto claro', () => {
    expect(mensajeDelErrorDeCambio(new ApiError(400, 'programDay: debe ser menor que o igual a 90'))).toContain(
      'entre 1 y 89',
    );
    expect(mensajeDelErrorDeCambio(new ApiError(409, 'no empezó'))).toContain('todavía no empezó su Día 1');
    expect(mensajeDelErrorDeCambio(new ApiError(403, 'x'))).toBe('Tu cuenta no puede cambiar el día.');
    expect(mensajeDelErrorDeCambio(new ApiError(0, 'x'))).toContain('Sin conexión');
    expect(mensajeDelErrorDeCambio(new ApiError(404, 'Participante no inscripto'))).toContain('no está inscrita');
    expect(mensajeDelErrorDeCambio(new Error('boom'))).toBe('No se pudo cambiar el día. Vuelve a intentar en un momento.');
  });
});

describe('lastDayAdjustment', () => {
  const ajuste = {
    previousDay: 40,
    newDay: 34,
    adjustmentDays: 6,
    motivo: 'Viajó',
    adjustedBy: 'admin-1',
    adjustedAt: '2026-09-26T15:00:00Z',
  };

  it('lo lee cuando viene', () => {
    expect(leerUltimoAjuste(ajuste)).toEqual({
      diaAnterior: 40,
      diaNuevo: 34,
      motivo: 'Viajó',
      ajustadoPor: 'admin-1',
      ajustadoEn: '2026-09-26T15:00:00Z',
    });
  });

  it('no rompe contra un backend viejo ni con una forma rara', () => {
    expect(leerUltimoAjuste(undefined)).toBeNull();
    expect(leerUltimoAjuste(null)).toBeNull();
    expect(leerUltimoAjuste({ previousDay: 'cuarenta' })).toBeNull();
    expect(leerUltimoAjuste({ previousDay: 1, newDay: 2 })).toEqual({
      diaAnterior: 1,
      diaNuevo: 2,
      motivo: null,
      ajustadoPor: null,
      ajustadoEn: null,
    });
  });

  it('arma la línea de la ficha', () => {
    const leido = leerUltimoAjuste(ajuste)!;
    const texto = textoDelUltimoAjuste(leido, 'Carla');
    expect(texto).toMatch(/^Último ajuste: del día 40 al 34 por Carla, el 2[56] de septiembre\. Motivo: Viajó$/);
    expect(textoDelUltimoAjuste({ ...leido, motivo: null, ajustadoEn: null }, null)).toBe(
      'Último ajuste: del día 40 al 34 por alguien del equipo.',
    );
  });

  it('resuelve quién: «ti», el nombre conocido o nada', () => {
    const nombres = new Map([['admin-1', 'Carla']]);
    expect(nombreDeQuienAjusto('yo', 'yo', nombres)).toBe('ti');
    expect(nombreDeQuienAjusto('admin-1', 'yo', nombres)).toBe('Carla');
    expect(nombreDeQuienAjusto('otro', 'yo', nombres)).toBeNull();
    expect(nombreDeQuienAjusto(null, 'yo', nombres)).toBeNull();
  });
});

describe('disponibilidadDelCambio', () => {
  it('se ofrece si su programa ya empezó (también el mismo día)', () => {
    expect(disponibilidadDelCambio({ startDate: '2026-09-01', inscrito: true }, '2026-09-26')).toEqual({ puede: true });
    expect(disponibilidadDelCambio({ startDate: '2026-09-26' }, '2026-09-26')).toEqual({ puede: true });
  });

  it('no se ofrece antes del Día 1 ni sin inscripción', () => {
    expect(disponibilidadDelCambio({ startDate: null }, '2026-09-26').puede).toBe(false);
    expect(disponibilidadDelCambio({ startDate: '2026-09-27' }, '2026-09-26').puede).toBe(false);
    expect(disponibilidadDelCambio({ startDate: '2026-09-01', inscrito: false }, '2026-09-26').puede).toBe(false);
  });
});
