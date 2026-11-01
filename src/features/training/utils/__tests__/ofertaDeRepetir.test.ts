import { describe, expect, it } from '@jest/globals';

import type { DiaDeLaOfertaApi, OfertaDeRepetirApi } from '../../../habits/types/habits.types';
import {
  avisoDicho,
  descarteDe,
  domingoDeLaSemana,
  estaDescartada,
  fraseDeLaConfirmacion,
  fraseDeLaOferta,
  fraseDeLaSemana,
  leerDescarte,
  leerSemanaRepetida,
  lineaDelDia,
  motivoDeExclusion,
  ofertaQueSeMuestra,
  repetidaVigente,
  resumenCorto,
  resumenDeLaOferta,
  sumarDiasIso,
} from '../ofertaDeRepetir';

const dia = (extra: Partial<DiaDeLaOfertaApi>): DiaDeLaOfertaApi => ({ date: '2026-11-07', weekday: 'SATURDAY', active: true, ...extra });

const oferta = (extra: Partial<OfertaDeRepetirApi> = {}): OfertaDeRepetirApi => ({
  sourceWeekStart: '2026-10-26',
  targetWeekStart: '2026-11-02',
  fingerprint: 'abc123',
  replacesOwnChanges: false,
  habits: [
    { habitId: 'h1', title: 'Despertar', days: [dia({ date: '2026-11-08', weekday: 'SUNDAY', triggerTime: '08:00:00', customTime: true }), dia({ triggerTime: '07:00:00', customTime: true, customReminder: true, reminderEnabled: true, reminderMinutesList: [30, 0] })] },
    { habitId: 'h2', title: 'Gimnasio', days: [dia({ date: '2026-11-03', weekday: 'TUESDAY', active: false })] },
  ],
  excluded: [{ habitId: 'h3', title: 'Meditar', reason: 'NOT_AVAILABLE' }],
  ...extra,
});

describe('las frases de semana', () => {
  it('sumar días cruza el mes y el año sin correrse (el mediodía evita el cambio de hora)', () => {
    expect(sumarDiasIso('2026-10-26', 6)).toBe('2026-11-01');
    expect(sumarDiasIso('2026-12-28', 7)).toBe('2027-01-04');
    expect(domingoDeLaSemana('2026-11-02')).toBe('2026-11-08');
  });
  it('una semana del mismo mes: «2 al 8 nov»', () => {
    expect(fraseDeLaSemana('2026-11-02')).toBe('2 al 8 nov');
  });
  it('una semana que cruza el mes dice los dos: «26 oct al 1 nov»', () => {
    expect(fraseDeLaSemana('2026-10-26')).toBe('26 oct al 1 nov');
  });
  it('una semana que cruza el año', () => {
    expect(fraseDeLaSemana('2026-12-28')).toBe('28 dic al 3 ene');
  });
  it('la oferta y la confirmación usan las mismas frases', () => {
    expect(fraseDeLaOferta(oferta())).toBe('Tu semana del 26 oct al 1 nov, en la del 2 al 8 nov');
    expect(fraseDeLaConfirmacion('2026-11-02')).toBe('Tu semana del 2 al 8 nov quedó como esta');
  });
});

describe('qué cambia cada día', () => {
  it('hora y aviso propios', () => {
    expect(lineaDelDia(dia({ triggerTime: '07:00:00', customTime: true, customReminder: true, reminderEnabled: true, reminderMinutesList: [30, 0] })))
      .toEqual({ dia: 'sáb', texto: '07:00 · aviso 30 min antes y a la hora', reemplaza: false });
  });
  it('un día que no va', () => {
    expect(lineaDelDia(dia({ active: false })).texto).toBe('no va');
  });
  it('sin aviso ese día', () => {
    expect(lineaDelDia(dia({ customReminder: true, reminderEnabled: false, reminderMinutesList: [] })).texto).toBe('sin aviso');
  });
  it('cómo suena', () => {
    const l = lineaDelDia(dia({ alarm: { sound: false, vibration: true, voice: false, repeat: false } }));
    expect(l.texto).toBe('alarma: sin sonido, vibra');
  });
  it('una hora que no es propia (la del plan de siempre) no se dice como cambio', () => {
    expect(lineaDelDia(dia({ triggerTime: '06:00:00', customTime: false, customReminder: true, reminderMinutesList: [10] })).texto).toBe('aviso 10 min antes');
  });
  it('sin nada propio: vuelve al plan de siempre', () => {
    expect(lineaDelDia(dia({})).texto).toBe('vuelve al plan de siempre');
  });
  it('marca lo que reemplaza', () => {
    expect(lineaDelDia(dia({ replaces: true })).reemplaza).toBe(true);
  });
  it('el aviso dicho en una frase', () => {
    expect(avisoDicho([])).toBe('sin aviso');
    expect(avisoDicho([0, 30])).toBe('30 min antes y a la hora');
  });
});

