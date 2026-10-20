import { describe, expect, it } from '@jest/globals';

import type { DiaDeLaSemanaApi } from '../../../habits/types/habits.types';
import {
  avisoInicialDeLosMarcados,
  diasDelEditor,
  diasPropiosDelEditor,
  mismoAviso,
  queGuardar,
  resumenDelAvisoDelDia,
  servidorInformaAvisosPorDia,
  textoDelBoton,
} from '../avisoDeLosDias';

/**
 * El recordatorio de cada día en el editor de «Planificar» (spec 008). Las reglas son las respuestas del dueño
 * del 2026-10-20: avisos distintos → ninguno elegido; guardar solo lo tocado; el chip dice el aviso solo si
 * difiere del general.
 */
describe('avisoInicialDeLosMarcados', () => {
  it('sin días marcados no hay nada que derivar: manda el general', () => {
    expect(avisoInicialDeLosMarcados([])).toBeNull();
  });

  it('un día, o varios con el mismo aviso: ese aviso, ordenado de mayor a menor', () => {
    expect(avisoInicialDeLosMarcados([[30]])).toEqual([30]);
    expect(avisoInicialDeLosMarcados([[10, 30], [30, 10], [30, 10]])).toEqual([30, 10]);
    expect(avisoInicialDeLosMarcados([[], []])).toEqual([]);
  });

  it('avisos distintos: «distintos» (no se elige ninguno)', () => {
    expect(avisoInicialDeLosMarcados([[30], [10]])).toBe('distintos');
    expect(avisoInicialDeLosMarcados([[30], [30], []])).toBe('distintos');
    expect(avisoInicialDeLosMarcados([[30, 0], [30]])).toBe('distintos');
  });
});

describe('queGuardar: solo lo que se tocó', () => {
  it('sin mover la rueda, solo el aviso', () => {
    expect(queGuardar({ movioLaRueda: false, cambioElAviso: true })).toBe('aviso');
  });
  it('moviendo la rueda y el aviso, los dos', () => {
    expect(queGuardar({ movioLaRueda: true, cambioElAviso: true })).toBe('ambos');
  });
  it('moviendo solo la rueda, la hora', () => {
    expect(queGuardar({ movioLaRueda: true, cambioElAviso: false })).toBe('hora');
  });
  it('sin tocar nada, lo de siempre: la hora de la rueda', () => {
    expect(queGuardar({ movioLaRueda: false, cambioElAviso: false })).toBe('hora');
  });
});

describe('textoDelBoton', () => {
  const base = { guardando: false, hora: '07:00' };
  it('sin días: la hora para todos los días', () => {
    expect(textoDelBoton({ ...base, dias: [], que: 'hora' })).toBe('Guardar 07:00 · todos los días');
  });
  it('con días y solo el aviso: «Guardar aviso» con los días', () => {
    expect(textoDelBoton({ ...base, dias: ['SÁB', 'DOM'], que: 'aviso' })).toBe('Guardar aviso · sáb, dom');
  });
  it('con días y la hora: la hora con los días (como hasta ahora)', () => {
    expect(textoDelBoton({ ...base, dias: ['SÁB', 'DOM'], que: 'hora' })).toBe('Guardar 07:00 · sáb, dom');
  });
  it('con los dos: hora y aviso', () => {
    expect(textoDelBoton({ ...base, dias: ['MAR', 'MIÉ'], que: 'ambos' })).toBe('Guardar hora y aviso · mar, mié');
  });
  it('guardando', () => {
    expect(textoDelBoton({ ...base, guardando: true, dias: ['SÁB'], que: 'aviso' })).toBe('Guardando…');
  });
});

