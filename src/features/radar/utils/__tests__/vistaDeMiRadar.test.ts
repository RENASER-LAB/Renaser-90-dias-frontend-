import { describe, expect, it } from '@jest/globals';

import { miRadarDePrueba } from '../../__tests__/fixturasDeMiRadar';
import type { LecturaDeMiRadar } from '../../hooks/useConfigDeMiRadar';
import {
  MENSAJE_CUENTA_SUSPENDIDA,
  MENSAJE_SIN_PERMISO,
  MENSAJE_SIN_PROGRAMA,
  textoDeCuandoEmpieza,
  vistaDeMiRadar,
} from '../vistaDeMiRadar';

/**
 * Qué muestra Yo → Mi Radar según lo que el servidor dijo (spec 019). Puro: la pantalla solo dibuja lo que esto decide.
 */

/** El jueves 29/10/2026 en el teléfono. */
const AHORA = new Date(2026, 9, 29, 15, 30);
const lista = (hoy: string | null = '2026-10-29'): LecturaDeMiRadar => ({ estado: 'lista', config: miRadarDePrueba(false, {}, hoy) });

describe('vistaDeMiRadar', () => {
  it('«pendiente» es «cargando»: nunca el formulario ni un motivo', () => {
    expect(vistaDeMiRadar({ estado: 'pendiente' }, 10, AHORA)).toEqual({ tipo: 'cargando' });
    expect(vistaDeMiRadar({ estado: 'pendiente' }, null, AHORA)).toEqual({ tipo: 'cargando' });
  });

  it('sin programa activado, con el día que sea', () => {
    for (const dia of [null, 0, 3, 40]) {
      expect(vistaDeMiRadar({ estado: 'sin-programa' }, dia, AHORA)).toEqual({ tipo: 'sin-programa' });
    }
    expect(MENSAJE_SIN_PROGRAMA).toBe('Mi Radar empieza en tu día 8. Primero elige tu Día 1.');
  });

  it('suspendida y sin permiso: una línea con el motivo, cada una con el suyo', () => {
    expect(vistaDeMiRadar({ estado: 'bloqueada', motivo: 'suspendida' }, 12, AHORA)).toEqual({
      tipo: 'bloqueada',
      texto: 'Tu cuenta está suspendida: Mi Radar no está disponible.',
    });
    expect(vistaDeMiRadar({ estado: 'bloqueada', motivo: 'sin-permiso' }, 12, AHORA)).toEqual({
      tipo: 'bloqueada',
      texto: 'No tienes permiso para usar Mi Radar.',
    });
    expect(MENSAJE_CUENTA_SUSPENDIDA).not.toBe(MENSAJE_SIN_PERMISO);
  });

  it('sin red o 5xx es «fallo» (con «Reintentar»); un backend sin Mi Radar es «no disponible»', () => {
    expect(vistaDeMiRadar({ estado: 'fallo' }, 12, AHORA)).toEqual({ tipo: 'fallo' });
    expect(vistaDeMiRadar({ estado: 'no-disponible' }, 12, AHORA)).toEqual({ tipo: 'no-disponible' });
  });

  it('con Mi Radar leído: el formulario desde el día 8, o cuando no se sabe el día (quien viene de un aviso)', () => {
    expect(vistaDeMiRadar(lista(), 8, AHORA)).toEqual({ tipo: 'editor' });
    expect(vistaDeMiRadar(lista(), 60, AHORA)).toEqual({ tipo: 'editor' });
    expect(vistaDeMiRadar(lista(), null, AHORA)).toEqual({ tipo: 'editor' });
    expect(vistaDeMiRadar(lista(), undefined, AHORA)).toEqual({ tipo: 'editor' });
  });

  it('con Mi Radar leído pero antes del día 8: cuándo empieza, sin formulario', () => {
    expect(vistaDeMiRadar(lista(), 5, AHORA)).toEqual({ tipo: 'aun-no', texto: 'Mi Radar empieza en tu día 8, el domingo 1 de noviembre.' });
    expect(vistaDeMiRadar(lista(), 0, AHORA)).toEqual({ tipo: 'aun-no', texto: 'Mi Radar empieza en tu día 8.' });
    expect(vistaDeMiRadar(lista(), 7, AHORA).tipo).toBe('aun-no');
  });
});

describe('textoDeCuandoEmpieza', () => {
  it('cuenta los días que faltan para el 8 desde la fecha del servidor', () => {
    expect(textoDeCuandoEmpieza(1, '2026-10-29', AHORA)).toBe('Mi Radar empieza en tu día 8, el jueves 5 de noviembre.');
    expect(textoDeCuandoEmpieza(7, '2026-10-29', AHORA)).toBe('Mi Radar empieza en tu día 8, el viernes 30 de octubre.');
  });

  it('manda la fecha del servidor (la zona de la persona), no la del teléfono', () => {
    // El teléfono dice jueves 29 pero la persona ya está en el viernes 30.
    expect(textoDeCuandoEmpieza(7, '2026-10-30', AHORA)).toBe('Mi Radar empieza en tu día 8, el sábado 31 de octubre.');
  });

  it('sin fecha del servidor usa la del teléfono', () => {
    expect(textoDeCuandoEmpieza(5, null, AHORA)).toBe('Mi Radar empieza en tu día 8, el domingo 1 de noviembre.');
    expect(textoDeCuandoEmpieza(5, 'mañana', AHORA)).toBe('Mi Radar empieza en tu día 8, el domingo 1 de noviembre.');
  });

  it('cruza el fin de mes y el de año', () => {
    expect(textoDeCuandoEmpieza(3, '2026-12-30', AHORA)).toBe('Mi Radar empieza en tu día 8, el lunes 4 de enero.');
    expect(textoDeCuandoEmpieza(2, '2027-02-25', AHORA)).toBe('Mi Radar empieza en tu día 8, el miércoles 3 de marzo.');
  });

  it('sin Día 1 todavía (día 0) no inventa una fecha', () => {
    expect(textoDeCuandoEmpieza(0, '2026-10-29', AHORA)).toBe('Mi Radar empieza en tu día 8.');
  });
});
