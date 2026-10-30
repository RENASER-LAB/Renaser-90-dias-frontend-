import { describe, expect, it } from '@jest/globals';

import {
  HORA_DEL_CIERRE_SIN_DORMIR,
  MINUTOS_ANTES_DE_DORMIR,
  horaDelCierre,
  minutosDeDormirHoy,
  yaEsHoraDelCierre,
  type HabitoParaElCierre,
} from '../horaDelCierre';

/**
 * La regla de la hora de la fila «Cierra tu día» (spec 017, decisión del dueño): 30 minutos antes de la hora de Dormir de
 * hoy; 21:30 si Dormir no tiene hora. Jueves 29 de octubre de 2026.
 */

const JUEVES = '2026-10-29';
const dormir = (time: string, extra: Partial<HabitoParaElCierre> = {}): HabitoParaElCierre => ({
  systemKey: 'SLEEP',
  time,
  tieneTrackHoy: true,
  done: false,
  ...extra,
});
const despertar: HabitoParaElCierre = { systemKey: 'WAKE_UP', time: '05:30', tieneTrackHoy: true, done: false };

describe('la hora de «Cierra tu día»', () => {
  it('es 30 minutos antes de Dormir de hoy', () => {
    expect(MINUTOS_ANTES_DE_DORMIR).toBe(30);
    expect(horaDelCierre([despertar, dormir('22:30')], JUEVES)).toBe('22:00');
    expect(horaDelCierre([dormir('23:15')], JUEVES)).toBe('22:45');
    expect(horaDelCierre([dormir('21:00')], JUEVES)).toBe('20:30');
  });

  it('sin Dormir hoy son las 21:30', () => {
    expect(HORA_DEL_CIERRE_SIN_DORMIR).toBe('21:30');
    expect(horaDelCierre([despertar], JUEVES)).toBe('21:30');
    expect(horaDelCierre([], JUEVES)).toBe('21:30');
  });

  it('Dormir sin registro de hoy (no le toca o está pausado) cuenta como sin Dormir', () => {
    expect(horaDelCierre([dormir('22:30', { tieneTrackHoy: false })], JUEVES)).toBe('21:30');
  });

  it('Dormir pausado hoy después de generarse el registro, sin hacer, cuenta como sin Dormir', () => {
    expect(horaDelCierre([dormir('22:30', { diasCatalogo: { JUE: false } })], JUEVES)).toBe('21:30');
  });

  it('Dormir pausado pero ya hecho sigue contando: se acostó a esa hora', () => {
    expect(horaDelCierre([dormir('22:30', { diasCatalogo: { JUE: false }, done: true })], JUEVES)).toBe('22:00');
  });

  it('Dormir sin hora legible cuenta como sin hora', () => {
    expect(horaDelCierre([dormir('')], JUEVES)).toBe('21:30');
    expect(horaDelCierre([dormir('sin hora')], JUEVES)).toBe('21:30');
    expect(minutosDeDormirHoy([dormir('')], JUEVES)).toBeNull();
  });

  it('el Dormir que sirve es el primero con registro y con hora', () => {
    expect(horaDelCierre([dormir('', { tieneTrackHoy: true }), dormir('23:00')], JUEVES)).toBe('22:30');
  });

  it('Dormir pasada la medianoche (00:10): 30 minutos antes sería ayer, así que se ancla a las 00:00', () => {
    expect(horaDelCierre([dormir('00:10')], JUEVES)).toBe('00:00');
    expect(horaDelCierre([dormir('00:30')], JUEVES)).toBe('00:00');
    expect(horaDelCierre([dormir('00:31')], JUEVES)).toBe('00:01');
  });

  it('acepta la hora con segundos', () => {
    expect(horaDelCierre([dormir('22:30:00')], JUEVES)).toBe('22:00');
  });
});

describe('¿ya es la hora?', () => {
  const minutos = (h: number, m: number) => h * 60 + m;
  it('antes no, justo a la hora sí, después sí', () => {
    expect(yaEsHoraDelCierre('22:00', minutos(21, 59))).toBe(false);
    expect(yaEsHoraDelCierre('22:00', minutos(22, 0))).toBe(true);
    expect(yaEsHoraDelCierre('22:00', minutos(23, 59))).toBe(true);
  });

  it('la de 00:00 está siempre disponible', () => {
    expect(yaEsHoraDelCierre('00:00', 0)).toBe(true);
  });

  it('una hora que no se entiende nunca es la hora', () => {
    expect(yaEsHoraDelCierre('--', minutos(23, 0))).toBe(false);
  });
});