describe('resumenDelAvisoDelDia: lo que dice el chip', () => {
  it('igual al general: nada (el día lo hereda y no se ve como propio)', () => {
    expect(resumenDelAvisoDelDia([10], [10])).toBeNull();
    expect(resumenDelAvisoDelDia([0, 30], [30, 0])).toBeNull();
    expect(resumenDelAvisoDelDia([], [])).toBeNull();
  });

  it('el servidor no lo informa: nada', () => {
    expect(resumenDelAvisoDelDia(null, [10])).toBeNull();
    expect(resumenDelAvisoDelDia(undefined, [10])).toBeNull();
  });

  it('30 minutos: «30′», con el texto completo para el lector de pantalla', () => {
    expect(resumenDelAvisoDelDia([30], [10])).toEqual({ corto: '30′', largo: 'Aviso 30 minutos antes', sinAviso: false });
  });

  it('a la hora', () => {
    expect(resumenDelAvisoDelDia([0], [10])).toEqual({ corto: 'a la hora', largo: 'Aviso a la hora', sinAviso: false });
  });

  it('sin aviso: la campana tachada', () => {
    expect(resumenDelAvisoDelDia([], [10])).toEqual({ corto: 'sin aviso', largo: 'Sin aviso', sinAviso: true });
  });

  it('más de una hora y varios avisos', () => {
    expect(resumenDelAvisoDelDia([90], [10])).toMatchObject({ corto: '1 h 30′', largo: 'Aviso 1 hora y 30 minutos antes' });
    expect(resumenDelAvisoDelDia([120], [10])).toMatchObject({ corto: '2 h', largo: 'Aviso 2 horas antes' });
    expect(resumenDelAvisoDelDia([0, 30], [10])).toEqual({
      corto: '30′ +1',
      largo: 'Avisos 30 minutos antes y a la hora',
      sinAviso: false,
    });
  });

  it('un día sin aviso cuando el general también está apagado no se marca; con el general encendido sí', () => {
    expect(resumenDelAvisoDelDia([], [])).toBeNull();
    expect(resumenDelAvisoDelDia([30], [])).not.toBeNull();
  });
});

describe('diasDelEditor y las alarmas', () => {
  const dia = (weekday: string, extra: Partial<DiaDeLaSemanaApi> = {}): DiaDeLaSemanaApi => ({
    weekday, triggerTime: '07:00:00', limitTime: null, custom: false, active: true, ...extra,
  });
  const semana = (cambios: Record<string, Partial<DiaDeLaSemanaApi>> = {}): DiaDeLaSemanaApi[] =>
    ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map(w => dia(w, {
      reminderEnabled: true, reminderMinutesList: [10], customReminder: false, ...cambios[w],
    }));

  it('lee hora, si es propia, si está encendido y el aviso de cada día', () => {
    const dias = diasDelEditor(semana({
      SATURDAY: { custom: true, triggerTime: '09:00:00', reminderMinutesList: [30], customReminder: true },
      SUNDAY: { reminderEnabled: false, reminderMinutesList: [], customReminder: true },
    }), [10]);
    expect(dias['SÁB']).toEqual({ hora: '09:00', propio: true, activo: true, aviso: [30], avisoPropio: true });
    expect(dias['DOM']).toMatchObject({ aviso: [], avisoPropio: true });
    expect(dias['LUN']).toEqual({ hora: '07:00', propio: false, activo: true, aviso: [10], avisoPropio: false });
  });

  it('un backend anterior no manda `customReminder`: el aviso por día no se ofrece', () => {
    const dias = diasDelEditor([dia('MONDAY'), dia('TUESDAY')], [10]);
    expect(dias['LUN'].aviso).toBeNull();
    expect(servidorInformaAvisosPorDia(dias)).toBe(false);
    expect(servidorInformaAvisosPorDia({})).toBe(false);
  });

  it('con el aviso informado en los siete días, sí se ofrece', () => {
    expect(servidorInformaAvisosPorDia(diasDelEditor(semana(), [10]))).toBe(true);
  });

  it('un día «activo» sin lista cae en el aviso general', () => {
    const dias = diasDelEditor(semana({ MONDAY: { reminderMinutesList: null } }), [30, 0]);
    expect(dias['LUN'].aviso).toEqual([30, 0]);
  });

  it('para las alarmas: la hora solo si es propia y el aviso solo si es propio', () => {
    const dias = diasDelEditor(semana({
      THURSDAY: { custom: true, triggerTime: '09:00:00' },
      SATURDAY: { reminderMinutesList: [30], customReminder: true },
      SUNDAY: { active: false },
    }), [10]);
    const propios = diasPropiosDelEditor(dias);
    expect(propios).toHaveLength(7);
    expect(propios.find(d => d.iso === 4)).toEqual({ iso: 4, activo: true, hora: '09:00', avisos: null });
    expect(propios.find(d => d.iso === 6)).toEqual({ iso: 6, activo: true, hora: null, avisos: [30] });
    expect(propios.find(d => d.iso === 7)).toEqual({ iso: 7, activo: false, hora: null, avisos: null });
    expect(propios.find(d => d.iso === 1)).toEqual({ iso: 1, activo: true, hora: null, avisos: null });
  });

  it('mismoAviso compara conjuntos', () => {
    expect(mismoAviso([0, 30], [30, 0])).toBe(true);
    expect(mismoAviso([30], [30, 0])).toBe(false);
  });
});
