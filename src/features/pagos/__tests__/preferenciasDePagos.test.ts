import { describe, expect, it } from '@jest/globals';

import {
  esHoraDePago,
  leerPreferenciasDePagos,
  ordenarAntelaciones,
  PREFERENCIAS_DE_PAGOS_POR_DEFECTO,
  resumenDeLosRecordatoriosDePago,
} from '../notificaciones/preferenciasDePagos';

describe('lo que la persona eligió para sus recordatorios de pago', () => {
  it('sin nada guardado: encendidos, 3 días antes y el mismo día, a las 09:00 (decisión del dueño)', () => {
    expect(PREFERENCIAS_DE_PAGOS_POR_DEFECTO).toEqual({ activos: true, antelaciones: [3, 0], hora: '09:00' });
    expect(leerPreferenciasDePagos(null)).toEqual(PREFERENCIAS_DE_PAGOS_POR_DEFECTO);
  });

  it('lee lo guardado', () => {
    expect(leerPreferenciasDePagos(JSON.stringify({ activos: false, antelaciones: [1], hora: '20:30' }))).toEqual({ activos: false, antelaciones: [1], hora: '20:30' });
  });

  it('cualquier cosa rara cae al valor por defecto, campo por campo', () => {
    expect(leerPreferenciasDePagos('esto no es json')).toEqual(PREFERENCIAS_DE_PAGOS_POR_DEFECTO);
    expect(leerPreferenciasDePagos('null')).toEqual(PREFERENCIAS_DE_PAGOS_POR_DEFECTO);
    expect(leerPreferenciasDePagos(JSON.stringify({ activos: 'sí', hora: '25:99', antelaciones: 'todos' }))).toEqual(PREFERENCIAS_DE_PAGOS_POR_DEFECTO);
    expect(leerPreferenciasDePagos(JSON.stringify({ antelaciones: [2, 7, 3, 3, 'x'] })).antelaciones).toEqual([3]);
  });

  it('una lista vacía de avisos es válida (encendido sin ningún aviso no avisa nada)', () => {
    expect(leerPreferenciasDePagos(JSON.stringify({ antelaciones: [] })).antelaciones).toEqual([]);
  });

  it('los avisos van sin repetir y de la antelación más lejana a la más cercana', () => {
    expect(ordenarAntelaciones([0, 3, 1, 0])).toEqual([3, 1, 0]);
  });

  it('la hora es HH:mm en 24 h', () => {
    expect(esHoraDePago('09:00')).toBe(true);
    expect(esHoraDePago('23:59')).toBe(true);
    expect(esHoraDePago('24:00')).toBe(false);
    expect(esHoraDePago('9:00')).toBe(false);
    expect(esHoraDePago(900)).toBe(false);
  });

  it('se resume en una línea', () => {
    expect(resumenDeLosRecordatoriosDePago(PREFERENCIAS_DE_PAGOS_POR_DEFECTO)).toBe('3 días antes y el mismo día · 09:00');
    expect(resumenDeLosRecordatoriosDePago({ activos: true, antelaciones: [3, 1, 0], hora: '08:00' })).toBe('3 días antes, 1 día antes y el mismo día · 08:00');
    expect(resumenDeLosRecordatoriosDePago({ activos: true, antelaciones: [0], hora: '18:00' })).toBe('El mismo día · 18:00');
    expect(resumenDeLosRecordatoriosDePago({ activos: false, antelaciones: [3, 0], hora: '09:00' })).toBe('Apagados en este teléfono');
    expect(resumenDeLosRecordatoriosDePago({ activos: true, antelaciones: [], hora: '09:00' })).toBe('Sin ningún aviso elegido');
  });
});