describe('el resumen', () => {
  it('por hábito, con los días en el orden de la semana', () => {
    const r = resumenDeLaOferta(oferta());
    expect(r.map(h => h.titulo)).toEqual(['Despertar', 'Gimnasio']);
    expect(r[0].dias.map(d => d.dia)).toEqual(['sáb', 'dom']);
    expect(r[1].dias[0]).toEqual({ dia: 'mar', texto: 'no va', reemplaza: false });
  });
  it('el resumen corto cuenta hábitos y días, en singular y plural', () => {
    expect(resumenCorto(oferta())).toBe('2 hábitos · 3 días');
    expect(resumenCorto(oferta({ habits: [oferta().habits[1]] }))).toBe('1 hábito · 1 día');
  });
  it('el motivo de lo que se deja afuera, en palabras', () => {
    expect(motivoDeExclusion('NOT_AVAILABLE')).toBe('ya no está en tu plan');
    expect(motivoDeExclusion('OTRO')).toBe('no se puede repetir');
  });
});

describe('«Ahora no» (FR-012)', () => {
  it('descartada con el mismo par de semanas y la misma huella: no se muestra', () => {
    const o = oferta();
    expect(estaDescartada(o, descarteDe(o))).toBe(true);
    expect(ofertaQueSeMuestra(o, descarteDe(o))).toBeNull();
  });
  it('si la modelo cambió (otra huella) vuelve a mostrarse', () => {
    const descarte = descarteDe(oferta());
    expect(ofertaQueSeMuestra(oferta({ fingerprint: 'otra' }), descarte)).not.toBeNull();
  });
  it('otro par de semanas: se muestra', () => {
    const descarte = descarteDe(oferta());
    expect(ofertaQueSeMuestra(oferta({ sourceWeekStart: '2026-11-02', targetWeekStart: '2026-11-09' }), descarte)).not.toBeNull();
  });
  it('sin nada descartado o sin oferta', () => {
    expect(ofertaQueSeMuestra(oferta(), null)).not.toBeNull();
    expect(ofertaQueSeMuestra(null, descarteDe(oferta()))).toBeNull();
  });
  it('un valor guardado roto es «nada descartado», nunca un error', () => {
    expect(leerDescarte(null)).toBeNull();
    expect(leerDescarte('no es json')).toBeNull();
    expect(leerDescarte('{"modelo":1}')).toBeNull();
    expect(leerDescarte(JSON.stringify(descarteDe(oferta())))).toEqual(descarteDe(oferta()));
  });
});

describe('la semana repetida se recuerda hasta que termina', () => {
  it('lee con tolerancia', () => {
    expect(leerSemanaRepetida('{"semana":"2026-11-02"}')).toEqual({ semana: '2026-11-02' });
    expect(leerSemanaRepetida('{"semana":"mañana"}')).toBeNull();
    expect(leerSemanaRepetida('x')).toBeNull();
    expect(leerSemanaRepetida(null)).toBeNull();
  });
  it('vigente hasta su domingo, inclusive', () => {
    const r = { semana: '2026-11-02' };
    expect(repetidaVigente(r, '2026-11-02')).toEqual(r);
    expect(repetidaVigente(r, '2026-11-08')).toEqual(r);
    expect(repetidaVigente(r, '2026-11-09')).toBeNull();
    expect(repetidaVigente(null, '2026-11-02')).toBeNull();
  });
});
