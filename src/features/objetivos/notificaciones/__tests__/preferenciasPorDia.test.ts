/**
 * Las preferencias de las acciones de los objetivos, por día de la semana (spec 010, T002).
 *
 * Mismo modelo que los hábitos (008 y 009): una configuración GENERAL y, por cada día, solo lo que ese día tiene
 * distinto (hora y encendido del recordatorio diario, aviso antes de cada acción, y «cómo suena»). Lo que un día no
 * dice, lo hereda de la general. Todo vive en el teléfono (FR-007): sin servidor.
 */
import { describe, expect, it } from '@jest/globals';

import { COMBINACION_POR_DEFECTO, type CombinacionDeAlarma } from '../../../habits/notificaciones/utils/combinacionDeAlarma';
import {
  antelacionesDeLaFecha,
  conCambios,
  dejarComoLosDemas,
  diaIsoDeFecha,
  hayAvisoEnAlgunDia,
  hayDiarioEnAlgunDia,
  hayDiasDistintosEnElDiario,
  leerPreferenciasDeAcciones,
  PREFERENCIAS_DE_ACCIONES_POR_DEFECTO,
  resolverDia,
  resolverLaSemana,
  type PreferenciasDeAcciones,
} from '../preferenciasPorDia';

const c = (sonido: boolean, vibracion: boolean, voz = false, repetir = false): CombinacionDeAlarma => ({ sonido, vibracion, voz, repetir });

/** Lo que había antes de la spec 010: tres campos y nada más. */
const DE_ANTES: PreferenciasDeAcciones = { diarioActivo: true, horaDiaria: '07:00', antelaciones: [10] };

describe('leer lo guardado: el formato de antes pasa a ser la configuración general', () => {
  it('el formato viejo se lee igual que siempre, sin días propios ni «cómo suena» propio', () => {
    const leido = leerPreferenciasDeAcciones('{"diarioActivo":true,"horaDiaria":"07:00","antelaciones":[10]}');
    expect(leido).toEqual(DE_ANTES);
    expect(leido.dias).toBeUndefined();
    expect(leido.alarma).toBeUndefined();
    // Y cada día resuelve a lo mismo que la general, sin nada propio: no cambia lo que suena.
    for (const d of resolverLaSemana(leido)) {
      expect(d).toMatchObject({ diarioActivo: true, horaDiaria: '07:00', antelaciones: [10] });
      expect(d.alarma).toEqual(COMBINACION_POR_DEFECTO);
      expect(d.propio).toEqual({ diarioActivo: false, horaDiaria: false, antelaciones: false, alarma: false });
    }
  });

  it('sin nada guardado, o roto, queda el valor por defecto', () => {
    expect(leerPreferenciasDeAcciones(null)).toEqual(PREFERENCIAS_DE_ACCIONES_POR_DEFECTO);
    expect(leerPreferenciasDeAcciones('{roto')).toEqual(PREFERENCIAS_DE_ACCIONES_POR_DEFECTO);
    expect(leerPreferenciasDeAcciones('[1,2]')).toEqual(PREFERENCIAS_DE_ACCIONES_POR_DEFECTO);
  });

  it('lee los días y «cómo suena», y descarta campo por campo lo que no se entiende', () => {
    const crudo = JSON.stringify({
      diarioActivo: true,
      horaDiaria: '07:00',
      antelaciones: [10],
      alarma: { sonido: true, vibracion: false, voz: false, repetir: true },
      dias: {
        6: { horaDiaria: '09:00', antelaciones: [30, 'x', 30, -5], alarma: { sonido: false, vibracion: true, voz: false, repetir: false } },
        7: { diarioActivo: false, horaDiaria: '25:99' },
        // Un día que no existe, y un día sin nada propio: se ignoran.
        8: { horaDiaria: '09:00' },
        1: {},
        // Una combinación que dejaría la alarma muda no se acepta: el día hereda.
        2: { alarma: { sonido: false, vibracion: false, voz: false, repetir: false } },
      },
    });
    const leido = leerPreferenciasDeAcciones(crudo);
    expect(leido.alarma).toEqual(c(true, false, false, true));
    expect(leido.dias).toEqual({
      6: { horaDiaria: '09:00', antelaciones: [30], alarma: c(false, true) },
      7: { diarioActivo: false },
    });
  });
});

