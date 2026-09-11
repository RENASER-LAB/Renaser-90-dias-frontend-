/**
 * El desfase entre el reloj del teléfono y el del servidor.
 *
 * Importa porque el Código Renaser abre y cierra por hora en punto: un teléfono adelantado tres
 * horas veía el día terminado a las 17:00 reales, y poner el reloj en 21:00 apagaba el radar.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';

import {
  ahoraConfiable,
  desfaseConElServidor,
  olvidarHoraDelServidor,
  registrarHoraDelServidor,
  relojLocalDesfasado,
} from '../relojServidor';

afterEach(() => {
  olvidarHoraDelServidor();
  jest.useRealTimers();
});

/** Fija el reloj LOCAL en un instante conocido, para poder comparar contra él. */
function relojLocalEn(iso: string) {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(iso));
}

describe('mientras no se midió nada', () => {
  it('no inventa desfase', () => {
    expect(desfaseConElServidor()).toBe(0);
    expect(relojLocalDesfasado()).toBe(false);
  });

  it('la hora confiable es la local', () => {
    relojLocalEn('2026-09-11T15:00:00Z');
    expect(ahoraConfiable().toISOString()).toBe('2026-09-11T15:00:00.000Z');
  });
});

describe('con la hora del servidor a la vista', () => {
  it('mide el adelanto del servidor y corrige la hora', () => {
    relojLocalEn('2026-09-11T12:00:00Z');
    registrarHoraDelServidor(new Date('2026-09-11T15:00:00Z').toUTCString());

    expect(desfaseConElServidor()).toBe(3 * 60 * 60 * 1000);
    expect(ahoraConfiable().toISOString()).toBe('2026-09-11T15:00:00.000Z');
  });

  it('también corrige cuando el teléfono va adelantado', () => {
    relojLocalEn('2026-09-11T18:00:00Z');
    registrarHoraDelServidor(new Date('2026-09-11T15:00:00Z').toUTCString());

    expect(ahoraConfiable().toISOString()).toBe('2026-09-11T15:00:00.000Z');
  });
});

describe('qué cuenta como desfasado', () => {
  it('unos segundos son latencia, no un reloj roto', () => {
    relojLocalEn('2026-09-11T15:00:00Z');
    registrarHoraDelServidor(new Date('2026-09-11T15:00:30Z').toUTCString());
    expect(relojLocalDesfasado()).toBe(false);
  });

  it('más de dos minutos ya puede mover de franja', () => {
    relojLocalEn('2026-09-11T15:00:00Z');
    registrarHoraDelServidor(new Date('2026-09-11T15:03:00Z').toUTCString());
    expect(relojLocalDesfasado()).toBe(true);
  });
});

describe('cabeceras que no sirven', () => {
  it('sin cabecera no se toca nada', () => {
    relojLocalEn('2026-09-11T15:00:00Z');
    registrarHoraDelServidor(null);
    expect(desfaseConElServidor()).toBe(0);
  });

  it('una cabecera ilegible tampoco', () => {
    relojLocalEn('2026-09-11T15:00:00Z');
    registrarHoraDelServidor('no es una fecha');
    expect(desfaseConElServidor()).toBe(0);
    expect(ahoraConfiable().toISOString()).toBe('2026-09-11T15:00:00.000Z');
  });
});