describe('resolver un día: cada campo, de forma independiente, hereda de la general', () => {
  const prefs: PreferenciasDeAcciones = {
    diarioActivo: true,
    horaDiaria: '07:00',
    antelaciones: [10],
    alarma: c(true, true, false, true),
    dias: {
      6: { horaDiaria: '09:00' },
      7: { diarioActivo: false, antelaciones: [30, 0] },
      3: { alarma: c(false, true) },
    },
  };

  it('un día con solo la hora propia sigue la general en lo demás', () => {
    expect(resolverDia(prefs, 6)).toEqual({
      iso: 6,
      diarioActivo: true,
      horaDiaria: '09:00',
      antelaciones: [10],
      alarma: c(true, true, false, true),
      propio: { diarioActivo: false, horaDiaria: true, antelaciones: false, alarma: false },
    });
  });

  it('apagar el recordatorio de un día no toca su aviso, y el aviso propio puede quedar vacío («sin aviso»)', () => {
    const domingo = resolverDia(prefs, 7);
    expect(domingo).toMatchObject({ diarioActivo: false, horaDiaria: '07:00', antelaciones: [30, 0] });
    const sinAviso = resolverDia({ ...prefs, dias: { 1: { antelaciones: [] } } }, 1);
    expect(sinAviso.antelaciones).toEqual([]);
    expect(sinAviso.propio.antelaciones).toBe(true);
  });

  it('«cómo suena» propio pisa a la general entera, no campo por campo', () => {
    expect(resolverDia(prefs, 3).alarma).toEqual(c(false, true));
    expect(resolverDia(prefs, 4).alarma).toEqual(c(true, true, false, true));
  });

  it('la semana son siete días, de lunes (1) a domingo (7)', () => {
    expect(resolverLaSemana(prefs).map(d => d.iso)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('el aviso de una acción es el del día de SU fecha, no el de hoy', () => {
    // 2026-09-26 es sábado y 2026-09-27 es domingo.
    expect(diaIsoDeFecha('2026-09-26')).toBe(6);
    expect(diaIsoDeFecha('2026-09-27')).toBe(7);
    expect(diaIsoDeFecha('2026-09-28')).toBe(1);
    expect(diaIsoDeFecha('mañana')).toBeNull();
    expect(antelacionesDeLaFecha(prefs, '2026-09-26')).toEqual([10]);
    expect(antelacionesDeLaFecha(prefs, '2026-09-27')).toEqual([30, 0]);
    expect(antelacionesDeLaFecha(prefs, 'mañana')).toEqual([10]);
  });
});

describe('cambiar la general o unos días', () => {
  it('sin días marcados cambia la general, y lo que cada día tiene propio se queda', () => {
    const antes: PreferenciasDeAcciones = { ...DE_ANTES, dias: { 6: { horaDiaria: '09:00' } } };
    const despues = conCambios(antes, [], { horaDiaria: '08:00', antelaciones: [30, 10] });
    expect(despues).toMatchObject({ diarioActivo: true, horaDiaria: '08:00', antelaciones: [30, 10] });
    expect(despues.dias).toEqual({ 6: { horaDiaria: '09:00' } });
  });

  it('con días marcados, solo cambia lo tocado; lo demás de cada día sigue como estaba', () => {
    const antes: PreferenciasDeAcciones = { ...DE_ANTES, dias: { 6: { horaDiaria: '09:00', antelaciones: [30] } } };
    const despues = conCambios(antes, [6, 7], { horaDiaria: '10:00' });
    expect(despues.dias).toEqual({
      6: { horaDiaria: '10:00', antelaciones: [30] },
      7: { horaDiaria: '10:00' },
    });
    // La general no se movió.
    expect(despues).toMatchObject({ horaDiaria: '07:00', antelaciones: [10], diarioActivo: true });
  });

  it('lo que un día pide igual que la general vuelve a seguirla (no queda como «propio»)', () => {
    const antes: PreferenciasDeAcciones = { ...DE_ANTES, dias: { 6: { horaDiaria: '09:00', antelaciones: [30] } } };
    const despues = conCambios(antes, [6], { horaDiaria: '07:00', antelaciones: [10] });
    expect(despues.dias).toBeUndefined();
    expect(resolverDia(despues, 6).propio).toEqual({ diarioActivo: false, horaDiaria: false, antelaciones: false, alarma: false });
  });

  it('«cómo suena»: lo tocado se suma a lo que el día ya tenía; sin días marcados es la general', () => {
    const antes: PreferenciasDeAcciones = { ...DE_ANTES, alarma: c(true, true, false, false), dias: { 6: { alarma: c(false, true) } } };
    // El sábado suena distinto: encender «Repetir» solo cambia ese campo.
    const sabado = conCambios(antes, [6], { alarma: { repetir: true } });
    expect(sabado.dias?.[6]?.alarma).toEqual(c(false, true, false, true));
    // El domingo no tenía nada propio: parte de la general.
    const domingo = conCambios(antes, [7], { alarma: { vibracion: false } });
    expect(domingo.dias?.[7]?.alarma).toEqual(c(true, false, false, false));
    // La general.
    const general = conCambios(antes, [], { alarma: { repetir: true } });
    expect(general.alarma).toEqual(c(true, true, false, true));
    // Dejarla como la de siempre no se guarda.
    expect(conCambios(general, [], { alarma: { repetir: false } }).alarma).toBeUndefined();
  });

  it('un día con «cómo suena» igual al de la general la sigue', () => {
    const antes: PreferenciasDeAcciones = { ...DE_ANTES, dias: { 6: { alarma: c(false, true) } } };
    expect(conCambios(antes, [6], { alarma: { sonido: true } }).dias).toBeUndefined();
  });

  it('«como los demás días» borra todo lo propio de esos días y nada más', () => {
    const antes: PreferenciasDeAcciones = {
      ...DE_ANTES,
      dias: { 6: { horaDiaria: '09:00', alarma: c(false, true) }, 7: { diarioActivo: false }, 1: { antelaciones: [] } },
    };
    expect(dejarComoLosDemas(antes, [6, 7]).dias).toEqual({ 1: { antelaciones: [] } });
    expect(dejarComoLosDemas(antes, [1, 6, 7]).dias).toBeUndefined();
  });

  it('no cambia el objeto de entrada', () => {
    const antes: PreferenciasDeAcciones = { ...DE_ANTES, dias: { 6: { horaDiaria: '09:00' } } };
    const copia = JSON.stringify(antes);
    conCambios(antes, [6, 7], { horaDiaria: '11:00', antelaciones: [0] });
    dejarComoLosDemas(antes, [6]);
    expect(JSON.stringify(antes)).toBe(copia);
  });
});

describe('qué piden las alarmas', () => {
  it('el recordatorio diario solo es «distinto» si cambia lo que suena ese día: encendido, hora o cómo suena', () => {
    expect(hayDiasDistintosEnElDiario(DE_ANTES)).toBe(false);
    // Un aviso propio no cambia el diario.
    expect(hayDiasDistintosEnElDiario({ ...DE_ANTES, dias: { 6: { antelaciones: [30] } } })).toBe(false);
    expect(hayDiasDistintosEnElDiario({ ...DE_ANTES, dias: { 6: { horaDiaria: '09:00' } } })).toBe(true);
    expect(hayDiasDistintosEnElDiario({ ...DE_ANTES, dias: { 7: { diarioActivo: false } } })).toBe(true);
    expect(hayDiasDistintosEnElDiario({ ...DE_ANTES, dias: { 6: { alarma: c(false, true) } } })).toBe(true);
  });

  it('con el recordatorio apagado en general, la hora o el sonido propios de un día apagado no cuentan', () => {
    const apagada: PreferenciasDeAcciones = { ...DE_ANTES, diarioActivo: false };
    expect(hayDiasDistintosEnElDiario({ ...apagada, dias: { 6: { horaDiaria: '09:00' } } })).toBe(false);
    // Pero un día que SÍ lo enciende es distinto.
    expect(hayDiasDistintosEnElDiario({ ...apagada, dias: { 6: { diarioActivo: true } } })).toBe(true);
  });

  it('hay recordatorio diario si algún día lo tiene; hay aviso si algún día tiene antelaciones', () => {
    expect(hayDiarioEnAlgunDia({ ...DE_ANTES, diarioActivo: false })).toBe(false);
    expect(hayDiarioEnAlgunDia({ ...DE_ANTES, diarioActivo: false, dias: { 6: { diarioActivo: true } } })).toBe(true);
    expect(hayDiarioEnAlgunDia({ ...DE_ANTES, dias: { 6: { diarioActivo: false } } })).toBe(true);
    expect(hayAvisoEnAlgunDia({ ...DE_ANTES, antelaciones: [] })).toBe(false);
    expect(hayAvisoEnAlgunDia({ ...DE_ANTES, antelaciones: [], dias: { 6: { antelaciones: [30] } } })).toBe(true);
    expect(hayAvisoEnAlgunDia({ ...DE_ANTES, dias: { 6: { antelaciones: [] } } })).toBe(true);
  });
});
